/**
 * Zoom OAuth 2.0 Authentication Script — PKCE (public client, sem secret)
 *
 * Rode uma vez para autorizar o MCP a acessar sua conta Zoom:
 *   node auth.js
 *
 * Isso abre o browser, pede login no Zoom, e salva os tokens em tokens.json.
 * O MCP renova automaticamente usando o refresh_token.
 *
 * O app no Zoom Marketplace precisa estar com "Use Public Client OAuth" LIGADO.
 * Não usa client secret — a segurança vem do PKCE (code_verifier/code_challenge).
 */

import { createServer } from "http";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import crypto from "crypto";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKENS_PATH = join(__dirname, "tokens.json");

// Client ID PÚBLICO do app Expert Integrado (OAuth PKCE). É público por design —
// pode ficar no código sem risco. Assim o login é só `node auth.js`, sem precisar
// setar variável de ambiente. Sobrescreva via env ZOOM_CLIENT_ID p/ usar outro app.
const PUBLIC_CLIENT_ID = "gBJbWx7zSpKTr_PIgmBuoA";

// IMPORTANTE (fix 02/07/2026): cada MAQUINA tem seu proprio app Zoom (PKCE public),
// porque o Zoom so mantem 1 refresh token por usuario+app — dois devices no mesmo app
// se revogam (Brain toe9oixb2k40). O index.js (MCP) le o client_id do env ZOOM_CLIENT_ID
// que vem do claude.json. Se o auth.js mintar com um client_id DIFERENTE do que o MCP
// usa, o refresh quebra com "invalid_client" ~1h depois. Pra NUNCA divergir, o auth.js
// resolve o client_id da MESMA fonte que o MCP, na MESMA ordem:
// env -> claude.json(zoom-mcp) -> .env local (por máquina, sobrevive a reset) -> default.
function clientIdFromClaudeJson() {
  try {
    const cj = JSON.parse(readFileSync(join(homedir(), ".claude.json"), "utf-8"));
    // "zoom-chat" e o nome atual do server; "zoom-mcp" e o legado (VPS ainda usa)
    return (
      cj?.mcpServers?.["zoom-chat"]?.env?.ZOOM_CLIENT_ID ||
      cj?.mcpServers?.["zoom-mcp"]?.env?.ZOOM_CLIENT_ID ||
      null
    );
  } catch {
    return null;
  }
}
function clientIdFromDotEnv() {
  try {
    const m = readFileSync(join(__dirname, ".env"), "utf-8")
      .match(/^\s*ZOOM_CLIENT_ID\s*=\s*"?([\w-]+)"?\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
const CLIENT_ID =
  process.env.ZOOM_CLIENT_ID ||
  clientIdFromClaudeJson() ||
  clientIdFromDotEnv() ||
  PUBLIC_CLIENT_ID;
console.log(`Usando ZOOM_CLIENT_ID: ${CLIENT_ID}`);
const REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || "http://localhost:4488/callback";

// ─── PKCE: code_verifier + code_challenge ────────────────────────────────────
// O verifier é gerado uma vez por execução e fica em memória entre o redirect
// e o callback (o servidor HTTP local segue vivo no mesmo processo).
function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const codeVerifier = base64url(crypto.randomBytes(48)); // 64 chars base64url (43-128 OK)
const codeChallenge = base64url(
  crypto.createHash("sha256").update(codeVerifier).digest()
);

// Scopes necessários para o Zoom Team Chat MCP (nomes granulares)
const SCOPES = [
  // Canais
  "team_chat:read:list_user_channels",
  "team_chat:read:channel",
  "team_chat:read:list_members",
  "team_chat:write:user_channel",
  "team_chat:write:members",
  // Mensagens
  "team_chat:read:list_user_messages",
  "team_chat:read:user_message",
  "team_chat:read:thread_message",
  "team_chat:write:user_message",
  "team_chat:update:user_message",
  "team_chat:delete:user_message",
  "team_chat:update:message_emoji",
  // Contatos e sessões
  "team_chat:read:list_contacts",
  "team_chat:read:contact",
  "team_chat:read:list_user_sessions",
  // Emojis customizados
  "team_chat:read:list_custom_emojis",
  // Arquivos
  "team_chat:write:files",
  "team_chat:write:message_files",
  // Usuário
  "user:read:user",
  "user:read:email",
].join(" ");

const AUTH_URL =
  `https://zoom.us/oauth/authorize?response_type=code&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}` +
  `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

console.log("Abrindo browser para autorização do Zoom...\n");
console.log(`Se o browser não abrir, acesse manualmente:\n${AUTH_URL}\n`);

// Servidor HTTP local para capturar o callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:4488`);

  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Erro na autorização</h1><p>${error}</p>`);
    console.error(`Erro: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Erro</h1><p>Código de autorização não recebido.</p>");
    server.close();
    process.exit(1);
  }

  console.log("Código de autorização recebido. Trocando por tokens...");

  try {
    // Trocar authorization code por access_token + refresh_token (PKCE).
    // SEM header Authorization e SEM secret — o code_verifier prova a posse.
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id: CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`HTTP ${tokenResponse.status}: ${errText}`);
    }

    const tokenData = await tokenResponse.json();

    // Salvar tokens com timestamp + carimbo do app que mintou (o refresh
    // do MCP usa esse client_id, nunca outro — evita invalid_client).
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      created_at: Date.now(),
      client_id: CLIENT_ID,
    };

    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));

    console.log("\nTokens salvos em tokens.json!");
    console.log(`  access_token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`  refresh_token: ${tokens.refresh_token.substring(0, 20)}...`);
    console.log(`  expira em: ${tokens.expires_in}s`);
    console.log(`  scopes: ${tokens.scope}`);
    console.log("\nAutorização concluída! O MCP pode ser usado agora.");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<html><body style='font-family:sans-serif;text-align:center;padding:60px'>" +
      "<h1 style='color:#2D8CFF'>&#10004; Zoom MCP Autorizado!</h1>" +
      "<p>Tokens salvos com sucesso. Você pode fechar esta aba.</p>" +
      "</body></html>"
    );
  } catch (err) {
    console.error("Erro ao trocar código por tokens:", err.message);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Erro</h1><p>${err.message}</p>`);
  }

  // Fechar servidor após 1s
  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 1000);
});

server.listen(4488, () => {
  console.log("Servidor de callback ouvindo em http://localhost:4488/callback\n");
  open(AUTH_URL);
});
