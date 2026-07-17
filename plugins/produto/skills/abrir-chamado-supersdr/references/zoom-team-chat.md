# Notificação no canal Produto <> CS — Zoom Team Chat

Quando um **bug** é criado/repassado, o time de Produto precisa ser avisado no canal **Produto <> CS** do Zoom Team Chat. Este documento define exatamente como.

> ⚠️ **Vale apenas para bugs.** Melhorias, features, integrações e pesquisas não geram notificação no canal — vão direto pro backlog e são triadas no fluxo normal.

---

## Por que isso existe

O canal Produto <> CS é onde Produto e CS conversam sobre incidentes em andamento. Os bugs que entram no backlog precisam aparecer ali pra que o time tenha visibilidade rápida — antes mesmo da triagem oficial. Isso evita que um bug crítico fique "escondido" no ClickUp esperando alguém olhar.

O fluxo manual atual é: a pessoa do CS entra no canal, cria um tópico, escreve uma mini explicação e cola o link do card. A skill automatiza essa etapa quando possível, e gera template pronto pra colar quando não.

---

## Protocolo de execução

### Passo 1 — Detectar se existe ferramenta MCP de envio

Procure no ambiente atual por alguma ferramenta MCP que envie mensagens no Zoom Team Chat. Use `tool_search` com queries como:

- `zoom send message`
- `zoom team chat post`
- `zoom create message channel`

Considere ferramenta válida apenas se atender TODOS estes critérios:

- Pertence ao Zoom (nome começa com `Zoom`, `zoom_`, `zoomteam`, etc.)
- O nome ou descrição indica **envio/criação** de mensagem (`send`, `post`, `create_message`, `send_message`)
- NÃO é só busca/leitura (`search_zoom`, `get_messages`, `list_channels` sozinhas não servem)

> ⚠️ **Atenção:** o MCP `Zoom for Claude` padrão (com `search_zoom`, `get_meeting_assets`, etc.) **é read-only e não serve**. Se for o único disponível, siga pro Passo 3 (modo manual).

### Passo 2 — Se existe ferramenta de envio: postar automaticamente

Se encontrou uma ferramenta de envio válida:

1. Identifique o ID/nome do canal **Produto <> CS** (pode ser necessário listar canais primeiro, dependendo da ferramenta).
2. Crie o post com:
   - **Título do tópico:** o título do card no ClickUp, **sem prefixo `[Bug]`** (ex: se o card é `[Bug] Áudio da IA chega cortado no WhatsApp`, o título do tópico é `Áudio da IA chega cortado no WhatsApp`).
   - **Corpo do post:** veja formato abaixo.
3. Se a ferramenta diferenciar entre "mensagem" e "post/tópico", **use post/tópico**.
4. Se der erro ao postar, NÃO bloqueie o fluxo — caia pro modo manual (Passo 3) e avise o usuário: "Não consegui postar automaticamente no canal. Cola o bloco abaixo manualmente:"

### Passo 3 — Se NÃO existe ferramenta de envio: gerar template pra colar

Mostre pro usuário um bloco formatado pra ele copiar e colar manualmente no canal. Use o mesmo formato do Passo 2, mas apresente como bloco de código pra facilitar o copy/paste.

---

## Formato do post

### Título do tópico
```
<título exato do card, SEM o prefixo [Bug]>
```

### Corpo do post
```
<resumo de 1-2 linhas descrevendo o problema>

Cliente afetado: <nome do cliente, ou "Todos os clientes">
Criticidade: 🔴 Crítico | 🟠 Alta | 🟡 Média | 🟢 Baixa
Card: <link completo do card no ClickUp>
```

### Exemplo completo

**Título:**
```
Áudio da IA chega cortado no WhatsApp
```

**Corpo:**
```
Áudio gerado pela IA está chegando cortado pros leads no WhatsApp desde a manhã de hoje. Esperado: áudio completo.

Cliente afetado: XYZ Consultoria (Marcos)
Criticidade: 🟠 Alta
Card: https://app.clickup.com/t/86abcd123
```

---

## Como apresentar o bloco pro usuário (modo manual)

Quando cair no modo manual (sem MCP de envio), formate assim na resposta final:

````
✅ Card criado: [link]
Asafe foi notificado pra triagem.

⬇️ Cola isso no canal **Produto <> CS** do Zoom Team Chat:

**Título do tópico:**
```
Áudio da IA chega cortado no WhatsApp
```

**Mensagem:**
```
Áudio gerado pela IA está chegando cortado pros leads no WhatsApp desde a manhã de hoje. Esperado: áudio completo.

Cliente afetado: XYZ Consultoria (Marcos)
Criticidade: 🟠 Alta
Card: https://app.clickup.com/t/86abcd123
```
````

> 💡 Use blocos de código separados para o título e a mensagem — facilita o copy/paste no Zoom (o usuário pode copiar um por vez).

---

## Erros e edge cases

- **Erro ao detectar ferramenta:** assume modo manual e segue.
- **Erro ao postar via MCP:** cai pro modo manual com aviso explícito ("Não consegui postar automaticamente, cola manualmente:").
- **Canal Produto <> CS não encontrado pela ferramenta:** lista os canais disponíveis pro usuário escolher; se ainda assim não achar, cai pro modo manual.
- **Bug sem cliente afetado identificado:** use "Cliente afetado: A confirmar" no corpo do post.
- **Bug sem criticidade preenchida:** isso não deveria acontecer (Passo A4 da skill garante que seja perguntado). Se acontecer, peça a criticidade antes de gerar o post.

---

## Quando NÃO postar

- Tipo do card ≠ Bug
- Usuário pediu explicitamente pra não notificar o canal
- O card já foi repassado antes (Fluxo B, card já estava no backlog há tempos) — nesse caso, pergunte ao usuário se quer notificar mesmo assim
