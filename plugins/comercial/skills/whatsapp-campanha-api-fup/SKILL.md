---
name: whatsapp-campanha-api-fup
description: Use quando o usuario pedir campanha de follow-up/reabordagem/retomada em MASSA via WhatsApp API Oficial (template aprovado) do ChatGuru no canal corporativo Expert Integrado. Gatilhos PT-BR: "campanha de follow-up", "campanha de retomada", "campanha de reabordagem em massa", "disparar template oficial", "follow-up em massa via API oficial", "campanha API oficial", "disparar template ChatGuru", ou quando fornecer lista/CSV de deals do Pipedrive etiquetados CAMP RETOM (ou similar) pra disparo em lote. NAO usar para mensagem individual, link wa.me, ou disparo pelo WhatsApp pessoal (whatsapp-agent) — esses sao outros modos.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, mcp__pipedrive__get_deal_summary, mcp__pipedrive__list_deal_notes, mcp__pipedrive__get_deal_flow, mcp__pipedrive__list_deals, mcp__pipedrive__search_deals
---

# WhatsApp Campanha API Oficial — Follow-up (ChatGuru)

Dispara campanha de follow-up em lote pelo aparelho da **API Oficial** do ChatGuru (template aprovado do WhatsApp Business API), com miolo personalizado por deal do Pipedrive, registro de atividade no deal e log incremental com dedup. A execucao por lead (gravar campos → dialog → atividade) vive numa engine Python reutilizavel — o agente monta a lista, escreve os miolos e chama `run_batch()`. Diferenca pra `campanha-disparo-massa`: nao usa multipart, nao precisa de delay entre leads, nao agenda Call — so dispara o template e registra.

## NUNCA

1. NUNCA usar o MCP pessoal `whatsapp-agent` (Z-API/Supabase, telefone pessoal do Eric) nem montar links `wa.me` nesta skill. Ela opera SEMPRE pelo canal corporativo Expert Integrado via API REST do ChatGuru (`s13.expertintegrado.app`). Cruzar modos quebra a separacao pessoal/corporativo. Disparo individual e outra skill/MCP.
2. NUNCA colocar quebra de linha no miolo — `\n`, `\r\n`, U+2028, `<br>`, `<p>`, nada. O parametro `{{1}}` do template nao aceita e a mensagem NAO entrega (erro Gupshup 132018). Miolo SEMPRE em 1 linha (detalhe na secao "Regra critica — miolo linha unica").
3. NUNCA hardcodar `PD_TOKEN`, `CG_KEY`, `CG_ACCT`, `PHONE_OFICIAL` nesta skill, em script versionado, README ou log de exemplo — o repo `expertintegrado/skills` e PUBLICO. Se um secret vazar pra qualquer arquivo do repo: ROTACIONAR no 1Password + painel ChatGuru/Pipedrive antes de qualquer outra coisa.
4. NUNCA reescrever a engine de disparo do zero numa sessao nova — importar o script (secao "Engine de disparo"). Reescrita sem consultar a skill ja travou um batch inteiro (Sonnet usou `api_key` em vez de `key`).
5. NUNCA usar `api_key` como parametro de auth da API REST do ChatGuru — o nome correto e `key`. Com `api_key`, TODAS as chamadas voltam HTTP 400 `"key ou account_id não informado(s)"`.
6. NUNCA usar `stage_id=2` como "Tentando contato" — no pipeline Prospeccao (7) do Pipedrive Expert Integrado o id correto e **65**; o 2 nao existe (HTTP 400 `ERR_STAGE_NOT_FOUND`).
7. NUNCA rodar batch grande sem piloto de 2-3 leads validado e aprovacao EXPLICITA do usuario.
8. NUNCA montar a lista `LEADS` sem dedup contra o `results.jsonl` da campanha (Passo 1) — sem isso, sessao nova re-dispara pro mesmo lead.
9. NUNCA validar entrega de template testando numero DENTRO da janela de sessao de 24h (destinatario respondeu nas ultimas 24h): o WhatsApp manda como mensagem de sessao (texto livre), o `\n` "passa" e o teste mente. So testar FORA da janela.
10. NUNCA assumir que `dialog_execute` retornando `success` = mensagem entregue — o Gupshup pode rejeitar depois. Conferir no WhatsApp do destinatario ou no historico do chat.

## SEMPRE

1. SEMPRE acentuacao correta de portugues no miolo — e texto externo entregue ao cliente.
2. SEMPRE ancorar dado especifico no passado ("na época", "lá em 2024", "você me falou que") — dado citado como atual envelhece e a copy vira robotica (secao "Regra de ouro").
3. SEMPRE obter o `dialog_id` do template com o usuario — NAO e constante nem inferivel; cada campanha tem seu template aprovado proprio. SE nao veio no pedido → perguntar UMA vez e PARAR ate a resposta (parada legitima mesmo em modo autonomo — ver Passo 0.2).
4. SEMPRE usar o `chat_id` retornado pelo aparelho oficial — o mesmo telefone tem chat_id diferente em cada aparelho (o campo `Link do Chat` padrao do Pipedrive aponta pro aparelho da Central, outro chat_id).
5. SEMPRE registrar atividade no deal: sucesso = subject `Mensagem disparada por API oficial`, type `whatsapp`, done=1; erro = subject `Erro de disparo`, type `task`, done=0 (a engine ja faz).
6. SEMPRE gravar log incremental passando `log_path` no `run_batch()` — e a base do dedup entre sessoes.
7. SEMPRE confirmar COM O USUARIO (que olha o painel ChatGuru — o agente nao tem tool de browser nesta skill) que o dialog tem delay de 5s entre blocos de mensagem ANTES de aprovar o dialog_id pra batch grande (Passo 2). Confirmacao verbal do usuario basta.
8. SEMPRE reportar ao final: total OK / erros / numeros invalidos, com lista de pendentes pro usuario corrigir (Passo 7).

## Pre-requisitos

- **Python 3**: detectar com `command -v python3 || command -v python` (nunca assumir caminho fixo de binario).
- **Workspace**: `WORKSPACE_DIR="${WORKSPACE_DIR:-G:/Meu Drive/claude-workspace/Workspace}"` (Google Drive — default dos PCs do Eric desde 05/07/2026; em headless, exportar a env var). ATENCAO: `~/OneDrive/Workspace` e ARQUIVO MORTO — nao escrever la; a copia legada do claude-sync que mora la so serve de fallback de leitura.
- **Engine (single source of truth executavel)**: `$WORKSPACE_DIR/claude-sync/scripts/whatsapp-api-fup-batch.py`.
  - O arquivo `whatsapp-api-fup-batch.py` ao lado deste SKILL.md e apenas ESPELHO de leitura pra referencia/versionamento.
  - SE a copia de `claude-sync/scripts/` existe → importar SEMPRE ela (a do repo nao roda em producao e pode ficar atras).
  - SENAO (ambiente sem OneDrive/claude-sync, ex.: headless) → importar o espelho do repo E AVISAR o usuario que a copia pode estar atras da producao.
- **Credenciais** (4 valores: `PIPEDRIVE_API_KEY`, `CHATGURU_API_KEY`, `CHATGURU_ACCOUNT_ID`, `CHATGURU_PHONE_ID_OFICIAL`): a engine le do JSON local (cache do 1Password gravado pelo `setup-secrets.ps1`), em 2 arquivos:
  - `{SYNC}/claude_desktop_config.json` → chave `mcpServers.pipedrive.env.PIPEDRIVE_API_KEY`. A engine chama esse valor de `PD_TOKEN` — **`PD_TOKEN` e `PIPEDRIVE_API_KEY` sao a MESMA string**, so muda o nome interno; toda mencao a `{PD_TOKEN}` nesta skill = valor de `PIPEDRIVE_API_KEY`.
  - `{SYNC}/claude_desktop_config-ERICLUCIANO-PC.json` (fallback: `-PC-2.json`) → chaves `mcpServers.chatguru-mcp.env.{CHATGURU_API_KEY, CHATGURU_ACCOUNT_ID, CHATGURU_PHONE_ID_OFICIAL}`.
  - **`SYNC` se resolve SOZINHO no topo da engine** (~linha 31, desde 07/07/2026): ordem = env var `CLAUDE_SYNC_DIR` → autodeteccao (`G:/Meu Drive/claude-workspace/Workspace/claude-sync` primeiro, depois o legado `C:/Users/Eric Luciano/OneDrive/Workspace/claude-sync` — ganha o primeiro que tiver `claude_desktop_config.json`). A engine NAO le `WORKSPACE_DIR`. Verificacao rapida antes de rodar: `[ -f "$WORKSPACE_DIR/claude-sync/claude_desktop_config.json" ] && echo OK`. Em maquina cujo claude-sync mora fora dos 2 paths conhecidos → exportar `CLAUDE_SYNC_DIR` apontando pra pasta certa (nao editar a engine). SE a engine em producao for uma copia ANTIGA (grep `grep -n "CLAUDE_SYNC_DIR" .../whatsapp-api-fup-batch.py` nao acha nada) → atualizar a copia de producao a partir do espelho do repo antes de rodar.
  - Ordem de busca se um token faltar no JSON:
  1. Env var homonima (`echo "$CHATGURU_API_KEY"` etc.);
  2. 1Password (fonte canonica): `op read "op://Agentes Eric/<TOKEN>/credential"` — detectar `op` com `command -v op`;
  3. Se nao achou → reportar ao usuario qual token falta e PARAR (nao inventar valor).
  - **Ao rotacionar um token (ATENCAO — procedimento mudou):** o `setup-secrets.ps1` atual (v2, repo `secrets-bootstrap`) grava em `~/.claude.json` e NAO propaga mais os `claude_desktop_config*.json` do claude-sync — que sao o cache que a ENGINE le. Apos rotacionar no 1P: atualizar o valor tambem no JSON do claude-sync (edicao manual do campo, sem colar o secret em chat/log) OU exportar a env var homonima antes de rodar. Gotcha adicional: `~/.claude.json` NAO tem `CHATGURU_PHONE_ID_OFICIAL` (so o claude-sync tem) — nao da pra migrar a engine pra ~/.claude.json sem antes incluir essa chave no manifesto do secrets-bootstrap. Nao copiar JSON com secret por canal inseguro.
- **Pasta da campanha (log persistente)**: o `results.jsonl` PRECISA sobreviver entre sessoes (dedup) — NAO usar `mktemp -d`. Definir uma vez por campanha:
  ```python
  import os
  base = os.environ.get('DISPARO_BASE') or ('C:/tmp' if os.path.exists('C:/') else
         os.path.join(os.environ.get('XDG_DATA_HOME', os.path.expanduser('~/.local/share')), 'disparos'))
  CAMP_DIR = f'{base}/disparo-<nome-da-campanha>'   # ex.: C:/tmp/disparo-retom-abr26 no PC
  ```
- **Como executar os blocos Python desta skill (costura Bash ↔ Python)**: os trechos de codigo dos Passos 1 e 6 NAO sao REPL nem comandos soltos. O modo esperado e: (1) gravar UM arquivo runner por rodada com a tool Write (ex.: `{CAMP_DIR}/round1.py`) juntando, na ordem: definicao de `CAMP_DIR` → dedup (Passo 1) → import da engine (Passo 6) → `LEADS` → chamada `run_batch(...)`; (2) executar via Bash: `PY=$(command -v python3 || command -v python); "$PY" -X utf8 "{CAMP_DIR}/round1.py"`. `python -X utf8 -c "..."` fica SO pra one-liners de inspecao. O runner NUNCA contem secrets (a engine carrega as credenciais sozinha do JSON local); pode conter deal_id/phone/miolo — fica em `CAMP_DIR`, fora de qualquer repo.
- **MCP Pipedrive** ativo (so leitura: `get_deal_summary`, `list_deal_notes`, `get_deal_flow`, `list_deals`/`search_deals`). Escrita no Pipedrive (`create_activity`, `update_deal_fields`) esta bloqueada por hook no Claude Desktop — a engine ja escreve via REST direta (`urllib.request`).
- **Encoding no Windows**: scripts proprios devem ter `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` no topo; one-liners de inspecao usam `python -X utf8 -c "..."` (senao nomes com emoji, ex. `Juliana prado💜`, crasham o stdout cp1252 e truncam a listagem). NAO usar curl no Git Bash pra chamadas com acento (cp1252 quebra) — usar Python `urllib.parse.urlencode` (UTF-8).

## Constantes da operacao

| Item | Valor |
|------|-------|
| Phone ID API Oficial (ChatGuru) | ler de `CHATGURU_PHONE_ID_OFICIAL` no JSON local |
| Campo personalizado ChatGuru (miolo) | `Texto_do_Template` |
| Field key Pipedrive — Link do Chat API Oficial (pessoa) | `ac0aa8d970799954747791a22a4645ea9159c7e2` |
| User ID — Expert Integrado | `22805147` |
| Atividade sucesso — subject | `Mensagem disparada por API oficial` |
| Atividade sucesso — type | `whatsapp` (done=1) |
| Atividade erro — subject | `Erro de disparo` |
| Atividade erro — type | `task` (done=0) |
| Em caso de erro — stage destino | `Lead Mapeado` (id 64, pipeline Prospeccao) |
| Em caso de erro — label adicional | `ERRO DE DISPARO` (id 390, preserva labels existentes) |
| Em caso de sucesso — stage destino | **NAO MUDA** por padrao. Passar `target_stage_on_success=65` no `run_batch()` quando o batch partir de etapa que nao seja "Tentando contato" (ex: Lead Mapeado). Como descobrir a etapa de origem: ver regra no Passo 6 |
| Delay entre leads | Nenhum — API oficial nao tem risco de banimento |
| Endpoints | `https://expertintegrado.pipedrive.com/api/v1` + `https://s13.expertintegrado.app/api/v1` |

### Mapa de stages — pipeline 7 (Prospeccao)

ATENCAO: stage_id `2` NAO existe nesse pipeline. "Tentando contato" numerico e **65**, nao 2.

| stage_id | Nome |
|---:|------|
| 64 | Lead Mapeado |
| 65 | Tentando contato |
| 66 | Conexao iniciada/Em qualificacao |
| 68 | Pre-Qualificado |
| 116 | Qualificado |
| 79 | Reuniao agendada |

### Dialogs conhecidos do ChatGuru (API Oficial)

Pegar o ID no painel ChatGuru, embaixo do nome do dialog. `dialog_id` sozinho nao da acesso a nada (precisa de CG_KEY+account_id+phone_id, que ficam no JSON local) — por isso pode ficar documentado. Tambem mapeados no engine como constantes (`DIALOG_TEMPLATE_DISPARO`, `DIALOG_ASSIGN_NIVERTON`, `DIALOG_ASSIGN_TIME_VENDAS`) e no Brain (nota `bywelcthbrfp`).

| Dialog | ID | Funcao |
|--------|-----|--------|
| Template de disparo | `64998eac599de0399b0748d4` | manda a mensagem (template `gupshup utility_generico_05`, miolo no campo `Texto_do_Template`) |
| Atribuir → Niverton | `64998eac98d7c95e2f3ef60c` | roteia o lead pro vendedor Niverton |
| Atribuir → time de vendas | `6a1f8e82a8b8359bec3e6c3a` | manda pro time comercial (fila), sem vendedor especifico |

### Regra critica — miolo SEMPRE linha unica

O parametro `{{1}}` do template (`Texto_do_Template`) NAO aceita quebra de linha. Testado em todos os angulos (03/06/2026, numero fora da janela 24h = template HSM real):

| Formato no miolo | Resultado |
|------------------|-----------|
| Linha unica (emoji 👉 / travessao — / pipe \|) | ✅ entrega perfeito |
| `\n` (quebra de linha) | ❌ NAO entrega (erro Gupshup 132018) |
| `\r\n` | ❌ contem \n, bloqueia igual |
| U+2028 (Unicode Line Separator) | ❌ entrega como caractere lixo "⬛⬛" |
| `<br>` / `<p>` (HTML) | ❌ aparece como texto literal |

Conclusao: miolo SEMPRE em uma linha so, usando emoji/pontuacao como separador visual. Quebra de linha real exige reestruturar o template no Gupshup (quebras no corpo fixo + params separados {{1}}=nome {{2}}=miolo {{3}}=link) — reaprovacao Meta 1-2 dias. Detalhe completo no Brain (nota `rfn7klo8igyj`).

---

## Passos

### Passo 0 — Decisoes com o usuario (bloqueante: sem os 5 itens, NAO iniciar)

1. **Lista de leads** — CSV exportado do Pipedrive, OU filtro (ex: etiqueta `CAMP RETOM ABR 26 - Personalizada`). Filtro "reproduzivel por tool" = expressavel SO com os parametros que as tools aceitam:
   - `mcp__pipedrive__list_deals(status, pipeline_id, stage_id, user_id, buscar_todos=true)` — filtra por status/pipeline/etapa/dono. Ex.: abertos em "Tentando contato" da Prospeccao = `list_deals(status='open', pipeline_id=7, stage_id=65, buscar_todos=true)`.
   - `mcp__pipedrive__search_deals(term, limit)` — busca texto em titulo/contato/empresa.
   - **Etiqueta (label) NAO e filtravel por nenhuma das duas** → filtro por etiqueta = NAO reproduzivel → pedir ao usuario o CSV exportado da view filtrada do Pipedrive. Mesma regra pra qualquer filtro fora dos parametros acima (campo custom, data, label_ids etc. — nao existem nessas tools).
   - **Como obter o CSV (mecanico):** pedir ao usuario o PATH do arquivo CSV exportado do Pipedrive (a skill nao exporta o CSV sozinha — o usuario exporta a view filtrada no Pipedrive e informa o caminho). Quando o usuario fornecer o path → ler o arquivo com a tool `Read` e montar os candidatos a partir dele. Enquanto o usuario NAO fornecer o path → PARAR e aguardar (parada legitima, mesmo em modo autonomo — sem a lista nao ha o que disparar).
   - Atencao: `list_deals` retorna `id/titulo/etapa/contato/empresa` mas NAO retorna telefone nem `person_id` — esses vem do CSV ou do `get_deal_summary` de cada deal (no modo A/B, que pula a leitura do Passo 3, fazer 1 `get_deal_summary` por lead SO pra extrair phone+person_id).
2. **Dialog ID** do template oficial WhatsApp Business no ChatGuru — NAO e constante (cada campanha tem template aprovado proprio) e NAO e inferivel. SE o usuario ja informou o dialog_id no pedido → usar esse; SENAO → perguntar UMA vez e PARAR ate a resposta. Esta parada e intencional e prevalece sobre qualquer instrucao geral de "nao perguntar / ja executar" (modo autonomo incluso): disparo em massa e side-effect externo irreversivel, e dialog_id errado manda o template errado pra lista inteira.
3. **Framework de copy** — validacao de TEXTO, executada no Passo 4: gerar 1-2 miolos de exemplo, mostrar no chat e obter aprovacao ANTES de gerar os miolos do batch inteiro. NADA e disparado aqui. NAO e a mesma coisa que o Piloto (item 5 / Passo 5), que e disparo REAL de 2-3 leads pra validar entrega — sao DUAS validacoes distintas, em momentos diferentes, e as duas acontecem.
4. **Modo de personalizacao**:
   - **Personalizada (lenta)**: ler historico de cada deal e gerar miolo unico por lead. Custa ~10s/lead em `get_deal_summary`, mas a mensagem fica forte.
   - **Disparo A/B (rapida)**: miolo fixo por categoria. Usuario define o template de A e B, o agente replica em todos. Custa ~1s/lead.
5. **Piloto** — disparo REAL de 2-3 leads (Passo 5) pro usuario validar entrega e a copy como mensagem entregue. Acontece DEPOIS da validacao de texto do item 3 — nao substitui nem e substituido por ela.

### Passo 1 — Pre-flight: deduplicacao obrigatoria

Antes de montar `LEADS` pra qualquer rodada, ler o `results.jsonl` da campanha e remover deals ja disparados:

```python
import json, os
DONE = set()
log = f'{CAMP_DIR}/results.jsonl'
if os.path.exists(log):
    DONE = {json.loads(l)['deal_id'] for l in open(log, encoding='utf-8')}
candidatos = [l for l in candidatos if l['deal_id'] not in DONE]
```

SE a campanha tem rodadas anteriores SEM log (deals processados antes do `results.jsonl` existir) → incluir esses IDs num set hardcoded inicial e mesclar com `DONE`.

### Passo 2 — Conferir o dialog no painel ChatGuru (delays de 5s) — verificacao DELEGADA ao usuario

Quando o miolo e enviado em multiplas mensagens (quebrado em paragrafos pelo dialog), o dialog PRECISA ter intervalo de 5 segundos entre cada parte — mensagens consecutivas em <2s sao flag classico de spam no WhatsApp. Nao ha como suprir NEM conferir via script/tool: a engine so chama `dialog_execute` uma vez (o resto e responsabilidade do dialog) e esta skill nao tem tool de browser no `allowed-tools`. O agente NAO verifica sozinho — pergunta ao usuario (que olha o painel) e aceita confirmacao verbal:

1. Perguntar: "O dialog {dialog_id} quebra o texto em mais de um bloco de mensagem? Se sim, cada bloco tem delay de 5s antes do proximo?" (A 1a mensagem dispara imediatamente apos `dialog_execute`, sem delay inicial — isso e o esperado, nao e problema.)
2. SE o usuario confirmar (delay de 5s presente, OU dialog de bloco unico) → prosseguir. Confirmacao verbal basta — nao existe verificacao programatica.
3. SE o usuario disser que nao tem delay → pedir pra ajustar no painel e PARAR ate ele confirmar o ajuste.

### Passo 3 — Fase 1 por lead: leitura Pipedrive (LEITURA COMPLETA) + miolo

Objetivo: extrair o maximo de contexto pra ancorar a copy em algo concreto. Velocidade nao importa — qualidade da copy importa. So se aplica ao modo Personalizada (no A/B, pular pro Passo 4 com os miolos fixos).

**3 chamadas (paralelas quando possivel):**

1. `mcp__pipedrive__get_deal_summary(deal_id)` — campos custom + pessoa + atividades + historico resumido + notas truncadas.
2. `mcp__pipedrive__list_deal_notes(deal_id, limit=20)` — texto completo das notas (o summary trunca em ~250 chars).
3. Produtos da proposta — SO se o historico mostrar passagem por etapa de proposta/negociacao. REST direta: `GET /v1/deals/{deal_id}/products?api_token={PD_TOKEN}` — `{PD_TOKEN}` = valor de `PIPEDRIVE_API_KEY` (mesma string, ver Pre-requisitos); pra chamada avulsa, ler do mesmo JSON local de onde a engine le.
4. (Opcional) `mcp__pipedrive__get_deal_flow(deal_id)` — SE precisar do detalhe de por quais etapas o deal passou (chegou em Demo? Proposta?).

**Campos a EXTRAIR do summary:**

Sobre a pessoa: Nome; Email; LinkedIn / Instagram (gancho de observacao real); Origem do Contato + Detalhes (indicacao? inbound? outbound?).

Sobre a empresa/deal: Empresa, Nicho (antigo), Produtos que oferece; Faturamento mensal/anual (define tom — high ticket vs SMB); Estrutura de colaboradores (porte real); Tempo de mercado; Outras ferramentas (gancho forte); Detalhes sobre volume de Leads e Clientes; Origem da Oportunidade + Detalhes (G4 podcast? Calendly?); Pessoa que indicou; Temperatura Prospeccao (frio/morno/quente — calibra agressividade do CTA).

Sobre o historico: Resumo Prospeccao; Dores (dor declarada); Objetivos com a automacao; Oportunidades de melhoria; Atividades concluidas (quem da Expert falou, quando, sobre o que); Etapas pelas quais passou; Produtos que estavam na proposta.

**Ignorar (nao agregam):** Insights tecnicos (lista generica de ferramentas); Insights de Vendas (script longo do robo); Telefone de atendimento; Agente ativador.

**RANKING DE GANCHOS** — escolher o gancho MAIS FORTE que o lead tiver:

```
1. Indicacao direta do Eric ("o Fulano te indicou em 2024")
2. Produto que estava na proposta ("a gente tinha proposta com Super SDR Gold pro Instituto GT")
3. Reuniao/demo que aconteceu mas nao fechou ("a gente teve consultoria em 2024 mas nao fechou")
4. Reuniao agendada que nao rolou ("agendou demo mas nao apareceu")
5. Volume especifico citado ("vocês operam 350 leads/dia")
6. Ferramenta especifica ("vi que vocês usam Monday + WhatsApp Web")
7. Dor declarada ("você falou de no-shows")
8. Origem identificavel ("você veio do podcast G4", "preencheu o Calendly do Imposto Invisivel")
9. Empresa + nicho generico (fallback quando nada acima)
```

**Estrutura do miolo (sempre 1 linha, sem quebra):**
```
{Nome}, {referencia temporal — quando + quem da Expert} sobre {empresa} e {contexto: o que aconteceu na ultima conversa}. {Razao temporal: o que mudou em 2026 — geralmente "SDR de IA que faz X" + beneficio especifico ligado ao gancho escolhido}. {Pergunta aberta de descoberta ligada ao gancho: como ta {dor/operacao} aí hoje?}
```

**REGRA DE OURO — dados especificos sim, mas SEMPRE ancorados no passado.** Mostrar contexto é positivo (prova que conhece o lead). O risco e citar dado especifico como se fosse atual quando ja envelheceu — o lead percebe e a copy vira robotica/desatualizada. Toda informacao que pode ter mudado precisa de ancora temporal:

| ❌ Robotico / envelhece | ✅ Ancorado no passado |
|---|---|
| "vocês com 25k seguidores no Instagram" | "na época vocês tavam com uns 25k seguidores no Insta" |
| "vocês usam Devzapp" | "na época vocês usavam o Devzapp" |
| "350 leads/dia" | "lá em 2024 vocês me falaram que rodavam 350 leads/dia" |
| "vocês com 40 vendedores" | "na época vocês tinham um time grande de vendas" |
| "R$3,5MM/ano" | "lá em 2024 a operação ja era high ticket" |

Ancoras temporais validas: "na época", "lá em 2024", "quando a gente conversou", "você me falou que", "naquele momento".

- Cargo/funcao de LinkedIn: SE mantiver como "atual", tem que ser confirmavel (LinkedIn data o cargo). Em duvida → omitir.
- Nome de SDR antigo da Expert (Nara, Renata, Wender, Letícia, Vinícius): pode ja ter saido. Preferir "a gente conversou". SO usar o nome se for figura ainda ativa (Niverton, Kesia, Eric).

**PRINCIPIOS ANTI-BLASE (evitar copy robotica):**

1. Ancorar todo dado especifico no passado ("na época", "lá em 2024", "quando a gente conversou", "você me falou que").
2. Citar pelo menos 2 detalhes especificos quando o deal tem contexto rico — prova de pesquisa real, vira diferencial.
3. Tom de quem lembra, nao de quem pesquisou agora ("você me falou que" > "vi que vocês têm").
4. Conectar dado antigo com solucao atual ("você comentou X — de lá pra cá montamos Y").
5. Nao usar frases tipicas de outreach automatizado: "vi seu perfil no LinkedIn", "notei que vocês", "estava analisando", "andei pesquisando".
6. Cortar dado se gerar duvida — se nao rola um "naquela época" natural, melhor omitir.
7. Nicho e dor categorica sao SEMPRE estaveis (medicina integrativa, no-shows, captacao fraca) — usar livremente sem ancora temporal.

**Detector de "deal vazio" (criterio verificavel):** apos a extracao acima, percorrer o RANKING DE GANCHOS. SE NENHUM gancho dos niveis 1–8 pode ser preenchido com dado concreto extraido — i.e. campos de dor/ferramentas/volume/proposta/indicacao vazios, historico sem reuniao/demo agendada ou realizada, E nenhuma nota do `list_deal_notes` traz dado utilizavel num gancho 1–8 (essa e a definicao de "nota relevante"; nota de log automatico/robô nao conta) — sobrando SO o nivel 9 (empresa + nicho generico) → deal vazio. Nesse caso: sinalizar pro usuario que o lead nao vale Personalizada (deveria ir pra template fixo Disparo A/B) e listar os pendentes no fim do batch pra ELE reclassificar (o agente nao reclassifica sozinho).

### Passo 4 — Copy: Framework A (BDR de alta conversao)

A mensagem final entregue ao cliente pelo template e:
```
Olá.
{miolo}
Obrigado.
```

O `Olá.` e `Obrigado.` sao fixos do template. So o miolo entra no campo personalizado.

**Estrutura do miolo:**
```
{Nome}, {contexto da ultima conversa em 1 frase}. {Razao temporal especifica — o que mudou desde a ultima conversa}. {Pergunta aberta de descoberta — nao "quer marcar?", e sim "como tá X aí?"}
```

**Principios:**
- Pattern interrupt — nao comecar com "voltando a te chamar", "tudo bem?", "lembrei de voce".
- Razao concreta pra falar AGORA — produto evoluiu, mercado mudou, caso recente.
- Especificidade dupla — citar nome da empresa + algo do nicho/dor dela.
- CTA leve — pergunta aberta de descoberta, nao pedido de reuniao.
- Sem "obrigado"/"posso te ajudar" — Olá e Obrigado ja vem no template.

**Anti-padroes (NAO fazer):**
- "Voltando a te chamar aqui" (passivo, sem motivo)
- "Faz sentido retomar?" (pergunta sobre relacao, nao sobre dor)
- "Estamos ajudando empresas a usar IA pra elevar isso" (vago)
- Frases longas de cumprimento que poluem o miolo
- Quebra de linha (o template nao aceita)

**Exemplos validados:**
```
Rosangila, em 2024 a gente conversou sobre o Super SDR pro Instituto Max Tovar e parou no meio. De lá pra cá o produto evoluiu muito — empresas com volume de leads agora qualificam 24/7 sem precisar contratar SDR humano. Como tá a operação comercial de vocês hoje?
```
```
Lucas, em 2024 você falou da The VOID e da bagunça em qualificação e follow-up dos leads — definiu como "o coração da empresa". De lá pra cá montamos um SDR de IA que cuida exatamente disso: qualifica e dá follow-up por WhatsApp 24/7. Como vocês tão lidando com esse fluxo agora?
```
```
Leonardo, lembrei do Funnel Max porque vocês operam 350 leads/dia e a recuperação via WhatsApp era o gargalo que você tinha citado lá em 2024. De lá pra cá montamos esse fluxo exato — SDR de IA que recupera no WhatsApp e qualifica antes do humano. Como tá a taxa de resposta de vocês hoje?
```

Validar com o usuario 1-2 exemplos ANTES de gerar os miolos do batch inteiro — esta e a validacao de TEXTO prometida no Passo 0.3 (feita UMA vez, aqui; nada e disparado). O Piloto do Passo 5 e outra validacao, com disparo real.

### Passo 5 — Piloto (2-3 leads)

1. Rodar a engine (Passo 6) com subset de 2-3 leads e o MESMO `log_path` da campanha.
2. Montar os links dos chats (`https://s13.expertintegrado.app/chats#{chat_id}` — usar o `chat_id` do resultado) e mostrar pro usuario.
3. Aguardar aprovacao EXPLICITA (copy + entrega confirmada). SE o usuario pedir ajuste → corrigir e repetir o piloto. SENAO aprovado → NAO rodar o batch.

### Passo 6 — Batch via engine

**6.0 — Montagem do `LEADS` (obrigatorio antes de importar a engine):** cada lead precisa de `deal_id`, `person_id`, `phone`, `name`, `miolo`.
- **Modo Personalizada:** `phone`/`person_id` ja vieram do `get_deal_summary` do Passo 3.
- **Modo A/B (que pula o Passo 3):** rodar 1 `mcp__pipedrive__get_deal_summary(deal_id)` POR LEAD SO pra extrair `phone` + `person_id`. AVISO LITERAL: `list_deals` (Passo 0.1) NAO traz telefone nem `person_id` — pular este sub-passo quebra a montagem do `LEADS` (sem `phone` a engine nao dispara; sem `person_id` a F2.5 nao grava o link do chat na pessoa). Se a lista veio de CSV com colunas de telefone/person_id, esses campos ja estao no CSV e este sub-passo e dispensavel.

**Importar (nunca reescrever):**

```python
import os, sys
from importlib.util import spec_from_file_location, module_from_spec
WS = os.environ.get('WORKSPACE_DIR', 'G:/Meu Drive/claude-workspace/Workspace')
ENGINE = f'{WS}/claude-sync/scripts/whatsapp-api-fup-batch.py'
if not os.path.exists(ENGINE):
    # headless/sem OneDrive: usar o espelho ao lado deste SKILL.md
    # e AVISAR o usuario que a copia do repo pode estar atras da producao
    ENGINE = '<pasta-desta-skill>/whatsapp-api-fup-batch.py'
spec = spec_from_file_location('eng', ENGINE)
eng = module_from_spec(spec); spec.loader.exec_module(eng)

DIALOG_ID = '...'  # pedido ao usuario no Passo 0 (especifico de cada template)
LEADS = [
    {'deal_id': 523, 'person_id': 545, 'phone': '5521988582119',
     'name': 'Paulo', 'miolo': 'Paulo, ...'},
    # ...
]

results = eng.run_batch(LEADS, dialog_id=DIALOG_ID,
                        log_path=f'{CAMP_DIR}/results.jsonl',
                        # Opcional: passar quando o batch partir de etapa que NAO seja
                        # "Tentando contato" (ex: Lead Mapeado). Move sucessos pra stage 65.
                        target_stage_on_success=eng.TENTANDO_CONTATO_STAGE)
```

- **`target_stage_on_success` — como decidir (condicao verificavel):** descobrir a etapa ATUAL dos leads da rodada por uma destas fontes: (a) campo `etapa` no retorno de `list_deals` (Passo 0.1); (b) linha `Etapa:` do `get_deal_summary` (Passo 3); (c) coluna de etapa do CSV exportado do Pipedrive. SE todos os leads da rodada ja estao em "Tentando contato" (65) → OMITIR o parametro (default: engine nao move stage no sucesso). SE qualquer lead esta em outra etapa (ex: Lead Mapeado, comum em retry) → passar `target_stage_on_success=eng.TENTANDO_CONTATO_STAGE`. SE a etapa nao e conhecivel por nenhuma das 3 fontes (CSV sem coluna de etapa) → perguntar ao usuario de qual etapa a lista partiu.
- `results` e lista de dicts: `{deal_id, name, phone, phone_used, chat_id, chat_added, ok, erro, assign_erro}`.
- Cada lead precisa de: `deal_id, person_id, phone` (E164 BR: `5511999999999`, 12 ou 13 digitos, comecando com 55, sem espacos/parenteses), `name, miolo`. Filtrar do CSV os que nao baterem no formato e listar pro usuario corrigir manualmente (a engine normaliza pontuacao, mas numero fora do padrao vira erro).
- Sem delay entre leads (default) — API oficial nao tem risco de banimento.
- A engine ja trata: parametro `key` (nao `api_key`), fallback automatico 12↔13 chars no phone, fallback `chat_add`, retry de `dialog_execute`, credenciais do JSON local, log incremental, atividade no deal, stage+label em caso de erro.
- SE precisar adaptar logica nova → editar `claude-sync/scripts/whatsapp-api-fup-batch.py` (single source of truth), NUNCA bifurcar inline nem editar a copia do repo.

**Dialog de atribuicao/roteamento (F3.5) — opcional.** Apos o template, um SEGUNDO dialog pode rotear o lead pro vendedor/time e arquivar o chat. Dois modos:

- **Junto com o disparo:** passar `assign_dialog_id=` no `run_batch()`. Roda template + atribuicao em cada lead. Falha na atribuicao NAO marca o lead como erro (fica em `assign_erro` no resultado).
- **Separado (leads ja disparados):** `eng.run_assign_batch(leads, assign_dialog_id, log_path)` — roda SO o dialog de atribuicao, sem template/campos/atividade. Cada lead so precisa de `phone` (opcional `name`/`deal_id` pro log). Tem fallback 12↔13 chars + 1 retry.

```python
# modo separado — rotear leads ja disparados pro time de vendas:
eng.run_assign_batch(leads, assign_dialog_id=eng.DIALOG_ASSIGN_TIME_VENDAS,
                     log_path=f'{CAMP_DIR}/assign.jsonl')
```

### Passo 7 — Report final ao usuario

```
Campanha {nome} — {data}
- Disparados OK: {n_ok}/{total}
- Erros (task "Erro de disparo" + movidos pra Lead Mapeado + label ERRO DE DISPARO): {n_erro}
  - {deal_id} {nome} — {erro}
- Numeros fora do E164 (nao disparados — corrigir no Pipedrive e re-rodar): {lista}
- Deals "vazios" sugeridos pra reclassificar como A/B: {lista}
- Log: {CAMP_DIR}/results.jsonl
```

Apos correcao manual dos telefones, o batch pode ser re-rodado — o dedup (Passo 1) pula os ja feitos.

---

## O que a engine faz por lead (referencia F2–F4 — NAO reimplementar)

Referencia pra diagnostico; a engine ja implementa tudo isso.

**F2 — Gravar `Texto_do_Template` no ChatGuru** (`chat_update_custom_fields` com `chat_number` E164). O `chat_id` retornado e do **aparelho oficial** — capturar do retorno e usar sempre esse.

**F2.6 — Links do Pipedrive no chat (caminho de volta):** campos ja cadastrados no ChatGuru, visiveis no painel do chat. Sem eles o atendente nao acha o deal/pessoa. A engine junta com F2 numa unica chamada (3 campos — economiza round-trip e garante atomicidade):
- `field__Texto_do_Template` = miolo
- `field__CRM__Link_pessoa` = `https://expertintegrado.pipedrive.com/person/{person_id}`
- `field__CRM__Link_negocio` = `https://expertintegrado.pipedrive.com/deal/{deal_id}`
- Mapeamento nome do painel → API: `CRM | Link pessoa` → `field__CRM__Link_pessoa`; `CRM | Link negócio` → `field__CRM__Link_negocio` (sem acento). Regra: pipe (`|`) vira `__`, espaco vira `_`, acentos somem.

**F2.1 — Fallback `chat_add`:** SE `chat_update_custom_fields` retorna `"Chat não encontrado."` mesmo apos fallback 12↔13 → o chat nao existe na base (lead nunca conversou pelo aparelho oficial). Engine tenta `chat_add` com `text=' '` (espaco em branco — registra o chat SEM disparar mensagem; o miolo vai depois pelo dialog). `text=miolo` retorna `"Mensagem inicial inválida"` no aparelho oficial. SE chat_add OK → aguarda 8s (assincrono) e refaz F2. SE chat_add falha ou F2 ainda falha → marca erro (numero provavelmente invalido/sem WhatsApp ativo).

**F2.5 — Link do chat na pessoa do Pipedrive:** `PUT /v1/persons/{person_id}` com `{'ac0aa8d970799954747791a22a4645ea9159c7e2': 'https://s13.expertintegrado.app/chats#{chat_id}'}` — qualquer SDR depois clica e abre o chat correto.

**F3 — `dialog_execute`** (`chat_number` + `dialog_id`), com 1 retry automatico em 1s (primeira chamada pode falhar com "certificação de contexto ativa" — ver Erros).

**F4 — Atividade no deal via REST direta** (`POST /v1/activities`):
- Sucesso: `{'subject': 'Mensagem disparada por API oficial', 'type': 'whatsapp', 'deal_id': DEAL_ID, 'user_id': 22805147, 'done': 1, 'note': MIOLO}`
- Erro: `{'subject': 'Erro de disparo', 'type': 'task', 'deal_id': DEAL_ID, 'user_id': 22805147, 'done': 0, 'note': mensagem_de_erro}` + move o deal pra `Lead Mapeado` (64) + adiciona label `ERRO DE DISPARO` (390) preservando labels existentes.

---

## Validacao final (checklist)

```
[ ] Lista de leads confirmada (CSV ou filtro reproduzivel — etiqueta = sempre CSV) e dedup contra results.jsonl feito
[ ] dialog_id obtido do usuario (veio no pedido OU perguntado 1x com parada)
[ ] Delay 5s entre blocos do dialog confirmado PELO USUARIO (verbal — agente nao acessa o painel)
[ ] Modo definido: Personalizada (~10s/lead) ou A/B fixo (~1s/lead)
[ ] Framework A validado em TEXTO (1-2 exemplos aprovados pelo usuario, antes de gerar todos os miolos — distinto do piloto)
[ ] Todos os miolos em 1 linha, com acentuacao correta e ancora temporal
[ ] PILOTO com 2-3 leads rodado; links dos chats mostrados
[ ] Aprovacao explicita do usuario pro batch
[ ] Batch rodado (sem delay default; target_stage_on_success=65 se partiu de etapa != Tentando contato)
[ ] results.jsonl salvo no CAMP_DIR da campanha
[ ] Report final: total OK / erros / numeros invalidos
[ ] Pendentes listados (numeros mal formatados + deals vazios) pro usuario corrigir/reclassificar
```

## Erros comuns e recovery

1. **`chat_id` diferente por aparelho** — mesmo telefone tem chat_id diferente em cada `phone_id`. SEMPRE usar o chat_id retornado pelo aparelho que voce esta operando. O link padrao do Pipedrive (`Link do Chat`, sem "API Oficial") aponta pro aparelho da Central — outro chat_id.
2. **`dialog_execute` falha na 1a chamada** com `"Diálogo não foi executado pois o contexto não foi validado (certificação de contexto ativa)."` → retry imediato resolve (a engine ja faz 1 retry automatico antes de marcar erro).
3. **`mcp__pipedrive__create_activity` e `update_deal_fields` bloqueados por hook** (Claude Desktop) → escrita via REST direta com `urllib.request` (a engine ja faz).
4. **Numero fora do E164 puro** (`5519998511984`, 12-13 digitos, comeca com 55) → a API oficial valida estritamente. Filtrar do CSV os fora do formato e listar pro usuario corrigir manualmente.
5. **curl no Git Bash quebra acentos** (cp1252) → usar Python `urllib.parse.urlencode` (UTF-8).
6. **Print Python crasha com emoji no Windows** → `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` no topo do script; one-liners com `python -X utf8 -c "..."`.
7. **`"Chat não encontrado."` (HTTP 400) no F2** → fallback 12↔13 chars: se veio 13 chars com 9 na pos 4, tentar sem; se veio 12, tentar com 9. DDDs divergem entre Pipedrive (como o lead digitou) e ChatGuru (como o WhatsApp registrou). Caso confirmado: deal #1048 (Jeferson) — Pipedrive `5547997565906`, ChatGuru `554797565906`. A engine ja faz esse fallback automatico.
8. **`"Chat não encontrado."` mesmo apos fallback 12↔13** → fallback `chat_add` com `text=' '` (F2.1, a engine ja faz). SE ainda falhar → atividade de erro no Pipedrive; numero provavelmente invalido/sem WhatsApp — correcao manual.
9. **Disparo falhou de vez (F2 + F2.1 + fallback esgotados)** → alem da task "Erro de disparo", a engine move o deal pra `Lead Mapeado` (64) e adiciona label `ERRO DE DISPARO` (390) preservando labels existentes. O deal sai do funil ativo e fica filtravel pela label 390 pra triagem. Atendente corrige o telefone e re-roda o batch (dedup pula os feitos).
10. **HTTP 400 `"key ou account_id não informado(s)"`** → alguem usou `api_key` em vez de `key` na chamada ChatGuru. Usar a engine (ja correta); nao reescrever `cg_call`.
11. **Sucessos "orfaos" na etapa de origem** — a engine NAO move stage no sucesso por padrao (premissa: leads ja estao em "Tentando contato"). SE o batch partir de outra etapa (ex: Lead Mapeado em retry) → passar `target_stage_on_success=65` no `run_batch()` (descoberto em 21/05/2026, retry de 35 leads Calendly).
12. **HTTP 400 `ERR_STAGE_NOT_FOUND` ao mover deal** → usou `stage_id=2`; "Tentando contato" no pipeline Prospeccao e **65**. Conferir o mapa de stages nas Constantes.
13. **Template nao entregou mas `dialog_execute` deu `success`** → provavelmente `\n` no miolo (Gupshup 132018) ou rejeicao posterior do Gupshup. Conferir historico do chat/WhatsApp do destinatario; corrigir miolo pra 1 linha e re-disparar SO os afetados.
14. **Token faltando no JSON local** → buscar env var → `op read "op://Agentes Eric/<TOKEN>/credential"` → se nada, reportar e parar. Ao rotacionar: 1P + atualizar o JSON do claude-sync manualmente (o `setup-secrets.ps1` v2 grava so `~/.claude.json` — nao propaga o cache da engine; ver Pre-requisitos).
