# Template — Integração 🔌

> **Quando usar:** quando o cliente pede para conectar o SuperSDR com um sistema externo (CRM, ERP, plataforma de marketing, ferramenta de pagamento, etc.).

## Perguntas para coletar (uma por vez)

1. **Com qual sistema integrar?** *(nome da ferramenta: Pipedrive, RD Station, Omie, etc.)*
2. **O que precisa acontecer entre o SuperSDR e esse sistema?** *(ex: "criar lead no CRM quando qualificar", "puxar contatos do CRM pra disparar")*
3. **Qual(is) cliente(s) solicitou(ram)?** *(nome(s), vários ou todos)*
4. **O cliente já tem conta nesse sistema? Sabe se a integração é via API oficial?** *(opcional — só perguntar se o CS souber)*
5. **Tem print de como o cliente usa hoje?** *(link do Postimages, se houver)*
6. **Qual a prioridade?** *(ver SKILL.md, Passo 3)*

> Se o usuário já trouxe alguma dessas informações espontaneamente, pule a pergunta.

---

## Instrução para prints (se aplicável)

> *"Se tiver print da tela do sistema atual, acessa https://postimages.org/, cola a imagem com Ctrl+V, copia o link e me manda aqui."*

---

## Título sugerido

Formato: `[Integração] <SuperSDR + Sistema>`

Exemplos:
- `[Integração] SuperSDR + Omie ERP`
- `[Integração] SuperSDR + RD Station Marketing`
- `[Integração] SuperSDR + Asaas (cobrança)`

---

## Template de descrição (markdown_description)

```markdown
## 🔌 Sistema a Integrar

[Nome da ferramenta + link oficial, se conhecido.]

---

## 🎯 O que Precisa Acontecer

[Descrição do fluxo desejado entre SuperSDR e o sistema. Quais dados entram e saem? Em que momento dispara?]

---

## 👥 Clientes que Solicitaram

[Nome(s), ou "Todos os clientes".]

---

## 🔧 Detalhes Técnicos (se informados)

- **Cliente já tem conta:** [Sim/Não/Não informado]
- **Tipo de integração esperada:** [API/Webhook/Zapier/Não sabe]

---

## 📎 Referências

![Referência](https://i.postimg.cc/.../ref.png)

[Se não houver, escrever "Sem referências anexadas."]

---

## 👤 Reportado por

[Nome do CS/Suporte.]
```

---

## Campos ClickUp

| Campo | Valor |
|---|---|
| **Categoria** | Integração → `cd477759-5674-40ae-9a99-c251f2819c71` |
| **priority** | Conforme escolha do CS (`urgent`/`high`/`normal`/`low`) |
| **Assignee** | User ID do CS reportando |

---

## Imagens (se houver) — duas formas no card

1. **Inline em Markdown** dentro da seção `## 📎 Referências`: `![alt](url)`
2. **Anexada via URL** ao card usando `clickup_attach_task_file` (sempre passar a URL, nunca base64)
