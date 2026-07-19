#!/usr/bin/env node
/*
 * Radar Comercial — skill mode (autocontido)
 * Puxa deals abertos dos pipelines-alvo via API Pipedrive, aplica 5 regras de
 * higiene CRM, gera dashboard HTML dark-theme com graficos SVG inline (sem CDN,
 * sem JS client-side) e faz deploy de producao no projeto Vercel pipe-review.
 *
 * Tokens (env): PD_TOKEN|PIPEDRIVE_API_TOKEN|PIPEDRIVE_API_KEY  e  VT|VERCEL_API_TOKEN|VERCEL_TOKEN
 * Opcionais: RADAR_PIPELINES (csv id:nome) · RADAR_PROJECT (nome Vercel) · RADAR_OUT (dir saida) · RADAR_NO_DEPLOY=1
 */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PD = process.env.PD_TOKEN || process.env.PIPEDRIVE_API_TOKEN || process.env.PIPEDRIVE_API_KEY;
const VT = process.env.VT || process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
const PROJECT = process.env.RADAR_PROJECT || 'pipe-review';
const OUT = process.env.RADAR_OUT || path.join(os.tmpdir(), 'radar-skill');
const NO_DEPLOY = process.env.RADAR_NO_DEPLOY === '1';

// pipelines-alvo: default SaaS=1, Super SDR=2, Educacional=6
const TARGET = {};
(process.env.RADAR_PIPELINES || '1:SaaS,2:Super SDR,6:Educacional').split(',').forEach((p) => {
  const [id, ...n] = p.split(':');
  TARGET[id.trim()] = n.join(':').trim();
});

// etapas-alvo: SO pos-reuniao (apresentacao/demo realizada em diante) — espelha o radar.js original.
// SaaS: 61 Apres / 20 Proposta / 21 Negociacao / 83 Formalizacao
// Super SDR: 10 Demo / 12 Proposta / 14 Negociacao / 81 Formalizacao
// Educacional: 60 Apres / 55 Proposta / 56 Negociacao / 82 Formalizacao
const ALLOWED_STAGES = new Set(
  (process.env.RADAR_STAGES || '61,20,21,83,10,12,14,81,60,55,56,82')
    .split(',').map((s) => Number(s.trim()))
);

// Concorrência do fetch de notas/atividades por deal (regras de qualidade) — mantém baixo pra não estourar rate limit.
const QUALITY_CONCURRENCY = Number(process.env.RADAR_QUALITY_CONCURRENCY || 6);
const NO_QUALITY = process.env.RADAR_NO_QUALITY === '1';

// ---------- ARENA DE VENDAS (pontuação — best-effort, nunca bloqueia o radar) ----------
// Token e' o PAT de Management API do Supabase (mesmo usado em consultas administrativas ad-hoc)
// — NÃO é um token dedicado do Arena. Ref do projeto e tenant são identificadores de infra e NÃO
// têm default aqui de propósito (este script é público) — vêm só de env local (ver SKILL.md).
// Sem qualquer um dos 3, o radar segue sem a seção de pontuação (fallback gracioso, nunca erro fatal).
const ARENA_PROJECT_REF = process.env.ARENA_PROJECT_REF || '';
const ARENA_TENANT_ID = process.env.ARENA_TENANT_ID || '';
const ARENA_TOKEN = process.env.ARENA_SUPABASE_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const NO_ARENA = process.env.RADAR_NO_ARENA === '1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!PD) { console.error('ERRO: token Pipedrive ausente (PD_TOKEN/PIPEDRIVE_API_TOKEN/PIPEDRIVE_API_KEY)'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

function pd(p) {
  return new Promise((resolve, reject) => {
    const sep = p.includes('?') ? '&' : '?';
    https.get(`https://api.pipedrive.com/v1${p}${sep}api_token=${PD}`, (res) => {
      let b = ''; res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
async function getAllDeals() {
  let start = 0, all = [], more = true;
  while (more) {
    const r = await pd(`/deals?status=open&limit=500&start=${start}`);
    if (r.data) all = all.concat(r.data);
    const pg = r.additional_data && r.additional_data.pagination;
    if (pg && pg.more_items_in_collection) start = pg.next_start; else more = false;
  }
  return all;
}
async function getStageMap() {
  const r = await pd('/stages'); const m = {};
  (r.data || []).forEach((s) => { m[s.id] = s.name; });
  return m;
}
function businessDaysSince(dateStr) {
  if (!dateStr) return 9999;
  const then = new Date(dateStr.replace(' ', 'T') + 'Z'); const now = new Date();
  let days = 0; const d = new Date(then);
  while (d < now) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) days++; }
  return days;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const brl = (v) => (v ? 'R$ ' + Number(v).toLocaleString('pt-BR') : '—');
const stripHtml = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const slugName = (s) => String(s || '').normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fmtDateBr = (iso) => { if (!iso) return null; try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return null; } };

// ---------- QUALIDADE (notas + follow-ups por deal — best-effort por deal) ----------
async function getDealNotes(dealId) {
  const r = await pd(`/notes?deal_id=${dealId}&limit=100`);
  return (r && r.data) || [];
}
async function getDealActivitiesDone(dealId) {
  // NUNCA usar /activities?deal_id=X — a Pipedrive v1 ignora esse filtro em silêncio e devolve
  // atividades de OUTROS deals (confirmado em teste real 19/07/2026). O sub-recurso abaixo filtra certo.
  const r = await pd(`/deals/${dealId}/activities?done=1&limit=100`);
  return (r && r.data) || [];
}
// Pool simples de concorrência limitada — evita disparar 1 request por deal de uma vez (rate limit).
async function mapLimit(items, limit, fn) {
  const ret = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { ret[idx] = await fn(items[idx], idx); } catch (e) { ret[idx] = { error: (e && e.message) || String(e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
  return ret;
}
async function fetchQuality(targetDeals) {
  if (NO_QUALITY) return targetDeals.map(() => ({ error: 'skipped (RADAR_NO_QUALITY=1)' }));
  return mapLimit(targetDeals, QUALITY_CONCURRENCY, async (d) => {
    const [notes, acts] = await Promise.all([getDealNotes(d.id), getDealActivitiesDone(d.id)]);
    return { notes, acts };
  });
}

// ---------- ARENA DE VENDAS (pontuação — HTTP à parte, nunca lança) ----------
function httpsJson(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(d), raw: d }); } catch (e) { resolve({ status: res.statusCode, json: null, raw: d }); } });
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
async function fetchArena() {
  if (NO_ARENA) return { available: false, reason: 'skipped (RADAR_NO_ARENA=1)' };
  if (!ARENA_TOKEN) return { available: false, reason: 'Arena indisponível — sem token (ARENA_SUPABASE_TOKEN/SUPABASE_ACCESS_TOKEN ausente no env)' };
  if (!ARENA_PROJECT_REF) return { available: false, reason: 'Arena indisponível — ARENA_PROJECT_REF não configurado no env desta máquina' };
  if (!UUID_RE.test(ARENA_TENANT_ID)) return { available: false, reason: 'Arena indisponível — ARENA_TENANT_ID ausente/inválido no env desta máquina' };
  const sql = `select p.id, p.email, p.full_name, g.xp, g.level, g.level_name, g.streak_days, g.max_streak, g.updated_at as gamification_at, ` +
    `(select count(*) from public.scores s where s.user_id = p.id) as training_count, ` +
    `(select round(avg(s.final_score),1) from public.scores s where s.user_id = p.id) as avg_training, ` +
    `(select max(s.created_at) from public.scores s where s.user_id = p.id) as last_training, ` +
    `(select count(*) from public.call_analyses c where c.user_id = p.id) as call_count, ` +
    `(select round(avg(c.final_score),1) from public.call_analyses c where c.user_id = p.id and c.status = 'completed') as avg_call, ` +
    `(select max(c.analyzed_at) from public.call_analyses c where c.user_id = p.id) as last_call ` +
    `from public.profiles p left join public.gamification g on g.user_id = p.id where p.tenant_id = '${ARENA_TENANT_ID}' order by p.full_name;`;
  const payload = JSON.stringify({ query: sql });
  try {
    const resp = await httpsJson({ method: 'POST', hostname: 'api.supabase.com', path: `/v1/projects/${ARENA_PROJECT_REF}/database/query`, headers: { Authorization: `Bearer ${ARENA_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, payload);
    if (resp.status >= 300 || !Array.isArray(resp.json)) {
      return { available: false, reason: `Arena indisponível — management API ${resp.status}: ${String(resp.raw || '').slice(0, 200)}` };
    }
    const sellers = resp.json.map((r) => ({
      email: r.email, nome: r.full_name, slug: slugName(r.full_name),
      xp: r.xp, level: r.level, levelName: r.level_name, streak: r.streak_days, maxStreak: r.max_streak,
      trainingCount: Number(r.training_count) || 0, avgTraining: r.avg_training != null ? Number(r.avg_training) : null, lastTraining: r.last_training,
      callCount: Number(r.call_count) || 0, avgCall: r.avg_call != null ? Number(r.avg_call) : null, lastCall: r.last_call,
      lastActivityAt: [r.gamification_at, r.last_training, r.last_call].filter(Boolean).sort().pop() || null,
    }));
    return { available: true, tenantId: ARENA_TENANT_ID, fetchedAt: new Date().toISOString(), sellers };
  } catch (e) {
    return { available: false, reason: 'Arena indisponível — erro de rede/consulta: ' + ((e && e.message) || String(e)) };
  }
}
function matchArenaSeller(name, arena) {
  if (!arena || !arena.available) return null;
  const slug = slugName(name);
  if (!slug) return null;
  return arena.sellers.find((s) => s.slug === slug) || null;
}

// ---------- COMPUTE ----------
async function compute() {
  const [deals, stageMap] = await Promise.all([getAllDeals(), getStageMap()]);
  const tgt = deals.filter((d) => TARGET[d.pipeline_id] && ALLOWED_STAGES.has(d.stage_id));
  const quality = await fetchQuality(tgt); // 1 entrada por tgt[i], alinhado por índice

  const rows = tgt.map((d, i) => {
    const person = d.person_id || null;
    const emails = (person && person.email) || [];
    const phones = (person && person.phone) || [];
    const hasEmail = emails.some((e) => e && e.value && e.value.trim());
    const hasPhone = phones.some((p) => p && p.value && p.value.trim());
    const r1 = !d.org_id, r2 = !hasEmail, r3 = !hasPhone, r4 = !d.next_activity_date;
    const bdays = businessDaysSince(d.update_time); const r5 = bdays >= 3;
    const flagsHigiene = [];
    if (r1) flagsHigiene.push('Sem empresa');
    if (r2) flagsHigiene.push('Sem email');
    if (r3) flagsHigiene.push('Sem telefone');
    if (r4) flagsHigiene.push('Sem atividade aberta');
    if (r5) flagsHigiene.push(`Estagnado ${bdays}d úteis`);

    // ---- Regras de QUALIDADE (q1/q2) — best-effort por deal; erro de fetch = "desconhecido", nunca falso-positivo ----
    const qd = quality[i];
    let q1 = null, q2 = null, qualityError = null;
    if (qd && qd.error) {
      qualityError = qd.error;
    } else if (qd) {
      const maxNoteLen = (qd.notes || []).reduce((max, n) => Math.max(max, stripHtml(n.content).length), 0);
      q1 = maxNoteLen < 40; // sem nota de qualificação substantiva
      const done = qd.acts || [];
      if (!done.length) {
        q2 = true; // nenhum follow-up concluído registrado (nesta etapa pós-reunião, deveria haver ao menos 1)
      } else {
        const sorted = done.slice().sort((a, b) => new Date(b.marked_as_done_time || b.update_time || 0) - new Date(a.marked_as_done_time || a.update_time || 0));
        q2 = stripHtml(sorted[0].note).length < 15; // último follow-up concluído sem registro do que aconteceu
      }
    }
    const flagsQualidade = [];
    if (q1) flagsQualidade.push('Nota rasa/ausente');
    if (q2) flagsQualidade.push('Follow-up sem registro');

    return {
      id: d.id, titulo: d.title, valor: d.value, pipeline: TARGET[d.pipeline_id],
      etapa: stageMap[d.stage_id] || `Etapa ${d.stage_id}`,
      contato: person ? person.name : null, empresa: d.org_id ? d.org_id.name : null,
      responsavel: d.user_id ? d.user_id.name : null, responsavelEmail: d.user_id ? d.user_id.email : null,
      atualizado: d.update_time, bdays,
      flags: flagsHigiene.concat(flagsQualidade), flagsHigiene, flagsQualidade,
      r1, r2, r3, r4, r5, q1, q2, qualityError,
    };
  });
  const counts = {
    total: rows.length, totalAbertos: deals.length,
    comPendencia: rows.filter((r) => r.flagsHigiene.length).length,
    ok: rows.filter((r) => !r.flagsHigiene.length).length,
    r1: rows.filter((r) => r.r1).length, r2: rows.filter((r) => r.r2).length,
    r3: rows.filter((r) => r.r3).length, r4: rows.filter((r) => r.r4).length,
    r5: rows.filter((r) => r.r5).length, byPipeline: {},
    // Qualidade — não participa do invariante total==comPendencia+ok (esse continua só higiene, contrato existente)
    q1: rows.filter((r) => r.q1).length, q2: rows.filter((r) => r.q2).length,
    qualityUnknown: rows.filter((r) => r.qualityError).length,
    comPendenciaQualidade: rows.filter((r) => r.flagsQualidade.length).length,
    okQualidade: rows.filter((r) => !r.qualityError && !r.flagsQualidade.length).length,
  };
  for (const name of Object.values(TARGET)) {
    const sub = rows.filter((r) => r.pipeline === name);
    counts.byPipeline[name] = { total: sub.length, pend: sub.filter((r) => r.flagsHigiene.length).length };
  }
  return { counts, rows };
}

// ---------- CHARTS (SVG inline) ----------
function donut(c) {
  const cx = 110, cy = 110, r = 80, sw = 26, C = 2 * Math.PI * r;
  const total = c.total || 1;
  const pendLen = (c.comPendencia / total) * C, okLen = (c.ok / total) * C;
  const pct = Math.round((c.comPendencia / total) * 100);
  return `<svg viewBox="0 0 220 220" class="chart-svg" role="img" aria-label="Saúde do funil">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1c2433" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#22c55e" stroke-width="${sw}" stroke-dasharray="${okLen.toFixed(2)} ${(C - okLen).toFixed(2)}" stroke-dashoffset="${(-pendLen).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f59e0b" stroke-width="${sw}" stroke-dasharray="${pendLen.toFixed(2)} ${(C - pendLen).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="42" font-weight="700" fill="#f59e0b">${pct}%</text>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="13" fill="#7d8590">com pendência</text>
  </svg>`;
}
function ruleBars(c) {
  const data = [
    { label: 'Sem empresa', val: c.r1, color: '#3b82f6' },
    { label: 'Sem email', val: c.r2, color: '#a78bfa' },
    { label: 'Sem telefone', val: c.r3, color: '#22d3ee' },
    { label: 'Sem atividade aberta', val: c.r4, color: '#f87171' },
    { label: 'Estagnado +3d úteis', val: c.r5, color: '#fbbf24' },
  ];
  const max = Math.max(...data.map((d) => d.val), 1);
  const x0 = 150, barMaxW = 360, rowH = 44, top = 12, h = 18;
  const bars = data.map((d, i) => {
    const y = top + i * rowH; const w = (d.val / max) * barMaxW;
    return `<text x="0" y="${y + h - 3}" font-size="13" fill="#c9d1d9">${esc(d.label)}</text>
    <rect x="${x0}" y="${y}" width="${barMaxW}" height="${h}" rx="9" fill="#1c2433"/>
    <rect x="${x0}" y="${y}" width="${Math.max(w, d.val > 0 ? 6 : 0).toFixed(1)}" height="${h}" rx="9" fill="${d.color}"/>
    <text x="${x0 + barMaxW + 10}" y="${y + h - 3}" font-size="14" font-weight="700" fill="#e6edf3">${d.val}</text>`;
  }).join('');
  return `<svg viewBox="0 0 560 ${top + data.length * rowH}" class="chart-svg" role="img" aria-label="5 regras de higiene">${bars}</svg>`;
}
function pipelineBars(c) {
  const entries = Object.entries(c.byPipeline);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const x0 = 150, barMaxW = 330, rowH = 56, top = 16, h = 22;
  const bars = entries.map(([name, v], i) => {
    const y = top + i * rowH; const okCount = v.total - v.pend;
    const fullW = (v.total / maxTotal) * barMaxW;
    const pendW = v.total ? (v.pend / v.total) * fullW : 0; const okW = fullW - pendW;
    return `<text x="0" y="${y + h - 5}" font-size="13" font-weight="600" fill="#e6edf3">${esc(name)}</text>
    <rect x="${x0}" y="${y}" width="${Math.max(pendW, v.pend > 0 ? 4 : 0).toFixed(1)}" height="${h}" fill="#f59e0b" rx="3"/>
    <rect x="${(x0 + pendW).toFixed(1)}" y="${y}" width="${Math.max(okW, okCount > 0 ? 4 : 0).toFixed(1)}" height="${h}" fill="#22c55e" rx="3"/>
    <text x="${(x0 + fullW + 12).toFixed(1)}" y="${y + h - 6}" font-size="13" fill="#9aa4b2"><tspan fill="#f59e0b" font-weight="700">${v.pend}</tspan> / ${v.total}</text>`;
  }).join('');
  return `<svg viewBox="0 0 560 ${top + entries.length * rowH}" class="chart-svg chart-pipe" role="img" aria-label="Pendências por pipeline">${bars}</svg>`;
}
function qualityBars(c) {
  const data = [
    { label: 'Nota rasa/ausente', val: c.q1, color: '#f472b6' },
    { label: 'Follow-up sem registro', val: c.q2, color: '#fb923c' },
    { label: 'Não avaliado (erro Pipedrive)', val: c.qualityUnknown, color: '#4b5563' },
  ];
  const max = Math.max(...data.map((d) => d.val), 1);
  const x0 = 190, barMaxW = 320, rowH = 44, top = 12, h = 18;
  const bars = data.map((d, i) => {
    const y = top + i * rowH; const w = (d.val / max) * barMaxW;
    return `<text x="0" y="${y + h - 3}" font-size="13" fill="#c9d1d9">${esc(d.label)}</text>
    <rect x="${x0}" y="${y}" width="${barMaxW}" height="${h}" rx="9" fill="#1c2433"/>
    <rect x="${x0}" y="${y}" width="${Math.max(w, d.val > 0 ? 6 : 0).toFixed(1)}" height="${h}" rx="9" fill="${d.color}"/>
    <text x="${x0 + barMaxW + 10}" y="${y + h - 3}" font-size="14" font-weight="700" fill="#e6edf3">${d.val}</text>`;
  }).join('');
  return `<svg viewBox="0 0 560 ${top + data.length * rowH}" class="chart-svg" role="img" aria-label="Regras de qualidade">${bars}</svg>`;
}
// Combina higiene + qualidade + pontuação do Arena de Vendas por responsável (join por nome normalizado — ver matchArenaSeller).
function rankingTable(rows, arena) {
  const byResp = new Map();
  for (const r of rows) {
    const key = r.responsavel || '(sem responsável)';
    if (!byResp.has(key)) byResp.set(key, { responsavel: key, total: 0, pendHigiene: 0, pendQualidade: 0, qtdDesconhecida: 0 });
    const agg = byResp.get(key);
    agg.total++;
    if (r.flagsHigiene.length) agg.pendHigiene++;
    if (r.qualityError) agg.qtdDesconhecida++;
    else if (r.flagsQualidade.length) agg.pendQualidade++;
  }
  const list = Array.from(byResp.values()).sort((a, b) => b.total - a.total);
  const STALE_MS = 1000 * 60 * 60 * 24 * 30;
  const rowsHtml = list.map((a) => {
    const seller = matchArenaSeller(a.responsavel, arena);
    let arenaCell;
    if (!arena || !arena.available) {
      arenaCell = `<span class="arena-na">Arena indisponível</span>`;
    } else if (!seller) {
      arenaCell = `<span class="arena-na">sem match no Arena</span>`;
    } else {
      const stale = seller.lastActivityAt && (Date.now() - new Date(seller.lastActivityAt).getTime()) > STALE_MS;
      const nota = seller.avgTraining != null ? seller.avgTraining : seller.avgCall;
      arenaCell = `<span class="arena-badge">${esc(seller.levelName || '—')}</span>${seller.xp != null ? ' · ' + seller.xp + ' XP' : ''}${nota != null ? ' · nota média ' + Number(nota).toFixed(1) : ' · sem simulações'}${stale ? ` <span class="stale">(desde ${esc(fmtDateBr(seller.lastActivityAt))} — desatualizado)</span>` : ''}`;
    }
    return `<tr><td class="resp">${esc(a.responsavel)}</td><td>${a.total}</td><td>${a.pendHigiene}</td><td>${a.pendQualidade}${a.qtdDesconhecida ? ` <span class="sub">(+${a.qtdDesconhecida} não avaliados)</span>` : ''}</td><td>${arenaCell}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Responsável</th><th>Deals</th><th>Higiene pendente</th><th>Qualidade pendente</th><th>Arena de Vendas</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

// ---------- HTML ----------
function buildHtml({ counts: c, rows, arena }) {
  const fmt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const pend = rows.filter((r) => r.flags.length).sort((a, b) => b.flags.length - a.flags.length || b.bdays - a.bdays);
  const badge = (f) => {
    let cls = 'b-gray';
    if (f.startsWith('Sem empresa')) cls = 'b-blue';
    else if (f.startsWith('Sem email')) cls = 'b-purple';
    else if (f.startsWith('Sem telefone')) cls = 'b-cyan';
    else if (f.startsWith('Sem atividade')) cls = 'b-red';
    else if (f.startsWith('Estagnado')) cls = 'b-amber';
    else if (f.startsWith('Nota rasa')) cls = 'b-pink';
    else if (f.startsWith('Follow-up sem registro')) cls = 'b-orange';
    return `<span class="badge ${cls}">${esc(f)}</span>`;
  };
  const rowsHtml = pend.map((r) => `<tr>
    <td><span class="pl-tag pl-${r.pipeline.replace(/\s/g, '')}">${esc(r.pipeline)}</span></td>
    <td><a href="https://expertintegrado.pipedrive.com/deal/${r.id}" target="_blank" class="deal-link">${esc(r.titulo) || '(sem título)'}</a><div class="sub">${esc(r.contato) || 'sem contato'}${r.empresa ? ' · ' + esc(r.empresa) : ''}</div></td>
    <td class="etapa">${esc(r.etapa)}</td><td class="val">${brl(r.valor)}</td><td class="resp">${esc(r.responsavel) || '—'}</td>
    <td class="flags">${r.flags.map(badge).join(' ')}</td></tr>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Radar Comercial — Expert Integrado</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0e14;color:#e6edf3;padding:24px;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto}header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:28px;border-bottom:1px solid #1c2433;padding-bottom:18px}
h1{font-size:22px;font-weight:700;letter-spacing:-.3px}h1 .dot{color:#3b82f6}.ts{font-size:13px;color:#7d8590}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}.kpi{background:#11161f;border:1px solid #1c2433;border-radius:12px;padding:18px}
.kpi .v{font-size:30px;font-weight:700}.kpi .l{font-size:12px;color:#7d8590;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.kpi.warn .v{color:#f59e0b}.kpi.ok .v{color:#22c55e}.kpi.tot .v{color:#3b82f6}
.section-title{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#7d8590;margin:26px 0 14px}
.charts{display:grid;grid-template-columns:280px 1fr;gap:16px;margin-bottom:8px}.card{background:#11161f;border:1px solid #1c2433;border-radius:12px;padding:18px}
.card h3{font-size:13px;font-weight:600;color:#c9d1d9;margin-bottom:14px}.chart-svg{width:100%;height:auto;display:block}.chart-pipe{max-width:680px}
.donut-wrap{display:flex;flex-direction:column;align-items:center}.legend{display:flex;gap:16px;margin-top:12px;font-size:12px;color:#9aa4b2;flex-wrap:wrap;justify-content:center}
.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:11px;height:11px;border-radius:3px;display:inline-block}.i-amber{background:#f59e0b}.i-green{background:#22c55e}
table{width:100%;border-collapse:collapse;background:#11161f;border:1px solid #1c2433;border-radius:12px;overflow:hidden;font-size:13px;margin-top:6px}
th{text-align:left;padding:12px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#7d8590;border-bottom:1px solid #1c2433;background:#0d1219}
td{padding:12px 14px;border-bottom:1px solid #161d28;vertical-align:top}tr:last-child td{border-bottom:none}tr:hover td{background:#141b26}
.deal-link{color:#e6edf3;text-decoration:none;font-weight:600}.deal-link:hover{color:#60a5fa}.sub{font-size:11px;color:#7d8590;margin-top:3px}
.etapa{color:#9aa4b2;font-size:12px}.val{font-variant-numeric:tabular-nums;color:#cbd5e1}.resp{font-size:12px;color:#9aa4b2}
.pl-tag{font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px}.pl-SuperSDR{background:#1e3a5f;color:#60a5fa}.pl-Educacional{background:#3b2f5f;color:#a78bfa}.pl-SaaS{background:#1e4f3f;color:#34d399}
.badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 7px;border-radius:5px;margin:1px 0;white-space:nowrap}
.b-blue{background:#1e3a5f;color:#93c5fd}.b-purple{background:#3b2f5f;color:#c4b5fd}.b-cyan{background:#1e4f5f;color:#67e8f9}.b-red{background:#5f1e26;color:#fca5a5}.b-amber{background:#5f461e;color:#fcd34d}.b-gray{background:#2a313c;color:#9aa4b2}
.b-pink{background:#5f1e42;color:#f9a8d4}.b-orange{background:#5f3a1e;color:#fdba74}
.arena-na{color:#5a6472;font-size:12px;font-style:italic}.arena-badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;background:#1e2a4a;color:#93c5fd}.stale{color:#f59e0b;font-size:11px}
footer{margin-top:30px;text-align:center;font-size:12px;color:#5a6472}@media(max-width:820px){.kpis{grid-template-columns:repeat(2,1fr)}.charts{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<header><div><h1>Radar Comercial <span class="dot">·</span> Expert Integrado</h1><div class="ts">Pré pipe review — pós-reunião (apresentação/demo em diante) · ${esc(Object.values(TARGET).join(' · '))}</div></div><div class="ts">Atualizado em ${fmt} (BRT)</div></header>
<div class="kpis"><div class="kpi tot"><div class="v">${c.total}</div><div class="l">Deals pós-reunião</div></div>
<div class="kpi warn"><div class="v">${c.comPendencia}</div><div class="l">Com pendência</div></div>
<div class="kpi ok"><div class="v">${c.ok}</div><div class="l">Higiene OK</div></div>
<div class="kpi"><div class="v">${c.totalAbertos}</div><div class="l">Total abertos (CRM)</div></div></div>
<div class="section-title">Visão geral</div>
<div class="charts"><div class="card donut-wrap"><h3 style="align-self:flex-start">Saúde do funil</h3>${donut(c)}
<div class="legend"><span><i class="i-amber"></i>Com pendência (${c.comPendencia})</span><span><i class="i-green"></i>OK (${c.ok})</span></div></div>
<div class="card"><h3>5 Regras de Higiene CRM — deals afetados</h3>${ruleBars(c)}</div></div>
<div class="section-title">Qualidade de execução (notas + follow-ups)</div>
<div class="kpis" style="grid-template-columns:repeat(3,1fr)">
<div class="kpi warn"><div class="v">${c.comPendenciaQualidade}</div><div class="l">Com pendência de qualidade</div></div>
<div class="kpi ok"><div class="v">${c.okQualidade}</div><div class="l">Qualidade OK</div></div>
<div class="kpi"><div class="v">${c.qualityUnknown}</div><div class="l">Não avaliados (erro Pipedrive)</div></div></div>
<div class="card">${qualityBars(c)}</div>
<div class="section-title">Pendências por pipeline</div>
<div class="card">${pipelineBars(c)}<div class="legend" style="justify-content:flex-start;margin-top:14px"><span><i class="i-amber"></i>Com pendência</span><span><i class="i-green"></i>Higiene OK</span></div></div>
<div class="section-title">Ranking por responsável — higiene, qualidade e Arena de Vendas</div>
${arena && arena.available ? '' : `<div class="card" style="margin-bottom:12px"><span class="arena-na">${esc((arena && arena.reason) || 'Arena indisponível')}</span></div>`}
<div class="card">${rankingTable(rows, arena)}</div>
<div class="section-title">Deals com pendência (${pend.length}) — ordenados por nº de flags e dias estagnado</div>
<table><thead><tr><th>Pipeline</th><th>Deal</th><th>Etapa</th><th>Valor</th><th>Responsável</th><th>Pendências</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<footer>Radar Comercial · gerado via skill pipe-review · ${fmt} BRT</footer></div></body></html>`;
}

// ---------- DEPLOY ----------
async function deploy(buf) {
  const sha = crypto.createHash('sha1').update(buf).digest('hex');
  const up = await req({ method: 'POST', hostname: 'api.vercel.com', path: '/v2/files', headers: { Authorization: `Bearer ${VT}`, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha, 'Content-Length': buf.length } }, buf);
  if (up.status >= 300) throw new Error('upload ' + up.status + ' ' + up.body);
  const payload = JSON.stringify({ name: PROJECT, project: PROJECT, target: 'production', files: [{ file: 'index.html', sha, size: buf.length }], projectSettings: { framework: null } });
  const dep = await req({ method: 'POST', hostname: 'api.vercel.com', path: '/v13/deployments?forceNew=1', headers: { Authorization: `Bearer ${VT}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, payload);
  const j = JSON.parse(dep.body);
  if (dep.status >= 300) throw new Error('deploy ' + dep.status + ' ' + dep.body);
  return { id: j.id, url: 'https://' + j.url };
}

(async () => {
  const [computed, arena] = await Promise.all([compute(), fetchArena()]);
  const data = { ...computed, arena };
  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(data, null, 1));
  const html = buildHtml(data);
  const file = path.join(OUT, 'index.html');
  fs.writeFileSync(file, html);
  const c = data.counts;
  const summary = {
    ...c, byPipeline: c.byPipeline, htmlBytes: html.length, out: file,
    arena: arena.available
      ? { available: true, tenantId: arena.tenantId, sellers: arena.sellers.length }
      : { available: false, reason: arena.reason },
  };

  if (NO_DEPLOY || !VT) {
    summary.deploy = NO_DEPLOY ? 'skipped (RADAR_NO_DEPLOY=1)' : 'skipped (sem token Vercel)';
    console.log(JSON.stringify(summary, null, 1));
    return;
  }
  const dep = await deploy(Buffer.from(html));
  summary.deploy = dep; summary.canonical = `https://${PROJECT}.vercel.app`;
  console.log(JSON.stringify(summary, null, 1));
})().catch((e) => { console.error('ERR', e && e.message ? e.message : e); process.exit(1); });
