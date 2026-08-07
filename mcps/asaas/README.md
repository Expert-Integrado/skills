# asaas-mcp

MCP do **Asaas** (gateway de pagamento brasileiro) para o Claude Code — consulta de cobranças,
clientes e inadimplentes, e criação de cobrança/cliente/assinatura com guardrails de escrita.

## Antes de tudo: confira se a conta é mesmo isolada

Uma conta Asaas em produção normalmente já tem **webhook configurado** entregando eventos em
outro sistema (CRM, portal, ERP). Quando é o caso, **qualquer cobrança criada por aqui gera evento
lá** — não existe "cobrança de teste inofensiva".

Confira os webhooks no painel do Asaas antes de assumir que pode escrever à vontade. Por isso toda
tool de escrita deste MCP é bloqueada até confirmação explícita, e mutação de webhook é proibida.

## Instalação

```bash
cd <caminho>/mcps/asaas
npm install
```

Registro no `~/.claude.json`:

```json
"asaas": {
  "command": "node",
  "args": ["<caminho>/mcps/asaas/index.js"],
  "env": {
    "ASAAS_API_KEY": "<sua chave, do gerenciador de segredos>",
    "ASAAS_ENV": "producao"
  }
}
```

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `ASAAS_API_KEY` | sim | — | Chave de API do Asaas (prefixo `aact_`) |
| `ASAAS_ENV` | não | `producao` | `producao` ou `sandbox`. O sandbox exige chave **própria** — a de produção não funciona lá. |
| `ASAAS_VALOR_ALERTA` | não | `20000` | Acima deste valor, criar/atualizar cobrança exige confirmação extra. |

A chave é gerada em *Integrações > Chaves de API* (só admin, exibida uma única vez, até 10 por conta)
e **expira por inatividade**: 3 meses desabilita, 6 meses expira em definitivo. Se as tools passarem
a devolver 401, gere outra e atualize o segredo.

## Tools

### Leitura (9)

| Tool | Para que serve |
|---|---|
| `resumo_financeiro` | Saldo, cobranças por status, total de clientes e assinaturas. Ponto de partida. |
| `listar_cobrancas` | Cobranças com filtros de status, forma, cliente, vencimento, pagamento e criação. |
| `obter_cobranca` | Detalhe de uma cobrança + nome do cliente + links de fatura/boleto/comprovante. |
| `inadimplentes` | Atalho: vencidas já com nome, email e telefone resolvidos, ordenadas pela mais antiga. |
| `listar_clientes` | Busca por nome, email, CPF/CNPJ ou referência externa. |
| `obter_cliente` | Ficha do cliente + histórico (quanto já pagou, quanto está em aberto). |
| `listar_assinaturas` | Cobrança recorrente. |
| `listar_links_pagamento` | Links de checkout reutilizáveis. |
| `obter_qrcode_pix` | Pix copia-e-cola de uma cobrança, pronto pra enviar ao cliente. |

### Escrita (6) — todas exigem `confirmado: true`

| Tool | Observação |
|---|---|
| `criar_cliente` | Obrigatórios: `nome`, `cpf_cnpj`. |
| `criar_cobranca` | Obrigatórios: `cliente_id`, `forma_pagamento`, `valor`, `vencimento`. |
| `atualizar_cobranca` | Só em cobrança não paga. O preview mostra o estado atual pra comparação. |
| `cancelar_cobranca` | Recusa cancelar cobrança já paga (isso seria estorno). |
| `criar_assinatura` | Obrigatórios: `cliente_id`, `forma_pagamento`, `valor`, `proximo_vencimento`, `ciclo`. |
| `cancelar_assinatura` | Para a recorrência; cobranças já geradas continuam existindo. |

Chamada sem `confirmado` **não altera nada** — devolve o payload exato que seria enviado, com os
dados legíveis (nome do cliente resolvido, valor em R$, data em DD/MM/AAAA) e o aviso de webhook.

## Guardrails

1. **Rotas bloqueadas** (`guardrails.js`), verificadas antes de qualquer chamada de rede:
   estorno, transferência, antecipação, mutação de webhook, alteração de conta e de chave Pix.
   Dinheiro saindo não passa por este MCP.
2. **Gate de escrita**: `confirmado: true` obrigatório, com preview antes.
3. **Valor fora da faixa**: acima do teto exige `confirmado_valor_alto: true` — rede de proteção
   contra erro de digitação e de transcrição de áudio.

## Semântica que engana

O Asaas tem dois status para "pago", e confundir os dois dá relatório errado:

- **`CONFIRMED`** — pagamento confirmado, mas o dinheiro **ainda não está disponível** na conta.
- **`RECEIVED`** — valor **já disponível** na conta.

Fonte: doc oficial (`docs/cobrancas-via-cartao-de-credito`) — `PAYMENT_CONFIRMED`: pagamento
confirmado; `PAYMENT_RECEIVED`: valor disponível na conta.

O MCP traduz os dois de forma explícita na saída pra não deixar dúvida.

## Referência

- Documentação: <https://docs.asaas.com/> (índice para agentes em `/llms.txt`)
- Base de produção: `https://api.asaas.com/v3` · Sandbox: `https://api-sandbox.asaas.com/v3`
- Autenticação: header `access_token`
