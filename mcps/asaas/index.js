import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkRotaBloqueada, checkWriteGate, checkValorSuspeito, AVISO_WEBHOOK } from "./guardrails.js";

// ─── CONFIGURACAO ─────────────────────────────────────────────────────────────

const API_KEY = process.env.ASAAS_API_KEY;
if (!API_KEY) {
  console.error("[asaas-mcp] ERRO: ASAAS_API_KEY nao configurada. Defina a variavel de ambiente antes de iniciar.");
  process.exit(1);
}

// producao por padrao. sandbox exige chave PROPRIA, gerada na conta sandbox — a chave
// de producao NAO funciona la (e vice-versa).
const AMBIENTE = (process.env.ASAAS_ENV || "producao").toLowerCase();
const BASE_URL =
  AMBIENTE === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

function friendlyError(status, detalhe) {
  const messages = {
    400: "Requisicao invalida — confira os campos enviados.",
    401: "Chave de API invalida ou EXPIRADA. A chave do Asaas expira por inatividade (3 meses desabilita, 6 meses expira de vez). Gere outra em Integracoes > Chaves de API e atualize o 1Password.",
    403: "Sem permissao para este recurso no Asaas.",
    404: "Recurso nao encontrado no Asaas.",
    429: "Limite de requisicoes atingido. Tente de novo em alguns segundos.",
    500: "Erro interno do Asaas. Tente de novo.",
    502: "Asaas temporariamente indisponivel.",
    503: "Asaas em manutencao.",
  };
  const base = messages[status] || `Erro ${status} na API do Asaas.`;
  return detalhe ? `${base}\n${detalhe}` : base;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function asaasRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  // Guardrail de rota: avaliado ANTES de qualquer chamada de rede.
  checkRotaBloqueada(path, method);

  const url = `${BASE_URL}${path}`;
  const retries = 3;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
      response = await fetch(url, {
        ...options,
        method,
        headers: {
          access_token: API_KEY,
          "Content-Type": "application/json",
          "User-Agent": "expert-asaas-mcp",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") throw new Error("Timeout: o Asaas nao respondeu em 30 segundos.");
      throw err;
    }
    clearTimeout(timeout);

    if (!response.ok && RETRYABLE_STATUSES.includes(response.status) && attempt < retries) {
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
      continue;
    }

    const texto = await response.text();
    let data = null;
    try {
      data = texto ? JSON.parse(texto) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      // formato de erro do Asaas: { errors: [{ code, description }] }
      const detalhe = data?.errors?.length
        ? data.errors.map((e) => `- ${e.description}${e.code ? ` (${e.code})` : ""}`).join("\n")
        : texto?.slice(0, 300);
      throw new Error(friendlyError(response.status, detalhe));
    }

    return data;
  }
}

/** Busca todas as paginas de um endpoint de lista (offset/limit + hasMore). */
async function buscarTodos(path, { maxRegistros = 2000, pageSize = 100 } = {}) {
  const itens = [];
  let offset = 0;
  let totalCount = 0;

  while (itens.length < maxRegistros) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await asaasRequest(`${path}${sep}limit=${pageSize}&offset=${offset}`);
    totalCount = data?.totalCount ?? totalCount;
    const pagina = data?.data || [];
    itens.push(...pagina);
    if (!data?.hasMore || pagina.length === 0) break;
    offset += pageSize;
  }

  return { itens: itens.slice(0, maxRegistros), totalCount };
}

// ─── FORMATACAO (tudo em pt-BR, para leitura humana) ─────────────────────────

const STATUS_PT = {
  PENDING: "Aguardando pagamento",
  RECEIVED: "Recebida (dinheiro disponivel na conta)",
  CONFIRMED: "Confirmada (paga, aguardando liquidacao)",
  OVERDUE: "VENCIDA",
  REFUNDED: "Estornada",
  RECEIVED_IN_CASH: "Recebida em dinheiro",
  REFUND_REQUESTED: "Estorno solicitado",
  REFUND_IN_PROGRESS: "Estorno em andamento",
  CHARGEBACK_REQUESTED: "Chargeback solicitado",
  CHARGEBACK_DISPUTE: "Chargeback em disputa",
  AWAITING_CHARGEBACK_REVERSAL: "Aguardando reversao de chargeback",
  DUNNING_REQUESTED: "Recuperacao solicitada",
  DUNNING_RECEIVED: "Recuperada",
  AWAITING_RISK_ANALYSIS: "Em analise de risco",
};

const COBRANCA_TIPO_PT = {
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartao de credito",
  PIX: "Pix",
  DEBIT_CARD: "Cartao de debito",
  TRANSFER: "Transferencia",
  DEPOSIT: "Deposito",
  UNDEFINED: "Cliente escolhe",
};

const CICLO_PT = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUALLY: "Semestral",
  YEARLY: "Anual",
};

const brl = (v) =>
  typeof v === "number"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "-";

/** API devolve data como AAAA-MM-DD (ou ISO). Exibe DD/MM/AAAA, sem inventar fuso. */
const dataBr = (s) => {
  if (!s) return "-";
  const d = String(s).slice(0, 10);
  const [a, m, dia] = d.split("-");
  return a && m && dia ? `${dia}/${m}/${a}` : String(s);
};

const statusPt = (s) => STATUS_PT[s] || s || "-";
const tipoPt = (t) => COBRANCA_TIPO_PT[t] || t || "-";

function mapCobranca(p) {
  return {
    id: p.id,
    cliente_id: p.customer,
    valor: brl(p.value),
    valor_liquido: brl(p.netValue),
    status: statusPt(p.status),
    status_api: p.status,
    forma: tipoPt(p.billingType),
    vencimento: dataBr(p.dueDate),
    pago_em: dataBr(p.paymentDate),
    descricao: p.description || null,
    parcela: p.installmentNumber || null,
    referencia_externa: p.externalReference || null,
    link_fatura: p.invoiceUrl || null,
    link_boleto: p.bankSlipUrl || null,
    comprovante: p.transactionReceiptUrl || null,
  };
}

function mapCliente(c) {
  return {
    id: c.id,
    nome: c.name,
    email: c.email || null,
    telefone: c.mobilePhone || c.phone || null,
    cpf_cnpj: c.cpfCnpj || null,
    tipo: c.personType === "JURIDICA" ? "PJ" : c.personType === "FISICA" ? "PF" : null,
    empresa: c.company || null,
    cidade: c.cityName || null,
    estado: c.state || null,
    referencia_externa: c.externalReference || null,
    criado_em: dataBr(c.dateCreated),
  };
}

const texto = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });
const erro = (tool, err) => ({ content: [{ type: "text", text: `Erro em ${tool}: ${err.message}` }] });

/** Monta querystring so com os parametros preenchidos. */
function qs(params) {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return partes.length ? `?${partes.join("&")}` : "";
}

// ─── SERVER ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "asaas-mcp",
  version: "1.0.0",
});

// ═══════════════════════════ LEITURA ═════════════════════════════════════════

server.tool(
  "resumo_financeiro",
  "Panorama da conta Asaas: saldo atual, quantidade de cobrancas por status e total de clientes. Use como ponto de partida antes de qualquer analise financeira. ATENCAO na leitura: CONFIRMED = paga mas ainda nao liquidada; RECEIVED = dinheiro ja disponivel na conta.",
  {},
  async () => {
    try {
      const saldo = await asaasRequest("/finance/balance");

      const statusPrincipais = ["PENDING", "CONFIRMED", "RECEIVED", "OVERDUE", "REFUNDED", "RECEIVED_IN_CASH"];
      const contagens = {};
      for (const s of statusPrincipais) {
        const r = await asaasRequest(`/payments?status=${s}&limit=1`);
        contagens[statusPt(s)] = r?.totalCount ?? 0;
      }

      const clientes = await asaasRequest("/customers?limit=1");
      const assinaturas = await asaasRequest("/subscriptions?limit=1");
      const todasCobrancas = await asaasRequest("/payments?limit=1");

      return texto({
        ambiente: AMBIENTE,
        saldo_disponivel: brl(saldo?.balance),
        total_cobrancas: todasCobrancas?.totalCount ?? 0,
        cobrancas_por_status: contagens,
        total_clientes: clientes?.totalCount ?? 0,
        total_assinaturas: assinaturas?.totalCount ?? 0,
      });
    } catch (err) {
      return erro("resumo_financeiro", err);
    }
  }
);

server.tool(
  "listar_cobrancas",
  "Lista cobrancas do Asaas com filtros. Use para responder 'quem pagou', 'o que vence essa semana', 'quanto entrou em julho'. Datas no formato AAAA-MM-DD.",
  {
    status: z
      .enum([
        "PENDING", "RECEIVED", "CONFIRMED", "OVERDUE", "REFUNDED", "RECEIVED_IN_CASH",
        "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE",
        "AWAITING_CHARGEBACK_REVERSAL", "DUNNING_REQUESTED", "DUNNING_RECEIVED", "AWAITING_RISK_ANALYSIS",
      ])
      .optional()
      .describe("Status da cobranca. CONFIRMED = paga aguardando liquidacao; RECEIVED = dinheiro na conta."),
    cliente_id: z.string().optional().describe("ID do cliente no Asaas (campo customer)"),
    forma_pagamento: z.enum(["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"]).optional(),
    vence_de: z.string().optional().describe("Vencimento a partir de (AAAA-MM-DD)"),
    vence_ate: z.string().optional().describe("Vencimento ate (AAAA-MM-DD)"),
    pago_de: z.string().optional().describe("Data de pagamento a partir de (AAAA-MM-DD)"),
    pago_ate: z.string().optional().describe("Data de pagamento ate (AAAA-MM-DD)"),
    criado_de: z.string().optional().describe("Data de criacao a partir de (AAAA-MM-DD)"),
    criado_ate: z.string().optional().describe("Data de criacao ate (AAAA-MM-DD)"),
    referencia_externa: z.string().optional().describe("externalReference — id da cobranca no seu sistema"),
    limit: z.number().optional().default(50).describe("Quantos por pagina (max 100)"),
    offset: z.number().optional().default(0),
    buscar_todos: z.boolean().optional().default(false).describe("Se true, pagina automaticamente ate 2000 registros e ignora limit/offset"),
    com_total: z.boolean().optional().default(true).describe("Inclui a soma dos valores dos resultados"),
  },
  async (a) => {
    try {
      const filtros = {
        status: a.status,
        customer: a.cliente_id,
        billingType: a.forma_pagamento,
        "dueDate[ge]": a.vence_de,
        "dueDate[le]": a.vence_ate,
        "paymentDate[ge]": a.pago_de,
        "paymentDate[le]": a.pago_ate,
        "dateCreated[ge]": a.criado_de,
        "dateCreated[le]": a.criado_ate,
        externalReference: a.referencia_externa,
      };

      let itens, totalCount;
      if (a.buscar_todos) {
        const r = await buscarTodos(`/payments${qs(filtros)}`);
        itens = r.itens;
        totalCount = r.totalCount;
      } else {
        const r = await asaasRequest(`/payments${qs({ ...filtros, limit: Math.min(a.limit, 100), offset: a.offset })}`);
        itens = r?.data || [];
        totalCount = r?.totalCount ?? itens.length;
      }

      const resposta = {
        total_encontrado: totalCount,
        retornados: itens.length,
        cobrancas: itens.map(mapCobranca),
      };

      if (a.com_total) {
        const soma = itens.reduce((s, p) => s + (p.value || 0), 0);
        resposta.soma_dos_retornados = brl(soma);
      }

      return texto(resposta);
    } catch (err) {
      return erro("listar_cobrancas", err);
    }
  }
);

server.tool(
  "obter_cobranca",
  "Detalhe completo de uma cobranca especifica, incluindo link da fatura, link do boleto e comprovante.",
  { id: z.string().describe("ID da cobranca no Asaas (ex: pay_123456)") },
  async ({ id }) => {
    try {
      const p = await asaasRequest(`/payments/${encodeURIComponent(id)}`);
      const detalhe = mapCobranca(p);

      // enriquece com o nome do cliente — o objeto payment so traz o id
      if (p.customer) {
        try {
          const c = await asaasRequest(`/customers/${encodeURIComponent(p.customer)}`);
          detalhe.cliente_nome = c?.name || null;
          detalhe.cliente_email = c?.email || null;
        } catch {
          // cliente removido ou inacessivel: segue sem enriquecer
        }
      }

      detalhe.desconto = p.discount || null;
      detalhe.juros = p.interest || null;
      detalhe.multa = p.fine || null;
      detalhe.estornos = (p.refunds || []).length || 0;

      return texto(detalhe);
    } catch (err) {
      return erro("obter_cobranca", err);
    }
  }
);

server.tool(
  "inadimplentes",
  "Atalho para cobranca de inadimplentes: lista as cobrancas VENCIDAS (OVERDUE) ja com nome, email e telefone do cliente resolvidos, prontos para contato. Ordenado da mais antiga para a mais recente.",
  {
    vencidas_ha_pelo_menos_dias: z.number().optional().default(0).describe("Filtra so quem esta vencido ha N dias ou mais"),
    limit: z.number().optional().default(50),
  },
  async ({ vencidas_ha_pelo_menos_dias, limit }) => {
    try {
      const { itens } = await buscarTodos("/payments?status=OVERDUE", { maxRegistros: 500 });

      const hoje = new Date();
      const comIdade = itens
        .map((p) => {
          const venc = new Date(`${String(p.dueDate).slice(0, 10)}T12:00:00Z`);
          const dias = Math.floor((hoje - venc) / 86400000);
          return { p, dias };
        })
        .filter((x) => x.dias >= vencidas_ha_pelo_menos_dias)
        .sort((a, b) => b.dias - a.dias)
        .slice(0, limit);

      // resolve clientes uma unica vez por id
      const cache = new Map();
      const linhas = [];
      for (const { p, dias } of comIdade) {
        if (p.customer && !cache.has(p.customer)) {
          try {
            cache.set(p.customer, await asaasRequest(`/customers/${encodeURIComponent(p.customer)}`));
          } catch {
            cache.set(p.customer, null);
          }
        }
        const c = cache.get(p.customer);
        linhas.push({
          cobranca_id: p.id,
          cliente: c?.name || "(cliente nao encontrado)",
          email: c?.email || null,
          telefone: c?.mobilePhone || c?.phone || null,
          valor: brl(p.value),
          vencimento: dataBr(p.dueDate),
          dias_em_atraso: dias,
          forma: tipoPt(p.billingType),
          link_fatura: p.invoiceUrl || null,
          descricao: p.description || null,
        });
      }

      const soma = comIdade.reduce((s, x) => s + (x.p.value || 0), 0);
      return texto({
        total_vencidas: comIdade.length,
        valor_total_em_atraso: brl(soma),
        inadimplentes: linhas,
      });
    } catch (err) {
      return erro("inadimplentes", err);
    }
  }
);

server.tool(
  "listar_clientes",
  "Lista ou busca clientes cadastrados no Asaas. Filtre por nome, email, CPF/CNPJ ou referencia externa.",
  {
    nome: z.string().optional().describe("Busca por nome (parcial)"),
    email: z.string().optional(),
    cpf_cnpj: z.string().optional().describe("So digitos ou formatado — o Asaas aceita ambos"),
    referencia_externa: z.string().optional(),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
    buscar_todos: z.boolean().optional().default(false),
  },
  async (a) => {
    try {
      const filtros = {
        name: a.nome,
        email: a.email,
        cpfCnpj: a.cpf_cnpj,
        externalReference: a.referencia_externa,
      };

      let itens, totalCount;
      if (a.buscar_todos) {
        const r = await buscarTodos(`/customers${qs(filtros)}`);
        itens = r.itens;
        totalCount = r.totalCount;
      } else {
        const r = await asaasRequest(`/customers${qs({ ...filtros, limit: Math.min(a.limit, 100), offset: a.offset })}`);
        itens = r?.data || [];
        totalCount = r?.totalCount ?? itens.length;
      }

      return texto({ total_encontrado: totalCount, retornados: itens.length, clientes: itens.map(mapCliente) });
    } catch (err) {
      return erro("listar_clientes", err);
    }
  }
);

server.tool(
  "obter_cliente",
  "Detalhe de um cliente e, opcionalmente, o historico de cobrancas dele (quanto ja pagou, o que esta em aberto).",
  {
    id: z.string().describe("ID do cliente no Asaas (ex: cus_123456)"),
    com_cobrancas: z.boolean().optional().default(true).describe("Inclui o historico de cobrancas do cliente"),
  },
  async ({ id, com_cobrancas }) => {
    try {
      const c = await asaasRequest(`/customers/${encodeURIComponent(id)}`);
      const resultado = { cliente: mapCliente(c) };

      if (com_cobrancas) {
        const { itens } = await buscarTodos(`/payments?customer=${encodeURIComponent(id)}`, { maxRegistros: 300 });
        const pagas = itens.filter((p) => ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status));
        const abertas = itens.filter((p) => ["PENDING", "OVERDUE"].includes(p.status));

        resultado.resumo = {
          total_cobrancas: itens.length,
          pagas: pagas.length,
          valor_pago: brl(pagas.reduce((s, p) => s + (p.value || 0), 0)),
          em_aberto: abertas.length,
          valor_em_aberto: brl(abertas.reduce((s, p) => s + (p.value || 0), 0)),
        };
        resultado.cobrancas = itens.map(mapCobranca);
      }

      return texto(resultado);
    } catch (err) {
      return erro("obter_cliente", err);
    }
  }
);

server.tool(
  "listar_assinaturas",
  "Lista as assinaturas (cobranca recorrente) da conta.",
  {
    cliente_id: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  },
  async (a) => {
    try {
      const r = await asaasRequest(
        `/subscriptions${qs({ customer: a.cliente_id, status: a.status, limit: Math.min(a.limit, 100), offset: a.offset })}`
      );
      const itens = r?.data || [];
      return texto({
        total_encontrado: r?.totalCount ?? itens.length,
        assinaturas: itens.map((s) => ({
          id: s.id,
          cliente_id: s.customer,
          valor: brl(s.value),
          ciclo: CICLO_PT[s.cycle] || s.cycle,
          forma: tipoPt(s.billingType),
          status: s.status,
          proximo_vencimento: dataBr(s.nextDueDate),
          termina_em: dataBr(s.endDate),
          descricao: s.description || null,
        })),
      });
    } catch (err) {
      return erro("listar_assinaturas", err);
    }
  }
);

server.tool(
  "listar_links_pagamento",
  "Lista os links de pagamento da conta (pagina de checkout reutilizavel, util para vender sem gerar cobranca individual).",
  { limit: z.number().optional().default(50), offset: z.number().optional().default(0) },
  async ({ limit, offset }) => {
    try {
      const r = await asaasRequest(`/paymentLinks${qs({ limit: Math.min(limit, 100), offset })}`);
      const itens = r?.data || [];
      return texto({
        total_encontrado: r?.totalCount ?? itens.length,
        links: itens.map((l) => ({
          id: l.id,
          nome: l.name,
          url: l.url,
          valor: l.value ? brl(l.value) : "(valor livre)",
          ativo: l.active,
          tipo_cobranca: l.chargeType,
          forma: tipoPt(l.billingType),
          ciclo: l.subscriptionCycle ? CICLO_PT[l.subscriptionCycle] || l.subscriptionCycle : null,
          visualizacoes: l.viewCount,
          max_parcelas: l.maxInstallmentCount || null,
        })),
      });
    } catch (err) {
      return erro("listar_links_pagamento", err);
    }
  }
);

server.tool(
  "obter_qrcode_pix",
  "Retorna o QR Code Pix (copia e cola + imagem em base64) de uma cobranca ja existente. Use para mandar o Pix pro cliente no WhatsApp.",
  {
    cobranca_id: z.string().describe("ID da cobranca (ex: pay_123456)"),
    incluir_imagem: z.boolean().optional().default(false).describe("Se true, devolve tambem a imagem base64 (payload grande)"),
  },
  async ({ cobranca_id, incluir_imagem }) => {
    try {
      const r = await asaasRequest(`/payments/${encodeURIComponent(cobranca_id)}/pixQrCode`);
      return texto({
        copia_e_cola: r?.payload || null,
        expira_em: r?.expirationDate || null,
        sucesso: r?.success ?? null,
        ...(incluir_imagem ? { imagem_base64: r?.encodedImage || null } : {}),
      });
    } catch (err) {
      return erro("obter_qrcode_pix", err);
    }
  }
);

// ═══════════════════════════ ESCRITA (com gate) ══════════════════════════════
//
// Toda tool abaixo exige `confirmado: true`. Sem isso, devolve o preview do payload
// e nao toca em nada. Motivo: conta de PRODUCAO, dinheiro real, e webhook que pode
// propagar a escrita para outro sistema (ver guardrails.js).

server.tool(
  "criar_cliente",
  "Cadastra um novo cliente no Asaas. Obrigatorios: nome e CPF/CNPJ. Chame primeiro sem confirmado para ver o preview.",
  {
    nome: z.string().describe("Nome completo ou razao social"),
    cpf_cnpj: z.string().describe("CPF ou CNPJ (obrigatorio pelo Asaas)"),
    email: z.string().optional(),
    telefone: z.string().optional().describe("Celular com DDD"),
    referencia_externa: z.string().optional().describe("externalReference — id no seu sistema. Recomendado para conciliacao."),
    observacoes: z.string().optional(),
    notificacoes_desativadas: z.boolean().optional().describe("true = o Asaas NAO envia email/SMS proprio ao cliente"),
    confirmado: z.boolean().optional().default(false).describe("Precisa ser true para executar de verdade"),
  },
  async (a) => {
    try {
      const payload = {
        name: a.nome,
        cpfCnpj: a.cpf_cnpj,
        ...(a.email ? { email: a.email } : {}),
        ...(a.telefone ? { mobilePhone: a.telefone } : {}),
        ...(a.referencia_externa ? { externalReference: a.referencia_externa } : {}),
        ...(a.observacoes ? { observations: a.observacoes } : {}),
        ...(a.notificacoes_desativadas !== undefined ? { notificationDisabled: a.notificacoes_desativadas } : {}),
      };

      checkWriteGate(a.confirmado, {
        acao: `Criar cliente "${a.nome}"`,
        payload,
        destaques: [`CPF/CNPJ: ${a.cpf_cnpj}`],
      });

      const c = await asaasRequest("/customers", { method: "POST", body: JSON.stringify(payload) });
      return texto({ criado: true, cliente: mapCliente(c) });
    } catch (err) {
      return erro("criar_cliente", err);
    }
  }
);

server.tool(
  "criar_cobranca",
  "Cria uma cobranca avulsa no Asaas. Obrigatorios: cliente_id, forma_pagamento, valor, vencimento. Chame primeiro sem confirmado para ver o preview do que sera enviado.",
  {
    cliente_id: z.string().describe("ID do cliente no Asaas (use listar_clientes para achar)"),
    forma_pagamento: z
      .enum(["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"])
      .describe("UNDEFINED deixa o cliente escolher na fatura — costuma converter melhor"),
    valor: z.number().describe("Valor em reais (ex: 1500.00)"),
    vencimento: z.string().describe("Data de vencimento no formato AAAA-MM-DD"),
    descricao: z.string().optional().describe("Aparece na fatura para o cliente"),
    referencia_externa: z.string().optional().describe("externalReference — recomendado para conciliar depois"),
    parcelas: z.number().optional().describe("Numero de parcelas (gera parcelamento)"),
    valor_da_parcela: z.number().optional().describe("Valor de CADA parcela. Use no lugar de valor quando parcelar."),
    confirmado: z.boolean().optional().default(false).describe("Precisa ser true para executar de verdade"),
    confirmado_valor_alto: z.boolean().optional().default(false).describe("Confirmacao extra para valores acima de R$ 20.000"),
  },
  async (a) => {
    try {
      checkValorSuspeito(a.valor, a.confirmado_valor_alto);

      const payload = {
        customer: a.cliente_id,
        billingType: a.forma_pagamento,
        value: a.valor,
        dueDate: a.vencimento,
        ...(a.descricao ? { description: a.descricao } : {}),
        ...(a.referencia_externa ? { externalReference: a.referencia_externa } : {}),
        ...(a.parcelas ? { installmentCount: a.parcelas } : {}),
        ...(a.valor_da_parcela ? { installmentValue: a.valor_da_parcela } : {}),
      };

      // resolve o nome do cliente pro preview nao ser so um id opaco
      let nomeCliente = a.cliente_id;
      try {
        const c = await asaasRequest(`/customers/${encodeURIComponent(a.cliente_id)}`);
        if (c?.name) nomeCliente = `${c.name} (${a.cliente_id})`;
      } catch {
        // segue com o id cru
      }

      checkWriteGate(a.confirmado, {
        acao: `Criar cobranca de ${brl(a.valor)}`,
        payload,
        destaques: [
          `Cliente: ${nomeCliente}`,
          `Forma: ${tipoPt(a.forma_pagamento)}`,
          `Vencimento: ${dataBr(a.vencimento)}`,
          ...(a.parcelas ? [`Parcelas: ${a.parcelas}x`] : []),
        ],
      });

      const p = await asaasRequest("/payments", { method: "POST", body: JSON.stringify(payload) });
      return texto({
        criada: true,
        cobranca: mapCobranca(p),
        aviso: AVISO_WEBHOOK,
      });
    } catch (err) {
      return erro("criar_cobranca", err);
    }
  }
);

server.tool(
  "atualizar_cobranca",
  "Atualiza uma cobranca existente (valor, vencimento, descricao, forma de pagamento). So funciona em cobranca ainda nao paga.",
  {
    id: z.string().describe("ID da cobranca"),
    valor: z.number().optional(),
    vencimento: z.string().optional().describe("AAAA-MM-DD"),
    descricao: z.string().optional(),
    forma_pagamento: z.enum(["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"]).optional(),
    referencia_externa: z.string().optional(),
    confirmado: z.boolean().optional().default(false),
    confirmado_valor_alto: z.boolean().optional().default(false),
  },
  async (a) => {
    try {
      if (a.valor !== undefined) checkValorSuspeito(a.valor, a.confirmado_valor_alto);

      const payload = {
        ...(a.valor !== undefined ? { value: a.valor } : {}),
        ...(a.vencimento ? { dueDate: a.vencimento } : {}),
        ...(a.descricao !== undefined ? { description: a.descricao } : {}),
        ...(a.forma_pagamento ? { billingType: a.forma_pagamento } : {}),
        ...(a.referencia_externa !== undefined ? { externalReference: a.referencia_externa } : {}),
      };

      if (Object.keys(payload).length === 0) {
        throw new Error("Nada para atualizar: informe ao menos um campo.");
      }

      // mostra o estado ATUAL no preview, pra comparacao antes/depois
      const atual = await asaasRequest(`/payments/${encodeURIComponent(a.id)}`);
      checkWriteGate(a.confirmado, {
        acao: `Atualizar cobranca ${a.id}`,
        payload,
        destaques: [
          `Estado atual: ${brl(atual.value)} | venc ${dataBr(atual.dueDate)} | ${statusPt(atual.status)}`,
        ],
      });

      const p = await asaasRequest(`/payments/${encodeURIComponent(a.id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return texto({ atualizada: true, cobranca: mapCobranca(p) });
    } catch (err) {
      return erro("atualizar_cobranca", err);
    }
  }
);

server.tool(
  "cancelar_cobranca",
  "Cancela (exclui) uma cobranca no Asaas. Use para cobranca gerada por engano ou negociacao desfeita. NAO e estorno — estorno de dinheiro ja pago esta bloqueado neste MCP e precisa ser feito no painel.",
  {
    id: z.string().describe("ID da cobranca"),
    confirmado: z.boolean().optional().default(false),
  },
  async ({ id, confirmado }) => {
    try {
      const atual = await asaasRequest(`/payments/${encodeURIComponent(id)}`);

      if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(atual.status)) {
        throw new Error(
          `BLOQUEADO: esta cobranca esta como ${statusPt(atual.status)} — ou seja, ja foi paga. ` +
            `Cancelar cobranca paga seria estorno, e estorno esta fora do escopo deste MCP. Faca pelo painel do Asaas.`
        );
      }

      checkWriteGate(confirmado, {
        acao: `CANCELAR cobranca ${id}`,
        payload: { metodo: "DELETE", endpoint: `/payments/${id}` },
        destaques: [
          `Cobranca: ${brl(atual.value)} | venc ${dataBr(atual.dueDate)} | ${statusPt(atual.status)}`,
          `Descricao: ${atual.description || "(sem descricao)"}`,
        ],
      });

      const r = await asaasRequest(`/payments/${encodeURIComponent(id)}`, { method: "DELETE" });
      return texto({ cancelada: r?.deleted ?? true, id: r?.id || id });
    } catch (err) {
      return erro("cancelar_cobranca", err);
    }
  }
);

server.tool(
  "criar_assinatura",
  "Cria uma assinatura (cobranca recorrente) no Asaas. Obrigatorios: cliente_id, forma_pagamento, valor, proximo_vencimento e ciclo.",
  {
    cliente_id: z.string(),
    forma_pagamento: z.enum(["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"]),
    valor: z.number().describe("Valor de cada cobranca da recorrencia"),
    proximo_vencimento: z.string().describe("Data da primeira cobranca (AAAA-MM-DD)"),
    ciclo: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"]),
    descricao: z.string().optional(),
    termina_em: z.string().optional().describe("Data final da assinatura (AAAA-MM-DD)"),
    referencia_externa: z.string().optional(),
    confirmado: z.boolean().optional().default(false),
    confirmado_valor_alto: z.boolean().optional().default(false),
  },
  async (a) => {
    try {
      checkValorSuspeito(a.valor, a.confirmado_valor_alto);

      const payload = {
        customer: a.cliente_id,
        billingType: a.forma_pagamento,
        value: a.valor,
        nextDueDate: a.proximo_vencimento,
        cycle: a.ciclo,
        ...(a.descricao ? { description: a.descricao } : {}),
        ...(a.termina_em ? { endDate: a.termina_em } : {}),
        ...(a.referencia_externa ? { externalReference: a.referencia_externa } : {}),
      };

      checkWriteGate(a.confirmado, {
        acao: `Criar assinatura ${CICLO_PT[a.ciclo] || a.ciclo} de ${brl(a.valor)}`,
        payload,
        destaques: [
          `Cliente: ${a.cliente_id}`,
          `Primeira cobranca: ${dataBr(a.proximo_vencimento)}`,
          `RECORRENTE: vai gerar cobranca ${(CICLO_PT[a.ciclo] || a.ciclo).toLowerCase()} ate ser cancelada.`,
        ],
      });

      const s = await asaasRequest("/subscriptions", { method: "POST", body: JSON.stringify(payload) });
      return texto({ criada: true, assinatura_id: s?.id, proximo_vencimento: dataBr(s?.nextDueDate), aviso: AVISO_WEBHOOK });
    } catch (err) {
      return erro("criar_assinatura", err);
    }
  }
);

server.tool(
  "cancelar_assinatura",
  "Cancela uma assinatura (para a recorrencia). Cobrancas ja geradas e nao pagas continuam existindo — cancele uma a uma se precisar.",
  {
    id: z.string().describe("ID da assinatura"),
    confirmado: z.boolean().optional().default(false),
  },
  async ({ id, confirmado }) => {
    try {
      const atual = await asaasRequest(`/subscriptions/${encodeURIComponent(id)}`);

      checkWriteGate(confirmado, {
        acao: `CANCELAR assinatura ${id}`,
        payload: { metodo: "DELETE", endpoint: `/subscriptions/${id}` },
        destaques: [
          `Assinatura: ${brl(atual.value)} ${CICLO_PT[atual.cycle] || atual.cycle} | proximo venc ${dataBr(atual.nextDueDate)}`,
          `Cobrancas ja geradas NAO sao canceladas junto.`,
        ],
      });

      const r = await asaasRequest(`/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
      return texto({ cancelada: r?.deleted ?? true, id: r?.id || id });
    } catch (err) {
      return erro("cancelar_assinatura", err);
    }
  }
);

// ─── START ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

// Cleanup: encerra o processo quando o stdin do pai (Claude Code/Desktop) fechar.
// Sem isso, em Windows o processo node fica zumbi apos restart do host.
process.stdin.on("end", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));
