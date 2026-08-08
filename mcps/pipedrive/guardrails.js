/**
 * guardrails.js — Guardrail de ação em massa do pipedrive-mcp
 * Spec: TODO-bulk-guardrail.md (Eric, 22/05/2026)
 *
 * Duas camadas:
 * 1) checkBulkGate — gate de lote (6+ entidades numa MESMA chamada bulk_*): bloqueia
 *    ANTES de qualquer write, devolve preview completo, exige confirmacao_lote: true.
 * 2) checkSingularBackstop — contador em RAM por categoria (deal_write/person_write/
 *    activity_write) pras tools SINGULARES existentes. Reset automatico apos 30s sem
 *    chamada da categoria. A partir da 6a chamada singular dentro da janela, bloqueia
 *    e orienta a consolidar em bulk_*. Limitacao honesta: as 5 primeiras ja foram —
 *    isso so impede a 6a em diante, nao desfaz nada.
 *
 * Threshold e por CHAMADA/intencao, nao contador acumulado entre chamadas distintas
 * (N lotes de <=5 nunca bloqueiam, mesmo somando >5). Contador em RAM apenas —
 * reinicia com o processo do MCP, por design (ver "NAO fazer" na spec).
 */

const BULK_THRESHOLD = 5; // 1-5 passa livre; 6+ bloqueia
const PREVIEW_MAX_ITEMS = 20;

const SINGULAR_LIMIT = 5; // 5 primeiras passam; a 6a bloqueia
const SINGULAR_WINDOW_MS = 30_000; // reset apos 30s sem chamada da categoria

// ─── Gate de lote (bulk_*) ────────────────────────────────────────────────────

/**
 * @param {Array<object>} operations - lista de operacoes que a chamada bulk_* vai tocar
 * @param {boolean} confirmacao_lote - true somente apos o Eric confirmar o preview
 * @param {object} options
 * @param {string} options.entityLabel - rotulo plural pro preview (ex: "negócios", "contatos")
 * @param {(op: object) => {id: string|number, nome: string, empresa?: string, diffs: string[]}} options.formatItem
 *        funcao que formata CADA operacao em { id, nome, empresa, diffs[] } pro preview
 * @throws {{ blocked: true, preview: string, count: number, operations: Array }} quando bloqueado
 */
export function checkBulkGate(operations, confirmacao_lote, options = {}) {
  const { entityLabel = "entidades", formatItem } = options;

  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("operations deve ser uma lista não vazia.");
  }

  if (operations.length <= BULK_THRESHOLD) {
    return; // passa livre
  }

  if (confirmacao_lote === true) {
    return; // confirmado explicitamente — passa
  }

  // Bloqueado: monta preview (Opção C) SEM tocar em nada
  const count = operations.length;
  const shown = operations.slice(0, PREVIEW_MAX_ITEMS);
  const remaining = count - shown.length;

  const lines = [`AÇÃO EM MASSA BLOQUEADA — ${count} ${entityLabel} na fila, nenhuma alterada ainda.`, ""];

  for (const op of shown) {
    let item;
    try {
      item = formatItem ? formatItem(op) : { id: op.deal_id ?? op.person_id ?? "?", nome: "", diffs: [] };
    } catch {
      item = { id: "?", nome: "(erro ao formatar preview)", diffs: [] };
    }
    const header = [`#${item.id}`, item.nome, item.empresa].filter(Boolean).join(" | ");
    lines.push(`  ${header}`);
    for (const diff of item.diffs || []) {
      lines.push(`    └ ${diff}`);
    }
  }
  if (remaining > 0) {
    lines.push(`  ... (+${remaining} restantes)`);
  }
  lines.push("");
  lines.push("Pra executar TODOS: reenviar com confirmacao_lote: true.");
  lines.push("Pra cancelar: não reenviar.");

  const err = new Error("bulk_gate_blocked");
  err.blocked = true;
  err.preview = lines.join("\n");
  err.count = count;
  err.operations = operations;
  throw err;
}

// ─── Backstop temporal (tools singulares) ────────────────────────────────────

// Estado em RAM, por categoria. Nunca persiste em arquivo (spec: "NAO fazer").
const singularCounters = {
  deal_write: { count: 0, windowStart: 0 },
  person_write: { count: 0, windowStart: 0 },
  activity_write: { count: 0, windowStart: 0 },
};

/**
 * Verifica/incrementa o contador da categoria. Reseta sozinho apos 30s sem chamada.
 * Se a chamada for a 6a (ou mais) dentro da janela, bloqueia SEM incrementar
 * (assim uma retentativa apos consolidar em bulk_* nao fica presa).
 *
 * @param {"deal_write"|"person_write"|"activity_write"} category
 * @param {string} bulkToolName - nome da tool bulk_* correspondente, pra mensagem de orientacao
 * @throws {{ blocked: true, message: string }} quando a janela estoura o limite
 */
export function checkSingularBackstop(category, bulkToolName) {
  const entry = singularCounters[category];
  if (!entry) throw new Error(`Categoria de backstop desconhecida: ${category}`);

  const now = Date.now();
  if (now - entry.windowStart >= SINGULAR_WINDOW_MS) {
    // Janela expirou (ou nunca comecou) — reseta
    entry.count = 0;
    entry.windowStart = now;
  }

  if (entry.count >= SINGULAR_LIMIT) {
    const err = new Error("singular_backstop_blocked");
    err.blocked = true;
    err.message =
      `LIMITE DE AÇÃO EM MASSA — já foram ${entry.count} chamadas singulares desta categoria nos últimos 30s.\n\n` +
      `As anteriores já foram executadas (este backstop não desfaz nada). ` +
      `Pra continuar em lote, consolide as próximas em ${bulkToolName}({ operations: [...] }) — ` +
      `o gate de preview te mostra o diff completo antes de tocar em qualquer registro.\n\n` +
      `O contador reinicia sozinho após 30s sem nenhuma chamada singular desta categoria.`;
    throw err;
  }

  entry.count += 1;
}

// Exposto só pra teste manual/verificacao — nao usar em producao.
export function _resetSingularCountersForTest() {
  for (const key of Object.keys(singularCounters)) {
    singularCounters[key] = { count: 0, windowStart: 0 };
  }
}
