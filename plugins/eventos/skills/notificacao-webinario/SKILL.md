---
name: notificacao-webinario
description: Orquestra a cadeia de notificacoes de WhatsApp de um webinario-lancamento da Expert via ChatGuru API Oficial (institucional). 7 toques (T-12h, T-1h, T0, T+1h pitch, abertura da sessao estrategica, FUP D+1 12h, FUP D+2 12h). Publico = CSV de inscritos (Calendly) cruzado por telefone com os deals do evento no Pipedrive; exclui dos FUPs quem ja agendou. Agenda os toques via CronCreate relativo ao horario do webinario, modo SEMI (preview + aprovacao) por padrao. TRIGGER quando Eric pedir "notificacao de webinario", "cadeia de disparos do evento", "lembrete do webinario", "avisa a galera do evento", "dispara o lembrete de X", ou montar comunicacao de um lancamento/webinario. NAO usar pra: disparo pontual de UMA mensagem (usar whatsapp-agent ou ChatGuru direto), campanha de prospeccao fria (usar plugin comercial), ou notificacao interna pra equipe.
allowed-tools: Bash, Read, CronCreate, CronList, CronDelete
---

# Notificacao de Webinario — cadeia de lancamento via WhatsApp

Dispara os 7 toques de WhatsApp de um webinario-lancamento (do lembrete de vespera ao follow-up de conversao), via ChatGuru API Oficial (institucional). O universo de quem recebe vem do CSV de inscritos do Calendly (fonte de verdade de pertencimento), cruzado por telefone com os deals do evento no Pipedrive pra ler a etapa de cada um e excluir dos FUPs quem ja agendou. Cada toque roda pelo script `scripts/disparar_toque.py` (modo SEMI: preview primeiro, so dispara com `--confirmar`), e os horarios sao agendados via `CronCreate` relativo ao inicio do webinario.

## NUNCA

- **NUNCA quebra de linha no miolo do template.** O template `gupshup utility_generico_05` rejeita `\n`/`\r\n`/`U+2028`/`<br>` (erro 132018). Usar emoji e pontuacao como separador visual. O erro NAO aparece no retorno do `dialog_execute` (retorna success), so na entrega. Brain `rfn7klo8igyj`.
- **NUNCA travessao** (em-dash — ou en-dash –) nos textos externos — tem cara de IA. Trocar por virgula, dois pontos ou ponto. Brain `v4624gdruzyy`.
- **NUNCA disparar pra base inteira nem por lista solta.** Sempre filtrar pelo Detalhe da origem do evento atual (senao atinge grupo de evento anterior). O universo real e o CSV de inscritos cruzado com os deals do evento.
- **NUNCA disparar sem `--confirmar` aprovado pelo Eric.** Modo padrao e SEMI: preview + aprovacao explicita. So rodar com `--confirmar` depois do Eric ver a copy e a lista.
- **NUNCA disparar FUP (toques 6/7) pra quem ja agendou.** O script exclui `stage_id in {54, 60, 79}` automaticamente; nao burlar.
- **NUNCA usar whatsapp-agent pessoal nem Z-API direto pra este fluxo.** So ChatGuru API Oficial (`s13.expertintegrado.app`, institucional/corporativo).
- **NUNCA hardcodar token.** O script le PIPEDRIVE_API_KEY e credenciais do ChatGuru do cache local (populado do 1Password). Se um token estiver invalido, rotacionar no 1P e rodar `setup-secrets.ps1` — nao editar o JSON na mao.
- **NUNCA prometer copy A/B ativa por perfil.** O script classifica decisor vs funcionario e mostra a contagem, mas hoje envia o MESMO miolo pros dois (ver secao SEGMENTACAO).
- **NUNCA converter o cron pra UTC nem usar sufixo Z / `fireAt` ISO.** Cron de 5 campos em horario LOCAL = BRT (America/Sao_Paulo).

## SEMPRE

- **SEMPRE acentuacao correta** nos textos dos toques (portugues brasileiro).
- **SEMPRE miolo em linha unica**, sem travessao.
- **SEMPRE rodar em PREVIEW primeiro** (sem `--confirmar`), mostrar copy + lista pro Eric, e so disparar apos aprovacao.
- **SEMPRE filtrar pelo Detalhe da origem do evento atual** no Pipedrive.
- **SEMPRE piloto fora da janela de 24h** antes do disparo real (ver ARMADILHAS: dentro da janela de 24h o WhatsApp manda texto livre e mascara falha de template).
- **SEMPRE reportar apos cada toque:** quantos OK, quantos erro, quantos pulados (ja agendaram).
- **SEMPRE cron `recurring: false`** por toque (disparo unico que se auto-deleta).

## Pre-requisitos

- **MCP/tools:** `CronCreate` (agendamento), `Bash` (rodar o script Python), `Read` (conferir CSV/logs).
- **Script:** `scripts/disparar_toque.py` na pasta desta skill (path absoluto resolvido em runtime no Passo 2 → variavel `$SCRIPT`; o executor NAO adivinha a pasta de instalacao). Ele carrega a engine `whatsapp-api-fup-batch.py` do `claude-sync/scripts/` (mesma do plugin comercial) e le PIPEDRIVE_API_KEY + credenciais ChatGuru do cache local.
- **Python:** detectar com `command -v python3 || command -v python`. Rodar com `-X utf8` (o script forca UTF-8 no stdout).
- **Insumos que o Eric precisa fornecer** (perguntar UMA vez, so os que faltarem):
  - CSV export de inscritos do Calendly (path completo). Fonte de verdade do publico.
  - Nome/Detalhe da origem do evento no Pipedrive (ex: `O Imposto Invisivel do Empresario`). Filtro CRM.
  - Data/hora do inicio do webinario (BRT) — pra calcular os horarios do cron.
  - Link do Zoom (`--zoom`) e link do Diagnostico (`--diag`, default `https://expertintegrado.com.br/diagnostico`).
  - Numero de teste do piloto: WhatsApp corporativo do Eric no formato `55DDDNUMERO` (sem `+`, sem espacos). Usado so no Passo 5. NAO ha numero chumbado na skill; se faltar, perguntar UMA vez.
- **Credenciais:** cache local (populado do 1Password vault "Agentes Eric" via `setup-secrets.ps1`). Fonte canonica = 1Password. NAO editar o JSON de cache na mao.

## A cadeia de 7 toques

| # | Toque | Quando | Link | Publico |
|---|-------|--------|------|---------|
| 1 | Lembrete vespera | T-12h | Zoom | todos os inscritos |
| 2 | Alerta 1h | T-1h | Zoom | todos os inscritos |
| 3 | Comecamos agora | T0 (inicio) | Zoom | todos os inscritos |
| 4 | Pitch / parte mais importante | T+1h | Zoom | todos os inscritos |
| 5 | Abertura da sessao estrategica | momento do CTA do diagnostico — MANUAL ao vivo ou AGENDADO T+90min (o Eric decide; ver Passo 7) | Diagnostico | todos os inscritos |
| 6 | FUP 1 | D+1 as 12h | Diagnostico | **so quem NAO agendou** |
| 7 | FUP 2 | D+2 as 12h | Diagnostico | **so quem NAO agendou** |

- Toques 1-5 vao pra todos os inscritos reais.
- Toques 6/7 (FUP) excluem quem ja agendou, pela ETAPA do deal: `stage_id in {54 Apresentacao Agendada (Educacional), 60 Apresentacao realizada (Educacional), 79 Reuniao agendada (Prospeccao)}`. Exclusao e por STAGE, nao por pipeline: quem migrou pra etapa de agendamento (independente do pipeline) sai do FUP automaticamente.

## Passos

### Passo 1 — Coletar insumos

Confirmar com o Eric (perguntar so o que faltar): path do CSV de inscritos, Detalhe da origem do evento, data/hora do inicio (BRT), link Zoom, link Diagnostico.

O texto do "Detalhe da origem do evento" e o valor que o script casa por substring case-insensitive contra o campo `Detalhes da origem da oportunidade` dos deals do Pipedrive (ver secao FILTRO POR EVENTO). Um erro de digitacao do Eric (acento a mais/menos, palavra trocada) faz o filtro casar 0 deals (→ `VAO RECEBER: 0`) ou, pior, casar o evento errado se a string for substring de outro nome. Como esta skill NAO tem tool de leitura direta do Pipedrive (`allowed-tools` = Bash, Read, CronCreate, CronList, CronDelete), a validacao do texto e feita pelo PROPRIO preview do script no Passo 3, assim:

- Pegar o valor do Eric EXATAMENTE como ele escreveu (nao "corrigir" acento/maiuscula por conta propria — o script ja e case-insensitive, mas troca de palavra muda o resultado).
- Se o Eric der um nome aproximado ou incompleto, preferir o TRECHO mais curto e distintivo do nome do evento (ex: `Imposto Invisivel` em vez da frase inteira) — substring menor casa mais tolerante a variacao, mas confirmar com o Eric qual trecho usar antes de rodar.
- A validacao real acontece no Passo 3: se o preview vier `VAO RECEBER: 0` ou um numero muito abaixo do total de inscritos do CSV, o `--evento` provavelmente nao bate → voltar aqui e reconferir o texto com o Eric. NAO seguir pro disparo com contagem suspeita.

Regras de decisao:
- SE algum insumo obrigatorio faltar (CSV, evento, data/hora) → pedir ao Eric e PARAR ate ter.
- SE tiver tudo → passo 2.

### Passo 2 — Detectar Python e localizar o script

O script fica em `scripts/disparar_toque.py` DENTRO da pasta desta skill. O executor NAO adivinha esse path: descobre em runtime com `find`. Rodar exatamente:

```bash
PY="$(command -v python3 || command -v python)"
SCRIPT="$(find "$HOME" -type f -name disparar_toque.py -path '*notificacao-webinario*' 2>/dev/null | head -n1)"
```

- SE `$PY` vazio → reportar "Python nao encontrado no PATH" e parar.
- SE `$SCRIPT` vazio (find nao achou) → tentar os 2 paths canonicos conhecidos, na ordem, e usar o primeiro que existir:
  1. `C:/repos/expertintegrado-skills/plugins/eventos/skills/notificacao-webinario/scripts/disparar_toque.py` (repo clonado no PC/notebook do Eric)
  2. `$HOME/.claude/plugins/eventos/skills/notificacao-webinario/scripts/disparar_toque.py` (instalado via marketplace)
  ```bash
  for cand in \
    "C:/repos/expertintegrado-skills/plugins/eventos/skills/notificacao-webinario/scripts/disparar_toque.py" \
    "$HOME/.claude/plugins/eventos/skills/notificacao-webinario/scripts/disparar_toque.py"; do
    [ -f "$cand" ] && SCRIPT="$cand" && break
  done
  ```
- SE ainda assim `$SCRIPT` vazio → reportar "disparar_toque.py nao encontrado no filesystem" e parar.
- SE achou → daqui pra frente usar a variavel `$SCRIPT` (path absoluto ja resolvido) em TODAS as chamadas ao Python. Nao usar `SKILL_DIR` nem path relativo.

> Nota: o script tem um path interno chumbado (`C:/Users/Eric Luciano/OneDrive/Workspace/claude-sync`) de onde carrega a engine `whatsapp-api-fup-batch.py` e le o token do Pipedrive. Esse path e do ambiente do PC/notebook do Eric; em headless (VPS) o script nao roda como esta (PENDENTE-SCRIPT: portar o path da engine pra env var). Este passo resolve apenas a localizacao do PROPRIO `disparar_toque.py`.

### Passo 3 — PREVIEW do toque (obrigatorio, nao dispara)

Rodar o script SEM `--confirmar`:

```bash
"$PY" -X utf8 "$SCRIPT" \
    --inscritos "<CSV.csv>" \
    --evento "<Detalhe da origem do evento>" \
    --toque <N> \
    --zoom "<link Zoom>" \
    --diag "<link Diagnostico>"
```

Parametros:
- `--inscritos` (OBRIGATORIO): CSV export de inscritos do Calendly. Camada 1 (pertencimento).
- `--evento` (OBRIGATORIO): texto do Detalhe da origem no Pipedrive (acha os deals do evento).
- `--toque` (OBRIGATORIO): 1..7.
- `--zoom` / `--diag`: links. `--diag` tem default `https://expertintegrado.com.br/diagnostico`.
- `--delay`: segundos entre disparos (default 8, anti-throttle). So relevante no disparo real.

Validacao do preview: o script imprime `>>> VAO RECEBER: N`, a contagem `decisores (pitch A) / funcionarios (pitch B)`, e 3 exemplos de copy ja envelopados (`Olá. <miolo> Obrigado.`).

- SE `VAO RECEBER: 0` → investigar: CSV certo? Detalhe da origem batendo com o Pipedrive? Toque 6/7 pode ter zerado se todos ja agendaram. Reportar ao Eric e NAO seguir pro disparo.
- SE o script falhar (exit code != 0, erro de token, CSV ilegivel) → ver ERROS COMUNS. Nao disparar.
- SE preview OK → passo 4.

### Passo 4 — Validar copy e lista com o Eric

Mostrar ao Eric a copy do toque + a contagem de quem vai receber. Conferir: miolo em linha unica, sem travessao, acentuacao correta.

- SE Eric NAO aprovar → ajustar (a copy vive na funcao `miolo()` do script — mudar so com aprovacao; PENDENTE-SCRIPT se precisar editar o .py) e voltar ao passo 3.
- SE Eric aprovar → passo 5.

### Passo 5 — Piloto fora da janela de 24h (antes do primeiro disparo real do evento)

Objetivo: disparar UMA mensagem real pro numero de teste do Eric, FORA da janela de 24h, pra validar que o template chega (dentro da janela o WhatsApp manda texto livre e mascara falha — ver ARMADILHAS).

**Numero de teste:** e um insumo que o Eric fornece (o WhatsApp corporativo dele, formato `55DDDNUMERO`, sem `+`, sem espacos). NAO ha numero chumbado nesta skill — se o Eric nao tiver informado, perguntar UMA vez e esperar. Nao inventar/adivinhar numero.

**Como mirar UM numero so (o script NAO tem flag de numero unico):** o `disparar_toque.py` opera sobre `--inscritos` (CSV) cruzado com `--evento` (Pipedrive). Nao existe `--numero`/`--teste`/`--pilot`. Entao o piloto e feito construindo um CSV de 1 linha so com os dados do Eric e rodando o toque real contra esse CSV, restrito ao mesmo evento (o telefone do Eric precisa existir num deal com o Detalhe da origem do evento pra passar na Camada 1; se nao existir, ver alternativa abaixo).

1. Criar o CSV piloto de 1 linha (cabecalho que o script le: `First Name,Empresa,Cargo,WhatsApp`; `WhatsApp` e a coluna de telefone):
   ```bash
   WORK="$(mktemp -d)"
   PILOTO="$WORK/piloto_eric.csv"
   printf 'First Name,Empresa,Cargo,WhatsApp\nEric,Expert Integrado,CEO,%s\n' "<NUMERO_TESTE_ERIC>" > "$PILOTO"
   ```
2. Rodar o toque real (`--confirmar`) contra o CSV piloto:
   ```bash
   "$PY" -X utf8 "$SCRIPT" \
       --inscritos "$PILOTO" --evento "<evento>" --toque <N> \
       --zoom "<link>" --diag "<link>" --confirmar
   ```
3. O script so dispara se o numero do Eric casar um deal do evento (Camada 1). SE o preview do piloto vier `VAO RECEBER: 0` → o numero do Eric nao esta num deal desse evento; NAO da pra pilotar por este caminho (PENDENTE-SCRIPT: o script nao suporta bypass da Camada 1). NAO escolher sozinho como resolver: apresentar ao Eric as DUAS opcoes abaixo e AGUARDAR a escolha dele antes de qualquer disparo:
   - **Opcao A — confirmar assim mesmo:** o Eric confirma que tem (ou cria) um deal nesse evento com o telefone dele; rodar o piloto de novo (volta ao item 1 deste passo) ate `VAO RECEBER: 1`.
   - **Opcao B — disparo manual no painel:** disparar o template uma vez manualmente pelo painel/ChatGuru pro numero do Eric, fora da janela 24h, pra validar entrega (registrar como diagnostico, nao como parte automatica do fluxo).
   NAO seguir pro Passo 6 sem o piloto ter chegado por uma das duas opcoes que o Eric escolheu.

Regras de decisao:
- SE o piloto NAO chegar (conferir no painel ChatGuru, chats arquivados) → o template pode ter quebra de linha ou outro problema; NAO fazer o disparo em massa. Investigar antes (ver ERROS COMUNS 1 e 9).
- SE piloto chegou OK → passo 6.

### Passo 6 — Disparo real (so apos aprovacao)

Mesmo comando do passo 3 + `--confirmar`:

```bash
"$PY" -X utf8 "$SCRIPT" \
    --inscritos "<CSV.csv>" --evento "<evento>" --toque <N> \
    --zoom "<link>" --diag "<link>" --confirmar
```

Validacao: o script imprime `[i/N] Nome: OK|ERRO` por lead e um resumo final `=== ok/total OK ===`.

- SE muitos ERRO → ver ERROS COMUNS (cooldown, token, template). Reportar ao Eric.
- SE OK → reportar ao Eric: quantos OK, quantos erro, quantos pulados (ja agendaram).

### Passo 7 — Agendar os toques via CronCreate (quando for agendar a cadeia inteira)

A partir da data/hora do inicio do webinario (BRT), calcular o horario de cada toque e criar 1 job por toque com `CronCreate`.

Horarios (offset relativo ao inicio do webinario):
- Toque 1: T-12h | Toque 2: T-1h | Toque 3: T0 (inicio) | Toque 4: T+1h
- Toque 5: depende do modo escolhido (ver decisao abaixo); se AGENDADO, T+90min
- Toque 6 (FUP 1): D+1 as 12h (12:00 no dia seguinte) | Toque 7 (FUP 2): D+2 as 12h (12:00 dois dias depois)

**Como computar o cron de cada toque (algoritmo determinístico — NAO fazer conta de cabeca):**
Para cada toque, calcular o horario-alvo com o comando `date` a partir do inicio do webinario `<INICIO>` (formato `AAAA-MM-DD HH:MM`, BRT) e usar os campos retornados pra montar `M H DoM Mon` do cron de 5 campos (DoW fica sempre `*`). Isso cobre minuto != 0 e virada de mes/ano sem conta manual:

```bash
# Toques relativos ao inicio (T-12h, T-1h, T0, T+1h, e T+90min se Toque 5 AGENDADO):
# substituir o offset conforme o toque: '-12 hours', '-1 hour', '0 hours', '+1 hour', '+90 minutes'
TZ='BRT3' date -d '<INICIO> -12 hours' '+%M %H %d %m'   # -> "M H DoM Mon" do Toque 1
TZ='BRT3' date -d '<INICIO> -1 hour'   '+%M %H %d %m'   # Toque 2
TZ='BRT3' date -d '<INICIO> 0 hours'   '+%M %H %d %m'   # Toque 3
TZ='BRT3' date -d '<INICIO> +1 hour'   '+%M %H %d %m'   # Toque 4
TZ='BRT3' date -d '<INICIO> +90 minutes' '+%M %H %d %m' # Toque 5 (so se AGENDADO)

# FUPs sao horario FIXO 12:00, offset em DIAS a partir da DATA do inicio (nao do horario):
TZ='BRT3' date -d '<INICIO> +1 day' '+00 12 %d %m'      # Toque 6 (D+1 12h)
TZ='BRT3' date -d '<INICIO> +2 days' '+00 12 %d %m'     # Toque 7 (D+2 12h)
```

- O `date` ja resolve virada de mes/ano/DST (ex: inicio `2026-12-31 23:30` + 1h → `2026-12-31 00:30 01 01` no cron). NAO ajustar na mao.
- Montar o cron colando os 4 campos retornados + ` *`: `"<M> <H> <DoM> <Mon> *"`. Ex: se `date` devolveu `30 07 15 07`, o cron e `"30 07 15 07 *"`.
- SE o ambiente nao tiver `date -d` (BSD/macOS usa outra sintaxe): usar `python3 -c` com `datetime`/`timedelta` pra o mesmo calculo, ou reportar e pedir os horarios ja calculados ao Eric. NAO chutar os campos.

**Decisao obrigatoria do Toque 5 (CTA da sessao estrategica) — ANTES de agendar:**
O Toque 5 dispara no momento do CTA do diagnostico durante o evento ao vivo, e esse momento nao e fixo (varia conforme o Eric conduz o webinario). Quem decide o modo e o Eric, nao a skill. Perguntar explicitamente ao Eric qual dos dois:
- **Modo MANUAL (operador ao vivo):** NAO criar CronCreate pro Toque 5. Quando o Eric chegar no CTA durante o webinario, ele pede o disparo e a skill roda o Passo 3→6 do Toque 5 na hora.
- **Modo AGENDADO (fallback):** criar CronCreate pro Toque 5 em `T+90min` (90 minutos apos o inicio), como os demais toques, em PREVIEW.

Regras de decisao:
- SE o Eric escolher MANUAL → pular o Toque 5 na criacao de crons (agendar so 1,2,3,4,6,7) e avisar que o Toque 5 sera sob comando ao vivo.
- SE o Eric escolher AGENDADO → incluir o Toque 5 com `cron` calculado em T+90min.
- SE o Eric NAO responder qual modo → default = MANUAL (nao agenda o Toque 5), porque disparar o CTA na hora errada e pior que nao disparar por cron. Avisar o Eric do default aplicado.

Regras do cron:
- Formato 5 campos `M H DoM Mon DoW` em horario LOCAL = BRT. NAO converter pra UTC, NAO usar sufixo Z nem `fireAt` ISO.
- `recurring: false` (disparo unico; o cron pina minuto/hora/dia/mes e se auto-deleta).
- **`durable: true` em TODOS os toques agendados** (T-12h, T-1h, T0, T+1h, D+1, D+2, e T+90min se Toque 5 AGENDADO). Default do CronCreate e `durable: false` (job vive so na sessao e some ao fechar/reiniciar o Claude Code) — como a cadeia se estende por dias, os jobs PRECISAM sobreviver a restart, entao passar `durable: true` sempre. Antes de agendar o primeiro job, confirmar UMA vez que a flag existe (rodar `CronCreate --help` ou checar a doc da tool); se `durable` NAO existir na versao instalada, remover a flag dos comandos e avisar o Eric que os crons NAO sobrevivem a fechar a sessao (ver ERROS COMUNS 6 pra mitigacao).
- O prompt de cada job deve rodar o toque correspondente em PREVIEW e pedir aprovacao (modo SEMI). NAO agendar disparo cego com `--confirmar`, exceto se o Eric autorizar explicitamente um toque pra rodar sozinho.

Exemplo (toque 6 = FUP 1, agendado pra 14/06 as 12h BRT):

```
CronCreate(
  cron: "0 12 14 6 *",
  recurring: false,
  durable: true,
  prompt: "Rodar o toque 6 da notificacao-webinario do evento <X> em PREVIEW e me mostrar a copy/lista pra aprovar."
)
```

Avisar o Eric sobre as LIMITACOES do cron (ver ERROS COMUNS): so roda com o Claude Code aberto e a sessao idle; sem `durable: true` os jobs somem ao fechar a sessao (por isso esta skill usa `durable: true` em todos os toques — ver Regras do cron acima). Pra toques ao vivo criticos (T0, T+1h durante o evento), confirmar que a maquina estara ligada com a sessao aberta, ou disparar manualmente.

## Segmentacao por perfil (pitch A vs B)

Classificar pelo campo **Cargo** (vem do CSV de inscricao; no Pipedrive e o custom field `055b68e8b474363c8c4e125eab49788193109ad0`):

- **DECISOR (pitch A):** cargo contem `ceo, socio/sócio, diretor, propriet, founder, fundador, presidente, dono, empresar, cfo, coo, cto, cmo, head`. Pitch fala do "proximo passo do negocio/empresa".
- **FUNCIONARIO / nao-decisor (pitch B):** o resto (analista, assistente, coordenador, tecnico, estudante, vendas, consultor, **gerente**). Pitch fala de "ser o profissional que domina IA e leva pra dentro da empresa".
- Gerente entra em B (nao e dono — pitch A "empresario de verdade" soaria errado).

> **ESTADO ATUAL DO SCRIPT:** `disparar_toque.py` JA classifica decisor vs funcionario (funcao `eh_decisor`) e mostra a contagem A/B no preview, mas ainda NAO envia copy diferente por perfil — todos recebem o mesmo miolo do toque (com personalizacao de nome/empresa). A copy A/B diferenciada e a direcao desejada, mas nao esta implementada hoje.

**O que fazer na pratica (criterio verificavel):**
- A contagem `decisores (pitch A) / funcionarios (pitch B)` no preview e informativa (mostra o mix do publico); ela NAO altera a mensagem enviada. Reportar a contagem ao Eric normalmente.
- Ao validar a copy no Passo 4, dizer ao Eric UMA frase explicita: "a copy e unica e serve os dois perfis (A/B nao esta ativo no script)". Nao prometer envio diferenciado.
- SE o Eric perguntar sobre a variante A/B (ex: "e a copy do decisor?", "manda a versao B pros funcionarios") → responder que o script hoje envia texto unico e que ativar A/B exige editar a funcao `miolo()` do `.py` (mudanca de codigo, marcar PENDENTE-SCRIPT). NAO simular A/B na mao editando a copy por lead — isso quebraria o modo SEMI e a fonte-de-verdade da copy (a `miolo()`).
- Quando isso mudaria: so quando alguem editar a `miolo()` pra receber o perfil e retornar textos distintos. Ate la, tratar A/B como roadmap, nao como feature.

Personalizacao adicional: empresa quando valida (o script descarta lixo: ".", "n", "teste", "outros", "autonomo", "estudante", etc.), senao so nome. So o toque 5 usa a empresa no texto hoje.

## Textos-template dos toques (linha unica, sem travessao)

Placeholders: `{Nome}` (primeiro nome), `{Empresa}` (so se valida), `{ZOOM}`, `{DIAG}`, `{EVENTO}`. O template ChatGuru envelopa com "Olá. " no inicio e " Obrigado." no fim — o miolo abaixo e so o meio. (Estes textos sao a fonte de verdade da copy; devem casar com a funcao `miolo()` do script.)

**Toque 1 (T-12h):** `{Nome}, falta pouco pro {EVENTO}! É ao vivo e sem reprise, separa o horário que o conteúdo vai direto ao ponto pra sua empresa. Salva o link e te vejo lá 👉 {ZOOM}`

**Toque 2 (T-1h):** `{Nome}, começamos em 1 hora! Deixa tudo pronto pra entrar ao vivo. Link do Zoom aqui 👉 {ZOOM}`

**Toque 3 (T0):** `{Nome}, começamos agora! Entra que já vamos abrir, microfone mutado e câmera a teu critério 👉 {ZOOM}`

**Toque 4 (T+1h, pitch):** `{Nome}, chegou a parte mais importante do {EVENTO}, o que vem agora muda como você opera com IA. Não sai! Se ainda não entrou, corre 👉 {ZOOM}`

**Toque 5 (abertura sessao estrategica):** `Tenho um presente pra você, {Nome}! Liberamos um diagnóstico gratuito de IA individual pra {Empresa|sua empresa}, 45 minutos com um consultor pra você sair com um plano prático. Vagas limitadas, agenda 👉 {DIAG}`

**Toque 6 (FUP 1, D+1 12h):** `{Nome}, não quero que você perca: o diagnóstico gratuito de IA que liberamos ainda tá de pé, mas as vagas tão acabando. 45 minutos pra sair com um plano prático pra sua empresa. Garante o seu 👉 {DIAG}`

**Toque 7 (FUP 2, D+2 12h):** `{Nome}, última chamada: hoje fechamos as vagas do diagnóstico gratuito de IA. Não deixa passar, são 45 minutos que podem mudar o rumo da sua empresa 👉 {DIAG}`

> Variantes por perfil (A decisor / B funcionario) sao a evolucao desejada, mas a `miolo()` ainda envia texto unico por toque (ver ESTADO ATUAL). Se implementar escassez/variantes: escassez tem que ser REAL (nunca "nao reabre" se reabre — falar "se ocuparem, a proxima janela fica pra mais pra frente").

## Filtro por evento (CRM) — como o script decide o publico

Cada evento tem uma origem/detalhe propria no Pipedrive. O script puxa todos os deals `status=open` cujo Detalhe da origem casa (substring, case-insensitive) com `--evento`:
- Campo `Origem da Oportunidade` = `0945bdde00c8c57d1c0e52cd360cb76f058dc6e6`
- Campo `Detalhes da origem da oportunidade` = `c35bea7247f83fcb9cdc24abef1e4e793ae79d7d` = nome do evento (ex: `O Imposto Invisivel do Empresario`)

Duas camadas:
- **Camada 1 (pertencimento):** cruza os telefones do CSV de inscritos com os deals de origem do evento. So inscritos reais entram; leads antigos com origem parecida sao descartados. A chave e o TELEFONE (normalizado com/sem o 9), nao o deal_id (merge troca o ID).
- **Camada 2 (etapa):** toques 6/7 (FUP) excluem quem ja agendou (`stage_id in {54, 60, 79}`). Toques 1-5 vao pra todos os inscritos.

## Validacao final (checklist)

```
[ ] Insumos coletados: CSV de inscritos, Detalhe da origem do evento, data/hora BRT, link Zoom, link Diagnostico, numero de teste do Eric (55DDDNUMERO)
[ ] Script localizado ($SCRIPT resolvido via find/paths canonicos) e Python detectado ($PY)
[ ] Copy de cada toque validada com o Eric (linha unica, sem travessao, acentuacao correta); dito ao Eric que a copy e unica (A/B nao ativo)
[ ] Preview rodado por toque (VAO RECEBER > 0 e coerente com o total do CSV; contagem A/B conferida)
[ ] Piloto: toque real disparado contra CSV de 1 linha (numero do Eric) FORA da janela 24h, conferido no painel ChatGuru
[ ] Modo do Toque 5 decidido com o Eric (MANUAL ao vivo = nao agenda; AGENDADO = cron T+90min)
[ ] Toques agendados via CronCreate (cron 5 campos em BRT, recurring:false, durable:true, prompt em PREVIEW) — 6 toques se Toque 5 MANUAL, 7 se AGENDADO
[ ] Toques 6/7: confirmado que o filtro de stage {54,60,79} exclui quem ja agendou
[ ] Apos cada disparo real: reportar ao Eric OK / erros / pulados
```

## Erros comuns e recovery

1. **Template rejeita `\n` (erro 132018).** Miolo tem que ser linha unica. O erro NAO aparece no `dialog_execute` (retorna success), so na entrega. Recovery: remover qualquer quebra de linha, retestar via piloto fora da janela 24h. Brain `rfn7klo8igyj`.
2. **Cooldown de 5min por chat** no `dialog_execute`. Recovery: entre toques no mesmo numero, respeitar o intervalo. A engine ja faz retry de cooldown (`--delay` default 8s ameniza o throttle geral).
3. **Janela de 24h mascara teste.** Dentro da janela (lead respondeu nas ultimas 24h) o WhatsApp manda texto livre, nao o template — parece OK mas nao valida nada. Recovery: testar so FORA da janela.
4. **Travessao tem cara de IA.** Nunca usar em-dash/en-dash. Trocar por virgula/dois pontos/ponto. Brain `v4624gdruzyy`.
5. **Multi-evento (atinge grupo errado).** Sempre filtrar pelo Detalhe da origem do evento atual; nunca a base inteira. Recovery: conferir `--evento` bate com o Detalhe no Pipedrive; conferir a contagem do preview.
6. **CronCreate depende do Claude Code aberto e idle.** Sem `durable: true` os jobs somem ao fechar a sessao (por isso esta skill passa `durable: true` em TODOS os toques — ver Passo 7); jobs so disparam com a REPL idle (nao mid-query). `durable: true` sobrevive a restart mas NAO liga a maquina sozinho. Recovery: pra toques ao vivo (T0/pitch), garantir a maquina ligada com a sessao aberta, ou disparo manual.
7. **`VAO RECEBER: 0` no preview.** Causas: CSV errado/vazio, `--evento` nao bate com o Detalhe da origem, ou (toque 6/7) todos ja agendaram. Recovery: conferir CSV, conferir Detalhe da origem, checar se e FUP. NAO disparar as cegas.
8. **Token invalido (Pipedrive/ChatGuru).** O script le do cache local populado do 1Password. Recovery: rotacionar no 1P e rodar `setup-secrets.ps1` pra atualizar o cache. NAO editar o JSON na mao.
9. **`dialog_execute` retorna success mas nao entrega.** Success != entrega. Recovery: conferir no painel ChatGuru (chats arquivados) se a mensagem chegou.

## Exemplo (fluxo tipico de um evento)

Evento "O Imposto Invisivel do Empresario", inicio 12/06 as 19h BRT, CSV em `<path>/invitees-export.csv`.

1. Localizar script/Python (Passo 2) e preview do toque 1: `"$PY" -X utf8 "$SCRIPT" --inscritos "<path>/invitees-export.csv" --evento "O Imposto Invisivel do Empresario" --toque 1 --zoom "https://us02web.zoom.us/j/..." --diag "https://expertintegrado.com.br/diagnostico"`
2. Eric aprova a copy e a lista. Piloto: CSV de 1 linha com o numero do Eric, toque real com `--confirmar` fora da janela 24h. Chegou OK.
3. Disparo real do toque 1 com `--confirmar` (contra o CSV de inscritos completo).
4. Eric escolheu Toque 5 MANUAL. Agendar os demais via CronCreate: toque 2 T-1h (`0 18 12 6 *`), toque 3 T0 (`0 19 12 6 *`), toque 4 T+1h (`0 20 12 6 *`), toque 6 FUP1 D+1 12h (`0 12 13 6 *`), toque 7 FUP2 D+2 12h (`0 12 14 6 *`) — cada um `recurring: false`, `durable: true`, prompt em PREVIEW. Toque 5 fica de fora do cron (sera disparado ao vivo sob comando). Se o Eric tivesse escolhido AGENDADO, entraria tambem toque 5 T+90min (`30 20 12 6 *`).
5. Reportar ao Eric a agenda montada + o resultado de cada disparo.

Detalhes de arquitetura e cadeia no Brain: notas `g3jjtdbg0ksz`, `rfn7klo8igyj`, `v4624gdruzyy`.
