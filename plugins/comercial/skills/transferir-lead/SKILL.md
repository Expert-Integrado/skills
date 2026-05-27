---
name: transferir-lead
description: Processa UM lead com quem o Eric ja tem historico no WhatsApp pessoal e passa pro vendedor responsavel agir HOJE. Le o historico do chat (transcreve audios), extrai contexto (empresa, dor, origem), cadastra/atualiza pessoa+deal no Pipedrive com TODOS os campos personalizados preenchidos, atribui ao vendedor, cria atividade DONE da conversa com o Eric + 1 atividade pendente pro vendedor pro MESMO DIA, e dispara mensagem no WhatsApp corporativo do vendedor com 🔥 NOVO LEAD + link do deal + link wa.me do lead. TRIGGER quando usuario pedir "transfere o lead X pro vendedor Y", "passa lead pro Niverton", "cadastra a conversa do WhatsApp e manda pro vendedor", ou "cria deal do {nome} e atribui pro {vendedor}".
---

# Transferir Lead — converter conversa WhatsApp pessoal em deal qualificado pro vendedor (v1.0)

Skill atomica: processa UM lead por vez. Entrada e uma pessoa com quem o Eric JA TROCOU mensagem no WhatsApp pessoal (G4, evento, indicacao, palestra, etc.). Saida e o vendedor recebendo o lead no Pipedrive + ping no WhatsApp corporativo dele com tudo mastigado pra agir HOJE.

> **Diferenca pra `prospecta-lead`:** aquela e pra lead FRIO (cold/lista/evento sem conversa). Esta aqui exige HISTORICO no WhatsApp pessoal como input principal.

---

## INPUT OBRIGATORIO

Dois parametros obrigatorios. Se faltar qualquer um, a skill PERGUNTA ao Eric antes de prosseguir.

| Parametro | Descricao | Exemplo |
|---|---|---|
| `lead` | Nome ou telefone do lead que tem historico no WhatsApp pessoal do Eric | "Thiago Paukoski" / "5511991296273" |
| `pipeline` | Pipeline destino no Pipedrive | "Educacional" / "Super SDR" / "SaaS" / "Prospeccao" |
| `vendedor` | Nome do vendedor que vai assumir | "Niverton" / "Eric Luciano" |

**NAO inferir pipeline.** O Eric tem 6 pipelines e a mesma conversa pode caber em mais de um. Sempre perguntar se nao vier.

**NAO inferir vendedor.** Mesmo Niverton sendo o default historico, exigir parametro explicito.

### Fluxo de perguntas

Se Eric passou so o nome do lead:
```
Skill: "Pra qual pipeline (Educacional / Super SDR / SaaS / Prospeccao / Parceria / Black Friday)?"
Eric: "Educacional"
Skill: "Qual vendedor assume? (Niverton / outro nome)"
Eric: "Niverton"
```

So depois de ter os 3 parametros, comeca a execucao.

---

## ETAPA INICIAL OBRIGATORIA

**SEMPRE colocar o deal na PRIMEIRA etapa do pipeline destino** (a etapa que representa "sem contato ainda do vendedor"). E o vendedor que move conforme avanca:

| Pipeline | Etapa inicial obrigatoria |
|---|---|
| Educacional | "Contato Realizado" (id 113) ou equivalente "primeiro contato" |
| Super SDR | "Tentando contato" |
| SaaS | "Tentando contato" |
| Prospeccao | "Lead Mapeado" |

A skill NUNCA deve criar o deal ja em "Aguardando agendamento" ou "Proposta enviada" — isso e responsabilidade do vendedor mover apos contato real.

Razao: a metrica do vendedor depende DELE mover a etapa. Skill criando ja avancado tira accountability e contamina relatorio.

---

## FLUXO COMPLETO

### Passo 1 — Localizar e ler historico do WhatsApp

```
mcp__whatsapp-agent__search(query={ultimos 8 digitos do telefone})
```

Regra: sempre buscar pelos 8 ultimos digitos (memoria `feedback_whatsapp_search_last8.md`). WhatsApp normaliza com/sem o 9 do celular.

Depois:
```
mcp__whatsapp-agent__read(chat_id=<resultado>, limit=50)
```

**Transcrever todos os audios** (ptt/audio) via OpenAI Whisper API antes de analisar (memoria `feedback_whatsapp_audio_transcribe.md`). Audios geralmente carregam o contexto-chave da indicacao/origem.

### Passo 2 — Extrair contexto

Da leitura do historico, extrair:

| Dimensao | O que extrair |
|---|---|
| Nome completo | Como o lead se identificou na conversa, ou nome do contato no WhatsApp |
| Empresa | Mencionada na conversa ou inferida do email/dominio |
| Cargo | Mencionado na conversa |
| Dor/desafio | O problema que o lead trouxe ou que Eric identificou |
| Origem | G4 Scale / G4 Educacao / Imersao / Evento X / Indicacao direta de Y |
| Detalhes da origem | Data do evento, nome de quem indicou, contexto especifico |
| Setor/segmento | Inferido da empresa |
| Volume/tamanho | Se mencionado (faturamento, tamanho do time, etc.) |
| Maturidade IA | Se ja tem time interno, automacoes rodando, etc. |
| Engajamento na conversa | Tom (formal/informal), latencia das respostas, tempo total |

### Passo 3 — Cadastrar/atualizar pessoa no Pipedrive

```
mcp__pipedrive__search_persons(term={nome ou telefone})
```

Se existir:
- Atualizar campos personalizados que estiverem vazios
- NUNCA sobrescrever (sem `force=true`)

Se NAO existir:
```
mcp__pipedrive__create_person({
  name, phone, email (se tiver), 
  origem_contato: extraida do passo 2,
  detalhes_origem: extraida do passo 2,
  link_chat_central: <url do chat WhatsApp>
})
```

### Passo 4 — Criar deal

```
mcp__pipedrive__create_deal({
  title: "{Nome} - {Empresa}",
  person_id: <id do passo 3>,
  pipeline_id: {param pipeline},
  stage_id: {primeira etapa do pipeline — NUNCA pular},
  status: "open",
  user_id: {param vendedor}
})
```

Depois:
```
mcp__pipedrive__update_deal_fields({
  deal_id,
  custom_fields: {
    "Origem da Oportunidade": "INDIC|EVENTO|...",
    "Detalhes da origem da oportunidade": "{data + contexto}",
    "Segmento": "{setor}",
    "Cargo": "{cargo}",
    "Dores": "{dor extraida}",
    "Responsavel por agendar a reuniao": {user_id vendedor},
    ... todos os campos relevantes que conseguiu extrair
  }
})
```

**Regra:** preencher o MAXIMO de campos personalizados possivel — o vendedor precisa abrir o deal e ja ter contexto pra ligar, sem ter que perguntar o basico de novo pro lead.

### Passo 5 — Nota com resumo Feynman

```
mcp__pipedrive__create_note({
  deal_id,
  content: `<p><b>Resumo do historico WhatsApp Eric ↔ {Nome}:</b></p>
            <ul>
            <li>Data primeira interacao: {data}</li>
            <li>Origem: {origem detalhada}</li>
            <li>Contexto: {1 paragrafo Feynman}</li>
            <li>Dor levantada: {dor}</li>
            <li>Ultimo ponto: {o que ficou aberto}</li>
            </ul>
            <p>Link do chat: {url}</p>`
})
```

### Passo 6 — Atividade DONE representando a conversa do Eric

```
mcp__pipedrive__create_activity({
  deal_id,
  person_id,
  subject: "Conversa Eric ↔ {Nome} (WhatsApp pessoal)",
  type: "whatsapp",
  due_date: {data da ultima mensagem},
  done: true,
  user_id: "Eric Luciano",
  note: "{resumo curto do que rolou}"
})
```

### Passo 7 — Atividade pendente pro vendedor — MESMO DIA

```
mcp__pipedrive__create_activity({
  deal_id,
  person_id,
  subject: "Ligar/WhatsApp {Nome} - lead transferido do Eric",
  type: "call",
  due_date: hoje,
  due_time: proximo horario comercial (09:00 se for manha, +2h se ja for dia)
  duration: 30,
  user_id: {param vendedor},
  note: "Lead transferido pelo Eric via WhatsApp pessoal. Contexto na nota e nos campos.",
  force: true
})
```

### Passo 8 — Notificar vendedor no WhatsApp corporativo

Buscar telefone corporativo do vendedor (memoria/Brain):
- Niverton: `5581985325551` (memoria `feedback_whatsapp_niverton_corporativo.md` ou Brain)

Template da mensagem (validar com `mcp__whatsapp-agent__check_message` antes):

```
🔥 *NOVO LEAD*

{Nome Completo} — {Empresa}
{url_pipedrive}

{1 frase do contexto/dor extraida}
Origem: {origem} | Pipeline: {pipeline}

https://wa.me/{numero_sem_+}
```

ORDEM OBRIGATORIA das linhas:
1. Header `🔥 *NOVO LEAD*`
2. Nome + empresa
3. **Link do deal no Pipedrive (sempre logo apos o nome — Eric quer ver primeiro)**
4. Linha em branco
5. Descricao/contexto (1 frase) + origem/pipeline
6. Linha em branco
7. Link `wa.me` do lead

NUNCA mover o link do deal pra depois da descricao — o vendedor precisa do CRM primeiro pra contextualizar antes de ler.

Enviar:
```
mcp__whatsapp-agent__send({
  to: {telefone corporativo do vendedor},
  content: {template acima},
  confirmed: true
})
```

### Passo 9 — Reportar ao Eric

Mensagem de fechamento pro Eric (Telegram ou texto):

```
Lead {Nome} transferido pro {vendedor}:

- Pessoa: {url_pipedrive_pessoa}
- Deal: {url_pipedrive_deal} ({pipeline} / etapa inicial)
- Atividade pendente {vendedor}: hoje {hora}
- WA corporativo {vendedor}: enviado ✅
- WhatsApp do lead: https://wa.me/{numero}

Resumo do contexto: {1 frase}
```

Sempre incluir o link wa.me do lead embaixo pro Eric clicar caso queira acompanhar (memoria `feedback_whatsapp_link_wame.md`).

---

## VOICE GUIDE — mensagem pro vendedor

A mensagem pro vendedor corporativo NAO precisa seguir o voice guide do Eric (tom de pessoa-fisica) — ela e operacional, time-interno. Mas tem regras proprias:

- Comecar com 🔥 *NOVO LEAD* em negrito
- Linha 2: Nome + empresa
- Linha 3: URL do deal Pipedrive (vem ANTES da descricao — Eric quer ver primeiro)
- Bloco descricao: 1 frase de contexto + origem + pipeline
- Ultima linha: link `wa.me` do lead
- NUNCA mais de 8 linhas

---

## ERROS COMUNS E COMO EVITAR

| Erro | Como evitar |
|---|---|
| Criar deal ja em "Aguardando agendamento" | Sempre primeira etapa do pipeline; vendedor move |
| Inferir pipeline sem perguntar | Sempre parametro obrigatorio |
| Esquecer de transcrever audios | Whisper API em todo ptt/audio antes de analisar |
| Pessoa duplicada | search_persons com nome + telefone; se >1 resultado, cruzar dados |
| Sobrescrever campo ja preenchido | Nunca passar `force=true` sem confirmacao explicita |
| Mensagem pro vendedor sem link wa.me | Template obrigatorio inclui link |
| Esquecer atividade pendente vendedor hoje | Passo 7 nao e opcional |
| Esquecer notificar vendedor | Passo 8 nao e opcional — WhatsApp corporativo |

---

## OUTPUT FINAL

Toda execucao retorna:

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

---

## REFERENCIAS

- Skill `prospecta-lead` (lead frio sem historico) — `plugins/comercial/skills/prospecta-lead/`
- Voice Guide v1.4 do Eric — Brain nota `yasak98uo4z4`
- Diretriz CRM — `Processo Comercial/Campanha de retomada de leads/Diretriz_Preenchimento_CRM.md`
- Memoria `feedback_whatsapp_search_last8.md` — buscar pelos 8 ultimos digitos
- Memoria `feedback_whatsapp_audio_transcribe.md` — transcrever audios antes de analisar
- Memoria `feedback_whatsapp_link_wame.md` — sempre incluir link wa.me no report
- Brain nota `lhu4g220l66h` — desambiguacao WhatsApp vs ChatGuru (vendedor corporativo SEMPRE chatguru? Nao — este caso usa whatsapp-agent pessoal pq o destinatario e funcionario, nao cliente externo. ChatGuru e pra clientes da Expert.)
- Validado empiricamente em 27/05/2026 com Thiago Paukoski (Grupo X-Method) — pipeline Educacional, vendedor Niverton.
