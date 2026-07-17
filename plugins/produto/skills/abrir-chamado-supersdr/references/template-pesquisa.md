# Template — Pesquisa/Validação 🔍

> **Quando usar:** quando você precisa que o time de Produto **investigue** algo antes de decidir o que fazer. Não é um bug nem uma feature pronta — é uma pergunta que precisa de resposta.
>
> Exemplos:
> - "Será que dá pra fazer X com a tecnologia atual?"
> - "Por que esse comportamento estranho está acontecendo? Não sei se é bug ou feature."
> - "Vale a pena trocar a ferramenta Y pela Z?"

> ⚠️ **Internamente este tipo é chamado de "Spike"** no ClickUp, mas use sempre "Pesquisa/Validação" ao falar com o usuário.

---

## Perguntas para coletar (uma por vez)

1. **O que precisa ser investigado/validado?** *(pergunta central que o time de Produto precisa responder)*
2. **Por que essa investigação é importante?** *(o que depende dessa resposta? cliente esperando? decisão de negócio?)*
3. **Qual(is) cliente(s) está(ão) envolvido(s)?** *(nome(s), vários, todos, ou "investigação interna")*
4. **Tem algum contexto ou print que ajude?** *(link do Postimages, se houver)*
5. **Qual a prioridade?** *(ver SKILL.md, Passo 3)*

> Se o usuário já trouxe alguma dessas informações espontaneamente, pule a pergunta.

---

## Instrução para prints (se aplicável)

> *"Se tiver alguma evidência ou print, acessa https://postimages.org/, cola a imagem com Ctrl+V, copia o link e me manda aqui."*

---

## Título sugerido

Formato: `[Pesquisa] <pergunta central a ser respondida>`

Exemplos:
- `[Pesquisa] Por que alguns áudios chegam cortados no WhatsApp?`
- `[Pesquisa] Viabilidade de migrar áudio do ElevenLabs para Cartesia`
- `[Pesquisa] Qual o limite de contatos simultâneos por sessão?`

---

## Template de descrição (markdown_description)

```markdown
## 🔍 Pergunta a Responder

[Qual é a pergunta central que o time de Produto precisa investigar?]

---

## 🎯 Por que Importa

[O que depende dessa resposta? Há cliente esperando? Decisão de negócio bloqueada?]

---

## 👥 Clientes Envolvidos

[Nome(s), ou "Investigação interna".]

---

## 📎 Contexto e Referências

![Referência](https://i.postimg.cc/.../ref.png)

[Conversas com cliente, dados, prints que ajudem. Se não houver, escrever "Sem contexto adicional anexado."]

---

## 👤 Reportado por

[Nome do CS/Suporte.]
```

---

## Campos ClickUp

| Campo | Valor |
|---|---|
| **Categoria** | Spike → `539629bb-0492-4bcb-aeba-a33dba8c3666` |
| **priority** | Conforme escolha do CS (`urgent`/`high`/`normal`/`low`) |
| **Assignee** | User ID do CS reportando |

---

## Imagens (se houver) — duas formas no card

1. **Inline em Markdown** dentro da seção `## 📎 Contexto e Referências`: `![alt](url)`
2. **Anexada via URL** ao card usando `clickup_attach_task_file` (sempre passar a URL, nunca base64)
