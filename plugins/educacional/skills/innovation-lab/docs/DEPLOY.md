# DEPLOY — deck do innovation-lab (Vercel + Cloudflare)

Processo validado na 1ª execução real (Play55, 15/06/2026).
Resultado: **https://play55-lab.ericluciano.com.br**

## Token (CRÍTICO)
- Usar **`Token_Vercel_Produto_Claude_Eric`** do 1P:
  `op read "op://Agentes Eric/Token_Vercel_Produto_Claude_Eric/credential"` — conta/scope `expertintegrado`.
- ⚠️ O **`VERCEL_API_TOKEN`** canônico (usado pela `criar-aula`) está com **scope morto** (`contato-5574s-projects`, 403 SAML). NÃO usar até rotacionar. `Vercell_Produto` não tem permissão de criar.
- Cloudflare: `op read "op://Agentes Eric/CLOUDFLARE_API_TOKEN/credential"`. Zona `ericluciano.com.br` = `48ff0f4bd2bf17da3f66e4d739b98e2f`.

## Por que via API REST (e não o CLI)
O Vercel CLI 54 trava em conta sem team ("No teams available") e injeta um scope morto do config global. A API REST é o caminho confiável.

## Passos
1. **1 arquivo standalone** — como as imagens vão embutidas em base64 (ver `PADRAO-DECK-ABERTURA.md`), deploya só o `apresentacao.html` como `index.html` (não depende de `img/`).
2. **Upload:** `POST https://api.vercel.com/v2/files` — header `x-vercel-digest: <sha1>`, body = bytes do arquivo.
3. **Deployment:** `POST https://api.vercel.com/v13/deployments?forceNew=1` — body `{name, files:[{file:"index.html",sha,size}], target:"production", projectSettings:{framework:null}}`.
4. **Desligar proteção** (senão o link público dá 401): `PATCH https://api.vercel.com/v9/projects/<name>` body `{"ssoProtection":null,"passwordProtection":null}`. O time `expert-integrados` liga por padrão.
5. **Domínio `<sub>.ericluciano.com.br`:**
   - `POST https://api.vercel.com/v10/projects/<name>/domains` `{ "name": "<sub>.ericluciano.com.br" }`.
   - Cloudflare **A record**: `<sub>` → `76.76.21.21` (DNS only, `proxied:false`).
   - A Vercel exige **TXT de propriedade**: pegar `verification[]` de `GET .../domains/<domain>` e criar TXT `_vercel.ericluciano.com.br` = `vc-domain-verify=...` no Cloudflare.
   - `POST .../domains/<domain>/verify`, aguardar `verified=true`. SSL emite sozinho.
6. Confirmar `https://<sub>.ericluciano.com.br` → 200.

Scripts de referência da 1ª execução: `C:\tmp\deploy.py` (deploy) e `C:\tmp\domain2.py` (domínio) — históricos, podem já ter sido limpos do C:/tmp; o processo canônico é o descrito acima.
