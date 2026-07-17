# Template — Funcionalidade Nova

## Informações necessárias (coletar se ausentes)
- Quem usa essa funcionalidade? (persona/usuário)
- O que exatamente ela faz?
- Por que ela existe? Qual o benefício?
- Tem tela, fluxo ou comportamento específico para descrever?
- O que está **fora** do escopo?
- Tem dependências com outras tasks, APIs ou serviços?

---

## Template

```markdown
## 📋 História de Usuário
Como [persona/perfil de usuário], quero [ação ou funcionalidade], para [benefício ou resultado esperado].

---

## 🎯 Objetivo
[1 a 3 frases descrevendo o que essa task entrega e por que ela existe. Foque no valor, não na solução técnica.]

---

## 📝 Descrição & Contexto
[Detalhes sobre o comportamento esperado, fluxo principal, regras de negócio relevantes, contexto técnico necessário.]

**Fluxo principal:**
1. [Passo 1]
2. [Passo 2]
3. [...]

**Comportamento esperado:**
- [Detalhe 1]
- [Detalhe 2]

---

## ✅ Critérios de Aceitação
- [ ] [Critério 1 — comportamento observável e testável]
- [ ] [Critério 2]
- [ ] [Critério 3]

---

## 🚫 Fora do Escopo
- [Item 1]
- [Item 2]

---

## 🔗 Dependências
- [Outras tasks, serviços externos, APIs, configurações necessárias]
- Nenhuma (se não houver)

---

## 📎 Referências
- [Links, prints, protótipos, specs]
- Nenhuma (se não houver)

---

## 🎯 Story Points sugeridos
**[X pontos]** — [Justificativa breve]
```

---

## Boas práticas — Critérios de Aceitação

- Cada critério deve ter resposta clara de sim/não
- Foque no comportamento, não na implementação
- Máximo recomendado: 5 a 7 critérios (se precisar de mais, considere quebrar a task)
- Use Given/When/Then para cenários complexos:
  ```
  Dado que [contexto]
  Quando [ação]
  Então [resultado esperado]
  ```
- Evite critérios vagos: "funcionar corretamente", "ser rápido", "ser intuitivo"

---

## Campos ClickUp sugeridos
- **Categoria:** Feature
- **Módulo:** inferir pela área funcional impactada (ver `campos-clickup.md`)
- **Story Points:** estimativa Fibonacci
