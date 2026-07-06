---
name: estou-devendo
description: "Lista as conversas do WhatsApp pessoal em que o Eric está devendo resposta (lead respondeu por último), classificadas por urgência (URGENTE/HOJE/SEM PRAZO) e opcionalmente com drafts de resposta. Use quando o Eric pedir 'do que estou devendo?', 'quem está esperando resposta?', 'me lembra das pendências de WhatsApp', ou similar. NÃO usar pra: ler ou responder UMA conversa específica (usar o MCP whatsapp-agent direto), enviar mensagem/campanha, nem pendências do ChatGuru corporativo."
argument-hint: "[--categoria=cliente,prospect] [--excluir=descartar,comunidade] [--dias=1] [--limit=20] [--draft] [--urgencia=urgente,hoje]"
allowed-tools: Bash, Read, mcp__whatsapp-agent__inbox, mcp__whatsapp-agent__read, mcp__whatsapp-agent__get_voice_guide, mcp__whatsapp-agent__check_message, mcp__pipedrive__search_deals, mcp__pipedrive__get_deal_summary
---

Lista as conversas do WhatsApp pessoal do Eric onde ele está devendo resposta — quem mandou a última mensagem é o lead/contato, não o Eric. Fonte primária: script Python que consulta o Supabase do projeto WhatsApp Agent (projeto `gmpurkzxtvzqlvkqwjkp`) via Management API. Fallback oficial: tool `mcp__whatsapp-agent__inbox`. Depois de obter os dados, o Claude classifica cada chat por urgência e apresenta um briefing; com `--draft`, sugere respostas na voz do Eric (sem nunca enviar).

## NUNCA

- NUNCA enviar mensagem dentro desta skill. Ela só lista e sugere. Envio é ato separado, via `mcp__whatsapp-agent__send` com `confirmed: true`, SÓ depois de aprovação explícita do Eric ("sim", "confirma", "pode enviar").
- NUNCA passar `--draft` ou `--urgencia` pro script `estou_devendo.py` — ele não as reconhece e falha com `unrecognized arguments`. São diretivas de pós-processamento (passos 5 e 6).
- NUNCA incluir grupos, exceto se o Eric passar `--all-groups` explicitamente (mensagem em grupo não é "devendo resposta" pessoal — gera falso positivo).
- NUNCA imprimir o valor do token `SUPABASE_PAT` (nada de `echo "$SUPABASE_PAT"` ou `printenv SUPABASE_PAT`). Pra checar presença, usar SÓ o comando do passo 2 (`test -n "$SUPABASE_PAT" && echo SET || echo MISSING`). Pra carregar, usar `export SUPABASE_PAT=$(op read ...)` (o valor fica dentro do `$(...)`, fora do transcript).
- NUNCA apresentar draft sem antes validar com `mcp__whatsapp-agent__check_message`.

## SEMPRE

- SEMPRE classificar TODOS os chats retornados em exatamente um nível (URGENTE / HOJE / SEM PRAZO) antes de apresentar (regras no passo 4).
- SEMPRE ordenar, dentro de cada bloco, por `dias_parado` decrescente (quem espera há mais tempo primeiro).
- SEMPRE usar acentuação correta do português em drafts e no briefing (texto externo).
- SEMPRE incluir link clicável `https://wa.me/{chat_id}` quando `chat_id` for só dígitos (10–15 caracteres). SE `chat_id` contém `@lid` ou `-group` → sem link.

## Pré-requisitos

Todos os comandos de checagem abaixo rodam via a tool `Bash` (POSIX sh no Git Bash / VPS). Rodar cada um e ler o resultado — não assumir.

- **Env `SUPABASE_PAT`** (obrigatória pro script; `SUPABASE_SERVICE_ROLE` NÃO é necessária pra esta skill). Fonte canônica: 1Password, vault `Agentes Eric`, item `SUPABASE_ACCESS_TOKEN` (CORREÇÃO-DE-FATO golden run 06/07/2026: o item `SUPABASE_PAT` NÃO existe no vault — só a env var local usa esse nome). Cache local em `~/.claude.json` após `setup-secrets.ps1`; na VPS (container claude-code) já vem exportada pelo `boot-tmux.sh`. Como o valor é sensível, NUNCA imprimir o token — checar só a PRESENÇA (ver passo 2 pro comando exato que não vaza o valor).
- **Env `WHATSAPP_AGENT_SUPABASE_PROJECT`** (opcional; default `gmpurkzxtvzqlvkqwjkp`). Não precisa setar — o script já usa esse default.
- **Python** — detectar com `command -v python3 || command -v python` (nunca assumir caminho fixo; nunca usar `which`). O primeiro que imprimir um caminho é o binário a usar; se `python3` imprime caminho → usar `python3`; senão se `python` imprime caminho → usar `python`; se nenhum imprime nada → Python ausente, pular pro fallback 3-B.
- **MCP `whatsapp-agent`** conectado — necessário pro fallback (passo 3-B), pro modo `--draft` e pra ler conversa específica.
- **MCP `pipedrive`** conectado — só usado pra qualificar cliente VIP na classificação (passo 4).
- **Script**: `estou_devendo.py`, dentro da raiz do plugin `comercial` instalado.
  - O valor real da raiz vem da env var `CLAUDE_PLUGIN_ROOT`, que o harness do Claude Code injeta em runtime quando a skill roda como parte de um plugin instalado — NÃO precisa descobrir nem hard-codar: usar a string literal `${CLAUDE_PLUGIN_ROOT}` no comando e o shell expande. Para conferir pra onde aponta (diagnóstico), rodar via Bash: `echo "$CLAUDE_PLUGIN_ROOT"`.
  - Caminho completo do script (usar EXATAMENTE assim no passo 3-A): `${CLAUDE_PLUGIN_ROOT}/skills/estou-devendo/scripts/estou_devendo.py`.
  - SE `echo "$CLAUDE_PLUGIN_ROOT"` vier VAZIO (skill rodando fora do contexto de plugin, ex.: cópia local do repo): o script está em `<raiz-do-repo>/plugins/comercial/skills/estou-devendo/scripts/estou_devendo.py`. Nesse caso, localizar a raiz do repo (onde a skill foi lida) e montar esse caminho, OU pular pro fallback 3-B se não conseguir localizar. NÃO chutar `~/.claude/plugins/cache/...` — o hash de versão varia e o caminho quebra.

## Flags

**Flags do SCRIPT** (passar direto na linha de comando):

- `--categoria=slug1,slug2` — só chats com pelo menos uma destas categorias
- `--excluir=slug1,slug2` — exclui chats com qualquer destas categorias (default: `descartar,comunidade`)
- `--dias=N` — só pendências paradas há N dias ou mais (default: 1). Aceita decimal (ex: `0.5`). Use `0` pra incluir as de hoje.
- `--limit=N` — máximo de chats no output (default: 20, max: 100)
- `--all-groups` — inclui grupos (não recomendado — gera ruído)
- `--with-snippet` — inclui trecho da última mensagem recebida (faz +N queries; mais lento)

**Diretivas de PÓS-PROCESSAMENTO** (o Claude aplica DEPOIS de rodar o script — NUNCA passar pro script):

- `--draft` — gerar sugestão de resposta pra cada chat URGENTE/HOJE (passo 6)
- `--urgencia=urgente,hoje,sem-prazo` — filtrar a apresentação por nível classificado (passo 5)

## Passos

### Passo 1 — Separar flags

De `$ARGUMENTS`, remover `--draft` e `--urgencia=...` (guardar pra usar nos passos 5 e 6). O restante vai pro script.

### Passo 2 — Garantir SUPABASE_PAT

Todas as checagens rodam via a tool `Bash`. O token é sensível: os comandos abaixo checam só PRESENÇA (imprimem `SET`/`MISSING`), NUNCA o valor. Não usar `echo "$SUPABASE_PAT"` nem `printenv SUPABASE_PAT` (esses vazariam o valor no transcript).

1. Checar presença no env com este comando exato (imprime `SET` se a var existe e não é vazia, `MISSING` caso contrário):
   ```bash
   test -n "$SUPABASE_PAT" && echo SET || echo MISSING
   ```
   SE a saída for `SET` → a env já está disponível → seguir pro passo 3-A (o próprio script lê `os.environ["SUPABASE_PAT"]`, não é preciso reexportar nada).
2. SE a saída do passo 1 for `MISSING`, checar se o CLI `op` existe (imprime o caminho do binário, ou nada):
   ```bash
   command -v op
   ```
   SE imprimiu um caminho → carregar o token do 1Password e exportar na MESMA sessão de shell que vai rodar o script (o `$(...)` mantém o valor fora do transcript; nunca imprimir o resultado):
   ```bash
   export SUPABASE_PAT=$(op read "op://Agentes Eric/SUPABASE_ACCESS_TOKEN/credential")
   ```
   Depois seguir pro passo 3-A rodando o script no MESMO comando/sessão (ver nota no passo 3-A sobre persistência de env entre chamadas Bash).
3. SE a saída do passo 1 for `MISSING` E `command -v op` não imprimiu nada (sem env e sem `op`) → pular direto pro fallback 3-B.

### Passo 3-A — Rodar o script (caminho primário)

IMPORTANTE (persistência de env entre chamadas Bash): neste harness, cada chamada da tool `Bash` roda numa sessão nova — variáveis exportadas numa chamada NÃO sobrevivem pra próxima. Portanto, SE o passo 2 teve que exportar `SUPABASE_PAT` via `op read`, o `export` e o comando `python` abaixo têm que ir na MESMA chamada Bash (separados por `&&` ou em linhas seguidas do mesmo comando). SE o passo 2 já achou a env `SET`, basta rodar o comando python sozinho.

Comando (usar `python3`; ver ajuste abaixo se não existir):

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/estou-devendo/scripts/estou_devendo.py" $ARGUMENTS
```

Exemplo do caso em que precisou carregar o token (tudo numa chamada Bash só):

```bash
export SUPABASE_PAT=$(op read "op://Agentes Eric/SUPABASE_ACCESS_TOKEN/credential") && python3 "${CLAUDE_PLUGIN_ROOT}/skills/estou-devendo/scripts/estou_devendo.py" $ARGUMENTS
```

Ajuste do binário Python: usar o que o `command -v` do passo Pré-requisitos identificou. SE `python3` não existe (comum no Windows local com Python global), trocar `python3` por `python` no comando acima.

**Validação do resultado**: o stdout deve ser um objeto JSON parseável com as chaves `total_pendencias`, `mostrando`, `filtro`, `por_categoria`, `chats`. SE parseou e tem essas chaves → SUCESSO, seguir pro passo 4 com o array `chats`.

**Caso "zero pendências" (resultado VÁLIDO, NÃO é erro)**: SE o JSON veio bem formado mas `chats` é uma lista vazia `[]` (e consequentemente `total_pendencias: 0`, `mostrando: 0`, `por_categoria: {}`) → isso significa literalmente "o Eric não está devendo resposta a ninguém dentro dos filtros aplicados". Exit code é 0. NÃO tratar como falha, NÃO tentar retry, NÃO cair pro fallback. Pular os passos 4–6 (não há o que classificar) e ir direto pro passo 7 apresentando: `Nada pendente — você está em dia (0 conversas devendo resposta com os filtros atuais).` Se o Eric usou `--dias=N` ou `--categoria=...`, mencionar os filtros na mensagem (ex.: "com `--dias=2 --categoria=cliente`").

**Se falhar (erro de verdade)**:
- Exit code 2 (`ERRO: SUPABASE_PAT precisa estar definida`) → voltar ao passo 2; se o token continuar indisponível → fallback 3-B.
- Exit code 1 (`ERRO no SQL: ...`) → tentar 1 retry; se falhar de novo → fallback 3-B.
- stdout não parseia como JSON, OU exit code != 0 sem ser 1/2 → tratar como erro do script; tentar 1 retry; se persistir → fallback 3-B.
- Arquivo não encontrado (`No such file or directory` / `can't open file`) → conferir com `ls "${CLAUDE_PLUGIN_ROOT}/skills/estou-devendo/scripts/"`; se a pasta não existir, reportar ao Eric que o plugin `comercial` precisa ser (re)instalado (`/plugin install comercial@expertintegrado`) e usar o fallback 3-B nesta execução.

**Formato do JSON retornado pelo script**:
- `total_pendencias`: contagem de chats retornados (a query já aplica LIMIT — na versão atual do script é sempre igual a `mostrando`). É `0` quando não há pendências.
- `mostrando`: quantos chats no array `chats`.
- `filtro`: objeto com os filtros efetivamente aplicados (`categorias_incluir`, `categorias_excluir`, `dias_min`, `incluir_grupos`) — útil pra ecoar os filtros na mensagem de "zero pendências". Só informativo; não afeta a classificação.
- `por_categoria`: contagem agrupada por categoria (chave `(sem categoria)` quando o chat não tem categoria atribuída). Objeto vazio `{}` quando não há chats.
- `chats`: array `[{ chat_id, chat_name, is_group, categories[], category_labels[], dias_parado, ultima_msg_recebida, ultima_msg_enviada, snippet? }]`, ordenado do mais antigo pro mais recente (= quem espera há mais tempo primeiro). NÃO há campo `link` — o Claude monta `https://wa.me/{chat_id}` conforme regra do SEMPRE. Array vazio `[]` = zero pendências (ver caso acima).

### Passo 3-B — Fallback oficial (sem script/SQL)

```
mcp__whatsapp-agent__inbox(
  waiting_on="eric",
  exclude_groups=true,            // false SÓ se --all-groups
  exclude_categories=["descartar","comunidade"],  // ou os slugs de --excluir
  category_slugs=[...],           // só se --categoria foi passada
  limit=50                        // máximo da tool é 50
)
```

Retorna exatamente os chats em que o Eric está devendo resposta. Pós-processar manualmente:
- Calcular `dias_parado` a partir do timestamp da última mensagem de cada chat (agora − timestamp da última msg, em dias; use 2 casas decimais como o script faz).
- Aplicar o filtro `--dias`: manter só chats com `dias_parado >= N` (default 1).
- Aplicar `--limit` (default 20).

SE, após esses filtros, não sobrar nenhum chat → é o mesmo caso "zero pendências" do passo 3-A: resultado VÁLIDO, não é erro. Pular passos 4–6 e apresentar a mensagem de "você está em dia" no passo 7.

### Passo 4 — Classificar urgência (obrigatório)

A categoria de cada chat vem do array `categories` (slugs, ex.: `["cliente"]`) que o script/fallback retorna. "Categoria contém X" = a string `X` está nesse array. Classificar cada chat nesta ordem de avaliação (a PRIMEIRA regra que casar decide o nível — parar de avaliar as demais):

1. SE `dias_parado >= 3` (qualquer categoria) → **URGENTE** (já tá ruim, decidir).
2. SE `categories` contém `lead` (qualquer status) → **URGENTE**.
3. SE `categories` contém `cliente` → checar se é VIP consultando o Pipedrive:
   a. Rodar `mcp__pipedrive__search_deals(term=<chat_name>, limit=10)`, onde `<chat_name>` é o campo `chat_name` do chat. Cada item retornado por `search_deals` traz `{ id, titulo, valor, status, etapa, pipeline, contato, empresa }`.
      - **Normalização** (aplicar a TODAS as comparações abaixo): passar tudo pra minúsculas E remover acentos (ex.: `José` → `jose`, `Maurício` → `mauricio`). Comparar sempre as versões normalizadas de `chat_name` contra os campos `contato`, `empresa` e `titulo` de cada deal.
      - **Match forte** (o `chat_name` do WhatsApp costuma ser apelido salvo no celular e pode não bater com o cadastro do Pipedrive): considerar um deal como match forte SOMENTE se o `chat_name` normalizado tiver 2+ palavras (nome completo — primeiro nome + ao menos um sobrenome) E, para QUALQUER um dos campos `contato`, `empresa` ou `titulo` do deal, valer UMA destas condições sobre as versões normalizadas:
        1. o `chat_name` completo normalizado (as 2+ palavras) está contido no campo do deal (ex.: `chat_name="Mauricio Silva"` dentro de `contato="Mauricio Silva Souza"`), OU
        2. tanto o PRIMEIRO nome quanto o ÚLTIMO sobrenome do `chat_name` aparecem ambos no campo do deal (ex.: `chat_name="Mauricio Souza"` casa com `contato="Mauricio Silva Souza"`).
        - IMPORTANTE: um `chat_name` de UMA palavra só (só primeiro nome, ex.: `chat_name="Mauricio"`) NUNCA é match forte — mesmo que essa palavra esteja contida num campo do deal. Nesse caso o deal, se casar, é apenas candidato de `match incerto` (ver abaixo).
      - **Match incerto** (NÃO classificar VIP automaticamente): SE nenhum deal deu match forte mas há deal(s) em que SÓ o primeiro nome do `chat_name` bate (seja porque o `chat_name` só tem uma palavra, seja porque o sobrenome não confere), OU há 2+ deals dando match forte → tratar este chat como `match incerto`: NÃO consultar valor pra qualificar VIP, classificar **HOJE** e, no briefing do passo 7, listá-lo com a marcação `[match incerto — <N> candidatos no Pipedrive: <contato/empresa dos deals>]` pro Eric decidir manualmente. Encerrar esta regra (não seguir pra (b)/(c)).
      - SE NENHUM item do resultado der match forte NEM match incerto pelos critérios acima (ou o `search_deals` voltar vazio) → tratar como "sem deal do cliente" → classificar **HOJE** e encerrar esta regra (não chamar `get_deal_summary`).
   b. Ao chegar aqui há exatamente 1 deal com match forte (o caso de 2+ match fortes já foi desviado pra `match incerto` em (a)). Verificar o `status` desse deal:
      - SE não estiver `open` (é `won`/`lost`) → **HOJE**.
      - SE estiver `open` → é esse o deal de referência.
   c. Do deal de referência escolhido em (b), usar o campo `valor` retornado pelo `search_deals` (em BRL). Opcional: `mcp__pipedrive__get_deal_summary(deal_id=<id do deal de referência>)` só se precisar confirmar o valor (a tool exige `deal_id` numérico — por isso o search antes). SE `valor >= 40000` → **URGENTE**; SENÃO (valor menor) → **HOJE**.
4. SE `categories` contém `parceiro` → obter a última mensagem (usar `snippet` se rodou `--with-snippet`; senão `mcp__whatsapp-agent__read(chat=<chat_id>, limit=3)`); SE menciona dinheiro, pagamento, proposta ou prazo → **URGENTE**; SENÃO → **HOJE**.
5. SE `categories` contém `prospect` → **HOJE**.
6. SE `categories` contém `pessoal`, `familia` ou `amigo` → **SEM PRAZO**.
7. SE `categories` contém `vendedor` ou `fornecedor` → **SEM PRAZO**.
8. SE nenhuma regra acima casou — inclui o caso de `categories` ser um array VAZIO `[]` → **HOJE**.
   - Nota: `categories: []` (chat sem categoria) é NORMAL e ESPERADO, não é erro de cadastro. Nem todo chat do WhatsApp foi categorizado; a `description` recomenda usar a skill com `--categoria` quando se quer filtrar, mas a listagem geral (sem `--categoria`) legitimamente traz chats sem categoria. Desambiguação: sem como saber se é lead, tratar com prioridade média (HOJE). No briefing do passo 7 esses aparecem com o rótulo `[Sem categoria]`. Categorizar um chat é fora do escopo desta skill (tool `mcp__whatsapp-agent__categorize_chat`).

### Passo 5 — Filtro `--urgencia` (se presente)

- `--urgencia=urgente` → apresentar só o bloco URGENTE
- `--urgencia=urgente,hoje` → URGENTE + HOJE (visualização recomendada)
- `--urgencia=sem-prazo` → só pessoal/família (modo "responder quando tiver tempo")
- Sem `--urgencia` → apresentar os 3 blocos.

### Passo 6 — Modo `--draft` (se presente)

Pra cada chat classificado como URGENTE ou HOJE:

1. `mcp__whatsapp-agent__get_voice_guide()` — UMA vez no início, vale pra todos os drafts.
2. `mcp__whatsapp-agent__read(chat=<chat_id ou nome>, limit=5)` — áudios já vêm com `transcription` automática.
3. Gerar sugestão de resposta natural com a voz do Eric, acentuação correta do português.
4. `mcp__whatsapp-agent__check_message(content=<draft>)` — SE retornar violações → reescrever o draft pra corrigir e revalidar. Máximo 2 tentativas de reescrita (ou seja, até 3 chamadas de `check_message` no total pro mesmo chat). Pega em-dash, hype, saudação genérica, tu/teu.
   - SE após as 2 tentativas o `check_message` AINDA retornar violações → NÃO descartar o draft; apresentá-lo mesmo assim, mas com uma linha de aviso logo abaixo do draft, no formato literal:
     `⚠ check_message não passou após 2 tentativas — violações: <lista das violações retornadas, separadas por vírgula>. Revise antes de enviar.`
   - Esse aviso entra no briefing final na linha imediatamente abaixo da linha `DRAFT:` daquele chat (ver placeholder `{aviso_check}` no template do passo 7). Quando o draft passou limpo no `check_message`, NÃO incluir a linha de aviso.
5. Apresentar junto da listagem: `Carlos Shimizu — DRAFT: "Bom dia Carlos, sim 9h tá ótimo, te mando o Zoom. Abraço"`

Eric aprova ou edita antes de enviar. NUNCA envia automático — o envio é só via `mcp__whatsapp-agent__send` com `confirmed=true` explícito do Eric.

### Passo 7 — Apresentar briefing (formato canônico)

Caso "zero pendências" (vindo do passo 3-A ou 3-B): NÃO montar os blocos abaixo — apresentar só a linha única:

```markdown
Nada pendente — você está em dia (0 conversas devendo resposta com os filtros atuais).
```

(Se houver filtros não-default, citá-los: `...com os filtros atuais (--dias=2 --categoria=cliente).`)

Caso normal (1+ pendências) — formato canônico:

```markdown
## URGENTE (X)
- [Lead] Carlos Shimizu — 1d — "Pode ser as 9h" → link
- [Cliente VIP] Mauricio — 2h — "Cloud tá pesando" → link

## HOJE (Y)
- [Cliente] Joana — 1d — link
- [Parceiro] Silvia — 4h — link

## SEM PRAZO (Z)
- [Pessoal] Mirtes — 4h — "Estamos perdidos"
- [Família] Camila — 2d
```

Onde: `[Categoria]` = label da categoria (`category_labels[0]`; se `categories` vier vazio → `[Sem categoria]`); tempo = `dias_parado` formatado (`2h`, `1d`, `3d`); trecho entre aspas só quando houver `snippet`; `link` = `https://wa.me/{chat_id}` (regra do SEMPRE).

**Com `--draft`** (passo 6): abaixo da linha do chat, acrescentar a linha do draft e, SÓ se o `check_message` não tiver passado, a linha de aviso. Template por chat:

```markdown
- [{Categoria}] {chat_name} — {tempo} — {link}
  DRAFT: "{texto_do_draft}"
  {aviso_check}
```

Onde `{aviso_check}` só aparece quando o draft não passou no `check_message` após 2 tentativas (formato definido no passo 6, item 4); quando passou limpo, OMITIR essa linha inteira (não deixar linha em branco no lugar).

## Validação final (checklist)

- [ ] `--draft`/`--urgencia` NÃO foram passadas pro script
- [ ] Todos os chats apresentados têm exatamente um nível de urgência
- [ ] Dentro de cada bloco, quem espera há mais tempo aparece primeiro
- [ ] Chats 1:1 têm link `wa.me` clicável
- [ ] Drafts (se pedidos) passaram por `check_message`
- [ ] Nenhuma mensagem foi enviada

## Erros comuns e recovery

| Sintoma | Causa | Ação |
|---|---|---|
| `unrecognized arguments: --draft` (ou `--urgencia`) | Diretiva de pós-processamento passou pro script | Remover a flag do comando e rodar de novo; aplicar a diretiva no pós-processamento |
| Exit 2: `SUPABASE_PAT precisa estar definida` | Token ausente no env | Passo 2 (op read); se indisponível → fallback 3-B |
| Exit 1: `ERRO no SQL` | Management API falhou | 1 retry; se persistir → fallback 3-B |
| Script não encontrado no path | Plugin não instalado/atualizado | `ls` no path; reportar `/plugin install comercial@expertintegrado`; usar fallback 3-B nesta execução |
| Chat esperado não aparece com `--categoria=X` | Chat sem categoria atribuída no DB | Comportamento esperado — chats sem categoria só aparecem na listagem geral. Categorizar é fora do escopo desta skill (tool `mcp__whatsapp-agent__categorize_chat`) |
| `inbox` (fallback) vem vazio inesperadamente | Filtros excluindo demais | Rodar de novo sem `exclude_categories` pra diagnosticar |
| Script retorna `chats: []` / `total_pendencias: 0` (exit 0) | NÃO é erro — Eric está em dia com os filtros aplicados | Apresentar mensagem de "zero pendências" (passo 3-A / passo 7). Não fazer retry nem fallback |
| `echo "$CLAUDE_PLUGIN_ROOT"` vem vazio | Skill rodando fora de contexto de plugin (ex.: cópia local do repo) | Usar caminho `<raiz-do-repo>/plugins/comercial/skills/estou-devendo/scripts/estou_devendo.py`; se não localizar a raiz → fallback 3-B (ver Pré-requisitos) |

## Exemplos de uso

```
estou-devendo
estou-devendo --categoria=cliente,prospect --dias=2
estou-devendo --excluir=descartar,comunidade,pessoal --limit=10
estou-devendo --categoria=familia --dias=0 --limit=5
estou-devendo --urgencia=urgente,hoje --draft
estou-devendo --urgencia=urgente --draft --limit=5
```

## Agendamento (loop / schedule)

Skill pode rodar automática 2x/dia (manhã + meio-tarde):

```
/loop 6h /estou-devendo --urgencia=urgente
```

Ou agendamento fixo via `schedule`:
- 08:00 BRT — `estou-devendo --urgencia=urgente,hoje` (manhã, foco em hoje)
- 14:00 BRT — `estou-devendo --urgencia=urgente --draft` (meio-tarde, com drafts pras urgências do dia)

## Notas

- Detalhe de uma conversa específica: `mcp__whatsapp-agent__read` — áudios já vêm transcritos. A skill `transcrever-conversa` (repo `whatsapp-agent`, fora deste marketplace) é alternativa só se estiver instalada.
- O fallback 3-B é o caminho oficial sem token de Management API — use-o sempre que `SUPABASE_PAT` não estiver disponível.
