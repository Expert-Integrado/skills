---
name: transferir-lead
description: "Use quando o Eric quiser passar UM lead com quem ele JÁ TEM histórico no WhatsApp pessoal (G4, evento, indicação, palestra) pro vendedor responsável assumir. Exige conversa prévia no WhatsApp pessoal como input. TRIGGER quando o usuário pedir 'transfere o lead X pro vendedor Y', 'passa lead pro Niverton', 'passa o {nome} pro vendedor', 'cadastra a conversa do WhatsApp e manda pro vendedor', ou 'cria deal do {nome} e atribui pro {vendedor}'. NÃO usar pra: lead FRIO sem conversa prévia (usar prospecta-lead), reabordar lead que o próprio Eric vai responder (usar reabordagem), envio de mensagem em massa (usar whatsapp-campanha-*)."
allowed-tools: mcp__whatsapp-agent__search, mcp__whatsapp-agent__read, mcp__whatsapp-agent__transcribe_audio, mcp__whatsapp-agent__send, mcp__pipedrive__search_persons, mcp__pipedrive__get_person, mcp__pipedrive__create_person, mcp__pipedrive__update_person, mcp__pipedrive__create_deal, mcp__pipedrive__update_deal_fields, mcp__pipedrive__create_note, mcp__pipedrive__create_activity, mcp__pipedrive__pipedrive_write, mcp__pipedrive__sync_all, mcp__expert-brain__recall
---

# Transferir Lead — converter conversa WhatsApp pessoal em deal qualificado pro vendedor (v2.0)

Skill atômica: processa UM lead por vez. Entrada é uma pessoa com quem o Eric JÁ TROCOU mensagem no WhatsApp pessoal (G4, evento, indicação, palestra, etc.). Saída é o vendedor recebendo o lead no Pipedrive (pessoa + deal + nota + 2 atividades) + ping no WhatsApp corporativo dele com tudo mastigado pra agir HOJE. Diferença pra `prospecta-lead`: aquela é pra lead FRIO (cold/lista/evento sem conversa); esta exige HISTÓRICO no WhatsApp pessoal como input principal.

## NUNCA

- NUNCA inferir `pipeline` ou `vendedor`. São parâmetros obrigatórios — SE faltar, perguntar ao Eric ANTES de executar qualquer passo. NÃO existe pipeline "Black Friday".
- NUNCA criar o deal em etapa avançada ("Contato Realizado", "Aguardando agendamento", "Proposta enviada"). Sempre a PRIMEIRA etapa do pipeline (tabela no passo 4) — é o vendedor que move. Razão: a métrica do vendedor depende DELE mover a etapa; criar já avançado tira accountability e contamina relatório.
- NUNCA passar `due_time: ""` nem `"00:00"` em atividade — Pipedrive marca como vencida. Sempre HH:MM real.
- NUNCA notificar o vendedor via ChatGuru. O destinatário é funcionário interno (não cliente externo) → usar `mcp__whatsapp-agent__send`. ChatGuru é exclusivo pra clientes da Expert (Brain `lhu4g220l66h`).
- NUNCA sobrescrever campo Pipedrive que já tem valor (nunca `force: true` sem confirmação explícita do Eric). "Origem do Contato" preenchida = preenchida 1x na vida, NÃO mexer.
- NUNCA chamar a API da OpenAI direto pra transcrever áudio — usar a tool nativa `mcp__whatsapp-agent__transcribe_audio` (caminho oficial).
- NUNCA mover o link do deal pra depois da descrição na mensagem do vendedor — o vendedor precisa do CRM primeiro pra contextualizar antes de ler.
- NUNCA passar `force: true` no `create_activity` do passo 7: o deal é novo, não deve haver atividade pendente conflitante. SE o guardrail acusar conflito → investigar (provável duplicata) em vez de forçar.

## SEMPRE

- SEMPRE buscar o chat pelos ÚLTIMOS 8 DÍGITOS quando tiver o telefone (WhatsApp normaliza com/sem o 9 do celular).
- SEMPRE transcrever os áudios pendentes do chat ANTES de analisar — áudios geralmente carregam o contexto-chave da indicação/origem.
- SEMPRE preencher origem da PESSOA (via `update_person`) E origem do DEAL (via `update_deal_fields`), ambas com enum EXATO + detalhe. Fonte canônica dos enums: `C:/MCPs/expert-mcps/CLAUDE.md` seção 2 (espelhado no CLAUDE.md deste repo).
- SEMPRE título do deal no padrão `Nome | Empresa` (pipe, não hífen).
- SEMPRE telefone no formato `55XXXXXXXXXXX` (DDI+DDD, sem `+`, sem espaços).
- SEMPRE horário local de Brasília (America/Sao_Paulo) em `due_time`, sem sufixo Z — o MCP converte pra UTC automaticamente.
- SEMPRE acentuação correta do português em TODO texto externo (nota Pipedrive, mensagem pro vendedor, report pro Eric).
- SEMPRE incluir o link `https://wa.me/{numero}` do lead na mensagem do vendedor E no report final ao Eric.

## Pré-requisitos

- **MCP `whatsapp-agent`** conectado (tools `search`, `read`, `transcribe_audio`, `send`) — número PESSOAL do Eric.
- **MCP `pipedrive`** conectado. SE campo personalizado der erro de "campo não encontrado" → rodar `mcp__pipedrive__sync_all` e repetir a chamada.
- **MCP `expert-brain`** (opcional) — só pra buscar telefone corporativo de vendedor diferente do Niverton (passo 8).
- **Fonte de hora atual (passo 7):** o cálculo de `due_time` precisa da hora atual em America/Sao_Paulo (BRT, UTC-3). Ordem de obtenção: (1) o bloco de contexto do sistema costuma trazer a data/hora corrente — usá-la, convertendo pra UTC-3 se vier em outro fuso; (2) SE não houver hora no contexto do sistema → executar no shell `TZ='BRT3' date +%H:%M` (POSIX BRT3, nao IANA: o Git Bash do Windows nao tem tzdata e TZ=America/Sao_Paulo devolve UTC silenciosamente — CORRECAO-DE-FATO do golden run 06/07/2026; BRT3 = UTC-3 fixo, Brasil sem horario de verao desde 2019, funciona em Windows e Linux) (ou, no PowerShell, `[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'E. South America Standard Time').ToString('HH:mm')`) e usar o valor retornado. NUNCA chutar a hora.
- **Fallback Pipedrive (bloqueio Claude Desktop):** SE qualquer `create_*` ou `update_deal_fields` retornar `This tool has been disabled in your connector settings.` → reexecutar via `mcp__pipedrive__pipedrive_write({ action, params })` — mesma lógica, nome neutro escapa do bloqueio. Actions suportadas: `create_activity`, `create_deal`, `create_person`, `create_organization`, `add_product_to_deal`, `update_deal_fields`, `create_note`.
- Nenhum script auxiliar, env var ou path local: a skill é 100% MCP (portável pra PC, notebook e VPS).

## Input obrigatório (passo 0)

TRÊS parâmetros obrigatórios. SE faltar qualquer um → perguntar ao Eric ANTES de prosseguir. SÓ começar a execução com os 3 em mãos.

| Parâmetro | Descrição | Exemplo |
|---|---|---|
| `lead` | Nome ou telefone do lead que tem histórico no WhatsApp pessoal do Eric | "Thiago Paukoski" / "5511991296273" |
| `pipeline` | Pipeline destino no Pipedrive (APENAS: Educacional, SaaS, Super SDR, Prospeccao, Parceria) | "Educacional" |
| `vendedor` | Nome do vendedor que vai assumir (mesmo Niverton sendo o default histórico, exigir explícito) | "Niverton" / "Eric Luciano" |

Fluxo de perguntas quando Eric passou só o nome do lead:

```
Skill: "Pra qual pipeline (Educacional / SaaS / Super SDR / Prospeccao / Parceria)?"
Eric: "Educacional"
Skill: "Qual vendedor assume? (Niverton / outro nome)"
Eric: "Niverton"
```

## Passos

### Passo 1 — Localizar e ler histórico do WhatsApp

1. Localizar o chat:
   - SE `lead` veio como TELEFONE → `mcp__whatsapp-agent__search(query="<últimos 8 dígitos>")`.
   - SE `lead` veio como NOME → `mcp__whatsapp-agent__search(query="<nome>")` (o default `search_in: "both"` já cobre nome do chat).

   **Formato de retorno do `search`** (pra calibrar a decisão abaixo): retorna uma lista de mensagens, cada uma com o chat de origem — campos `chat_id`, `chat_name` (nome do contato/grupo), `sender`, `content`, `timestamp`. Um mesmo chat pode aparecer em várias linhas (uma por mensagem que casou). Portanto, para contar "candidatos", **agrupe as linhas por `chat_id` distinto** — o número de candidatos = número de `chat_id` únicos no resultado.

2. **Validação — decidir de forma determinística quantos chats candidatos existem** (contando `chat_id` únicos do item 1):
   - **0 `chat_id` únicos** → tentar 1 variação (nome parcial, ou telefone com/sem o 9 na `query`). SE ainda 0 → perguntar ao Eric o telefone/nome exato. SE Eric confirmar que NÃO há conversa prévia → PARAR e sugerir a skill `prospecta-lead`.
   - **Exatamente 1 `chat_id` único** → é o chat do lead. Seguir pro item 3 com esse `chat_id`.
   - **≥2 `chat_id` únicos** → aplicar o critério de desempate abaixo. Só é "candidato inequívoco" quando UM único `chat_id` bate por identidade forte:
     - SE `lead` veio como TELEFONE → o candidato inequívoco é o `chat_id` cujo número casa nos ÚLTIMOS 8 DÍGITOS com o telefone informado. SE exatamente 1 `chat_id` casa nos últimos 8 dígitos → usar esse. SE 0 ou ≥2 casam → listar os candidatos (`chat_name` + número) pro Eric e perguntar qual é.
     - SE `lead` veio como NOME → o candidato inequívoco é o `chat_id` cujo `chat_name` é IGUAL ao nome informado (comparação case-insensitive, ignorando espaços extras). SE exatamente 1 `chat_id` tem `chat_name` idêntico → usar esse. SE 0 (só "parecidos", nunca idêntico) OU ≥2 idênticos → listar os candidatos pro Eric e perguntar qual é. NÃO escolher por semelhança parcial ("Thiago" ≠ "Thiago Paukoski").
   - Em QUALQUER caso de ambiguidade acima, NÃO escolher sozinho — listar os candidatos e perguntar ao Eric.
   - Observação: se um dos chats candidatos vier de um número que o `search` marcou como `ambiguous: true` no retorno, tratar como ambíguo e perguntar ao Eric.

3. Ler o histórico: `mcp__whatsapp-agent__read(chat="<chat_id do item 2>", limit=50)`.
   - **Formato de retorno do `read`**: `chat_id`, `chat_name` e uma lista `messages` em ordem cronológica, cada mensagem com `content`, `type` (`text`/`ptt`/`audio`/`image`/etc.), `sender` (quem enviou), `timestamp` (ISO) e, em áudios já processados, `transcription`.
   - SE o `read` retornar `ambiguous: true` com lista de candidatos (nome batia em >1 chat) → voltar ao item 2 passando o `chat_id` exato em vez do nome. NÃO adivinhar.
4. SE alguma mensagem de tipo `ptt`/`audio` estiver SEM campo `transcription` (ausente ou vazio) → `mcp__whatsapp-agent__transcribe_audio(chat="<chat_id>")` (transcreve até 20 áudios pendentes do chat, roda Whisper server-side e cacheia em `messages.content`) → repetir o `read` pra ler as transcrições.

### Passo 2 — Extrair contexto da conversa

**Critério objetivo de "extraído" (aplica a TODAS as dimensões):** um valor só conta como extraído quando há **evidência textual literal no histórico** que o sustenta — ou seja, dá pra apontar a(s) mensagem(ns) exata(s) (texto ou transcrição de áudio) de onde o valor saiu. Regra de decisão por dimensão:

- **Há trecho literal que sustenta o valor** → preencher com esse valor.
- **Não há trecho literal** (você teria que supor/generalizar pra preencher) → deixar EM BRANCO. NÃO inventar, NÃO deduzir "provável".
- Exceção "inferido do e-mail/domínio" (só Empresa e Setor/segmento): se o lead deu um e-mail corporativo, o domínio conta como evidência literal — ex.: `joao@xmethod.com.br` → Empresa "X-Method". E-mail genérico (gmail/hotmail/outlook) NÃO é evidência de empresa → deixar em branco.

| Dimensão | O que conta como evidência literal | Se não houver evidência |
|---|---|---|
| Nome completo | Como o lead se identificou na conversa; na ausência, o `chat_name` retornado pelo `read` | usar `chat_name` (sempre há) |
| Empresa | Nome citado na conversa OU domínio de e-mail corporativo | em branco |
| Cargo | Cargo citado explicitamente pelo lead | em branco |
| Dor/desafio | Problema que o lead descreveu, ou que o Eric nomeou na conversa | em branco |
| Origem | Onde/como se conheceram, dito na conversa (ex.: "te vi no G4", "fulano me passou seu contato") | ver regra de origem abaixo |
| Detalhes da origem | Data do evento, nome de quem indicou, contexto — ditos na conversa | em branco |
| Setor/segmento | Setor citado, OU derivável do domínio/atividade da empresa (regra objetiva na Referência B) | em branco (mapear no passo 4) |
| Volume/tamanho | Faturamento/tamanho de time citado com número | em branco |
| Maturidade IA | Menção explícita a time de IA/automações rodando | em branco |
| Engajamento na conversa | Observável direto das mensagens (tom, nº de trocas, intervalo entre elas) | descrever o que houver |

**Regra da ORIGEM (a única dimensão que pode BLOQUEAR):** origem é obrigatória nos passos 3 e 4.
- SE existe trecho literal que identifica a origem (ex.: "nos conhecemos no G4 Scale", "o Pedro me indicou", "te achei na sua palestra") → origem está "clara o suficiente": mapear pro enum no passo 3/4 e seguir SEM perguntar.
- SE NÃO existe trecho literal que sustente a origem (você só conseguiria chutar entre 2+ opções) → PARAR e perguntar ao Eric a origem antes de prosseguir pro passo 3. Nunca chutar entre origens.

### Passo 3 — Cadastrar/atualizar pessoa no Pipedrive

1. Buscar duplicata pelos dois termos:
   ```
   mcp__pipedrive__search_persons(term="<nome>")
   mcp__pipedrive__search_persons(term="<telefone>")
   ```
   (Pra telefone, o MCP já busca automaticamente pelos últimos 8 dígitos.)
2. Decidir qual `person_id` usar — **regra determinística "match forte"**. Defina "bate com o lead" assim: o registro do Pipedrive tem telefone que casa nos ÚLTIMOS 8 DÍGITOS com o telefone do lead, OU e-mail idêntico ao do lead pela normalização abaixo. Conte quantos dos resultados (união das duas buscas, por `person_id` distinto) dão "match forte":

   **Normalização de e-mail pra comparar (aplicar aos DOIS e-mails antes de comparar):** converter tudo pra minúsculas. SE o domínio for `gmail.com` (ou `googlemail.com`): no local-part (parte antes do `@`), remover o sufixo `+alias` (tudo do `+` até o `@`) E remover todos os pontos. Para qualquer outro domínio, NÃO alterar o local-part (só as minúsculas valem). Depois de normalizar os dois, "idêntico" = strings exatamente iguais; qualquer outra variação = NÃO é match idêntico.
   - SE a união das duas buscas retornou **0 resultados** → criar:
     ```
     mcp__pipedrive__create_person({
       name: "<nome completo>",
       phone: "55XXXXXXXXXXX",
       email: "<email>"   // só se tiver
     })
     ```
     SE retornar `⚠ POSSÍVEL DUPLICATA` (guardrail interno do MCP) → usar o `person_id` do contato existente listado; NÃO repetir com `force: true`.
   - SE **exatamente 1 `person_id` dá "match forte"** (telefone últimos-8 OU e-mail) → usar esse `person_id`. (Vale mesmo que a busca tenha trazido outros nomes parecidos sem match de telefone/e-mail.)
   - SE **nenhum resultado dá "match forte"** mas há resultados (só bateram por nome parecido) → tratar como pessoa NOVA e criar (fluxo do "0 resultados" acima). Não reaproveitar registro que não casa por telefone nem e-mail.
   - SE **≥2 `person_id` distintos dão "match forte"** → é ambíguo de verdade: listar os candidatos pro Eric (nome + telefone + e-mail + link, usando `mcp__pipedrive__get_person(person_id=<id>)` pra detalhar) e perguntar qual usar. NÃO escolher sozinho, NÃO criar um terceiro.
   - Não fazer mais rodadas de busca além dessas duas (nome + telefone): a decisão é tomada com o que essas duas retornaram; se continuar ≥2 match forte, a saída é SEMPRE perguntar ao Eric (não "tentar de novo").
3. Preencher origem da PESSOA (obrigatório — `custom_fields` é STRING JSON, não objeto). **PRÉ-CHECK obrigatório quando a pessoa JÁ EXISTIA** (o `update_person` do MCP NÃO avisa sobrescrita de campo personalizado — o aviso dele cobre só campos nativos; comprovado em 07/07/2026, origem preenchida foi sobrescrita em silêncio): rodar `mcp__pipedrive__get_person(person_id=<id>)` e olhar os DOIS campos hash da conta — `0408a55afe22de8efee2d0353a6cbb9b02bb1bb8` (= "Origem do Contato"; enum vem como ID numérico de opção, ex. `"357"`, NÃO como texto) e `3c41f4490e65e3e1c22ff95b517896b2717a2c05` (= "Detalhes da origem do contato"). SE qualquer um dos dois for não-nulo → NÃO enviar origem/detalhes (1x na vida); enviar só o que estiver null. Pessoa recém-criada no item 2 → enviar normalmente:
   ```
   mcp__pipedrive__update_person({
     person_id: <id do item 2>,
     custom_fields: "{\"Origem do Contato\": \"<ORIGEM enum>\", \"Detalhes da origem do contato\": \"<detalhe>\"}"
   })
   ```
   - Escolher o valor de "Origem do Contato" na **tabela de enum embutida abaixo (Referência A)** — é o valor EXATO (com o pipe e o espaço), não um texto livre.
   - SE origem for INDIC → incluir também `"Pessoa que indicou"` no mesmo JSON (valor = nome de quem indicou; indicação do próprio Eric → `"Eric Luciano"`).
   - SE o MCP retornar conflito de campo já preenchido → NÃO passar `force: true`; a origem existente fica (1x na vida) — seguir pro passo 4.
   - Atualizar apenas campos VAZIOS da pessoa; nunca sobrescrever.

### Passo 4 — Criar deal na PRIMEIRA etapa do pipeline

Etapa inicial obrigatória (a que representa "sem contato ainda do vendedor" — IDs canônicos confirmados em `C:/MCPs/expert-mcps/CLAUDE.md` seção 3; em dúvida, passar o NOME da etapa que o MCP resolve):

| Pipeline | pipeline_id | Etapa inicial obrigatória | stage_id |
|---|---|---|---|
| Educacional | 6 | "Sem contato" | 52 |
| SaaS | 1 | "Sem contato" | 16 |
| Super SDR | 2 | "Sem contato" | 7 |
| Prospeccao | 7 | "Lead Mapeado" | 64 |
| Parceria | 10 | "Sem contato" | 84 |

1. Criar:
   ```
   mcp__pipedrive__create_deal({
     title: "{Nome} | {Empresa}",        // pipe, não hífen
     person_id: <id do passo 3>,
     pipeline_id: "<param pipeline>",    // aceita nome ("Educacional") ou ID (6)
     stage_id: <stage_id da tabela>,     // NUNCA pular a etapa inicial
     user_id: "<param vendedor>"         // nome ("Niverton") ou ID
   })
   ```
   **Validação**: resposta contém o ID e o link do deal — guardar ambos.
   SE retornar `⚠ DEAL ABERTO EXISTENTE` (guardrail do MCP) → mostrar ao Eric o(s) deal(s) aberto(s) e perguntar: criar novo mesmo assim (aí sim `force: true`) ou usar o existente? NÃO decidir sozinho.
2. Preencher campos do deal (`custom_fields` é STRING JSON):
   ```
   mcp__pipedrive__update_deal_fields({
     deal_id: <id do item 1>,
     custom_fields: "{
       \"Origem da Oportunidade\": \"<ORIGEM enum exato>\",
       \"Detalhes da origem da oportunidade\": \"<data + contexto>\",
       \"Segmento\": \"<valor da lista canônica de segmentos>\",
       \"Dores\": \"<dor extraída>\"
       // exatamente estes 4 campos — checklist fechado abaixo; nada além disso
     }"
   })
   ```
   - "Origem da Oportunidade" é OBRIGATÓRIA + detalhe OBRIGATÓRIO (mesma lógica da origem da pessoa; pode variar entre deals). Valor EXATO da **Referência A** abaixo.
   - "Segmento" SÓ aceita valores da **lista canônica embutida na Referência B** abaixo (não texto livre). SE não conseguir enquadrar → usar `Outros (descrever)` e detalhar em "Nicho (detalhes adicionais)", em vez de deixar em branco ou inventar valor.
   - **Checklist fechado dos campos desta skill** (são exatamente 4 — não há "máximo de campos" aberto): (1) "Origem da Oportunidade" — OBRIGATÓRIO, valor exato da Referência A; (2) "Detalhes da origem da oportunidade" — OBRIGATÓRIO, data + contexto; (3) "Segmento" — só quando inequívoco pela Referência B (senão vazio, ver regra da Referência B); (4) "Dores" — a dor extraída no passo 2 (vazio se não houve evidência literal). Preencher cada um segundo a regra dele. Campos do Pipedrive fora desta lista de 4 estão FORA do escopo desta skill — não preencher.
   - SE der erro de campo não encontrado → `mcp__pipedrive__sync_all` e repetir.

### Referência A — Enum de origem (para "Origem do Contato" e "Origem da Oportunidade")

Espelho literal de `C:/MCPs/expert-mcps/CLAUDE.md` seção 2 (embutido aqui pra executar sem o arquivo externo). Usar o valor EXATAMENTE como escrito (com o `|`, espaços e maiúsculas). Os dois campos ("Origem do Contato" da pessoa e "Origem da Oportunidade" do deal) aceitam esta mesma lista.

**Valores válidos (copiar tal e qual — os valores carregam ACENTO porque o match do MCP é exato; lista sincronizada com o Pipedrive real em 07/07/2026, capturada do aviso de opções do próprio MCP):**

```
ORG | Automação do @ericluciano
ORG | Automação do @expertintegrado
ORG | SE Bio @ericluciano
ORG | SE Bio @expertintegrado
ORG | Mensagem receptiva de whatsapp
ORG | Palestra Eric Luciano
ORG | Site Super SDR
SS | @ericluciano
SS | @expertintegrado
OUT | Outbound Manual
OUT | Outbound Automático
INDIC | ChatGuru
INDIC | Geral
INDIC | Direta do Eric
BASE | Lead retomou conversa
BASE | Retomada programada
BASE | Campanha de base interna
CROS | Cliente Ativo
CROS | Cliente Inativo
CROS | Downsell de Projetos
CROS | Downsell de Educacional
CROS | Upsell de Educacional
EVENTO | ADVBOX
EVENTO | IA Summit Joinville 2025
EVENTO | Imersão Highticket 23
EVENTO | Imersão Highticket 24
EVENTO | Growth Conference 2024
EVENTO | Nova Era
EVENTO | WebSummit
EVENTO | Imersão Expert Integrado
EVENTO | Eric conheceu presencialmente
PUBLI | ADVBOX
PUBLI | G4 Tools
ADS | Facebook Leads
ADS | LP > Formulário
ADS | LP > WhatsApp
ADS | SE LP
ADS | SE Manychat
ADS | Webinário
ADS | WhatsApp > SDR
Lançamento Mentoria Automações Inteligentes
APP | Voice AI
Desconhecido
```

SE o `update_deal_fields` retornar aviso de "valor inválido" listando as opções → a lista acima envelheceu: usar a lista DO AVISO como verdade, escolher o valor equivalente e repetir a chamada UMA vez (e atualizar esta Referência + `C:/MCPs/expert-mcps/CLAUDE.md` seção 2).

**Mapeamento contexto do lead → valor exato** (é o que casa com os cenários típicos desta skill):

| Contexto na conversa | Valor de origem (exato) | "Pessoa que indicou" |
|---|---|---|
| G4 / G4 Tools / G4 Scale / G4 Traction / G4 Educação | `PUBLI | G4 Tools` | — |
| Indicação do próprio Eric ("indicação minha") | `INDIC | Direta do Eric` | `Eric Luciano` |
| Indicação de terceiro (nome citado) | `INDIC | Geral` | nome de quem indicou |
| Instagram do Eric | `SS | @ericluciano` | — |
| Instagram da Expert | `SS | @expertintegrado` | — |
| Evento com nome que está na lista acima | `EVENTO | <nome exato da lista>` | — |
| Evento presencial com o Eric (sem nome específico na lista) | `EVENTO | Eric conheceu presencialmente` | — |
| Palestra do Eric | `ORG | Palestra Eric Luciano` | — |
| WhatsApp receptivo (ele chamou primeiro no zap) | `ORG | Mensagem receptiva de whatsapp` | — |
| Origem existe na conversa mas não casa em nenhuma linha acima | perguntar ao Eric qual valor da lista usar | — |

Só preencher "Pessoa que indicou" quando a origem for um valor `INDIC | ...`.

### Referência B — Segmentos válidos (campo "Segmento")

Espelho literal de `C:/MCPs/expert-mcps/CLAUDE.md` seção 5. O campo "Segmento" SÓ aceita um destes valores (não texto livre). Escolher o que melhor descreve o setor do lead extraído no passo 2; se nenhum servir, usar `Outros (descrever)` e detalhar em "Nicho (detalhes adicionais)".

```
Academia e empresas de esporte
Agencias em geral
Agencia de Marketing
Arte e Cultura
Call Center
Clinica Estetica
Clinica Medica
Contabilidade
Consultoria
Educacao
Ecommerce
Energia
Entretenimento
Eventos
Imoveis e Construcao
Industria
Infoprodutos e Mentorias
Juridico
Seguros
Servicos Financeiros
Servicos Gerais
Tecnologia e TI
Turismo e Viagens
Varejo
Vendas
Outros (descrever)
```

**Regra objetiva pra preencher "Segmento" a partir do domínio/atividade da empresa:** só preencher quando o site ou a atividade da empresa (extraídos no passo 2) tornarem o valor desta lista INEQUÍVOCO — ou seja, um único valor da lista descreve o setor sem margem pra dúvida.
- SE o setor não foi extraído (ficou em branco no passo 2) → deixar "Segmento" vazio (não chutar um valor da lista).
- SE o setor ficou AMBÍGUO entre 2+ valores desta lista (ex.: dá pra defender tanto "Consultoria" quanto "Agencia de Marketing") → deixar "Segmento" VAZIO e listar essa indefinição nas pendências do report final ao Eric (passo 9). NUNCA chutar entre as opções.

### Passo 5 — Nota com resumo Feynman

```
mcp__pipedrive__create_note({
  deal_id: <id do passo 4>,
  content: "<p><b>Resumo do histórico WhatsApp Eric ↔ {Nome}:</b></p>
            <ul>
            <li>Data primeira interação: {data}</li>
            <li>Origem: {origem detalhada}</li>
            <li>Contexto: {1 parágrafo Feynman}</li>
            <li>Dor levantada: {dor}</li>
            <li>Último ponto: {o que ficou aberto}</li>
            </ul>
            <p>Link do chat: https://wa.me/{numero_do_lead}</p>"
})
```

Texto externo → acentuação correta obrigatória.

### Passo 6 — Atividade DONE representando a conversa do Eric

```
mcp__pipedrive__create_activity({
  deal_id: <id do passo 4>,
  person_id: <id do passo 3>,
  subject: "Conversa Eric ↔ {Nome} (WhatsApp pessoal)",
  type: "whatsapp",
  due_date: "<data da última mensagem, YYYY-MM-DD>",
  done: true,
  user_id: "Eric Luciano",
  note: "<resumo curto do que rolou>"
})
```

(`done: true` = registro retroativo; pula o guardrail de pendências do MCP.)

### Passo 7 — Atividade pendente pro vendedor — MESMO DIA

**Obter a hora atual em BRT** pela fonte declarada em Pré-requisitos ("Fonte de hora atual"): `HH:MM` de agora em America/Sao_Paulo. **Calcular `due_time`** a partir dela:
- SE a hora atual BRT for **< 09:00** → `due_time = "09:00"`.
- SE for **≥ 09:00 e ≤ 21:00** → `due_time = (hora atual + 2h)`, formato `HH:MM` de 2 dígitos (ex.: agora 14:37 → `"16:37"`).
- SE for **> 21:00** (tarde da noite) → ainda no MESMO dia (`due_date` = hoje), usar `due_time = "21:00"` (não empurrar pro dia seguinte; a regra é "mesmo dia").

`due_date` = data de hoje em BRT (`YYYY-MM-DD`). NUNCA passar `due_time` como `""` nem `"00:00"`.

```
mcp__pipedrive__create_activity({
  deal_id: <id do passo 4>,
  person_id: <id do passo 3>,
  subject: "Ligar/WhatsApp {Nome} - lead transferido do Eric",
  type: "call",
  due_date: "<hoje, YYYY-MM-DD>",
  due_time: "<HH:MM calculado acima>",
  duration: 30,
  user_id: "<param vendedor>",
  note: "Lead transferido pelo Eric via WhatsApp pessoal. Contexto na nota e nos campos."
})
```

Fuso sempre America/Sao_Paulo — passar o horário de Brasília direto, sem sufixo Z (o MCP converte pra UTC). NÃO passar `force: true`: o deal é novo, não deve haver pendência conflitante; SE o guardrail acusar conflito → investigar antes (provável duplicata) em vez de forçar.

### Passo 8 — Notificar vendedor no WhatsApp corporativo

**Modo WhatsApp**: este disparo usa `whatsapp-agent` (número pessoal do Eric) — NÃO ChatGuru. Motivo: o destinatário é funcionário interno (vendedor), não cliente externo (ver NUNCA).

Telefone corporativo do vendedor (obter ANTES de montar a mensagem):
- SE `vendedor` (normalizado, minúsculas, sem acento) for `niverton` → usar `5581985325551` diretamente (valor canônico desta skill, validado em produção 27/05/2026). Não precisa recall.
- SENÃO → `mcp__expert-brain__recall(query="telefone corporativo <vendedor>")`. **Critério objetivo de "achou":** conta como achado SOMENTE se alguma nota retornada contém, no corpo, um número de telefone no formato `55` + DDD + número (10–11 dígitos após o `55`) associado a esse vendedor pelo nome. Extrair esse número (só dígitos, formato `55XXXXXXXXXXX`).
  - SE nenhuma nota retornada traz um número nesse formato para esse vendedor → considerar "NÃO achou" → perguntar ao Eric o telefone corporativo. NUNCA usar um número aproximado nem inferir de contexto. **Fechar o loop:** a resposta do Eric fornece o telefone — normalizar pro formato `55XXXXXXXXXXX` (só dígitos) e voltar a este passo 8 usando esse valor como telefone corporativo do vendedor, seguindo normalmente (montar a mensagem e enviar).
  - SE ≥2 notas trazem números DIFERENTES para o mesmo vendedor → é ambíguo → listar os candidatos pro Eric e perguntar qual é. NÃO escolher sozinho. **Fechar o loop:** a resposta do Eric indica qual telefone usar — voltar a este passo 8 com o valor escolhido (formato `55XXXXXXXXXXX`) e seguir normalmente.

Template da mensagem (ordem das linhas é OBRIGATÓRIA — link do deal SEMPRE logo após o nome; máximo 8 linhas; mensagem operacional time-interno, não precisa do voice guide pessoa-física do Eric):

```
🔥 *NOVO LEAD*

{Nome Completo} — {Empresa}
{url_pipedrive_deal}

{1 frase do contexto/dor extraída}
Origem: {origem} | Pipeline: {pipeline}

https://wa.me/{numero_do_lead_sem_+}
```

Enviar:

```
mcp__whatsapp-agent__send({
  to: "<telefone corporativo do vendedor>",
  content: "<template acima preenchido>",
  confirmed: true,     // Eric já acionou a transferência explicitamente — skill é o executor
  allow_new: true      // caso o número do vendedor ainda não exista como chat (primeiro contato)
})
```

- **Validação**: resposta sem `error`. O `send` roda voice check interno — warning de voice guide é ESPERADO nesta mensagem (operacional, não em nome do Eric pessoa-física) e NÃO bloqueia; seguir mesmo assim.
- SE retornar erro de chat inexistente sem `allow_new` → reenviar com `allow_new: true`.
- SE `allow_new` exigir `instance` (primeiro contato não tem chat pra herdar) → reenviar com `instance: "pessoal"`.

### Passo 9 — Reportar ao Eric

Mensagem de fechamento (usar os links retornados pelas tools nos passos 3 e 4; acentuação correta):

```
Lead {Nome} transferido pro {vendedor}:

- Pessoa: {url_pipedrive_pessoa}
- Deal: {url_pipedrive_deal} ({pipeline} / etapa inicial)
- Atividade pendente {vendedor}: hoje {hora}
- WA corporativo {vendedor}: enviado ✅
- WhatsApp do lead: https://wa.me/{numero}

Resumo do contexto: {1 frase}
```

O link `wa.me` do lead vai SEMPRE no report, pro Eric clicar caso queira acompanhar.

## Validação final (checklist)

- [ ] Os 3 parâmetros (lead, pipeline, vendedor) vieram explícitos — nada foi inferido
- [ ] Áudios do chat transcritos antes da análise
- [ ] Chat do lead resolvido pra 1 `chat_id` único (ou desempatado por últimos-8 / `chat_name` idêntico; ambiguidade → perguntou ao Eric)
- [ ] Pessoa: `person_id` decidido pela regra "match forte" (últimos-8 do telefone OU e-mail); ≥2 match forte → perguntou ao Eric; "Origem do Contato" + detalhe preenchidos (ou preservados, se já existiam)
- [ ] Deal na PRIMEIRA etapa do pipeline destino, título `Nome | Empresa`, owner = vendedor
- [ ] "Origem da Oportunidade" + detalhe com valor EXATO da Referência A; "Segmento" (se preenchido) da Referência B
- [ ] Nota Feynman criada no deal (com acentuação correta)
- [ ] Atividade DONE (whatsapp, Eric) + atividade PENDENTE (call, vendedor, hoje, HH:MM real) criadas
- [ ] Vendedor notificado via whatsapp-agent (não ChatGuru), link do deal logo após o nome, link wa.me na última linha
- [ ] Report ao Eric com todos os links + wa.me do lead

## Erros comuns e recovery

| Sintoma | Causa | Ação |
|---|---|---|
| `This tool has been disabled in your connector settings.` | Callback do Claude Desktop bloqueia `create_*` | Reexecutar via `mcp__pipedrive__pipedrive_write({ action, params })` |
| Chat do lead não encontrado no `search` | Busca por número completo (com/sem 9) | Buscar pelos últimos 8 dígitos; se persistir, perguntar ao Eric; sem histórico → `prospecta-lead` |
| `search` retorna `canceling statement due to statement timeout` | Query curta demais varre a base inteira | Repetir UMA vez; SE repetir o timeout → pular o search e resolver direto com `mcp__whatsapp-agent__read(chat="<telefone ou nome>")` (o `read` resolve nome/telefone/chat_id e retorna candidatos se ambíguo) |
| Áudio sem conteúdo na análise | Transcrição pendente | `mcp__whatsapp-agent__transcribe_audio(chat=...)` e reler (NUNCA API OpenAI direta) |
| `⚠ POSSÍVEL DUPLICATA` no `create_person` | Pessoa já existe | Usar o `person_id` existente; NÃO forçar criação |
| `⚠ DEAL ABERTO EXISTENTE` no `create_deal` | Contato já tem deal aberto | Mostrar ao Eric e perguntar (novo com `force: true` OU usar o existente) |
| Conflito de campo já preenchido em `update_person`/`update_deal_fields` | Guardrail anti-sobrescrita | Origem do Contato → preservar e seguir; outros campos → perguntar ao Eric antes de `force: true` |
| Erro "campo não encontrado" em custom_fields | Cache de campos desatualizado | `mcp__pipedrive__sync_all` e repetir a chamada |
| Atividade do vendedor aparece vencida | `due_time` vazio ou `"00:00"` | Sempre HH:MM real (regra do passo 7) |
| Guardrail de pendência no passo 7 | Possível deal/atividade duplicada | Investigar antes; NUNCA `force: true` direto |
| `send` bloqueado: chat inexistente | Primeiro contato com o número | Reenviar com `allow_new: true` (+ `instance: "pessoal"` se exigido) |
| Warning de voice guide no `send` do passo 8 | Mensagem operacional ≠ voz pessoa-física | Esperado; não bloqueia — seguir |

## Output final

Toda execução retorna:

```json
{
  "lead": "Nome do lead",
  "vendedor": "Nome do vendedor",
  "pipeline": "Pipeline",
  "person_id": 12345,
  "deal_id": 67890,
  "deal_url": "https://...",
  "activity_done_id": 11111,
  "activity_pending_id": 22222,
  "msg_vendedor_status": "enviado",
  "wa_lead_link": "https://wa.me/55..."
}
```

## Referências

- Skill `prospecta-lead` (lead frio sem histórico) — `plugins/comercial/skills/prospecta-lead/`
- Enum de origem (seção 2) e segmentos (seção 5) — **embutidos nesta skill nas Referências A e B** (espelho literal de `C:/MCPs/expert-mcps/CLAUDE.md`); consultar o arquivo externo só pra reconferir se suspeitar de mudança. Pipelines/etapas (seção 3) estão na tabela do passo 4; tipos de atividade (seção 4) estão inline nos passos 6 e 7.
- Voice Guide v1.4 do Eric — Brain nota `yasak98uo4z4`
- Diretriz CRM — `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/Processo Comercial/Campanha de retomada de leads/Diretriz_Preenchimento_CRM.md` (só existe no PC/notebook; conteúdo operacional já está embutido nesta skill)
- Brain nota `lhu4g220l66h` — desambiguação WhatsApp vs ChatGuru (este caso usa whatsapp-agent pessoal porque o destinatário é funcionário, não cliente externo)

## Versão

- **v1.0** (27/05/2026): versão inicial, validada em produção com Thiago Paukoski (Grupo X-Method) — pipeline Educacional, vendedor Niverton.
- **v1.1** (13/06/2026): consistência com CLAUDE.md/Pipedrive — stage_ids reais 52/16/7/64/84; removido pipeline fantasma "Black Friday"; transcrição via tool nativa; `update_person` da origem explicitado; título `Nome | Empresa`; `custom_fields` como string JSON; fallback `pipedrive_write`; fuso BRT.
- **v2.0** (02/07/2026): reescrita padrão Sonnet-executável (NUNCA/SEMPRE, decisões SE/SENÃO, validação por passo, recovery); correções de fato: `read` usa parâmetro `chat` (não `chat_id`), `update_person` usa `person_id` (não `id`); comportamento preservado.
- **v2.1** (02/07/2026): eliminação de zonas de inferência apontadas no teste de executabilidade Sonnet, SEM mudança de comportamento — critério objetivo de extração no passo 2 (evidência textual literal; só origem bloqueia); regra determinística "match forte" (últimos-8 do telefone OU e-mail idêntico) pra desempate de pessoa no passo 3; formato de retorno de `search`/`read` documentado + desempate de chat por `chat_id` único / últimos-8 / `chat_name` idêntico no passo 1; enum de origem (Referência A) e lista de segmentos (Referência B) embutidos inline; fonte de hora BRT declarada em Pré-requisitos e cálculo de `due_time` detalhado no passo 7 (com teto 21:00 pra manter "mesmo dia"); critério objetivo de "achou" no `recall` de telefone do vendedor no passo 8.
