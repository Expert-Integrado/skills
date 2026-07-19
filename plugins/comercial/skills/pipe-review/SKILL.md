---
name: pipe-review
description: Use quando Eric pedir pra rodar o radar comercial, "pipe review", dashboard de higiene/qualidade CRM, checagem da disciplina/diligência dos vendedores nos pipelines (Super SDR / Educacional / SaaS), pontuação do Arena de Vendas, ou o relatório pré pipe review das 8h. Gera dashboard HTML auditando deals abertos do Pipedrive contra 5 regras de higiene + 2 regras de qualidade (notas/follow-ups), cruza com a pontuação de treino do Arena de Vendas por vendedor, e faz deploy em pipe-review.vercel.app. NÃO usar pra criar/editar deal específico, reabordar leads, agendar call, ou transferir lead — essas são outras skills do plugin comercial.
allowed-tools: Bash, Read, mcp__whatsapp-agent__send, mcp__expert-brain__save_task
---

# Pipe Review — Radar Comercial

Roda o Radar Comercial (pré pipe review das 8h) direto da máquina, sem SSH e sem script externo: o Bash executa `scripts/radar.cjs` (autocontido, dentro desta skill), que puxa os deals abertos do Pipedrive nos pipelines-alvo, aplica 5 regras de higiene + 2 regras de qualidade determinísticas (sem LLM — números 100% reproduzíveis), cruza com a pontuação de treino do Arena de Vendas por vendedor (best-effort — indisponível é um resultado válido, nunca erro fatal), gera dashboard HTML dark-theme com gráficos SVG inline (sem CDN, sem JS client-side) e faz deploy de produção no projeto Vercel `pipe-review`. O Claude é a voz: lê o JSON do stdout e reporta pro Eric em 1 mensagem.

**Evolução 19/07/2026 (task Brain `5sk3ddfpmi1u`):** o radar deixou de ser só higiene de CRM — agora também avalia qualidade de execução (nota de qualificação registrada, follow-up com registro do que aconteceu) e integra a pontuação de treino do Arena de Vendas por responsável. Ver "O que o script audita" e "Arena de Vendas" abaixo.

## NUNCA

- NUNCA hardcodar nem commitar token — tokens vêm do env ou do 1Password (vault `Agentes Eric`).
- NUNCA reportar a URL de build `pipe-review-XXX.vercel.app` como link principal — é só artefato do build. A URL canônica é `https://pipe-review.vercel.app`.
- NUNCA chumbar o caminho da skill num comando (ex.: o path do marketplace no PC) — derivar sempre do diretório do próprio `SKILL.md` em execução.
- NUNCA editar `scripts/radar.cjs` durante a execução — os números são determinísticos; mesma base = mesmo resultado.
- NUNCA mandar mais de 1 mensagem de report por execução — 1 evento = 1 mensagem, consolidada.
- NUNCA deployar sem confirmação em modo automação/cron. Em modo interativo (Eric pediu pra rodar) o consentimento é implícito.
- NUNCA reportar números quando o JSON vier com `totalAbertos: 0` — o script NÃO valida o status da resposta da API Pipedrive (token inválido/API fora retorna base vazia em silêncio); tratar como falha, não como base limpa (ver Passo 2).
- NUNCA tratar `arena.available: false` como erro do radar nem logar como desvio (Passo 5) — é fallback esperado quando a máquina não tem o token do Arena.
- NUNCA reportar a nota/XP do Arena como dado "de hoje" sem checar o selo de desatualização no dashboard (última atividade > 30 dias) — a base de treino é usada esporadicamente.
- NUNCA assumir qual tenant do Arena é o "de verdade" pelo nome — existe tenant de seed/demo com perfis de exemplo. Confirmar com uma query real antes de fixar `ARENA_TENANT_ID` (nenhum default vem hardcoded neste repo — ver "O que o script audita").
- NUNCA voltar o fetch de atividades por deal pro filtro `/activities?deal_id=X` — a Pipedrive v1 ignora esse parâmetro em silêncio (bug confirmado 19/07/2026); usar sempre `/deals/{id}/activities`.

## SEMPRE

- SEMPRE acentuação correta em qualquer texto pro Eric.
- SEMPRE exibir data/hora do report em BRT (America/Sao_Paulo).
- SEMPRE referenciar `https://pipe-review.vercel.app` no report.
- SEMPRE logar quando houver desvio, e SÓ quando houver — no arquivo definido por regra determinística no Passo 5 (não "escolher").

## Pré-requisitos

| Item | Como verificar | Se faltar |
|------|----------------|-----------|
| Node.js | `command -v node` | Reportar ao Eric e parar (script é Node puro, sem npm install) |
| Token Pipedrive | env `PD_TOKEN` \| `PIPEDRIVE_API_TOKEN` \| `PIPEDRIVE_API_KEY` | Fallback: `op read 'op://Agentes Eric/PIPEDRIVE_API_KEY/credential'` |
| Token Vercel | env `VT` \| `VERCEL_API_TOKEN` \| `VERCEL_TOKEN` | Fallback: `op read 'op://Agentes Eric/VERCEL_API_TOKEN/credential'` |
| Token Arena (opcional) | env `ARENA_SUPABASE_TOKEN` \| `SUPABASE_ACCESS_TOKEN` | Fallback: `op read 'op://Agentes Eric/SUPABASE_ACCESS_TOKEN/credential'`. Sem ele, o radar segue e a seção do Arena vira "indisponível" — nunca bloqueante |
| op CLI (só se precisar do fallback) | `command -v op` | Sem env e sem `op`: token Pipedrive → reportar ao Eric e parar; token Vercel/Arena → rodar mesmo assim (script pula deploy/Arena) |
| Script | `find "$CLAUDE_PLUGIN_ROOT" -name radar.cjs` retorna **exatamente 1** caminho | Ver "Como descobrir o caminho do script (`SCRIPT`)" abaixo. NUNCA chumbar um path de exemplo no comando |
| MCP `whatsapp-agent` | só necessário se o report for por WhatsApp (Passo 4, ramo B) | Se indisponível, reportar na conversa mesmo |

## O que o script audita (contexto operacional)

- **Escopo**: deals com `status=open` nos pipelines **SaaS** (ID 1), **Super SDR** (ID 2) e **Educacional** (ID 6), **filtrados às etapas pós-reunião** (apresentação/demo realizada em diante). Etapas default (env `RADAR_STAGES`): `61,20,21,83` (SaaS), `10,12,14,81` (Super SDR), `60,55,56,82` (Educacional). Por isso `total` (deals auditados) é bem menor que `totalAbertos` (todos os deals abertos do CRM).

- **5 regras de higiene CRM** (cada deal com flag vira linha na tabela do dashboard; deal sem flag = higiene OK):

| # | Regra | O que verifica | Campo JSON |
|---|-------|----------------|------------|
| 1 | Sem empresa | Deal sem Organization vinculada (`org_id`) | `r1` |
| 2 | Sem email | Person sem email cadastrado | `r2` |
| 3 | Sem telefone | Person sem telefone cadastrado | `r3` |
| 4 | Sem atividade aberta | Deal sem próxima atividade agendada (`next_activity_date`) — anti-padrão #1 | `r4` |
| 5 | Estagnado +3d úteis | Deal sem update há 3+ dias úteis (zumbi) | `r5` |

- **2 regras de QUALIDADE** (best-effort por deal — se o fetch de notas/atividades falhar pra um deal específico, ele entra em "não avaliado" e NUNCA vira falso-positivo):

| # | Regra | O que verifica | Campo JSON |
|---|-------|----------------|------------|
| Q1 | Nota rasa/ausente | Nenhuma nota do deal (`/notes?deal_id=`) passa de 40 caracteres de texto (HTML stripado) — indica falta de qualificação registrada | `q1` |
| Q2 | Follow-up sem registro | Deal sem nenhuma atividade concluída (`/deals/{id}/activities?done=1`), OU a atividade concluída mais recente tem o campo `note` vazio/raso (<15 chars) — aderência ao playbook de registrar o que aconteceu | `q2` |

  Essas 2 regras **não entram** no invariante `total == comPendencia + ok` (que continua só higiene — contrato antigo preservado). Elas têm o próprio invariante: `total == comPendenciaQualidade + okQualidade + qualityUnknown`.

  **Pegadinha de API corrigida (19/07/2026):** a Pipedrive v1 **ignora em silêncio** o filtro `/activities?deal_id=X` (devolve atividades de outros deals). O script usa o sub-recurso `/deals/{id}/activities?done=1`, que filtra certo — confirmado em teste real. Se algum dia for preciso tocar nisso, NUNCA voltar pro filtro `?deal_id=` em `/activities`.

- **Arena de Vendas (pontuação por vendedor — best-effort, opcional)**: o script consulta o Supabase do Arena de Vendas via Management API (`SUPABASE_ACCESS_TOKEN` — mesmo PAT usado em consultas administrativas ad-hoc, NÃO é um token dedicado do Arena) e junta por **nome normalizado** (sem acento/case/espaço) com o campo `responsável` do Pipedrive — o email diverge entre os 2 sistemas na prática (confirmado num vendedor real: domínio corporativo cadastrado no Pipedrive vs conta pessoal usada pro login no Arena), então o join é por nome, não por email. Sem o token (`ARENA_SUPABASE_TOKEN`/`SUPABASE_ACCESS_TOKEN` ausentes) ou com qualquer erro de rede/consulta, o campo `arena.available` vira `false` com um `reason` legível — o radar SEGUE normalmente, a seção do dashboard mostra "Arena indisponível" e isso NÃO é tratado como falha do radar (não aciona o Passo 5 de log de desvio).

  **`ARENA_PROJECT_REF` e `ARENA_TENANT_ID` NÃO têm default neste script** (de propósito — são identificadores de infraestrutura e este repo é público; ver `ARENA_PROJECT_REF`/`ARENA_TENANT_ID` no bloco de env do Passo 1). Sem os dois configurados como env local (não versionado), o radar roda normal e a seção do Arena vira "indisponível" — isso é o comportamento correto pra qualquer instalação desta skill fora da máquina do Eric.

  **Cuidado ao configurar o tenant**: dentro do Arena, existe um tenant de seed/demo (perfis de exemplo, sem dado real) que NÃO deve ser usado como fonte do ranking — o time comercial real fica em outro tenant (confirmado via query direta ao Supabase — ver task Brain `5sk3ddfpmi1u`). Antes de fixar `ARENA_TENANT_ID`, confirmar com uma query real (`select p.full_name, p.email from profiles p join tenants t on t.id=p.tenant_id`) qual tenant tem gente de verdade — nunca assumir pelo nome do tenant.

  **Dado pode estar desatualizado**: o dashboard marca `(desde {data} — desatualizado)` quando a última atividade do vendedor no Arena passa de 30 dias — a base de treino é usada esporadicamente, então isso é esperado, não é bug. NUNCA reportar a nota do Arena como "atual" sem checar esse selo.

- **Gráficos** (SVG montado server-side no `radar.cjs` — render idêntico em qualquer navegador/print): donut (% com pendência vs OK), barras horizontais (deals/regras de higiene e de qualidade), barras empilhadas (pendência vs OK por pipeline), tabela de ranking por responsável (higiene + qualidade + Arena).

## Contrato do script `radar.cjs` (entrada / saída / efeitos)

Não é preciso ler o `radar.cjs` pra executar esta skill — o contrato abaixo é fixo e o Passo 2 traz como validá-lo só pelo que sai no stdout. NÃO editar o script (regra em NUNCA).

- **Entrada**: SÓ env vars (tabela de flags no Passo 1). Sem argv, sem stdin.
- **Saída de sucesso**: exit code `0` e **exatamente 1 objeto JSON** no **stdout** (impresso com `JSON.stringify(..., null, 1)` — indentação de 1 espaço). Nada mais é impresso no stdout.
- **Saída de erro**: mensagem no **stderr** com prefixo `ERRO` (token Pipedrive ausente) ou `ERR` (deploy/rede) e exit code `1`. Nenhum JSON no stdout.
- **Ordem dos efeitos colaterais** (importante pro tratamento de falha): o script (1) busca deals na API Pipedrive, (2) grava `data.json` e `index.html` em `RADAR_OUT`, (3) faz o deploy Vercel (salvo se pulado), e SÓ ENTÃO (4) imprime o JSON no stdout. Ou seja: **o deploy acontece ANTES do JSON aparecer** — por isso um `totalAbertos: 0` (base vazia por token inválido) pode já ter publicado um dashboard vazio (ver Passo 2).
- **Validação de comportamento sem ler o fonte** (Passo 2 detalha): o executor confere que os campos do JSON são coerentes entre si — `total == comPendencia + ok` (higiene) e `total == comPendenciaQualidade + okQualidade + qualityUnknown` (qualidade), além de `total <= totalAbertos`. SE alguma dessas contas não bater, tratar como saída suspeita (logar no Passo 5 e reportar a incoerência ao Eric em vez de números como se fossem confiáveis). Não há como "rodar o script em modo dry-run pra comparar"; a checagem de sanidade é essa coerência interna do JSON + o gate `totalAbertos > 0`.
- **`arena`** no JSON é sempre um objeto, nunca ausente: `{ available: true, tenantId, sellers: N }` ou `{ available: false, reason: "..." }`. `available: false` é resultado ESPERADO (fallback gracioso, não erro) quando o token não está configurado na máquina — NÃO logar isso como desvio no Passo 5 nem bloquear o report.

## Passos

### Passo 1 — Resolver tokens e rodar o script

Pré-condição: `command -v node` retorna caminho.

**Como descobrir o caminho do script (`SCRIPT`) — NÃO adivinhar, NÃO hardcodar:**
O Claude Code injeta a env var `CLAUDE_PLUGIN_ROOT` no shell de toda skill de plugin instalado — ela aponta pra raiz do plugin em execução (o valor exato varia por máquina/layout: em cache é algo como `.../plugins/cache/expertintegrado/comercial/<versao>` e em marketplace `.../plugins/marketplaces/expertintegrado`, e o sub-path até o script difere entre os dois). Por isso NÃO se monta o caminho por concatenação fixa — deriva-se dele com `find`, que é layout-agnóstico. O comando abaixo já resolve `SCRIPT` sozinho: procura o único `radar.cjs` sob `$CLAUDE_PLUGIN_ROOT` e usa esse path real. Os dois siblings deste mesmo plugin (`estou-devendo`, `email-cleaner`) usam `CLAUDE_PLUGIN_ROOT` do mesmo jeito.

O bloco completo (colar como está — resolve `SCRIPT` + tokens + roda):

```bash
SCRIPT="$(find "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/plugins}" -path '*/pipe-review/scripts/radar.cjs' 2>/dev/null | head -n1)"
[ -z "$SCRIPT" ] && { echo "ERRO: radar.cjs nao encontrado sob CLAUDE_PLUGIN_ROOT (${CLAUDE_PLUGIN_ROOT:-nao setada})"; exit 1; }
PD="${PD_TOKEN:-${PIPEDRIVE_API_TOKEN:-${PIPEDRIVE_API_KEY:-}}}"
VC="${VT:-${VERCEL_API_TOKEN:-${VERCEL_TOKEN:-}}}"
AR="${ARENA_SUPABASE_TOKEN:-${SUPABASE_ACCESS_TOKEN:-}}"
if command -v op >/dev/null 2>&1; then
  [ -z "$PD" ] && PD="$(op read 'op://Agentes Eric/PIPEDRIVE_API_KEY/credential')"
  [ -z "$VC" ] && VC="$(op read 'op://Agentes Eric/VERCEL_API_TOKEN/credential')"
  [ -z "$AR" ] && AR="$(op read 'op://Agentes Eric/SUPABASE_ACCESS_TOKEN/credential' 2>/dev/null)"
fi
[ -z "$PD" ] && { echo "ERRO: token Pipedrive ausente no env e op CLI indisponivel"; exit 1; }
PD_TOKEN="$PD" VT="$VC" ARENA_SUPABASE_TOKEN="$AR" node "$SCRIPT"
```

- SE `find` não retornar nada (var `CLAUDE_PLUGIN_ROOT` ausente E o fallback `$HOME/.claude/plugins` não tiver o arquivo) → o `echo`/`exit 1` dispara; ir para "Erros comuns e recovery" (linha "radar.cjs não encontrado"). NÃO tentar inventar um caminho manualmente.
- Só o token Pipedrive é bloqueante. SE o token Vercel não resolver → rodar mesmo assim: o script gera os números e pula o deploy (`deploy: "skipped (sem token Vercel)"` — ver Passo 3, nota). SE o token do Arena (`AR`) não resolver → rodar mesmo assim: a seção do Arena vira `available: false` no dashboard, sem impacto no resto (ver "O que o script audita" → Arena de Vendas).
- **Contrato de entrada do script**: recebe TUDO por env var (tabela de flags abaixo) — NÃO aceita argumentos de linha de comando nem stdin. Passar qualquer flag opcional = prefixar a env no comando `node` (ex.: `RADAR_NO_DEPLOY=1 PD_TOKEN="$PD" VT="$VC" node "$SCRIPT"`).

Flags opcionais (env, prefixar no comando `node` se necessário):

| Env | Efeito | Default |
|-----|--------|---------|
| `RADAR_NO_DEPLOY=1` | Só fetch + build, pula o deploy (útil pra testar mudança de layout) | deploy ligado |
| `RADAR_PIPELINES` | Sobrescreve pipelines-alvo (csv `id:nome`) | `1:SaaS,2:Super SDR,6:Educacional` |
| `RADAR_STAGES` | Sobrescreve etapas-alvo (csv de IDs) | `61,20,21,83,10,12,14,81,60,55,56,82` |
| `RADAR_PROJECT` | Nome do projeto Vercel | `pipe-review` |
| `RADAR_OUT` | Diretório de saída dos artefatos (`index.html` + `data.json`) | `path.join(os.tmpdir(), 'radar-skill')` — resolvido pelo Node NO SO onde roda. No PC do Eric (win32) isso vira o path Windows nativo `C:\Users\ERICLU~1\AppData\Local\Temp\radar-skill` (com barras invertidas). NÃO reconstruir esse caminho à mão — ver Passo 2: o próprio JSON traz o `index.html` em `out`, e o `data.json` fica no mesmo diretório desse `out` |
| `RADAR_NO_QUALITY=1` | Pula as 2 regras de qualidade (fetch de notas/atividades por deal) — útil se o volume de deals estourar tempo/rate limit | qualidade ligada |
| `RADAR_QUALITY_CONCURRENCY` | Quantos deals em paralelo no fetch de notas/atividades (regras de qualidade) | `6` |
| `RADAR_NO_ARENA=1` | Pula a consulta ao Arena de Vendas (dashboard sai sem essa seção) | Arena ligada (best-effort) |
| `ARENA_SUPABASE_TOKEN` | Token de Management API do Supabase pra consultar o Arena — se ausente, cai pro fallback `SUPABASE_ACCESS_TOKEN` (mesmo PAT de consultas administrativas) | vazio → tenta `SUPABASE_ACCESS_TOKEN` |
| `ARENA_PROJECT_REF` | Ref do projeto Supabase do Arena de Vendas | **sem default** (identificador de infra, não versionado neste repo público — configurar via env local; ver nota em "O que o script audita") |
| `ARENA_TENANT_ID` | Tenant (UUID) do Arena cujos vendedores entram no ranking | **sem default** (idem — ver nota sobre tenant seed/demo vs tenant real em "O que o script audita") |

Validação: exit code 0 E stdout contém um JSON parseável.
- SE exit code ≠ 0 → ir para "Erros comuns e recovery"; não seguir pro Passo 2.
- SE exit code 0 → seguir.

### Passo 2 — Capturar o JSON do stdout

O script imprime **um JSON** no stdout. Campos relevantes:

```json
{
  "total": 133, "totalAbertos": 819, "comPendencia": 97, "ok": 36,
  "r1": 43, "r2": 24, "r3": 0, "r4": 8, "r5": 78,
  "byPipeline": { "SaaS": { "total": 40, "pend": 30 }, "Super SDR": {}, "Educacional": {} },
  "q1": 12, "q2": 58, "qualityUnknown": 0, "comPendenciaQualidade": 61, "okQualidade": 72,
  "htmlBytes": 45210, "out": "<path absoluto do index.html gerado>",
  "arena": { "available": true, "tenantId": "e7a54214-...", "sellers": 3 },
  "deploy": { "id": "dpl_...", "url": "https://pipe-review-XXX.vercel.app" },
  "canonical": "https://pipe-review.vercel.app"
}
```

- `total` = deals auditados (pipelines-alvo + etapas pós-reunião); `totalAbertos` = todos os deals abertos do CRM. O campo `out` é o **caminho absoluto do `index.html`**, no formato do SO (no PC do Eric, path Windows com `\`).
- **Checagem de sanidade (fazer sempre, antes de reportar)**: confirmar `total == comPendencia + ok` (higiene), `total == comPendenciaQualidade + okQualidade + qualityUnknown` (qualidade) E `total <= totalAbertos`. SE alguma não bater → JSON incoerente: não reportar os números como confiáveis; avisar Eric da incoerência e logar (Passo 5).
- SE `totalAbertos` = 0 → falha silenciosa da API Pipedrive (token inválido/expirado ou API fora): NÃO seguir pros Passos 3-4; avisar Eric que o token Pipedrive parece inválido e que o deploy pode ter publicado um dashboard vazio (o script deploya ANTES de imprimir o JSON); logar (Passo 5) e parar.
- SE `deploy` for a string `"skipped (RADAR_NO_DEPLOY=1)"` ou `"skipped (sem token Vercel)"` → não houve deploy novo; ver Passo 3 (nota) e "Erros comuns".
- `arena.available: false` é normal (fallback gracioso) — NÃO é condição de desvio do Passo 5, só mencionar de leve no report se Eric perguntar pela pontuação.
- **Detalhe de um deal específico** (só se Eric pedir): os dois artefatos ficam no MESMO diretório do campo `out`. NÃO montar o caminho manualmente — derivar do `out` que veio no JSON: o `data.json` é o irmão do `index.html` (mesma pasta, nome `data.json`). Estrutura do `data.json`: `{ "counts": {...mesmos contadores do stdout, mais arena...}, "rows": [ {id, titulo, valor, pipeline, etapa, contato, empresa, responsavel, responsavelEmail, atualizado, bdays, flags:[...], flagsHigiene:[...], flagsQualidade:[...], r1..r5, q1, q2, qualityError}, ... ], "arena": {...} }` — cada objeto em `rows` é um deal auditado com suas flags de higiene E qualidade. Read esse arquivo pelo path derivado do `out` (trocar o basename `index.html` por `data.json`).

### Passo 3 — Montar o report (template literal)

Identificar a "top regra" de higiene: o maior valor entre `r1..r5`, traduzido pelo nome — `r1`=Sem empresa, `r2`=Sem email, `r3`=Sem telefone, `r4`=Sem atividade aberta, `r5`=Estagnado +3d úteis.

Template (preencher `{placeholders}` com os valores do JSON; data/hora atual em BRT):

```
Radar Comercial — {DD/MM} {HH:MM} (BRT)

https://pipe-review.vercel.app

- {total} deals nos funis-alvo (de {totalAbertos} abertos)
- {comPendencia} com pendência de higiene, {ok} OK
- {comPendenciaQualidade} com pendência de qualidade (nota/follow-up), {okQualidade} OK
- Top regra: {nome da top regra} ({valor} deals)
```

Nota: SE o deploy foi pulado (`deploy` = string "skipped ..."), acrescentar 1 linha ao final do report: `Deploy pulado ({motivo}) — a URL acima mostra a última versão publicada; dashboard novo em {out}` (campo `out` do JSON).

Nota Arena: só mencionar a pontuação do Arena de Vendas no report se Eric perguntar especificamente por ela ou pedir o ranking — o padrão é o report de higiene+qualidade acima; o dashboard já traz a seção "Ranking por responsável" completa (com Arena, se disponível) pra quem abrir o link.

### Passo 4 — Entregar (1 mensagem só)

- **A. SE Eric pediu na própria conversa** (caso padrão) → responder com o report na conversa. Fim.
- **B. SE Eric pediu por outro canal** (fora do Claude Code — ex.: Telegram) → notificar no canal canônico de avisos assíncronos, grupo WhatsApp **"Notificações dos Agentes"**:

```
mcp__whatsapp-agent__send({
  to: "120363428759906229-group",
  content: "<report do Passo 3, texto idêntico>",
  instance: "profissional",
  confirmed: true
})
```

  (Dispara do telefone corporativo; Eric lê do pessoal. Detalhes na memória `canal-notificacoes-eric.md`.)
  - `confirmed: true` já na primeira chamada: sem ele o MCP bloqueia o envio pedindo confirmação. O pedido do Eric pra rodar o radar É a confirmação, e o destino é o grupo canônico de notificações dele.
  - SE a resposta indicar bloqueio pelo gate de inbound recente → reenviar a MESMA chamada acrescentando `force_send_after_inbound: true`.
  - SE o MCP `whatsapp-agent` não estiver disponível → entregar o report na conversa e avisar que o WhatsApp não pôde ser usado.

### Passo 5 — Logar SÓ se houve desvio

- **Condição de desvio** (verificável): ocorreu QUALQUER um destes → deploy Vercel HTTP ≥300; Pipedrive HTTP 429; token ausente (Pipedrive ou Vercel); `totalAbertos: 0`; JSON incoerente (checagem de sanidade do Passo 2 falhou); `radar.cjs` não encontrado. SE nenhum ocorreu (execução limpa) → NÃO logar nada e pular este passo.
- **Onde logar (CORREÇÃO-DE-FATO golden run 06/07/2026 — o path antigo apontava pro OneDrive morto e pro `tasks.md`, APOSENTADO em 03/07/2026)**: desvio vira TASK no Brain, a rota única de pendências. SE `mcp__expert-brain__save_task` existe na sessão → `save_task({ title: "pipe-review: desvio — {qual condição}", details: "{o que foi feito/reportado}", priority: 3, tags: ["pipe-review"] })`. SE o Brain não está na sessão → incluir o desvio em destaque no report ao Eric (a mensagem é o registro) e seguir.

## Validação final (checklist)

- [ ] Script terminou com exit code 0 e stdout tinha JSON parseável com `totalAbertos` > 0 e coerente (`total == comPendencia + ok`, `total == comPendenciaQualidade + okQualidade + qualityUnknown`, `total <= totalAbertos`)
- [ ] Report usa a URL canônica `https://pipe-review.vercel.app` (nunca a `pipe-review-XXX`)
- [ ] Report enviado em exatamente 1 mensagem, com acentuação correta e horário em BRT
- [ ] SE deploy pulado/falho → report contém a nota explicando
- [ ] `arena.available: false` tratado como resultado normal, não como falha
- [ ] Log escrito SOMENTE se houve desvio

## Erros comuns e recovery

| Sintoma | Causa | Ação |
|---------|-------|------|
| `ERRO: radar.cjs nao encontrado sob CLAUDE_PLUGIN_ROOT (...)`, exit 1 | `CLAUDE_PLUGIN_ROOT` ausente e o fallback `$HOME/.claude/plugins` não contém o script (skill não instalada como plugin) | Reportar ao Eric que a skill `pipe-review` não parece instalada via plugin nesta máquina e parar — NÃO inventar caminho manual |
| stderr `ERRO: token Pipedrive ausente (...)`, exit 1 | Nenhum dos 3 env de Pipedrive setado e fallback não rodou | Rodar o bloco do Passo 1 completo (com fallback `op read`). Se `op` também ausente → reportar ao Eric e parar |
| `op read` falha (token/vault) | op CLI sem sessão ou item renomeado | Reportar ao Eric o erro literal e parar — NUNCA inventar token |
| stderr `ERR deploy 4xx/5xx ...` | Vercel recusou o deploy (token inválido, projeto, rate) | O dashboard local existe em `RADAR_OUT/index.html` e `data.json` foi gerado ANTES do deploy — rodar de novo com `RADAR_NO_DEPLOY=1` pra obter o JSON, reportar números + aviso de deploy falho, logar (Passo 5) |
| `deploy: "skipped (sem token Vercel)"` no JSON | Token Vercel não chegou ao script | Números válidos, sem URL nova — reportar com a nota do Passo 3 e resolver o token pro próximo run |
| JSON com `totalAbertos: 0` | Token Pipedrive inválido/expirado ou API fora — o script não valida `success` da resposta e deploya mesmo assim | NÃO reportar números; avisar Eric (token suspeito + dashboard publicado pode ter ficado vazio); logar (Passo 5) |
| JSON incoerente (`total != comPendencia + ok`, `total != comPendenciaQualidade + okQualidade + qualityUnknown`, ou `total > totalAbertos`) | Saída inesperada do script | NÃO reportar os números como confiáveis; reportar a incoerência ao Eric e logar (Passo 5) |
| Pipedrive HTTP 429 | Rate limit | Aguardar 60s e rodar 1 retry. Se falhar de novo → reportar ao Eric e logar (Passo 5) |
| Send WhatsApp bloqueado (gate de inbound) | Alguém mandou mensagem no grupo há <10 min sem resposta | Reenviar com `force_send_after_inbound: true` (Passo 4B) |
| `arena.available: false` no JSON | Sem token (`ARENA_SUPABASE_TOKEN`/`SUPABASE_ACCESS_TOKEN`) nesta máquina, `ARENA_TENANT_ID` inválido, ou erro de rede/consulta na Management API | NÃO é desvio — seguir normal, dashboard mostra "Arena indisponível". Só investigar se Eric pedir a pontuação especificamente |
| `qualityUnknown` > 0 | Fetch de notas/atividades falhou pra algum deal específico (rate limit pontual, deal deletado) | Não bloqueia o report — esses deals ficam fora do denominador de qualidade, contados à parte |

## Cron (autônomo, opcional)

O `radar.cjs` não dispara notificação sozinho — quem fala é o Claude. Pra modo cron autônomo (sem Claude), agendar a execução e parsear o JSON num wrapper que notifique. Hoje o fluxo canônico é **skill-mode interativo** (Eric pede → Claude roda → Claude reporta) — e em automação vale a regra do NUNCA: confirmar antes de deployar.

## Exemplo (report preenchido)

```
Radar Comercial — 02/07 08:05 (BRT)

https://pipe-review.vercel.app

- 133 deals nos funis-alvo (de 819 abertos)
- 97 com pendência de higiene, 36 OK
- 61 com pendência de qualidade (nota/follow-up), 72 OK
- Top regra: Estagnado +3d úteis (78 deals)
```
