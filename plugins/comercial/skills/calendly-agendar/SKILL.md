---
name: calendly-agendar
description: Agenda uma reunião no Calendly de forma totalmente automática para um convidado. Tenta via API primeiro; se falhar, usa Playwright para navegar no Calendly e completar o agendamento clicando no slot real. TRIGGER quando o usuário pedir "agenda a call", "marca reunião com o lead", "agenda o diagnóstico de [nome]", "agendar automaticamente no Calendly", ou similar. NÃO usar quando o pedido for gerar link pro lead escolher o próprio horário ("cria link do Calendly", "manda link de agendamento", "link único pro lead") — isso é a skill calendly-link. NÃO usar pra compromisso interno sem lead/cliente (usar Outlook).
allowed-tools: mcp__calendly__calendly_list_event_types, mcp__calendly__calendly_list_available_slots, mcp__calendly__calendly_schedule, mcp__calendly__calendly_get_event, mcp__playwright__browser_navigate, mcp__playwright__browser_wait_for, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_fill_form, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__pipedrive__search_deals, mcp__pipedrive__create_note, mcp__pipedrive__list_deal_activities, mcp__pipedrive__create_activity, mcp__pipedrive__pipedrive_write
---

# Calendly — Agendar Automaticamente

Fluxo completo de agendamento: coleta dados do lead, escolhe tipo de evento e slot, tenta agendar via API (`calendly_schedule`) e usa Playwright como fallback para clicar e confirmar no browser. Ao final, registra nota no Pipedrive (se houver deal) e reporta ao usuário com horário em Brasília + link Zoom.

## NUNCA

- NUNCA inventar horário — todo slot agendado DEVE vir da resposta de `mcp__calendly__calendly_list_available_slots`.
- NUNCA agendar sem confirmação do Eric quando o horário veio do lead (ex.: lead disse "pode ser quinta às 10h") — apresentar o slot encontrado **e o tipo de evento escolhido** e aguardar o OK do Eric antes do Passo 4.
- NUNCA criar atividade Pipedrive manual logo após o agendamento — a integração nativa Calendly→Pipedrive cria as atividades automaticamente (criar manual = duplicata). Única exceção: recovery E3 abaixo.
- NUNCA usar e-mail de domínio descartável (sharklasers.com, mailinator.com, guerrillamail.com) — o Calendly bloqueia na submissão do formulário. Se o e-mail do lead for descartável → pedir e-mail real e parar.
- NUNCA exibir horário em UTC pro usuário — sempre converter/exibir em Brasília (BRT, UTC-3).

## SEMPRE

- SEMPRE exibir horários em Brasília. A resposta de `calendly_list_available_slots` já traz `start_time_brt` convertido — usar esse campo na apresentação.
- SEMPRE passar telefone com DDI 55 (formato `55DDDNÚMERO`, ex.: `5511987650000`). O MCP normaliza pra `+55` automaticamente via `normalizeBrPhone()` — sem o `+55` o Calendly assume código US (+1) e a validação falha.
- SEMPRE usar acentuação correta do português em qualquer texto externo (nota Pipedrive, mensagem, report).
- SEMPRE reportar ao final com o template do Passo 7.

## Pré-requisitos

- **MCP `calendly`** ativo (repo `ericlucianoferreira/calendly-mcp` — PC: `C:/repos/calendly-mcp/index.js`; VPS: `/workspace/mcps/calendly-mcp/index.js`; token na env `CALENDLY_TOKEN` do processo do MCP; item 1Password: `op read "op://Agentes Eric/Calendly/credencial"`; se rotacionar, rodar o setup-secrets da máquina pra propagar). SE as tools `mcp__calendly__*` não existirem na sessão → reportar "MCP calendly não configurado nesta máquina" e parar.
- **MCP `playwright`** — necessário SÓ no fallback (Passo 5). SE não existir e a API falhar → seguir direto pro recovery E1 (entregar `prefill_url`).
- **MCP `pipedrive`** — necessário SÓ pro registro de nota (Passo 6). SE não existir → pular Passo 6 e avisar no report.

## Passos

### 1. Coletar dados do convidado

| Campo | Obrigatório | Obs |
|---|---|---|
| Nome completo | Sim | |
| E-mail | Sim | Domínio real (ver NUNCA) |
| WhatsApp | Sim | Campo "WhatsApp" do formulário |
| Empresa | Sim | Campo "Nome da Empresa" do formulário |
| Observações | Não | Contexto da conversa, dores, origem |

**O que conta como "contexto" (fontes válidas para preencher os campos sem perguntar), em ordem de prioridade — a de cima vence em caso de conflito:**

1. **O texto do pedido atual do Eric** (a mensagem que disparou a skill), incluindo dados entre parênteses (ex.: "agenda o diagnóstico do João (joao@x.com.br, 5511987650000, Empresa XYZ)").
2. **Mensagens anteriores desta mesma conversa** (o histórico já visível na sessão).
3. **Um deal do Pipedrive já aberto/citado nesta conversa** OU uma conversa de WhatsApp já lida nesta sessão (via tools do próprio agente antes de a skill rodar).

Regras de combinação:

- Preencher cada campo a partir da fonte de MAIOR prioridade que tiver aquele valor. Fontes de prioridade menor só preenchem campos que as de maior prioridade deixaram vazios.
- **Conflito** (a mesma informação vem diferente de duas fontes — ex.: telefone `5511...` no pedido do Eric e `5521...` no Pipedrive): usar o valor da fonte de MAIOR prioridade (o pedido do Eric ganha do Pipedrive) e mencionar o conflito ao Eric no report final (Passo 7), não interromper o fluxo por isso.
- **NÃO** buscar dados em fontes fora do que já está na sessão só para preencher — a skill não abre CRM/WhatsApp por conta própria no Passo 1; usa só o que já está no contexto. (O Pipedrive só é consultado no Passo 6, e para registro de nota, não para coletar dados do convidado.)
- SE o contexto (fontes 1-3) já tiver todos os campos obrigatórios → usar sem perguntar.
- SE faltar campo obrigatório → perguntar ao usuário UMA vez, listando só os campos faltantes, e aguardar.

### 2. Escolher tipo de evento

Chamar `mcp__calendly__calendly_list_event_types` (sem parâmetros). A resposta é `{ event_types: [...] }`; cada item tem os campos `uri`, `uuid`, `name`, `slug`, `duration_minutes`, `scheduling_url`, `description`, `locations`, `custom_questions`. Ao escolher, guardar o campo `uri` do item (é o `event_type_uri` usado nos passos 3 e 4).

Regra de escolha (avaliar na ordem; parar na primeira que casar):

1. **SE o pedido nomeia o tipo de evento** (ex.: "agenda uma apresentação", "marca o onboarding") → escolher o item cujo `name` contém, sem diferenciar maiúsculas/minúsculas nem acentos, a palavra-chave que o pedido citou. **Regra objetiva de match:** extrair os substantivos do pedido (descartar stopwords — "agenda", "marca", "uma", "o", "a", "de", "do", "da", "com", "para", "reunião", "call", "evento", nomes próprios do lead/empresa) e comparar cada um, em minúsculas e sem acentos, contra o campo `name` de cada event type (também em minúsculas e sem acentos), procurando o substantivo como substring do `name`. **SE nenhum item casar OU mais de um item casar** → NÃO escolher sozinho: apresentar ao usuário a lista numerada dos `name` retornados (os que casaram, ou todos se nenhum casou) e aguardar a escolha (nunca decidir no empate).
2. **SENÃO SE é lead de prospecção/diagnóstico** (o pedido fala em "diagnóstico", "call de diagnóstico", "primeira reunião com o lead", ou não especifica o tipo mas é claramente um lead novo) → escolher o padrão. **Critério de match do padrão** (aplicar em cascata, parar no primeiro que retornar exatamente 1 item):
   - (a) `name` == `Diagnóstico de IA e Automação` (igualdade exata, ignorando maiúsculas/minúsculas e espaços nas pontas);
   - (b) SE (a) não achou → `name` contém a substring `Diagnóstico` (ignorando maiúsculas/minúsculas/acentos) **E** `duration_minutes` == `60`;
   - (c) SE (b) não achou → `name` contém `Diagnóstico` (ignorando maiúsculas/minúsculas/acentos), qualquer duração.
   - Ignorar o sufixo "(60min)" ao comparar `name` — a duração NÃO faz parte do campo `name`, vem separada em `duration_minutes`. Esse sufixo no texto da skill é só rótulo humano.
   - SE nenhum dos três achou item, OU se (a)/(b)/(c) devolveu mais de 1 item → NÃO adivinhar: listar todos os `name` retornados ao usuário e aguardar a escolha (mesma ação do item 3 abaixo).
3. **SENÃO** (pedido não nomeia tipo e não é lead de diagnóstico) → apresentar ao usuário a lista de `name` (com a `duration_minutes` de cada) e aguardar a escolha.

**Tornar a escolha visível (evitar decisão silenciosa):** quando o tipo foi escolhido pela regra 2 (padrão inferido, sem o usuário nomear), o nome exato do tipo escolhido DEVE aparecer no primeiro ponto em que o agente fala com o Eric depois disto — que é ou (a) a mensagem de confirmação do Passo 3, quando o horário veio do lead (ver bloco NUNCA — a confirmação já inclui o tipo de evento), ou (b) a apresentação dos 5 slots do Passo 3, quando o horário ainda será escolhido. Assim, se o padrão inferido estiver errado, o Eric vê o nome do evento ANTES de qualquer agendamento e pode corrigir. NÃO abrir um novo prompt de confirmação só para o tipo de evento — basta o tipo estar explícito na interação que já acontece no Passo 3.

SE a chamada falhar (erro de auth/token) → reportar o erro literal ao usuário e parar (ver E7).

### 3. Escolher slot

Chamar `mcp__calendly__calendly_list_available_slots` com:
- `event_type_uri`: do Passo 2
- `start_date`: hoje (`YYYY-MM-DD`, data de Brasília)
- `end_date`: hoje + 6 dias (a API do Calendly aceita no máximo 7 dias corridos por chamada; como o MCP converte `start_date` para 00:00 de Brasília, `hoje + 7` estoura o limite)

SE a chamada falhar com erro 400 ("supplied parameters are invalid") → repetir UMA vez com `start_date` = amanhã e `end_date` = amanhã + 6 (versões antigas do MCP mandavam start no passado — 00:00 de hoje — e a API rejeita janela que começa no passado). SE ainda falhar → reportar o erro literal e parar.

A resposta é `{ slots: [...], count: N }`. Cada item de `slots` tem os campos `start_time_utc`, `start_time_brt`, `status`, `invitees_remaining`. `count` é o tamanho de `slots` (número de horários disponíveis retornados). Considerar disponível todo slot da lista (o MCP só retorna horários abertos).

- **SE o lead já escolheu um horário específico** (ex.: "quinta às 10h") → localizar na lista `slots` o horário pedido, comparando pelo `start_time_brt` (que já vem em Brasília). Regra de match:
  - Converter o horário pedido pelo lead para dia + hora em Brasília. Procurar na lista um slot cujo `start_time_brt` seja o MESMO dia e a MESMA hora:minuto.
  - **Match exato** = existe slot no dia e hora:minuto pedidos → usar esse.
  - **Se não houver exato, "mais próximo" tem tolerância definida:** aceitar como "mais próximo" apenas um slot **no MESMO dia** pedido, escolhendo o de menor diferença absoluta em minutos em relação à hora pedida. **NÃO** trocar de dia automaticamente.
  - SE NÃO existir nenhum slot no dia pedido → NÃO escolher um dia diferente por conta própria. Reportar ao Eric: "não há horário disponível [dia pedido]; os horários mais próximos são: [listar os 3 slots — `start_time_brt` — mais próximos do pedido, podendo ser em outros dias]" e aguardar o Eric dizer qual usar (ou pedir outra janela).
  - Achado o slot (exato ou mais próximo no mesmo dia) → apresentar ao Eric o `start_time_brt` desse slot **e o tipo de evento** (Passo 2) e AGUARDAR confirmação antes do Passo 4 (regra do bloco NUNCA).
- **SENÃO** (nenhum horário foi pedido) → apresentar os primeiros 5 itens de `slots` pelo campo `start_time_brt` (com o tipo de evento escolhido no Passo 2) e aguardar a escolha do usuário.
- SE `count` == 0 → repetir a chamada UMA vez com a janela seguinte (`start_date` = hoje+7, `end_date` = hoje+13, ambos `YYYY-MM-DD` em Brasília). SE ainda `count` == 0 → reportar "sem slots disponíveis nas próximas 2 semanas" e parar.

Guardar o `start_time_utc` do slot escolhido, **exatamente como veio na resposta** (é uma string ISO 8601 em UTC terminando em `Z`, ex.: `2026-07-03T13:00:00.000000Z`). NÃO converter esse valor — no Passo 4 ele é passado como está.

### 4. Tentar agendamento via API

Chamar `mcp__calendly__calendly_schedule` com:
- `event_type_uri`: do Passo 2
- `slot_start_iso`: passar o `start_time_utc` guardado no Passo 3 **exatamente como veio** (a string UTC terminando em `Z`). NÃO reconverter para `-03:00`. O MCP normaliza o valor para UTC internamente (`new Date(...).toISOString()`), então `Z` e offset `-03:00` produzem o MESMO resultado no servidor — mandar o `Z` original evita conversão manual e erro de fuso. (Os dois formatos são aceitos; a preferência é o `Z` original só porque já está pronto na resposta do Passo 3.)
- `invitee_name`, `invitee_email`: do Passo 1 (obrigatórios).
- `invitee_phone` (WhatsApp), `invitee_company` (Empresa), `invitee_notes` (Observações): do Passo 1 (opcionais no MCP; passar quando existirem). Telefone no formato `55DDDNÚMERO` — ver bloco SEMPRE.

**SE `success: true` e `method: "direct_api"`:**
1. Extrair `event_uri` da resposta; `event_uuid` = último segmento da URI (após a última `/`).
2. Chamar `mcp__calendly__calendly_get_event` com `event_uuid` → o link Zoom vem no campo `location`; o horário em Brasília vem em `start_time_brt`.
3. Ir ao Passo 6.

**SE `success: false` e `method: "prefill_url"`:**
- A API falhou (campo `reason` traz o erro — tipicamente location/scope; ver E6). Guardar `prefill_url` e ir ao Passo 5.

### 5. Fallback via Playwright

O `prefill_url` já carrega os dados do convidado nos params da URL: `name` (nome), `email`, `a1` (WhatsApp), `a2` (empresa), `a3` (observações). O slot precisa ser selecionado navegando no calendário.

SE as tools `mcp__playwright__*` não existirem na sessão → ir direto pro recovery E1.

**Como usar snapshot + refs (vale para todos os cliques deste passo — leia antes de 5b):**
- `mcp__playwright__browser_snapshot()` devolve uma árvore de acessibilidade em texto. Cada elemento interativo aparece numa linha com um papel, o texto visível e um **ref** entre colchetes, no formato `[ref=eXX]`. Exemplo de linha do snapshot: `button "Quinta-feira, 3 de julho" [ref=e42]` — aqui o ref é `e42`.
- Para clicar, `mcp__playwright__browser_click` exige o parâmetro **`target`** = esse ref exato (ex.: `target: "e42"`); o parâmetro `element` é só uma descrição legível (ex.: `element: "dia 3 de julho"`) usada para o log de permissão. SEMPRE passar `target` com o ref lido do snapshot — NÃO inventar seletor.
- Para achar o ref certo: no texto do snapshot, procurar a linha cujo texto visível casa com o rótulo que você quer clicar (dia, hora, botão). O rótulo exato pode variar (pt-BR ou en, "3 de julho" ou "July 3", "13:00" ou "1:00pm"). NÃO assumir um rótulo fixo — LER o snapshot e casar pelo dia/hora/função, não pela string literal exemplificada aqui.
- SE nenhuma linha do snapshot casar com o dia/hora/botão esperado (o elemento não existe no DOM) → tirar novo snapshot após pequena espera (`browser_wait_for` `time: 2`); se ainda não aparecer, seguir para o recovery E2 (bloqueio/estado inesperado). NÃO chutar um ref.

#### 5a. Abrir o Calendly no browser

```
mcp__playwright__browser_navigate(url: prefill_url)
```

Aguardar o calendário carregar (`mcp__playwright__browser_wait_for`, ex.: `time: 3`) e tirar `mcp__playwright__browser_snapshot()` para ver o estado atual.

#### 5b. Navegar até a data correta

O calendário mostra o mês atual. SE o slot escolhido for em outro mês → no snapshot, achar o botão de avançar mês (papel `button`, rótulo tipo "próximo mês"/"Go to next month"/">") e clicar nele com seu ref antes de continuar. Tirar novo snapshot depois.

Achar no snapshot a linha do dia do slot escolhido (casar pelo número do dia e mês; o dia disponível costuma vir como `button`) e clicar:
```
mcp__playwright__browser_click(target: "<ref do dia, ex. e42>", element: "dia <D> de <mês>")
```

#### 5c. Clicar no horário

Após clicar na data, os horários aparecem ao lado ou abaixo. Tirar novo snapshot. Achar a linha do horário do slot escolhido — casar pela hora em BRT do `start_time_brt` do Passo 3 (o rótulo no DOM pode estar como `HH:MM` 24h ou como `h:MMam/pm`; converter mentalmente para casar) — e clicar:
```
mcp__playwright__browser_click(target: "<ref do horário>", element: "<HH:MM>")
```

#### 5d. Avançar para o formulário

Tirar snapshot. SE houver um botão "Próximo"/"Next" → achar seu ref e clicar:
```
mcp__playwright__browser_click(target: "<ref do botão Próximo>", element: "Próximo")
```

#### 5e. Verificar e preencher o formulário

Tirar snapshot. Os campos nome e e-mail já devem estar preenchidos via URL params.

- SE algum campo obrigatório estiver vazio → preencher via `mcp__playwright__browser_fill_form`. O parâmetro é `fields`, uma lista onde cada item tem: `target` (ref do campo lido do snapshot), `name` (rótulo legível do campo), `type: "textbox"` e `value`. Exemplo de um item:
  ```
  { target: "<ref do campo>", name: "WhatsApp", type: "textbox", value: "5511987650000" }
  ```
  Campos do formulário do Calendly: Nome, E-mail, "WhatsApp", "Nome da Empresa". Casar cada campo pelo rótulo no snapshot; usar os valores do Passo 1.
- SE o campo de telefone mostrar bandeira/código US (+1) em vez de Brasil (+55) → aplicar o recovery E4 ANTES de submeter.

#### 5f. Confirmar o agendamento

Tirar snapshot ANTES de submeter e conferir que todos os campos estão corretos. Achar no snapshot o botão de confirmação (rótulo "Confirmar Evento" ou "Schedule Event") e clicar com seu ref:
```
mcp__playwright__browser_click(target: "<ref do botão de confirmação>", element: "Confirmar Evento")
```

#### 5g. Verificar resultado

Tirar `mcp__playwright__browser_take_screenshot()` e `mcp__playwright__browser_snapshot()` da página de confirmação.

- SE a página confirma o agendamento → extrair horário e link Zoom da página e ir ao Passo 6.
- SE aparecer CAPTCHA ou "Esta reserva não pode ser concluída" → recovery E2.

**Nota técnica (desfazer agendamento feito pelo fallback):** o fluxo browser NÃO retorna o `event_uuid` que `mcp__calendly__calendly_cancel` exige. A URL da página de confirmação contém o `invitee_uuid` (trecho `/invitees/<uuid>` ou parâmetro na URL) — guardar essa URL no report. Para cancelar um agendamento feito pelo fallback, usar a página pública `https://calendly.com/cancellations/<invitee_uuid>` no browser (botão de confirmar cancelamento), não o MCP.

### 6. Registrar no Pipedrive

1. Chamar `mcp__pipedrive__search_deals` com `term` = nome do lead. SE a resposta vier com 0 resultados → repetir a chamada UMA vez com `term` = nome da empresa.
2. **Selecionar o deal** entre os resultados. Cada resultado de `search_deals` tem os campos `id`, `titulo`, `valor`, `status`, `etapa`, `pipeline`, `contato`, `empresa`. **Primeiro, descartar falso-positivo:** a busca do Pipedrive é fuzzy e pode devolver deals sem relação com o termo — só considerar resultado cujo `contato`, `empresa` OU `titulo` contenha o nome buscado (comparação sem caixa/acentos). Depois, considerar "deal aberto" todo resultado restante cujo `status` seja `open` (ignorar os com `status` `won` ou `lost`). Então:
   - **0 deals abertos** → seguir para o item 5 (não registrar nada).
   - **Exatamente 1 deal aberto** → é esse; seguir para o item 3.
   - **2+ deals abertos** → NÃO adivinhar: apresentar ao Eric a lista dos deals abertos (`titulo` + `id` + `pipeline`/`etapa` de cada) e perguntar em qual registrar a nota; aguardar a resposta. SE o Eric não responder / o fluxo for não-interativo → registrar no PRIMEIRO deal aberto da lista retornada (a busca já vem ordenada por relevância do Pipedrive; `search_deals` não expõe data de criação para desempate) e mencionar no report final que havia mais de um deal aberto, para o Eric revisar.
3. **No deal selecionado**, criar nota com `mcp__pipedrive__create_note` passando `deal_id` = id do deal e `content` = o texto abaixo:

```
Diagnóstico agendado via Calendly para {data} às {hora} (Brasília).
Link Zoom: {link_zoom}
Origem do agendamento: {como o horário foi definido — ex.: lead escolheu na conversa de WhatsApp}
```

4. **NÃO criar atividade** — a integração nativa Calendly→Pipedrive cria automaticamente no deal: (1) atividade "Demonstração" com o link Zoom oficial, (2) "Confirmação de agendamento" pro SDR, (3) "Ligação de Confirmação" pro Eric 12-24h antes. Criar manual vira duplicata. (Exceção: recovery E3.)
5. **SE não há deal aberto** (item 2, caso 0) → não registrar nada; mencionar no report final que não há deal.
6. SE `create_note` retornar `This tool has been disabled in your connector settings.` → refazer via `mcp__pipedrive__pipedrive_write({ action: "create_note", params: { deal_id: <id>, content: "<texto acima>" } })` (mesma lógica, nome neutro).

### 7. Reportar ao usuário

```
Reunião agendada no Calendly:
- Convidado: {nome} ({email})
- Evento: {tipo de evento}
- Horário: {DD/MM/AAAA} às {HH:MM} (Brasília)
- Link Zoom: {link_zoom}
- Método: {API direta | Playwright}
- Pipedrive: {nota registrada no deal {id} + atividades criadas pela integração nativa | sem deal encontrado — nada registrado}
```

## Validação final (checklist)

- [ ] Slot agendado veio de `calendly_list_available_slots` (não inventado)
- [ ] Horário do lead → Eric confirmou antes de agendar
- [ ] Horário reportado em Brasília (BRT)
- [ ] Link Zoom incluído no report (ou ausência justificada)
- [ ] Nota registrada no deal, se deal existe
- [ ] NENHUMA atividade Pipedrive criada manualmente (salvo E3)
- [ ] Report final segue o template do Passo 7

## Erros comuns e recovery

- **E1 — API falhou e Playwright indisponível:** entregar o `prefill_url` ao Eric (todos os campos já preenchidos — 1 clique pra confirmar) e sugerir como alternativa a skill `calendly-link` (lead escolhe o próprio horário).
- **E2 — CAPTCHA ou "Esta reserva não pode ser concluída" no Playwright:** reportar o bloqueio ao usuário; oferecer o `prefill_url` pro Eric abrir manualmente (1 clique); sugerir alternativa `calendly-link`.
- **E3 — Integração nativa não criou as atividades no deal.** Quando verificar: a integração nativa Calendly→Pipedrive não é instantânea (pode levar de segundos a alguns minutos). Por isso NÃO checar logo após agendar — checar só (a) quando o Eric reportar que as atividades não apareceram, OU (b) numa checagem programada ≥ 10 minutos após o agendamento. Como checar: `mcp__pipedrive__list_deal_activities` no deal. A resposta é uma lista de atividades; em cada item, olhar o campo do tipo (`type`, que para a Demonstração vem como `diagnostico` — o nome interno do tipo cujo rótulo visível é "Demonstração") ou, se o `type` não estiver claro, o `subject` (que da integração nativa vem como "Demonstração ..."). Para casar a data: pegar o campo de data da atividade (`due_date`, retornado como `YYYY-MM-DD`) e comparar com a data do slot em Brasília também no formato `YYYY-MM-DD` (mesmo dia). Considerar "a integração criou" APENAS quando existir uma atividade que casa em tipo (Demonstração/`diagnostico`) E na data (`due_date` == data do slot em `YYYY-MM-DD`). **SE a resposta não permitir essa certeza** (campo de tipo/data ausente, ambíguo ou em formato inesperado) → tratar como "não criou" e seguir o recovery abaixo (mais seguro do que assumir que criou e deixar o deal sem atividade). Se, ≥ 10 min depois do agendamento, NÃO houver atividade do tipo Demonstração com a data do slot → considerar que a integração falhou e criar manualmente com `mcp__pipedrive__create_activity`: `type: "diagnostico"` (nome visível: Demonstração), `subject: "Diagnóstico agendado — {Nome} | {Empresa}"`, `deal_id` = id do deal, `due_date` = data do slot em Brasília (`YYYY-MM-DD`), `due_time` = hora do slot em Brasília (`HH:MM`, 24h), e uma nota com link Zoom + origem do agendamento. NUNCA passar `due_time` vazio ou `"00:00"` (Pipedrive marca como vencida — se por algum motivo não houver hora, omitir `due_time`).
- **E4 — Campo phone do formulário assume +1 (US) em vez de +55:** depois de preencher o telefone no Playwright e ANTES de submeter (Passo 5e), rodar `mcp__playwright__browser_evaluate` com o `function` abaixo. Ele força o país do intl-tel-input para Brasil E atualiza o valor do input pelo setter nativo (o "hack do nativeSetter"), disparando os eventos que o React escuta para não descartar o valor:

  ```js
  () => {
    // 1) localizar o input de telefone (intl-tel-input)
    const tel = document.querySelector('input[type="tel"]');
    if (!tel) return { ok: false, reason: 'input tel não encontrado' };

    // 2) forçar país = Brasil no widget intl-tel-input
    try {
      window.intlTelInputGlobals.getInstance(tel).setCountry('br');
    } catch (e) { /* segue mesmo se a API global mudar de nome */ }

    // 3) hack do nativeSetter: setar o value pelo setter nativo do prototype
    //    e disparar 'input' para o React reconhecer a mudança (senão ele reverte)
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(tel, '+5511987650000'); // trocar pelo telefone real, formato +55DDDNÚMERO
    tel.dispatchEvent(new Event('input', { bubbles: true }));
    tel.dispatchEvent(new Event('change', { bubbles: true }));

    return { ok: true, value: tel.value };
  }
  ```

  Trocar `+5511987650000` pelo telefone real do convidado no formato `+55DDDNÚMERO`. Depois de rodar, tirar novo snapshot e confirmar que o campo mostra a bandeira/código do Brasil antes de submeter.
- **E5 — E-mail descartável bloqueado na submissão:** pedir e-mail real ao usuário e reexecutar a partir do Passo 4.
- **E6 — Erro da API citando scope/`users:read`:** caso conhecido e esperado — o PAT atual do Calendly NÃO tem o escopo `users:read`, necessário pro booking direto (`POST /invitees`). Isso NÃO é bug: quando `calendly_schedule` volta com `success: false` e `reason` mencionando scope/`users:read`, seguir normalmente pro fallback Playwright (Passo 5). Não é preciso abrir nenhum arquivo — a decisão é só "ignorar o erro e ir pro Passo 5". (Contexto, não acionável na skill: o motivo está documentado no item `Calendly` do manifest de tokens; regenerar o PAT com `users:read` habilitaria o booking direto e dispensaria o fallback.)
- **E7 — Erro 401/403 em qualquer tool do Calendly:** token `CALENDLY_TOKEN` ausente/vencido no processo do MCP. Reportar ao Eric que precisa rotacionar no 1Password (item `Calendly`) e rodar o setup-secrets; parar.

## Notas técnicas (teste 28/05/2026)

- **Playwright funciona sem reCAPTCHA** — o Calendly não bloqueou o Playwright MCP; agendamento via browser automatizado é viável.
- **Phone no URL param** acaba com `+55` (ex.: `+5511987650000`) porque o MCP normaliza via `normalizeBrPhone()`. O agente NÃO precisa mandar o `+`: passa `invitee_phone` como `55DDDNÚMERO` (ex.: `5511987650000`) e o MCP adiciona o `+55`. (Só no recovery E4, que roda JS direto no DOM sem passar pelo MCP, o valor precisa ir com o `+` — ver o snippet do E4.)

## Exemplo (fluxo feliz via API)

Pedido: "agenda o diagnóstico do João Silva (joao@empresa.com.br, 5511987650000, Empresa XYZ) na quinta às 10h".

1. Dados completos no pedido (fonte de maior prioridade = texto do Eric) → sem perguntas.
2. `calendly_list_event_types` → é lead de diagnóstico e o Eric não nomeou o tipo → aplicar o critério do padrão (Passo 2, regra 2): achar o item cujo `name` == `Diagnóstico de IA e Automação` (match a) → guardar o `uri` desse item como `event_type_uri`.
3. `calendly_list_available_slots(event_type_uri, hoje, hoje+7)` → na lista `slots` existe um com `start_time_brt` = quinta 10:00. Horário veio do lead → confirmar com Eric incluindo o tipo: "Slot disponível quinta 10h (Brasília), evento Diagnóstico de IA e Automação. Confirma o agendamento do João?" Eric confirma. Guardar o `start_time_utc` desse slot como veio (string `...Z`).
4. `calendly_schedule(event_type_uri, slot_start_iso = start_time_utc, invitee_name, invitee_email, invitee_phone, invitee_company)` → `success: true, method: "direct_api"` → extrair `event_uri` → `event_uuid` = último segmento → `calendly_get_event(event_uuid)` → link Zoom em `location`, horário em `start_time_brt`.
5. (pulado — API funcionou)
6. `search_deals("João Silva")` → 1 resultado com `status: "open"` (deal #123) → `create_note(deal_id: 123, content: <template>)`. Nenhuma atividade criada.
7. Report no template do Passo 7.
