/**
 * guardrails.js — Protecoes do asaas-mcp
 *
 * A conta Asaas ligada a este MCP e de PRODUCAO, com dinheiro real, e pode ter um
 * webhook ATIVO entregando eventos em outro sistema interno (foi o caso na conta de origem).
 *
 * Consequencia que nao e obvia: QUALQUER escrita aqui (criar/atualizar/cancelar cobranca)
 * dispara evento nesse webhook, que costuma alimentar CRM/pipeline do outro lado.
 * Quando existe webhook configurado, NAO existe "cobranca de teste inofensiva" na conta.
 * Confira com listar_webhooks no painel do Asaas antes de assumir que o ambiente e isolado.
 *
 * Tres camadas:
 * 1) ROTAS_BLOQUEADAS — endpoints que o MCP nunca chama, mesmo se alguem pedir.
 * 2) checkWriteGate — toda tool de escrita exige `confirmado: true`; sem isso devolve
 *    PREVIEW do payload exato e nao toca em nada.
 * 3) checkValorSuspeito — valor fora da faixa historica da conta pede confirmacao reforcada.
 */

// ─── Camada 1: rotas que este MCP nunca chama ────────────────────────────────
//
// Dinheiro saindo e mutacao de infraestrutura ficam FORA do escopo v1 (decisao do Eric, 06/08/2026).
// O bloqueio e por PADRAO de path + metodo, avaliado dentro do asaasRequest — nao da pra
// contornar passando path manualmente.

const ROTAS_BLOQUEADAS = [
  {
    teste: (path, method) => /\/refunds?(\b|\/|\?|$)/i.test(path) || (/\/payments\/[^/]+\/refund/i.test(path)),
    motivo: "ESTORNO esta fora do escopo v1. Estorno devolve dinheiro real e e irreversivel — faca pelo painel do Asaas.",
  },
  {
    teste: (path) => /\/transfers?(\b|\/|\?|$)/i.test(path),
    motivo: "TRANSFERENCIA esta fora do escopo v1. Movimentar saldo para fora da conta so pelo painel do Asaas.",
  },
  {
    teste: (path) => /\/anticipations?(\b|\/|\?|$)/i.test(path),
    motivo: "ANTECIPACAO esta fora do escopo v1 (tem custo financeiro). Faca pelo painel do Asaas.",
  },
  {
    teste: (path, method) => /\/webhooks?(\b|\/|\?|$)/i.test(path) && method !== "GET",
    motivo:
      "MUTACAO DE WEBHOOK bloqueada. Webhook do Asaas costuma ser a espinha de integracoes ja em producao — " +
      "alterar ou remover derruba a integracao do outro lado em silencio. Leitura (GET) continua liberada.",
  },
  {
    teste: (path, method) => /\/myAccount/i.test(path) && method !== "GET",
    motivo: "Alterar dados cadastrais da conta esta fora do escopo deste MCP.",
  },
  {
    teste: (path, method) => /\/pix\/addressKeys/i.test(path) && method !== "GET",
    motivo: "Criar ou remover chave Pix da conta esta fora do escopo deste MCP.",
  },
];

export function checkRotaBloqueada(path, method = "GET") {
  const m = String(method).toUpperCase();
  for (const regra of ROTAS_BLOQUEADAS) {
    if (regra.teste(path, m)) {
      throw new Error(`BLOQUEADO PELO GUARDRAIL: ${regra.motivo}`);
    }
  }
}

// ─── Camada 2: gate de escrita ───────────────────────────────────────────────

const AVISO_WEBHOOK =
  "Se a conta tiver webhook ativo, esta escrita VAI gerar evento no sistema do outro lado " +
  "(tipicamente alimentando CRM/pipeline). Nesse caso nao existe escrita de teste isolada.";

/**
 * Bloqueia a escrita ate o Eric confirmar, devolvendo o preview do que seria enviado.
 *
 * @param {boolean} confirmado - so `true` libera
 * @param {object} opts
 * @param {string} opts.acao - descricao curta ("Criar cobranca", "Cancelar cobranca")
 * @param {object} opts.payload - o corpo exato que iria pra API
 * @param {string[]} [opts.destaques] - linhas extras pro preview (ex: nome do cliente resolvido)
 * @throws {Error} com o preview formatado quando nao confirmado
 */
export function checkWriteGate(confirmado, { acao, payload, destaques = [] }) {
  if (confirmado === true) return;

  const linhas = [
    `ESCRITA BLOQUEADA ATE CONFIRMACAO — nada foi alterado no Asaas.`,
    ``,
    `Acao: ${acao}`,
  ];

  if (destaques.length) {
    linhas.push(``);
    for (const d of destaques) linhas.push(`  ${d}`);
  }

  linhas.push(``, `Payload que seria enviado:`, JSON.stringify(payload, null, 2));
  linhas.push(``, `ATENCAO: ${AVISO_WEBHOOK}`);
  linhas.push(``, `Para executar de verdade, chame de novo com confirmado: true.`);

  throw new Error(linhas.join("\n"));
}

// ─── Camada 3: valor fora da faixa ───────────────────────────────────────────

// Teto de sanidade: valor muito acima da faixa usual de uma cobranca e provavel erro de
// digitacao (ou de transcricao de audio) — pede confirmacao reforcada. Ajuste conforme a conta.
const VALOR_ALERTA = Number(process.env.ASAAS_VALOR_ALERTA) || 20000;

export function checkValorSuspeito(valor, confirmado_valor_alto) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error("Valor invalido: informe um numero em reais (ex: 1500.00).");
  }
  if (valor <= 0) {
    throw new Error("Valor invalido: precisa ser maior que zero.");
  }
  if (valor > VALOR_ALERTA && confirmado_valor_alto !== true) {
    throw new Error(
      `VALOR ALTO BLOQUEADO: R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ` +
        `esta acima da faixa usual desta conta (alerta em R$ ${VALOR_ALERTA.toLocaleString("pt-BR")}). ` +
        `Confira se o valor esta certo — se estiver, repita com confirmado_valor_alto: true.`
    );
  }
}

export { AVISO_WEBHOOK, VALOR_ALERTA };
