/**
 * forward-email.js — Ferramenta MCP para encaminhar e-mail via Outlook
 */

import { z } from "zod";
import { graphRequest } from "../graph.js";

export const forwardEmailSchema = z.object({
  email_id: z
    .string()
    .describe("ID do e-mail a encaminhar (retornado por ler_emails)"),
  destinatarios: z
    .union([z.string(), z.array(z.string())])
    .describe("E-mail(s) de destino. Pode ser uma string com um endereço, múltiplos separados por vírgula, ou um array de endereços"),
  comentario: z
    .string()
    .optional()
    .describe("Texto a adicionar acima do conteúdo encaminhado (opcional)"),
});

export async function forwardEmail(params) {
  const { email_id, destinatarios, comentario } = params;

  // Normaliza destinatários: string → array, separa por vírgula se necessário
  let listaDestinatarios;
  if (Array.isArray(destinatarios)) {
    listaDestinatarios = destinatarios.map((e) => e.trim()).filter(Boolean);
  } else {
    listaDestinatarios = destinatarios.split(",").map((e) => e.trim()).filter(Boolean);
  }

  if (listaDestinatarios.length === 0) {
    throw new Error("Nenhum destinatário válido informado.");
  }

  const toRecipients = listaDestinatarios.map((address) => ({
    emailAddress: { address },
  }));

  const body = {
    toRecipients,
    ...(comentario ? { comment: comentario } : {}),
  };

  await graphRequest("POST", `/me/messages/${email_id}/forward`, body);

  const destStr = listaDestinatarios.join(", ");
  return `E-mail encaminhado com sucesso para: ${destStr}`;
}
