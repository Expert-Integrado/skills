/**
 * send-email.js — Ferramenta MCP para envio de e-mail via Outlook
 */

import { z } from "zod";
import { graphRequest } from "../graph.js";
import { validateRecipients, checkRateLimit, registerAction } from "../guardrails.js";
import { buildAttachment } from "../attachments.js";

export const sendEmailSchema = z.object({
  para: z
    .string()
    .describe(
      "E-mail do destinatário. Para múltiplos, separe por vírgula. O total de para + CC + CCO não pode ultrapassar 5."
    ),
  assunto: z.string().describe("Assunto do e-mail"),
  corpo: z.string().describe("Corpo do e-mail em texto simples ou HTML"),
  cc: z
    .string()
    .optional()
    .describe("E-mails em cópia (CC). Separe por vírgula se mais de um."),
  cco: z
    .string()
    .optional()
    .describe("E-mails em cópia oculta (CCO / BCC). Separe por vírgula se mais de um."),
  html: z
    .boolean()
    .optional()
    .default(false)
    .describe("Se true, o corpo será enviado como HTML. Padrão: false (texto simples)"),
  anexos: z
    .array(z.string())
    .optional()
    .describe(
      "Lista de caminhos absolutos de arquivos para anexar. Cada anexo até 3 MB. Ex: ['/workspace/temp/contrato.pdf']."
    ),
  confirmacao: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Obrigatório true ao enviar o 11º e-mail da hora (ou múltiplos de 10). Confirma que você está ciente do volume."
    ),
});

export async function sendEmail(params) {
  const { para, assunto, corpo, cc, cco, html, anexos, confirmacao } = params;

  // 1. Valida total de destinatários (para + cc + cco ≤ 5)
  validateRecipients({ para, cc, cco });

  // 2. Verifica rate limit
  await checkRateLimit("email", confirmacao);

  const toRecipients = para.split(",").map((email) => ({
    emailAddress: { address: email.trim() },
  }));

  const ccRecipients = cc
    ? cc.split(",").map((email) => ({
        emailAddress: { address: email.trim() },
      }))
    : [];

  const bccRecipients = cco
    ? cco.split(",").map((email) => ({
        emailAddress: { address: email.trim() },
      }))
    : [];

  // 3. Prepara anexos (se houver)
  const attachments = [];
  if (Array.isArray(anexos) && anexos.length > 0) {
    for (const caminho of anexos) {
      attachments.push(await buildAttachment(caminho));
    }
  }

  const message = {
    subject: assunto,
    body: {
      contentType: html ? "HTML" : "Text",
      content: corpo,
    },
    toRecipients,
    ...(ccRecipients.length > 0 && { ccRecipients }),
    ...(bccRecipients.length > 0 && { bccRecipients }),
    ...(attachments.length > 0 && { attachments }),
  };

  await graphRequest("POST", "/me/sendMail", { message });

  // 4. Registra ação após sucesso
  await registerAction("email");

  const destinatarios = toRecipients.map((r) => r.emailAddress.address).join(", ");
  const anexoMsg = attachments.length > 0 ? ` com ${attachments.length} anexo(s)` : "";
  return `E-mail enviado com sucesso${anexoMsg} para: ${destinatarios}`;
}
