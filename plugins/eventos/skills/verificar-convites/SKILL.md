---
name: verificar-convites
description: >-
  Verifica as respostas dos convites de evento enviados pelo WhatsApp pessoal do Eric (Expert Integrado). Le a conversa de cada convidado, classifica em confirmado/recusou/em avaliacao/sem resposta, atualiza o status no MCP expert-integrado e registra o desfecho no Pipedrive. NAO dispara mensagem sozinha — sempre PROPOE a resposta/fechamento e so envia apos GO do Eric.
  TRIGGER quando Eric pedir "verificar convites", "checar respostas dos convites", "quem confirmou o evento", "validar confirmacoes", ou quando um cron invocar com "modo cron".
  NAO disparar para: enviar os convites (isso e a skill convidar-evento), criar/editar deal isolado no Pipedrive, ou agendar call com lead.
allowed-tools:
  - mcp__expert-integrado__list_participantes
  - mcp__expert-integrado__list_eventos
  - mcp__expert-integrado__get_evento
  - mcp__expert-integrado__update_status_convite
  - mcp__whatsapp-agent__read
  - mcp__whatsapp-agent__inbox
  - mcp__whatsapp-agent__search
  - mcp__whatsapp-agent__get_voice_guide
  - mcp__whatsapp-agent__check_message
  - mcp__whatsapp-agent__send
  - mcp__whatsapp-agent__react
  - mcp__whatsapp-agent__status
  - mcp__pipedrive__search_persons
  - mcp__pipedrive__create_person
  - mcp__pipedrive__update_person
  - mcp__pipedrive__create_activity
  - mcp__pipedrive__pipedrive_write
---

# Verificar Respostas de Convites — Expert Integrado

Le no WhatsApp pessoal do Eric a resposta de cada convidado de um evento, classifica (confirmado / recusou / em avaliacao / sem resposta), atualiza o status no MCP expert-integrado, registra cada touchpoint como atividade CONCLUIDA no Pipedrive e PROPOE ao Eric a resposta ou o fechamento de ciclo. Esta skill nunca dispara mensagem sozinha: ela le, classifica, sugere; o Eric da o GO e so entao ela envia pelo whatsapp-agent (WhatsApp PESSOAL do Eric). Serve a qualquer edicao do evento — todos os fatos (datas, local, preco, FAQ) vem do MCP, nunca fixos aqui.

## NUNCA

- NUNCA responder ou disparar mensagem ao convidado automaticamente. Sempre PROPOR o texto/reacao e enviar so apos o Eric confirmar ("manda"/GO).
- NUNCA usar o parametro `phone` no `mcp__whatsapp-agent__read` — o parametro e `chat` (aceita nome, telefone ou chat_id).
- NUNCA inventar status de leitura ("visto/entregue"): o whatsapp-agent NAO expoe read receipt. `status` so diz se o WhatsApp esta conectado.
- NUNCA passar `due_time` vazio ("" ou "00:00") em `create_activity` — omitir o campo se nao houver horario, senao o Pipedrive marca a atividade como vencida.
- NUNCA usar `type="reuniao_geral"` no Pipedrive — a key correta da API e `type="apresentacao"` (nome visivel: Reuniao Geral). `type="meeting"` mapeia para NO-SHOW.
- NUNCA sobrescrever "Origem do Contato" de uma pessoa que ja tem valor no Pipedrive (preenchido 1x na vida).
- NUNCA registrar atividade no Pipedrive quando o participante nao e do Eric — criterio: `participante.convidado_por_user_id != "5f1aa31e-e159-4638-9699-38a77c0f51cf"` (outro convidador e dono do touchpoint).
- NUNCA usar travessao (—), hype ou tratamento tu/teu/tua nas mensagens externas (regras hard do voice guide do Eric).

## SEMPRE

- SEMPRE re-verificar TODOS os status dos participantes filtrados, nao so `convite_enviado`/`em_avaliacao` — ja houve status errado gravado (`recusou` que era `aceitou_convite`).
- SEMPRE puxar os FATOS do evento (`get_evento`) antes de redigir qualquer resposta com data/local/preco. Fatos NUNCA ficam fixos na skill.
- SEMPRE rodar `get_voice_guide()` + validar com `check_message(content=...)` antes de redigir resposta fora dos templates deste arquivo.
- SEMPRE usar acentuacao correta do portugues em qualquer texto mostrado ao Eric ou enviado ao convidado.
- SEMPRE registrar cada contato real do funil de convite (aceite, recusa, follow-up, em avaliacao, encerramento) como atividade `type="whatsapp"` CONCLUIDA (`done=true`) no Pipedrive — historico auditavel.
- SEMPRE fechar o ciclo de cada conversa (resposta substantiva OU reacao OU silencio deliberado) — ninguem fica no vacuo.

## Pre-requisitos

- **MCPs necessarios:** `expert-integrado` (participantes/evento/status), `whatsapp-agent` (leitura/envio no WhatsApp PESSOAL do Eric), `pipedrive` (registro de touchpoints).
- **Parametros de entrada:**
  - `evento_id` (obrigatorio) — string UUID do MCP expert-integrado. Como obter, nesta ordem:
    1. SE o Eric passou o `evento_id` literal (string UUID) → usar direto, sem `list_eventos`.
    2. SENAO (o Eric descreveu o evento por texto, ex: "imersao de julho", "a imersao", "o evento do dia 29") → rodar `mcp__expert-integrado__list_eventos()` e casar a descricao contra o campo `nome` (e `data`, quando o Eric citou dia/mes) dos eventos retornados.
       - **Exatamente 1 evento casa a descricao** → usar o `id` dele.
       - **2 ou mais eventos casam** (ex: edicao com 2 turmas irmas dia 29 e dia 30, ambas "imersao de julho") → **NAO escolher sozinho, NAO chutar.** Listar os candidatos pro Eric (`nome` + `data` + `id` de cada) e PERGUNTAR qual (ou se e para verificar todos). So seguir apos a resposta do Eric.
       - **Nenhum evento casa** → reportar "nao achei evento que bata com '<descricao>'" + listar os eventos disponiveis (`nome` + `data`) e PERGUNTAR qual e.
    3. SE o Eric nao informou NADA (nem id nem descricao) → rodar `list_eventos`, mostrar a lista (`nome` + `data` + `id`) e PERGUNTAR qual verificar.
  - `convidado_por` (default Eric) — filtra quem verificar. Eric pode pedir um subconjunto especifico. **O filtro real e por `convidado_por_user_id` (UUID), NUNCA pelo texto** (ver Passo 1). Resolver o nome do convidador para o UUID assim, nesta ordem:
    1. **UUIDs ja documentados** (fonte: skill `convidar-evento` do mesmo plugin — conferir os valores completos la): Eric = `5f1aa31e-e159-4638-9699-38a77c0f51cf`, Niverton = `a11ad1a5-b40e-4541-8ca5-4df70cab1b07`.
    2. **Convidador fora dessa lista** (ou em duvida sobre o UUID) → resolver via `mcp__expert-integrado__list_vendedores()` (retorna `user_id` + `nome` de cada membro da equipe) e casar o nome para pegar o `user_id`. Nunca chutar UUID.
- **Fuso:** America/Sao_Paulo (BRT, UTC-3). Datas `due_date` no formato `YYYY-MM-DD`.
- **Schema do participante (retorno de `list_participantes`) — campos usados por esta skill:**
  - `id` (string UUID) — o `participante_id` passado em `update_status_convite` e `gerar_convite_pdf`.
  - `nome` (string) — nome completo do convidado.
  - `telefone` (string) — telefone no formato E.164 sem `+`: `55` + DDD (2 digitos) + numero (8-9 digitos), ex: `5511987654321`. **Este e o valor** usado como `chat` no `whatsapp-agent__read` (Passo 2) e do qual se extraem os "ultimos 8 digitos" no Passo 7.1. Extrair os ultimos 8 digitos = os 8 caracteres finais da string apos remover tudo que nao for digito (ex: `5511987654321` → `87654321`); ignora DDI, DDD e o 9o digito do celular, casando o mesmo contato no Pipedrive.
  - `status` (string enum) — status do convite: `pendente_envio` | `convite_enviado` | `em_avaliacao` | `aceitou_convite` | `confirmado` | `recusou` (mesmo enum do Passo 6).
  - `status_presenca` (string) — `"confirmado"` e DEFAULT de cadastro; NAO prova confirmacao real (ver Passo 3).
  - `convidado_por` (string) — nome do convidador, campo de EXIBICAO apenas (ex: `"Eric Luciano"`). Usar so para mostrar ao Eric no relatorio; NAO usar como criterio de filtro/decisao (pode divergir do id real).
  - `convidado_por_user_id` (string UUID) — id real do convidador. **E o campo canonico** para FILTRAR o lote (Passo 1) E para decidir se registra no Pipedrive (Passo 7): Eric = `5f1aa31e-e159-4638-9699-38a77c0f51cf`, Niverton = `a11ad1a5-b40e-4541-8ca5-4df70cab1b07`.
  - `data_convite_enviado` (string, data/hora ISO) — quando o convite foi disparado; **e a origem do `<data do disparo>`** citado nos Passos 2 e 4 (usar a data em `YYYY-MM-DD`). SE o campo vier vazio/ausente para um participante → usar como fallback a `data` do evento (`get_evento`, Passo 5.1) e sinalizar no relatorio que a data do disparo daquele participante nao estava registrada.
- **Fonte dos fatos das respostas:** campo `observacoes` do evento, bloco `[FAQ-CONVITES]` (preco do ingresso, formato, politica de acompanhante, happy hour etc.). Se o bloco nao existir na edicao, pedir os fatos ao Eric antes de responder.

---

## Passo 1 — Listar participantes a verificar

**Acao:**
```
mcp__expert-integrado__list_participantes(evento_id="<evento_id>")
```
- **Filtrar pelo convidador desejado usando o campo `convidado_por_user_id`** (UUID; default Eric = `5f1aa31e-e159-4638-9699-38a77c0f51cf`). NAO filtrar pelo campo texto `convidado_por` — ele e so exibicao e pode divergir do id real. Manter na lista apenas os participantes cujo `convidado_por_user_id` bate com o convidador alvo.
- Considerar TODOS os status (`status`), nao so `convite_enviado`/`em_avaliacao` — a varredura completa detecta status gravado errado.
- Auto-confirmacao por botao (`status_presenca = "confirmado"` sem mensagem na conversa) TAMBEM entra na verificacao.

**Validacao:** a lista (ja filtrada pelo `convidado_por_user_id`) tem ao menos 1 participante. SE ficou vazia → reportar "nenhum participante de <nome do convidador> nesse evento" e encerrar.

## Passo 2 — Ler a conversa de cada participante no WhatsApp

**Acao (por participante):** usar o campo `telefone` do participante (schema em Pre-requisitos) como valor de `chat`:
```
mcp__whatsapp-agent__read(chat="<participante.telefone>", limit=30)
```
- O parametro e `chat` (aceita nome, telefone ou chat_id). NAO existe `phone`.
- SE o retorno trouxer audios com campo `transcription` → usar o texto direto (download/transcricao e responsabilidade do MCP, nao desta skill).

**Edge case LIDs:** o Eric as vezes responde num chat LID separado (`XXXXXXXX@lid`) que nao aparece na busca por numero.
- SE `read(chat=<participante.telefone>)` so trouxer mensagens antigas (nada com data igual/posterior ao `data_convite_enviado` do participante) →
  1. `mcp__whatsapp-agent__inbox(since="<participante.data_convite_enviado em YYYY-MM-DD>")` OU `mcp__whatsapp-agent__search(query="<participante.nome>")` para achar o LID;
  2. `mcp__whatsapp-agent__read(chat="<LID@lid>", limit=30)`.

**Se falhar:** SE `read` retornar erro de conexao → rodar `mcp__whatsapp-agent__status`; SE desconectado → parar e avisar o Eric ("WhatsApp desconectado, nao consigo verificar"). SE conectado mas erro persiste → reportar o participante como "falha na leitura" e seguir os demais.

**Paralelizar** as leituras quando possivel (multiplos participantes de uma vez).

## Passo 3 — Classificar a resposta

Analisar as ultimas mensagens **do convidado** (nao as do Eric):

| Classificação | Sinais |
|---------------|--------|
| **confirmado** | "vou", "confirmo", "tô dentro", "beleza", "pode ser", "vamos sim", apertou botão E não recusou depois |
| **recusado** | "não consigo", "não vou", "não dá", "obrigado mas...", "tenho outro compromisso", "fica pra próxima" |
| **em_avaliacao** | Fez pergunta, pediu detalhes, esta conversando sem decisao final, "acho que da", "vou tentar", logistica pendente |
| **sem_resposta** | Não respondeu nada desde o disparo |

Regras de classificacao:
- SE a pessoa esta negociando data/detalhes → NAO e recusa (respeitar o tom).
- SE ha duvida na classificacao → marcar `em_avaliacao` e pedir ao Eric.
- SE `status_presenca = "confirmado"` por botao mas sem nenhuma mensagem escrita → reportar como "auto-confirmou (precisa validacao)"; NAO alterar esse status sem reacao do usuario.

**Como perguntar ao Eric os casos `em_avaliacao` (canal + formato):** NAO interromper a cada caso. Acumular todos os `em_avaliacao` da varredura e perguntar em BLOCO ao final (na propria conversa da sessao — chat local ou Telegram na VPS; nunca por outro canal). Para cada caso, montar uma linha no formato literal abaixo, numerando as opcoes de classificacao para o Eric responder rapido:
```
[N] <Nome do convidado>
Ultima mensagem dele: "<texto literal da ultima msg do convidado>"
Como classificar?
  1) confirmado (atualizo pra aceitou_convite)
  2) recusou
  3) em_avaliacao (mantenho e aguardo, com draft de resposta abaixo)
```
So seguir com a atualizacao de status/resposta de cada caso apos o Eric responder o bloco.

## Passo 4 — Distinguir "sem resposta" de "respondeu noutro chat"

Para cada candidato a `sem_resposta` (usar o `data_convite_enviado` daquele participante como `since`, no formato `YYYY-MM-DD`):
```
mcp__whatsapp-agent__inbox(waiting_on="eric", since="<participante.data_convite_enviado em YYYY-MM-DD>")
```
- SE o lead aparecer com `waiting_on="eric"` → ele respondeu, ciclo ABERTO → reclassificar (voltar ao Passo 3 com o chat certo, checando LID se preciso).
- SENAO → confirmar `sem_resposta` e reportar como candidato a follow-up. NAO inventar leitura; deixar o Eric decidir.

## Passo 5 — Redigir a resposta (voice do Eric + fatos do MCP)

**5.1 — Puxar os fatos (obrigatorio antes de redigir data/local/preco):**
```
mcp__expert-integrado__get_evento(evento_id="<evento_id>")
```
- Datas: campo `data` das turmas irmas (mesmo `nome`, status planejamento) — a edicao pode ter 2 dias.
- Local: `local` + `endereco_completo`. Horario: `hora_inicio`-`hora_fim`. Site: `url_site_vendas`.
- Conteudo das respostas (preco, formato, acompanhante, happy hour): bloco `[FAQ-CONVITES]` em `observacoes`. SE o bloco nao existir → pedir os fatos ao Eric e grava-los la via `update_evento` (fora do escopo desta skill — apenas sinalizar).

**5.2 — Voice guide (obrigatorio para texto fora dos templates abaixo):**
```
mcp__whatsapp-agent__get_voice_guide()
mcp__whatsapp-agent__check_message(content="<draft>")
```
Regras hard que nunca caem: sem travessao (—), sem hype, chat ativo (<5 min) suprime vocativo, registro informal ("massa/show/top", ".." como respiracao), nunca tu/teu/tua.

**5.3 — Autonomia vs escalar:**
- PODE responder direto (`confirmed=true` no `send`) apos GO: FAQ factual (data, local, horario, preco, formato) e agradecimento de confirmacao.
- ESCALAR pro Eric ANTES de responder: acompanhante/transferencia de vaga, objecao de negocio, negociacao, tom irritado/negativo.

**5.4 — Templates (preencher [DATAS], [CIDADE], [LOCAL+ENDERECO], [PREco], [HORARIO] com os fatos do get_evento):**

CONFIRMOU ("to dentro", clicou no botao):
```
Aeee! Massa demais. Te espero lá então.

Qualquer coisa que precisar antes do evento é só me chamar aqui. Vai ser top!
```

RECUSOU (educado, sem disponibilidade) — template validado: resposta real do Eric em maio/2026; o lead reconvidado aceitou na edicao seguinte:
```
Tranquilo, [PrimeiroNome]! Obrigado por avisar. Te deixo na lista da próxima edição e te aviso primeiro quando tiver. Abraço!
```

"QUAL DATA?" / "TEM DATA?":
```
São duas turmas: [DATAS], aqui em [CIDADE], das [HORÁRIO]. Você escolhe o dia que encaixa melhor.

É só abrir o convite em PDF que te mandei e tocar no botão do dia. Confirma sozinho por lá.
```

"ONDE VAI SER?":
```
[LOCAL + ENDEREÇO resumido].

Tem o endereço completo e o mapa dentro do convite também.
```

"QUANTO CUSTA?" / "É PAGO?" (preco vem do [FAQ-CONVITES] — falar o valor cheio SEMPRE, ancora o valor da cortesia):
```
Pra você é cortesia, convite meu. O ingresso tá à venda no site por [PREÇO], mas separei alguns convites pra pessoas que eu queria muito lá. Só confirmar no botão do PDF.
```

"É ONLINE?" / "TEM GRAVAÇÃO?":
```
É 100% presencial, aqui em [CIDADE]. A proposta é sair com IA implementada de verdade, mão na massa o dia inteiro, com suporte ao vivo. Não tem versão online dessa experiência.
```

"POSSO LEVAR ALGUÉM?" / "PASSA A VAGA PRO MEU SÓCIO?" — politica padrao (ver [FAQ-CONVITES]): cortesia e 1 por empresa; NAO da pra levar acompanhante de cortesia; o que EXISTE e um convite PAGO pra segunda pessoa da mesma empresa. Responder ja dando o caminho e ESCALAR pro Eric antes de confirmar valor/condicao do pago:
```
A cortesia é uma por empresa, essa eu não consigo desdobrar. O que eu consigo ver é um convite pago pra segunda pessoa, aí vocês vêm juntos. Quer que eu veja?
```
(Transferencia da vaga pra OUTRA pessoa da MESMA empresa: possivel com aprovacao do Eric — cadastrar a pessoa nova e gerar o PDF dela.)

"NÃO CONSIGO NESSES DIAS" (mas demonstrou interesse):
```
Poxa, que pena! Mas tranquilo. Te coloco na frente da fila da próxima edição então.

Só me confirma que não vai dessa vez pra eu liberar tua vaga pra outra pessoa, beleza?
```

"VOU VER E TE FALO" (em avaliacao):
```
Fechou! Só não demora muito não que as vagas são limitadas.. me dá um retorno até [dia] que eu seguro a tua até lá.
```

**5.5 — Enviar apos GO:** so depois do "manda"/GO do Eric:
```
mcp__whatsapp-agent__send(to="<telefone ou chat_id>", content="<texto aprovado>", confirmed=true)
```
Depois de CADA envio, seguir o Passo 6 (status) e o Passo 7 (Pipedrive).

## Passo 6 — Atualizar status no MCP expert-integrado

**Quando atualizar o status (ordem em relacao ao envio):**
- SE a classificacao NAO exige enviar resposta ao convidado (ex: recusa clara, aceite ja fechado sem pendencia, `sem_resposta`) → atualizar o status IMEDIATAMENTE apos classificar (Passo 3), sem esperar envio.
- SE a classificacao exige enviar resposta (FAQ a responder, follow-up, fechamento de ciclo) → so atualizar o status DEPOIS que o envio foi confirmado (apos o GO do Eric e o `send` do Passo 5.5). Enquanto a resposta nao saiu, nao mexer no status.

Valores validos de `novo_status` (enum exato): `pendente_envio`, `convite_enviado`, `em_avaliacao`, `aceitou_convite`, `confirmado`, `recusou`.

- **Confirmou:**
  ```
  mcp__expert-integrado__update_status_convite(participante_id="<id>", novo_status="aceitou_convite")
  ```
- **Recusou:**
  ```
  mcp__expert-integrado__update_status_convite(participante_id="<id>", novo_status="recusou")
  ```
- **Em avaliacao:**
  ```
  mcp__expert-integrado__update_status_convite(participante_id="<id>", novo_status="em_avaliacao")
  ```
  Reportar pro Eric decidir o follow-up.
- **Sem resposta:** NAO alterar status, apenas reportar.

**Validacao:** SE `update_status_convite` retornar erro → reportar o participante como "status nao atualizado" no relatorio final; nao abortar o lote.

## Passo 7 — Registrar desfecho no Pipedrive (regra do Eric, 02/07/2026)

A atividade "Convite enviado, imersao, ..." ja foi criada CONCLUIDA no envio (skill `convidar-evento`). Aqui a regra: **TODO contato do funil de convite vira uma atividade `type="whatsapp"` CONCLUIDA (`done=true`)** — aceite, recusa, follow-up, em avaliacao e encerramento por silencio. Historico auditavel completo na pessoa.

**SE o participante NAO e do Eric → PULAR este passo inteiro** (outro convidador e dono do touchpoint). Criterio verificavel: `participante.convidado_por_user_id != "5f1aa31e-e159-4638-9699-38a77c0f51cf"` (UUID do Eric). No fluxo padrao o Passo 1 ja filtrou so os do Eric, entao este e um guard de seguranca — mas se o lote incluir outros convidadores (ex: Eric pediu para verificar um subconjunto especifico), esta regra os exclui do registro no Pipedrive.

**7.1 — Achar/criar a pessoa no Pipedrive:**

> **`owner_id` / `user_id` aceitam o NOME literal.** Nas tools do MCP pipedrive (`create_person`, `create_activity`), passar `owner_id="Eric Luciano"` / `user_id="Eric Luciano"` como string e CORRETO — o proprio MCP resolve o nome para o id numerico do usuario internamente (funcao `resolveUser`: casa nome exato, senao parcial). NAO existe (nem e preciso) tool de lookup de usuario nesta skill. SE o nome nao existir, o MCP retorna erro listando os usuarios ativos — nesse caso, reportar o erro ao Eric.

Extrair os "ultimos 8 digitos do telefone" do campo `participante.telefone` (ver schema em Pre-requisitos): remover tudo que nao for digito e pegar os 8 finais (ex: `5511987654321` → `87654321`).
```
mcp__pipedrive__search_persons(term="<ultimos 8 digitos do telefone>")
```
- SE nao achar por telefone → `search_persons(term="<participante.nome>")`.
  - **SE a busca por nome retornar 2+ resultados (ambiguidade)** → NAO atualizar o Pipedrive desse participante (nao criar pessoa, nao registrar atividade — risco de gravar no cadastro errado). Listar o caso no relatorio final (Passo 9) como **"ambiguo — resolver manualmente"** com o nome + os candidatos retornados, para o Eric desambiguar. Seguir os demais participantes normalmente.
- SE ainda nao existir → criar (o telefone vai no formato `55XXXXXXXXXXX`, so digitos — que e exatamente o `participante.telefone`):
  ```
  mcp__pipedrive__create_person(name="<participante.nome>", phone="<participante.telefone>", owner_id="Eric Luciano")
  ```
  Depois, 1x na vida (NUNCA sobrescrever se ja tiver valor):
  ```
  mcp__pipedrive__update_person(person_id=<id>, custom_fields='{"Origem do Contato": "INDIC | Direta do Eric"}')
  ```

**7.2 — Registrar a atividade conforme o desfecho:**

ACEITOU/CONFIRMOU — **2 atividades**:
```
# 1) o contato (concluida):
mcp__pipedrive__create_activity(
  subject="Aceitou o convite da imersão",
  type="whatsapp",
  due_date="<YYYY-MM-DD de hoje>",
  person_id=<id>, user_id="Eric Luciano",
  note="Confirmou presença via botão do PDF/mensagem. Última msg dele: \"<texto literal, se houver>\".",
  done=true
)
# 2) a reunião do evento (PENDENTE, na data do dia que a pessoa ESCOLHEU):
mcp__pipedrive__create_activity(
  subject="Imersão Empresa Inteligente, Empresário Livre",
  type="apresentacao",        # key da API; nome visível: Reunião Geral. NÃO usar "reuniao_geral"
  due_date="<YYYY-MM-DD do dia escolhido>",
  person_id=<id>, user_id="Eric Luciano",
  note="Confirmado na imersão (edição). <contexto adicional se houver>"
)
```

RECUSOU — **1 atividade (concluida)**, motivo no note:
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

FOLLOW-UP ENVIADO — **1 atividade (concluida) a CADA follow-up**:
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

EM AVALIACAO (respondeu com duvida/objecao) — **1 atividade (concluida)**:
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

SEM RESPOSTA (silencioso): enquanto o funil esta vivo, nada extra (envio + follow-ups ja registram os touchpoints). **So quando o ERIC mandar desistir** (ele decide o momento), registrar o encerramento:
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

**Regra geral:** atividade `whatsapp` concluida = um touchpoint auditavel por contato real. A "Reuniao Geral" (`type="apresentacao"`) so existe no aceite e fica PENDENTE ate o dia do evento. NAO criar notas avulsas pra desfecho — o contexto vai no `note` da atividade.

**Guardrail de atividade pendente:** o MCP pipedrive bloqueia criar uma atividade PENDENTE (a "Reuniao Geral", `done` ausente) quando a pessoa ja tem atividade em aberto, retornando "ATIVIDADE PENDENTE EXISTENTE". SE isso ocorrer e a duplicidade for esperada (a reuniao do evento e legitima) → repetir a chamada adicionando `force=true`. As atividades `done=true` (touchpoints) NAO caem nesse guardrail.

## Passo 8 — Fechar ciclo de resposta

Objetivo: ninguem fica no vacuo. NAO e dogma "Eric sempre manda a ultima msg literal" — e "ninguem sem fechamento".

| Situacao | Ciclo | Acao proposta ao Eric |
|----------|-------|----------------------|
| Lead mandou pergunta, recusa 1a vez, confirmacao, audio explicando, duvida real | **ABERTO** | Sugerir resposta substantiva |
| Lead respondeu "ok"/"valeu"/"obrigado"/"beleza" depois que Eric ja respondeu | **FECHADO** | Reacao 👍❤️🙏 OU silencio. NAO forcar texto |
| Eric já agradeceu/anotou + lead já agradeceu | **FECHADO** | Nada |
| Lead recusou, Eric ainda não respondeu | **ABERTO** | Sugerir "tranquilo, fica pra próxima, abraço" |
| Lead confirmou, Eric ainda não respondeu | **ABERTO** | Sugerir "show, te vejo lá / equipe entra em contato" |

- Regra de bolso: SE a proxima msg do Eric soaria forcada/redundante → NAO mandar. Reacao ou silencio com ciclo fechado > texto vazio.
- A skill PROPOE o fechamento; so executa apos GO. Reacao rapida (`mcp__whatsapp-agent__react`) e texto curto vao pelo whatsapp-agent (WhatsApp PESSOAL) — nunca por outro canal.
- SE `react` falhar (erro Z-API) → sugerir fallback de texto curto equivalente ("Combinado!", "Anotado!", "Tranquilo, obrigado!"). NAO deixar a thread sem fechamento se o lote inteiro recebeu fechamento.
- **Consistencia do lote:** SE 9 de 10 leads do mesmo grupo (ex: recusados) receberam fechamento, o 10o tambem recebe. Nao criar excecao sem motivo claro.

## Validacao final (checklist antes de encerrar)

- [ ] Todos os participantes filtrados pelo `convidado_por_user_id` do convidador alvo foram lidos (ou marcados "falha na leitura").
- [ ] Cada resposta classificada em confirmado / recusado / em_avaliacao / sem_resposta.
- [ ] Candidatos a `sem_resposta` checados contra LID e `inbox(waiting_on="eric")`.
- [ ] Status atualizado no expert-integrado para confirmados (`aceitou_convite`), recusados (`recusou`) e em avaliacao (`em_avaliacao`). Sem resposta: nao alterado.
- [ ] Touchpoint registrado no Pipedrive para cada desfecho com `convidado_por_user_id == "5f1aa31e-e159-4638-9699-38a77c0f51cf"` (atividade `whatsapp` `done=true`; + `apresentacao` pendente nos aceites).
- [ ] Nenhuma mensagem foi disparada sem GO do Eric.
- [ ] Nenhum ciclo aberto ficou sem proposta de fechamento; consistencia do lote respeitada.
- [ ] Relatorio entregue ao Eric (Passo 9), com acentuacao correta.

## Passo 9 — Relatorio pro Eric

Tabela + blocos:

| Nome | Classificação | Última mensagem dele | Ação |
|------|---------------|----------------------|------|
| ... | confirmado | "to dentro" | atualizado pra aceitou_convite + 2 atividades Pipedrive |
| ... | em_avaliacao | "tem estacionamento?" | PRECISA SUA RESPOSTA (draft sugerido abaixo) |
| ... | sem_resposta | — | candidato a follow-up |

Separar em blocos:
- **Confirmados** (atualizados pra `aceitou_convite`)
- **Recusados** (atualizados pra `recusou`)
- **Em avaliacao** (`em_avaliacao` — precisam resposta do Eric; anexar drafts)
- **Sem resposta** (candidatos a follow-up)
- **Ambiguo — resolver manualmente** (Pipedrive nao atualizado por 2+ pessoas na busca por nome — Passo 7.1): listar nome + candidatos retornados pro Eric desambiguar.

## Erros comuns e recovery

- **`read` so traz mensagens antigas:** provavel chat LID separado. Rodar `inbox(since=...)`/`search(query=<nome>)`, achar o `XXXXXXXX@lid`, reler com `read(chat="<LID@lid>")`.
- **`read` erro de conexao:** rodar `status`; SE desconectado → parar e avisar o Eric; SE conectado → marcar o participante como "falha na leitura" e seguir os demais.
- **Status gravado errado no expert-integrado** (ex: `recusou` que era aceite): por isso o Passo 1 varre TODOS os status. Ao detectar, corrigir com `update_status_convite` para o valor certo e sinalizar no relatorio.
- **"ATIVIDADE PENDENTE EXISTENTE" no Pipedrive:** so ocorre em atividade PENDENTE (a "Reuniao Geral"). SE a nova reuniao e legitima → repetir com `force=true`. Touchpoints `done=true` nao disparam esse guardrail.
- **Atividade Pipedrive nasce vencida:** foi passado `due_time` vazio. Omitir `due_time` quando nao ha horario.
- **Pessoa nao encontrada no Pipedrive:** `search_persons` por telefone falhou → tentar por nome → se nao existir, `create_person` + `update_person` (origem `INDIC | Direta do Eric`).
- **Tool `create_*` do Pipedrive retorna "tool has been disabled":** usar o fallback `mcp__pipedrive__pipedrive_write({ action: "create_activity"|"create_person", params: {...} })` — mesma logica, nome neutro escapa do bloqueio.

## Modo cron — follow-up recorrente

Um agendador externo (cron na VPS, scheduled task) INVOCA esta skill — a skill nunca se agenda sozinha. Prompt tipico: *"Rode a skill verificar-convites no evento <id>, modo cron."*

Fluxo identico (Passos 1-9) com estas regras extras:
1. **Varre** todos os `convite_enviado`/`em_avaliacao` do operador e registra desfechos novos (Passos 6 e 7).
2. **Monta lote de follow-up:** `sem_resposta` cujo `participante.data_convite_enviado` seja de 48h+ atras (comparar com a data/hora atual em BRT) recebem o template de follow-up (da skill `convidar-evento`). Limite: **max 2 follow-ups por pessoa.** Janela de cada um (criterio fixo, comparar em BRT):
   - **1o follow-up:** elegivel a partir de 48h apos o `data_convite_enviado`.
   - **2o follow-up:** elegivel a partir de **72h (3 dias cheios) apos a data do 1o follow-up** — nao a partir do disparo original. Enquanto nao completar 72h desde o 1o follow-up, a pessoa NAO entra no lote do 2o.
   Depois do 2o, a pessoa so sai da fila quando o Eric mandar encerrar (ai registra "Convite sem resposta, encerrado" — Passo 7).
3. **NAO dispara follow-up sozinho.** Envia ao Eric (no canal da instancia: Telegram na VPS, chat na sessao local) o RESUMO: novos aceites/recusas registrados + lote de follow-up pronto (nomes + msg). Eric responde "manda" → dispara e registra cada follow-up no Pipedrive (Passo 7). Sem GO, nada sai.
4. SE nao houver nada novo nem lote a propor → reportar em 1 linha ("varredura ok, sem novidades") e encerrar.
