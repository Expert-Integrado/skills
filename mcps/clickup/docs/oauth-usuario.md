# ClickUp OAuth — Guia do Usuário

Este guia é para **membros da equipe** que precisam configurar o ClickUp MCP no Claude Code local e não possuem conta paga no ClickUp.

## Quando usar este fluxo

Use este fluxo quando você:

- **Não tem conta paga no ClickUp** (não consegue gerar um `pk_` token pessoal), **E**
- Está usando o **Claude Code local** (desktop/CLI)

> Se você estiver usando o **Claude Code online** (claude.ai), não precisa deste fluxo — autentique diretamente via OAuth2 na interface.

---

## O que você vai precisar

- O **link de autorização** do seu gestor (ele contém o Client ID do app)
- Conta no ClickUp (pode ser gratuita)
- Claude Code instalado localmente

---

## Passo a passo

### Passo 1 — Solicite o link ao gestor da conta

Peça ao administrador da conta ClickUp o **link de autorização do app OAuth**. O link tem este formato:

```
https://app.clickup.com/api?client_id=CLIENT_ID_DO_GESTOR&redirect_uri=https://google.com
```

> Não tem esse link? Encaminhe seu gestor para o [guia do gestor](./oauth-gestor.md).

---

### Passo 2 — Autorize o app

1. Abra o link no seu browser
2. Faça login na sua conta ClickUp (pode ser com Google)
3. Clique em **Connect Workspace** para autorizar o app
4. O browser vai redirecionar para o Google com uma URL parecida com:
   ```
   https://www.google.com/?code=7VJQ93P2JTY9FLF4WBKAIDFB53AZEZL1&zx=...
   ```
5. **Copie o código** — é o valor após `?code=` e antes de `&` (ex: `7VJQ93P2JTY9FLF4WBKAIDFB53AZEZL1`)

> O código é de **uso único**. Se fechar a aba sem copiar, acesse o link de novo para gerar um novo código.

---

### Passo 3 — Envie o código ao gestor

Envie o código copiado para o gestor da conta. Ele vai gerar seu `access_token` e te enviar de volta.

---

### Passo 4 — Configure o MCP no Claude Code

Com o `access_token` em mãos, configure o ClickUp MCP:

**Opção A — Via onboarding (recomendado)**

Inicie uma sessão no Claude Code e rode:

```
Configure o ClickUp MCP com meu token: SEU_ACCESS_TOKEN
```

**Opção B — Via config.json**

Edite (ou crie) o arquivo `config.json` na pasta do MCP:

```json
{
  "api_key": "SEU_ACCESS_TOKEN"
}
```

**Opção C — Via variável de ambiente no claude.json**

```json
{
  "mcpServers": {
    "clickup-local": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\caminho\\para\\clickup-mcp\\index.js"],
      "env": {
        "CLICKUP_API_KEY": "SEU_ACCESS_TOKEN"
      }
    }
  }
}
```

---

## Verificando se funcionou

No Claude Code, peça:

```
Liste as minhas tarefas no ClickUp
```

ou

```
Mostre a hierarquia do meu workspace no ClickUp
```

Se retornar dados do seu workspace, está configurado corretamente.

---

## Observações

| Item | Detalhe |
|------|---------|
| **access_token** | Não expira — configure uma vez e pronto |
| **Código OAuth** | Uso único — cada autorização gera um código diferente |
| **Privacidade** | Ações feitas via MCP ficam registradas no seu perfil ClickUp |
| **Escopo** | O token dá acesso ao workspace que você autorizou |
