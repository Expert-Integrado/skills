# Template — Bug

## Informações necessárias (coletar se ausentes)
- Como reproduzir o problema? (passos)
- Qual é o comportamento atual vs. o esperado?
- Qual o impacto? (quem é afetado, com que frequência)
- Tem log, print ou evidência?

---

## Template

```markdown
## 📋 História de Usuário
Como [usuário afetado], preciso que [comportamento correto], porque atualmente [comportamento incorreto] está causando [impacto].

---

## 🎯 Objetivo
[O que precisa ser corrigido e qual o impacto da correção para o usuário/negócio.]

---

## 🐛 Reprodução do Bug

**Passos para reproduzir:**
1. [...]
2. [...]

**Comportamento atual:** [O que acontece]
**Comportamento esperado:** [O que deveria acontecer]
**Evidência:** [Print, log, link]
**Impacto:** [Quem é afetado / frequência]

---

## ✅ Critérios de Aceitação
- [ ] O comportamento incorreto não ocorre mais nos passos de reprodução
- [ ] [Critério adicional se necessário]

---

## 🚫 Fora do Escopo
- [Melhorias relacionadas que não fazem parte desta correção]

---

## 🔗 Dependências
- Nenhuma (se não houver)

---

## 📎 Referências
- [Print, log, link para conversa do cliente]

---

## 🎯 Story Points sugeridos
**[X pontos]** — [Justificativa]
```

---

## Campos ClickUp sugeridos
- **Categoria:** Correção/Bug
- **Criticidade do Bug:** inferir pelo impacto (ver `campos-clickup.md`)
- **Módulo:** área funcional onde o bug ocorre
- **Story Points:** estimativa Fibonacci
