---
name: agendar-call
description: Agenda reunião direto pelo Meeting Hub (agendador nativo da Expert), que cria sala Zoom, negócio/atividade no Pipedrive, lembretes de WhatsApp e e-mail de confirmação numa chamada só. TRIGGER quando o Eric pedir "agenda a call", "marca reunião com o lead", "agenda o diagnóstico de [nome]", "marca no Meeting Hub", "agenda pra terça 10h", ou quando um lead aceitar um horário na conversa. NÃO usar pra mandar link e deixar o lead escolher sozinho (isso é o link público do próprio tipo de evento). NÃO usar pra compromisso interno sem lead (usar Outlook). NÃO usar pro Calendly — o Meeting Hub substituiu.
allowed-tools: mcp__hub-agenda__listar_tipos_de_evento, mcp__hub-agenda__listar_horarios, mcp__hub-agenda__agendar_reuniao, mcp__hub-agenda__buscar_reservas, mcp__hub-agenda__remarcar_reuniao, mcp__hub-agenda__cancelar_reuniao, mcp__outlook-mcp__listar_compromissos, mcp__pipedrive__search_persons, mcp__pipedrive__get_deal_summary, mcp__pipedrive__list_deal_activities, mcp__pipedrive__create_note, mcp__whatsapp-agent__check_message, mcp__whatsapp-agent__send
---

# Meeting Hub — Agendar Call

Agendamento de ponta a ponta pelo agendador nativo. Uma chamada de `agendar_reuniao` cria a sala Zoom, o registro no Pipedrive, os lembretes automáticos de WhatsApp e o e-mail de confirmação com `.ics`.

**Por que esta skill existe separada da antiga do Calendly:** o Calendly não deixava agendar por API (só gerar link, e o resto era Playwright clicando na tela). O Meeting Hub agenda de verdade por API. Isso muda o fluxo inteiro — some o fallback de browser, e passam a existir anfitrião, slug ambíguo e tipo de data fixa, que o Calendly não tinha.

## NUNCA

- NUNCA inventar horário. Todo `start_iso` DEVE vir literal de `listar_horarios`. Slot montado na mão é rejeitado ou cai no horário errado.
- NUNCA agendar sem o OK do Eric. Marcar reunião na agenda de outra pessoa é side-effect externo irreversível na prática (o convidado já recebe confirmação).
- NUNCA confiar só no `listar_horarios` pra dizer que o horário está livre — ver Passo 4. Compromisso marcado como **Livre** no Outlook não bloqueia o agendador, e o Eric usa "Livre" de propósito nos blocos `[RESERVA]`.
- NUNCA agendar num tipo de evento com `data_fixa` preenchida. Esses são webinário/aula com capacidade de 150-300 pessoas, não call 1:1.
- NUNCA passar `tipo_evento` sem `anfitriao` quando o slug existir para mais de uma pessoa (ver Passo 2). Sem isso a reunião cai na agenda de outro.
- NUNCA criar atividade no Pipedrive manualmente depois de agendar — o Hub já cria. Criar de novo vira duplicata (mesma armadilha da integração nativa do Calendly).
- NUNCA exibir horário em UTC pro Eric. O `listar_horarios` já devolve `label` em Brasília — usar esse campo.
- NUNCA usar as skills `calendly-agendar` / `calendly-link` junto com esta. Escolher um agendador por conversa, senão o mesmo lead recebe dois convites.

## SEMPRE

- SEMPRE reler depois de agendar (`buscar_reservas`) — `ok: true` não é prova, é intenção.
- SEMPRE telefone com DDI 55, só dígitos (`55DDDNÚMERO`).
- SEMPRE acentuação correta do português em qualquer texto que chega no convidado.
- SEMPRE reportar ao Eric com horário em Brasília, anfitrião, link do Zoom e o que foi criado no Pipedrive.

## Pré-requisitos

- **MCP `hub-agenda`** ativo. SE as tools `mcp__hub-agenda__*` não existirem → reportar "MCP do Meeting Hub não configurado nesta máquina" e parar.
- **MCP `outlook-mcp`** — necessário pro Passo 4. SE não existir → não pular o passo: apresentar o slot ao Eric marcado como **não conferido contra a agenda** e deixar ele decidir.
- **MCP `pipedrive`** — necessário só pro Passo 8 (conferência). SE não existir → pular e avisar no report.

## Passos

### 1. Dados do convidado

| Campo | Hoje | Observação |
|---|---|---|
| Nome completo | obrigatório | |
| E-mail | **obrigatório** | ver a regra abaixo |
| Telefone (WhatsApp) | obrigatório | `55DDDNÚMERO`, só dígitos |
| Nome da Empresa | obrigatório no `diagnostico` | vem em `perguntas` do `listar_horarios` |
| Observações | opcional | contexto, dor, origem |

**A regra do e-mail, e o que fazer quando não tem:**

Hoje `agendar_reuniao` **exige e-mail**. Isso trava com frequência — em 06/08/2026, 4 dos 6 negócios abertos do Eric no Educacional não tinham e-mail cadastrado.

Quando faltar e-mail, nesta ordem:

1. Procurar no Pipedrive (`search_persons` pelo telefone) — muitas vezes está lá e não no card do deal.
2. Se não achar, **pedir o e-mail ao lead na mesma mensagem em que confirma o horário**. Não inventar, não usar domínio descartável, não usar e-mail do Eric.
3. Só parar e reportar ao Eric se o lead não responder.

> **Mudança contratada (card Brain `8e8p2pp7dn73`):** o obrigatório vai passar a ser **um canal de confirmação, e-mail OU telefone**. Quando isso subir, o passo 2 acima deixa de ser necessário e o WhatsApp assume o papel do e-mail (confirmação com data, hora, link do Zoom e link de cancelar). Enquanto o `agendar_reuniao` recusar chamada sem `email`, a regra acima continua valendo. Conferir o schema da tool antes de assumir que já mudou.

**Fontes válidas pra preencher sem perguntar**, em ordem — a de cima ganha em caso de conflito:

1. O pedido atual do Eric (incluindo dados entre parênteses).
2. Mensagens anteriores desta mesma conversa.
3. Deal do Pipedrive ou conversa de WhatsApp já lidos nesta sessão.

Conflito entre fontes: usar a de maior prioridade e **mencionar o conflito no report**, sem travar o fluxo.

### 2. Tipo de evento e anfitrião

`listar_tipos_de_evento`. Cada item traz `slug`, `titulo`, `duracao_minutos`, `anfitriao`, `capacidade`, `gravacao_automatica`, `data_fixa`.

**Três armadilhas:**

- **Slug repetido entre anfitriões.** `entrega-tecnica`, `kickoff`, `reuniao-geral-30-cs` e `reuniao-geral-60-cs` existem para mais de uma pessoa. Slug repetido = passar `anfitriao` obrigatoriamente, em `listar_horarios` E em `agendar_reuniao`.
- **`data_fixa` preenchida** = webinário/aula, não call. Nunca agendar lead aí.
- **`gravacao_automatica: true`** = a call vai ser gravada na nuvem por padrão. Se for conversa sensível, usar `gravar_zoom: false` na chamada — e avisar o Eric do que escolheu.

Padrão pra lead comercial do Eric: **`diagnostico`** (Diagnóstico de IA e Automação, 60 min, anfitrião `contato@expertintegrado.com.br`).

> Pra lead que já viu o pitch, "diagnóstico" pode soar como voltar à estaca zero. O tipo de evento continua sendo o `diagnostico`; quem resolve isso é o TEXTO da mensagem, que fala em "conversa" e não em "diagnóstico". Não criar tipo novo por conta própria.

### 3. Horários

`listar_horarios({ tipo_evento, anfitriao, dias })`. Devolve `start_iso` (UTC) e `label` (Brasília), mais as `perguntas` obrigatórias do formulário daquele tipo.

Guardar o `start_iso` **exato**. O `label` é só pra apresentar.

### 4. Conferir a agenda real do anfitrião — passo que não se pula

**O agendador não enxerga compromisso marcado como "Livre" no Outlook.** Isso corta dos dois lados:

- Bom: os blocos `[RESERVA] Calls Comerciais` do Eric são "Livre" de propósito, então o lead consegue marcar dentro deles.
- Ruim: compromisso real que também está como "Livre" continua sendo oferecido como vago.

Caso real de 06/08/2026: o agendador oferecia terça 09h-11h (`[RESERVA] Apuração financeiro`, com o Jair) e quarta 09h-10h30 (`Alinhamento das Weeklies do Educacional`, com o Asafe). Os dois têm participante. Um lead marcando ali derrubaria reunião interna.

Então: `mcp__outlook-mcp__listar_compromissos` no intervalo dos slots candidatos e cruzar. Regra de leitura:

| O que tem no horário | Decisão |
|---|---|
| Nada | slot limpo |
| Bloco `[RESERVA]` de call, sem participante | slot limpo — é exatamente onde a call deve entrar |
| Qualquer compromisso **com participante**, mesmo "Livre" | **não oferecer** |
| Compromisso "Ocupado" | o agendador já filtrou; se aparecer, tratar como conflito e investigar |

Conferir também se a call de 60 min **termina** antes do próximo compromisso, não só se começa livre.

### 5. Apresentar ao Eric e esperar o OK

Mostrar: convidado, tipo de evento, anfitrião, duração, 2 ou 3 slots em Brasília, e se vai gravar. Dizer explicitamente que os slots foram conferidos contra a agenda (ou que não foram, se o Outlook não estava disponível).

Esperar OK textual. **Sem OK, não agenda.**

### 6. Agendar

```
mcp__hub-agenda__agendar_reuniao({
  tipo_evento, anfitriao, start_iso,     // start_iso literal do Passo 3
  nome, email, telefone,
  respostas: [{ pergunta: "Nome da Empresa", resposta: "..." }],
  gravar_zoom: <só se for divergir do default do tipo>
})
```

Uma chamada faz tudo: sala Zoom, registro no Pipedrive, lembretes de WhatsApp e e-mail de confirmação com `.ics`.

### 7. Reler — obrigatório

`buscar_reservas({ telefone })` (ou por e-mail). Confirmar que existe reserva futura, no horário certo, com o anfitrião certo. Só depois disso a reunião pode ser reportada como marcada.

### 8. Conferir o lado do Pipedrive, sem escrever

O Hub cria negócio/atividade sozinho. **Não criar nada por cima.** Conferir:

- SE o lead **já tinha** deal aberto → conferir se o Hub anexou a atividade ao deal existente ou **abriu um deal novo**. Se abriu duplicado, **não mesclar por conta própria** — reportar ao Eric com os dois ids.
- SE não tinha deal → conferir que o novo nasceu com pessoa e telefone certos.
- Nota no deal só se houver contexto que o Hub não capturou (o que a conversa mostrou, a dor, a objeção). Nota é registro, não duplicata de atividade.

> Risco conhecido e ainda não medido: criação de pessoa duplicada quando o cadastro é feito por telefone. Em 06/08/2026 foram mesclados 196 cadastros duplicados no Pipedrive por criação sem casamento prévio. Se o report mostrar pessoa nova pra alguém que já existia, avisar o Eric.

### 9. Avisar o convidado

O e-mail de confirmação sai automático, mas ele costuma não ser lido a tempo. Mandar UMA mensagem curta de WhatsApp confirmando dia, hora e que o link vai por e-mail.

Passar por `check_message` antes de enviar. Sem hype, sem repetir o que já foi combinado.

### 10. Report

```
Call marcada.

Convidado: <nome> — <empresa>
Quando: <dia da semana>, <dd/mm> às <HH:MM> (Brasília)
Tipo: <título> (<duração> min) · Anfitrião: <nome>
Zoom: <link>
Gravação: <sim/não>

Agenda conferida: <sim, cruzada com o Outlook / não, MCP indisponível>
Pipedrive: <deal <id> — atividade anexada / deal novo <id> criado>
WhatsApp de confirmação: <enviado / não>

<conflitos de dado, duplicata suspeita, ou qualquer coisa que precise do Eric>
```

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---|---|---|
| `agendar_reuniao` recusa por falta de e-mail | e-mail ainda é obrigatório | Passo 1: buscar no Pipedrive, senão pedir ao lead junto com a confirmação do horário |
| Reunião caiu na agenda de outra pessoa | slug repetido entre anfitriões, sem `anfitriao` | `cancelar_reuniao`, e refazer passando `anfitriao`. Avisar o dono da agenda |
| Slot recusado | `start_iso` montado na mão ou já ocupado | Reler `listar_horarios` e usar o valor literal |
| Lead marcou em cima de reunião interna | Passo 4 pulado, compromisso estava "Livre" | Remarcar com o lead, pedindo desculpa pelo transtorno. Não culpar o sistema na mensagem |
| Deal duplicado no Pipedrive | Hub abriu negócio novo pra quem já tinha | NÃO mesclar sozinho. Reportar os dois ids ao Eric |
| Sem horário na semana pedida | agenda cheia ou semana bloqueada | Mostrar a próxima janela real que o `listar_horarios` devolveu, não inventar disponibilidade |

## O que esta skill NÃO faz

- Não redige a mensagem de prospecção nem o follow-up — isso é `fup-inteligente` ou `prospecta-lead`. Aqui só sai a confirmação do horário.
- Não decide se o lead merece call. Quem prioriza é o Eric.
- Não mexe em agenda interna sem lead — isso é Outlook direto.

---

*Skill v1.0 — criada em 06/08/2026.*

**Changelog:**
- v1.0 (06/08/2026): nasce da decisão do Eric de migrar do Calendly pro Meeting Hub, porque o Hub agenda por API e o Calendly não agendava (só gerava link, e o resto era Playwright clicando na tela). Some o fallback de browser e entram três coisas que o Calendly não tinha: anfitrião, slug repetido entre anfitriões e tipo com data fixa. Passo 4 (conferir Outlook) nasce de um achado do mesmo dia: compromisso marcado como "Livre" não bloqueia o agendador, e o agendador estava oferecendo dois horários com reunião interna marcada. A regra do e-mail está amarrada ao card Brain `8e8p2pp7dn73`, que vai trocar o obrigatório de "e-mail" para "um canal de confirmação".
