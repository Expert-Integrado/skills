# Template — Bug 🐛

## Informações mínimas necessárias

Antes de criar/repassar o card, deve ter:

- ✅ Descrição do problema
- ✅ Comportamento esperado
- ✅ Quando aconteceu (data/horário aproximado)
- ✅ Cliente(s) afetado(s)
- ✅ Print/evidência (ideal, mas não bloqueia)
- ✅ Criticidade (Crítico/Alta/Média/Baixa)
- ✅ Nome do CS reportando

Se o usuário já trouxe parte espontaneamente, pule essas perguntas. Pergunte só o que falta.

---

## Perguntas (use só se a informação não veio)

1. **O que aconteceu?**
2. **O que deveria ter acontecido?**
3. **Quando aconteceu?** (data/horário aproximado)
4. **Qual(is) cliente(s) foi(ram) afetado(s)?**
5. **Tem print ou gravação?** (link do Postimages)
6. **Qual a criticidade?** (ver SKILL.md, Passo A4)

---

## Instrução para prints

> *"Pra anexar o print:*
> *1. Acessa https://postimages.org/*
> *2. Cola a imagem com Ctrl+V*
> *3. Copia o link e cola aqui"*

---

## Título sugerido

Formato: `[Bug] <descrição curta>`

Exemplos:
- `[Bug] Áudio não é enviado após qualificação`
- `[Bug] Webhook não dispara ao criar lead no CRM`
- `[Bug] Resposta da IA volta em branco intermitentemente`

---

## Template de descrição (markdown_description)

```markdown
## 🐛 Descrição do Problema

[Descreva o que está acontecendo de errado.]

---

## ✅ Comportamento Esperado

[O que deveria acontecer no lugar.]

---

## 📅 Quando Ocorreu

[Data e horário aproximado.]

---

## 👥 Clientes Afetados

[Nome(s), ou "Todos os clientes".]

---

## 📎 Evidências

![Print 1](https://i.postimg.cc/.../print1.png)
![Print 2](https://i.postimg.cc/.../print2.png)

[Se não houver evidências, escrever "Sem evidências anexadas."]

---

## 👤 Reportado por

[Nome do CS/Suporte.]
```

---

## Campos ClickUp

| Campo | Valor |
|---|---|
| **Categoria** | Correção/Bug → `5fa196f3-7dc3-430b-ac47-34c43d5c4569` |
| **Criticidade do bug** | Conforme escolha do CS (ver IDs em `campos-clickup-backlog.md`) |
| **priority** (nativo) | Mapeado da Criticidade: Crítico→`urgent`, Alta→`high`, Média→`normal`, Baixa→`low` |
| **Assignee** | User ID do CS reportando |

---

## Imagens — duas formas no card

Toda imagem deve aparecer **duas vezes**:

1. **Inline em Markdown** dentro da seção `## 📎 Evidências` da descrição: `![alt](url)`
2. **Anexada via URL** ao card usando `clickup_attach_task_file` (não usar base64 — passar a URL direto)

---

## Após criar: comentário de triagem (OBRIGATÓRIO para bugs)

Criar comentário com `clickup_create_task_comment`:

```
🔴 Bug registrado pelo time de CS. @Asafe Silva — triagem necessária.

Cliente(s) afetado(s): [nome(s)]
Reportado por: [nome do CS]
Criticidade: [Crítico/Alta/Média/Baixa]
```

Assignee do comentário: `81900233` (Asafe Silva)
