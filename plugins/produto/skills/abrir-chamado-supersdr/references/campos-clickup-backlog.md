# Campos Personalizados — Lista de Backlog de Solicitações

**Lista ID:** `901324995607`

> ⚠️ Esta lista tem um schema diferente da lista principal do SuperSDR (`901318182530`). Não misture campos das duas.

---

## Categoria
**Field ID:** `32026351-43b9-46c4-8da0-2f1427431732` | Tipo: labels

**⚠️ Campo obrigatório** — sempre preencher ao criar o card.

| Label no ClickUp | Como apresentar ao CS | Option ID |
|---|---|---|
| Correção/Bug | 🐛 Bug | `5fa196f3-7dc3-430b-ac47-34c43d5c4569` |
| Atualização/Melhoria | 💡 Melhoria | `ca283300-a85f-4a7b-83f1-0e6290ca63ae` |
| Feature | ✨ Feature | `fd61a3c6-eee6-46f7-b3ce-a4ed0f6b4ae7` |
| Integração | 🔌 Integração | `cd477759-5674-40ae-9a99-c251f2819c71` |
| Spike | 🔍 Pesquisa/Validação | `539629bb-0492-4bcb-aeba-a33dba8c3666` |

> ⚠️ **Atenção ao nome amigável:** o CS escolhe "Pesquisa/Validação", mas no ClickUp o label é "Spike". Use o option ID correto.

---

## Criticidade do Bug
**Field ID:** `b66bc3fe-df9f-4fdb-a7a0-0c231d22a482` | Tipo: dropdown

**⚠️ Só preencher para bugs.** Para outros tipos, deixar vazio.

| Apresentação ao CS | Label ClickUp | Option ID | Quando usar |
|---|---|---|---|
| 🔴 Crítico | Crítico | `fa136bc7-95a8-4211-ac1a-a57b6ca0ff6c` | Sistema parado, perda de dados, todos os clientes |
| 🟠 Alta | Alta | `c2ec9c13-118b-4add-8e6c-11c081f7a534` | Funcionalidade principal quebrada, sem workaround |
| 🟡 Média | Média | `5d40c6b1-a275-4236-bdba-bab1542be1f4` | Funcionalidade comprometida mas com workaround |
| 🟢 Baixa | Baixa | `bc63a89e-799e-471e-ab2e-5978ebd82e56` | Cosmético, edge case raro, baixo impacto |

---

## Prioridade (campo NATIVO da task, NÃO é custom field)

Vai no parâmetro `priority` direto do `clickup_create_task`, não em `custom_fields`.

### Para bugs — derivar automaticamente da Criticidade (NÃO perguntar)

| Criticidade escolhida | Priority resultante |
|---|---|
| Crítico | `urgent` |
| Alta | `high` |
| Média | `normal` |
| Baixa | `low` |

### Para outros tipos — perguntar direto

| Apresentação ao CS | Valor no ClickUp |
|---|---|
| 🔴 Urgente | `urgent` |
| 🟠 Alta | `high` |
| 🟡 Normal | `normal` |
| 🟢 Baixa | `low` |

---

## Produto
**Field ID:** `926e93ca-a56b-46d2-a352-c353343e0633` | Tipo: dropdown

| Valor | Option ID |
|---|---|
| Super SDR Silver | `52c9767b-768f-45d1-a9ab-c50448e7bcab` |
| Super SDR GOLD | `a896f1c2-d5bd-4eae-90cd-76b6228a5ba3` |
| Super SDR Black | `53189210-cbca-4f45-91ca-52c5cdea2f68` |

**Como inferir:** se o cliente afetado tiver plano conhecido, preencha. Se não souber, deixe em branco — não pergunte ao CS, isso é fricção desnecessária.

---

## Número de Revisões
**Field ID:** `f256f639-8111-40f3-908f-b23a967dc2dc` | Tipo: number

Não preencher ao criar — campo gerenciado pelo time de produto.

---

## Usuários relevantes (para assignees e comentários)

| Nome | User ID |
|---|---|
| Asafe Silva | `81900233` |
| Thiago Fernandes | `112118879` |
| Ricardo Junior | `206414626` |
| Vanderson Souza | `118030139` |
| Johny Carvalho | `112119918` |
| Késia Nandi | `111972949` |
| Jully Viana de Souza | `106019575` |
| Niverton Menezes | `100189070` |
| Marcos Victor | `118018478` |
| Misael Bomfim | `82190390` |
| Odair Marcos de Lucena Filho | `82172924` |
| Reinan Carvalho | `106077766` |
| José Gabriel | `82154978` |
| Leidiane Caramel | `48919587` |

> Para outros membros do time, usar `clickup_resolve_assignees` passando o nome ou e-mail.
