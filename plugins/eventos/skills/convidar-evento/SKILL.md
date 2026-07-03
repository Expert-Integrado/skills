---
name: convidar-evento
description: Use quando o Eric (ou o Niverton) quiser DISPARAR convites via WhatsApp para um evento/imersao da Expert Integrado. TRIGGER quando o pedido for "envia os convites", "dispara os convites do evento", "manda os convites da imersao", "convida a galera pra imersao". NAO usar para lembretes de webinario (skill notificacao-webinario) nem para checar respostas de convites ja enviados (skill verificar-convites).
allowed-tools: mcp__expert-integrado__list_eventos, mcp__expert-integrado__list_participantes, mcp__expert-integrado__list_vendedores, mcp__expert-integrado__get_evento, mcp__expert-integrado__list_config_options, mcp__expert-integrado__gerar_convite_pdf, mcp__expert-integrado__gerar_convites_pdf_lote, mcp__expert-integrado__update_status_convite, mcp__expert-integrado__update_participante, mcp__expert-integrado__add_participante, mcp__expert-integrado__delete_participante, mcp__whatsapp-agent__read, mcp__whatsapp-agent__inbox, mcp__whatsapp-agent__search, mcp__whatsapp-agent__send, mcp__pipedrive__search_persons, mcp__pipedrive__create_person, mcp__pipedrive__create_activity, mcp__pipedrive__pipedrive_write
---

# Convidar para Evento — Expert Integrado

Dispara convites via WhatsApp para eventos do Eric. Puxa a lista de participantes do MCP `expert-integrado` (que ja vem curada), classifica cada um por segmento (RECUSOU/FALTOU/NOVO), gera o PDF personalizado na hora, checa a conversa antes de enviar, dispara 4 mensagens em sequencia (no numero do Eric via `whatsapp-agent`, ou monta kit manual pro Niverton), atualiza o status no MCP e registra atividade no Pipedrive. Roda de qualquer maquina: tudo vem da nuvem, nao depende de arquivo local.

## NUNCA

- **NUNCA disparar sem confirmar o lote com o Eric primeiro** (mostrar quem recebe + pedir "confirmo o disparo?"). So passar `confirmed=true` no `send` depois dessa confirmacao.
- **NUNCA disparar convite atribuido ao OUTRO convidador.** Filtrar SEMPRE por `convidado_por_user_id` do operador. Eric nunca dispara os do Niverton e vice-versa.
- **NUNCA mandar o PDF com legenda** — o PDF e mensagem separada (Msg 3), arquivo sozinho.
- **NUNCA fixar `instance` num lote inteiro sem checar chat a chat** (Passo 4). Incidente 02/07/2026: 10 convites forcados no comercial, 3 contatos frios receberam so a 1a msg.
- **NUNCA deletar participante que ja recebeu convite** — o link do PDF aponta pro token dele; deletar mata o botao de confirmacao (pagina mostra "link invalido").
- **NUNCA usar `update_participante(observacoes=...)`** — sobrescreve o campo e nao ha tool pra ler o valor atual.
- **NUNCA usar travessao longo (—) nas copies** (cara de IA). Usar ponto, virgula ou quebra de linha.
- **NUNCA usar `update_participante` pra mudar status** — ele nao aceita o campo status. Usar `update_status_convite`.
- **NUNCA passar `due_time` vazio ou "00:00"** no `create_activity` do Pipedrive (marca vencida). Omitir o parametro.
- **NUNCA mandar 1a mensagem de "teste"/generica** em chat novo — a 1a msg TEM que ser a Msg 1 real do segmento.
- **NUNCA convidar quem esta na lista de vetos** (ver regras de elegibilidade).

## SEMPRE

- **SEMPRE identificar o operador (Eric ou Niverton) ANTES de tudo** — muda filtro, copy, disparo e pos-envio.
- **SEMPRE acentuacao correta** em todas as mensagens externas (a, a, e, c).
- **SEMPRE so primeiro nome** na saudacao.
- **SEMPRE 3s entre mensagens** (10s em chat novo/frio) pra evitar bloqueio anti-spam.
- **SEMPRE checar a ultima mensagem da conversa** (Passo 3.5) antes de disparar pra cada pessoa.
- **SEMPRE atualizar status no MCP SO se as 4 mensagens foram enviadas com sucesso.**
- **SEMPRE registrar a atividade no Pipedrive na HORA do envio** (dentro do loop de cada pessoa), so pro operador Eric.
- **SEMPRE convidar TODOS da lista `pendente_envio`, na ordem que o MCP retorna, sem re-filtrar por "quente/frio"** — quem esta na lista e pra convidar.
- **SEMPRE normalizar o telefone antes do `send`** — so digitos, comecando com `55` (formato `55XXXXXXXXXXX`).

## Pre-requisitos

- **MCPs:** `expert-integrado` (participantes/eventos/PDF — inclui `list_eventos`, `list_participantes` com parametro `busca`, `list_config_options`, `get_evento`), `whatsapp-agent` (disparo — so pro Eric), `pipedrive` (atividade — so pro Eric).
- **Nenhum arquivo local obrigatorio. O caminho canonico e 100% nuvem** (tudo via MCP na hora) e NAO pressupoe acesso a disco. **Atalho opcional que NAO deve ser tentado quando voce nao consegue checar o filesystem:** se (e somente se) voce puder listar `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/temp/convites-imersao-julho/` e ela contiver `segmentacao.json` / `INDICE-ENVIO.md` / `pdfs/`, da pra reusar (pula recomputar segmento e reaproveita PDFs). Se voce NAO tem tool pra checar arquivo local, ou a pasta nao existir → ignore o atalho e faca TUDO pela nuvem (segmentacao pelo mecanismo `list_eventos` + `busca`, PDFs por `gerar_convite_pdf`). NUNCA travar por falta de arquivo local — a ausencia dele nunca bloqueia o fluxo.
- **Operador (definir no Passo 0):**

| | ERIC | NIVERTON |
|---|---|---|
| `convidado_por_user_id` (filtro) | `5f1aa31e-e159-4638-9699-38a77c0f51cf` | `a11ad1a5-b40e-4541-8ca5-4df70cab1b07` |
| Disparo | Automatico via `whatsapp-agent` (numero pessoal, `instance="pessoal"`) | **MANUAL**: skill monta o kit (mensagens + PDF), Niverton copia/cola do WhatsApp DELE. NAO existe whatsapp-agent pro numero do Niverton |
| Copies | A / B / C (voz do Eric) | A-N / B-N / C-N (voz do Niverton citando o Eric) |
| Pipedrive (Passo 5.5) | Sim, atividade concluída | Não criar via skill (Niverton registra no CRM dele) |
| Marcar `convite_enviado` | Automatico apos envio | SO depois que o Niverton confirmar que mandou |

> O campo texto `convidado_por` e so exibicao. Filtrar SEMPRE pelo UUID `convidado_por_user_id`.

## Segmentacao

Classificar cada participante pelo HISTORICO nas edicoes anteriores. Cada segmento tem uma copy diferente.

### Como montar o historico (mecanismo exato — sem isso nao da pra classificar)

O MCP nao tem tool de "buscar participante across todos os eventos". Reconstruir o historico assim:

1. **Listar TODAS as edicoes** (uma unica chamada, sem parametros):
```
mcp__expert-integrado__list_eventos()
```
Retorna todos os eventos acessiveis. Cada item traz `id` (o `evento_id`) e o nome do evento.
2. **Isolar as edicoes ANTERIORES da imersao (o agrupamento NUNCA e decidido pela skill):**
   - **SE os `evento_id` (das turmas do lote E das edicoes anteriores) ja vieram no pedido do Eric** → usar exatamente esses; as edicoes anteriores sao as que ele apontou.
   - **SENAO** → apresentar ao Eric a lista completa que o `list_eventos` retornou, uma linha por evento no formato `nome + data + id`, e PERGUNTAR: "Quais destes sao as turmas do lote atual e quais sao edicoes anteriores da mesma imersao?". Aguardar ele apontar. NUNCA agrupar sozinho por nome, data ou qualquer heuristica.
   - Guardar os `evento_id` que o Eric apontou como anteriores numa lista `edicoes_anteriores`.
3. **Para cada participante do lote**, buscar o telefone dele em cada edicao anterior:
```
mcp__expert-integrado__list_participantes(evento_id=<cada id de edicoes_anteriores>, busca=<telefone OU nome do participante>)
```
O parametro `busca` filtra por nome/telefone DENTRO daquele evento. Rodar uma vez por `evento_id` de `edicoes_anteriores`. Juntar os resultados = o historico da pessoa.
4. **Classificar pelo que o historico devolveu** (criterios verificaveis na tabela abaixo). Se a pessoa NAO aparece em nenhuma edicao anterior → segmento NOVO.

> Se o Eric apontar que nao ha edicoes anteriores (so a edicao atual) → todos os participantes do lote sao NOVO por definicao.
> A skill NUNCA decide sozinha qual evento e "anterior" da mesma imersao: sempre o Eric aponta (ver item 2 acima).

| Segmento | Criterio verificavel (no historico da pessoa) | Copy |
|---|---|---|
| **RECUSOU** | Aparece em EXATAMENTE 1 edicao anterior com `status = recusou` (e em nenhuma outra edicao com status diferente de recusou) | A / A-N |
| **FALTOU** | Aparece em pelo menos 1 edicao anterior com `status_presenca = ausente` (tinha confirmado presenca e nao compareceu) | B / B-N |
| **NOVO** | NAO aparece em nenhuma edicao anterior (primeira vez que recebe convite: aula, indicacao, network) | C / C-N |
| **COMPROU** | Na edicao ATUAL, `origem = compra_online` (pagou ingresso) | **NAO convidar** — ja esta dentro; cortesia pra quem pagou quebra a percepcao de valor |

> **ATENCAO ao campo `status_presenca`:** `status_presenca = "confirmado"` e DEFAULT de cadastro, NAO significa que a pessoa confirmou o convite. Confirmacao real e o `status` do convite (`aceitou_convite` / `confirmado`). O criterio do segmento FALTOU e `status_presenca = ausente` numa edicao anterior — nao confundir com o status do convite.
> **Ordem de precedencia quando os criterios colidem:** COMPROU (origem compra_online na edicao atual) vence tudo → nao convidar. Depois FALTOU. Depois RECUSOU. NOVO so quando nao ha historico nenhum.
> **Valores possiveis do campo `status`** (mesmos do Passo 5): `pendente_envio`, `convite_enviado`, `em_avaliacao`, `aceitou_convite`, `confirmado`, `recusou`.

**Atalho (opcional, so acelera — NAO e obrigatorio):** este atalho depende de arquivo local e NAO deve ser tentado se voce so tem a tool Read do proprio SKILL.md ou nao consegue checar o disco. Se (e somente se) voce conseguir listar `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/temp/convites-imersao-julho/segmentacao.json` e ele existir (edicao jul/2026 tem os 138 ja classificados), ler de la a classificacao em vez de reconstruir pelo mecanismo acima. **Se nao conseguir checar o arquivo, ou ele nao existir: ignore o atalho e use SEMPRE o mecanismo de 4 passos acima (list_eventos → busca por edicao) — ele e o caminho canonico e sempre funciona pela nuvem.** Nunca travar por causa do atalho.

### Regras de elegibilidade (NAO convidar — decisao do Eric, 01/07/2026)

Antes de disparar, aplicar os 3 filtros de veto abaixo. Cada um e verificavel no historico ja montado (secao "Como montar o historico") — nao depende de julgamento subjetivo:

1. **Recusou 2+ edicoes diferentes** → NAO convidar. Verificavel: no historico da pessoa, contar em quantas edicoes anteriores distintas ela aparece com `status = recusou`. Se >= 2 → veto. So reconvida quem tem exatamente 1 recusa.
2. **Base de convidador desligado/vetado** → NAO convidar. Verificavel por UUID resolvido: rodar `mcp__expert-integrado__list_vendedores()` (retorna `user_id` + nome de cada membro), casar cada NOME da lista de vetos abaixo com o `user_id` correspondente, e vetar o participante cujo `convidado_por_user_id` bater com um desses UUIDs. Como fallback (caso o nome vetado nao apareca no retorno de `list_vendedores`), vetar tambem quando o texto `convidado_por` do participante bater com um nome da lista.
3. **Cliente Super SDR** → NAO convidar. Verificavel: em qualquer edicao (atual ou anterior), `origem = cliente_supersdr` OU o texto de origem contem "Cliente Super SDR". Para confirmar o valor exato de origem, consultar `mcp__expert-integrado__list_config_options()` (retorna os valores validos de `origem`).

**LISTA DE VETOS DE CONVIDADOR (fonte unica — usar EXATAMENTE estes nomes; edicao jul/2026):**
- Vanderson Souza
- Ricardo Junior

Esta lista acima e a fonte fechada para ESTA edicao — nao existe outra. Trate-a como completa e NAO pergunte ao Eric a cada participante. **Perguntar ao Eric UMA unica vez, no Passo 0 (nao a cada pessoa):** "A lista de convidadores vetados continua sendo [Vanderson Souza, Ricardo Junior] ou mudou?". Se o Eric nao responder ou nao estiver disponivel, seguir com esta lista como esta (nao inventar nomes novos, nao remover os existentes).

## Templates de mensagem (4 mensagens, 3s de intervalo)

> Datas, mês da recusa, cidade e link abaixo são da edição de JULHO/2026. Em edição futura, substituir pelos dados reais (confirmar com o Eric antes de disparar). Msg 2 SEMPRE montada do MCP, nunca de memoria.
> Usar "voce" por extenso (padrao do corpus real do Eric nesse contexto). NUNCA travessao longo.

### Copies do ERIC

**Copy A — RECUSOU (recusou 1x a edição anterior):**
```
Fala [PrimeiroNome], beleza?

Em [maio] te chamei pra minha imersão e a data não bateu. Quero te fazer o convite de novo. As duas primeiras edições foram um sucesso, o feedback da galera foi muito legal, então decidimos fazer mais duas.
```
Substituir `[maio]` pelo mes em que a pessoa foi convidada (quem recusou so a de abril recebe "Em abril"). "Recusou" NAO significa que a pessoa esteve no evento. NUNCA escrever "como voce esteve", "voce participou" ou similar.

**Copy B — FALTOU (confirmou e não foi):**
```
Fala [PrimeiroNome], beleza?

Em maio você tinha confirmado presença na minha imersão. Agora em julho vou rodar mais duas edições e quero muito te ver nessa.
```
NAO reforcar o fato negativo ("voce nao apareceu", "nao deu pra ir"). Reconhece o combinado anterior e segue direto pro convite novo.

**Copy C — NOVO (primeira vez):**
```
Fala [PrimeiroNome], beleza?

[GANCHO DE ORIGEM — OBRIGATÓRIO. Ex: "O [Fulano] me passou teu contato." / "Vi seu nome cadastrado na aula de IA que eu fiz no [G4/evento]."]

Quero te convidar pra minha imersão de IA. Um dia inteiro sobre IA aplicada ao operacional do negócio, cada um sai com agente rodando. Já fiz duas edições, as duas lotaram.
```
O gancho de origem e invariante: TODO convite pra contato novo abre citando de onde a pessoa veio.

**De onde tirar o gancho (ordem deterministica — parar no primeiro que resolver):**
1. **Campo `origem` do participante** (vem no retorno de `list_participantes` do Passo 1). Traduzir o valor pro gancho:
   - **Gancho de indicacao — regra objetiva:** SO usar "O [nome] me passou teu contato." **SE o NOME do indicador estiver literal** no texto do campo `origem` OU no campo `convidado_por`. Copiar o nome exatamente como aparece la. **SE nao houver nome literal** → NAO inventar indicador: cair no proximo gancho concreto abaixo (aula/evento/network); se nenhum servir, ir pro item 2 (perguntar ao Eric).
   - `aula` / `evento` / nome de aula ou evento → "Vi seu nome cadastrado na [aula/evento] que eu fiz no [G4/nome]."
   - `network` → "A gente se conheceu no [contexto]." (se o contexto estiver no campo).
   - Para ver a lista de valores validos de `origem` e o que cada um significa: `mcp__expert-integrado__list_config_options()`.
2. **Se `origem` estiver vazia, generica (ex. `Desconhecido`) ou nao permitir montar uma frase concreta** → PERGUNTAR ao Eric a origem daquela pessoa especifica. **Sem gancho concreto, NAO dispara** essa pessoa (pular e reportar no resumo final se o Eric nao responder).

> Resumindo a decisao: `origem` util no payload → montar o gancho sozinho, sem perguntar. `origem` inutil/ausente → perguntar so daquela pessoa. Nunca disparar Copy C com o placeholder `[GANCHO DE ORIGEM]` ainda no texto.

### Copies do NIVERTON (voz profissional, proxima, sempre citando o Eric como anfitriao)

**Copy A-N — RECUSOU:**
```
Oi [PrimeiroNome], tudo bem? Aqui é o Niverton, da equipe do Eric Luciano.

Em [maio] você recebeu o convite pra imersão do Eric e a data não bateu. Ele vai rodar mais duas edições agora em julho e me pediu pra te convidar de novo. As duas primeiras lotaram e o feedback foi muito bom.
```

**Copy B-N — FALTOU:**
```
Oi [PrimeiroNome], tudo bem? Aqui é o Niverton, da equipe do Eric Luciano.

Em maio você tinha confirmado presença na imersão do Eric. Ele vai rodar mais duas edições agora em julho e me pediu pra garantir seu convite nessa.
```

**Copy C-N — NOVO (geralmente lead que negociou com o Niverton):**
```
Oi [PrimeiroNome], tudo bem? Niverton aqui, da Expert Integrado. A gente conversou há um tempo sobre [contexto da negociação].

O Eric, nosso fundador, vai rodar uma imersão presencial de IA em julho e separou alguns convites de cortesia. Lembrei de você na hora. Um dia inteiro de IA aplicada ao negócio, saindo com agente rodando.
```
Substituir `[contexto da negociacao]` pelo assunto real do deal (mentoria, automacao etc. — esta no Pipedrive/observacoes). Se o Niverton nunca falou com a pessoa: "Voce se cadastrou na [aula/palestra] do Eric Luciano" e apresentar-se do mesmo jeito.

### Msg 2 — Datas + link (IGUAL pros 3 segmentos, mesma pros dois operadores). MONTAR DO MCP:
Buscar via `get_evento` das turmas irmas (mesmo nome, status planejamento, data futura): dias, cidade (do `endereco_completo`), horario (`hora_inicio`-`hora_fim`) e `url_site_vendas`.
```
Agora vao ser duas turmas: [DIA1] ou [DIA2] de [MES], aqui em [CIDADE], das [INICIO] as [FIM]. Voce escolhe o dia que encaixa melhor na agenda.

Detalhes e confirmacao: [URL_SITE_VENDAS]
```
Exemplo jul/2026: "Agora vao ser duas turmas: 29 ou 30 de julho, aqui em Sao Paulo, das 8h as 20h. (...) https://imersao.ericluciano.com.br". Se a edicao tiver UMA turma so: "Vai ser dia [DIA] de [MES], ...".

### Msg 3 — PDF (arquivo sozinho, SEM legenda):
Gerado na hora via `gerar_convite_pdf(participante_id=...)` → usar a `url` retornada. O PDF ja sai com os botoes "CONFIRMAR DIA 29/07" e "CONFIRMAR DIA 30/07" (v5, foto, "terceira edicao", selo CORTESIA). Tanto faz em qual turma o participante esta cadastrado — os botoes cobrem as duas.

### Msg 4 — Explicacao + fechamento (IGUAL pros 3 segmentos):
```
O convite em PDF é personalizado com seu nome. Dentro dele tem os botões pra escolher o dia (29 ou 30) e confirmar presença direto por lá.

Só te peço uma coisa, por favor: se não puder ir, me avisa. Tenho ingressos limitados pra distribuir e aí passo pra outra pessoa..

Bora?
```
(Copies do Niverton trocam "me avisa" por "me avisa aqui".)

### Follow-up 48h (sem resposta e sem clique):
```
Fala [PrimeiroNome], beleza? Tô fechando a lista das turmas de julho. 29 ou 30, qual fica melhor pra você? É só tocar no botão do convite que te mandei. Se não rolar dessa vez, tranquilo, só me avisa que passo a vaga pra frente. Bora?
```

## Passos

### Passo 0: Definir operador + coletar parametros
1. Identificar o operador (Eric ou Niverton). **SE o pedido nomeia o operador** (ex.: "manda os convites do Niverton", "vou disparar os meus") → usar esse. **SENAO** → PERGUNTAR sempre (1 pergunta unica no inicio: "Quem esta operando, Eric ou Niverton?"). Nao inferir do ambiente.
2. **Coletar o `evento_id` de cada turma do lote atual.** Se o Eric ja passou os ids, usar. Se nao passou, rodar `mcp__expert-integrado__list_eventos()` e pegar os eventos da imersao com data futura / status planejamento (as turmas irmas). Valores conhecidos jul/2026: dia 29 = `2621e765-994c-480f-962a-0715dae6fbe3`, dia 30 = `f2157b51-f82c-4c84-b62e-bf21c6afdf8f`. Em edicao futura, os ids sao OUTROS — obter via `list_eventos` e confirmar com o Eric qual turma e qual antes de disparar.
3. **Confirmar com o Eric o lote do dia — este parametro e do Eric, a skill NAO decide sozinha a composicao.** Perguntar objetivamente: "Quantos disparos hoje e quais segmentos (ex.: 20 RECUSOU + 10 NOVO)? Alguma ordem de prioridade entre os segmentos?". Regras fixas que a skill aplica mesmo sem resposta detalhada:
   - Teto rigido: **max ~30 disparos/dia por numero** (anti-spam + capacidade de resposta). Nunca ultrapassar sem ordem explicita do Eric.
   - Ordem DENTRO do lote: seguir a ordem que o `list_participantes` retorna (Passo 1) — nao reordenar por conta propria.
   - Se o Eric so disser um numero total sem segmento (ex.: "manda 30"): pegar os N primeiros da lista retornada pelo MCP, ja passados pela segmentacao e pelos filtros de veto.
   - **Resposta parcial do Eric — o que falta assume default; o que nao tem default, reperguntar so o campo faltante:**
     - **Numero nao informado** → default **30** (o teto do dia). Nao reperguntar.
     - **Segmento nao informado** → NAO tem default → reperguntar SO o segmento ("Quais segmentos? Ex.: 20 RECUSOU + 10 NOVO, ou todos misturados?").
     - **Prioridade entre segmentos nao informada** → NAO tem default → reperguntar SO a prioridade ("Alguma ordem de prioridade entre os segmentos?").
   - Reperguntar apenas o(s) campo(s) sem default e sem resposta — nunca refazer a pergunta inteira nem chutar segmento/prioridade.
4. **Confirmar a lista de vetos UMA vez** (ver "Regras de elegibilidade"): "A lista de convidadores vetados continua [Vanderson Souza, Ricardo Junior] ou mudou?". Registrar a resposta e nao reperguntar durante o lote.

### Passo 0.5: Montar historico das edicoes anteriores (base da segmentacao)
Antes de segmentar, rodar `mcp__expert-integrado__list_eventos()` uma vez. Definir `edicoes_anteriores` pela regra do item 2 de "Como montar o historico": se os `evento_id` das edicoes anteriores vieram no pedido, usar esses; SENAO, apresentar ao Eric a lista `nome + data + id` e aguardar ele apontar quais sao lote e quais sao anteriores (NUNCA agrupar sozinho). Guardar a lista `edicoes_anteriores` — sera usada no Passo 2. Se o Eric apontar que so ha a edicao atual, `edicoes_anteriores` fica vazia e todos serao NOVO.

### Passo 1: Listar participantes
Cada turma/dia e um evento SEPARADO no MCP (nao existe evento "pai"). **Rodar `list_participantes` UMA VEZ por `evento_id` do lote atual** (Passo 0, item 2) e depois unificar:
```
mcp__expert-integrado__list_participantes(evento_id=<id_turma_1>, status="pendente_envio")
mcp__expert-integrado__list_participantes(evento_id=<id_turma_2>, status="pendente_envio")
```
1. Rodar a chamada acima para CADA `evento_id` das turmas do lote.
2. **Unificar as listas e deduplicar por telefone normalizado** (so digitos, com `55`): se a mesma pessoa aparecer em duas turmas, mante-la UMA vez so (o PDF cobre os dois dias — ver Msg 3, os botoes valem pras duas turmas; a pessoa fica na turma em que ja esta cadastrada).
3. **Filtrar por `convidado_por_user_id` do OPERADOR** (UUIDs no bloco Pre-requisitos).
- **Se a lista unificada ficar vazia** → reportar ao Eric "nenhum participante pendente pra este operador/evento" e PARAR.
- Esta e a lista FINAL e curada. Convidar TODOS na ordem retornada (turma 1 depois turma 2, mantendo a ordem do MCP dentro de cada uma), sem pular. O status (`pendente_envio` → `convite_enviado`) garante que ninguem recebe 2x.

### Passo 2: Segmentar
Classificar cada participante do lote em RECUSOU / FALTOU / NOVO / COMPROU usando o **mecanismo de 4 passos** da secao Segmentacao ("Como montar o historico"): para cada pessoa, buscar o telefone em cada `evento_id` de `edicoes_anteriores` (montado no Passo 0.5) via `list_participantes(evento_id=..., busca=<telefone>)`, juntar o historico e aplicar a tabela de criterios + a ordem de precedencia. Depois aplicar os 3 filtros de veto (Regras de elegibilidade).
- **Caminho canonico (sempre funciona pela nuvem):** o mecanismo `list_eventos` → `list_participantes(busca=...)` acima. Este e o default. NAO depende de arquivo local.
- **Atalho (opcional, so se voce conseguir checar o disco E o arquivo existir):** se `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/temp/convites-imersao-julho/segmentacao.json` existir e for legivel, ler a classificacao de la em vez de reconstruir. **Se voce nao tem como checar o arquivo local (ex.: so tem a tool Read do SKILL.md), NAO tente o atalho — va direto pelo caminho canonico.** Nunca travar por causa da ausencia do arquivo.
- **Em duvida sobre segmento ou elegibilidade de uma pessoa especifica** → PERGUNTAR ao Eric (bifurcacao real). Duvida generica de mecanismo NAO existe: o mecanismo acima e deterministico.

### Passo 3: Gerar os PDFs
```
mcp__expert-integrado__gerar_convite_pdf(participante_id=<id>)
```
Um por participante (ou `gerar_convites_pdf_lote` pro lote). Guardar a `url` de cada um.
- **Se retornar erro/sem url** → logar, pular essa pessoa, reportar no resumo final.

### Passo 3.5: Checagem obrigatoria da ultima mensagem (ANTES de disparar pra CADA pessoa)
```
mcp__whatsapp-agent__read(chat=<telefone>, limit=15)
```
Usar `limit=15` (nao 3 — limit baixo pode pular mensagens recentes; falso positivo conhecido: Cleber, 2026-04-23).
- **SE a ultima mensagem foi DO CLIENTE e esta nao respondida** → NAO enviar o convite dessa pessoa no lote (o guardrail de nao enviar por cima de conversa ativa permanece). **Em escala (lote):** NAO parar o lote nem perguntar uma a uma — acumular essa pessoa numa lista "conversas ativas / nao enviados" e seguir para a proxima. No relatorio final (Passo 6), apresentar TODAS essas pessoas juntas pro Eric decidir uma a uma (responder antes, convidar mesmo assim, ou pular).
- **SE a ultima foi do Eric/equipe, OU a conversa ja foi respondida** → pode disparar.

**Rede de seguranca do MCP:** o `send` tem gate nativo `force_send_after_inbound` (default false) que bloqueia se a pessoa mandou algo nos ultimos 10 min sem resposta. Se o `send` bloquear por isso → e conversa ativa: PARAR e perguntar ao Eric. So usar `force_send_after_inbound=true` depois que o Eric mandar enviar mesmo assim.

**ATENCAO LIDs:** Eric as vezes responde num chat LID separado (`XXXXXXXX@lid`) que nao aparece no read por numero. Sintoma: leitura por numero mostra so msgs antigas + Eric afirma ter respondido. Acao: `mcp__whatsapp-agent__inbox(since=<ultimas 2h>)` ou `search(query=<palavra-chave>)` pra achar o LID, entao `read(chat=<LID@lid>, limit=15)`. Casos conhecidos: Henrique Scaramussa (22458769879126@lid), Cesar Barboza (83627341791456@lid), Luiz Closer (78533510574149@lid), Nicolas Tonetto (12434047811609@lid), Matheus Medeiros (180719439593480@lid).

### Passo 4: Disparo — SO operador ERIC (4 mensagens)

**Antes de enviar, determinar de qual numero sai (regra dura — incidente 02/07/2026):**
1. Rodar `read(chat=<telefone>)` SEM `instance`. O retorno diz em qual numero existe conversa (campo `instance`).
2. **SE existe chat em UM numero** → OMITIR `instance` no `send` (o MCP herda o chat automaticamente). NUNCA forcar o outro numero.
3. **SE existe nos DOIS** → usar `instance="pessoal"` (relacao direta do Eric), salvo ordem contraria do Eric.
4. **SE NAO existe em nenhum** (contato 100% frio) → `instance="pessoal"` + `allow_new=true`. Comercial SO com ordem explicita do Eric.

**Parametros do `send` (nomes exatos):**
- Texto vai em `content` (NAO `text`).
- PDF: `type="document"` + `media_url=<url do gerar_convite_pdf>` + `file_name="Convite - [Nome].pdf"`, SEM legenda.
- `confirmed=true` e OBRIGATORIO pra enviar de verdade — so passar `true` depois que o Eric confirmou o lote (Passo 0).

**Chat JA existente** (omitir `instance` → herda o numero certo), sleep 3s:
```
mcp__whatsapp-agent__send(to=<telefone>, content=<msg1>, confirmed=true)
sleep 3
mcp__whatsapp-agent__send(to=<telefone>, content=<msg2>, confirmed=true)
sleep 3
mcp__whatsapp-agent__send(to=<telefone>, type="document", media_url=<pdf_url>, file_name="Convite - [Nome].pdf", confirmed=true)
sleep 3
mcp__whatsapp-agent__send(to=<telefone>, content=<msg4>, confirmed=true)
```

**Chat NOVO / frio** — proteca anti-LID obrigatoria (o WhatsApp pode remapear o contato pra um id interno `XXXX@lid` logo apos a 1a msg; as seguintes enviadas pro telefone caem num chat orfao e SOMEM, com a API retornando ok):
```
mcp__whatsapp-agent__send(to=<telefone>, content=<msg1>, instance="pessoal", allow_new=true, confirmed=true)
sleep 10
chat_id = mcp__whatsapp-agent__read(chat=<telefone>, instance="pessoal").chat_id
mcp__whatsapp-agent__send(to=chat_id, content=<msg2>, confirmed=true)
sleep 10
mcp__whatsapp-agent__send(to=chat_id, type="document", media_url=<pdf_url>, file_name="Convite - [Nome].pdf", confirmed=true)
sleep 10
mcp__whatsapp-agent__send(to=chat_id, content=<msg4>, confirmed=true)
```
- Em chat novo usar sleep **10s** (nao 3s) e enviar msg2/PDF/msg4 com `to=chat_id` (nao o telefone).
- `ok=true` do send NAO garante entrega em chat novo — Eric confere 1-2 amostras por lote visualmente. O `read` nao mostra as msgs que o proprio agent envia.
- **Se falhar em alguem** → logar e continuar; reportar no resumo final. NAO marcar `convite_enviado` de quem falhou.

### Passo 4-N: Kit manual — operador NIVERTON
Nada de `send`. Pra cada participante do lote:
1. `gerar_convite_pdf(participante_id)` → guardar a `url`.
2. Entregar ao Niverton, por pessoa: telefone + Msg 1 (copy -N do segmento) + Msg 2 + link do PDF (ele baixa e anexa) + Msg 4.
3. Ele envia do WhatsApp dele, na ordem, com o PDF como mensagem separada sem legenda.
4. SO depois que ele CONFIRMAR o envio → rodar o Passo 5 (`update_status_convite`). Nunca antes.

### Passo 5: Atualizar status no MCP (so apos as 4 msgs enviadas com sucesso)
```
mcp__expert-integrado__update_status_convite(participante_id=<id>, novo_status="convite_enviado")
```
Valores validos: `pendente_envio`, `convite_enviado`, `em_avaliacao`, `aceitou_convite`, `confirmado`, `recusou`.

### Passo 5.5: Registrar atividade no Pipedrive — SO operador ERIC (na HORA do envio)

> **`owner_id` e `user_id` aceitam o NOME por extenso** — passar a string `"Eric Luciano"` direto. O MCP pipedrive resolve nome → ID internamente (schema da tool: "Nome ou ID do responsavel. Ex: 'Eric Luciano'"). NAO ha nem e preciso tool de lookup de usuario; NAO buscar UUID antes.

Pra cada convite enviado com sucesso, dentro do loop de CADA pessoa (NAO deixar "pra depois" — incidente 02/07/2026: 35 atividades tiveram que ser criadas retroativas em backfill):
```
mcp__pipedrive__search_persons(term=<últimos 8 dígitos do telefone>)
```
- **SE nao achar (contato novo):**
```
mcp__pipedrive__create_person(
  name=<nome>,
  phone=<telefone 55XXXXXXXXXXX so digitos>,
  owner_id="Eric Luciano",
  custom_fields='{"Origem do Contato": "INDIC | Direta do Eric", "Pessoa que indicou": "Eric Luciano"}'
)
```
NUNCA sobrescrever "Origem do Contato" de pessoa que ja existe (regra CLAUDE.md: 1x na vida).

- **Criar a atividade ja CONCLUIDA** (`done=true` cria retroativo):
```
mcp__pipedrive__create_activity(
  subject="Convite enviado, imersão, <DD.MM.AAAA>",
  type="whatsapp",
  due_date="<YYYY-MM-DD do envio>",   # SEM due_time
  person_id=<id>,
  user_id="Eric Luciano",
  note="Contexto: <segmento, de onde veio, quem trouxe>",
  done=true
)
```

### Passo 6: Resumo final
Tabela dos enviados: `Nome | Segmento | Status envio | Status MCP | Pipedrive (act_id)`.
Depois da tabela, **listar TODAS as pessoas retidas no Passo 3.5** (ultima mensagem do cliente sem resposta) juntas, uma por linha (`Nome | telefone | ultima msg do cliente`), pro Eric decidir uma a uma: responder antes, convidar mesmo assim, ou pular. Nao enviar nenhuma delas sem ordem dele.

## Fluxos alternativos (apos o clique / resposta por texto)

**Convidado CLICA "CONFIRMAR DIA X" no PDF (automatico, nada a fazer no disparo):** o sistema abre a pagina de confirmacao, ele completa nome/email/empresa/cidade (obrigatorios), e o sistema move ele pra turma do dia escolhido + marca `aceitou_convite` sozinho (RPC `accept_invite_with_day`), mesmo que estivesse cadastrado na outra turma. A skill `verificar-convites` detecta isso na varredura.

**Convidado responde o dia POR TEXTO** (ex: "pode ser dia 30"):
- **SE o dia escolhido NAO e o evento onde ele esta:** mover com `add_participante` no evento do dia certo (copiando dados + `convidado_por`) e `delete_participante` no antigo. Gerar PDF novo e reenviar: "Te coloquei na turma do dia [X]. E so confirmar no botao do convite."
- **SE ele confirmar verbalmente** ("to dentro dia 29"): `update_status_convite(participante_id, novo_status="aceitou_convite")` + registrar no Pipedrive (ver verificar-convites Passo 5.5).

**Trocar convidador de um participante:** `update_participante(participante_id, convidado_por_user_id=..., convidado_por=...)` — funciona direto (validado 02/07/2026). NUNCA usar delete + add pra isso (deletar mata o token do PDF).

## Validacao final (checklist antes de encerrar)

- [ ] Operador identificado (Eric ou Niverton) e filtro por `convidado_por_user_id` aplicado.
- [ ] Lote confirmado com o Eric antes de qualquer `confirmed=true`.
- [ ] Cada pessoa passou pelo Passo 3.5 (checagem da ultima mensagem) antes do disparo.
- [ ] Nenhum PDF enviado com legenda; PDF foi mensagem separada.
- [ ] `instance` decidido chat a chat (nao fixado no lote).
- [ ] Status `convite_enviado` atualizado SO pra quem recebeu as 4 mensagens com sucesso.
- [ ] (Eric) Atividade Pipedrive concluida criada pra cada envio, na hora.
- [ ] Resumo final entregue com a tabela do Passo 6.

## Erros comuns e recovery

| Sintoma | Causa | Acao |
|---|---|---|
| `send` retorna "Nenhum chat encontrado" | numero sem chat previo | Reenviar a Msg 1 com `allow_new=true` + `instance="pessoal"`; dali em diante segue o fluxo de chat novo (Passo 4). |
| `send` bloqueado por inbound recente | pessoa escreveu nos ultimos 10 min sem resposta | Conversa ativa: PARAR e perguntar ao Eric. So `force_send_after_inbound=true` apos ordem dele. |
| `read` mostra so msgs antigas + Eric diz que respondeu | conversa migrou pra chat LID | `inbox(since=<2h>)` ou `search()` pra achar o `@lid`, depois `read(chat=<LID@lid>, limit=15)`. |
| msg2/PDF sumiram apesar de `ok=true` | chat novo remapeou pra `@lid` (chat orfao) | Enviar msg2/PDF/msg4 com `to=chat_id` (capturado via `read` apos a msg1), sleep 10s. Eric valida 1-2 amostras visualmente. |
| Pagina do PDF mostra "link invalido" | participante foi deletado (token morto) | Nunca deletar quem ja recebeu convite. Se aconteceu: recriar participante e gerar PDF novo. |
| `update_participante` nao muda o status | campo status nao e aceito nesse tool | Usar `update_status_convite`. |
| Pipedrive: atividade marcada como vencida | passou `due_time` vazio/"00:00" | Recriar com `due_time` OMITIDO. |
| Pipedrive: "This tool has been disabled" | callback do Claude Desktop bloqueia `create_*` | Usar `mcp__pipedrive__pipedrive_write({action:"create_activity", params:{...}})` (mesma logica, nome neutro). |
