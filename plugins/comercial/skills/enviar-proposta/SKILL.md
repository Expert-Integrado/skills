---
name: enviar-proposta
description: Envia proposta comercial ao lead via WhatsApp pessoal do Eric nas 3 modalidades (mentoria, consultoria/AI Lab, combo), usando as apresentações HTML com preço no lugar dos PDFs antigos, e registra tudo no Pipedrive (atividade concluída, etapa Proposta enviada, follow-up agendado). No combo SEMPRE vão os links das duas apresentações individuais + a do combo. TRIGGER quando o usuário pedir "envia a proposta pro fulano", "manda proposta", "proposta do combo pro X", "manda os programas/apresentações pro lead", "proposta da mentoria/consultoria". NÃO usar para follow-up de proposta já enviada (fup-inteligente), criar lead/deal novo (prospecta-lead), agendar call (calendly-agendar/calendly-link), nem campanha em massa (whatsapp-campanha-*).
allowed-tools: mcp__pipedrive__search_persons, mcp__pipedrive__search_deals, mcp__pipedrive__get_deal, mcp__pipedrive__get_deal_summary, mcp__pipedrive__list_deal_activities, mcp__pipedrive__list_deal_notes, mcp__pipedrive__create_activity, mcp__pipedrive__update_activity, mcp__pipedrive__update_deal, mcp__pipedrive__pipedrive_write, mcp__pipedrive__sync_all, mcp__whatsapp-agent__read, mcp__whatsapp-agent__search, mcp__whatsapp-agent__send, mcp__whatsapp-agent__check_message, mcp__whatsapp-agent__get_voice_guide, mcp__expert-contacts__get_contact_by_phone, mcp__expert-contacts__recall, Read
---

# enviar-proposta — Proposta comercial com apresentações HTML

Envia a proposta ao lead pelo WhatsApp pessoal do Eric na modalidade certa (mentoria, consultoria ou combo), com os links das apresentações HTML (versões COM preço), na voz do Eric, e deixa o Pipedrive redondo: atividade de proposta concluída, deal na etapa "Proposta enviada" e follow-up futuro agendado.

Substitui o fluxo antigo de PDFs do grupo "Arquivos e Documentos" (AI-Innovation-Lab - Proposta_Comercial.pdf + Mentoria Automações Inteligentes.pdf + texto do combo). Se o lead pedir PDF explicitamente, avisar o Eric em vez de improvisar.

## NUNCA

- NUNCA enviar mensagem sem aprovação explícita do Eric na conversa (preview apresentado + OK dele). Sem aprovação = sem envio.
- NUNCA enviar para chat não confirmado: `mcp__whatsapp-agent__read` do chat PRECISA retornar sucesso antes do send. Read falhou = parar e pedir o contato ao Eric, nunca inferir número.
- NUNCA enviar link de versão pública (raiz do domínio, sem preço) como proposta — proposta usa SEMPRE as versões com preço (`/investimento` e o deck do combo).
- NUNCA inventar preço, desconto, bônus ou condição de fechamento. Preços = tabela canônica abaixo. Condição especial (parcelamento diferente, bônus, prazo) só se o Eric ditar NESTA sessão.
- NUNCA alterar mensalidade de produto — regra da empresa: mensalidade nunca muda; alavanca de negociação é setup/bônus/condição de fechamento.
- NUNCA passar `due_time` vazio ou "00:00" em atividade — omitir o campo quando não houver horário.
- NUNCA deixar atividade de registro (proposta JÁ enviada) pendente — nasce com `done: true`.
- NUNCA mover deal de etapa em pipeline que não seja Educacional, SaaS ou Super SDR sem perguntar ao Eric (Prospecção/Parceria não têm etapa "Proposta enviada").
- NUNCA usar em-dash na mensagem, nem `tu/teu`, nem emoji (regras hard do voice guide).

## SEMPRE

- SEMPRE acentuação correta do português em todo texto externo (mensagem, nota, atividade).
- SEMPRE buscar o dossiê do destinatário ANTES de redigir: `mcp__expert-contacts__get_contact_by_phone` (perfil, relação, estrato) + contexto do deal no Pipedrive + últimas mensagens do chat.
- SEMPRE `mcp__whatsapp-agent__get_voice_guide` antes de redigir e `mcp__whatsapp-agent__check_message` no texto final antes de apresentar ao Eric. Violações = corrigir antes de mostrar.
- SEMPRE tratar WhatsApp > Pipedrive em conflito de contexto (a conversa real é a fonte de verdade).
- SEMPRE incluir `https://wa.me/{numero}` no preview e no relatório final.
- SEMPRE fechar com a invariante: deal tocado termina com exatamente 1 atividade pendente, com data futura.
- SEMPRE incluir link clicável do deal no relatório (`https://expertintegrado.pipedrive.com/deal/{id}`).

## Modalidades e material (tabela canônica)

Preços vigentes desde 09/07/2026. Se os decks mudarem, esta tabela precisa acompanhar (fonte de verdade = decks em produção).

### 1. MENTORIA (Mentoria Automações Inteligentes)
- Link: https://automacoesinteligentes.expertintegrado.com.br/investimento
- Investimento: R$30.000/ano, 12x R$2.500

### 2. CONSULTORIA (AI Innovation Lab)
- Link: https://ailab.expertintegrado.com.br/investimento
- Presencial (1 dia na empresa): R$20.000
- Online (2 encontros ao vivo): R$12.000

### 3. COMBO (consultoria + mentoria) — sempre com as duas versões
No combo, a mensagem leva os TRÊS links: as duas apresentações individuais + a do combo.
- https://ailab.expertintegrado.com.br/investimento
- https://automacoesinteligentes.expertintegrado.com.br/investimento
- https://comboai.expertintegrado.com.br (deck "O Caminho Completo", único lugar com preço de combo)
- Lab presencial + Mentoria: de R$50.000 por R$42.000 (12x R$3.500, economia de R$8.000)
- Lab online + Mentoria: de R$42.000 por R$35.400 (12x R$2.950, economia de R$6.600)

Versões públicas (sem preço, para material pré-proposta): raiz dos dois domínios individuais. Só usar se o Eric pedir material sem preço — e aí NÃO é proposta, não move etapa no CRM.

## Fluxo

### Passo 0 — Input
Precisa de: lead (nome, deal ou telefone) + modalidade (mentoria | consultoria | combo). Faltou algo, perguntar UMA vez, objetivo. Condição especial de fechamento (bônus, parcelamento, prazo) só entra se o Eric ditar.

### Passo 1 — Contexto Pipedrive
1. `search_persons` / `search_deals` pelo nome ou telefone; ambíguo = confirmar com o Eric qual deal.
2. `get_deal_summary` + `list_deal_activities` + `list_deal_notes`: pipeline, etapa atual, histórico (reunião feita? proposta anterior? objeções?).
3. Guardar `pipeline_id` e etapa para o Passo 6.

### Passo 2 — Contexto WhatsApp
1. `mcp__whatsapp-agent__search` pelo nome/telefone; `read` do chat (últimas ~20 mensagens). Read OK é pré-condição de envio.
2. `mcp__expert-contacts__get_contact_by_phone` para o dossiê (como o Eric trata a pessoa: Dr., você, primeiro nome).

### Passo 3 — Redigir
Estrutura de referência (padrão validado com Dr. Borges, 30/06/2026):
1. Saudação personalizada no tratamento certo (ex.: "Dr. Borges, foi muito bom falar com o senhor agora há pouco.").
2. Gancho da última interação (call/reunião de ontem, ponto discutido).
3. 1 a 2 esclarecimentos que quebram objeção conhecida do deal (escopo/agenda, prazo), só se houver contexto real.
4. Bloco da modalidade: nome do programa, link da apresentação, investimento. No combo: os três links, com uma linha de narrativa (a consultoria destrava agora, a mentoria acompanha o ano inteiro; o deck do combo conta essa história).
5. Condição de fechamento SE o Eric tiver ditado (prazo, bônus, parcelamento especial).
6. CTA simples ("Qualquer uma das opções, fico à disposição para acertarmos os detalhes.").

Obrigatório: `get_voice_guide` antes, `check_message` depois. Mensagem única (não fatiar em 3+ mensagens); no máximo texto principal + 1 complemento.

### Passo 4 — Aprovação
Apresentar ao Eric: preview da mensagem, modalidade, deal (link), chat de destino (`https://wa.me/{numero}`). Aguardar OK explícito. Ajuste pedido = reeditar e reapresentar.

### Passo 5 — Envio
`mcp__whatsapp-agent__send` no chat confirmado. Falha de envio = reportar erro real, não tentar rota alternativa.

### Passo 6 — Registro no Pipedrive
1. Atividade CONCLUÍDA (`done: true`, tipo `whatsapp`): subject `Proposta enviada — <modalidade> (<detalhe>)`, note = texto enviado. Tool bloqueada ("disabled in your connector settings") = fallback `pipedrive_write({action: "create_activity", ...})`.
2. Mover o deal para "Proposta enviada" do pipeline do deal: Educacional (6) = stage 55; SaaS (1) = stage 20; Super SDR (2) = stage 12. Deal já em etapa igual ou mais avançada (Em negociação, Formalização) = NÃO regredir, só registrar a atividade. Outro pipeline = perguntar.
3. Follow-up futuro (`done: false`, tipo `whatsapp`, sem `due_time`): subject `Follow-up proposta — <nome>`, `due_date` = D+2 úteis (Eric pode ditar outro prazo).
4. Invariante: `list_deal_activities(deal_id, done: "0")` = exatamente 1 pendente, futura.

### Passo 7 — Relatório
Uma mensagem curta: enviado para quem (com wa.me), modalidade, links incluídos, atividade registrada, etapa do deal, follow-up agendado (data), link do deal.

## Condições especiais (histórico, NÃO reutilizar sem OK)
Condições de fechamento anteriores (ex.: Dr. Borges 30/06: 3x sem juros na consultoria, 1 mês extra de mentoria, segunda cadeira no combo, preços antigos 12x R$2.700/R$3.300) são NEGOCIAÇÕES PONTUAIS de outra época. Nunca copiar para lead novo — a base é sempre a tabela canônica + o que o Eric ditar na sessão.
