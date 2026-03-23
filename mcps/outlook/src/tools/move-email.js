/**
 * move-email.js — Ferramenta MCP para mover e-mail para outra pasta no Outlook
 */

import { z } from "zod";
import { graphRequest, graphRequestPaginated } from "../graph.js";

export const moveEmailSchema = z.object({
  email_id: z
    .string()
    .describe("ID do e-mail a mover (retornado por ler_emails)"),
  pasta_destino: z
    .string()
    .describe("Nome da pasta de destino. Ex: 'Processados', 'Leads', 'Arquivo'. A pasta será criada automaticamente se não existir."),
});

export async function moveEmail(params) {
  const { email_id, pasta_destino } = params;

  // 1. Busca a pasta pelo nome
  const filtro = encodeURIComponent(`displayName eq '${pasta_destino}'`);
  const resultado = await graphRequestPaginated(
    `/me/mailFolders?$filter=${filtro}&$select=id,displayName`,
    10
  );

  let folderId;
  let pastaCriada = false;

  if (resultado?.value?.length > 0) {
    folderId = resultado.value[0].id;
  } else {
    // 2. Pasta não encontrada — criar
    const novaPasta = await graphRequest("POST", "/me/mailFolders", {
      displayName: pasta_destino,
    });
    folderId = novaPasta.id;
    pastaCriada = true;
  }

  // 3. Mover o e-mail para a pasta
  await graphRequest("POST", `/me/messages/${email_id}/move`, {
    destinationId: folderId,
  });

  const sufixo = pastaCriada ? " (pasta criada automaticamente)" : "";
  return `E-mail movido com sucesso para a pasta "${pasta_destino}"${sufixo}.`;
}
