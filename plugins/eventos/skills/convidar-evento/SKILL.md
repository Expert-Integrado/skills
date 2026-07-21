---
name: convidar-evento
description: Use quando o Eric quiser disparar convites via WhatsApp para um evento/imersão da Expert Integrado. TRIGGER quando Eric pedir para enviar convites, disparar os convites do evento, mandar convites da imersão, convidar a galera pra imersão. NÃO usar para lembretes de webinário (skill notificacao-webinario) nem para checar respostas de convites já enviados (skill verificar-convites).
---

# Convidar para Evento — Expert Integrado

Skill para disparar convites via WhatsApp para eventos do Eric, puxando dados do MCP expert-integrado e atualizando status após envio.

---

## CONTEXTO

- Eventos ficam no MCP `expert-integrado` (tabela participantes)
- Quem envia cada convite está GRAVADO no participante: `convidado_por_user_id` = `5f1aa31e-e159-4638-9699-38a77c0f51cf` (Eric) ou `a11ad1a5-b40e-4541-8ca5-4df70cab1b07` (Niverton). Filtrar SEMPRE por esse UUID (o campo texto `convidado_por` é só exibição).
- Status inicial: `pendente_envio` → após disparo: `convite_enviado`
- **Ritmo: máx ~30 disparos/dia por número** (anti-spam + capacidade do Eric de responder). Confirmar o tamanho do lote com o Eric.

## FONTE DA VERDADE = NUVEM (a skill NÃO depende de arquivo local)

Roda de QUALQUER máquina/instância. Tudo vem do MCP na hora:
- **Quem convidar + ordem + não-repetir:** `list_participantes(evento_id, status="pendente_envio")`, filtrado por `convidado_por_user_id` do operador. Essa é a lista FINAL e já curada. Convidar TODOS, na ORDEM que o MCP retorna, sem pular ninguém. O status (`pendente_envio` -> `convite_enviado`) garante que ninguém recebe 2x. NÃO re-filtrar por "negociação", "quente/frio" ou qualquer coisa: quem está na lista é pra convidar.
- **Segmento (RECUSOU/FALTOU/NOVO) + gancho:** cruzar telefone/nome com as edições anteriores no MCP, na hora.
- **PDF:** gerar na hora com `gerar_convite_pdf(participante_id)` -> retorna URL pública. NÃO depende de arquivo no disco.
- **Contexto da conversa:** ler na hora com `whatsapp-agent read` (só pro Passo 3.5: não mandar por cima de uma pergunta do cliente ainda não respondida).

**Atalho opcional (só se a máquina tiver os arquivos, ex: PCs do Eric):** a pasta `G:/Meu Drive/claude-workspace/Workspace/temp/convites-imersao-julho/` pode ter `segmentacao.json`, `INDICE-ENVIO.md` e PDFs em `pdfs/`. Se existirem, dá pra reusar (pula recomputar segmento e reaproveita o PDF). Se NÃO existirem, ignore e faça tudo pela nuvem acima. NUNCA travar por falta de arquivo local. (A cópia em `~/OneDrive/Workspace/temp/...` é arquivo morto da migração de 05/07/2026 — não escrever lá.)
- **Edições com mais de uma data (ex: jul/2026, turmas 29 e 30):** cada dia é um EVENTO separado no MCP. **O PDF do convite já traz os botões "CONFIRMAR DIA 29/07" e "CONFIRMAR DIA 30/07"** — o convidado escolhe o dia clicando, e o sistema move ele pra turma certa e confirma sozinho (RPC `accept_invite_with_day`). NÃO é preciso perguntar o dia por mensagem nem mover ninguém manualmente.
- O PDF é gerado pelo próprio MCP (`gerar_convite_pdf` / `gerar_convites_pdf_lote`) com URL pública: convite v5 com foto, "terceira edição", selo CORTESIA e os botões de dia. O participante pode estar cadastrado em qualquer uma das turmas — os botões cobrem as duas.

## OPERADOR — Eric ou Niverton (definir ANTES de tudo)

A skill serve aos DOIS convidadores. Primeiro passo: identificar quem está operando (perguntar se não for óbvio pelo ambiente).

| | ERIC | NIVERTON |
|---|---|---|
| Filtro | `convidado_por_user_id = 5f1aa31e-e159-4638-9699-38a77c0f51cf` | `convidado_por_user_id = a11ad1a5-b40e-4541-8ca5-4df70cab1b07` |
| Disparo | Automatizado via MCP `whatsapp-agent` (número pessoal do Eric, `instance="pessoal"`) | **MANUAL**: a skill monta o KIT (mensagens prontas + PDF de cada um) e o Niverton copia/cola e envia do WhatsApp DELE. NÃO existe whatsapp-agent pro número do Niverton. |
| Copies | Copy A/B/C (voz do Eric, abaixo) | Copy A-N/B-N/C-N (voz do Niverton citando o Eric, abaixo) |
| Pipedrive (Passo 5.5) | Sim, atividade concluída | Sim, atividade concluída com `user_id="Niverton Menezes"` — criada SÓ depois que ele confirmar o envio (junto com o Passo 5) |
| Pós-envio | `update_status_convite` automático | Marcar `convite_enviado` SÓ depois que o Niverton confirmar que mandou |

Um operador NUNCA dispara os convites do outro. Os arquivos locais (INDICE-ENVIO, segmentacao.json, pdfs/) vivem no PC do Eric; no ambiente do Niverton, usar direto o MCP (list_participantes + gerar_convite_pdf, que retorna URL pública, sem depender de disco).

## SEGMENTAÇÃO (substitui a antiga classificação VELHO vs NOVO)

**Edição jul/2026: a classificação dos 138 JÁ está pronta em `segmentacao.json` (ver Fontes Prontas) — usar direto, não recalcular.** A tabela abaixo é a regra geral pra edições futuras ou participantes fora do arquivo.

Classificar cada participante pelo HISTÓRICO nas edições anteriores (buscar por telefone e nome nos eventos passados do MCP):

| Segmento | Critério | Copy |
|---|---|---|
| **RECUSOU** | Foi convidado pra edição anterior e recusou UMA vez | Copy A |
| **FALTOU** | Confirmou presença numa edição anterior e não compareceu (`status_presenca = ausente`) | Copy B |
| **NOVO** | Primeira vez que recebe convite (aula, indicação, network) | Copy C |
| **LISTA DE ESPERA** | `origem = lista_espera` — cadastrou-se na lista de espera pública (`eventos.expertintegrado.com.br/lista-espera`) | Copy LE |
| **COMPROU** | `origem = compra_online` (pagou ingresso) | NÃO convidar — já está dentro. Convite de cortesia pra quem pagou quebra a percepção de valor. |

### Regras de elegibilidade (decisão do Eric, 01/07/2026)
- **Recusou 2 edições diferentes → NÃO convidar mais.** Só reconvida quem recusou 1 vez.
- **Bases de convidadores desligados/vetados (ex: Vanderson Souza, Ricardo Junior) → NÃO convidar.**
- **Clientes Super SDR → NÃO convidar** (origem `cliente_supersdr` / "Cliente Super SDR" em qualquer edição).
- Em edição nova, confirmar com o Eric se a lista de vetos mudou.

## FLUXO DE 4 MENSAGENS (3s de intervalo entre cada)

> Datas, mês da recusa, cidade e link abaixo são da edição de JULHO/2026. Em edição futura, substituir pelos dados reais (confirmar com o Eric antes de disparar).
> REGRA: NUNCA usar travessão longo (—) nas copies. Tem cara de IA. Usar ponto final, vírgula ou quebra de linha.
> Em mensagem de convite formatada, usar "você" por extenso (padrão do corpus real do Eric nesse contexto).
> **VOICE GUIDE — quando aplica (regra do Eric, 03/07/2026):** as 4 mensagens do disparo (Msg 1-4) são TEMPLATE FIXO já aprovado pelo Eric — dispare como estão, NÃO precisa rodar voice guide nelas. MAS no instante em que o lead RESPONDER e virar conversa/tira-dúvidas, PARE de improvisar: aí é diálogo real e é OBRIGATÓRIO rodar `mcp__whatsapp-agent__get_voice_guide()` + validar o draft com `mcp__whatsapp-agent__check_message()` antes de CADA resposta (ou passar o bastão pra skill `verificar-convites`, Passo 4.5, que já faz isso). Em uma linha: **convite inicial = template aprovado; qualquer resposta depois = voice guide sempre.**

**Copy A — RECUSOU (recusou 1x a edição anterior):**
```
Msg 1:
Fala [PrimeiroNome], beleza?

Em [maio] te chamei pra minha imersão e a data não bateu. Quero te fazer o convite de novo. As duas primeiras edições foram um sucesso, o feedback da galera foi muito legal, então decidimos fazer mais duas.
```
Substituir `[maio]` pelo mês em que a pessoa foi convidada (quem recusou só a de abril recebe "Em abril"). IMPORTANTE: "recusou" NÃO significa que a pessoa esteve no evento. Nunca escrever "como você esteve", "você participou" ou similar.

**Copy B — FALTOU (confirmou e não foi):**
```
Msg 1:
Fala [PrimeiroNome], beleza?

Em maio você tinha confirmado presença na minha imersão. Agora em julho vou rodar mais duas edições e quero muito te ver nessa.
```
NÃO reforçar o fato negativo ("você não apareceu", "não deu pra ir") — o Eric real não esfrega falta na cara de ninguém; reconhece o combinado anterior e segue direto pro convite novo.

**Copy C — NOVO (primeira vez):**
```
Msg 1:
Fala [PrimeiroNome], beleza?

[GANCHO DE ORIGEM — OBRIGATÓRIO. Ex: "O [Fulano] me passou teu contato." / "Vi seu nome cadastrado na aula de IA que eu fiz no [G4/evento]."]

Quero te convidar pra minha imersão de IA. Um dia inteiro sobre IA aplicada ao operacional do negócio, cada um sai com agente rodando. Já fiz duas edições, as duas lotaram.
```
O gancho de origem é invariante no corpus real do Eric: TODO convite pra contato novo abre citando de onde a pessoa veio (quem indicou ou em qual aula se cadastrou). Sem gancho, não dispara — perguntar ao Eric a origem.

**Copy LE — LISTA DE ESPERA (a pessoa se cadastrou na lista de espera pública):**
Antes de montar a Msg 1, cruzar o telefone na tool `list_lista_espera` pra puxar `created_at` (usar só o MÊS) e `qtd_ingressos`.
```
Msg 1:
Fala [PrimeiroNome], beleza?

Você entrou na lista de espera da minha imersão de IA lá em [MÊS_CADASTRO]. Abriram vagas agora pras turmas de julho e separei a sua. Um dia inteiro de IA aplicada ao operacional do negócio, cada um sai com agente rodando.
```
Se `qtd_ingressos > 1`: NÃO prometer as cadeiras extras na mensagem (a 2ª é paga, não cortesia — regra do evento). Sinalizar ao operador/Eric pra decidir o acompanhante à parte.

**Msg 2 — Datas + link (igual pra todos os segmentos). MONTAR DO MCP, nunca de memória:**
Buscar via `get_evento`: dias das turmas irmãs (mesmo nome, status planejamento, data futura), cidade (do `endereco_completo`), horário (`hora_inicio`-`hora_fim`) e `url_site_vendas`. Template:
```
Agora vão ser duas turmas: [DIA1] ou [DIA2] de [MÊS], aqui em [CIDADE], das [INÍCIO] às [FIM]. Você escolhe o dia que encaixa melhor na agenda.

Detalhes e confirmação: [URL_SITE_VENDAS]
```
Exemplo preenchido (edição jul/2026): "Agora vão ser duas turmas: 29 ou 30 de julho, aqui em São Paulo, das 8h às 20h. (...) https://imersao.ericluciano.com.br". Se a edição tiver UMA turma só, adaptar: "Vai ser dia [DIA] de [MÊS], ...".

**Msg 3 — PDF (arquivo sozinho, SEM legenda):**
Gerado na hora via `mcp__expert-integrado__gerar_convite_pdf(participante_id=...)` → usar a `url` retornada.

**Msg 4 — Explicação + fechamento (igual pros 3):**
```
O convite em PDF é personalizado com seu nome. Dentro dele tem os botões pra escolher o dia (29 ou 30) e confirmar presença direto por lá.

Só te peço uma coisa, por favor: se não puder ir, me avisa. Tenho ingressos limitados pra distribuir e aí passo pra outra pessoa..

Bora?
```

## COPIES DO NIVERTON (quando o operador é o Niverton)

Mesma estrutura de 4 mensagens. Voz do Niverton: profissional, próxima, SEM fingir intimidade que não tem, sempre citando o Eric como anfitrião. Msg 2, Msg 3 (PDF) e Msg 4 são as MESMAS do fluxo do Eric (a Msg 4 troca "me avisa" por "me avisa aqui").

**Copy A-N — RECUSOU (recusou 1x a edição anterior):**
```
Msg 1:
Oi [PrimeiroNome], tudo bem? Aqui é o Niverton, da equipe do Eric Luciano.

Em [maio] você recebeu o convite pra imersão do Eric e a data não bateu. Ele vai rodar mais duas edições agora em julho e me pediu pra te convidar de novo. As duas primeiras lotaram e o feedback foi muito bom.
```

**Copy B-N — FALTOU (confirmou e não foi):**
```
Msg 1:
Oi [PrimeiroNome], tudo bem? Aqui é o Niverton, da equipe do Eric Luciano.

Em maio você tinha confirmado presença na imersão do Eric. Ele vai rodar mais duas edições agora em julho e me pediu pra garantir seu convite nessa.
```

**Copy C-N — NOVO (primeira vez, geralmente lead que negociou com o Niverton):**
```
Msg 1:
Oi [PrimeiroNome], tudo bem? Niverton aqui, da Expert Integrado. A gente conversou há um tempo sobre [contexto da negociação].

O Eric, nosso fundador, vai rodar uma imersão presencial de IA em julho e separou alguns convites de cortesia. Lembrei de você na hora. Um dia inteiro de IA aplicada ao negócio, saindo com agente rodando.
```
Substituir `[contexto da negociação]` pelo assunto real do deal (mentoria, automação etc. — está no Pipedrive/observações). Se o Niverton nunca falou com a pessoa, adaptar: "Você se cadastrou na [aula/palestra] do Eric Luciano" e apresentar-se do mesmo jeito.

**Copy LE-N — LISTA DE ESPERA (Niverton):**
Cruzar o telefone na `list_lista_espera` pra puxar o MÊS do cadastro (`created_at`) e `qtd_ingressos`.
```
Msg 1:
Oi [PrimeiroNome], tudo bem? Aqui é o Niverton, da equipe do Eric Luciano.

Você entrou na lista de espera da imersão de IA do Eric lá em [MÊS_CADASTRO]. Abriram vagas agora pras turmas de julho e separei a sua. Um dia inteiro de IA aplicada ao negócio, saindo com agente rodando.
```
Se `qtd_ingressos > 1`, não prometer as cadeiras extras (a 2ª é paga) — sinalizar ao Eric.

## O QUE ACONTECE DEPOIS DO CLIQUE (automático)

Quando o convidado toca em "CONFIRMAR DIA X" no PDF:
1. Abre a página de confirmação já mostrando "Confirmando para o dia X" com os dados dele pré-preenchidos.
2. Nome, e-mail, empresa e cidade são obrigatórios — ele completa o que faltar e confirma.
3. O sistema **move ele pra turma do dia escolhido e marca `aceitou_convite` sozinho** (mesmo que estivesse cadastrado na outra turma). Depois sugere foto opcional pro networking.

Nada a fazer no disparo. A skill `verificar-convites` detecta essas confirmações automáticas na varredura.

**Fallback manual — convidado responde o dia POR TEXTO em vez de clicar** (ex: "pode ser dia 30"):
1. Se o dia escolhido NÃO é o evento onde ele está: mover = `add_participante` no evento do dia certo (copiando dados + `convidado_por`) e `delete_participante` no antigo. Gerar PDF novo (`gerar_convite_pdf`) e reenviar com: "Te coloquei na turma do dia [X]. É só confirmar no botão do convite."
2. Se ele confirmar verbalmente ("tô dentro dia 29"): `update_status_convite(participante_id, novo_status="aceitou_convite")` + registrar no Pipedrive (ver verificar-convites, Passo 5.5).

## FOLLOW-UP 48h (sem resposta e sem clique)

Template no padrão real do Eric de fechar lista (baixa pressão, sempre com saída):
```
Fala [PrimeiroNome], beleza? Tô fechando a lista das turmas de julho. 29 ou 30, qual fica melhor pra você? É só tocar no botão do convite que te mandei. Se não rolar dessa vez, tranquilo, só me avisa que passo a vaga pra frente. Bora?
```

**CADÊNCIA COMPLETA (validada na 3ª edição, jul/2026): 3 toques e para.** Convite → FUP 48h → FUP "última chamada" (3-4 dias depois). Quem seguir em silêncio após o 3º toque vai pra `sem_resposta` no MCP (libera a vaga; o botão do PDF segue vivo) — fluxo de encerramento e auditoria na skill `verificar-convites`. Não existe 4º toque: depois de anunciar "tô fechando a lista", insistir de novo desdiz o fechamento.

## PROTOCOLO DE EXECUÇÃO

### Passo 0: Coletar parâmetros
- **evento_id de cada dia** no MCP expert-integrado (jul/2026: dia 29 = `2621e765-994c-480f-962a-0715dae6fbe3`, dia 30 = `f2157b51-f82c-4c84-b62e-bf21c6afdf8f`)
- Confirmar com o Eric o lote do dia (quantos e quais segmentos)

### Passo 1: Listar participantes
```
mcp__expert-integrado__list_participantes(evento_id=..., status="pendente_envio")
```
Filtrar por `convidado_por_user_id` do OPERADOR (UUIDs na tabela de Operador acima). NUNCA disparar convite atribuído ao outro convidador.

### Passo 2: Segmentar
Classificar cada um em RECUSOU / FALTOU / NOVO / LISTA DE ESPERA / COMPROU cruzando telefone e nome com os eventos anteriores no MCP, na hora. (Atalho: se existir `segmentacao.json` no disco, ler de lá em vez de recomputar.) Aplicar as regras de elegibilidade. Em dúvida, perguntar ao Eric.

**LISTA DE ESPERA — checar ANTES do histórico:** se o participante vem com `origem = "lista_espera"` no `list_participantes`, é da lista de espera → usar Copy LE (ou LE-N pro Niverton), NÃO tratar como NOVO. Pra personalizar a Msg 1, chamar `list_lista_espera`, cruzar pelo telefone (últimos 8 dígitos) e pegar `created_at` (usar só o MÊS) + `qtd_ingressos`. Se `qtd_ingressos > 1`, sinalizar ao operador (a 2ª cadeira é paga, não entra na cortesia).

### Passo 3: Gerar os PDFs
```
mcp__expert-integrado__gerar_convite_pdf(participante_id=...)
```
Um por participante (ou `gerar_convites_pdf_lote` pro lote). Guardar a `url` de cada um. O PDF já sai com os botões dos 2 dias — tanto faz em qual turma o participante está cadastrado.

### Passo 3.5: CHECAGEM OBRIGATÓRIA de última mensagem

**ANTES de disparar pra cada pessoa**, rodar `mcp__whatsapp-agent__read(chat=telefone, limit=15)` e verificar a última mensagem:

**IMPORTANTE:** usar limit=15 (não 3). Com limit baixo, whatsapp-agent pode pular mensagens recentes e só retornar as mais antigas — já deu falso positivo (Cleber, 2026-04-23).

- **Última mensagem foi DO CLIENTE e está não lida/não respondida** → PARAR, reportar ao Eric e PERGUNTAR o que fazer (pode ser que precise responder a pergunta dele antes de mandar o convite)
- **Última mensagem foi do Eric/equipe, OU conversa já foi respondida** → pode disparar o convite normalmente

**Why:** Não faz sentido mandar convite automatizado pra alguém que acabou de te escrever — fica robótico e ignora o contexto. O Eric trata caso a caso essas conversas ativas.

**Reforço do próprio MCP:** o `send` tem gate nativo (`force_send_after_inbound`, default false) que bloqueia envio se a pessoa mandou algo nos últimos 10 min sem resposta. É rede de segurança extra, NÃO substitui a checagem manual acima. Se o `send` bloquear por isso, é conversa ativa: PARAR e perguntar ao Eric. Só usar `force_send_after_inbound=true` depois que o Eric mandar enviar mesmo assim.

**ATENÇÃO LIDs:** Eric às vezes responde leads num chat LID separado (formato `XXXXXXXX@lid`) que não aparece no read por número. Sintoma: leitura por número mostra apenas msgs antigas + Eric afirma ter respondido. Ação: rodar `mcp__whatsapp-agent__inbox(since=<últimas 2h>)` ou `search(query=<palavra-chave>)` pra achar o LID, então `read(chat=<LID@lid>, limit=15)`. Casos conhecidos: Henrique Scaramussa (22458769879126@lid), Cesar Barboza (83627341791456@lid), Luiz Closer (78533510574149@lid), Nicolas Tonetto (12434047811609@lid), Matheus Medeiros (180719439593480@lid).

### Passo 4: Disparo (4 mensagens com sleep 3s) — SÓ operador ERIC

**DE QUAL NÚMERO SAI CADA CONVITE (regra dura — incidente 02/07/2026):**
1. Antes de enviar, rode `read(chat=telefone)` SEM instance: o retorno diz em qual número existe conversa (campo `instance`).
2. Existe chat em UM número → envie por ELE: basta OMITIR `instance` no send (o MCP herda o chat automaticamente). NUNCA forçar o outro número.
3. Existe nos DOIS → pessoal (relação direta do Eric), salvo ordem contrária do Eric.
4. NÃO existe em nenhum (contato 100% frio) → default = `instance="pessoal"` + `allow_new=true`. Comercial SÓ com ordem explícita do Eric.
5. PROIBIDO fixar `instance` num lote inteiro sem checar chat por chat. Incidente: 10 convites forçados no comercial; 3 contatos 100% frios receberam SÓ a 1ª msg.

**CHAT NOVO — resolver o número CANÔNICO antes de enviar (obrigatória):**
Causa raiz confirmada (02-03/07/2026, 4 casos): números BR cujo WhatsApp está registrado SEM o 9º dígito (comum fora de SP: DDD 44, 51, 31, 54...). Enviar pro número COM 9 cria um chat fantasma: a 1ª mensagem chega (o WhatsApp roteia), mas as seguintes morrem no chat órfão — com a API retornando ok. Então, pra chat novo:
1. ANTES do 1º send: `zapi_action(action="get-contact-info", params={phone: <telefone>}, instance=<a que vai usar>)` → o campo `phone` retornado é o número CANÔNICO. Se divergir do seu (ex: veio sem o 9), USE O RETORNADO em todos os sends. Se retornar "Phone not exists", tente a variante sem o 9º dígito; se as duas falharem, o número não tem WhatsApp — reportar.
2. Depois da msg1 (`allow_new=true`): `read(chat=<numero canônico>, instance=...)` e usar o `chat_id` retornado nas msgs seguintes. **Se o read vier AMBÍGUO (2 chats pro mesmo contato: um com nome, outro só número), o chat REAL é o que tem nome/mensagens recebidas — o outro é fantasma; NUNCA enviar pro fantasma.**
3. Sleep 10s entre msgs em chat novo. **`ok=true` NÃO garante entrega.** COMO AUDITAR (aprendizado 03/07): no numero PESSOAL o `read` MOSTRA as msgs enviadas pelo proprio agent — o PDF aparece como `message_type=document, from_me=true`; leia o chat depois de enviar e confira se o document esta la. No COMERCIAL (Business) o `read` NAO loga os envios e a entrega e nao-confiavel pra chat novo. **Por isso disparo em lote/frio e SEMPRE pelo pessoal; comercial so pra conversa que o Eric ja mantem ativa la manualmente.**

**Parâmetros do `send` (conferir nomes exatos):**
- texto vai em `content` (NÃO `text`)
- PDF: `type="document"` + `media_url=<url do gerar_convite_pdf>` + `file_name="Convite - [Nome].pdf"`, SEM legenda
- `confirmed=true` é OBRIGATÓRIO pra realmente enviar. Só passar `true` depois que o Eric confirmou o disparo na Regra 1.

```
# chat JÁ existente (omitir instance -> herda o número certo):
mcp__whatsapp-agent__send(to=telefone, content=msg1, confirmed=true)
sleep(3)
mcp__whatsapp-agent__send(to=telefone, content=msg2, confirmed=true)
sleep(3)
mcp__whatsapp-agent__send(to=telefone, type="document", media_url=pdf_url, file_name="Convite - [Nome].pdf", confirmed=true)
sleep(3)
mcp__whatsapp-agent__send(to=telefone, content=msg4, confirmed=true)

# chat NOVO (frio): allow_new na 1ª, depois to=chat_id (anti-LID) e sleep 10
mcp__whatsapp-agent__send(to=telefone, content=msg1, instance="pessoal", allow_new=true, confirmed=true)
sleep(10)
chat_id = mcp__whatsapp-agent__read(chat=telefone, instance="pessoal").chat_id
mcp__whatsapp-agent__send(to=chat_id, content=msg2, confirmed=true)
sleep(10)
mcp__whatsapp-agent__send(to=chat_id, type="document", media_url=pdf_url, file_name="Convite - [Nome].pdf", confirmed=true)
sleep(10)
mcp__whatsapp-agent__send(to=chat_id, content=msg4, confirmed=true)
```

### Passo 4-N: Kit manual — operador NIVERTON

Nada de `send`. Pra cada participante do lote, montar um bloco pronto pra copiar:
1. `gerar_convite_pdf(participante_id)` → guardar a `url`
2. Entregar ao Niverton, por pessoa: telefone + Msg 1 (copy -N do segmento) + Msg 2 + link do PDF (ele baixa e anexa) + Msg 4
3. Ele envia do WhatsApp dele, na ordem, com o PDF como mensagem separada sem legenda
4. Depois que ele CONFIRMAR o envio: rodar o Passo 5 (`update_status_convite`) E o Passo 5.5 (atividade concluída no Pipedrive com `user_id="Niverton Menezes"`) — nunca antes. (Decisão do Eric, 21/07/2026: antes disso os envios do Niverton não geravam atividade e ficavam invisíveis no CRM.)

### Passo 5: Atualizar status no MCP
```
mcp__expert-integrado__update_status_convite(
  participante_id=...,
  novo_status="convite_enviado"
)
```
Valores válidos: pendente_envio, convite_enviado, em_avaliacao, aceitou_convite, confirmado, recusou, sem_resposta (este último só no encerramento da cadência — ver skill verificar-convites).
NÃO usar `update_participante` pra status — ele não aceita o campo.

### Passo 5.5: Registrar atividade no Pipedrive (NA HORA DO ENVIO — vale pros DOIS operadores)

Pra cada convite enviado com sucesso, criar atividade **concluída** no Pipedrive registrando o disparo. Vale como histórico auditável e cobre os silenciosos. **Responsável da atividade = quem enviou:** `user_id="Eric Luciano"` no fluxo automatizado; `user_id="Niverton Menezes"` no kit manual (criada SÓ após a confirmação de envio dele — Passo 4-N, item 4). Um operador nunca registra atividade no nome do outro.

```
mcp__pipedrive__search_persons(term=<últimos 8 dígitos do telefone>)
# se não achar (contato novo):
mcp__pipedrive__create_person(
  name=<nome>,
  phone=<telefone>,        # formato 55XXXXXXXXXXX, só dígitos
  owner_id="Eric Luciano",
  custom_fields='{"Origem do Contato": "INDIC | Direta do Eric", "Pessoa que indicou": "Eric Luciano"}'
)
# NUNCA sobrescrever "Origem do Contato" de pessoa que já existe (regra CLAUDE.md: 1x na vida).

# Atividade já CONCLUÍDA numa chamada só (done=true cria retroativo):
mcp__pipedrive__create_activity(
  subject="Convite enviado, imersão, <DD.MM.AAAA>",
  type="whatsapp",
  due_date="<YYYY-MM-DD do envio>",   # sem due_time. NUNCA passar "" ou "00:00"
  person_id=<id>,
  user_id="<operador: Eric Luciano | Niverton Menezes>",
  note="Contexto: <segmento, de onde veio, quem trouxe>",
  done=true
)
```

**Pessoa nova no fluxo do Niverton:** raro (os convidados dele em geral já são leads dele no CRM). Se precisar criar, `owner_id="Niverton Menezes"` e confirmar a "Origem do Contato" com o operador antes de preencher — o default "INDIC | Direta do Eric" é do fluxo do Eric.

**Regra atualizada (Eric, 21/07/2026):** a versão anterior mandava criar atividade só para `convidado_por = "Eric Luciano"` — isso deixava os envios do Niverton sem rastro no Pipedrive. Agora TODO envio registra atividade, no nome de quem enviou.

**OBRIGATÓRIO mesmo em lote via script:** se o disparo for automatizado (script processando N pessoas), o registro no Pipedrive faz parte do loop de CADA pessoa: enviou as 4 msgs, registra na hora. NÃO deixar "pra depois". (Incidente 02/07/2026: os scripts de lote pularam este passo e 35 atividades tiveram que ser criadas retroativamente em backfill.)

### Passo 6: Resumo final
Tabela com: Nome | Segmento | Status envio | Status MCP | Pipedrive (act_id)

---

## LIMITAÇÃO TÉCNICA — números sem chat prévio

Por padrão o `whatsapp-agent__send` só envia pra números com chat existente. Pra números novos, retorna "Nenhum chat encontrado".

**Caminho oficial:** passar `allow_new=true` no `send` da 1ª mensagem (cria a entrada do chat). Dali em diante o `send` normal funciona.

```
mcp__whatsapp-agent__send(to=telefone, content=msg1, allow_new=true, confirmed=true)
```

**REGRA CRÍTICA:** A primeira mensagem JAMAIS pode ser "teste" ou conteúdo genérico. A primeira mensagem TEM que ser a Msg 1 real do segmento. Nunca fazer "ping" de teste em lead/cliente.

## REGRAS IMPORTANTES

1. **SEMPRE confirmar com Eric antes de disparar** — mostrar lista de quem vai receber e perguntar "confirmo o disparo?"
2. **Nunca mandar PDF com legenda** — PDF é mensagem separada (Msg 3)
3. **3s entre mensagens** — evitar bloqueio anti-spam
4. **Acentuação correta** em todas as mensagens (à, ã, é, ç)
5. **Primeiro nome apenas** na saudação
6. **Se falhar em alguém** — logar e continuar, reportar no resumo final
7. **Atualizar status SÓ se as 4 mensagens foram enviadas com sucesso**
8. **Trocar convidador = `update_participante(participante_id, convidado_por_user_id=..., convidado_por=...)`** — funciona direto (validado 02/07/2026). NUNCA usar delete + add pra isso (conflita com a Regra 11: deletar mata o token do PDF). ATENÇÃO: `update_participante(observacoes=...)` SOBRESCREVE o campo e não há tool pra ler as observações atuais — não mexer em observações via update.
9. **Normalizar telefone** antes de enviar (só dígitos, começando com 55)
10. **`status_presenca = "confirmado"` é DEFAULT de cadastro**, não significa que a pessoa confirmou — confirmação real é `status` do convite (aceitou_convite/confirmado)
11. **NUNCA deletar participante que já recebeu convite** — o link do PDF aponta pro token dele; deletar mata o botão de confirmação (a página mostra "link inválido")
