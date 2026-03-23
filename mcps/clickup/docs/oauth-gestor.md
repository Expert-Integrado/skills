# ClickUp OAuth — Guia do Gestor da Conta

Este guia é para o **dono ou administrador da conta ClickUp** que precisa gerar tokens individuais para membros da equipe que usam o Claude Code localmente.

## Quando usar este fluxo

Use este fluxo OAuth quando um membro da equipe:

- **Não tem conta paga no ClickUp** (não consegue gerar um `pk_` token pessoal), **E**
- Está usando o **Claude Code local** (desktop/CLI)

> Se a pessoa estiver usando o **Claude Code online** (claude.ai), não precisa deste fluxo — ela pode autenticar diretamente via OAuth2 na interface.

---

## Pré-requisito: Criar o App OAuth no ClickUp

Faça isso uma única vez. O app serve para toda a equipe.

1. Acesse [app.clickup.com/settings/apps](https://app.clickup.com/settings/apps)
2. Clique em **Create an App**
3. Preencha:
   - **Name:** qualquer nome (ex: `Claude Code MCP`)
   - **Redirect URL:** `https://google.com`
4. Clique em **Create App**
5. Anote o **Client ID** e o **Client Secret** — você vai precisar deles

> O **Client Secret nunca deve ser compartilhado** com a equipe. Apenas você usa.

---

## Fluxo para gerar o token de cada pessoa

### Passo 1 — Envie o link de autorização para a pessoa

Monte a URL com o seu Client ID:

```
https://app.clickup.com/api?client_id=SEU_CLIENT_ID&redirect_uri=https://google.com
```

Envie esse link para a pessoa. Ela vai:

1. Abrir a URL no browser
2. Fazer login no ClickUp (pode ser com Google)
3. Clicar em **Connect Workspace** para autorizar o app
4. Ser redirecionada para uma URL no formato:
   ```
   https://www.google.com/?code=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
5. Te enviar o código que aparece depois de `?code=`

> Cada código só pode ser usado **uma vez**. Se a pessoa fechar sem mandar, ela precisa acessar o link de novo.

---

### Passo 2 — Gere o token com o código recebido

No seu terminal, rode o comando abaixo substituindo `CODE_DA_PESSOA`:

**Windows (CMD):**
```cmd
curl -X POST "https://api.clickup.com/api/v2/oauth/token" -H "Content-Type: application/json" -d "{\"client_id\":\"SEU_CLIENT_ID\",\"client_secret\":\"SEU_CLIENT_SECRET\",\"code\":\"CODE_DA_PESSOA\"}"
```

**Mac/Linux:**
```bash
curl -X POST "https://api.clickup.com/api/v2/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "SEU_CLIENT_ID",
    "client_secret": "SEU_CLIENT_SECRET",
    "code": "CODE_DA_PESSOA"
  }'
```

**Resposta esperada:**
```json
{
  "access_token": "100189070_abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
  "token_type": "Bearer"
}
```

---

### Passo 3 — Envie o `access_token` para a pessoa

O `access_token` retornado é o token individual dela. Envie para que ela configure o MCP (veja [oauth-usuario.md](./oauth-usuario.md)).

---

## Observações importantes

| Item | Detalhe |
|------|---------|
| **Client Secret** | Nunca compartilhar com a equipe |
| **Cada código** | Uso único — expira após troca pelo token |
| **access_token** | Não expira — pode ser usado indefinidamente |
| **Rastreabilidade** | Ações feitas via API ficam registradas no perfil de quem autorizou |
| **Workspace** | O token dá acesso ao workspace que a pessoa autorizou |

---

## Referência rápida

```
App OAuth:      app.clickup.com/settings/apps
Client ID:      visível nas configurações do app
Client Secret:  visível nas configurações do app (manter seguro)
Redirect URI:   https://google.com
```
