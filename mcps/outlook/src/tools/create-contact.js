/**
 * create-contact.js — Ferramenta MCP para criar contato no Outlook
 */

import { z } from "zod";
import { graphRequest } from "../graph.js";

export const createContactSchema = z.object({
  nome: z
    .string()
    .describe("Nome completo do contato"),
  email: z
    .string()
    .optional()
    .describe("Endereço de e-mail do contato"),
  telefone: z
    .string()
    .optional()
    .describe("Número de telefone comercial do contato"),
  empresa: z
    .string()
    .optional()
    .describe("Nome da empresa do contato"),
  cargo: z
    .string()
    .optional()
    .describe("Cargo ou função do contato"),
});

export async function createContact(params) {
  const { nome, email, telefone, empresa, cargo } = params;

  const body = {
    givenName: nome,
    ...(email
      ? { emailAddresses: [{ address: email, name: nome }] }
      : {}),
    ...(telefone
      ? { businessPhones: [telefone] }
      : {}),
    ...(empresa ? { companyName: empresa } : {}),
    ...(cargo ? { jobTitle: cargo } : {}),
  };

  const contato = await graphRequest("POST", "/me/contacts", body);

  const partes = [`Contato criado com sucesso: ${nome}`];
  if (email) partes.push(`E-mail: ${email}`);
  if (telefone) partes.push(`Telefone: ${telefone}`);
  if (empresa) partes.push(`Empresa: ${empresa}`);
  if (cargo) partes.push(`Cargo: ${cargo}`);
  if (contato?.id) partes.push(`ID: ${contato.id}`);

  return partes.join("\n");
}
