---
name: email-cleaner
description: "Use quando o Eric pedir pra organizar/limpar a inbox do Outlook em massa: 'limpa minha inbox', 'tô com email acumulado', 'organiza meu Outlook', 'varre os não lidos', 'arruma minha caixa de entrada', 'tira o lixo do email', 'classifica meus emails'. Limpa a inbox do Outlook do Eric movendo pra pastas semânticas em vez de deletar (deleta só phishing/spam comprovado). NÃO usar pra ler, responder ou enviar UM email específico — só pra triagem em volume."
argument-hint: "[--dry-run] [--max=N]"
allowed-tools: Bash, Read, Edit, mcp__expert-brain__recall, mcp__clickup-mcp__clickup_get_list, mcp__clickup-mcp__clickup_list_tasks, mcp__clickup-mcp__clickup_get_task, mcp__clickup-mcp__clickup_create_task, mcp__clickup-mcp__clickup_get_workspace_members
---

Limpa a inbox do Outlook do Eric em massa via Graph API, movendo emails pra pastas semânticas em vez de deletar (deleta só phishing/spam comprovado). Roda `rules.json` primeiro (regras canônicas), depois faz triagem cognitiva do que sobra, apresenta pro Eric só os humanos que precisam de ação dele, e marca o resto como lido. Toda decisão manual do Eric vira regra nova em `rules.json` pra reduzir triagem nas próximas rodadas. Auth OAuth é isolada (token próprio em `C:/tmp/email-cleaner-token.json`, não toca no MCP outlook).

## NUNCA

- NUNCA deletar um email que não seja phishing comprovado ou propaganda 100% genérica. Na dúvida → mover pra pasta semântica (reversível), nunca delete.
- NUNCA rodar `--apply-rules --execute` sem antes rodar `--apply-rules --dry-run` e ter confirmação explícita do Eric sobre os volumes.
- NUNCA propor rascunho de resposta a cliente que reclamou/cancelou ANTES de checar a lista ClickUp "Satisfação dos clientes" (list_id `901305474727`). Se já tem card com CS ativo cuidando → Eric NÃO intervém.
- NUNCA usar emoji nem texto sem acentuação em rascunho de resposta a humano externo.
- NUNCA tocar na config ou no token do MCP outlook — esta skill usa auth isolada própria.

## SEMPRE

- SEMPRE `--dry-run` antes de `--execute`.
- SEMPRE preferir mover pra pasta a deletar (reversibilidade > velocidade).
- SEMPRE, ao terminar uma decisão nova do Eric sobre um remetente, adicionar a regra em `rules.json` (bloco "Aprender com decisões").
- SEMPRE rascunho de resposta a humano externo em português com acentuação correta, tom curto, sem emoji.
- SEMPRE rodar `--logout` ao final pra apagar o token isolado (pegada zero).

## Pré-requisitos

**MCPs / tools:** Bash, Read, Edit, `mcp__expert-brain__recall`, ClickUp MCP (`clickup_get_list`, `clickup_list_tasks`, `clickup_get_task`, `clickup_create_task`, `clickup_get_workspace_members`).

**Runtime:** `node` (detectar com `command -v node`; se faltar, avisar o Eric e parar).

**Path da skill — RESOLVER o valor real de `SKILL_DIR` ANTES de qualquer comando (passo 0 obrigatório):**

Quando esta skill roda, o Claude Code exporta a env var `CLAUDE_PLUGIN_ROOT` apontando pra raiz do plugin `operacoes` instalado (a pasta que contém `.claude-plugin/plugin.json`). NÃO chute o path "geralmente ~/.claude/...": resolva o valor real desta máquina/sessão rodando o bloco abaixo, que ecoa o path completo e valida que o script existe. `SKILL_DIR` é a variável que os passos seguintes usam (substitua `${SKILL_DIR}` pela string exata que este comando imprimir):

```bash
# Resolve e valida o diretório real da skill nesta máquina.
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/email-cleaner"
echo "SKILL_DIR=$SKILL_DIR"
test -f "$SKILL_DIR/scripts/cleaner.mjs" && echo "cleaner.mjs: OK" || echo "cleaner.mjs: NAO ENCONTRADO"
test -f "$SKILL_DIR/rules.json" && echo "rules.json: OK" || echo "rules.json: NAO ENCONTRADO"
```

- SE `CLAUDE_PLUGIN_ROOT` estiver vazia (o `echo` imprime `SKILL_DIR=/skills/email-cleaner`, sem prefixo) → a skill NÃO foi carregada como plugin do marketplace. Fallback: localizar o arquivo por busca e usar o diretório-pai de `scripts/` como `SKILL_DIR`:
  ```bash
  # Windows/Git Bash: procura o cleaner.mjs no cache de plugins do usuário.
  find "$HOME/.claude/plugins" -type f -name cleaner.mjs -path "*email-cleaner*" 2>/dev/null
  ```
  O `find` costuma retornar MAIS DE UM caminho (uma pasta por versão em `plugins/cache/.../operacoes/<versão>/...` + o clone-fonte em `plugins/marketplaces/...`). Regra de escolha: usar o caminho sob `plugins/cache/` com a MAIOR `<versão>` (ordenação semver do segmento de versão do path); ignorar os de `plugins/marketplaces/` (é o clone-fonte do marketplace, não a instalação). Pegar o caminho escolhido, remover o sufixo `/scripts/cleaner.mjs` e usar o restante como `SKILL_DIR`. Se `find` não achar nada → avisar o Eric que a skill `operacoes/email-cleaner` não está instalada e PARAR.
- SE ambos `cleaner.mjs: OK` e `rules.json: OK` → seguir. SE qualquer um imprimir `NAO ENCONTRADO` → PARAR e reportar ao Eric (instalação incompleta; não improvisar path).

Nos passos abaixo, `${SKILL_DIR}/scripts/cleaner.mjs` é o caminho completo do script (também abreviado como `.../cleaner.mjs`). SEMPRE executar com o caminho completo resolvido acima, nunca com a abreviação literal.

**Setup 1x por máquina** (o script é self-contained, tem `package.json` com `@azure/msal-node`) — teste condicional, NÃO rodar `npm install` toda vez:
```bash
# Só instala se ainda não houver node_modules nesta máquina.
if [ -d "${SKILL_DIR}/node_modules/@azure/msal-node" ]; then
  echo "deps: JA INSTALADAS (pular npm install)"
else
  ( cd "${SKILL_DIR}" && npm install ) && echo "deps: INSTALADAS AGORA"
fi
```
- Critério objetivo de "setup já rodou": existe a pasta `${SKILL_DIR}/node_modules/@azure/msal-node`. SE existe → pular o `npm install`. SENÃO → rodar. (`node_modules/` está no `.gitignore` da skill, então não vem pelo git — cada máquina instala 1x.)

**Arquivos que o script usa (paths FIXOS no `cleaner.mjs`, ambiente Windows do Eric):**
| Arquivo | Papel |
|---------|-------|
| `C:/tmp/email-cleaner-token.json` | Token OAuth isolado (apagado no `--logout`) |
| `C:/tmp/inbox-unread.json` | Snapshot dos não-lidos (gerado por `--inspect-all`) |
| `${SKILL_DIR}/rules.json` | Regras canônicas (delete/move/mark-read + preserve) |

**OAuth (mesmo app Azure do MCP outlook — Eric já deu consent):**
- CLIENT_ID `b044cdc1-5c75-4c25-be87-46e51f036ae6`, TENANT_ID `ac4a752a-850f-4705-9525-7270b98b20b4`
- Escopos: `Mail.ReadWrite + Mail.Send + offline_access + User.Read`

## Pastas semânticas (destino do `move`)

O script cria automaticamente as que faltam. Regra de roteamento:

| Pasta | O que vai |
|-------|-----------|
| `Reuniões/Gravações` | Recaps de Zoom/Fireflies/tldv COM pessoas (não Daily/recorrentes vazios) |
| `Notificações Sistema` | Alertas SaaS sem ação (deploy ok, login novo, OAuth approval) |
| `Recibo` | Comprovantes de pagamento, NF emitidas (já existe) |
| `Cobranças Falhas` | Pagamentos não processados — atenção 24h |
| `Alertas Segurança` | CVEs, kernel updates, suspensões — verificar imediato |
| `Afiliados` | Comissões (Rewardful, Lovable affiliate) |
| `Asaas` | Cobranças de clientes |
| `Comunicação Equipe` | Interno @expertintegrado |
| `Comunicação Cliente` | Humanos externos com pedido |
| `Newsletter` | Conteúdo já consumido (já existe) |
| `Convites Eventos` | Calendário externo |
| `Itens Excluídos` | Lixo real (phishing, spam) |

## Passos

### Passo 1 — Pré-flight de auth

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --auth-check
```
- Critério de sucesso (verificável na saída literal do script): a primeira linha é exatamente uma de três: `status: OK`, `status: SEM_AUTH` ou `status: TOKEN_INVALIDO`. Em `OK` o exit code é 0; nos outros dois é 1.
- SE a saída contém `status: OK` → seguir pro Passo 2.
- SE a saída contém `status: SEM_AUTH` OU `status: TOKEN_INVALIDO` → o Eric precisa rodar o device-code flow NO TERMINAL DELE (o agente não completa o flow interativo — o `--auth` bloqueia esperando o código no navegador). Reportar pro Eric o comando abaixo e ESPERAR confirmação dele antes de continuar. NÃO seguir sem auth.
```bash
# Se o status era TOKEN_INVALIDO, rodar primeiro:  node "${SKILL_DIR}/scripts/cleaner.mjs" --logout
node "${SKILL_DIR}/scripts/cleaner.mjs" --auth
```
Depois que o Eric confirmar que autenticou, re-rodar o `--auth-check` acima e só prosseguir quando ele imprimir `status: OK`.

### Passo 2 — Snapshot dos não-lidos

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --inspect-all
```
- Gera `C:/tmp/inbox-unread.json` com um array `[{id, from_addr, from_name, subject, date}]`.
- Validação (saída literal do script): a última linha tem o formato `<N> emails dumpados em C:/tmp/inbox-unread.json`, onde `<N>` é um inteiro. Extrair `N` = o primeiro número dessa linha.
- SE `N == 0` → não há não-lidos: não houve nenhuma interação nem decisão nova do Eric neste fluxo, então o Passo 8 (aprender com decisões) NÃO se aplica. Reportar pro Eric "inbox de não-lidos já está limpa (0 emails)", rodar o Passo 9 (`--logout`) e ENCERRAR. Não passar pelos Passos 3–8.
- SE `N > 0` → seguir pro Passo 3.

### Passo 3 — Dry-run das regras canônicas

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --apply-rules --dry-run
```
- Saída literal do script (o cabeçalho é `[DRY-RUN]`). Uma linha por regra que casou ≥1 email, no formato:
  `<TAG><padding> <count>  <nome da regra>` — onde `<TAG>` é `DEL` (action delete), `READ` (action mark-read) ou `MOVE-><Pasta>` (action move). No dry-run NÃO aparece o sufixo `[ok:N fail:M]` (isso só no execute).
- Depois das linhas por regra, o script imprime 3 linhas de totais, nesta forma exata:
  - `Afetados pelas regras: <total> de <N> (<pct>%)`
  - `Preservados (humano/equipe): <P>`
  - `Não cobertos (precisam classificação): <U>`
- Além disso, lista os preservados sob `=== PRESERVADOS (Eric decide) ===` e os não-cobertos agrupados por domínio sob `=== NÃO COBERTOS (precisam --view <id>) ===`, cada linha terminando em `id=<id>`.
- Apresentar os VOLUMES pro Eric — usar os números `<total>`, `<P>`, `<U>` e o breakdown por regra (quantos por pasta/DEL/READ) — e PEDIR CONFIRMAÇÃO explícita antes do `--execute`.
- SE Eric não confirmar → parar aqui.

### Passo 4 — Executar as regras

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --apply-rules --execute
```
- Cabeçalho `[EXECUTE]`. Cria as pastas que faltam (imprime `> pasta "<Nome>" criada` pra cada nova) e aplica as regras. Cada linha de regra é igual à do dry-run PORÉM com o sufixo ` [ok:<N> fail:<M>]` no fim.
- Validação: parsear o sufixo `[ok:<N> fail:<M>]` de cada linha. SE alguma regra tem `fail > 0` (o número após `fail:` é maior que zero) → reportar pro Eric quais regras falharam e quantos (não silenciar). Falha comum = token expirou no meio (`Graph 401`) → voltar ao Passo 1 e refazer só o que faltou.

### Passo 5 — Triagem cognitiva dos não-cobertos

Pra cada email listado como "não coberto" (usar os `id` que aparecem como `id=<id>` na seção `=== NÃO COBERTOS ===` da saída do Passo 3/4, ou os `id` do snapshot `C:/tmp/inbox-unread.json`):

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --view <id>
```
Ler o corpo (o script já retorna o texto sem HTML, truncado em 4000 chars) e classificar percorrendo a tabela DE CIMA PRA BAIXO — aplicar a PRIMEIRA linha cujo sinal casar e parar (não reavaliar as de baixo):

| # | Sinal no remetente/assunto | Ação |
|---|----------------------------|------|
| 1 | "Notificação", "alert", "deploy", "OAuth" | mover → `Notificações Sistema` |
| 2 | "Receipt", "Recibo", "NF", "Fatura paga" | mover → `Recibo` |
| 3 | "Failed", "unsuccessful", "bloqueio", "cancelamento" (pagamento) | mover → `Cobranças Falhas` |
| 4 | "CVE", "vulnerability", "security", "suspended" | mover → `Alertas Segurança` |
| 5 | Recap/transcript de reunião COM nome de pessoa | mover → `Reuniões/Gravações` |
| 6 | Newsletter/marketing já enviado várias vezes | mover → `Newsletter` |
| 7 | É HUMANO (critério objetivo abaixo) | separar pro Passo 6 (NÃO mover ainda) |

**Critério objetivo de "é HUMANO" (linha 7)** — só chega aqui o email que NÃO casou nenhuma das linhas 1–6. Marcar como HUMANO SOMENTE se as TRÊS condições forem verdadeiras:
- **(a) Remetente é pessoa, não robô:** o `from_addr` NÃO começa com prefixo transacional (`no-reply`, `noreply`, `no_reply`, `notifications`, `notification`, `mailer`, `bounce`, `postmaster`, `support`, `hello`, `contato`, `atendimento`, `news`, `newsletter`, `info`) — e o `from_name` parece nome de pessoa (dois tokens tipo "Nome Sobrenome"), não nome de produto/empresa.
- **(b) Domínio não-SaaS:** o domínio após o `@` NÃO está na lista de domínios de plataforma/SaaS. Definição objetiva de "domínio SaaS" = domínio que já aparece em qualquer regra do `rules.json` (campos `domains`/`addresses`) OU que casa o padrão de provedor transacional (`*.sendgrid.net`, `*.amazonses.com`, `*.mailgun.org`, `*.postmarkapp.com`, `*.mtasv.net`). Se o domínio já está no `rules.json`, ele NÃO é humano — deveria ter casado uma regra; tratar como não-humano.
- **(c) Assunto pessoal / dirigido ao Eric:** o corpo/assunto se dirige ao Eric em 2ª pessoa ou trata de um assunto específico entre as duas partes (pergunta, pedido, resposta a algo dele) — em oposição a broadcast/marketing/relatório automático (mesmo texto que iria pra qualquer destinatário).
- **Desempate de borda (empresa pequena/domínio desconhecido):** se (a) e (c) são verdadeiras mas há dúvida em (b) porque o domínio é desconhecido (não está no `rules.json` nem casa provedor transacional) → NÃO chutar: tratar como HUMANO e mandar pro Passo 6 (é reversível e o Eric decide lá). O viés de borda é sempre "na dúvida, é humano" — nunca mover/arquivar um possível humano sem passar pelo Eric.

Mover em lote pra cada pasta (agrupar os `id` da mesma categoria numa única chamada):
```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --move-ids "<id1>,<id2>,..." --folder "Nome Da Pasta"
```
- Saída literal: `Move pra "<Pasta>": ok=<N> fail=<M>`. SE `fail` > 0 → reportar quais ids ficaram (podem ter sido movidos por outra rodada) e re-snapshot com `--inspect-all`.

### Passo 6 — Apresentar humanos pro Eric (com checagem CS)

Pra cada email classificado como HUMANO no Passo 5, ANTES de propor qualquer ação:

1. Recall no Brain:
```
mcp__expert-brain__recall  query: "Lista Satisfação ClickUp <nome do cliente>"
```
(nota canônica `ona1g1cgyqz3`)

2. SE o email é reclamação OU pedido de cancelamento de cliente → consultar a lista ClickUp "Satisfação dos clientes" (list_id `901305474727`, Space Operações > Folder Gestão de Contas, https://app.clickup.com/30962394/v/l/6-901305474727-1) via ClickUp MCP:
```
mcp__clickup-mcp__clickup_list_tasks  list_id: "901305474727"
```
Identificar o cliente daquele email e procurar, entre as tasks retornadas pelo `clickup_list_tasks`, o card correspondente por **critério objetivo** (não "por semelhança"). Normalizar os dois lados antes de comparar — minúsculas e sem acentos (ex.: `Satisfação`→`satisfacao`). Considera-se MATCH se **qualquer uma** for verdadeira:
   - o domínio do `from_addr` **sem o TLD** (ex.: `acme` de `contato@acme.com.br`) está contido no título do card; OU
   - o nome da empresa/pessoa que aparece no título do card está contido no `from_name` do email.
   Desempate por contagem de cards que casaram:
   - **exatamente 1 card casou** → é esse; seguir a regra canônica abaixo.
   - **2+ cards casaram OU nenhum casou** → NÃO vincular a nenhum card; listar o caso no briefing final (seção "Clientes em Satisfação") como `<from_name> <<from_addr>> — sem card correspondente` e tratar o email pela regra canônica de "Sem card + cliente reclamando" abaixo (ou apresentar ao Eric se não for reclamação/cancelamento).

   Quando houver exatamente 1 card, aplicar a regra canônica (CLAUDE.md), nesta ordem:
   - **Card existe + tem pelo menos um assignee** → Eric NÃO intervém. Só marcar o email como lido (Passo 7). NÃO propor resposta.
   - **Card existe mas SEM assignee (parado)** → escalar internamente: avisar o Eric que o card do cliente `<nome>` está sem responsável. NÃO improvisar resposta ao cliente.
   - **Sem card + cliente reclamando** → criar card na lista `901305474727` e atribuir ao CS. QUEM é o CS NÃO está fixado na skill (não há mapeamento cliente→CS canônico): resolver assim, nesta ordem —
     1. Listar os candidatos: `mcp__clickup-mcp__clickup_get_workspace_members` (retorna nome/e-mail/id de cada membro).
     2. Verificar se algum card JÁ EXISTENTE nessa mesma lista `901305474727` para esse cliente (ou clientes do mesmo segmento) tem assignee — se sim, esse é o CS daquele cliente; reusar o mesmo `assignee` id.
     3. SE ainda ficar mais de um candidato possível (ambíguo) → NÃO chutar: apresentar ao Eric os candidatos (nome + e-mail) e PERGUNTAR qual CS atribuir, e só criar/atribuir o card após ele confirmar. Criar card com assignee é mutação externa — confirmar antes (CLAUDE.md, "conservador em side-effects externos"). Em nenhum caso improvisar resposta ao cliente.
     Ao criar: `mcp__clickup-mcp__clickup_create_task` com `list_id: "901305474727"`, título `[Satisfação] <nome do cliente> — <assunto do email>`, descrição com o resumo do email, e `assignees: [<id do CS confirmado>]`.

3. SE NÃO é reclamação/cancelamento e ninguém está cuidando → apresentar pro Eric: remetente, assunto, resumo do corpo + sugestão de próximo passo. Se ele pedir rascunho de resposta, escrever em português com acentuação correta, tom curto, sem emoji.

### Passo 7 — Cauda longa

O que sobrou após a triagem (não é humano acionável, não casou pasta) → marcar como lido em massa:
```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --read-ids "<id1>,<id2>,..."
```
- Saída literal: `Mark-read: ok=<N> fail=<M>`. SE `fail` > 0 → reportar quais ids falharam.

### Passo 8 — Aprender com decisões

Pra cada decisão nova que o Eric tomou sobre um remetente/domínio (ex.: "esse aí sempre é lixo", "esse manda pra Newsletter"), adicionar uma regra em `rules.json` (via Edit) na categoria correspondente — assim a próxima rodada já cobre esse remetente automaticamente. Formato de regra (ver exemplos existentes no arquivo):
```json
{ "name": "<descrição>", "action": "move", "folder": "<Pasta>", "match_type": "domain_suffix", "domains": ["@dominio.com"], "reason": "<por quê>" }
```
`action` ∈ `delete | move | mark-read`. `match_type` ∈ `domain_suffix | exact_address | regex_address`. Modificadores opcionais de assunto: `subject_must_match`, `subject_must_not_match` (regex). Remetentes que nunca devem ser tocados vão em `preserve_addresses` / `preserve_domains`.

### Passo 9 — Logout

```bash
node "${SKILL_DIR}/scripts/cleaner.mjs" --logout
```
Apaga `C:/tmp/email-cleaner-token.json`. Saída: `Token apagado.` (ou `Sem token pra apagar.` se já não existia). Pegada zero.

## Subcomandos disponíveis do `cleaner.mjs`

```
--auth                               Device code flow (1x, interativo — Eric roda no terminal dele)
--auth-check                         Verifica token sem solicitar (status: OK | SEM_AUTH | TOKEN_INVALIDO)
--logout                             Apaga token em C:/tmp/email-cleaner-token.json
--list-folders                       Lista pastas existentes (total + não-lidos)
--inspect-all                        Dumpa não-lidos em C:/tmp/inbox-unread.json
--apply-rules --dry-run              Simula rules.json (não altera nada)
--apply-rules --execute              Cria pastas faltantes + aplica rules.json
--view <id>                          Mostra corpo completo do email
--reply <id> --body "texto"          Responde um email
--delete-ids "<id>,<id>..."          Deleta ids (só phishing/spam)
--read-ids "<id>,<id>..."            Marca ids como lidos
--move-ids "<id>,<id>..." --folder "Pasta"   Move ids pra pasta (cria se faltar)
```

## Validação final (checklist)

- [ ] `--auth-check` retornou `status: OK` antes de qualquer ação.
- [ ] `--dry-run` rodou e os volumes foram confirmados pelo Eric antes do `--execute`.
- [ ] Nenhum email foi deletado exceto phishing/spam comprovado (regras `delete` do `rules.json`).
- [ ] Emails de clientes reclamando/cancelando passaram pela checagem ClickUp `901305474727` antes de qualquer resposta.
- [ ] Rascunhos a humanos externos: português acentuado, tom curto, sem emoji.
- [ ] Decisões novas do Eric viraram regra em `rules.json`.
- [ ] `--logout` rodado ao final.
- [ ] Briefing final entregue ao Eric (ver template abaixo).

## Template do briefing final (pro Eric)

```
Inbox limpa. Resumo:

Por categoria:
- Deletados (phishing/spam): {N}
- {Pasta}: {N} movidos
- ... (uma linha por pasta afetada)
- Marcados como lidos (cauda longa): {N}

Atenção (verificar):
- Cobranças Falhas: {N} — {lista de assuntos, se houver}
- Alertas Segurança: {N} — {lista de assuntos, se houver}

Humanos que precisam de você ({N}):
1. {Nome} <{email}> — {assunto} — {sugestão de próximo passo}
2. ...

Clientes em Satisfação (ClickUp já cuida): {N} — só marquei como lido.

Pendentes intencionais (deixei por sua ordem): {lista, se houver}
```

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---------|-------|----------|
| `status: SEM_AUTH` | Token nunca criado nesta máquina | Eric roda `--auth` no terminal dele; esperar confirmação |
| `status: TOKEN_INVALIDO` | Token expirado/corrompido | `--logout` → Eric roda `--auth` de novo |
| `Graph 401` no meio da execução | Token expirou durante a rodada | Voltar ao Passo 1; refazer só o que faltou |
| `Graph 429` | Rate limit do Graph | Aguardar e reprocessar o lote que falhou (o batch é de 20 em 20) |
| `fail > 0` numa regra do `--execute` | Alguns ids inválidos/movidos por outra rodada | Reportar quais falharam; re-snapshot com `--inspect-all` |
| `Falha: rules.json não encontrado em <path>` | `SKILL_DIR` errado / instalação incompleta | Re-rodar o Passo 0 (bloco que resolve e valida `SKILL_DIR`); confirmar que `rules.json: OK` |
| `Falha: Cannot find package '@azure/msal-node'` | `npm install` nunca rodou nesta máquina | Rodar o bloco de setup condicional (Pré-requisitos) que cria `node_modules` |
| `command -v node` vazio | Node não instalado | Avisar Eric e parar — sem fallback |

## Notas de portabilidade

- Este SKILL.md é portável, mas o script `cleaner.mjs` grava em paths fixos de Windows (`C:/tmp/...`). Em ambiente headless/Linux esses paths não existem — a skill só roda no PC/notebook do Eric hoje. (Correção de portabilidade do script é fora do escopo desta otimização — é mudança de código, não de SKILL.md.)
- App Azure = mesmo CLIENT_ID do MCP outlook (consent já dado). Auth isolada: apagar o token com `--logout` não afeta o MCP outlook.
