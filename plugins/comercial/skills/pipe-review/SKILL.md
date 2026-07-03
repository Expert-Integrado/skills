---
name: pipe-review
description: Use quando Eric pedir pra rodar o radar comercial, "pipe review", dashboard de higiene CRM, checagem da disciplina/diligência dos vendedores nos pipelines (Super SDR / Educacional / SaaS), ou o relatório pré pipe review das 8h. Gera dashboard HTML auditando deals abertos do Pipedrive contra 5 regras de higiene e faz deploy em pipe-review.vercel.app. NÃO usar pra criar/editar deal específico, reabordar leads, agendar call, ou transferir lead — essas são outras skills do plugin comercial.
allowed-tools: Bash, Read, mcp__whatsapp-agent__send
---

# Pipe Review — Radar Comercial

Roda o Radar Comercial (pré pipe review das 8h) direto da máquina, sem SSH e sem script externo: o Bash executa `scripts/radar.cjs` (autocontido, dentro desta skill), que puxa os deals abertos do Pipedrive nos pipelines-alvo, aplica 5 regras de higiene determinísticas (sem LLM — números 100% reproduzíveis), gera dashboard HTML dark-theme com gráficos SVG inline (sem CDN, sem JS client-side) e faz deploy de produção no projeto Vercel `pipe-review`. O Claude é a voz: lê o JSON do stdout e reporta pro Eric em 1 mensagem.

## NUNCA

- NUNCA hardcodar nem commitar token — tokens vêm do env ou do 1Password (vault `Agentes Eric`).
- NUNCA reportar a URL de build `pipe-review-XXX.vercel.app` como link principal — é só artefato do build. A URL canônica é `https://pipe-review.vercel.app`.
- NUNCA chumbar o caminho da skill num comando (ex.: o path do marketplace no PC) — derivar sempre do diretório do próprio `SKILL.md` em execução.
- NUNCA editar `scripts/radar.cjs` durante a execução — os números são determinísticos; mesma base = mesmo resultado.
- NUNCA mandar mais de 1 mensagem de report por execução — 1 evento = 1 mensagem, consolidada.
- NUNCA deployar sem confirmação em modo automação/cron. Em modo interativo (Eric pediu pra rodar) o consentimento é implícito.
- NUNCA reportar números quando o JSON vier com `totalAbertos: 0` — o script NÃO valida o status da resposta da API Pipedrive (token inválido/API fora retorna base vazia em silêncio); tratar como falha, não como base limpa (ver Passo 2).

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
| op CLI (só se precisar do fallback) | `command -v op` | Sem env e sem `op`: token Pipedrive → reportar ao Eric e parar; token Vercel → rodar mesmo assim (script pula o deploy) |
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

- **Gráficos** (SVG montado server-side no `radar.cjs` — render idêntico em qualquer navegador/print): donut (% com pendência vs OK), barras horizontais (deals afetados por regra), barras empilhadas (pendência vs OK por pipeline).

## Contrato do script `radar.cjs` (entrada / saída / efeitos)

Não é preciso ler o `radar.cjs` pra executar esta skill — o contrato abaixo é fixo e o Passo 2 traz como validá-lo só pelo que sai no stdout. NÃO editar o script (regra em NUNCA).

- **Entrada**: SÓ env vars (tabela de flags no Passo 1). Sem argv, sem stdin.
- **Saída de sucesso**: exit code `0` e **exatamente 1 objeto JSON** no **stdout** (impresso com `JSON.stringify(..., null, 1)` — indentação de 1 espaço). Nada mais é impresso no stdout.
- **Saída de erro**: mensagem no **stderr** com prefixo `ERRO` (token Pipedrive ausente) ou `ERR` (deploy/rede) e exit code `1`. Nenhum JSON no stdout.
- **Ordem dos efeitos colaterais** (importante pro tratamento de falha): o script (1) busca deals na API Pipedrive, (2) grava `data.json` e `index.html` em `RADAR_OUT`, (3) faz o deploy Vercel (salvo se pulado), e SÓ ENTÃO (4) imprime o JSON no stdout. Ou seja: **o deploy acontece ANTES do JSON aparecer** — por isso um `totalAbertos: 0` (base vazia por token inválido) pode já ter publicado um dashboard vazio (ver Passo 2).
- **Validação de comportamento sem ler o fonte** (Passo 2 detalha): o executor confere que os campos do JSON são coerentes entre si — `total == comPendencia + ok` e `total <= totalAbertos`. SE essa aritmética não bater, tratar como saída suspeita (logar no Passo 5 e reportar a incoerência ao Eric em vez de números como se fossem confiáveis). Não há como "rodar o script em modo dry-run pra comparar"; a checagem de sanidade é essa coerência interna do JSON + o gate `totalAbertos > 0`.

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
if command -v op >/dev/null 2>&1; then
  [ -z "$PD" ] && PD="$(op read 'op://Agentes Eric/PIPEDRIVE_API_KEY/credential')"
  [ -z "$VC" ] && VC="$(op read 'op://Agentes Eric/VERCEL_API_TOKEN/credential')"
fi
[ -z "$PD" ] && { echo "ERRO: token Pipedrive ausente no env e op CLI indisponivel"; exit 1; }
PD_TOKEN="$PD" VT="$VC" node "$SCRIPT"
```

- SE `find` não retornar nada (var `CLAUDE_PLUGIN_ROOT` ausente E o fallback `$HOME/.claude/plugins` não tiver o arquivo) → o `echo`/`exit 1` dispara; ir para "Erros comuns e recovery" (linha "radar.cjs não encontrado"). NÃO tentar inventar um caminho manualmente.
- Só o token Pipedrive é bloqueante. SE o token Vercel não resolver → rodar mesmo assim: o script gera os números e pula o deploy (`deploy: "skipped (sem token Vercel)"` — ver Passo 3, nota).
- **Contrato de entrada do script**: recebe TUDO por env var (tabela de flags abaixo) — NÃO aceita argumentos de linha de comando nem stdin. Passar qualquer flag opcional = prefixar a env no comando `node` (ex.: `RADAR_NO_DEPLOY=1 PD_TOKEN="$PD" VT="$VC" node "$SCRIPT"`).

Flags opcionais (env, prefixar no comando `node` se necessário):

| Env | Efeito | Default |
|-----|--------|---------|
| `RADAR_NO_DEPLOY=1` | Só fetch + build, pula o deploy (útil pra testar mudança de layout) | deploy ligado |
| `RADAR_PIPELINES` | Sobrescreve pipelines-alvo (csv `id:nome`) | `1:SaaS,2:Super SDR,6:Educacional` |
| `RADAR_STAGES` | Sobrescreve etapas-alvo (csv de IDs) | `61,20,21,83,10,12,14,81,60,55,56,82` |
| `RADAR_PROJECT` | Nome do projeto Vercel | `pipe-review` |
| `RADAR_OUT` | Diretório de saída dos artefatos (`index.html` + `data.json`) | `path.join(os.tmpdir(), 'radar-skill')` — resolvido pelo Node NO SO onde roda. No PC do Eric (win32) isso vira o path Windows nativo `C:\Users\ERICLU~1\AppData\Local\Temp\radar-skill` (com barras invertidas). NÃO reconstruir esse caminho à mão — ver Passo 2: o próprio JSON traz o `index.html` em `out`, e o `data.json` fica no mesmo diretório desse `out` |

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
  "htmlBytes": 45210, "out": "<path absoluto do index.html gerado>",
  "deploy": { "id": "dpl_...", "url": "https://pipe-review-XXX.vercel.app" },
  "canonical": "https://pipe-review.vercel.app"
}
```

- `total` = deals auditados (pipelines-alvo + etapas pós-reunião); `totalAbertos` = todos os deals abertos do CRM. O campo `out` é o **caminho absoluto do `index.html`**, no formato do SO (no PC do Eric, path Windows com `\`).
- **Checagem de sanidade (fazer sempre, antes de reportar)**: confirmar `total == comPendencia + ok` E `total <= totalAbertos`. SE não bater → JSON incoerente: não reportar os números como confiáveis; avisar Eric da incoerência e logar (Passo 5).
- SE `totalAbertos` = 0 → falha silenciosa da API Pipedrive (token inválido/expirado ou API fora): NÃO seguir pros Passos 3-4; avisar Eric que o token Pipedrive parece inválido e que o deploy pode ter publicado um dashboard vazio (o script deploya ANTES de imprimir o JSON); logar (Passo 5) e parar.
- SE `deploy` for a string `"skipped (RADAR_NO_DEPLOY=1)"` ou `"skipped (sem token Vercel)"` → não houve deploy novo; ver Passo 3 (nota) e "Erros comuns".
- **Detalhe de um deal específico** (só se Eric pedir): os dois artefatos ficam no MESMO diretório do campo `out`. NÃO montar o caminho manualmente — derivar do `out` que veio no JSON: o `data.json` é o irmão do `index.html` (mesma pasta, nome `data.json`). Estrutura do `data.json`: `{ "counts": {...mesmos contadores do stdout...}, "rows": [ {id, titulo, valor, pipeline, etapa, contato, empresa, responsavel, atualizado, bdays, flags:[...], r1..r5}, ... ] }` — cada objeto em `rows` é um deal auditado com suas flags. Read esse arquivo pelo path derivado do `out` (trocar o basename `index.html` por `data.json`).

### Passo 3 — Montar o report (template literal)

Identificar a "top regra": o maior valor entre `r1..r5`, traduzido pelo nome — `r1`=Sem empresa, `r2`=Sem email, `r3`=Sem telefone, `r4`=Sem atividade aberta, `r5`=Estagnado +3d úteis.

Template (preencher `{placeholders}` com os valores do JSON; data/hora atual em BRT):

```
Radar Comercial — {DD/MM} {HH:MM} (BRT)

https://pipe-review.vercel.app

- {total} deals nos funis-alvo (de {totalAbertos} abertos)
- {comPendencia} com pendência, {ok} com higiene OK
- Top regra: {nome da top regra} ({valor} deals)
```

Nota: SE o deploy foi pulado (`deploy` = string "skipped ..."), acrescentar 1 linha ao final do report: `Deploy pulado ({motivo}) — a URL acima mostra a última versão publicada; dashboard novo em {out}` (campo `out` do JSON).

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
- **Onde logar (regra determinística, sem escolher a dedo)**: existe um `log.md` em `$HOME/OneDrive/Workspace/claude-sync/memory/log.md`? Testar com `[ -f ... ]`.
  - SE existe → anexar a linha nele (`log.md` é o arquivo de testes/ações/decisões operacionais, per `workflows.md`).
  - SE NÃO existe → anexar em `$HOME/OneDrive/Workspace/claude-sync/memory/tasks.md` (arquivo canônico que sempre existe), no bloco `Tarefas`. Não criar `log.md` novo — o desvio operacional cabe em `tasks.md` como pendência do dia.
- **O que escrever** (1 linha, formato fixo, data/hora BRT): `- [pipe-review] {DD/MM HH:MM} — desvio: {qual condição} — ação: {o que foi feito/reportado}`.

## Validação final (checklist)

- [ ] Script terminou com exit code 0 e stdout tinha JSON parseável com `totalAbertos` > 0 e coerente (`total == comPendencia + ok`, `total <= totalAbertos`)
- [ ] Report usa a URL canônica `https://pipe-review.vercel.app` (nunca a `pipe-review-XXX`)
- [ ] Report enviado em exatamente 1 mensagem, com acentuação correta e horário em BRT
- [ ] SE deploy pulado/falho → report contém a nota explicando
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
| JSON incoerente (`total != comPendencia + ok` ou `total > totalAbertos`) | Saída inesperada do script | NÃO reportar os números como confiáveis; reportar a incoerência ao Eric e logar (Passo 5) |
| Pipedrive HTTP 429 | Rate limit | Aguardar 60s e rodar 1 retry. Se falhar de novo → reportar ao Eric e logar (Passo 5) |
| Send WhatsApp bloqueado (gate de inbound) | Alguém mandou mensagem no grupo há <10 min sem resposta | Reenviar com `force_send_after_inbound: true` (Passo 4B) |

## Cron (autônomo, opcional)

O `radar.cjs` não dispara notificação sozinho — quem fala é o Claude. Pra modo cron autônomo (sem Claude), agendar a execução e parsear o JSON num wrapper que notifique. Hoje o fluxo canônico é **skill-mode interativo** (Eric pede → Claude roda → Claude reporta) — e em automação vale a regra do NUNCA: confirmar antes de deployar.

## Exemplo (report preenchido)

```
Radar Comercial — 02/07 08:05 (BRT)

https://pipe-review.vercel.app

- 133 deals nos funis-alvo (de 819 abertos)
- 97 com pendência, 36 com higiene OK
- Top regra: Estagnado +3d úteis (78 deals)
```
