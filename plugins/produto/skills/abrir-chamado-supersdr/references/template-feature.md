# Template — Feature Nova ✨

## Perguntas para coletar (uma por vez)

1. **O que você gostaria que o SuperSDR fizesse?** *(descrição da funcionalidade)*
2. **Qual problema isso resolveria?** *(valor esperado)*
3. **Qual(is) cliente(s) pediu(ram)?** *(nome(s), vários ou todos)*
4. **Tem alguma referência de como deveria funcionar?** *(link do Postimages ou descrição)*
5. **Qual a prioridade?** *(ver SKILL.md, Passo 3)*

> Se o usuário já trouxe alguma dessas informações espontaneamente, pule a pergunta.

---

## Instrução para prints (se aplicável)

> *"Se tiver referência visual, acessa https://postimages.org/, cola a imagem com Ctrl+V, copia o link gerado e me manda aqui."*

---

## Título sugerido

Formato: `[Feature] <descrição curta>`

Exemplos:
- `[Feature] Envio automático de proposta após qualificação`
- `[Feature] Relatório semanal de performance por cliente`
- `[Feature] Notificação no celular quando lead esfriar`

---

## Template de descrição (markdown_description)

```markdown
## ✨ Funcionalidade Solicitada

[Descreva a funcionalidade nova.]

---

## 🎯 Problema que Resolve

[Qual dor ou necessidade essa feature atende? Qual o valor esperado?]

---

## 👥 Clientes que Solicitaram

[Nome(s), ou "Todos os clientes".]

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
| **Categoria** | Feature → `fd61a3c6-eee6-46f7-b3ce-a4ed0f6b4ae7` |
| **priority** | Conforme escolha do CS (`urgent`/`high`/`normal`/`low`) |
| **Assignee** | User ID do CS reportando |

---

## Imagens (se houver) — duas formas no card

1. **Inline em Markdown** dentro da seção `## 📎 Referências`: `![alt](url)`
2. **Anexada via URL** ao card usando `clickup_attach_task_file` (sempre passar a URL, nunca base64)

---

## ⚠️ Detecção: pode ser Integração?

Se a "feature" descrita pelo CS envolver **conectar com um sistema externo** (CRM novo, ERP, plataforma de pagamento, etc.), reclassifique como Integração e use `template-integracao.md`.

Exemplos que **são** integração disfarçada de feature:
- "Conectar com o Omie"
- "Mandar leads pro Pipedrive automaticamente"
- "Disparar pelo Active Campaign"
