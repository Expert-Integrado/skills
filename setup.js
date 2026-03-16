#!/usr/bin/env node

/**
 * Expert Integrado — Setup de Ferramentas (MCPs)
 *
 * Onboarding 100% em português.
 * Auto-detecta Node.js, guia a instalação e configura tudo automaticamente.
 *
 * Uso: node setup.js
 */

import { createInterface } from "readline";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.join(__dirname, "mcps");

// ─── Credenciais compartilhadas (do app, não do usuário) ────────────────────
// Estas são credenciais do aplicativo da Expert Integrado, não pessoais.
// O Outlook já tem CLIENT_ID e TENANT_ID embutidos no código (src/config.js).
// O Zoom precisa das credenciais do app OAuth abaixo.

const ZOOM_APP_CREDENTIALS = {
  ZOOM_CLIENT_ID: "U2WuOarhRmOD96Njg4B38g",
  ZOOM_CLIENT_SECRET: "JbhR3QhIXPfi7k3JShq1brRkwn5ebtlQ",
  ZOOM_REDIRECT_URI: "http://localhost:4488/callback",
};

// ─── Definição dos MCPs ─────────────────────────────────────────────────────

const MCPS = [
  {
    id: "pipedrive",
    name: "Pipedrive CRM",
    desc: "Deals, contatos, atividades e notas no CRM",
    dir: "pipedrive",
    entry: "index.js",
    credentialType: "personal_key",
    setupGuide: [
      "",
      "  Como pegar sua API Key do Pipedrive:",
      "  1. Acesse expertintegrado.pipedrive.com",
      "  2. Clique no seu avatar (canto superior direito)",
      "  3. Vá em Configurações > Preferências pessoais > API",
      "  4. Copie o Token de API pessoal e cole abaixo",
      "",
    ],
    envVars: [
      { key: "PIPEDRIVE_API_KEY", prompt: "  Cole sua API Key do Pipedrive: " },
      { key: "PIPEDRIVE_TIMEZONE", value: "America/Sao_Paulo" },
    ],
    postInstall: async (mcpDir) => {
      print("\n  Dica: após reiniciar o Claude Code, peça a ele:");
      print('  > "Roda sync_fields e sync_activity_types no Pipedrive"');
      print("  Isso sincroniza os campos personalizados da empresa.\n");
    },
  },
  {
    id: "clickup",
    name: "ClickUp",
    desc: "Tarefas, documentos e time tracking",
    dir: "clickup",
    entry: "index.js",
    credentialType: "personal_key",
    setupGuide: [
      "",
      "  Como pegar seu API Token do ClickUp:",
      "  1. Acesse app.clickup.com",
      "  2. Clique no seu avatar (canto inferior esquerdo)",
      "  3. Vá em Settings > Apps",
      "  4. Em API Token, clique em Generate (ou copie o existente)",
      "  5. O token começa com pk_",
      "",
    ],
    envVars: [
      { key: "CLICKUP_API_KEY", prompt: "  Cole seu API Token do ClickUp: " },
    ],
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    desc: "E-mails, calendário e contatos",
    dir: "outlook",
    entry: "index.js",
    credentialType: "oauth_auto",
    envVars: [],
    postInstall: async (mcpDir) => {
      print("\n  Agora você vai autorizar o acesso à sua conta Microsoft 365.");
      print("  Um navegador vai abrir. Faça login com sua conta @expertintegrado.com.br\n");

      const proceed = await ask("  Pressione Enter para abrir o navegador...");
      try {
        execSync("node auth.js", {
          cwd: mcpDir,
          stdio: "inherit",
          timeout: 120000,
        });
        print("\n  Autenticação do Outlook concluída com sucesso!");
      } catch {
        print("\n  A autenticação será necessária depois.");
        print("  Peça ao Claude Code: \"Roda node auth.js na pasta " + mcpDir + "\"");
      }
    },
  },
  {
    id: "zoom",
    name: "Zoom Team Chat",
    desc: "Mensagens, canais e contatos do Zoom",
    dir: "zoom",
    entry: "index.js",
    credentialType: "oauth_auto",
    envVars: [
      { key: "ZOOM_CLIENT_ID", value: ZOOM_APP_CREDENTIALS.ZOOM_CLIENT_ID },
      { key: "ZOOM_CLIENT_SECRET", value: ZOOM_APP_CREDENTIALS.ZOOM_CLIENT_SECRET },
      { key: "ZOOM_REDIRECT_URI", value: ZOOM_APP_CREDENTIALS.ZOOM_REDIRECT_URI },
    ],
    postInstall: async (mcpDir) => {
      print("\n  Agora você vai autorizar o acesso à sua conta Zoom.");
      print("  Um navegador vai abrir. Faça login com sua conta Zoom da Expert Integrado.\n");

      const proceed = await ask("  Pressione Enter para abrir o navegador...");
      try {
        execSync("node auth.js", {
          cwd: mcpDir,
          stdio: "inherit",
          timeout: 120000,
          env: { ...process.env, ...ZOOM_APP_CREDENTIALS },
        });
        print("\n  Autenticação do Zoom concluída com sucesso!");
      } catch {
        print("\n  A autenticação será necessária depois.");
        print("  Peça ao Claude Code: \"Roda npm run auth na pasta " + mcpDir + "\"");
      }
    },
  },
  {
    id: "chatguru",
    name: "ChatGuru (somente leitura)",
    desc: "Consultar conversas e mensagens do WhatsApp empresarial",
    dir: "chatguru",
    entry: "index.js",
    credentialType: "playwright_login",
    envVars: [
      { key: "CHATGURU_MODE", value: "readonly" },
      { key: "CHATGURU_SERVER", prompt: "  Em qual servidor do ChatGuru você quer logar? (ex: 13, 17): " },
    ],
    postInstall: async (mcpDir, credentials) => {
      const server = credentials?.CHATGURU_SERVER || "17";

      print("\n  Agora você vai fazer login no ChatGuru.");
      print("  Um navegador vai abrir. Digite seu usuário e senha do ChatGuru.");
      print("  Esse login é feito apenas uma vez — nas próximas vezes será automático.");
      print("");
      print("  Importante: você terá acesso somente a ler as mensagens");
      print("  das quais você tem permissão de visualizar.\n");

      const proceed = await ask("  Pressione Enter para abrir o navegador...");
      try {
        execSync("node login.js", {
          cwd: mcpDir,
          stdio: "inherit",
          timeout: 120000,
          env: { ...process.env, CHATGURU_SERVER: server },
        });
        print("\n  Login do ChatGuru concluído!");
      } catch {
        print("\n  O login será necessário depois.");
        print("  Peça ao Claude Code: \"Roda node login.js na pasta " + mcpDir + "\"");
      }
    },
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web (pessoal)",
    desc: "Mensagens no WhatsApp pessoal via extensão do navegador",
    dir: "whatsapp",
    entry: "index.js",
    credentialType: "none",
    envVars: [],
    postInstall: async (mcpDir) => {
      print("\n  O WhatsApp MCP usa uma extensão do navegador.");
      print("  Para configurar:");
      print("  1. Abra o Edge ou Chrome");
      print("  2. Acesse edge://extensions/ (ou chrome://extensions/)");
      print("  3. Ative o Modo do desenvolvedor");
      print("  4. Clique em \"Carregar sem compactação\"");
      print("  5. Selecione a pasta: " + path.join(mcpDir, "extension"));
      print("  6. Abra web.whatsapp.com e mantenha a aba aberta\n");
    },
  },
];

// ─── Utilidades ─────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function print(msg = "") {
  console.log(msg);
}

// ─── Verificações automáticas ───────────────────────────────────────────────

function checkNodeVersion() {
  const version = process.versions.node;
  const major = parseInt(version.split(".")[0]);

  if (major < 18) {
    print("  ERRO: Node.js 18 ou superior é necessário.");
    print(`  Versão detectada: ${version}`);
    print("  Baixe em: https://nodejs.org/");
    print("");
    process.exit(1);
  }

  print(`  Node.js ${version} detectado. OK.`);
}

function checkGit() {
  try {
    const version = execSync("git --version", { stdio: "pipe" }).toString().trim();
    print(`  ${version} detectado. OK.`);
    return true;
  } catch {
    print("  Git não encontrado (opcional — não impede a instalação).");
    return false;
  }
}

// ─── Seleção de MCPs ────────────────────────────────────────────────────────

async function selectMCPs() {
  print("");
  print("═══════════════════════════════════════════════════════");
  print("  Quais dessas ferramentas você gostaria de instalar?");
  print("═══════════════════════════════════════════════════════");
  print("");

  MCPS.forEach((mcp, i) => {
    print(`  [${i + 1}] ${mcp.name}`);
    print(`      ${mcp.desc}`);
    print("");
  });

  print(`  [T] Instalar TODAS`);
  print("");

  const answer = await ask("  Digite os números separados por vírgula (ex: 1,3,5) ou T para todas: ");

  if (answer.trim().toUpperCase() === "T") {
    return MCPS.map((m) => m.id);
  }

  const indices = answer
    .split(",")
    .map((s) => parseInt(s.trim()) - 1)
    .filter((i) => i >= 0 && i < MCPS.length);

  if (indices.length === 0) {
    print("\n  Nenhuma ferramenta selecionada. Saindo.");
    process.exit(0);
  }

  return indices.map((i) => MCPS[i].id);
}

// ─── Coleta de credenciais ──────────────────────────────────────────────────

async function collectCredentials(selectedIds) {
  const credentials = {};

  for (const id of selectedIds) {
    const mcp = MCPS.find((m) => m.id === id);
    credentials[id] = {};

    // Verificar se tem envVars que precisam de input
    const hasPrompts = mcp.envVars.some((v) => v.prompt);

    if (hasPrompts) {
      print("");
      print(`  ── ${mcp.name} ${"─".repeat(Math.max(0, 45 - mcp.name.length))}`);

      // Mostrar guia passo a passo (Pipedrive, ClickUp)
      if (mcp.setupGuide) {
        mcp.setupGuide.forEach((line) => print(line));
      }
    }

    for (const envVar of mcp.envVars) {
      if (envVar.value) {
        // Credencial fixa (do app, não do usuário)
        credentials[id][envVar.key] = envVar.value;
      } else if (envVar.prompt) {
        // Precisa perguntar ao usuário
        const val = await ask(envVar.prompt);
        if (val.trim()) {
          credentials[id][envVar.key] = val.trim();
        } else {
          print("  Sem valor fornecido. Você poderá configurar depois via Claude Code.");
        }
      }
    }
  }

  return credentials;
}

// ─── Instalação ─────────────────────────────────────────────────────────────

async function installMCPs(selectedIds, credentials) {
  print("");
  print("═══════════════════════════════════════════════════════");
  print("  Instalando ferramentas...");
  print("═══════════════════════════════════════════════════════");

  const mcpConfigs = {};
  const installed = [];

  for (const id of selectedIds) {
    const mcp = MCPS.find((m) => m.id === id);
    const mcpDir = path.join(PACKAGES_DIR, mcp.dir);

    print(`\n  Instalando ${mcp.name}...`);

    // npm install
    try {
      execSync("npm install --production", { cwd: mcpDir, stdio: "pipe" });
      print("  Dependências instaladas. OK.");
    } catch (err) {
      print("  ERRO ao instalar dependências. Tente rodar manualmente:");
      print(`  cd ${mcpDir} && npm install`);
      continue;
    }

    // Criar .env (se tiver credenciais)
    const envContent = Object.entries(credentials[id] || {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    if (envContent) {
      fs.writeFileSync(path.join(mcpDir, ".env"), envContent + "\n");
    }

    // Config para claude_desktop_config.json
    mcpConfigs[mcp.id] = {
      command: "node",
      args: [path.join(mcpDir, mcp.entry)],
      env: credentials[id] || {},
    };

    installed.push(id);

    // Post-install (auth, login, etc.)
    if (mcp.postInstall) {
      await mcp.postInstall(mcpDir, credentials[id]);
    }
  }

  // Salvar no claude_desktop_config.json
  if (installed.length > 0) {
    print("\n  Configurando o Claude Desktop...");
    saveClaudeConfig(mcpConfigs);
  }

  return installed;
}

function saveClaudeConfig(mcpConfigs) {
  const configPath = getClaudeConfigPath();
  let existingConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      // config corrompido, recriar
    }
  }

  if (!existingConfig.mcpServers) {
    existingConfig.mcpServers = {};
  }

  for (const [id, config] of Object.entries(mcpConfigs)) {
    existingConfig.mcpServers[id] = config;
  }

  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
  print(`  Salvo em: ${configPath}`);
}

function getClaudeConfigPath() {
  const platform = process.platform;
  if (platform === "win32") {
    return path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
  } else if (platform === "darwin") {
    return path.join(process.env.HOME || "", "Library", "Application Support", "Claude", "claude_desktop_config.json");
  } else {
    return path.join(process.env.HOME || "", ".config", "claude", "claude_desktop_config.json");
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  print("");
  print("╔══════════════════════════════════════════════════════════╗");
  print("║    Expert Integrado — Setup de Ferramentas de IA        ║");
  print("╚══════════════════════════════════════════════════════════╝");
  print("");

  // Verificações automáticas
  print("  Verificando seu ambiente...");
  print("");
  checkNodeVersion();
  checkGit();
  print("");

  // Seleção
  const selectedIds = await selectMCPs();

  const selectedNames = selectedIds.map((id) => MCPS.find((m) => m.id === id).name);
  print(`\n  Selecionados: ${selectedNames.join(", ")}`);

  // Credenciais
  const credentials = await collectCredentials(selectedIds);

  // Instalação
  const installed = await installMCPs(selectedIds, credentials);

  // Resumo
  print("");
  print("╔══════════════════════════════════════════════════════════╗");
  print("║                  Instalação concluída!                  ║");
  print("╚══════════════════════════════════════════════════════════╝");
  print("");

  if (installed.length > 0) {
    print("  Ferramentas instaladas:");
    installed.forEach((id) => {
      const mcp = MCPS.find((m) => m.id === id);
      print(`    - ${mcp.name}`);
    });

    print("");
    print("  Próximo passo:");
    print("  Feche e reabra o Claude Code (ou Claude Desktop).");
    print("  As ferramentas vão aparecer automaticamente.");
    print("");
    print("  Para testar, peça ao Claude:");
    print('  > "Lista meus deals no Pipedrive"');
    print('  > "Mostra meus compromissos de amanhã"');
    print('  > "Quais tarefas eu tenho no ClickUp?"');
    print("");
    print("  Se algo não funcionar, peça ao responsável pela TI");
    print("  ou consulte a documentação no ClickUp.");
  }

  print("");
  rl.close();
}

main().catch((err) => {
  console.error("Erro no setup:", err);
  rl.close();
  process.exit(1);
});
