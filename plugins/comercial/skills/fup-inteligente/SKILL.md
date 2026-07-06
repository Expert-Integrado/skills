---
name: fup-inteligente
description: Follow-up sistemático de deals abertos no Pipedrive, um funil por vez, da direita para a esquerda (etapa mais avançada primeiro). Lê contexto Pipedrive + WhatsApp pessoal, sugere mensagem com voz Eric, envia após aprovação, registra atividade e agenda próximo follow-up. Quando deal vira Perdido, SEMPRE cria atividade de retomada futura conforme playbook. TRIGGER quando o usuário pedir "follow-up", "fup do pipe", "roda o fup", "vamos rodar o funil X", "deal Y foi perdido", "marca como perdido" ou similar. NÃO usar para criar lead/deal novo (usar prospecta-lead), dashboard de higiene do pipe (pipe-review), reabordagem de base fria em massa (reabordagem), transferir lead entre vendedores (transferir-lead) nem para listar pendências de WhatsApp (estou-devendo).
allowed-tools: mcp__pipedrive__list_deals, mcp__pipedrive__get_deal, mcp__pipedrive__get_deal_summary, mcp__pipedrive__list_deal_activities, mcp__pipedrive__create_activity, mcp__pipedrive__update_activity, mcp__pipedrive__update_deal, mcp__pipedrive__pipedrive_write, mcp__pipedrive__sync_all, mcp__whatsapp-agent__read, mcp__whatsapp-agent__send, mcp__whatsapp-agent__check_message, mcp__whatsapp-agent__get_voice_guide, Read, Grep
---

# fup-inteligente — Follow-up de Funis Pipedrive

Follow-up sistemático de deals abertos no Pipedrive, um funil por vez, da direita para a esquerda (etapa mais avançada primeiro). Para cada deal: triagem (só quem tem atividade vencida/de hoje/ausente), coleta de contexto (Pipedrive + WhatsApp pessoal), consulta ao Livro de Objeções, mensagem na voz do Eric, aprovação explícita, envio via whatsapp-agent, registro no Pipedrive pelo Protocolo Anti-Vencida e agendamento do próximo follow-up. Deal marcado como Perdido SEMPRE sai com atividade de retomada futura (cadência 30/90/180 dias por motivo).

## NUNCA

- NUNCA enviar mensagem WhatsApp sem aprovação explícita do Eric (botão **Enviar** no Telegram ou resposta de texto explícita fora dele). Sem aprovação = sem envio.
- NUNCA passar `due_time: ""` ou `"00:00"` — Pipedrive marca a atividade como vencida à meia-noite. Atividade sem horário definido = OMITIR `due_time`.
- NUNCA deixar atividade de REGISTRO (evento que JÁ aconteceu) pendente — registro nasce concluído e é verificado (Passo 7).
- NUNCA criar a próxima atividade PENDENTE com data passada ou de hoje — `due_date` sempre >= amanhã (próximo dia útil).
- NUNCA marcar deal como perdido ANTES de a atividade de retomada existir — ordem inversa cria deal zumbi sem retomada.
- NUNCA decidir sozinho o responsável da atividade de retomada pós-perda — SEMPRE perguntar ao Eric (Lead Perdido, Passo 3).
- NUNCA fazer follow-up de deal cuja atividade pendente tem data futura (ainda não venceu) — pular o deal.
- NUNCA sobrescrever campo preenchido no Pipedrive (exceto pedido explícito do Eric).
- NUNCA copiar o script do Livro de Objeções na íntegra para a mensagem — script é para call; mensagem é adaptação para WhatsApp (ver "Como aplicar a quebra").

## SEMPRE

- SEMPRE só deals do Eric no sweep: `user_id: 17987703`.
- SEMPRE acentuação correta do português em todo texto externo (mensagem WhatsApp, nota Pipedrive, apresentação no Telegram).
- SEMPRE consultar o Livro de Objeções antes de redigir a mensagem quando a etapa exigir (tabela "Fluxo de uso por etapa").
- SEMPRE passar a mensagem por `mcp__whatsapp-agent__check_message` antes de apresentar ao Eric; se houver violações, corrigir antes de mostrar.
- SEMPRE tratar WhatsApp > Pipedrive em caso de conflito de contexto (conversa real é fonte de verdade).
- SEMPRE rodar a invariante final por deal tocado: `list_deal_activities(deal_id, done: "0")` = exatamente 1 atividade, com data futura.
- SEMPRE deixar deal perdido com exatamente 1 pendente = a retomada futura.
- SEMPRE incluir a linha "Objeção quebrada" na `note` da atividade quando o Livro de Objeções foi usado.
- SEMPRE incluir o link `https://wa.me/{numero}` na apresentação do lead.

## Pré-requisitos

- MCPs conectados: `pipedrive` e `whatsapp-agent`. Se uma tool `create_*` ou `update_deal_fields` retornar "This tool has been disabled in your connector settings", usar o fallback `mcp__pipedrive__pipedrive_write({ action, params })` — mesma lógica, nome neutro. Actions suportadas pelo proxy: `create_activity`, `create_deal`, `create_person`, `create_organization`, `add_product_to_deal`, `update_deal_fields`, `create_note`. O proxy NÃO cobre `update_activity` nem `update_deal` — essas só existem como tool direta.
- **Como resolver `<skill-dir>` (a pasta desta skill) — NÃO adivinhar, NÃO hardcodar:** `<skill-dir>` = o diretório do próprio `SKILL.md` que está sendo lido nesta execução (mesmo padrão da skill pipe-review). Derivar do path real deste arquivo — todo `Read` de `playbook/...` abaixo é relativo a `<skill-dir>` (ex.: `<skill-dir>/playbook/Livro_Objecoes_Super_SDR.md`). Via marketplace no PC do Eric o path costuma ser algo como `C:\Users\Eric Luciano\.claude\plugins\marketplaces\expertintegrado\plugins\comercial\skills\fup-inteligente`, mas isso é só EXEMPLO ilustrativo — NUNCA assumir esse caminho; o layout varia por máquina (PC, notebook, VPS, Telegram) e por instalação (cache vs marketplace). Sempre derivar do path deste SKILL.md.
- Pasta `playbook/` desta skill (versionada no repo — funciona em PC, notebook, VPS e Telegram sem OneDrive/internet). Ler com `Read` usando o caminho relativo a `<skill-dir>` resolvido acima.
- **Em EXECUÇÃO desta skill: ler `playbook/` como está.** NUNCA rodar sync nem verificar se está "atualizada" — a cópia versionada no repo É a canônica para execução, em qualquer máquina. Nenhum passo desta skill dispara sincronização.
- Manutenção (FORA do fluxo de execução, só quando o Eric pedir explicitamente para atualizar o playbook): fonte original em `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/Processo Comercial/Playbooks/Documentos MD/` (só existe no PC do Eric); rodar `scripts/sync-playbook.ps1` e commitar no repo `skills`. As demais máquinas recebem via `git pull`/plugin update.
- **Premissa de data/hora — `HOJE`:** no início da sessão, obter a data atual em America/Sao_Paulo via Bash: `TZ='BRT3' date +%Y-%m-%d` (POSIX BRT3, nao IANA: o Git Bash do Windows nao tem tzdata e TZ=America/Sao_Paulo devolve UTC silenciosamente — CORRECAO-DE-FATO do golden run 06/07/2026; BRT3 = UTC-3 fixo, Brasil sem horario de verao desde 2019, funciona em Windows e Linux). O valor retornado é `HOJE` e é usado em toda a triagem do Passo 2 (comparar data das atividades pendentes contra `HOJE` para classificar vencida/hoje/futura) e no cálculo de datas do próximo follow-up e da retomada. NUNCA presumir a data de contexto/memória — sempre ler do `date`.
- Interface de aprovação: em sessão Telegram, usar botões inline conforme templates. Fora do Telegram (terminal), apresentar o mesmo template e aguardar resposta de texto explícita ("envia" / "altera ..."). O guardrail é o mesmo: sem aprovação explícita = sem envio.

### Playbook embutido — quando consultar cada arquivo

| Arquivo | Quando consultar |
|---|---|
| `playbook/Playbook_Vendas_Super_SDR.md` | Cadências de follow-up, fluxos de retomada pós-perda (seções 16.10–16.13), regras de pipeline |
| `playbook/Livro_Objecoes_Super_SDR.md` | Antecipar/responder objeções em mensagem |
| `playbook/Livro_Objecoes_Contexto_Agente.md` | Objeções específicas para contexto de agente IA |
| `playbook/Manual_Duvidas_Tecnicas_Super_SDR.md` | Dúvidas técnicas do produto durante a conversa |
| `playbook/Politica_Comercial_Super_SDR.md` | Política comercial (descontos, condições, exceções) |

**Busca eficiente (OBRIGATÓRIO):** não ler os playbooks inteiros — são documentos longos. Usar `Grep` pelos termos da objeção/dúvida específica do lead (ex: "preço", "sócio", "concorrência", nome do motivo de perda) e ler com `Read` só as seções relevantes que o Grep apontar.

### IDs fixos

**Vendedores (Pipedrive user_id):**

| Nome | user_id |
|---|---|
| Eric Luciano | 17987703 |
| Kesia Nandi | 23969736 |
| Niverton Menezes | 23506911 |

Outros nomes: `create_activity`/`update_activity` aceitam o NOME do responsável no parâmetro `user_id` (o MCP resolve para ID, match exato ou parcial). SE o MCP não resolver o nome → o próprio erro retorna a lista de usuários ativos com IDs; confirmar com o Eric qual usar. (Não existe tool de listagem de usuários no MCP Pipedrive.)

Atenção: a resolução usa a lista de usuários do `config.js` do MCP (snapshot — atualizado por `mcp__pipedrive__sync_all`). Kesia (23969736) NÃO consta no snapshot atual — a atribuição a ela pode falhar com "Usuário não encontrado". SE isso ocorrer com qualquer vendedor da tabela → rodar `mcp__pipedrive__sync_all` e repetir; SE seguir ausente → confirmar com o Eric antes de atribuir a outro.

**Ordem de prioridade dos funis:**

1. Educacional (pipeline 6)
2. Super SDR (pipeline 2)
3. SaaS (pipeline 1)
4. Prospecção (pipeline 7)
5. Parcerias (pipeline 10) — pular por enquanto

**Ordem dentro do funil — direita para a esquerda (etapa mais avançada primeiro):**

| Educacional (6) | Super SDR (2) | SaaS (1) | Prospecção (7) |
|---|---|---|---|
| 82 — Formalização | 81 — Formalização | 83 — Formalização | 79 — Reunião agendada |
| 56 — Em negociação | 14 — Em negociação | 21 — Em negociação | 116 — Qualificado |
| 55 — Proposta enviada | 12 — Proposta enviada | 20 — Proposta enviada | 68 — Pré-Qualificado |
| 60 — Apresentação realizada | 10 — Demo realizada | 61 — Apresentação realizada | 66 — Conexão iniciada/Em qualificação |
| 54 — Apresentação agendada | 9 — Demo agendada | 19 — Apresentação agendada | 65 — Tentando contato |
| 115 — Aguardando agendamento | 90 — Aguardando agendamento | 117 — Aguardando agendamento | 64 — Lead Mapeado |
| 53 — Contato realizado | 8 — Contato realizado | 17 — Contato realizado | |
| 52 — Sem contato | 7 — Sem contato | 16 — Sem contato | |

## Passos

### 1. Sweep do funil

**Qual funil rodar (decisão determinística, sem estado persistido):**

- SE o Eric NOMEOU o funil no pedido ("roda o funil Educacional", "fup do Super SDR") → rodar SÓ esse funil e encerrar na Validação final.
- SENÃO (pedido genérico: "roda o fup", "follow-up", "fup do pipe") → rodar TODOS os funis na ordem de prioridade acima, NA MESMA invocação, um por vez: Educacional → Super SDR → SaaS → Prospecção. Parcerias (10) é SEMPRE pulado. Só passar ao funil seguinte quando o atual terminar (todos os deals triados/apresentados).
- NÃO existe "onde parei da última vez": toda invocação genérica recomeça do funil 1 (Educacional). Isso é intencional e idempotente — a triagem (Passo 2) pula deals com pendente futura, então deals já tratados em rodadas anteriores são pulados automaticamente.

Para o funil da vez:

```
mcp__pipedrive__list_deals({ status: "open", pipeline_id: <ID do funil>, user_id: 17987703, buscar_todos: true })
```

**Filtro defensivo OBRIGATÓRIO:** o parâmetro `pipeline_id` do MCP pode VAZAR deals de outros funis (reproduzido em 06/07/2026: `pipeline_id: 6` devolveu deals de TODOS os pipelines misturados). Antes de ordenar, DESCARTAR todo deal cujo campo `pipeline` do retorno seja diferente do nome do funil da vez (ex: manter só `pipeline: "Educacional"`). Nunca confiar só no parâmetro do filtro.

Ordenar os deals restantes pela ordem de etapas da tabela (mais avançada primeiro). SE o funil não tem deals abertos do Eric → invocação genérica: passar ao próximo funil da ordem; funil nomeado: reportar "sem deals abertos" e encerrar na Validação final.

Durante o sweep, anotar também deals com `status: lost` sem atividade pendente futura (auditoria passiva — ver "Lead Perdido", situação 2).

### 2. Triagem por deal — precisa de follow-up AGORA?

Para cada deal, `mcp__pipedrive__list_deal_activities({ deal_id, done: "0" })` e classificar:

- SE existe atividade pendente com data PASSADA (vencida) → PRIORIDADE 1, seguir ao Passo 3.
- SENÃO SE existe atividade pendente com data de HOJE → PRIORIDADE 2, seguir ao Passo 3.
- SENÃO SE não existe NENHUMA atividade pendente → PRIORIDADE 3 (erro do sistema — deal órfão), seguir ao Passo 3.
- SENÃO (pendente com data futura, ainda não venceu) → PULAR este deal e ir ao próximo.

### 3. Coleta de contexto

**Pipedrive** — 1 chamada:

```
mcp__pipedrive__get_deal_summary({ deal_id })
```

Retorna deal completo (campos personalizados, valor, etapa), pessoa vinculada (telefone), atividades (feitas + pendentes + atrasadas), notas e histórico de movimentação.

**WhatsApp pessoal:**

```
mcp__whatsapp-agent__read({ chat: "<telefone normalizado — regra abaixo>", limit: 30 })
```

**Normalização do telefone → parâmetro `chat`:** a linha `Telefone:` do `get_deal_summary` vem como está gravado no Pipedrive (pode vir com `+`, espaços, hífens, parênteses, com ou sem DDI 55). Transformar assim:

1. Remover TUDO que não for dígito.
2. SE o resultado tem 10-11 dígitos (DDD + número, sem DDI) → prefixar `55`.
3. SE o resultado já começa com `55` e tem 12-13 dígitos → usar como está.

Resultado esperado: `55` + DDD + número, só dígitos (ex: `5511987654321`). Este MESMO valor é usado em: `chat` (aqui), `to` (Passo 6) e no link `https://wa.me/{numero}` (Passo 5).

- SE a linha `Telefone:` tem mais de um número (separados por vírgula) → usar o primeiro que normalize para 12-13 dígitos; SE nenhum normalizar → tratar como "deal sem telefone" (perguntar ao Eric).
- SE o `read` com o número não encontrar o chat → repetir com `chat: "<nome da pessoa exatamente como está no Pipedrive>"`. SE ainda não encontrar → tratar como "contato sem histórico no WhatsApp" (abaixo).
- SE a conversa retornada NÃO contém nenhuma mensagem do LEAD dentro das 30 (só mensagens do Eric) OU a última mensagem do Eric referencia um assunto que não aparece nas 30 retornadas → repetir com `limit: 100`; senão, seguir com as 30.
- SE o contato não tem histórico no WhatsApp → pular esta leitura, usar só Pipedrive.
- **WhatsApp > Pipedrive em caso de conflito** (conversa real é fonte de verdade).

### 4. Definir próxima ação e redigir mensagem

**Unidade de trabalho = o DEAL, não a atividade.** SE a triagem achou 2+ atividades vencidas no MESMO deal → mesmo assim é UM único ciclo: UMA apresentação (Passo 5), UMA mensagem consolidada (o contexto do Passo 3 já cobre todas) e UMA próxima atividade. As N vencidas são todas concluídas no 7.1. NUNCA gerar uma mensagem por atividade vencida.

Com o contexto (Pipedrive + WhatsApp), definir:

- **Tipo de atividade** (whatsapp, call, reunião, task) — regra default: SE o contato tem WhatsApp ativo (histórico no Passo 3) → `whatsapp`; SENÃO → o canal do último contato registrado no Pipedrive. Eric muda na aprovação se quiser.
- **Texto da mensagem** (se for WhatsApp) — critérios abaixo
- **Data do próximo follow-up** (tabela "Critérios de data" abaixo)

**Antes de redigir: consultar o Livro de Objeções conforme a tabela "Fluxo de uso por etapa"** (seção "Quebra de Objeções"). Obrigatório sempre que houver objeção no histórico.

**Como redigir a mensagem (critérios objetivos — valem pra TODA mensagem):**

1. 1-3 parágrafos curtos (mesma regra da quebra de objeções — WhatsApp, não email).
2. Abrir referenciando o último evento CONCRETO do histórico (proposta enviada dia X, demo de Y, última resposta do lead) — NUNCA abrir com "passando para dar um oi" ou saudação vazia.
3. Terminar com exatamente 1 pergunta aberta OU 1 CTA — nunca dois pedidos na mesma mensagem.
4. Sem saudação formal ("Prezado", "Bom dia, tudo bem?") e sem assinatura — é o WhatsApp pessoal do Eric.
5. Voz do Eric: o critério VERIFICÁVEL é `check_message` sem violações (abaixo). Gatilho objetivo do `mcp__whatsapp-agent__get_voice_guide()`: chamar UMA vez por sessão, antes de redigir a PRIMEIRA mensagem da sessão (calibra a voz). Nas mensagens seguintes, NÃO repetir a chamada — só chamar de novo se o `check_message` de uma mensagem apontar violação de voz (aí recarregar o guide e recalibrar antes de re-checar). SE o retorno do `get_voice_guide` estourar o limite de tokens da tool (o guide atual tem ~90K chars — acontece em qualquer sessão), o próprio erro salva o conteúdo num arquivo e indica o caminho: ler DESSE arquivo a seção "0. Motor da voz" + o "TL;DR" (primeiras ~120 linhas) — bastam pra calibrar; não re-chamar a tool.
6. SE a etapa exige Livro de Objeções (tabela "Fluxo de uso por etapa") → seguir "Como aplicar a quebra na mensagem".
7. SE a etapa NÃO exige (ex.: Sem contato / Contato realizado — a tabela manda NÃO consultar) → mensagem de reengajamento simples: referência ao ponto de contato anterior + valor em 1 frase + pergunta aberta. Exemplo (etapa "Sem contato"):
   > Fulano, tentei te alcançar semana passada sobre o diagnóstico do atendimento de vocês. Faz sentido a gente conversar 15 minutos essa semana, ou prefere que eu te mande um resumo por aqui mesmo?

Depois de redigir:

```
mcp__whatsapp-agent__check_message({ content: "<texto da mensagem>" })
```

- SE retornar violações → corrigir o texto e checar de novo, ANTES de apresentar ao Eric. SE a violação for de voz → recarregar `mcp__whatsapp-agent__get_voice_guide()` e recalibrar antes de re-checar (conforme gatilho da regra 5 acima).

### 5. Aprovação do Eric (PASSO OBRIGATÓRIO)

Apresentar com este template (sempre igual):

```
**{Nome do Lead}** — {Empresa}
🔗 <https://expertintegrado.pipedrive.com/deal/{deal_id}>

**Funil:** {Funil} > {Etapa}
**Valor:** R$ {valor}
**Fechamento:** {data ou "sem"}

**Contexto:** {resumo 2-3 linhas do que aconteceu}
📱 https://wa.me/{numero_telefone}

**Mensagem sugerida:**
> "{texto completo da mensagem}"

**Próxima atividade:** {tipo} em {data} — {descrição do que fazer}
```

**Origem dos placeholders (tudo vem do `get_deal_summary` do Passo 3):**

| Placeholder | Linha do retorno do get_deal_summary |
|---|---|
| `{Nome do Lead}` | `PESSOA: <nome> (ID <person_id>)` |
| `{Empresa}` | `Empresa:` (seção PESSOA — nome da organização vinculada). SE `Empresa: N/A` → omitir o "— {Empresa}" do cabeçalho |
| `{deal_id}` | `DEAL: <título> (ID <deal_id>)` |
| `{Funil}` / `{Etapa}` | `Pipeline: <nome> \| Etapa: <nome>` |
| `{valor}` | `Valor:` (SE "Sem valor" → "R$ —") |
| `{data ou "sem"}` | `Previsão:` (SE "N/A" → "sem") |
| `{numero_telefone}` | telefone normalizado no Passo 3 (só dígitos, com 55) |
| `{resumo 2-3 linhas}` | síntese do Passo 3 (atividades + notas + WhatsApp) |

**Regras de formatação:**
- Link Pipedrive SEMPRE dentro de `<>` (suprime preview/link embedding no Telegram)
- **Contexto:**, **Mensagem sugerida:** e **Próxima atividade:** em negrito
- Link WhatsApp (📱) logo abaixo do contexto, ANTES da mensagem
- Mensagem sugerida: `>` sem pular linha entre o label e a citação
- Pular uma linha entre citação e próxima atividade
- Funil formatado como: **Funil:** Nome > Etapa (sem pipe/divisor)
- Descrição da próxima atividade deve ser clara (o que fazer se não responder)

**Botões inline no Telegram:**
- ✅ **Enviar** (callback: `fup_enviar:{deal_id}`) — verde, primary
- ✏️ **Alterar** (callback: `fup_alterar:{deal_id}`) — azul, secondary

SE Eric clicar **Enviar** (ou responder "envia" fora do Telegram):
1. Passo 6 (enviar mensagem)
2. Passo 7 (Protocolo de Registro Anti-Vencida completo)
3. Passo 8 (próximo deal)

SE Eric clicar **Alterar** (ou responder "altera ..."):
1. NÃO fazer nada
2. Aguardar instrução do Eric (texto, novo prazo, etc.)
3. Re-apresentar com as alterações pedidas (mesmo template + botões)

Sem clique/aprovação = sem envio.

### 6. Enviar mensagem (após aprovação)

```
mcp__whatsapp-agent__send({ to: "<telefone do contato>", content: "<texto aprovado>", confirmed: true })
```

`confirmed: true` é permitido aqui porque a aprovação explícita do Eric já ocorreu no Passo 5 sobre o texto exato. SE o Eric alterou o texto depois da checagem, rodar `check_message` de novo antes de enviar.

SE o `send` falhar (erro Z-API, número inexistente) → reportar ao Eric no mesmo chat e NÃO registrar nada no Pipedrive (registro sem envio real é registro falso).

### 7. Registro no Pipedrive — Protocolo Anti-Vencida (ordem e verificação OBRIGATÓRIAS)

> **Regra de ouro:** atividade de REGISTRO (algo que JÁ aconteceu) nunca pode ficar pendente. Atividade PENDENTE só existe com data futura. Violação = atividade vencida fantasma poluindo a lista do Eric.

**7.1 — Concluir a(s) atividade(s) que dispararam o follow-up** (a vencida/de hoje da triagem):

```
mcp__pipedrive__update_activity({ activity_id: <id da vencida>, done: true })
```

Fazer ANTES de criar qualquer atividade nova. SE a triagem achou mais de uma vencida → concluir todas (uma chamada `update_activity` por atividade). Lembrete: o ciclo é por DEAL — N vencidas concluídas aqui, mas UM só registro (7.2) e UMA só pendente nova (7.3).

**7.2 — Criar o registro do envio, em 2 chamadas (create → update):**

2a)
```
mcp__pipedrive__create_activity({
  subject: "<resumo do envio>",
  type: "whatsapp",
  due_date: "<data REAL do evento (YYYY-MM-DD)>",
  deal_id: <deal_id>,
  person_id: <person_id>,
  user_id: 17987703,
  note: "<texto enviado>",
  done: true
})
```

2b) **SEMPRE** confirmar em seguida:
```
mcp__pipedrive__update_activity({ activity_id: <id retornado em 2a>, done: true })
```

O retorno "Atividade X concluída" de 2b é a prova de que não nasceu pendente. Por quê 2 chamadas: até 12/06/2026 o MCP descartava `done` na criação silenciosamente (Bug #6 do pipedrive-mcp) — registros retroativos nasciam pendentes e, com data passada, viravam VENCIDAS na hora. O par create→update funciona em qualquer versão do MCP e é autoverificável. Não confiar em "Atividade criada!" sem o sufixo "(CONCLUÍDA)".

SE a nota usou o Livro de Objeções, incluir na `note` (HTML) a linha:

```
<b>Objeção quebrada:</b> [nome da objeção] — fonte: Livro de Objeções Super SDR §[seção]
```

(Permite ao vendedor ver qual ângulo já foi tentado e não repetir a mesma quebra.)

**7.3 — Criar a próxima atividade PENDENTE:**

```
mcp__pipedrive__create_activity({
  subject: "<o que fazer>",
  type: "<tipo aprovado no Passo 5>",
  due_date: "<data futura (YYYY-MM-DD)>",
  deal_id: <deal_id>,
  person_id: <person_id>,
  user_id: 17987703,
  note: "<descrição: o que fazer se não responder>"
})
```

- `due_date` SEMPRE futura (>= amanhã). SE a data calculada já passou ou é hoje → usar o próximo dia útil.
- NUNCA passar `due_time` vazio ou "00:00" — omitir `due_time`.
- SE retornar "ATIVIDADE PENDENTE EXISTENTE" (guardrail do MCP) → há pendente que escapou do 7.1: concluir as excedentes via `update_activity` e repetir a criação (não usar `force: true` cegamente).

**7.4 — Invariante final (rodar SEMPRE, por deal tocado):**

```
mcp__pipedrive__list_deal_activities({ deal_id, done: "0" })
```

Deve retornar **EXATAMENTE 1 atividade, com data futura**.

- SE mais de 1 pendente → concluir as excedentes (lixo de ciclos anteriores) via `update_activity`.
- SE alguma pendente com data passada → concluir e recriar com data futura.
- SE zero pendente → o 7.3 falhou; criar agora.

**Invariante do funil: 1 deal aberto = exatamente 1 atividade pendente, sempre futura.** Deal aberto com 0 pendentes é deal órfão; com 2+ é deal duplicado; com pendente vencida é registro mal feito.

### 8. Próximo deal

Seguir para o próximo deal na ordem de prioridade. Apresentar com o mesmo template + botões.

SE os deals do funil atual acabaram:
- Invocação genérica ("roda o fup") → voltar ao Passo 1 com o PRÓXIMO funil da ordem de prioridade; após o último (Prospecção), encerrar na Validação final.
- Eric nomeou um funil específico → encerrar na Validação final.

**Batch efficiency:** um lead é **simples** quando SATISFAZ os DOIS critérios: (a) a conversa (Passo 3) NÃO tem objeção em aberto do lead E (b) o próximo toque já está definido pela cadência (tabela "Critérios de Data"). Leads simples podem ser apresentados em sequência rápida — mas cada um ainda precisa de aprovação Enviar/Alterar individual. Qualquer outro caso (objeção em aberto OU próximo toque não determinado pela cadência) = apresentar individualmente.

## Quebra de Objeções — consulta obrigatória

A skill SEMPRE consulta o Livro de Objeções para gerar mensagens — não só em lead perdido. Em qualquer follow-up onde o lead expressou hesitação, dúvida, resistência ou silêncio prolongado, a mensagem ancora na quebra validada do playbook, não em improviso.

**Fontes canônicas:**
- `playbook/Livro_Objecoes_Super_SDR.md` — objeções gerais (preço, timing, autoridade, fit, risco, concorrência). Estrutura por objeção: [DIAGNÓSTICO] / [PROVA] / [AVALIAR] / [CONFIRMAR] + DICA.
- `playbook/Livro_Objecoes_Contexto_Agente.md` — objeções do contexto agente IA (medo de robô, perda de controle, qualidade da conversa).
- `playbook/Manual_Duvidas_Tecnicas_Super_SDR.md` — quando a "objeção" é na verdade dúvida de implementação/integração.

**Fluxo de uso por etapa do funil:**

| Etapa do deal | Quando consultar |
|---|---|
| Sem contato / Contato realizado | Não consultar — primeiro contato não tem objeção ainda |
| Apresentação agendada / Demo agendada | Consultar SE houve hesitação antes do agendamento (ex: "preciso pensar", "depois falo com sócio") |
| Apresentação realizada / Demo realizada | **OBRIGATÓRIO** — toda demo gera 1-3 objeções. Mapear na nota do deal e usar quebra correspondente |
| Proposta enviada | **OBRIGATÓRIO** — silêncio pós-proposta = objeção implícita (geralmente preço, timing ou autoridade). Usar quebra do tipo mais provável dado o contexto |
| Em negociação | **OBRIGATÓRIO** — toda negociação é objeção ativa. Mensagem deve abordar a objeção declarada, não rodear |
| Formalização | Consultar SE travou em ponto técnico/contratual |
| Lead perdido (lost) | **OBRIGATÓRIO** — ver "Lead Perdido" (motivo de perda mapeia direto para objeção a quebrar) |

**Como identificar a objeção a quebrar (ordem de prioridade):**

1. **WhatsApp** (fonte primária) — frase literal do lead na última conversa. Ex: "ficou caro", "preciso falar com meu sócio", "vou avaliar".
2. **Notas do Pipedrive** — resumo do vendedor após call (geralmente identifica a objeção).
3. **Motivo de perda** (se já lost) — mapeia direto para a objeção dominante.
4. **Etapa estagnada** — presumir objeção típica da etapa (proposta parada = preço/timing; negociação travada = autoridade/condições).

**Como aplicar a quebra na mensagem** (não copiar o script na íntegra — script é para call, mensagem é para WhatsApp):

1. Identificar a objeção raiz (acima)
2. Ler o bloco correspondente no `playbook/Livro_Objecoes_Super_SDR.md`
3. Extrair o **ângulo de quebra** (PROVA + AVALIAR — a parte que muda a perspectiva do lead)
4. Adaptar para WhatsApp: 1-3 parágrafos curtos, voz Eric, termina com pergunta aberta (não pedido de reunião)
5. Manter o princípio "[DIAGNÓSTICO] antes de [PROVA]" — validar que entendeu a dor antes de oferecer a quebra

**Exemplos:**

Objeção: "ficou caro" (proposta enviada, silêncio 7 dias)
- Livro de Objeções diz: usar ROI calculator + comparar com custo de SDR humano + parcelamento se for crítico
- Mensagem WhatsApp:
  > Fulano, sei que o investimento parou em "preciso avaliar". Antes de você decidir, queria te mostrar o ROI que a gente calculou pro seu volume: o Super SDR paga ele mesmo em 2,3 meses comparado a contratar 1 SDR humano. Posso te mandar a calculadora preenchida com seus números pra você ver?

Objeção: "preciso falar com o sócio" (demo realizada, sem retorno)
- Livro de Objeções diz: oferecer participar da call com o sócio + enviar kit champion + follow-up 48h
- Mensagem WhatsApp:
  > Fulano, você ia falar com o [nome do sócio] sobre a gente. Pra facilitar essa conversa, posso participar de uma call de 20min com vocês dois — eu tiro as dúvidas técnicas direto e vocês decidem juntos. Que dia da próxima semana funciona?

## Critérios de Data do Próximo Follow-up

| Etapa | Prazo |
|---|---|
| Sem contato / Contato realizado | 1-2 dias |
| Aguardando agendamento | 2-3 dias |
| Apresentação agendada | esperar até a data da reunião |
| Apresentação realizada | 1 dia |
| Proposta enviada | 2-3 dias |
| Em negociação | 1-2 dias |
| Formalização | 1 dia |

**Como calcular a data (regra determinística):**

1. Partir de HOJE (America/Sao_Paulo) e somar o prazo da tabela em dias corridos. Intervalo ("1-2 dias", "2-3 dias") → usar o MENOR valor como default; Eric ajusta na aprovação.
2. SE o resultado cair em sábado ou domingo → mover para a segunda-feira seguinte. É a mesma regra de "dia útil" do Passo 7.3 e do Lead Perdido — vale TAMBÉM aqui no follow-up normal.
3. Feriados NÃO são verificados (só fim de semana) — Eric ajusta na aprovação se quiser.
4. "Apresentação agendada — esperar até a data da reunião" → `due_date` = a própria data da reunião agendada (consta nas atividades pendentes/futuras ou notas do `get_deal_summary`). Por ser data de evento real, NÃO aplicar a regra do fim de semana neste caso.

Sempre sugerir a data ao Eric na aprovação. Ele ajusta se quiser.

## Lead Perdido — Atividade de Retomada OBRIGATÓRIA

**Regra geral:** todo deal marcado como Perdido (status `lost`) precisa ter atividade futura de retomada no Pipedrive. **Sem exceção.** Lead perdido sem retomada = lead zumbi no CRM.

Detecção do evento "lead perdido" — 2 situações:
1. **Detecção ativa** durante o follow-up: Eric responde pedindo para marcar como perdido (ex: "marca como perdido — não respondeu mais", "esse aqui já era").
2. **Auditoria passiva** durante o sweep: deal com status `lost` sem nenhuma atividade pendente futura → criar retroativamente (listar todos ao Eric com motivo de perda e propor criação; mesmo fluxo do Passo 1 em diante).

### Passo 1 — Confirmar motivo de perda

Motivos canônicos (`playbook/Playbook_Vendas_Super_SDR.md`, seção 5.3 — Regras de Pipeline):

- Parou de responder
- Fora do orçamento
- Adiou contratação
- Contratou outra empresa
- Mudança de prioridade
- Internalizou
- Não é o que buscava
- Ferramenta incompatível
- Desqualificado

SE o Eric não informou o motivo → perguntar ANTES de seguir (sem motivo não há como mapear a cadência).

### Passo 2 — Mapear motivo → cadência → prazo

Tabela canônica (Playbook seções 16.10–16.12):

| Motivo de perda | Cadência | Dias até 1ª retomada |
|---|---|---|
| Parou de responder | Cadência 6 — Reativação 30d | **+30 dias** |
| Fora do orçamento | Cadência 6 — Reativação 30d | **+30 dias** |
| Adiou contratação | Cadência 6 — Reativação 30d | **+30 dias** |
| Mudança de prioridade | Cadência 6 — Reativação 30d | **+30 dias** |
| Contratou outra empresa | Cadência 7 — Reativação Tardia | **+90 dias** |
| Internalizou | Cadência 7 — Reativação Tardia | **+90 dias** |
| Não é o que buscava | Cadência 7 — Reativação Tardia | **+90 dias** |
| Desqualificado | Cadência 8 — Check-in 180d | **+180 dias** |
| Ferramenta incompatível | Cadência 8 — Check-in 180d | **+180 dias** |

Data calculada a partir da data de marcação como perdido (hoje, na maioria dos casos). SE cair em fim de semana → mover para a próxima segunda útil.

### Passo 3 — PERGUNTAR ao Eric a quem atribuir

**OBRIGATÓRIO antes de criar a atividade.** A skill NUNCA decide sozinha o responsável. Apresentar:

```
🔴 Lead Perdido — {Nome} ({Empresa})
Motivo: {motivo de perda}
Cadência: {Cadência 6/7/8} — retomada em {data calculada}

A quem atribuir a atividade de retomada?
```

Botões inline (Telegram):
- 👤 **Eric** (callback: `retomada_atribuir:{deal_id}:eric`) — user_id 17987703
- 👩 **Kesia** (callback: `retomada_atribuir:{deal_id}:kesia`) — user_id 23969736
- 👨 **Niverton** (callback: `retomada_atribuir:{deal_id}:niverton`) — user_id 23506911
- ✏️ **Outro vendedor** (callback: `retomada_atribuir:{deal_id}:outro`) — abre input livre

SE Eric escolher **Outro vendedor** e digitar um nome → passar esse nome EXATAMENTE como digitado no parâmetro `user_id` (string) do `create_activity` do Passo 4 — o MCP resolve nome→ID (match exato ou parcial). NÃO tentar descobrir o ID por outro meio antes. SE retornar "Usuário não encontrado" → recovery da seção "IDs fixos": rodar `sync_all` e repetir; SE persistir, o próprio erro lista os usuários ativos com IDs — confirmar com o Eric qual usar.

Sem clique/resposta = sem criação. NÃO criar atividade com responsável "default".

### Passo 4 — Criar a atividade de retomada

**Pré-condição — de onde vêm `person_id` e `org_id`:** o `get_deal_summary` mostra o `person_id` (linha `PESSOA: ... (ID N)`) mas NÃO mostra o `org_id` numérico. Antes desta chamada, rodar:

```
mcp__pipedrive__get_deal({ deal_id })
```

- `person_id` = campo `contato_id` do retorno; `org_id` = campo `empresa_id`. SE o campo vier como objeto → o ID numérico está em `.value`.
- Vale para os DOIS caminhos: fluxo normal (Passo 3 já rodou get_deal_summary) e auditoria passiva (deal lost achado no sweep, que NÃO passou pelo Passo 3) — na auditoria passiva o `get_deal` é a fonte única dos IDs.
- SE `empresa_id` for null (deal sem organização) → OMITIR `org_id` da chamada (parâmetro opcional no MCP). SE `contato_id` for null → OMITIR `person_id`.

Após a escolha do Eric:

```
mcp__pipedrive__create_activity({
  subject: "Retomada pós-perda — {Cadência N}: {primeiro toque do playbook}",
  type: "whatsapp",
  deal_id: <DEAL_ID>,
  person_id: <PERSON_ID>,
  org_id: <ORG_ID>,
  user_id: <USER_ID_ESCOLHIDO>,
  due_date: "<DATA_CALCULADA>",
  note: "<NOTA_HTML — ver Passo 5>",
  force: true
})
```

- `type: "whatsapp"` = canal padrão da cadência (Playbook 16.10–16.12).
- `force: true` é necessário aqui: o deal ainda pode ter pendentes antigas (serão concluídas no Passo 6.5) e o guardrail do MCP bloquearia a criação.
- **NUNCA passar `due_time`** — retomada não tem horário específico (o vendedor escolhe no dia).
- Validar: o retorno deve conter o ID da atividade criada. SE falhar → NÃO seguir para o Passo 7 (não marcar lost sem retomada criada).

### Passo 5 — Nota HTML da atividade

A nota deve conter: (1) mensagem pronta do primeiro toque, (2) resumo do contexto do lead, (3) roadmap completo da cadência (todos os toques — 5 nas Cadências 6/7, 3 na Cadência 8), (4) objeções esperadas pelo motivo de perda (consultar `playbook/Livro_Objecoes_Super_SDR.md`).

Template:

```html
<b>📩 PRIMEIRO TOQUE — {data calculada} (Cadência {N})</b><br><br>

{mensagem do primeiro toque, personalizada — ver Passo 6}<br><br>

<hr>

<h3>🎯 ESTRATÉGIA DE RETOMADA — {Cadência N}</h3>

<b>📊 RESUMO DO LEAD</b><br>
{2-3 linhas: nome, empresa, valor da proposta, etapa quando perdeu, motivo}<br><br>

<b>🌡️ MOTIVO DA PERDA: {motivo}</b><br>
{1 linha sobre o que aconteceu — o que o lead disse, contexto}<br><br>

<b>📅 ROADMAP DA CADÊNCIA</b><br>
{tabela com os toques: dia, canal, ação — copiada do playbook}<br><br>

<b>⚠️ OBJEÇÕES ESPERADAS:</b><br>
1. <b>"{objeção típica do motivo}"</b> → {resposta sugerida do Livro de Objeções}<br>
2. <b>"{objeção 2}"</b> → {resposta}<br><br>

<b>📌 CONTEXTO ADICIONAL:</b><br>
• Última conversa: {data, resumo}<br>
• Histórico de propostas: {valores, etapas anteriores}<br>
• Ferramentas que usa: {lista}<br>
• Link WhatsApp: {wa.me/...}<br>
```

### Passo 6 — Gerar mensagem do primeiro toque

Ler `playbook/Playbook_Vendas_Super_SDR.md`, seção da cadência mapeada (16.10 / 16.11 / 16.12), e usar a coluna "Ação" do **Dia 0** como base. Adaptar com:

- Nome do lead
- Empresa
- Ângulo específico do motivo (ex: "Fora do orçamento" → mencionar mudança de preço/condição comercial; "Contratou outra empresa" → "como está a experiência com a solução que adotaram?")
- Voz do Eric — passar por `mcp__whatsapp-agent__check_message` se a tool estiver disponível

**Princípio:** o vendedor que abrir a atividade na data marcada deve conseguir copiar e colar a mensagem direto, sem pesquisar nada.

### Passo 6.5 — Limpar atividades pendentes do deal (ANTES de marcar perdido)

`mcp__pipedrive__list_deal_activities({ deal_id, done: "0" })` e concluir (`mcp__pipedrive__update_activity({ activity_id, done: true })`) **todas** as pendentes EXCETO a retomada recém-criada. Inclui vencidas antigas, checkpoints de ciclos anteriores e qualquer registro que ficou aberto.

**Invariante de deal perdido: exatamente 1 atividade pendente = a retomada futura.** Deal lost com vencidas penduradas continua na lista de atrasadas do Eric. (Caso real: deal Bruno Lima 10954 ficou lost com 2 vencidas de maio até a auditoria de 12/06.)

### Passo 7 — Marcar deal como perdido

Só DEPOIS de a retomada existir E as pendentes antigas estarem concluídas:

```
mcp__pipedrive__update_deal({ deal_id: <DEAL_ID>, status: "lost", lost_reason: "<motivo>" })
```

`lost_reason` no MCP é enum estrito — usar EXATAMENTE um destes valores: "Parou de responder", "Fora do orçamento", "Adiou contratação", "Mudança de prioridade", "Contratou outra empresa", "Internalizou", "Não é o que buscava", "Ferramenta incompatível / Desqualificado". (Os motivos "Ferramenta incompatível" e "Desqualificado" do playbook correspondem ao MESMO valor combinado da API: `"Ferramenta incompatível / Desqualificado"` — ambos são Cadência 8 / +180d.)

Ordem importa: se marcar perdido primeiro e a criação da retomada falhar, o deal vira zumbi sem retomada.

### Passo 8 — Confirmar pro Eric

```
✅ Lead {Nome} marcado como perdido (motivo: {motivo})
📅 Retomada agendada: {data} ({Cadência N})
👤 Atribuído a: {nome do responsável}
🔗 https://expertintegrado.pipedrive.com/activities/list/...
```

## Edge Cases

- **Registro retroativo ("eu já mandei mensagem pra ele, só registra"):** caso FREQUENTE — Eric responde à apresentação dizendo que já agiu manualmente. Ler o WhatsApp (`mcp__whatsapp-agent__read`) para confirmar conteúdo/data REAL, depois aplicar o Protocolo Anti-Vencida (Passo 7) integralmente: registro com a data real do evento + create→update done + próxima pendente futura + invariante. Registro retroativo que fica pendente vira vencida na hora (data passada).
- **Deal sem telefone no contato:** perguntar ao Eric como contatar.
- **Contato sem histórico no WhatsApp:** pular leitura do WhatsApp, usar só Pipedrive.
- **Múltiplos deals do mesmo contato (ambos abertos):** perguntar ao Eric (raro).
- **Deal que parece morto (sem resposta há 30+ dias):** sinalizar ao Eric, sugerir lost — ao confirmar, acionar o fluxo "Lead Perdido" completo.
- **Deal já lost mas sem atividade futura:** listar todos ao Eric no sweep, com motivo de perda, e propor criação retroativa da retomada (fluxo Lead Perdido do Passo 1 em diante).
- **Deal perdido sem `lost_reason` preenchido:** perguntar ao Eric o motivo antes de criar a retomada (sem motivo não mapeia cadência).
- **Deal perdido com motivo fora da lista canônica:** mapear para "Desqualificado" (+180d) como fallback conservador e sinalizar ao Eric pra revisar.

## Validação final (checklist por sessão de follow-up)

- [ ] Todos os deals apresentados eram do Eric (user_id 17987703) e do funil da vez
- [ ] Nenhuma mensagem foi enviada sem aprovação explícita
- [ ] Toda mensagem enviada passou por `check_message` sem violações pendentes
- [ ] Todo deal tocado fecha a invariante: `list_deal_activities(deal_id, done: "0")` = exatamente 1 pendente futura
- [ ] Todo registro retroativo tem confirmação "Atividade X concluída" do `update_activity`
- [ ] Nenhuma atividade criada com `due_time` vazio ou "00:00"
- [ ] Todo deal marcado lost nesta sessão tem retomada futura criada ANTES do `update_deal status: lost`, com responsável escolhido pelo Eric
- [ ] Deals lost órfãos encontrados no sweep foram listados ao Eric

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---|---|---|
| `create_*`/`update_deal_fields` retorna "This tool has been disabled in your connector settings" | Callback do Claude Desktop bloqueia prefixo `create_*` | Usar `mcp__pipedrive__pipedrive_write({ action: "create_activity", params: {...} })` — mesmos parâmetros |
| `create_activity` retorna "ATIVIDADE PENDENTE EXISTENTE" | Guardrail do MCP: deal já tem pendente | No Passo 7.3: concluir excedentes e repetir. No Lead Perdido Passo 4: usar `force: true` (as antigas serão concluídas no 6.5) |
| Atividade retroativa aparece como vencida | `done` descartado na criação (MCP antigo) ou 2b esquecido | Rodar `update_activity(activity_id, done: true)` — o par create→update é obrigatório sempre |
| Atividade criada aparece vencida à meia-noite | `due_time: ""` ou `"00:00"` foi passado | Recriar/atualizar SEM `due_time` |
| `update_deal` recusa o `lost_reason` | Valor fora do enum estrito do MCP | Usar EXATAMENTE um dos 8 valores da API (ver Lead Perdido, Passo 7) |
| `send` bloqueado por "inbound recente não respondido" | Gate do whatsapp-agent: lead mandou algo há <10 min | Ler a mensagem nova (`read`), reapresentar contexto ao Eric; só usar `force_send_after_inbound: true` após ok explícito dele |
| MCP não resolve nome/ID de vendedor em `user_id` ("Usuário não encontrado") | Vendedor fora do snapshot de usuários do `config.js` (stale ou removido do Pipedrive) | Rodar `mcp__pipedrive__sync_all` (re-sincroniza usuários) e repetir. SE seguir ausente → o erro lista os usuários ativos com IDs; confirmar com o Eric qual usar (não existe tool de listagem de usuários no MCP) |

## Modelo pra Subagente (IGNORAR na execução direta)

Esta seção NÃO faz parte da execução normal da skill — nenhum passo acima a usa. Só se aplica SE o Eric pedir EXPLICITAMENTE para delegar o fup a um subagente (cron ou spawn):

- Modelo: `zai/glm-5-turbo` — é o valor a preencher no campo `model` da configuração do spawn/cron da plataforma onde a delegação for criada. Não é invocado por nenhuma tool desta skill. SE a plataforma da sessão não oferecer esse modelo → confirmar com o Eric antes de delegar (NÃO substituir por outro modelo por conta própria).
- Ferramentas do subagente: Pipedrive MCP + WhatsApp Agent MCP + voice guide
- Não enviar sem aprovação (subagente mostra, Eric aprova no Telegram principal)

---

*Skill v2.1 — Atualizada em 03/07/2026.*

**Changelog:**
- v2.1 (03/07/2026): passe de executabilidade (10 ambiguidades do teste Sonnet), SEM mudança de comportamento: (1) roteamento explícito de "roda o fup" sem funil (todos os funis em sequência na mesma invocação, sem estado persistido, recomeça do Educacional); (2) regra de normalização do telefone Pipedrive → parâmetro `chat`/`to` (só dígitos, prefixo 55, fallback por nome); (3) critérios objetivos de redação + exemplo de mensagem para etapa sem objeção; (4) tabela de origem dos placeholders do template (Empresa = linha `Empresa:` do get_deal_summary); (5) caminho único para "Outro vendedor" (nome literal em `user_id`, MCP resolve); (6) regra "ciclo por DEAL" para múltiplas vencidas (1 mensagem consolidada); (7) playbook/ lido como está em execução — sync é manutenção, nunca roda no fluxo; (8) cálculo determinístico da data (menor valor do intervalo, fim de semana → segunda, feriado não verificado); (9) origem de person_id/org_id via `get_deal` (`contato_id`/`empresa_id`) nos dois caminhos do Lead Perdido + get_deal no allowed-tools; (10) seção Subagente marcada como fora da execução direta.
- v2.0 (02/07/2026): reescrita no padrão Sonnet-executável — tools MCP nomeadas com parâmetros literais, árvores de decisão SE/SENÃO, blocos NUNCA/SEMPRE, checklist de validação final e tabela de erros/recovery. Correções de fato: removida referência a `mcp__pipedrive__list_users` (tool não existe no MCP); documentado o enum estrito de `lost_reason` do `update_deal` ("Ferramenta incompatível / Desqualificado" é valor único da API); motivos canônicos apontados para a seção 5.3 do playbook (não seção 8); documentado que `pipedrive_write` NÃO cobre `update_activity`/`update_deal`; recovery de "Usuário não encontrado" via `sync_all` (Kesia fora do snapshot atual do config). Comportamento, templates, cadências, IDs e voz preservados de v1.2.
- v1.2 (12/06/2026): + Protocolo de Registro Anti-Vencida (concluir vencida → registro create→update done verificado → pendente futura → invariante "1 pendente futura por deal"). Causa: Bug #6 do pipedrive-mcp. + Passo 6.5 no fluxo LOST (concluir pendentes antigas antes de marcar perdido). + edge case "registro retroativo".
- v1.1 (20/05/2026): + tratamento OBRIGATÓRIO de Lead Perdido com retomada (motivo → cadência → data). + pergunta de atribuição (Eric/Kesia/Niverton/outro). + consulta obrigatória ao Livro de Objeções em TODO follow-up com mapa por etapa. + playbook embutido em `playbook/` + script `scripts/sync-playbook.ps1`.
- v1.0 (15/05/2026): versão inicial do follow-up de funis.
