---
name: calendly-link
description: Gera um link de agendamento único (single-use) do Calendly para enviar ao lead. O lead escolhe o próprio horário; o link expira após um uso. TRIGGER quando o usuário pedir "cria link do Calendly", "gera link de agendamento", "link único pro lead", "manda link de diagnóstico", ou similar. NÃO disparar quando o pedido é AGENDAR a reunião num horário definido ("agenda a call", "marca reunião com o lead", "agenda o diagnóstico de fulano") — isso é a skill calendly-agendar. NÃO disparar quando o pedido é "link de WhatsApp" / "me passa o zap do fulano" — isso é entregar apenas https://wa.me/{numero}, sem Calendly. NÃO disparar quando o pedido exigir título, duração ou restrição de datas customizados — isso é link one-off, fora do escopo desta skill.
allowed-tools: mcp__calendly__calendly_list_event_types, mcp__calendly__calendly_create_scheduling_link, mcp__whatsapp-agent__send, Bash
---

# Calendly — Gerar Link Único (single-use)

Cria um link de agendamento single-use pra enviar ao lead via WhatsApp ou e-mail. O lead escolhe o próprio horário entre os slots disponíveis do Eric; após 1 agendamento o link expira automaticamente. A skill só GERA (e opcionalmente envia) o link — quem agenda é o lead.

## NUNCA

- NUNCA criar mais de 1 link por lead na mesma interação, a menos que o usuário peça explicitamente.
- NUNCA criar atividade manual no Pipedrive pra reunião que vai nascer desse link — a integração nativa Calendly→Pipedrive cria as atividades automaticamente quando o lead agendar (regra global do CLAUDE.md, seção "Agendamento de calls"; criar manual vira duplicata).
- NUNCA dizer que o link expira por tempo — ele NÃO tem data de expiração; expira por USO (após `max_uses` agendamentos).
- NUNCA enviar por WhatsApp sem antes perguntar se o envio é pelo agente ou se o Eric mesmo copia o link (Passo 4), e nunca sem o fluxo de 2 chamadas do `mcp__whatsapp-agent__send` (1ª sem `confirmed` → mostrar resumo ao Eric → 2ª com `confirmed: true` só após ok explícito).
- NUNCA usar `chatguru-mcp` pra enviar o link, a menos que Eric cite a palavra "ChatGuru" explicitamente (regra global dos 3 modos de WhatsApp).
- NUNCA inventar `event_type_uri` — sempre obter do Passo 1.

## SEMPRE

- SEMPRE `max_uses: 1` (single-use), salvo pedido explícito de outro valor.
- SEMPRE informar no retorno que o link expira após um agendamento.
- SEMPRE acentuação correta do português na mensagem externa ao lead.
- SEMPRE que disparar via `mcp__whatsapp-agent__send`, incluir a linha `https://wa.me/{numero}` no reporte final pro Eric clicar e conferir.
- SEMPRE telefone no formato `55XXXXXXXXXXX` (sem `+`, sem espaços) ao passar número pro whatsapp-agent.

## Pré-requisitos

- **Via oficial:** tools `mcp__calendly__*` disponíveis na sessão. No PC do Eric o server local vive em `C:/repos/calendly-mcp/index.js` e lê a env `CALENDLY_TOKEN` no processo do MCP (fonte canônica do token: 1Password, item `Calendly`, campo `credencial`). Em OUTRA máquina (notebook / VPS / headless) o caminho do server pode ser outro — NÃO assumir esse path; o que importa é se as tools `mcp__calendly__*` aparecem na sessão.
- **Como saber qual via usar (checar no início, antes do Passo 1):**
  - SE a tool `mcp__calendly__calendly_list_event_types` existe na sessão → seguir os Passos 1–2 normalmente (via oficial). É o caminho preferido em qualquer máquina onde o MCP esteja carregado.
  - SENÃO (tools `mcp__calendly__*` ausentes — comum em headless/VPS sem esse MCP) → antes de tentar o fallback REST, verificar as duas dependências que ele exige, rodando no shell:

    ```sh
    command -v node && command -v op
    ```

    - SE AMBOS imprimem um caminho (exit 0) → usar o fallback via API REST (seção "Erros comuns e recovery", item 4).
    - SE `node` ou `op` (ou os dois) NÃO aparecem (linha vazia / exit ≠ 0) → o fallback é impossível nesta máquina. NÃO improvisar outra via (não reescrever o parse do JWT em outra linguagem, não pedir o token em texto). Reportar ao Eric exatamente o que falta, ex.: *"Nesta sessão não há o MCP Calendly nem `node`/`op` pra usar o fallback REST — rode a skill numa máquina com o MCP Calendly ativo (PC) ou instale `node` + `op` CLI aqui."* e PARAR.
- Opcional (só se for enviar ao lead): MCP `whatsapp-agent` ativo. Se a tool `mcp__whatsapp-agent__send` não existir no ambiente, pular a oferta de envio (Passo 4) e entregar só o link + mensagem pra copiar (Passo 3).

## Passos

### 1. Identificar o tipo de evento

Chamar `mcp__calendly__calendly_list_event_types` (sem parâmetros).

**Forma exata da resposta** (o que a tool retorna — usar esses nomes de campo literais, não inferir):

```json
{
  "event_types": [
    {
      "uri": "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
      "uuid": "AAAAAAAAAAAAAAAA",
      "name": "Diagnóstico de IA e Automação",
      "slug": "diagnostico",
      "duration_minutes": 60,
      "scheduling_url": "https://calendly.com/eric_expertintegrado/diagnostico",
      "description": "...",
      "locations": [ ... ]
    }
  ]
}
```

O valor que o Passo 2 precisa é literalmente o campo `event_types[i].uri` do item escolhido (uma URL começando com `https://api.calendly.com/event_types/`). O `name` e o `duration_minutes` são só pra exibir e pra fazer o match abaixo.

**Validação:** resposta é um objeto com a chave `event_types`, que é um array com ≥ 1 item; cada item tem as chaves `uri` (string começando com `https://api.calendly.com/event_types/`), `name` (string) e `duration_minutes` (número). SE a resposta não tiver `event_types` ou o array estiver vazio, ou vier erro → seção "Erros comuns e recovery"; NÃO seguir sem a lista.

**Decisão:**
- SE o pedido exigir título customizado, duração diferente das ofertadas ou restrição de datas → NÃO é esta skill (isso é link one-off); avisar o usuário e PARAR.
- SE o pedido já identifica o tipo sem ambiguidade → aplicar o critério de match abaixo (NÃO perguntar). Cada apelido do pedido aponta para um item da lista real retornada pela tool; o item alvo é escolhido POR CORRESPONDÊNCIA VERIFICÁVEL, não por adivinhação:

  | Apelido no pedido do Eric | Critério de match no array `event_types` (aplicar nesta ordem) |
  |---|---|
  | "diagnóstico" / "link de diagnóstico" | 1º) item com `slug == "diagnostico"`; 2º) senão, item cujo `name` (minúsculas, sem acento) contenha a palavra `diagnostico`. |
  | "apresentação de projeto" / "apresentação" | 1º) item cujo `name` (minúsculas, sem acento) contenha `apresentacao`; se houver mais de um, o que também contenha `projeto`. |
  | "reunião geral" COM duração citada (ex.: "reunião geral de 30", "de 60min") | item cujo `name` (minúsculas, sem acento) contenha `reuniao geral` E `duration_minutes` == a duração citada (30 ou 60). |

  **Regra de match (obrigatória, elimina a adivinhação por similaridade):**
  - O nome real na conta Calendly pode diferir do apelido (ex.: retornar `"Diagnóstico IA & Automação"` ou `"Diagnóstico de IA e Automação (60min)"`, ou duração 45 em vez de 60). O critério NÃO exige nome idêntico — exige a correspondência da tabela acima (slug exato quando houver, senão substring normalizada do `name`).
  - Normalizar antes de comparar: minúsculas + remover acentos (ç→c, á/à/â/ã→a, é/ê→e, í→i, ó/ô/õ→o, ú→u).
  - SE exatamente 1 item bate no critério → usar esse item, sem perguntar. Guardar o `uri` dele pro Passo 2 e o `name`/`duration_minutes` reais (os que a tool retornou, não os do apelido) pro Passo 3.
  - SE 0 itens batem (o tipo esperado não existe na conta) OU ≥ 2 itens batem (ambíguo) → NÃO adivinhar: cair no menu numerado abaixo (mesmo que o pedido parecesse identificar o tipo).
- SENÃO (tipo ambíguo no pedido, "reunião geral" sem duração, ou o match acima deu 0 ou ≥2) → apresentar menu compacto numerado, montado com os itens REAIS retornados pela tool (um por linha: `N. {name} ({duration_minutes}min)`, na ordem em que vieram no array), e aguardar a escolha do Eric em silêncio. Exemplo de formato (os textos exatos vêm da tool, não deste exemplo):

```
Qual tipo de evento?
1. Diagnóstico de IA e Automação (60min)
2. Apresentação de Projeto (60min)
3. Reunião geral (30min)
4. Reunião geral (60min)
... (demais itens do array)
```

Depois da escolha do Eric (número) → usar o `uri` do item correspondente daquela linha.

### 2. Gerar o link

Chamar `mcp__calendly__calendly_create_scheduling_link` com estes dois parâmetros:
- `event_type_uri`: o valor LITERAL do campo `event_types[i].uri` do item escolhido no Passo 1 (a URL `https://api.calendly.com/event_types/...`). NÃO usar o `scheduling_url`, o `uuid` nem o `name` — é o `uri`.
- `max_uses`: `1`

**Forma exata da resposta** (usar esses nomes de campo literais):

```json
{
  "booking_url": "https://calendly.com/d/xxx-yyy-zzz",
  "owner_uri": "https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA",
  "expires_at": null,
  "instructions": "Envie este link ao convidado via WhatsApp ou e-mail. ..."
}
```

O link a entregar ao Eric é o campo `booking_url`. (CORREÇÃO-DE-FATO golden run 06/07/2026: a resposta real NÃO traz campo de contagem de usos — validar só o `booking_url`; o single-use é confirmado pela frase do campo `instructions`.)

**Validação:** resposta contém `booking_url` como string começando com `https://calendly.com/` (formato típico: `https://calendly.com/d/xxx-yyy-zzz`). Campo `expires_at` vir `null` é normal e esperado (o link não expira por tempo, só por uso). SE `booking_url` vier ausente ou vazio → tratar como falha (ver abaixo).

**Se falhar:** erro de rede/5xx → retry 1x; persistindo, reportar o erro literal ao Eric e PARAR. Erro 4xx → NÃO repetir; reportar e PARAR (não gerar link por outra via sem ok dele).

### 3. Retornar ao usuário

Template de saída (interno, pro Eric):

```
Link único gerado — expira após 1 agendamento:
{booking_url}
Tipo: {nome do evento} ({duração}min)

Sugestão de mensagem pro WhatsApp:
--- MENSAGEM PRO LEAD (somente o texto entre estes marcadores vai no content do send) ---
Oi {Nome}, tudo bem? Segue o link pra você escolher o melhor horário pra gente conversar:
{booking_url}
Após agendar, você recebe a confirmação com o link Zoom automaticamente.
--- FIM DA MENSAGEM ---
```

O texto da mensagem sugerida ao lead é FIXO (voz do Eric) — não reescrever, só preencher `{Nome}` e `{booking_url}`.

**O que vai no `content` do `mcp__whatsapp-agent__send` (Passo 4):** SOMENTE o texto entre os marcadores `--- MENSAGEM PRO LEAD ... ---` e `--- FIM DA MENSAGEM ---` (as próprias linhas de marcador NÃO entram — são só delimitadores pra você). O bloco de cima (a linha "Link único gerado — expira após 1 agendamento", o `booking_url` avulso, a linha "Tipo: ...") é INTERNO pro Eric e NUNCA vai na mensagem enviada ao lead.

### 4. Envio via WhatsApp (árvore de decisão)

- SE o usuário quiser enviar no WhatsApp (verbo de envio no pedido, ex: "manda pro lead", "manda no WhatsApp dele", ou pedido posterior) → perguntar UMA vez: "Envio pelo agente no WhatsApp do lead ou você copia e manda?" — e aguardar em silêncio (não repetir a pergunta).
  - **Por que perguntar mesmo quando o pedido já diz "manda no WhatsApp dele":** a pergunta NÃO é sobre *se* vai pro WhatsApp — é sobre QUEM dispara (o agente via `mcp__whatsapp-agent__send`, que é um side-effect externo de mensagem a terceiro; ou o Eric copiando o link e mandando ele mesmo). "manda no WhatsApp dele" não diz qual dos dois. Regra determinística: SEMPRE fazer essa pergunta antes de qualquer disparo pelo agente — NUNCA pular, mesmo que o pedido original tenha verbo de envio explícito. (Consistente com o bloco `## NUNCA` e com o Exemplo, onde o pedido diz "manda no WhatsApp dele" e ainda assim a skill pergunta.) A única coisa que o verbo de envio no pedido decide é ENTRAR neste Passo 4; ele nunca dispensa a pergunta.
  - SE Eric escolher envio pelo agente → fluxo de 2 chamadas do `mcp__whatsapp-agent__send`:
    1. 1ª chamada SEM `confirmed`: `{ to: "<nome ou 55XXXXXXXXXXX>", content: "<APENAS o texto entre os marcadores --- MENSAGEM PRO LEAD ... --- e --- FIM DA MENSAGEM --- do Passo 3, preenchido; SEM as linhas de marcador e SEM o bloco interno pro Eric (Link único gerado / Tipo / booking_url avulso)>", type: "text" }` → o MCP bloqueia e devolve o resumo → mostrar ao Eric.
    2. Após ok explícito do Eric ("sim", "confirma", "pode enviar") → 2ª chamada com `confirmed: true`.
    3. Reporte final: incluir `https://wa.me/{numero}`.
  - SE Eric escolher copiar → nada além do Passo 3. Fim.
- SENÃO (pedido foi só "cria/gera o link", sem menção a envio) → entregar o Passo 3 e encerrar, sem oferecer envio.
- SE Eric citou "ChatGuru" explicitamente → usar `chatguru-mcp` (tom institucional), nunca o whatsapp-agent.

## Validação final (checklist)

- [ ] `booking_url` retornado e entregue ao Eric
- [ ] Tipo de evento e duração informados
- [ ] Aviso "expira após um agendamento" incluído
- [ ] Só 1 link criado nesta interação (salvo pedido explícito de mais)
- [ ] Mensagem ao lead com acentuação correta e texto fixo do template
- [ ] Se enviou por WhatsApp: Eric escolheu envio pelo agente + confirmou o resumo + linha `wa.me` no reporte
- [ ] NENHUMA atividade Pipedrive criada manualmente

## Erros comuns e recovery

1. **`CALENDLY_TOKEN não configurado`** — env ausente no processo do MCP. Recovery: token vive no 1P (item `Calendly`, campo `credencial`); no PC/notebook, rodar `claude-sync/secrets-bootstrap/windows/setup-secrets.ps1` pra propagar pro `~/.claude.json` e reiniciar a sessão; na VPS, `/opt/secrets-bootstrap/linux/setup-vps.sh` + restart dos containers. Reportar ao Eric e parar.
2. **HTTP 401** — token inválido/expirado. Recovery: rotação é no 1P + repropagar (mesmo caminho do item 1). Reportar ao Eric e parar — não rotacionar sem confirmação.
3. **HTTP 403 em `/scheduling_links`** — PAT sem escopo `scheduling_links:write`. Recovery: regenerar o token no Calendly com os escopos (nota no `tokens-manifest.yaml`). Reportar e parar.
4. **Tools `mcp__calendly__*` ausentes na sessão** (headless/ambiente sem o MCP) — fallback via API REST, mesmo comportamento. **Pré-condição:** `command -v node && command -v op` já retornou ambos com sucesso (checagem do bloco "Pré-requisitos"); se algum faltou, NÃO tente o fallback — reporte e pare conforme aquele bloco.

   **Obter o token (`CALENDLY_TOKEN`) — resolver a fonte ANTES de rodar o resto:**
   - SE a env `CALENDLY_TOKEN` já está setada no shell (testar: `test -n "$CALENDLY_TOKEN" && echo has-token`) → usar direto, sem tocar no `op`.
   - SENÃO → ler do 1Password com `op read "op://Agentes Eric/Calendly/credencial"`. Isso exige o `op` CLI AUTENTICADO. Como validar e destravar o `op` (nesta ordem):
     1. Testar autenticação: `op whoami`. SE retorna a conta (exit 0) → `op` está logado, seguir.
     2. SE `op whoami` falha com algo como *"you are not currently signed in"* / *"no active session"*:
        - **Service Account (caminho do desktop do Eric):** o `op` autentica via env var `OP_SERVICE_ACCOUNT_TOKEN` (read-only no vault `Agentes Eric`, sem prompt). Se ela existir no ambiente, um processo NOVO já lê secrets — rodar o `op read` num shell novo resolve. Testar se está setada: `test -n "$OP_SERVICE_ACCOUNT_TOKEN" && echo sa-set`. SE `sa-set` mas o `op read` ainda falha → o processo atual não herdou a env; reportar ao Eric que a sessão precisa ser reiniciada pra herdar `OP_SERVICE_ACCOUNT_TOKEN` e PARAR.
        - **Sessão interativa (sem Service Account):** o login (`op signin`) é interativo e pode exigir biometria/senha — NÃO tentar automatizar nem pedir a senha do Eric aqui. Reportar: *"O `op` CLI não está autenticado nesta sessão (nem via `OP_SERVICE_ACCOUNT_TOKEN`). Faça `op signin` num terminal seu e rode a skill de novo, OU rode numa máquina com o MCP Calendly ativo (PC)."* e PARAR.
        - **Última alternativa (não improvisar):** só se o Eric fornecer o token explicitamente, setar `CALENDLY_TOKEN` no shell e prosseguir. Nunca pedir/logar o valor do token de forma proativa.

   Com o token resolvido:

```sh
TOKEN="${CALENDLY_TOKEN:-$(op read "op://Agentes Eric/Calendly/credencial")}"
# guarda: só seguir se o token não veio vazio
test -n "$TOKEN" || { echo "SEM TOKEN — reportar ao Eric e parar"; exit 1; }
# user_uuid está no payload do próprio PAT (JWT) — dispensa scope users:read
UUID=$(TOKEN="$TOKEN" node -e 'const p=process.env.TOKEN.split(".")[1];console.log(JSON.parse(Buffer.from(p,"base64").toString()).user_uuid)')
# Passo 1 — listar tipos de evento (resposta REST: itens em .collection[], cada um com .uri, .name, .duration)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.calendly.com/event_types?user=https%3A%2F%2Fapi.calendly.com%2Fusers%2F$UUID&active=true&count=100"
# Passo 2 — gerar link single-use (booking_url vem em .resource.booking_url)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"max_event_count":1,"owner":"{event_type_uri}","owner_type":"EventType"}' \
  https://api.calendly.com/scheduling_links
```

   Nota: no fallback REST bruto os tipos de evento vêm em `.collection[]` (campo `.duration`, não `.duration_minutes`) — a normalização/menu do Passo 1 são os mesmos, só o caminho do JSON muda. O `booking_url` do Passo 2 sai em `.resource.booking_url`.

5. **`send` retorna "BLOQUEADO: confirmacao pendente"** — comportamento esperado da 1ª chamada. Mostrar o resumo ao Eric e aguardar confirmação; NÃO é erro.
6. **`send` bloqueado por inbound recente não respondido** — o lead mandou mensagem há < 10min sem resposta. Confirmar com Eric antes de repetir com `force_send_after_inbound: true`.

## Exemplo

Pedido: *"gera link de diagnóstico pro João e manda no WhatsApp dele (11 99999-8888)"*

1. `calendly_list_event_types` → aplicar o match do Passo 1: "diagnóstico" → item com `slug == "diagnostico"` → exatamente 1 bate → usar sem perguntar; guardar o `uri` desse item e o `name`/`duration_minutes` reais que a tool devolveu (ex.: **Diagnóstico de IA e Automação**, 60min).
2. `calendly_create_scheduling_link(event_type_uri: <valor de event_types[i].uri do passo 1>, max_uses: 1)` → campo `booking_url` da resposta = `https://calendly.com/d/xxx-yyy-zzz`.
3. Entrega o link + mensagem sugerida com "João" e pergunta UMA vez: "Envio pelo agente no WhatsApp do lead ou você copia e manda?".
4. Eric: "envia" → `send` SEM `confirmed` (`to: "5511999998888"`, `content`: template preenchido) → resumo → Eric confirma → `send` com `confirmed: true`.
5. Reporte: link + tipo + "expira após 1 agendamento" + `https://wa.me/5511999998888`.
