---
name: mentoria-equipe-seg-16h
description: Prepara pauta + exercicio pratico para a Mentoria de Produtividade e IA com a equipe (toda segunda 16h-17h), baseado no uso real dos colaboradores nos logs MCP da semana anterior. Gera SEMPRE os dois (pauta E exercicio). TRIGGER quando Eric pedir "prep mentoria equipe", "pauta segunda 16h", "exercicio mentoria IA equipe", "prepara aula da equipe", "mentoria produtividade 16h", ou na manha de segunda-feira antes da aula. NAO usar para subir aula ja gravada (skill aula-mentoria), gerar deck HTML avulso (skill apresentacao-html), nem mentoria 1:1 com cliente.
allowed-tools: Bash, Write, mcp__expert-brain__recall, mcp__clickup-mcp__clickup_create_task, mcp__outlook-mcp__criar_compromisso
---

# Mentoria Equipe Seg 16h — Pauta + exercicio baseado em uso real

Prepara o conteudo da reuniao **Mentoria de Produtividade e IA com Equipe** (toda segunda 16h-17h). Analisa o que a equipe USOU/NAO USOU na semana anterior via audit log dos MCPs, identifica o gap de maior impacto e gera DOIS entregaveis obrigatorios: uma **pauta de 60min** e um **exercicio pratico executavel na hora**. Salva a pauta no Workspace, cria o card no ClickUp e agenda o lembrete no Outlook.

## NUNCA

- NUNCA entregar so pauta OU so exercicio — o default aprovado e AMBOS, sempre.
- NUNCA inventar dado de uso da equipe. Se o log nao foi lido nesta virada, nao afirmar "fulano usou X". Sem dados reais -> usar o fallback de tema evergreen (ver Erros comuns).
- NUNCA salvar a pauta em `OneDrive/Workspace` — esse caminho virou arquivo morto (nao sincroniza). Usar `$WORKSPACE_DIR` (Google Drive), passo 7. CORRECAO DE FATO: o original salvava em `OneDrive\Workspace`; migracao pra Google Drive (`/g/Meu Drive/claude-workspace/Workspace`) em 05/07/2026 aposentou esse caminho.
- NUNCA citar skill/tool que nao exista no ambiente. As skills do exercicio (`estou-devendo`, `fup-inteligente`) sao invocadas pela EQUIPE nos PCs deles, nao pela skill.
- NUNCA remover acento de nenhum texto em portugues que ja o tenha.

## SEMPRE

- SEMPRE comparar uso da semana com a semana anterior pra detectar trend antes de escolher o gap.
- SEMPRE checar `command -v jq` antes do passo 1; sem jq, parar e reportar (ver Erros comuns).
- SEMPRE rodar `mcp__expert-brain__recall` no tema do gap antes de escrever a pauta (passo 3).
- SEMPRE usar fuso America/Sao_Paulo (datetime sem sufixo Z) no lembrete Outlook.
- SEMPRE reproduzir os templates de pauta/exercicio na estrutura literal dos passos 4 e 5.

## Pre-requisitos

- **jq** instalado (`command -v jq`) — parser dos logs `.jsonl`.
- **Logs de uso** em `<pasta-.claude>/projects/<projeto>/*.jsonl` (um arquivo por sessao Claude Code, gravado LOCALMENTE na maquina onde a sessao rodou). **Nao ha servidor/mount/VPS configurado para logs de terceiros:** por padrao a skill le so `$HOME/.claude/projects` (o dono desta maquina) e a cobertura e de 1 fonte. Logs de colegas so entram se ja foram sincronizados localmente e apontados via `TEAM_LOGS_DIRS` (Passo 1.0). Cobertura parcial -> registrar na pauta.
- **MCP expert-brain** conectado (para `recall`). Em ambiente sem Brain (ex: G4 OS), pular o passo 3 e seguir.
- **MCP clickup-mcp** e **outlook-mcp** conectados (passo 7). Se um deles nao existir, pular so aquela sub-etapa e reportar.
- **Workspace** montado. Default do PC (Google Drive):
  ```bash
  WORKSPACE_DIR="${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}"
  ```
- **Env vars opcionais** (todas tem default; nenhuma e obrigatoria):
  - `TEAM_LOGS_DIRS` — pasta(s)-mae de logs sincronizados de colegas, separadas por `:` (default: vazio -> so a maquina local). Layout esperado: `<pasta-mae>/<nome-da-pessoa>/.claude/projects/**/*.jsonl` (Passo 1.0).
  - `TEAM_HEADCOUNT` — headcount real do time, se Eric informar, para usar como `N` nos percentuais (default: numero de fontes detectadas no Passo 1).
  - `MENTORIA_LIST_ID` — `list_id` da lista ClickUp da mentoria interna (default: vazio -> ver Passo 7b).

## Passos

### 1. Coletar uso real da equipe (semana anterior)

Cada sessao Claude Code grava tool calls em `<raiz>/projects/<projeto-encoded>/*.jsonl`. O conteudo do `.jsonl` NAO guarda o nome do colaborador — a **pessoa e identificada pela pasta-raiz de logs**, nunca pelo conteudo do arquivo. Por isso o denominador dos percentuais (Passo 2) sai da contagem de fontes, nao de um roster.

**1.0 Definir as fontes de log, o mapeamento pessoa->pasta e o denominador N** (POSIX / Git Bash):

```bash
command -v jq >/dev/null || { echo "FALTA jq — instalar antes de rodar"; exit 1; }

# PERSON_DIRS: uma entrada por pessoa, no formato "<pasta-.claude>:<nome>".
# A pasta-.claude de cada pessoa contem os logs em <pasta>/projects/**/*.jsonl.
#
# ESCOPO PADRAO = SO A MAQUINA LOCAL. Nao existe servidor/mount/VPS que exponha logs de
# outras pessoas — nao procure um. O default abaixo analisa so o dono desta maquina.
PERSON_DIRS=("$HOME/.claude:local")

# Multi-pessoa: SO se logs de colegas ja foram sincronizados localmente por fora desta skill.
# Aponte TEAM_LOGS_DIRS para uma PASTA-MAE onde cada subpasta imediata e uma pessoa
# (layout <pasta-mae>/<nome-da-pessoa>/.claude/projects/**/*.jsonl). Um .jsonl fora desse
# layout NAO tem dono conhecido: conte como fonte anonima e NAO adivinhe de quem e.
if [ -n "$TEAM_LOGS_DIRS" ]; then
  PERSON_DIRS=()
  for parent in ${TEAM_LOGS_DIRS//:/ }; do
    for p in "$parent"/*/; do
      [ -d "$p/.claude" ] && PERSON_DIRS+=("${p%/}/.claude:$(basename "$p")")
    done
  done
fi

# N = denominador dos percentuais do Passo 2 = numero de fontes/pessoas distintas.
# Override opcional: se Eric informar o headcount real, TEAM_HEADCOUNT vence.
N="${TEAM_HEADCOUNT:-${#PERSON_DIRS[@]}}"
echo "Fontes=${#PERSON_DIRS[@]}  N=$N"
```

- Com o default (sem `TEAM_LOGS_DIRS`), **N=1** (so a maquina local): os limiares "% da equipe" do Passo 2 NAO sao proporcao de time — vire para observacao absoluta ("tool T nao apareceu nesta maquina") e escreva "cobertura parcial: 1 fonte" na pauta.

**1.1 Tools mais usadas nos ultimos 7 dias** — agregado de todas as fontes:

```bash
for entry in "${PERSON_DIRS[@]}"; do dir="${entry%:*}"; find "$dir/projects" -name "*.jsonl" -mtime -7 -print0 2>/dev/null; done | \
  xargs -0 jq -r 'select(.message.content != null) | .message.content[]? | select(.type == "tool_use") | .name' | \
  sort | uniq -c | sort -rn
```

Coletar tambem, na MESMA janela de 7 dias:
- **Skills invocadas:** trocar o filtro jq final por `select(.name == "Skill") | .input.skill`.
- **MCPs por pessoa:** rodar o `find` de UMA entrada de `PERSON_DIRS` por vez (o `<nome>` da entrada = a pessoa) e filtrar `.name` que comece com `mcp__` — assim se sabe QUEM usou cada MCP.
- **Frequencia por tool:** a coluna de contagem do `uniq -c` acima.

**1.2 Trend:** repetir 1.1 na janela de 8-14 dias atras (trocar `-mtime -7` por `-mtime -14 ! -mtime -7`) e comparar a contagem por tool com a de 7 dias (subiu/caiu).

**1.3 Definir o universo de tools e skills DISPONIVEIS** — e o conjunto contra o qual o Passo 2 mede o NAO-uso (o "disponivel" das heuristicas). Ambos os comandos abaixo foram validados nesta maquina:

- **Tools disponiveis = MCPs configurados** (chaves de `mcpServers` no `~/.claude.json`):
  ```bash
  jq -r '.mcpServers | keys[]' ~/.claude.json
  ```
  Nesta maquina retorna: `calendly, chatguru-mcp, clickup-mcp, expert-brain, expert-contacts, outlook-mcp, pipedrive, playwright, whatsapp-agent, youtube-mcp, zoom-mcp`. Somar as tools nativas que aparecerem nos logs do Passo 1 (Bash, Read, Edit, Write, Skill...).
- **Skills disponiveis = skills dos plugins instalados** (uma pasta por skill sob cada plugin em cache; ha um nivel de VERSAO no path — `cache/<marketplace>/<plugin>/<versao>/skills/<skill>/`):
  ```bash
  ls -d "$HOME"/.claude/plugins/cache/*/*/*/skills/*/ | sed "s|.*/skills/||;s|/$||" | sort -u
  ```
  Alternativa (a partir dos repos, sem depender do cache): os plugins listados em `C:/repos/skills/.claude-plugin/marketplace.json` (lab, pessoal) e `C:/repos/expertintegrado-skills/.claude-plugin/marketplace.json` (comercial, eventos, marketing, operacoes), com as skills sob `plugins/<plugin>/skills/`.

So entra como "gap por nao-uso" (Passo 2) o que estiver NESTE universo. O que nao esta instalado nao e gap de adesao (no maximo sugestao de instalacao, fora desta skill).

**Validacao:** 1.1 retornou >=1 linha com contagem > 0 **e** `N` esta definido.
**Se falhar / retornar vazio:** ver Erros comuns ("Semana sem dados").

### 2. Identificar o GAP de maior impacto

**Denominador e formula (vem do Passo 1):** `N` = numero de fontes/pessoas (ou `TEAM_HEADCOUNT` se setado). "Pessoa usou a tool T" = T aparece >=1x nos logs dela na janela de 7 dias. Seja `u(T)` = quantas das N pessoas usaram T; entao "fracao que NAO usou T" = `(N - u(T)) / N`. **Com N=1** (so a maquina local), NAO calcule proporcao: escolha o gap pela contagem bruta desta maquina e marque "cobertura parcial" na pauta.

Aplicar as heuristicas em ordem e escolher UM gap principal (a PRIMEIRA que bater):

- **Tool do universo (Passo 1.3) e `(N - u(T)) / N > 0,50`** (mais da metade nao usou) -> mostrar caso de uso. `T` varre as tools listadas no Passo 1.3, nao qualquer nome inventado.
- **Skill do universo (Passo 1.3) e `(N - u(S)) / N > 0,70`** (mais de 70% nao usou) -> demo + exercicio. `S` varre as skills listadas no Passo 1.3.
- **MCP com soma de usos de TODAS as pessoas < 5 na semana** (subutilizado) -> ensinar.
- **Trend negativo:** contagem 7d < contagem da janela 8-14d (Passo 1.2) numa tool importante -> diagnosticar e re-engajar. **Tool "importante" (lista default, ajustavel pelo Eric):** `pipedrive`, `clickup`, `whatsapp-agent`, `expert-brain`, `outlook` (rotina comercial/operacional do time). Se o Eric definir outra prioridade, usar a dele.
- **Bug recorrente:** mesma mensagem de erro em >=2 pessoas distintas -> ensinar workaround. Extrair as falhas dos logs (tool_result com `is_error: true`; comando validado nesta maquina):
  ```bash
  for entry in "${PERSON_DIRS[@]}"; do dir="${entry%:*}"; find "$dir/projects" -name "*.jsonl" -mtime -7 -print0 2>/dev/null; done | \
    xargs -0 cat | \
    jq -rc 'select(.type=="user") | .message.content[]? | select(type=="object" and .type=="tool_result" and .is_error==true) | (if (.content|type)=="array" then (.content|map(.text? // "")|join(" ")) else .content end)' | \
    sort | uniq -c | sort -rn
  ```
  Agrupar por mensagem repetida; pra saber QUEM, rodar por entrada de `PERSON_DIRS` (como no 1.1) e ver se a mesma bate em >=2 pessoas. **Se a rodada nao tiver erro extraivel (comando acima retorna vazio), marcar esta heuristica como NAO-APLICAVEL na rodada e dizer isso na pauta** — nunca inventar bug.

Exemplo de gap detectado (formato-alvo) — todo numero sai dos logs do Passo 1, nunca de fora:

> "estou-devendo foi invocada 1x na semana (1 fonte) e fup-inteligente 0x. Gap: equipe
> nao usa skill de follow-up."

Dado de negocio do tipo "ha N deals abertos esperando resposta" NAO e coletado por esta
skill (allowed-tools nao inclui Pipedrive). So citar na pauta se veio de RELATO da equipe
na propria call, marcado como relato; nunca apresentar como numero medido pela skill.

**Validacao:** o gap escolhido tem numero real por tras (contagem do passo 1), nao suposicao.

### 3. Recall no Brain por tema

```
mcp__expert-brain__recall(query="<tema do gap>")
mcp__expert-brain__recall(query="produtividade IA equipe pratica")
```

Capturar patterns/principles ja escritos pra embasar a demo. Ler TODOS os dominios retornados (o match util costuma vir do dominio inesperado).
**Se o Brain nao estiver conectado:** pular este passo e seguir (o resto da skill nao depende dele).

### 4. Montar a pauta (60min)

Preencher o template abaixo com os dados dos passos 1-3. Manter a estrutura e os tempos exatos:

```markdown
# Pauta — Mentoria Produtividade IA — DD/MM 16h-17h

## Tema da semana: <Gap principal identificado>

### Abertura (5min)
- Status da semana: <X tools mais usadas, Y novidades>
- Quem brilhou: <pessoa que usou skill nova>
- Onde travamos: <gap principal>

### Demo (15min) — <Tool/skill do gap>
- O que e + por que importa
- Quando usar (3 casos reais da Expert)
- Exemplo ao vivo Eric construindo na frente

### Exercicio em pares (25min)
- <Detalhado na proxima secao>

### Compartilhamento (10min)
- Cada par mostra o que fez (2 min cada)

### CTA (5min)
- Compromisso: cada pessoa usa <X> ate sexta
- Eric vai checar logs no proximo dia 1 da semana
```

Preenchimento de dois campos quando a cobertura e de 1 fonte (N=1, o default — so a maquina local):
- **Campo "Quem brilhou":** sem visao por pessoa, entao NAO atribuir a ninguem — preencher com traco + nota (texto exato, acentuado por ir no doc lido pela equipe): `— (fonte única — sem visão por pessoa)`.
- **Rodape de cobertura:** o aviso de cobertura parcial mora numa linha de RODAPE no fim da pauta (apos o bloco do template acima), texto exato: `_Cobertura desta pauta: 1 fonte (só a máquina local) — percentuais são observação absoluta, não proporção do time._` Com N>1 (fontes via `TEAM_LOGS_DIRS`), trocar "1 fonte" pelo numero real de fontes e remover a ressalva de proporcao.

### 5. Montar o exercicio pratico

Gerar um exercicio EXECUTAVEL pela equipe na hora, atacando o gap do passo 2. Template (exemplo para gap de follow-up — adaptar o titulo/passos ao gap real):

```markdown
### Exercicio: Limpar pendencia de follow-up

**Tempo:** 25 minutos
**Pares:** 2 pessoas por dupla
**Objetivo:** Cada par limpa 5 pendencias do funil

**Passo a passo:**
1. Abre Claude Code no PC
2. Roda: `/estou-devendo --categoria=cliente,prospect --limit=5`
3. Pra cada chat retornado:
   - Le contexto (transcrever-conversa se precisar)
   - Roda /fup-inteligente pra gerar draft
   - **Envia com aprovacao**
4. Atualiza Pipedrive: status, etapa, atividade
5. Salva insight no Brain se for caso interessante

**Entregavel:** Lista dos 5 chats limpos + screenshot do Pipedrive atualizado.
```

**Quando o gap NAO for follow-up** (o template acima e so o caso follow-up): NAO reaproveitar as flags de `/estou-devendo`/`/fup-inteligente` pra outra skill nem inventar sintaxe. Abrir o `SKILL.md` LOCAL da skill-alvo e derivar titulo/passos/flags DE LA. Localizar o arquivo (comando validado nesta maquina):

```bash
SKILL_ALVO="<nome-da-skill>"   # ex.: apresentacao-html
ls C:/repos/ericluciano-skills/plugins/*/skills/"$SKILL_ALVO"/SKILL.md \
   C:/repos/skills/plugins/*/skills/"$SKILL_ALVO"/SKILL.md \
   C:/repos/expertintegrado-skills/plugins/*/skills/"$SKILL_ALVO"/SKILL.md 2>/dev/null
```

ATENCAO: `C:/repos/skills` e `C:/repos/ericluciano-skills` sao DOIS CLONES do mesmo remote (`ericlucianoferreira/skills.git`) — verificado 06/07/2026 com `skills` 5 versoes atras. Antes de LER um SKILL.md de qualquer um deles, rodar `git -C <repo> pull --ff-only` pra nao copiar flag/sintaxe stale.

Ler o arquivo achado (Read) e copiar comandos/flags EXATOS de la. Se nenhum path retornar (skill nao clonada), consultar o catalogo `https://skills.ericluciano.com.br` — nunca chutar flag/sintaxe de skill nao lida.

Notas de fidelidade das flags do exercicio (nao alterar):
- `/estou-devendo` aceita `--categoria=slug1,slug2` e `--limit=N` (default 20, max 100). Ver a skill `comercial:estou-devendo`.
- `/fup-inteligente` roda follow-up de deals no Pipedrive com aprovacao antes de enviar. Ver a skill `comercial:fup-inteligente`.

### 6. Material de apoio

Anexar na pauta:
- Links para os `SKILL.md` das skills mencionadas — formato = path LOCAL clicavel do repo: `C:/repos/skills/plugins/<plugin>/skills/<skill>/SKILL.md` (plugins lab, pessoal) ou `C:/repos/expertintegrado-skills/plugins/<plugin>/skills/<skill>/SKILL.md` (comercial, eventos, marketing, operacoes). Ex. das skills citadas aqui: `C:/repos/expertintegrado-skills/plugins/comercial/skills/estou-devendo/SKILL.md`, `C:/repos/expertintegrado-skills/plugins/comercial/skills/fup-inteligente/SKILL.md`, `C:/repos/skills/plugins/lab/skills/apresentacao-html/SKILL.md`. Fallback quando a skill nao estiver clonada na maquina: link do catalogo `https://skills.ericluciano.com.br`.
- Brain notes relevantes (com IDs, vindos do passo 3).
- Slides **so se o tema for visual** — criterio objetivo: gerar slides SE bater QUALQUER um dos dois testes abaixo; SENAO nao gerar (default = sem slides, a demo ao vivo no terminal basta):
  - (a) o gap e uma tool/skill cujo OUTPUT e visual — deck, dashboard, carrossel, imagem/video, diagrama, pagina ou UI (ex.: `apresentacao-html`, `carrossel-studio`, `relatorio-ads`, `pipe-review`); OU
  - (b) a demo precisa mostrar layout de tela, antes-e-depois ou comparacao lado a lado que fica mais claro em imagem que em texto.
  Se o gap for um comando de CLI, um fluxo de texto, cadencia/processo ou tecnica de prompt -> NAO gerar slides. Quando gerar, usar a skill `apresentacao-html` (`/lab:apresentacao-html`). CORRECAO DE FATO: a skill `pptx` citada no original NAO esta instalada em nenhuma arvore (`.claude/plugins`, `.claude/skills`, `C:/repos`); trocada por `apresentacao-html`, skill lab real. Entregavel muda de arquivo PPTX para deck HTML 16:9.
- Hub `demo.ericluciano.com.br`: incluir o link de um exemplo SO se um exemplo aplicavel ao gap ja apareceu no `recall` do Passo 3 (ou o Eric passou o URL). **NAO navegar/consultar o site** — nenhuma tool de browsing esta autorizada (allowed-tools = `Bash, Write, recall, clickup_create_task, criar_compromisso`). Sem exemplo conhecido -> omitir este item (e opcional, nunca bloqueia a pauta).

### 7. Salvar pauta + card + lembrete

**7a. Definir data-alvo e caminho** (POSIX / Git Bash):

```bash
WORKSPACE_DIR="${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}"
PAUTA_DIR="$WORKSPACE_DIR/Educacional/Mentoria_Equipe_Interna/Pautas"
mkdir -p "$PAUTA_DIR"

# DATA = a segunda-feira alvo: HOJE se hoje e segunda E a aula ainda nao passou; SENAO a proxima segunda.
# GUARDA DE HORA (defeito reproduzido 06/07/2026, segunda 23h): sem ela, rodar segunda A NOITE gera
# pauta retroativa + lembrete Outlook 15:45 no PASSADO. Corte = 16h BRT (inicio da aula).
# Calculo pinado em America/Sao_Paulo via TZ='BRT3' (IANA nao resolve no Git Bash sem tzdata).
export TZ='BRT3'
dow=$(date +%u)                                  # 1=segunda ... 7=domingo
hora=$(date +%H)
offset=$(( (8 - dow) % 7 ))                      # 0 se hoje ja e segunda; senao dias ate a proxima
[ "$dow" -eq 1 ] && [ "$hora" -ge 16 ] && offset=7   # segunda apos as 16h -> proxima segunda
DATA_ISO=$(date -d "+$offset days" +%Y-%m-%d)    # ex: 2026-07-13
DATA_BR=$(date -d "+$offset days" +%d/%m)        # ex: 13/07
# verificacao: date -d "$DATA_ISO" +%u deve retornar 1 (segunda)
```

Salvar o markdown final (pauta + exercicio + material) via **Write** em:
`"$PAUTA_DIR/${DATA_ISO}-pauta.md"`
**Validacao:** o arquivo existe apos o Write. **Se falhar:** conferir se `$WORKSPACE_DIR` esta montado (Google Drive sincronizando); nunca cair no OneDrive.

**7b. Card no ClickUp** — `mcp__clickup-mcp__clickup_create_task`:
- `name`: `Mentoria Equipe DD/MM — pauta pronta` (trocar DD/MM por `$DATA_BR`)
- `description`: resumo do tema + caminho do arquivo salvo
- `list_id` — resolver nesta ordem, **sem inventar ID**:
  1. Se `MENTORIA_LIST_ID` (env) estiver setada -> passar esse valor.
  2. Senao, chamar sem `list_id` (usa a lista default do config do clickup-mcp).
  3. Se o passo 2 falhar por falta de lista (sem `MENTORIA_LIST_ID` e sem default configurado) -> NAO chutar um ID: pular o card e reportar `"ClickUp list_id nao configurado — defina MENTORIA_LIST_ID"`. A pauta ja esta salva (7a), entao seguir.

  O ID da lista de mentoria interna NAO e fixado aqui (e especifico do workspace e pode mudar). Para descobri-lo uma vez e gravar em `MENTORIA_LIST_ID`: memory `zoom-clickup-estrutura.md`, ou `recall "ClickUp topologia"`, ou perguntar ao Eric.
**Se a tool nao existir/falhar:** reportar e seguir (a pauta ja esta salva no passo 7a).

**7c. Lembrete no Outlook** — `mcp__outlook-mcp__criar_compromisso`:
- `titulo`: `Mentoria Equipe 16h — pauta pronta`
- `inicio`: `<DATA_ISO>T15:45:00` (15min antes da aula, sem sufixo Z)
- `fim`: `<DATA_ISO>T16:00:00`
- `descricao`: link/caminho da pauta
- `fuso_horario`: `America/Sao_Paulo` (default)
**Se a tool nao existir/falhar:** reportar e seguir.

## Validacao final (checklist)

- [ ] Uso real da semana coletado com numero por tras (passo 1) e `N` (fontes/pessoas) definido; cobertura parcial registrada na pauta se N < headcount real.
- [ ] Trend vs. semana anterior calculado (janela 8-14d).
- [ ] Gap principal escolhido pela formula do passo 2 (ou observacao absoluta quando N=1), com dado real por tras.
- [ ] `recall` do Brain rodado no tema (ou Brain ausente e passo pulado explicitamente).
- [ ] Pauta 60min preenchida no template (passo 4).
- [ ] Exercicio pratico gerado, executavel na hora, atacando o gap (passo 5).
- [ ] `DATA_ISO` cai numa segunda-feira (`date -d "$DATA_ISO" +%u` = 1) e arquivo salvo em `$WORKSPACE_DIR/.../Pautas/YYYY-MM-DD-pauta.md` (NAO no OneDrive).
- [ ] Card ClickUp criado (ou falha reportada).
- [ ] Lembrete Outlook 15:45 criado (ou falha reportada).
- [ ] Nenhum acento removido de texto portugues externo.

## Erros comuns e recovery

- **`jq` ausente (`command -v jq` falha):** parar o passo 1, reportar "falta jq" e pedir instalacao. Nao improvisar parser.
- **Semana sem dados (feriado, equipe de ferias, log vazio):** sugerir tema evergreen (revisitar um fundamento ja ensinado) e montar pauta/exercicio a partir dele; registrar na pauta que nao houve dado de uso.
- **Gap muito tecnico:** dividir o tema em 2 semanas (fazer split) em vez de sobrecarregar 1 aula.
- **Adesao muito desigual na equipe:** propor mentoria 1:1 com quem esta atras ANTES da coletiva.
- **Eric viajando na segunda 16h:** sugerir pre-gravar a demo em video e fazer "mentoria assincrona" (ex: via Cademi).
- **Logs de outros PCs inacessiveis (default):** e o caso normal — so a maquina local (N=1). Analisar o que houver, anotar "cobertura parcial: 1 fonte" na pauta e NAO inventar uso de quem nao apareceu. Para ampliar, sincronizar os logs e apontar `TEAM_LOGS_DIRS` (Passo 1.0) — nunca inventar um servidor.
- **Brain desconectado:** pular passo 3, seguir sem os IDs de nota.

## Exemplo (fluxo curto)

1. Passo 1: coleta mostra `estou-devendo` = 1 uso/1 fonte; `fup-inteligente` = 0 uso (numeros dos logs). Contexto "vendedores com deals parados" = relato da equipe, nao medido pela skill.
2. Passo 2: gap = "equipe nao usa skill de follow-up" (dado real).
3. Passo 3: `recall("follow-up pipeline disciplina")` traz principle de cadencia.
4. Passos 4-5: pauta com tema "Follow-up sem deixar deal esfriar" + exercicio `/estou-devendo` -> `/fup-inteligente` em pares.
5. Passo 7: salva `2026-07-06-pauta.md`, card ClickUp "Mentoria Equipe 06/07 — pauta pronta", lembrete Outlook 06/07 15:45.

## Status

- **Nasceu:** 24/05/2026 (Tier 2 do plano restructure). **Versao:** 0.1.0 (sandbox).
- **Defaults aprovados:** gera AMBOS (pauta + exercicio); baseado em uso real dos logs MCP da semana anterior.
- **Pronto pra graduar:** apos 5 usos reais + 14d estavel.
