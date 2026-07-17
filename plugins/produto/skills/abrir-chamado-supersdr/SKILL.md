---
name: abrir-chamado-supersdr
description: "Abre ou revisa chamados (bugs, melhorias, features, integrações ou pesquisas) do SuperSDR no backlog do time de Produto via ClickUp e, no caso de bugs, também notifica o time no canal Produto/CS do Zoom Team Chat (via MCP se disponível, ou gerando template pra colar manualmente). Use esta skill SEMPRE que o usuário mencionar: abrir chamado, registrar bug, reportar problema, sugerir melhoria, pedir feature, solicitar integração, quero reportar, preciso registrar, abrir card, criar solicitação para o produto, revisar card, passar card pro produto, mandar card pro backlog, ou qualquer variação de 'preciso reportar/registrar/abrir/passar algo para o time de produto'. Também ative se o usuário descrever um comportamento errado do SuperSDR ou colar um link de card do ClickUp pedindo pra repassar."
---

# Abrir Chamado — SuperSDR

Skill para que o time de CS e Suporte registre solicitações do SuperSDR de forma padronizada, criando ou repassando cards no backlog do time de Produto via ClickUp.

> ⚠️ **Prioridade absoluta: usabilidade e velocidade.** O fluxo deve ser o mais rápido possível. Se o usuário já mandou tudo de uma vez (texto longo, áudio transcrito, etc.), processa e só pergunta o que realmente falta. Não use jargão de produto.

---

## Contexto

- **Produto:** SuperSDR (plataforma de automação de vendas com IA)
- **Destino dos cards:** Lista de backlog de solicitações — `901324995607`
- **Triagem de bugs:** Asafe Silva (marcado via comentário nos bugs)
- **Ferramenta de imagens:** Postimages (https://postimages.org/) — única opção validada

---

## Dois fluxos possíveis

A skill tem **dois caminhos** dependendo do que o usuário envia:

### 🆕 Fluxo A — Criar chamado do zero
Usuário não tem card pronto. Skill coleta as informações, monta a descrição e cria o card direto no backlog.

### 🔁 Fluxo B — Revisar e repassar card existente
Usuário cola um **link** (`https://app.clickup.com/t/abc123`) ou **ID** (`abc123`) de um card que já abriu na lista do cliente. Skill lê o card, verifica o que falta, completa só o necessário e **adiciona** o card no backlog (sem duplicar — usa multi-list).

**Como detectar qual fluxo usar:**
- Se a mensagem contém URL do ClickUp (`app.clickup.com/t/...`) ou um ID solto que parece de task → **Fluxo B**
- Senão → **Fluxo A**

---

## Princípios de UX

- **Velocidade > formalidade.** Se o usuário despejou contexto completo de uma vez, processa tudo e pula direto pra confirmação. Não force pergunta-a-pergunta.
- **Pergunte só o que falta.** Se o usuário já trouxe a informação, não repita.
- **Sem limite rígido de perguntas.** Pergunta o necessário para preencher o template do tipo — pode ser 2, pode ser 6.
- **Linguagem simples.** Nada de "história de usuário", "story points", "DoR". O usuário não é técnico.
- **Confirme antes de criar/atualizar.** Resumo em linguagem natural.

---

# 🆕 Fluxo A — Criar chamado do zero

## Passo A1 — Identificar o tipo

Se o usuário ainda não disse, ofereça:

> Olá! Vou te ajudar a abrir um chamado para o Produto. Qual o tipo?
>
> 🐛 **Bug** — algo parou de funcionar ou está errado
> 💡 **Melhoria** — algo funciona, mas poderia ser melhor
> ✨ **Feature** — funcionalidade nova
> 🔌 **Integração** — conectar SuperSDR com outro sistema (CRM, ERP, etc.)
> 🔍 **Pesquisa/Validação** — investigar algo antes de decidir

Se o usuário já descreveu o problema, **classifique automaticamente** e confirme em 1 linha:
> *"Pelo que descreveu, parece ser um Bug. Sigo com esse tipo?"*

---

## Passo A2 — Coletar informações

Carregue o template correspondente em `references/`:

| Tipo | Arquivo |
|---|---|
| Bug | `references/template-bug.md` |
| Melhoria | `references/template-melhoria.md` |
| Feature | `references/template-feature.md` |
| Integração | `references/template-integracao.md` |
| Pesquisa/Validação | `references/template-pesquisa.md` |

Cada template lista as **informações mínimas necessárias**. Se o usuário já trouxe parte delas, pule essas perguntas. Pergunte só o que falta — pode ser em uma mensagem só ("Falta o nome do cliente afetado e o print, manda os dois?") ou separadas se fizer mais sentido.

---

## Passo A3 — Imagens (quando aplicável)

Se o usuário menciona print/imagem mas ainda não enviou:

> *"Pra anexar o print:*
> *1. Acessa https://postimages.org/*
> *2. Cola a imagem com Ctrl+V*
> *3. Copia o link gerado e cola aqui"*

Aceite múltiplos links. Vão para duas coisas (ver Passo A5).

---

## Passo A4 — Perguntar Prioridade ou Criticidade

**Para Bug:** pergunte apenas Criticidade — Prioridade é mapeada automaticamente.

> Qual a criticidade desse bug?
>
> 🔴 **Crítico** — sistema parado, perda de dados, todos os clientes
> 🟠 **Alta** — funcionalidade principal quebrada, sem workaround
> 🟡 **Média** — funcionalidade comprometida mas com workaround
> 🟢 **Baixa** — problema cosmético ou edge case raro

**Mapeamento automático Criticidade → Prioridade nativa:**
- Crítico → `urgent`
- Alta → `high`
- Média → `normal`
- Baixa → `low`

**Para os outros tipos** (Melhoria, Feature, Integração, Pesquisa): pergunte só Prioridade direto:

> Qual a prioridade?
>
> 🔴 Urgente — bloqueando algo importante
> 🟠 Alta — afeta muitos clientes ou cliente estratégico
> 🟡 Normal — sem urgência específica
> 🟢 Baixa — quando der

---

## Passo A5 — Confirmar e criar

Apresente resumo em linguagem natural:
- Tipo
- Título sugerido
- Resumo da descrição
- Cliente(s) afetado(s)
- Criticidade (se bug) / Prioridade
- Quem está reportando
- Quantidade de imagens (se houver)

Pergunte: *"Posso criar?"*

Após confirmar, chame `clickup_create_task` com:

| Parâmetro | Valor |
|---|---|
| `list_id` | `901324995607` |
| `name` | Título no formato `[Tipo] descrição curta` |
| `markdown_description` | Descrição do template + imagens em Markdown (ver abaixo) |
| `priority` | `urgent` / `high` / `normal` / `low` |
| `assignees` | User ID do CS reportando (resolver com `clickup_resolve_assignees`) |
| `custom_fields` | Categoria (obrigatória) + Criticidade (se bug) — ver `references/campos-clickup-backlog.md` |

### Imagens no card

Imagens devem aparecer **duas vezes**:

1. **Inline na descrição em Markdown**, dentro da seção "Evidências":
   ```markdown
   ## 📎 Evidências
   ![Print 1](https://i.postimg.cc/xyz/print1.png)
   ![Print 2](https://i.postimg.cc/xyz/print2.png)
   ```

2. **Anexadas ao card via URL** usando `clickup_attach_task_file` com o link do Postimages (não enviar base64 — sempre passar a URL).

> ⚠️ Sempre use `markdown_description`, nunca `description`. O ClickUp só renderiza Markdown via `markdown_description`.

---

## Passo A6 — Comentário de triagem (somente Bugs)

Após criar o card de bug, chame `clickup_create_task_comment`:

```
🔴 Bug registrado pelo time de CS. @Asafe Silva — triagem necessária.

Cliente(s) afetado(s): [nome(s)]
Reportado por: [nome do CS]
Criticidade: [Crítico/Alta/Média/Baixa]
```

- Assignee do comentário: Asafe Silva (`81900233`)

---

## Passo A7 — Notificar canal Produto <> CS no Zoom Team Chat (somente Bugs)

> ⚠️ **Aplica-se apenas a Bugs.** Para outros tipos (Melhoria, Feature, Integração, Pesquisa), pule este passo.

Quando um bug é criado, o time de Produto precisa ser notificado no canal **Produto <> CS** do Zoom Team Chat com um tópico/post. Siga o protocolo de detecção de ferramentas em `references/zoom-team-chat.md` para decidir entre **automatizar** ou **gerar template pra copiar**.

**Resumo do protocolo:**

1. Verifique se existe alguma ferramenta MCP que envie mensagem no Zoom Team Chat (procure por nomes contendo `zoom` + `send`/`post`/`chat_message`/`create_message`). Use `tool_search` se necessário.
2. **Se existir:** poste o tópico no canal Produto <> CS automaticamente, usando o formato definido em `references/zoom-team-chat.md`.
3. **Se NÃO existir** (caso mais comum hoje): gere o bloco de texto formatado e mostre pro usuário copiar e colar manualmente no canal.

Em ambos os casos, o conteúdo do post segue o mesmo formato:

- **Título do tópico:** o título do card (sem prefixo `[Bug]`)
- **Corpo do post:** resumo de 1-2 linhas + cliente afetado + criticidade + link do card

Detalhes completos, exemplos e mensagens de erro em `references/zoom-team-chat.md`.

---

## Passo A8 — Confirmação final

> ✅ Pronto! Card criado: [link]
> O card está no backlog.
> [Se bug + Zoom MCP disponível: "Time de Produto notificado no canal Produto <> CS. Asafe foi marcado pra triagem."]
> [Se bug + Zoom MCP NÃO disponível: "Asafe foi notificado pra triagem. ⬇️ Cola o bloco abaixo no canal Produto <> CS pra avisar o time:"] + bloco do post
> Quer abrir outro chamado?

---

# 🔁 Fluxo B — Revisar e repassar card existente

## Passo B1 — Identificar e ler o card

Extraia o ID do card da mensagem:
- URL `https://app.clickup.com/t/abc123` → ID = `abc123`
- ID solto `abc123` → use direto

Chame `clickup_get_task` com `detail_level: "detailed"`.

> *"Beleza, vou dar uma olhada nesse card e te aviso o que falta pra repassar pro Produto."*

---

## Passo B2 — Identificar o tipo do card

Tente inferir o tipo nessa ordem:

1. **Campo Categoria já preenchido no card?** Use ele.
2. **Título tem prefixo** (`[Bug]`, `[Bug]`, `[Melhoria]`, etc.)? Use ele.
3. **Conteúdo da descrição** sugere bug/melhoria/feature/integração/pesquisa? Infira e **confirme com o usuário**:
   > *"Esse card parece ser um Bug. Confirma?"*

Após confirmar, carregue o `template-*.md` correspondente para saber o mínimo necessário.

---

## Passo B3 — Auditar o card contra o mínimo do template

Compare o que está no card com o que o template do tipo exige:

- ✅ **Tudo preenchido?** Pule pro Passo B5.
- ⚠️ **Faltam informações?** Pergunte ao usuário **só o que falta** (de uma vez se forem poucas).

> *"Card está quase pronto. Faltam só duas coisas pra eu repassar:*
> *1. Qual cliente foi afetado?*
> *2. Tem print do erro?"*

Se faltar criticidade (bug) ou prioridade (outros), pergunte conforme Passo A4.

---

## Passo B4 — Completar o card SEM destruir o que já existe

Use `clickup_update_task` para **anexar** informações novas:

- **Descrição:** pegue o `markdown_description` original e **adicione no final** uma seção `## 🆕 Informações Complementares (adicionadas para triagem)` com o que faltava. **Não reescreva nem reformate** o conteúdo original.
- **Campos personalizados que faltavam:** preencha via `custom_fields`. Não toque nos que já estavam preenchidos.
- **Prioridade:** se faltava, preencha. Se já tinha, mantenha.
- **Imagens novas** (se o CS mandou): anexe via `clickup_attach_task_file` com URL + adicione no final da nova seção em Markdown:
  ```markdown
  ## 🆕 Evidências Adicionais
  ![Print](https://i.postimg.cc/.../print.png)
  ```

> ⚠️ **Regra de ouro:** se o card já está formatado, não mexa na formatação existente. Só **adicione**.

---

## Passo B5 — Adicionar o card ao backlog (sem duplicar)

Chame `clickup_add_task_to_list` com:
- `task_id`: ID do card existente
- `list_id`: `901324995607`

Isso mantém o card na lista original (cliente) E o adiciona ao backlog do produto. Não cria duplicata.

---

## Passo B6 — Comentário de triagem (somente Bugs)

Igual ao Passo A6 — se for bug, criar comentário marcando Asafe Silva (`81900233`).

---

## Passo B7 — Notificar canal Produto <> CS no Zoom Team Chat (somente Bugs)

Mesma lógica do Passo A7 do Fluxo A: se for bug, siga o protocolo em `references/zoom-team-chat.md` para postar (via MCP se disponível) ou gerar o template pra colar manualmente no canal Produto <> CS.

---

## Passo B8 — Confirmação final

> ✅ Pronto! O card original continua na lista do cliente e agora também aparece no backlog do Produto: [link]
> [Se bug + Zoom MCP disponível: "Time de Produto notificado no canal Produto <> CS. Asafe foi marcado pra triagem."]
> [Se bug + Zoom MCP NÃO disponível: "Asafe foi notificado pra triagem. ⬇️ Cola o bloco abaixo no canal Produto <> CS:"] + bloco do post
> [Se completou informações: "Adicionei as informações que faltavam no final da descrição, sem mexer no que você já tinha escrito."]

---

# Regras gerais (válidas pros dois fluxos)

## Tratamento de Erros

- **MCP do ClickUp indisponível:** *"Não consegui acessar o ClickUp agora. Tenta de novo em alguns minutos."*
- **Card não encontrado (Fluxo B):** *"Não achei esse card. Confere se o link/ID está certo? Se for um card privado, talvez eu não tenha acesso."*
- **Nome do CS não resolvido:** Criar/atualizar mesmo assim e avisar: *"Não consegui te marcar como responsável automaticamente. Abre o link e se atribua manualmente."*
- **Link de imagem inválido:** *"Esse link não parece ser do Postimages. Confere se começa com `https://postimg.cc/` ou `https://i.postimg.cc/`?"*

## Outros pontos

- **Múltiplos clientes afetados:** registre todos. Se forem todos, escreva "Todos os clientes".
- **Campo Produto:** preencher como Super SDR Silver/GOLD/Black quando identificável pelo cliente afetado. Se não souber, deixar em branco — **não pergunte ao CS** (fricção desnecessária).
- **Não invente informações.** Se faltar algo essencial, pergunte. Se for opcional e não veio, omita.

---

## Exemplo rápido — Fluxo A (Bug, contexto completo de uma vez)

**Usuário:** Preciso reportar um bug — o áudio da IA está chegando cortado no WhatsApp pro cliente Marcos da XYZ Consultoria desde hoje de manhã. Aqui o print: https://postimg.cc/abc123

**Claude:** (já tem quase tudo: descrição, cliente, evidência, data. Falta só comportamento esperado, criticidade e o nome do CS)

> Entendi. Só me confirma 3 coisas rápidas:
> 1. O áudio deveria chegar **completo**, certo? (só pra deixar explícito na descrição)
> 2. Qual a criticidade? 🔴 Crítico / 🟠 Alta / 🟡 Média / 🟢 Baixa
> 3. Seu nome (pra te marcar como responsável)

**Usuário:** Sim, áudio completo. Alta. Késia Nandi.

**Claude:** Perfeito. Aqui o resumo:
- 🐛 Bug — `[Bug] Áudio da IA chega cortado no WhatsApp`
- Cliente: XYZ Consultoria (Marcos)
- Desde hoje de manhã
- Criticidade: 🟠 Alta
- 1 print anexado
- Reportado por: Késia Nandi

Posso criar?

**Usuário:** Pode

**Claude:** ✅ Card criado: [link]. Asafe foi notificado pra triagem.

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
Card: [link]
```

Quer abrir outro?

---

## Exemplo rápido — Fluxo B (Card existente faltando informação)

**Usuário:** Tenho esse card aqui que abri pro cliente, pode passar pro produto? https://app.clickup.com/t/9ab12cd

**Claude:** (lê o card → é um bug, mas falta cliente afetado e criticidade)

> Card recebido. Tá quase pronto. Faltam só 2 coisas pra triagem:
> 1. Qual cliente foi afetado?
> 2. Criticidade do bug? 🔴 Crítico / 🟠 Alta / 🟡 Média / 🟢 Baixa

**Usuário:** Cliente ABC Tech, criticidade Alta

**Claude:** ✅ Pronto! O card continua na lista do cliente e agora também está no backlog: [link]. Adicionei as informações que faltavam no final da descrição, sem mexer no que você já tinha. Asafe foi notificado pra triagem.

⬇️ Cola isso no canal **Produto <> CS** do Zoom Team Chat:

**Título do tópico:**
```
<título do card>
```

**Mensagem:**
```
<resumo de 1-2 linhas do problema>

Cliente afetado: ABC Tech
Criticidade: 🟠 Alta
Card: [link]
```
