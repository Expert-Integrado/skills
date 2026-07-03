---
name: verificar-convites
description: Verificar respostas dos convites enviados via WhatsApp para eventos do Eric (Expert Integrado). Lê as conversas dos convidados, classifica como confirmou/recusou/sem resposta, e atualiza status no MCP expert-integrado. TRIGGER quando Eric pedir para verificar respostas, checar convites, ver quem confirmou o evento, ou validar confirmações.
---

# Verificar Respostas de Convites — Expert Integrado

Skill para ler respostas no WhatsApp dos convidados de um evento e atualizar status no MCP expert-integrado.

---

## CONTEXTO

- Após disparar convites (via skill `convidar-evento`), Eric pede verificação periódica
- Participantes com status `convite_enviado` precisam ser checados
- O sistema pode ter auto-confirmado via botão/link, mas Eric quer **confirmação manual** validando a intenção real pela conversa
- Categorias finais: `confirmado`, `recusado`, `sem_resposta`

## PROTOCOLO DE EXECUÇÃO

### Passo 0: Coletar parâmetros
- **evento_id** do MCP expert-integrado
- Quem verificar: default = todos com `convite_enviado` E `convidado_por = "Eric Luciano"`
- Eric pode pedir pra verificar um subconjunto específico

### Passo 1: Listar participantes a verificar
```
mcp__expert-integrado__list_participantes(evento_id=...)
```
Filtrar pelo `convidado_por` desejado (ex: "Eric Luciano") e re-verificar TODOS os status, não só `convite_enviado`/`em_avaliacao`. Já houve caso de status errado (`recusou` que na verdade era `aceitou_convite`) — o skill precisa varrer tudo pra detectar inconsistências.

**ATENÇÃO:** `status_presenca = "confirmado"` é o DEFAULT de cadastro do sistema — todo participante nasce assim. NÃO é sinal de auto-confirmação. Confirmação real por botão aparece no `status` do convite (`confirmado`), não no `status_presenca`.

### Passo 2: Para cada participante, ler conversa no WhatsApp
```
mcp__whatsapp-agent__read(chat=telefone, limit=30)
```
O parâmetro é `chat` (aceita nome, telefone ou chat_id) — NÃO existe parâmetro `phone`.

Se o MCP retornar áudios já transcritos (campo `transcription`), usar o texto direto. Download/transcrição de áudio é responsabilidade do MCP, não dessa skill.

**ATENÇÃO LIDs:** Eric às vezes responde leads num chat LID separado (formato `XXXXXXXX@lid`) que não aparece no read por número. Se a leitura por telefone só trouxer mensagens antigas, rodar `mcp__whatsapp-agent__inbox(since=<últimas 48h>)` ou `search(query=<nome do lead>)` pra achar o LID, então `read(chat=<LID@lid>, limit=30)`.

### Passo 3: Classificar resposta

Analisar as últimas mensagens **do convidado** (não as minhas):

| Classificação | Sinais |
|---------------|--------|
| **confirmado** | "vou", "confirmo", "tô dentro", "beleza", "pode ser", "vamos sim", apertou botão E não recusou depois |
| **recusado** | "não consigo", "não vou", "não dá", "obrigado mas...", "tenho outro compromisso", "fica pra próxima" |
| **escolheu_dia** | Em edição com 2 datas (ex: 28/29 jul), respondeu qual dia prefere ("28", "dia 29", "pode ser terça") — **executar o fluxo PÓS-ESCOLHA da skill `convidar-evento`**: mover pro evento do dia certo se preciso, `gerar_convite_pdf`, enviar PDF + msg do botão, status → `aceitou_convite` |
| **sem_resposta** | Não respondeu nada desde o disparo |
| **em_avaliacao** | Fez pergunta, pediu detalhes, está conversando mas sem decisão final, "acho que dá", "vou tentar", logística pendente — **atualizar status para `em_avaliacao` no MCP e reportar pro Eric responder** |

### Passo 4: Distinguir "não respondeu" de "respondeu noutro chat"
Para os `sem_resposta`, confirmar que a pessoa realmente não respondeu (e não que a resposta veio num chat LID separado — ver atenção LIDs no Passo 2):
```
mcp__whatsapp-agent__inbox(waiting_on="eric", since=<data do disparo>)
```
Se o lead aparecer em `waiting_on="eric"`, ele respondeu e o ciclo está ABERTO — reclassificar.

Observação: o whatsapp-agent NÃO expõe confirmação de leitura (read receipt). `mcp__whatsapp-agent__status` só checa se o WhatsApp está conectado, não diz se uma mensagem foi lida. Não inventar status de leitura — reportar `sem_resposta` como candidato a follow-up e deixar o Eric decidir.

### Passo 4.5: RESPONDER — como montar as respostas (voice do Eric + fatos do evento)

**FATOS = SEMPRE do MCP, NUNCA fixos na skill** (a skill serve a qualquer evento/edição):
```
mcp__expert-integrado__get_evento(evento_id=...)
```
- Datas: `data` das turmas irmãs (mesmo `nome`, status planejamento) — edição pode ter 2 dias
- Local/endereço: `local` + `endereco_completo` | Horário: `hora_inicio`-`hora_fim` | Site: `url_site_vendas`
- **FAQ da edição: campo `observacoes` do evento, bloco `[FAQ-CONVITES]`** — preço do ingresso, formato, política de acompanhante, happy hour etc. É a fonte de verdade do CONTEÚDO das respostas. Se o bloco não existir na edição nova, perguntar os fatos ao Eric e gravá-los lá (`update_evento`).

**VOICE GUIDE É OBRIGATÓRIO:** antes de redigir qualquer resposta fora dos templates abaixo, rodar `mcp__whatsapp-agent__get_voice_guide()` e validar o draft com `mcp__whatsapp-agent__check_message(content=...)`. Regras hard que nunca caem: sem travessão (—), sem hype, chat ativo (<5 min) suprime vocativo, registro informal ("massa/show/top", ".." como respiração), nunca tu/teu/tua.

**Autonomia:** FAQ factual (data, local, horário, preço, formato) e agradecimento de confirmação → PODE responder direto (`confirmed=true`). ESCALAR pro Eric antes de responder: acompanhante/transferência de vaga, objeção de negócio, negociação, tom irritado/negativo.

Templates abaixo: preencher [DATAS], [CIDADE], [LOCAL+ENDEREÇO], [PREÇO], [HORÁRIO] com os fatos do MCP.

**CONFIRMOU ("tô dentro", clicou no botão):**
```
Aeee! Massa demais. Te espero lá então.

Qualquer coisa que precisar antes do evento é só me chamar aqui. Vai ser top!
```

**RECUSOU (educado, sem disponibilidade):** — template validado: resposta real do Eric em maio/2026; o lead reconvidado aceitou na edição seguinte.
```
Tranquilo, [PrimeiroNome]! Obrigado por avisar. Te deixo na lista da próxima edição e te aviso primeiro quando tiver. Abraço!
```

**"QUAL DATA?" / "TEM DATA?":**
```
São duas turmas: [DATAS], aqui em [CIDADE], das [HORÁRIO]. Você escolhe o dia que encaixa melhor.

É só abrir o convite em PDF que te mandei e tocar no botão do dia. Confirma sozinho por lá.
```

**"ONDE VAI SER?":**
```
[LOCAL + ENDEREÇO resumido].

Tem o endereço completo e o mapa dentro do convite também.
```

**"QUANTO CUSTA?" / "É PAGO?":** (preço vem do [FAQ-CONVITES] — falar o valor cheio SEMPRE, ancora o valor da cortesia)
```
Pra você é cortesia, convite meu. O ingresso tá à venda no site por [PREÇO], mas separei alguns convites pra pessoas que eu queria muito lá. Só confirmar no botão do PDF.
```

**"É ONLINE?" / "TEM GRAVAÇÃO?":**
```
É 100% presencial, aqui em [CIDADE]. A proposta é sair com IA implementada de verdade, mão na massa o dia inteiro, com suporte ao vivo. Não tem versão online dessa experiência.
```

**"POSSO LEVAR ALGUÉM?" / "PASSA A VAGA PRO MEU SÓCIO?":** política padrão (ver [FAQ-CONVITES]): cortesia é 1 por empresa; NÃO dá pra levar acompanhante de cortesia; o que EXISTE é conseguir um convite PAGO pra segunda pessoa da mesma empresa. Responder já dando o caminho e ESCALAR pro Eric pra confirmar:
```
A cortesia é uma por empresa, essa eu não consigo desdobrar. O que eu consigo ver é um convite pago pra segunda pessoa, aí vocês vêm juntos. Quer que eu veja?
```
(Escalar pro Eric ANTES de confirmar valor/condição do pago. Transferência da vaga pra OUTRA pessoa da empresa: possível com aprovação do Eric — cadastrar a pessoa nova e gerar o PDF dela.)

**"NÃO CONSIGO NESSES DIAS" (mas demonstrou interesse):**
```
Poxa, que pena! Mas tranquilo. Te coloco na frente da fila da próxima edição então.

Só me confirma que não vai dessa vez pra eu liberar tua vaga pra outra pessoa, beleza?
```

**"VOU VER E TE FALO" (em avaliação):**
```
Fechou! Só não demora muito não que as vagas são limitadas.. me dá um retorno até [dia] que eu seguro a tua até lá.
```

Após CADA resposta enviada: seguir o Passo 5 (status) e o Passo 5.5 (registro no Pipedrive) normalmente.

### Passo 5: Atualizar status no MCP

**Confirmou:**
```
mcp__expert-integrado__update_status_convite(
  participante_id=...,
  novo_status="aceitou_convite"
)
```

**Recusou:**
```
mcp__expert-integrado__update_status_convite(
  participante_id=...,
  novo_status="recusou"
)
```

Valores válidos de novo_status: pendente_envio, convite_enviado, em_avaliacao, aceitou_convite, confirmado, recusou.

**Em avaliação (em conversa, sem decisão final):**
```
mcp__expert-integrado__update_status_convite(
  participante_id=...,
  novo_status="em_avaliacao"
)
```
Reportar pro Eric pra ele decidir o follow-up.

**Sem resposta:** não alterar, apenas reportar.

### Passo 5.5: Registrar desfecho no Pipedrive (regra do Eric, 02/07/2026)

A atividade "Convite enviado, imersão, ..." já foi criada concluída na hora do envio (skill `convidar-evento`). Aqui vale a regra: **TODO contato do funil de convite vira uma atividade de Mensagem de WhatsApp (type="whatsapp") CONCLUÍDA (done=true)** — aceite, recusa, follow-up e encerramento por silêncio. Histórico auditável completo na pessoa.

**Pré-requisito:** achar o `person_id` do lead no Pipedrive.
```
mcp__pipedrive__search_persons(term=<últimos 8 dígitos do telefone>)
# se não achar, tentar pelo nome; se ainda assim não existir, criar:
mcp__pipedrive__create_person(
  name=<nome>,
  phone=<telefone 55XXXXXXXXXXX, só dígitos>,
  owner_id="Eric Luciano"
)
# depois, 1x na vida (NUNCA sobrescrever se já tiver valor):
mcp__pipedrive__update_person(
  person_id=<id>,
  custom_fields='{"Origem do Contato": "INDIC | Direta do Eric"}'
)
```

**ACEITOU/CONFIRMOU — 2 atividades:**
```
# 1) o contato (concluída):
mcp__pipedrive__create_activity(
  subject="Aceitou o convite da imersão",
  type="whatsapp",            # nome visível: Mensagem de WhatsApp
  due_date="<YYYY-MM-DD de hoje>",   # sem due_time
  person_id=<id>, user_id="Eric Luciano",
  note="Confirmou presença via botão do PDF/mensagem. Última msg dele: \"<texto literal, se houver>\".",
  done=true
)
# 2) a reunião do evento (PENDENTE, na data do dia que a pessoa ESCOLHEU — 29 ou 30):
mcp__pipedrive__create_activity(
  subject="Imersão Empresa Inteligente, Empresário Livre",
  type="apresentacao",        # key da API; nome visível: Reunião Geral. NÃO usar "reuniao_geral"
  due_date="<YYYY-MM-DD do dia escolhido>",
  person_id=<id>, user_id="Eric Luciano",
  note="Confirmado na imersão (3ª edição). <contexto adicional se houver>"
)
```

**RECUSOU — 1 atividade (concluída), motivo no note:**
```
mcp__pipedrive__create_activity(
  subject="Recusou o convite da imersão",
  type="whatsapp",
  due_date="<YYYY-MM-DD de hoje>",
  person_id=<id>, user_id="Eric Luciano",
  note="Motivo: <citação literal>. Tom: <positivo/neutro/negativo>. Próxima ação sugerida: <reabordar próxima edição / follow-up 30d / arquivar>.",
  done=true
)
```

**FOLLOW-UP ENVIADO — 1 atividade (concluída) A CADA follow-up:**
```
mcp__pipedrive__create_activity(
  subject="Follow-up do convite da imersão",
  type="whatsapp",
  due_date="<YYYY-MM-DD do follow-up>",
  person_id=<id>, user_id="Eric Luciano",
  note="<qual follow-up: 48h / fechamento de lista / etc. Resumo da mensagem enviada>",
  done=true
)
```

**EM AVALIAÇÃO (respondeu com dúvida/objeção) — 1 atividade (concluída):**
```
mcp__pipedrive__create_activity(
  subject="Em avaliação: convite da imersão",
  type="whatsapp",
  due_date="<YYYY-MM-DD de hoje>",
  person_id=<id>, user_id="Eric Luciano",
  note="Pergunta/objeção: <texto literal>. Aguardando resposta do Eric.",
  done=true
)
```

**SEM RESPOSTA (silencioso):** enquanto o funil está vivo, nada extra (a atividade do envio + follow-ups já registram os touchpoints). **Quando o ERIC mandar desistir** (ele decide o momento), registrar o encerramento:
```
mcp__pipedrive__create_activity(
  subject="Convite da imersão sem resposta, encerrado",
  type="whatsapp",
  due_date="<YYYY-MM-DD do encerramento>",
  person_id=<id>, user_id="Eric Luciano",
  note="Sem resposta após <N> follow-ups. Encerrado por decisão do Eric em <data>. Sugerida reabordagem na próxima edição.",
  done=true
)
```

**Regra geral:** atividade whatsapp concluída = touchpoint auditável (um por contato real). A "Reunião Geral" (type apresentacao) só existe no aceite e fica PENDENTE até o dia do evento. Não criar notas avulsas pra desfecho — o contexto vai no `note` da atividade.

**Quando NÃO registrar:** se `convidado_por != "Eric Luciano"` (outro convidador é dono do touchpoint).

### Passo 6: Relatório pro Eric

Tabela:

| Nome | Classificação | Última mensagem dele | Ação |
|------|---------------|----------------------|------|
| ... | confirmado | "tô dentro" | atualizado pra aceitou_convite |
| ... | em_avaliacao | "tem estacionamento?" | PRECISA SUA RESPOSTA |
| ... | sem_resposta | — | candidato a follow-up |

Separar em blocos:
- **Confirmados** (atualizados pra `aceitou_convite`)
- **Recusados** (atualizados pra `recusou`)
- **Em avaliação** (`em_avaliacao` — precisam resposta do Eric)
- **Sem resposta** (candidatos a follow-up)

---

## FECHAR CICLO DE RESPOSTA (regra de comportamento)

**Objetivo:** nenhum lead fica no vácuo. NÃO é dogma "Eric sempre manda a última msg literal" — é "ninguém pode ficar sem fechamento".

Ao varrer respostas, pra cada conversa decidir se o ciclo está aberto ou fechado:

| Situação | Ciclo | Ação sugerida ao Eric |
|----------|-------|----------------------|
| Lead mandou pergunta, recusa pela 1ª vez, confirmação, áudio explicando algo, dúvida real | **ABERTO** | Sugerir resposta substantiva pra Eric mandar |
| Lead respondeu "ok", "valeu", "obrigado", "beleza" depois que Eric já respondeu | **FECHADO** | Reação 👍❤️🙏 OU silêncio. NÃO forçar mais texto |
| Eric já agradeceu/anotou + lead já agradeceu | **FECHADO** | Nada |
| Lead recusou, Eric ainda não respondeu | **ABERTO** | Sugerir "tranquilo, fica pra próxima, abraço" |
| Lead confirmou, Eric ainda não respondeu | **ABERTO** | Sugerir "show, te vejo lá / equipe entra em contato" |

**Regra de bolso:** se a próxima msg do Eric soaria forçada/redundante ("desliga você primeiro, não, desliga você"), NÃO mandar. Reação ou silêncio com ciclo fechado é melhor que texto vazio.

**Quem executa o fechamento:** esta skill NÃO dispara mensagem automaticamente (ver Regra 1). O agente PROPÕE o fechamento (texto sugerido ou reação) e só executa após Eric confirmar. Reação rápida (`mcp__whatsapp-agent__react`) e texto curto vão pelo whatsapp-agent (WhatsApp PESSOAL do Eric) — nunca por outro canal.

**Se `react` falhar (erro Z-API):** sugerir o fallback de texto curto equivalente ("Combinado!", "Anotado!", "Tranquilo, obrigado!"). NÃO deixar a thread sem fechamento se o lote inteiro recebeu fechamento.

## REGRAS IMPORTANTES

1. **NUNCA responder automaticamente** ao convidado — apenas ler, classificar e SUGERIR resposta pro Eric (Eric envia)
2. **Em caso de dúvida na classificação**, marcar como `em_avaliacao` e pedir ao Eric
3. **Respeitar tom do convidado** — se a pessoa está negociando data/detalhes, NÃO é recusa
4. **Confirmação por botão sem mensagem**: se o `status` do convite mudou pra `confirmado` via botão do PDF mas a pessoa não escreveu nada, reportar como "auto-confirmou (precisa validação)". NÃO usar `status_presenca = confirmado` como sinal — é default de cadastro (vale pra todo mundo)
5. **Paralelizar leituras** quando possível (múltiplos agents)
6. **Não alterar status_presenca se já estava como `confirmado` via botão** sem reação do usuário — apenas reportar
7. **Acentuação correta** em qualquer texto que for mostrado ao Eric
8. **Consistência de fechamento dentro do lote** — se 9 de 10 leads do mesmo grupo (ex: recusados) receberam mensagem de fechamento, o 10º também recebe. Não criar exceção sem motivo claro


## MODO CRON — follow-up recorrente (a skill é a capacidade; o cron é só o gatilho)

Um agendador externo (cron na VPS, scheduled task, etc.) INVOCA esta skill — a skill nunca se agenda sozinha. Prompt típico do cron: *"Rode a skill verificar-convites no evento <id>, modo cron."*

No modo cron, o fluxo é o mesmo (Passos 1-6) com estas regras extras:
1. **Varre todos** os `convite_enviado`/`em_avaliacao` do operador e registra desfechos novos (Passos 5 e 5.5) normalmente.
2. **Monta o lote de follow-up**: sem_resposta com 48h+ desde o envio recebem o template de follow-up (skill convidar-evento). Limite: máx 2 follow-ups por pessoa (o 1º após 48h; o 2º uns 3-4 dias depois). Depois do 2º, a pessoa só sai da fila quando o Eric mandar encerrar (aí registra "Convite sem resposta, encerrado" — Passo 5.5).
3. **NÃO dispara follow-up sozinho.** Envia pro Eric (no canal da instância: Telegram na VPS, chat na sessão local) o RESUMO: novos aceites/recusas registrados + lote de follow-up pronto (nomes + msg). Eric responde "manda" → dispara e registra cada follow-up como atividade no Pipedrive (Passo 5.5). Sem GO, nada sai.
4. Se não houver nada novo nem lote a propor, reportar em 1 linha ("varredura ok, sem novidades") e encerrar.
