---
name: criar-task-produto
description: "Cria e documenta tarefas no padrão Scrum da Expert Integrado. Use esta skill SEMPRE que o usuário mencionar: criar task, documentar tarefa, escrever história de usuário, user story, montar task, preencher task, criar card no ClickUp para o time de produto, documentar funcionalidade, escrever critérios de aceitação, preparar task para a sprint, criar tarefa para o time de dev, ou qualquer variação de 'me ajuda a montar/criar/documentar uma tarefa/task/card para o time'. Também ative se o usuário descrever uma funcionalidade ou bug e pedir ajuda para estruturar o trabalho."
---

# Criar Task Scrum — Expert Integrado

Skill para criar tarefas bem documentadas para o time de produto da Expert Integrado, seguindo a metodologia Scrum interna e garantindo que toda task atenda ao **Definition of Ready (DoR)** antes de entrar numa sprint.

---

## Contexto do Time

- **Ferramenta:** ClickUp — List ID padrão: `901318182530` (Espaço: Produto > Pasta: SuperSDR)
- **Sprints:** 2 semanas
- **Time:** multidisciplinar — no-code, vibe coding, desenvolvimento tradicional
- **Story Points:** escala Fibonacci (1, 2, 3, 5, 8 — acima de 8 a tarefa deve ser quebrada)
- **Produto principal:** SuperSDR (plataforma de automação de vendas com IA, V1 e V2)

---

## Fluxo da Skill

### Passo 1 — Identificar o tipo de task

| Tipo | Quando usar |
|---|---|
| **Funcionalidade nova** | Feature inédita no produto |
| **Bug** | Comportamento incorreto relatado |
| **Melhoria / Refatoração** | Ajuste em algo existente |
| **Spike genérico** | Pesquisa ou prova de conceito |
| **Spike de validação de CRM** | Avaliar se um novo CRM pode ser integrado ao SuperSDR |

Se o tipo não estiver claro, pergunte antes de prosseguir.

---

### Passo 2 — Carregar o template correto

Leia o arquivo de referência correspondente ao tipo identificado:

- Funcionalidade nova → `references/template-feature.md`
- Bug → `references/template-bug.md`
- Melhoria / Refatoração / Spike genérico → `references/template-spike.md`
- **Spike de validação de CRM → `references/template-spike-crm.md`**

Para campos personalizados do ClickUp (IDs, opções, como inferir valores):
→ `references/campos-clickup.md`

---

### Passo 3 — Coletar contexto (se necessário)

Se o usuário não forneceu contexto suficiente, faça perguntas objetivas **antes** de montar a task. Não pergunte tudo de uma vez — priorize o essencial para o tipo. Os arquivos de template indicam quais informações são necessárias para cada tipo.

Perguntas válidas para todos os tipos:
- Qual o **status** inicial no ClickUp? (padrão: Backlog)
- Quer definir um **responsável**?

Se o contexto já for suficiente, **vá direto para o Passo 4**.

---

### Passo 4 — Montar a documentação

Use o template carregado no Passo 2, preenchendo todos os campos com o contexto disponível.

---

### Passo 5 — Verificar o DoR

Antes de criar no ClickUp, confirme mentalmente:

- [ ] História de usuário no formato "Como... quero... para..."
- [ ] Critérios de aceitação claros e verificáveis
- [ ] Story Points estimados (≤ 8)
- [ ] Dependências identificadas ou declaradas como inexistentes
- [ ] O time consegue entender o que fazer sem pedir mais informações

Se algum item falhar, ajuste a task ou sinalize o ponto pendente.

---

### Passo 6 — Criar no ClickUp (obrigatório)

Após montar e apresentar a documentação, **sempre** crie a task no ClickUp.

- **Lista padrão:** `901318182530` (SuperSDR)
- Preencha os campos personalizados conforme `references/campos-clickup.md`
- **Descrição:** use **sempre** o campo `markdown_description` (nunca `description`). O campo `description` não renderiza formatação — o ClickUp só exibe Markdown corretamente via `markdown_description`.
- Após criar, confirme com o link da task gerada

---

## Definition of Ready (DoR)

Uma task só entra na sprint quando:
1. Tem história de usuário
2. Tem critérios de aceitação verificáveis
3. Tem Story Points ≤ 8
4. Dependências estão mapeadas
5. O time não precisa pedir mais informações para começar
