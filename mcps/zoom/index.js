import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKENS_PATH = join(__dirname, "tokens.json");

// Client ID PÚBLICO do app Expert Integrado (OAuth PKCE). Público por design —
// pode ficar no código. Sobrescreva via env ZOOM_CLIENT_ID p/ usar outro app.
const PUBLIC_CLIENT_ID = "gBJbWx7zSpKTr_PIgmBuoA";
const CLIENT_ID = process.env.ZOOM_CLIENT_ID || PUBLIC_CLIENT_ID;
const BASE_URL = "https://api.zoom.us/v2";

// ─── TOKEN MANAGEMENT ────────────────────────────────────────────────────────

let cachedTokens = null;

const ONBOARDING_MSG =
  "⚠️ Zoom não autorizado. O usuário precisa fazer login na conta Zoom dele.\n\n" +
  "**Passo a passo:**\n" +
  "1. Abra o terminal na pasta do zoom-mcp\n" +
  "2. Execute:\n" +
  "```\n" +
  "cd \"" + __dirname.replace(/\\/g, "/") + "\"\n" +
  "npm run auth\n" +
  "```\n" +
  "(A credencial ZOOM_CLIENT_ID deve estar definida como variável de ambiente — fluxo PKCE, sem secret)\n\n" +
  "3. O browser vai abrir — faça login na sua conta Zoom e autorize\n" +
  "4. Após autorizar, os tokens são salvos automaticamente\n" +
  "5. Volte aqui e tente novamente\n\n" +
  "Obs: cada usuário faz isso apenas **uma vez**. O token renova automaticamente depois.";

function isAuthorized() {
  return existsSync(TOKENS_PATH);
}

function loadTokens() {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error(ONBOARDING_MSG);
  }
  const data = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  cachedTokens = data;
  return data;
}

// Lê SEMPRE do disco (ignora o cache em memória). Usado antes de renovar:
// outro processo (Claude Desktop + Claude Code rodando juntos) pode ter
// rotacionado o refresh_token. Renovar com refresh_token velho do cache é a
// causa #1 da conexão cair depois de alguns dias (invalid_grant).
function loadTokensFromDisk() {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error(ONBOARDING_MSG);
  }
  return JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
}

function saveTokens(tokens) {
  cachedTokens = tokens;
  // Escrita atômica: grava em .tmp e renomeia, pra não corromper o tokens.json
  // se o processo morrer no meio (importante no Windows).
  const tmp = TOKENS_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(tokens, null, 2));
  renameSync(tmp, TOKENS_PATH);
}

function isTokenExpired(tokens) {
  if (!tokens || !tokens.created_at || !tokens.expires_in) return true;
  const expiresAt = tokens.created_at + tokens.expires_in * 1000;
  // Renovar 60s antes de expirar
  return Date.now() > expiresAt - 60_000;
}

// Dedupe de refresh concorrente DENTRO do mesmo processo: se duas tools baterem
// ao mesmo tempo com token expirado, só uma renova (senão uma rotação invalida
// o refresh_token da outra).
let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // Sempre partir do refresh_token mais novo do disco.
    let tokens = loadTokensFromDisk();

    const doRefresh = (refreshToken) =>
      fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        }),
      });

    let response = await doRefresh(tokens.refresh_token);

    // Se falhou, talvez outro processo já tenha rotacionado e gravado um
    // refresh_token novo no disco. Relê e tenta mais uma vez antes de desistir.
    if (!response.ok) {
      try {
        const disk = loadTokensFromDisk();
        if (disk.refresh_token && disk.refresh_token !== tokens.refresh_token) {
          tokens = disk;
          response = await doRefresh(tokens.refresh_token);
        }
      } catch {}
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Falha ao renovar token (HTTP ${response.status}): ${errText}\n` +
        "Execute `node auth.js` novamente para reautorizar."
      );
    }

    const data = await response.json();
    const newTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
      created_at: Date.now(),
    };
    saveTokens(newTokens);
    return newTokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function getAccessToken() {
  let tokens = cachedTokens || loadTokens();
  if (isTokenExpired(tokens)) {
    // Antes de renovar, conferir se outro processo já renovou recentemente
    // (evita rotação desnecessária que derrubaria o outro processo).
    try {
      const disk = loadTokensFromDisk();
      if (!isTokenExpired(disk)) {
        cachedTokens = disk;
        return disk.access_token;
      }
    } catch {}
    tokens = await refreshAccessToken();
  }
  return tokens.access_token;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

function friendlyError(status, defaultMsg) {
  const messages = {
    400: "Requisição inválida. Verifique os parâmetros.",
    401: "Token expirado ou inválido. Execute `node auth.js` novamente.",
    403: "Sem permissão. Verifique os scopes do app no Zoom Marketplace.",
    404: "Recurso não encontrado no Zoom.",
    429: "Limite de requisições do Zoom atingido. Tente novamente em alguns segundos.",
    500: "Erro interno do servidor Zoom.",
    502: "Zoom temporariamente indisponível.",
    503: "Zoom em manutenção.",
  };
  return messages[status] || defaultMsg || `Erro ${status} na API do Zoom.`;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Faz requisição à API do Zoom com auto-refresh e retry.
 */
async function zoomRequest(method, path, { query = {}, body = null, retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const accessToken = await getAccessToken();

    // Montar URL com query params
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET" && method !== "DELETE") {
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url.toString(), options);
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.error(`[Zoom] Erro de rede (tentativa ${attempt}/${retries}): ${err.message}. Retry em ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw new Error(`Erro de conexão com Zoom após ${retries} tentativas: ${err.message}`);
    }

    // Se 401, tentar refresh uma vez
    if (response.status === 401 && attempt === 1) {
      try {
        await refreshAccessToken();
        continue;
      } catch {
        throw new Error(friendlyError(401));
      }
    }

    if (!response.ok && RETRYABLE_STATUSES.includes(response.status) && attempt < retries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.error(`[Zoom] HTTP ${response.status} (tentativa ${attempt}/${retries}). Retry em ${delay}ms...`);
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      let errDetail = "";
      try {
        const errJson = await response.json();
        errDetail = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch {
        errDetail = await response.text().catch(() => "");
      }
      throw new Error(`${friendlyError(response.status)} ${errDetail}`.trim());
    }

    // 204 No Content
    if (response.status === 204) {
      return {};
    }

    return await response.json();
  }
}

/**
 * Busca todas as páginas de um endpoint paginado do Zoom.
 */
async function zoomRequestAllPages(path, { query = {}, resultKey = null, maxPages = 10 } = {}) {
  const allItems = [];
  let pageToken = "";
  let pages = 0;

  do {
    const q = { ...query, page_size: 50 };
    if (pageToken) q.next_page_token = pageToken;

    const data = await zoomRequest("GET", path, { query: q });

    // Detectar automaticamente a chave do array de resultados
    const key = resultKey || Object.keys(data).find(
      (k) => Array.isArray(data[k]) && k !== "page_size"
    );
    if (key && data[key]) {
      allItems.push(...data[key]);
    }

    pageToken = data.next_page_token || "";
    pages++;
  } while (pageToken && pages < maxPages);

  return allItems;
}

// ─── MCP SERVER ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "zoom-mcp",
  version: "2.0.0",
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING / STATUS
// ═══════════════════════════════════════════════════════════════════════════════

server.tool(
  "zoom_status",
  "Verifica o status da conexão com o Zoom Team Chat. Mostra se o usuário está autorizado e as informações da conta.",
  {},
  async () => {
    if (!isAuthorized()) {
      return { content: [{ type: "text", text: ONBOARDING_MSG }] };
    }

    try {
      const data = await zoomRequest("GET", "/users/me");
      return {
        content: [{
          type: "text",
          text:
            "✅ Zoom conectado!\n\n" +
            `**Usuário:** ${data.first_name || ""} ${data.last_name || ""}\n` +
            `**Email:** ${data.email || "N/A"}\n` +
            `**Conta:** ${data.account_id || "N/A"}\n` +
            `**Tipo:** ${data.type === 1 ? "Basic" : data.type === 2 ? "Licensed" : `Tipo ${data.type}`}\n` +
            `**Status:** ${data.status || "N/A"}`
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `⚠️ Tokens encontrados mas a conexão falhou: ${err.message}\n\nTente rodar \`node auth.js\` novamente.`
        }],
      };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CANAIS (5 tools)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TOOL 1: LISTAR CANAIS ──────────────────────────────────────────────────

server.tool(
  "zoom_list_channels",
  "Lista todos os canais do Zoom Team Chat do usuário. Retorna ID, nome, tipo e número de membros de cada canal.",
  {
    page_size: z.number().optional().default(50).describe("Itens por página (máx 50)"),
  },
  async ({ page_size }) => {
    const channels = await zoomRequestAllPages("/chat/users/me/channels", {
      query: { page_size: Math.min(page_size, 50) },
      resultKey: "channels",
    });

    if (channels.length === 0) {
      return { content: [{ type: "text", text: "Nenhum canal encontrado." }] };
    }

    const formatted = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type === 1 ? "Público" : ch.type === 2 ? "Privado" : ch.type === 3 ? "DM" : `Tipo ${ch.type}`,
      members: ch.channel_settings?.members_count ?? "N/A",
    }));

    return {
      content: [{ type: "text", text: `${channels.length} canal(is) encontrado(s):\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 2: DETALHES DO CANAL ──────────────────────────────────────────────

server.tool(
  "zoom_get_channel",
  "Retorna detalhes de um canal específico do Zoom Team Chat (nome, tipo, configurações, membros).",
  {
    channel_id: z.string().describe("ID do canal (obtido via zoom_list_channels)"),
  },
  async ({ channel_id }) => {
    const data = await zoomRequest("GET", `/chat/channels/${channel_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── TOOL 3: CRIAR CANAL ────────────────────────────────────────────────────

server.tool(
  "zoom_create_channel",
  "Cria um novo canal no Zoom Team Chat.",
  {
    name: z.string().describe("Nome do canal"),
    type: z.number().optional().default(1).describe("Tipo: 1=Público (padrão), 2=Privado, 3=DM"),
    members: z.array(z.string()).optional().describe("Emails dos membros a adicionar (opcional)"),
  },
  async ({ name, type, members }) => {
    const body = { name, type };
    if (members && members.length > 0) {
      body.members = members.map((email) => ({ email }));
    }

    const data = await zoomRequest("POST", "/chat/users/me/channels", { body });
    return {
      content: [{ type: "text", text: `Canal criado!\nID: ${data.id}\nNome: ${data.name}` }],
    };
  }
);

// ─── TOOL 4: LISTAR MEMBROS DO CANAL ────────────────────────────────────────

server.tool(
  "zoom_list_channel_members",
  "Lista os membros de um canal do Zoom Team Chat.",
  {
    channel_id: z.string().describe("ID do canal"),
  },
  async ({ channel_id }) => {
    const members = await zoomRequestAllPages(`/chat/channels/${channel_id}/members`, {
      resultKey: "members",
    });

    if (members.length === 0) {
      return { content: [{ type: "text", text: "Nenhum membro encontrado neste canal." }] };
    }

    const formatted = members.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.name || m.email,
      role: m.role,
    }));

    return {
      content: [{ type: "text", text: `${members.length} membro(s):\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 5: CONVIDAR MEMBROS PARA CANAL ────────────────────────────────────

server.tool(
  "zoom_invite_channel_members",
  "Convida membros para um canal do Zoom Team Chat por email.",
  {
    channel_id: z.string().describe("ID do canal"),
    members: z.array(z.string()).describe("Emails dos membros a convidar"),
  },
  async ({ channel_id, members }) => {
    const body = {
      members: members.map((email) => ({ email })),
    };
    await zoomRequest("POST", `/chat/channels/${channel_id}/members`, { body });
    return {
      content: [{ type: "text", text: `${members.length} membro(s) convidado(s) para o canal.` }],
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAGENS (9 tools)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TOOL 6: ENVIAR MENSAGEM ────────────────────────────────────────────────

server.tool(
  "zoom_send_message",
  "Envia uma mensagem no Zoom Team Chat. Pode enviar para um canal (to_channel) ou como DM para um contato (to_contact). Para DM, use o email do destinatário.",
  {
    message: z.string().describe("Texto da mensagem"),
    to_channel: z.string().optional().describe("ID do canal destino (usar para mensagens em canal)"),
    to_contact: z.string().optional().describe("Email do contato destino (usar para DM)"),
    reply_main_message_id: z.string().optional().describe("ID da mensagem para responder em thread (opcional)"),
  },
  async ({ message, to_channel, to_contact, reply_main_message_id }) => {
    if (!to_channel && !to_contact) {
      return { content: [{ type: "text", text: "Erro: informe to_channel (ID do canal) ou to_contact (email) como destino." }] };
    }

    const body = { message };
    if (to_channel) body.to_channel = to_channel;
    if (to_contact) body.to_contact = to_contact;
    if (reply_main_message_id) body.reply_main_message_id = reply_main_message_id;

    try {
      const data = await zoomRequest("POST", "/chat/users/me/messages", { body });
      const dest = to_channel ? `canal ${to_channel}` : `contato ${to_contact}`;
      let msg = `Mensagem enviada para ${dest}.`;
      if (data.id) msg += ` ID: ${data.id}`;
      if (reply_main_message_id) msg += ` (reply na thread de ${reply_main_message_id})`;
      return { content: [{ type: "text", text: msg }] };
    } catch (err) {
      // Erro de reply: a mensagem pode ser uma reply (não main) ou de outro canal
      if (reply_main_message_id && err.message && (err.message.includes("main message") || err.message.includes("does not exist"))) {
        return {
          content: [{
            type: "text",
            text:
              `Erro ao responder na thread: o ID "${reply_main_message_id}" não é uma mensagem principal (main message).\n\n` +
              "**Dica:** O reply_main_message_id deve ser o ID da PRIMEIRA mensagem do tópico, não de uma resposta dentro dele. " +
              "Use zoom_get_message para verificar se a mensagem tem o campo reply_main_message_id — se tiver, use ESSE valor como destino do reply, pois é o ID da mensagem raiz."
          }],
        };
      }
      throw err;
    }
  }
);

// ─── TOOL 7: ENVIAR ARQUIVO ─────────────────────────────────────────────────

server.tool(
  "zoom_send_file",
  "Envia um arquivo (imagem, PDF, PPTX, etc) no Zoom Team Chat. Pode enviar para um canal (to_channel) ou DM para um contato (to_contact).",
  {
    file_path: z.string().describe("Caminho absoluto do arquivo no sistema local"),
    to_channel: z.string().optional().describe("ID do canal destino"),
    to_contact: z.string().optional().describe("Email do contato destino (para DM)"),
    reply_main_message_id: z.string().optional().describe("ID da mensagem raiz para enviar como reply em thread (opcional)"),
  },
  async ({ file_path, to_channel, to_contact, reply_main_message_id }) => {
    if (!to_channel && !to_contact) {
      return { content: [{ type: "text", text: "Erro: informe to_channel (ID do canal) ou to_contact (email) como destino." }] };
    }

    const fs = await import("fs");
    const path = await import("path");

    if (!fs.default.existsSync(file_path)) {
      return { content: [{ type: "text", text: `Arquivo não encontrado: ${file_path}` }] };
    }

    const fileName = path.default.basename(file_path);
    const fileBuffer = fs.default.readFileSync(file_path);
    const fileSize = fileBuffer.length;

    // Detectar MIME type pela extensão
    const ext = path.default.extname(fileName).toLowerCase();
    const mimeTypes = {
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
      ".pdf": "application/pdf",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".ppt": "application/vnd.ms-powerpoint",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".txt": "text/plain", ".csv": "text/csv",
      ".zip": "application/zip", ".mp4": "video/mp4",
      ".mp3": "audio/mpeg", ".wav": "audio/wav",
    };
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Usar FormData nativo (Node 18+) — mais confiável que multipart manual
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("files", blob, fileName);
    if (to_channel) formData.append("to_channel", to_channel);
    if (to_contact) formData.append("to_contact", to_contact);
    if (reply_main_message_id) formData.append("reply_main_message_id", reply_main_message_id);

    const accessToken = await getAccessToken();
    // Buscar userId real pois /me pode não funcionar neste endpoint
    const meData = await zoomRequest("GET", "/users/me");
    const userId = meData.id || "me";
    const url = `${BASE_URL}/chat/users/${userId}/messages/files`;

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Não setar Content-Type manualmente — o fetch seta automaticamente com boundary correto
        },
        body: formData,
      });
    } catch (err) {
      return { content: [{ type: "text", text: `Erro de conexão ao enviar arquivo: ${err.message}` }] };
    }

    if (!response.ok) {
      let errDetail = "";
      try {
        const errJson = await response.json();
        errDetail = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch {
        errDetail = await response.text().catch(() => "");
      }
      return { content: [{ type: "text", text: `Erro HTTP ${response.status} ao enviar arquivo: ${errDetail}` }] };
    }

    const data = await response.json().catch(() => ({}));
    const dest = to_channel ? `canal ${to_channel}` : `contato ${to_contact}`;
    const sizeKB = (fileSize / 1024).toFixed(1);

    return {
      content: [{
        type: "text",
        text:
          `✅ Arquivo enviado com sucesso!\n\n` +
          `**Arquivo:** ${fileName} (${sizeKB} KB)\n` +
          `**Destino:** ${dest}\n` +
          (data.id ? `**ID da mensagem:** ${data.id}` : ""),
      }],
    };
  }
);

// ─── TOOL 8: LISTAR MENSAGENS ───────────────────────────────────────────────

server.tool(
  "zoom_list_messages",
  "Lista mensagens de um canal ou conversa DM no Zoom Team Chat. Retorna as mensagens mais recentes.",
  {
    to_channel: z.string().optional().describe("ID do canal para listar mensagens"),
    to_contact: z.string().optional().describe("Email do contato para listar DMs"),
    date: z.string().optional().describe("Data para filtrar (YYYY-MM-DD). Padrão: hoje."),
    page_size: z.number().optional().default(50).describe("Quantidade de mensagens (máx 50)"),
    include_deleted_and_edited_message: z.boolean().optional().describe("Incluir mensagens editadas/deletadas"),
  },
  async ({ to_channel, to_contact, date, page_size, include_deleted_and_edited_message }) => {
    if (!to_channel && !to_contact) {
      return { content: [{ type: "text", text: "Erro: informe to_channel (ID do canal) ou to_contact (email)." }] };
    }

    const query = {
      page_size: Math.min(page_size, 50),
    };
    if (to_channel) query.to_channel = to_channel;
    if (to_contact) query.to_contact = to_contact;
    if (date) query.date = date;
    if (include_deleted_and_edited_message) query.include_deleted_and_edited_message = true;

    const data = await zoomRequest("GET", "/chat/users/me/messages", { query });
    const messages = data.messages || [];

    if (messages.length === 0) {
      return { content: [{ type: "text", text: "Nenhuma mensagem encontrada." }] };
    }

    const formatted = messages.map((m) => {
      const entry = {
        id: m.id,
        sender: m.sender || m.sender_display_name || "N/A",
        message: m.message || "",
        date_time: m.date_time || "",
        timestamp: m.timestamp || "",
      };
      // Thread: indicar se é reply e de qual mensagem
      if (m.reply_main_message_id) {
        entry.reply_main_message_id = m.reply_main_message_id;
      }
      // Tipo da mensagem (text, file_and_text, etc)
      if (m.message_type && m.message_type !== "text") {
        entry.message_type = m.message_type;
      }
      // Arquivos/imagens anexados
      if (m.files && m.files.length > 0) {
        entry.files = m.files.map((f) => ({
          file_id: f.file_id,
          file_name: f.file_name,
          file_size: f.file_size,
        }));
      } else if (m.file_id) {
        entry.files = [{
          file_id: m.file_id,
          file_name: m.file_name || "N/A",
          file_size: m.file_size || 0,
        }];
      }
      return entry;
    });

    return {
      content: [{ type: "text", text: `${messages.length} mensagem(ns):\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 8: DETALHES DA MENSAGEM ───────────────────────────────────────────

server.tool(
  "zoom_get_message",
  "Retorna detalhes de uma mensagem específica do Zoom Team Chat.",
  {
    message_id: z.string().describe("ID da mensagem"),
    to_channel: z.string().optional().describe("ID do canal onde está a mensagem"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
  },
  async ({ message_id, to_channel, to_contact }) => {
    const query = {};
    if (to_channel) query.to_channel = to_channel;
    if (to_contact) query.to_contact = to_contact;

    const data = await zoomRequest("GET", `/chat/users/me/messages/${message_id}`, { query });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── TOOL 9: EDITAR MENSAGEM ────────────────────────────────────────────────

server.tool(
  "zoom_update_message",
  "Edita uma mensagem já enviada no Zoom Team Chat.",
  {
    message_id: z.string().describe("ID da mensagem a editar"),
    message: z.string().describe("Novo texto da mensagem"),
    to_channel: z.string().optional().describe("ID do canal onde está a mensagem"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
  },
  async ({ message_id, message, to_channel, to_contact }) => {
    const body = { message };
    if (to_channel) body.to_channel = to_channel;
    if (to_contact) body.to_contact = to_contact;

    try {
      await zoomRequest("PUT", `/chat/users/me/messages/${message_id}`, { body });
      return { content: [{ type: "text", text: `Mensagem ${message_id} editada com sucesso.` }] };
    } catch (err) {
      if (err.message && err.message.includes("Only the sender")) {
        return { content: [{ type: "text", text: `Não é possível editar esta mensagem: apenas quem enviou pode editar. Verifique se a mensagem é sua.` }] };
      }
      throw err;
    }
  }
);

// ─── TOOL 10: DELETAR MENSAGEM ──────────────────────────────────────────────

server.tool(
  "zoom_delete_message",
  "Deleta uma mensagem no Zoom Team Chat.",
  {
    message_id: z.string().describe("ID da mensagem a deletar"),
    to_channel: z.string().optional().describe("ID do canal onde está a mensagem"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
  },
  async ({ message_id, to_channel, to_contact }) => {
    const query = {};
    if (to_channel) query.to_channel = to_channel;
    if (to_contact) query.to_contact = to_contact;

    await zoomRequest("DELETE", `/chat/users/me/messages/${message_id}`, { query });
    return { content: [{ type: "text", text: `Mensagem ${message_id} deletada.` }] };
  }
);

// ─── TOOL 11: REAGIR A MENSAGEM ─────────────────────────────────────────────

server.tool(
  "zoom_react_message",
  "Adiciona ou remove uma reação emoji em uma mensagem do Zoom Team Chat. Nota: só funciona em mensagens que você enviou ou em canais onde você tem permissão.",
  {
    message_id: z.string().describe("ID da mensagem"),
    emoji: z.string().describe("Emoji para reagir (ex: 'thumbsup', 'heart', '+1', ou emoji Unicode)"),
    action: z.enum(["add", "remove"]).optional().default("add").describe("Ação: add (padrão) ou remove"),
    to_channel: z.string().optional().describe("ID do canal"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
  },
  async ({ message_id, emoji, action, to_channel, to_contact }) => {
    const body = { emoji, action };
    if (to_channel) body.to_channel = to_channel;
    if (to_contact) body.to_contact = to_contact;

    try {
      await zoomRequest("PATCH", `/chat/users/me/messages/${message_id}/emoji_reactions`, { body });
      const actionText = action === "add" ? "adicionada" : "removida";
      return { content: [{ type: "text", text: `Reação ${emoji} ${actionText} na mensagem ${message_id}.` }] };
    } catch (err) {
      if (err.message && err.message.includes("5301")) {
        return { content: [{ type: "text", text: `Não foi possível reagir à mensagem: erro interno do Zoom (código 5301). Isso ocorre com mensagens de outros usuários em alguns planos. Tente em outra mensagem.` }] };
      }
      throw err;
    }
  }
);

// ─── TOOL 12: LISTAR THREAD ─────────────────────────────────────────────────

server.tool(
  "zoom_list_thread",
  "Lista as respostas de uma thread (conversa encadeada) de uma mensagem no Zoom Team Chat.",
  {
    message_id: z.string().describe("ID da mensagem principal da thread"),
    to_channel: z.string().optional().describe("ID do canal"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
    from: z.string().optional().describe("Data inicial das respostas (YYYY-MM-DD). Padrão: 30 dias atrás."),
    page_size: z.number().optional().default(50).describe("Quantidade de respostas (máx 50)"),
  },
  async ({ message_id, to_channel, to_contact, from, page_size }) => {
    // A API do Zoom exige 'from' no formato YYYY-MM-DDTHH:mm:ssZ (sem milissegundos)
    function toZoomDate(d) {
      return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    const defaultFrom = toZoomDate(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fromValue = from
      ? (from.includes("T") ? toZoomDate(from) : toZoomDate(from + "T00:00:00Z"))
      : defaultFrom;
    const query = { page_size: Math.min(page_size, 50), from: fromValue };
    if (to_channel) query.to_channel = to_channel;
    if (to_contact) query.to_contact = to_contact;

    const data = await zoomRequest("GET", `/chat/users/me/messages/${message_id}/thread`, { query });
    const replies = data.messages || [];

    if (replies.length === 0) {
      return { content: [{ type: "text", text: "Nenhuma resposta encontrada nesta thread." }] };
    }

    const formatted = replies.map((m) => {
      const entry = {
        id: m.id,
        sender: m.sender || m.sender_display_name || "N/A",
        message: m.message || "",
        date_time: m.date_time || "",
      };
      if (m.message_type && m.message_type !== "text") {
        entry.message_type = m.message_type;
      }
      if (m.files && m.files.length > 0) {
        entry.files = m.files.map((f) => ({
          file_id: f.file_id,
          file_name: f.file_name,
          file_size: f.file_size,
        }));
      }
      return entry;
    });

    return {
      content: [{ type: "text", text: `${replies.length} resposta(s) na thread:\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 13: BAIXAR ARQUIVO/IMAGEM ────────────────────────────────────────

server.tool(
  "zoom_download_file",
  "Baixa um arquivo ou imagem de uma mensagem do Zoom Team Chat. Retorna a imagem inline (para visualização) ou informações do arquivo baixado. Use zoom_get_message ou zoom_list_messages para obter o message_id de mensagens com arquivos.",
  {
    message_id: z.string().describe("ID da mensagem que contém o arquivo"),
    to_channel: z.string().optional().describe("ID do canal onde está a mensagem"),
    to_contact: z.string().optional().describe("Email do contato (para DMs)"),
    file_index: z.number().optional().default(0).describe("Índice do arquivo (0 = primeiro). Usar quando a mensagem tem múltiplos arquivos."),
  },
  async ({ message_id, to_channel, to_contact, file_index }) => {
    // 1. Buscar detalhes da mensagem para obter download_url
    const query = {};
    if (to_channel) query.to_channel = to_channel;
    if (to_contact) query.to_contact = to_contact;

    const msgData = await zoomRequest("GET", `/chat/users/me/messages/${message_id}`, { query });

    // 2. Extrair arquivo
    let file = null;
    if (msgData.files && msgData.files.length > 0) {
      if (file_index >= msgData.files.length) {
        return {
          content: [{
            type: "text",
            text: `A mensagem tem ${msgData.files.length} arquivo(s), mas você pediu o índice ${file_index}. Use um índice entre 0 e ${msgData.files.length - 1}.`
          }],
        };
      }
      file = msgData.files[file_index];
    } else if (msgData.download_url) {
      file = {
        file_id: msgData.file_id || "unknown",
        file_name: msgData.file_name || "arquivo",
        file_size: msgData.file_size || 0,
        download_url: msgData.download_url,
      };
    }

    if (!file || !file.download_url) {
      return {
        content: [{
          type: "text",
          text: "Esta mensagem não contém arquivos para download.\n\nCampos encontrados: " + JSON.stringify(Object.keys(msgData))
        }],
      };
    }

    // 3. Baixar o arquivo (a URL já contém JWT de autenticação)
    let response;
    try {
      response = await fetch(file.download_url, {
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        redirect: "follow",
      });
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Erro ao baixar o arquivo: ${err.message}\n\nURL: ${file.download_url.substring(0, 100)}...`
        }],
      };
    }

    if (!response.ok) {
      return {
        content: [{
          type: "text",
          text: `Erro HTTP ${response.status} ao baixar o arquivo "${file.file_name}".`
        }],
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    // 4. Se for imagem, retornar inline para visualização
    const isImage = contentType.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(file.file_name);

    if (isImage) {
      const mimeType = contentType.startsWith("image/")
        ? contentType.split(";")[0]
        : "image/png";

      return {
        content: [
          {
            type: "text",
            text: `📎 **${file.file_name}** (${(file.file_size / 1024).toFixed(1)} KB)\nDe: ${msgData.sender_display_name || msgData.sender || "N/A"}\nData: ${msgData.date_time || "N/A"}`,
          },
          {
            type: "image",
            data: buffer.toString("base64"),
            mimeType,
          },
        ],
      };
    }

    // 5. Arquivo não-imagem: salvar em temp e retornar info
    const os = await import("os");
    const fs = await import("fs");
    const path = await import("path");
    const tempDir = os.default.tmpdir();
    const safeName = file.file_name.replace(/[<>:"/\\|?*]/g, "_");
    const tempPath = path.default.join(tempDir, `zoom_${file.file_id}_${safeName}`);
    fs.default.writeFileSync(tempPath, buffer);

    return {
      content: [{
        type: "text",
        text:
          `📎 Arquivo baixado com sucesso!\n\n` +
          `**Nome:** ${file.file_name}\n` +
          `**Tamanho:** ${(file.file_size / 1024).toFixed(1)} KB\n` +
          `**Tipo:** ${contentType || "desconhecido"}\n` +
          `**Salvo em:** ${tempPath}\n` +
          `**De:** ${msgData.sender_display_name || msgData.sender || "N/A"}\n` +
          `**Data:** ${msgData.date_time || "N/A"}`
      }],
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTATOS E SESSÕES (3 tools)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TOOL 14: LISTAR CONTATOS ──────────────────────────────────────────────

server.tool(
  "zoom_list_contacts",
  "Lista os contatos do Zoom Team Chat do usuário.",
  {
    type: z.enum(["company", "external"]).optional().default("company").describe("Tipo: company (mesma org, padrão) ou external"),
    page_size: z.number().optional().default(50).describe("Itens por página (máx 50)"),
  },
  async ({ type, page_size }) => {
    const contacts = await zoomRequestAllPages("/chat/users/me/contacts", {
      query: { type, page_size: Math.min(page_size, 50) },
      resultKey: "contacts",
    });

    if (contacts.length === 0) {
      return { content: [{ type: "text", text: "Nenhum contato encontrado." }] };
    }

    const formatted = contacts.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : c.name || c.email,
      presence_status: c.presence_status || "N/A",
    }));

    return {
      content: [{ type: "text", text: `${contacts.length} contato(s):\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 15: BUSCAR CONTATOS ───────────────────────────────────────────────

server.tool(
  "zoom_search_contacts",
  "Busca contatos na empresa pelo nome ou email no Zoom Team Chat.",
  {
    search_key: z.string().describe("Termo de busca (nome ou email)"),
    page_size: z.number().optional().default(20).describe("Quantidade máxima de resultados"),
  },
  async ({ search_key, page_size }) => {
    // Busca todos os contatos da organização e filtra localmente pelo search_key
    const allContacts = await zoomRequestAllPages("/chat/users/me/contacts", {
      query: { type: "company" },
      resultKey: "contacts",
    });

    const term = search_key.toLowerCase();
    const filtered = allContacts.filter((c) => {
      const name = (c.first_name || "" + " " + c.last_name || "" + " " + c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    }).slice(0, page_size);

    if (filtered.length === 0) {
      return { content: [{ type: "text", text: `Nenhum contato encontrado para "${search_key}".` }] };
    }

    const formatted = filtered.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : c.name || c.email,
      presence_status: c.presence_status || "N/A",
    }));

    return {
      content: [{ type: "text", text: `${filtered.length} resultado(s) para "${search_key}":\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── TOOL 16: LISTAR SESSÕES/CONVERSAS ──────────────────────────────────────

server.tool(
  "zoom_list_sessions",
  "Lista as sessões/conversas recentes do Zoom Team Chat (canais e DMs com atividade recente).",
  {
    from: z.string().optional().describe("Data inicial (YYYY-MM-DD)"),
    to: z.string().optional().describe("Data final (YYYY-MM-DD)"),
  },
  async ({ from, to }) => {
    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;

    const data = await zoomRequest("GET", "/chat/users/me/sessions", { query });
    const sessions = data.sessions || [];

    if (sessions.length === 0) {
      return { content: [{ type: "text", text: "Nenhuma sessão recente encontrada." }] };
    }

    const formatted = sessions.map((s) => ({
      session_id: s.session_id,
      name: s.name || "N/A",
      type: s.type || "N/A",
      last_message_sent_time: s.last_message_sent_time || "N/A",
    }));

    return {
      content: [{ type: "text", text: `${sessions.length} sessão(ões) recente(s):\n\n${JSON.stringify(formatted, null, 2)}` }],
    };
  }
);

// ─── START ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

// Cleanup: encerra o processo quando o stdin do pai (Claude Code/Desktop) fechar.
// Sem isso, em Windows o processo node fica zumbi após restart do host.
process.stdin.on("end", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));
