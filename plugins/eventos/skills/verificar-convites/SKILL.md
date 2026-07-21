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

## PRÉ-REQUISITOS (checar ANTES do Passo 0)

- MCP `expert-integrado` conectado (tools `mcp__expert-integrado__*`: list_participantes, get_evento, update_status_convite). SE ausente na sessão → PARAR e reportar: "o MCP expert-integrado não está nesta sessão — rodar na máquina/sessão com ele ativo". Sem fallback: os status dos convites vivem só nele.
- MCP `whatsapp-agent` conectado (read/inbox/search — leitura das conversas).
- MCP `pipedrive` conectado (registro de desfecho do Passo 5.5).

## OPERADOR — cada um varre SÓ os próprios leads (regra do Eric, 21/07/2026)

Mesma separação da skill `convidar-evento`: a varredura é DO OPERADOR e cobre exclusivamente os participantes com o `convidado_por_user_id` DELE. **A varredura do Eric NUNCA atualiza status, responde ou registra Pipedrive de lead do Niverton — e vice-versa.** Quem cuida dos leads do Niverton é o Niverton, rodando a própria varredura.

| | ERIC | NIVERTON |
|---|---|---|
| Filtro | `convidado_por_user_id = 5f1aa31e-e159-4638-9699-38a77c0f51cf` | `convidado_por_user_id = a11ad1a5-b40e-4541-8ca5-4df70cab1b07` |
| Leitura de conversa (Passos 2 e 4) | Automática via `whatsapp-agent` | **MANUAL**: não existe whatsapp-agent pro número dele — ele traz as respostas; a skill classifica, atualiza status e registra |
| Confirmações via botão do PDF | Detectadas no MCP (status `confirmado`) | Detectadas no MCP igual — o botão funciona pra qualquer convidado |
| Pipedrive (Passo 5.5) | `user_id="Eric Luciano"` | `user_id="Niverton Menezes"` |
| Modo cron | Sim (VPS do Eric) | Não — varredura manual dele |

## PROTOCOLO DE EXECUÇÃO

### Passo 0: Coletar parâmetros
- **evento_id** do MCP expert-integrado
- **Operador da varredura** (Eric ou Niverton — perguntar se não for óbvio pelo ambiente)
- Quem verificar: default = todos os participantes do OPERADOR (filtro por `convidado_por_user_id`, tabela acima)
- O operador pode pedir pra verificar um subconjunto específico

### Passo 1: Listar participantes a verificar
```
mcp__expert-integrado__list_participantes(evento_id=...)
```
Filtrar pelo `convidado_por_user_id` do OPERADOR (UUIDs na tabela de Operador acima; o campo texto `convidado_por` é só exibição) e re-verificar TODOS os status, não só `convite_enviado`/`em_avaliacao`. Já houve caso de status errado (`recusou` que na verdade era `aceitou_convite`) — o skill precisa varrer tudo pra detectar inconsistências.

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

### Passo 3.7: Antes de cobrar silencioso, conferir que o PDF CHEGOU

Lição 13/07/2026: o disparo pode entregar as mensagens de texto e FALHAR só no PDF (bug de 2 chats/chat fantasma), com a API retornando ok — a pessoa fica "silenciosa" porque nunca recebeu o convite clicável. Antes de classificar `sem_resposta` ou disparar follow-up num lote de silenciosos, auditar no chat de cada um se existe mensagem `message_type=document, from_me=true` desde o disparo. Se NÃO existe: reenviar o PDF (com pedido de desculpa por não ter mandado antes) e zerar a cadência daquela pessoa — ela acabou de receber o convite de verdade.

### Passo 3.8: "Disse que confirmou mas o status não mudou" = suspeitar da página de confirmação

Se o convidado diz que clicou/tentou confirmar e o status no MCP continua `convite_enviado`/`aceitou_convite`, a página de confirmação pode estar quebrada (caso real 13/07/2026: tela branca; corrigida via Lovable, mas o padrão pode voltar). Não insistir pra pessoa "tentar de novo" mais de 1x: confirmar MANUALMENTE — se ela escolheu dia diferente do evento onde está, `add_participante` no evento do dia certo (copiando dados + convidado_por) + `delete_participante` no antigo (exceção à regra de nunca deletar: aqui a pessoa JÁ confirmou por mensagem) e `update_status_convite` → `confirmado`. Reportar o bug pro Eric/time.

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

**VOICE GUIDE É OBRIGATÓRIO (regra do Eric, 03/07/2026):** o convite inicial do disparo é template aprovado, mas TODA conversa de tira-dúvidas/resposta aqui é diálogo real e PRECISA rodar pelo voice guide. Antes de redigir qualquer resposta fora dos templates abaixo, rodar `mcp__whatsapp-agent__get_voice_guide()` e validar o draft com `mcp__whatsapp-agent__check_message(content=...)`. Regras hard que nunca caem: sem travessão (—), sem hype, chat ativo (<5 min) suprime vocativo, registro informal ("massa/show/top", ".." como respiração), nunca tu/teu/tua.

**Autonomia:** FAQ factual (data, local, horário, preço, formato) e agradecimento de confirmação → PODE responder direto (`confirmed=true`). ESCALAR pro Eric antes de responder: acompanhante PAGO (2ª pessoa da mesma empresa), objeção de negócio, negociação, tom irritado/negativo.

**TRANSFERÊNCIA DE CORTESIA PRA INDICADO — PROCESSO OBRIGATÓRIO (Eric, 13/07; reforçado 20/07/2026):** É PROCESSO, não opção: quando a pessoa DEMONSTRA INTERESSE mas a data não fecha (agenda, conflito, logística, custo de passagem, "quero a próxima edição", cirurgia etc.), o agente SEMPRE oferece transferir a cortesia pra alguém indicado por ela ANTES de fechar como `recusou` — nunca fechar essa recusa sem ter feito a oferta: "antes de eu liberar sua vaga, quer passar essa cortesia pra alguém do seu time ou alguém que ia aproveitar bem a imersão? me manda nome, empresa, cargo, email e whats que eu deixo no nome da pessoa".
QUEM NÃO RECEBE A OFERTA (critério do Eric, 20/07/2026):
- `sem_resposta` (nunca respondeu) → segue a régua de follow-up normal, sem oferta de transferência;
- recusa por DESINTERESSE no tipo de conteúdo ("não é pra mim", "não curto o tema", recusa seca sem justificativa de data) → fechamento direto, sem oferta;
- caso pessoal delicado (luto, doença na família) ou quando a pessoa já disse que ninguém iria.
Se topar → status `em_avaliacao` (ciclo aberto aguardando dados do indicado); quando os dados chegarem → cadastrar a pessoa nova (`add_participante` com `convidado_por` do operador), gerar PDF e enviar, e marcar o original como `recusou`.
> **Por que virou obrigatório (20/07/2026):** o template de fechamento/follow-up dizia só "me avisa que passo a vaga pra frente" (o ERIC realoca) e nunca perguntava se a PRÓPRIA pessoa queria indicar alguém. Resultado: vagas fechadas como recusa sem aproveitar a indicação quente de quem confia no Eric. A pergunta da transferência vem ANTES do template de fechamento abaixo.

Templates abaixo: preencher [DATAS], [CIDADE], [LOCAL+ENDEREÇO], [PREÇO], [HORÁRIO] com os fatos do MCP.

**CONFIRMOU / TOPOU:** ANTES de responder, RECHEQUE no MCP o status REAL dela (ver REGRA DE FECHAMENTO no Passo 5). Aceite verbal NÃO é confirmação.
- Se já está `confirmado` (clicou o botão, dia definido):
```
Aeee! Massa demais. Te espero lá então.

Qualquer coisa que precisar antes do evento é só me chamar aqui. Vai ser top!
```
- Se só topou VERBALMENTE (status ainda `aceitou_convite`/`convite_enviado`, não clicou o botão): comemora E cobra o botão pra fechar de fato:
```
Boa demais! Vai ser top te ter lá.

Só falta um passo: toca no botão do dia que encaixa (29 ou 30) ali dentro do convite em PDF, que aí sua vaga fica garantida de verdade. Me avisa qual dia vc escolheu!
```

**RECUSOU (educado, sem disponibilidade):** — base validada em maio/2026; ajustada 13/07/2026: o voice guide passou a marcar "Obrigado por avisar" como ritual de fechamento (violação low) — não usar.
PASSO 1 OBRIGATÓRIO (salvo exceções do bloco TRANSFERÊNCIA acima): oferecer passar a cortesia pra um indicado. Só DEPOIS que a pessoa declinar a indicação (ou nas exceções) usar o template de fechamento abaixo:
```
Tranquilo, [PrimeiroNome]! Te deixo na lista da próxima edição e te aviso primeiro quando tiver. Abraço!
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

Valores válidos de novo_status: pendente_envio, convite_enviado, em_avaliacao, aceitou_convite, confirmado, recusou, sem_resposta.

> **`sem_resposta` vs `recusou` (status criado 13/07/2026):** `recusou` = recusa EXPLÍCITA (a pessoa disse não). `sem_resposta` = silêncio após a cadência completa (3 toques: convite + FUP 48h + FUP última chamada). NUNCA marcar recusou por silêncio — silêncio vai pra `sem_resposta`. Nos dois casos o botão/PDF continua vivo: se a pessoa clicar depois, o fluxo de confirmação segue funcionando e vira `confirmado`.

> **REGRA DE FECHAMENTO — aceite verbal NÃO é confirmação (regra do Eric, 03/07/2026):** `confirmado` no MCP = a pessoa CLICOU o botão do dia no PDF (escolheu 29 ou 30, entrou na turma) = fechamento REAL. `aceitou_convite` = ela só DISSE que vai. **O fechamento é o clique, não a palavra.** Então SEMPRE que alguém confirmar/topar:
> 1. RECHECA no MCP (`list_participantes` do evento, filtra pela pessoa) qual o status REAL dela.
> 2. Se já está `confirmado` (botão apertado, dia definido) → beleza, só comemora.
> 3. Se está só `aceitou_convite`/`convite_enviado` (não apertou o botão) → deixa EXPLÍCITO na resposta que ela precisa TOCAR NO BOTÃO do dia (29 ou 30) dentro do PDF pra garantir a vaga de verdade (usar o 2º template de CONFIRMOU). Não deixar morrer no "vou sim" verbal.
> Vale desde a 1ª resposta, pra garantir o fechamento no sistema (a presença real), não só a intenção. Quando rodar em modo rechecagem/cron: varrer os `aceitou_convite` que ainda NÃO viraram `confirmado` e cobrar o botão de cada um.

**Em avaliação (em conversa, sem decisão final):**
```
mcp__expert-integrado__update_status_convite(
  participante_id=...,
  novo_status="em_avaliacao"
)
```
Reportar pro Eric pra ele decidir o follow-up.

**Sem resposta:** enquanto a cadência está viva (ainda faltam toques), não alterar — apenas reportar. **Cadência esgotada (3 toques) e Eric mandou encerrar → `sem_resposta`** (libera a vaga no funil sem virar recusa; botão segue vivo).

> **AUDITORIA OBRIGATÓRIA antes de encerrar em massa (lição 13/07/2026):** antes de marcar um lote como `sem_resposta`, LER o chat de CADA um e conferir que não há inbound desde o convite. A flag "não respondeu" de script de follow-up NÃO basta: no lote de 26 "mudos" da 3ª edição, 2 tinham respondido em chat/momento que o script perdeu — 1 tinha RECUSADO (luto, levou follow-up indevido por cima) e 1 tinha dito "acho que vou dia 30" (era em_avaliacao). Silêncio só é silêncio depois de auditado.

### Passo 5.5: Registrar desfecho no Pipedrive (regra do Eric, 02/07/2026)

A atividade "Convite enviado, imersão, ..." já foi criada concluída na hora do envio (skill `convidar-evento`). Aqui vale a regra: **TODO contato do funil de convite vira uma atividade de Mensagem de WhatsApp (type="whatsapp") CONCLUÍDA (done=true)** — aceite, recusa, follow-up e encerramento por silêncio. Histórico auditável completo na pessoa.

> **SYNC EVENTO → CRM (regra do Eric, 17/07/2026):** o formulário do botão coleta nome, email, empresa e cidade — e esse dado NÃO chega sozinho no Pipedrive. Ao detectar participante `confirmado` (ou qualquer um com email/empresa novos no sistema do evento), **enriquecer a pessoa no Pipedrive na mesma passada**: preencher email e empresa/organização que estiverem VAZIOS no CRM com o que o evento coletou. NUNCA sobrescrever campo já preenchido (mesmo divergente — divergência é só reportar). Pessoa inexistente no Pipedrive: não criar automaticamente no sync; listar no relatório pro operador decidir. Não pedir esses dados por mensagem ao convidado — o formulário já coleta; pedir é fricção.

**Pré-requisito:** achar o `person_id` do lead no Pipedrive.
```
mcp__pipedrive__search_persons(term=<últimos 8 dígitos do telefone>)
# se não achar, tentar pelo nome; se ainda assim não existir, criar:
mcp__pipedrive__create_person(
  name=<nome>,
  phone=<telefone 55XXXXXXXXXXX, só dígitos>,
  owner_id="<operador: Eric Luciano | Niverton Menezes>"
)
# depois, 1x na vida (NUNCA sobrescrever se já tiver valor):
mcp__pipedrive__update_person(
  person_id=<id>,
  custom_fields='{"Origem do Contato": "INDIC | Direta do Eric"}'
)
# "Origem do Contato" acima é do fluxo do ERIC. Na varredura do Niverton, confirmar a origem com ele antes de preencher.
```

**ACEITOU/CONFIRMOU — 2 atividades:**
```
# 1) o contato (concluída):
mcp__pipedrive__create_activity(
  subject="Aceitou o convite da imersão",
  type="whatsapp",            # nome visível: Mensagem de WhatsApp
  due_date="<YYYY-MM-DD de hoje>",   # sem due_time
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
  note="Confirmou presença via botão do PDF/mensagem. Última msg dele: \"<texto literal, se houver>\".",
  done=true
)
# 2) a reunião do evento (PENDENTE, na data do dia que a pessoa ESCOLHEU — 29 ou 30):
mcp__pipedrive__create_activity(
  subject="Imersão Empresa Inteligente, Empresário Livre",
  type="apresentacao",        # key da API; nome visível: Reunião Geral. NÃO usar "reuniao_geral"
  due_date="<YYYY-MM-DD do dia escolhido>",
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
  note="Confirmado na imersão (3ª edição). <contexto adicional se houver>"
)
```

**RECUSOU — 1 atividade (concluída), motivo no note:**
```
mcp__pipedrive__create_activity(
  subject="Recusou o convite da imersão",
  type="whatsapp",
  due_date="<YYYY-MM-DD de hoje>",
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
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
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
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
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
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
  person_id=<id>, user_id="<operador: Eric Luciano | Niverton Menezes>",
  note="Sem resposta após <N> follow-ups. Encerrado por decisão do Eric em <data>. Sugerida reabordagem na próxima edição.",
  done=true
)
```

**Regra geral:** atividade whatsapp concluída = touchpoint auditável (um por contato real). A "Reunião Geral" (type apresentacao) só existe no aceite e fica PENDENTE até o dia do evento. Não criar notas avulsas pra desfecho — o contexto vai no `note` da atividade.

**Quando NÃO registrar:** se o participante NÃO é do operador da varredura (`convidado_por_user_id` do outro). O outro convidador é dono do touchpoint e registra na varredura DELE, com o `user_id` dele — nunca registrar em nome do outro. (Regra do Eric, 21/07/2026: cada um cuida dos seus leads.)

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
9. **Pendência ligada a CONVIDADO nunca vira tarefa no board do evento (regra Eric, 19/07/2026)** — acompanhante a definir, substituto, sócio sem nome, dado de cadastro faltando etc. ficam registrados NO PARTICIPANTE (`update_participante` com a pendência nas observações, + status de convite adequado). O board de tarefas (`add_tarefa`) é exclusivo de produção/logística do evento (fornecedores, materiais, comunicação, agenda)


## MODO CRON — follow-up recorrente (a skill é a capacidade; o cron é só o gatilho)

Um agendador externo (cron na VPS, scheduled task, etc.) INVOCA esta skill — a skill nunca se agenda sozinha. Prompt típico do cron: *"Rode a skill verificar-convites no evento <id>, modo cron."*

No modo cron, o fluxo é o mesmo (Passos 1-6) com estas regras extras:
1. **Varre todos** os `convite_enviado`/`em_avaliacao` do operador e registra desfechos novos (Passos 5 e 5.5) normalmente.
2. **Monta o lote de follow-up**: sem_resposta com 48h+ desde o envio recebem o template de follow-up (skill convidar-evento). Limite: máx 2 follow-ups por pessoa (o 1º após 48h; o 2º "última chamada" uns 3-4 dias depois) = cadência total de 3 toques. Depois do 2º follow-up, a pessoa só sai da fila quando o Eric mandar encerrar — aí: auditoria de inbound (ver Passo 5), status → `sem_resposta` no MCP (NÃO recusou) e registra "Convite sem resposta, encerrado" no Pipedrive (Passo 5.5). Não mandar "só mais uma" depois da última chamada: queima a credibilidade do fechamento de lista.
3. **NÃO dispara follow-up sozinho.** Envia pro Eric (no canal da instância: Telegram na VPS, chat na sessão local) o RESUMO: novos aceites/recusas registrados + lote de follow-up pronto (nomes + msg). Eric responde "manda" → dispara e registra cada follow-up como atividade no Pipedrive (Passo 5.5). Sem GO, nada sai.
4. Se não houver nada novo nem lote a propor, reportar em 1 linha ("varredura ok, sem novidades") e encerrar.
