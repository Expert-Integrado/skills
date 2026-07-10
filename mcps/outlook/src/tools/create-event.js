/**
 * create-event.js — Ferramenta MCP para criar compromissos no Calendário
 */

import { z } from "zod";
import { graphRequest } from "../graph.js";
import { validateNotRecurring, checkRateLimit, registerAction } from "../guardrails.js";

export const createEventSchema = z.object({
  titulo: z.string().describe("Título do compromisso"),
  inicio: z
    .string()
    .describe(
      "Data e hora de início no formato ISO 8601. Ex: 2026-03-10T14:00:00"
    ),
  fim: z
    .string()
    .describe(
      "Data e hora de término no formato ISO 8601. Ex: 2026-03-10T15:00:00"
    ),
  descricao: z
    .string()
    .optional()
    .describe("Descrição ou pauta do compromisso"),
  local: z.string().optional().describe("Local do compromisso ou link da reunião"),
  convidados: z
    .string()
    .optional()
    .describe(
      "E-mails dos convidados separados por vírgula. Informe os e-mails ou deixe vazio se não houver convidados."
    ),
  dia_inteiro: z
    .boolean()
    .optional()
    .default(false)
    .describe("Se true, cria como evento de dia inteiro (ignora hora de início/fim)"),
  fuso_horario: z
    .string()
    .optional()
    .default("America/Sao_Paulo")
    .describe("Fuso horário do evento. Padrão: America/Sao_Paulo"),
  confirmacao: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Obrigatório true ao criar o 11º compromisso da hora (ou múltiplos de 10)."
    ),
  mostrar_como: z
    .enum(["free", "busy", "tentative", "oof", "workingElsewhere"])
    .optional()
    .describe("Status de disponibilidade: free (disponível), busy (ocupado), tentative (provisório), oof (ausente), workingElsewhere (trabalhando em outro local). Padrão do Outlook: busy."),
});

export async function createEvent(params) {
  const { titulo, inicio, fim, descricao, local, convidados, dia_inteiro, fuso_horario, confirmacao, mostrar_como } = params;

  // 1. Garante que não há campos de recorrência no payload
  validateNotRecurring(params);

  // Validar que fim > inicio (apenas para eventos com hora)
  if (!dia_inteiro && inicio && fim) {
    if (new Date(fim) <= new Date(inicio)) {
      throw new Error(`Horário de término (${fim}) deve ser após o início (${inicio}).`);
    }
  }

  // 2. Verifica rate limit
  await checkRateLimit("event", confirmacao);

  const attendees = convidados
    ? convidados.split(",").map((email) => ({
        emailAddress: { address: email.trim() },
        type: "required",
      }))
    : [];

  // Eventos de dia inteiro no Graph: start/end são SEMPRE dateTimeTimeZone
  // ({ dateTime, timeZone }) — a propriedade `date` não existe no schema e
  // causava 400 UnableToDeserializePostBody (bug reproduzido 2x em 10/07/2026).
  // O Graph exige midnight-to-midnight com end EXCLUSIVO (dia seguinte) e
  // timezone consistente entre start e end.
  let startField;
  let endField;
  if (dia_inteiro) {
    const startYmd = inicio.split("T")[0];
    let endYmd = (fim || inicio).split("T")[0];
    if (endYmd < startYmd) endYmd = startYmd;
    // end exclusivo: último dia do evento + 1 (evento de 1 dia: 10/07 -> end 11/07T00:00)
    const [y, m, d] = endYmd.split("-").map(Number);
    const endExclusive = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split("T")[0];
    startField = { dateTime: `${startYmd}T00:00:00`, timeZone: fuso_horario };
    endField = { dateTime: `${endExclusive}T00:00:00`, timeZone: fuso_horario };
  } else {
    startField = { dateTime: inicio, timeZone: fuso_horario };
    endField = { dateTime: fim, timeZone: fuso_horario };
  }

  const event = {
    subject: titulo,
    isAllDay: dia_inteiro,
    start: startField,
    end: endField,
    ...(descricao && {
      body: {
        contentType: "Text",
        content: descricao,
      },
    }),
    ...(local && {
      location: {
        displayName: local,
      },
    }),
    ...(attendees.length > 0 && { attendees }),
    ...(mostrar_como && { showAs: mostrar_como }),
  };

  const result = await graphRequest("POST", "/me/events", event);

  // 3. Registra ação após sucesso
  await registerAction("event");

  const link = result.webLink || "";
  const convidadosStr =
    attendees.length > 0
      ? ` | Convidados: ${attendees.map((a) => a.emailAddress.address).join(", ")}`
      : "";

  // O Graph retorna start.dateTime também em evento de dia inteiro (midnight);
  // exibe só a data no caso all-day (end é exclusivo — mostra o último dia real).
  let periodoStr;
  if (dia_inteiro) {
    const iniYmd = (result.start?.dateTime || inicio).split("T")[0];
    const endExclYmd = (result.end?.dateTime || fim || inicio).split("T")[0];
    const [y, m, d] = endExclYmd.split("-").map(Number);
    const ultimoDia = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
    periodoStr = ultimoDia > iniYmd
      ? `${iniYmd} a ${ultimoDia} (dia inteiro)`
      : `${iniYmd} (dia inteiro)`;
  } else {
    const iniExib = (result.start.dateTime || inicio).replace("T", " ").substring(0, 16);
    const fimExib = (result.end.dateTime || fim).replace("T", " ").substring(0, 16);
    periodoStr = `${iniExib} até ${fimExib} (${fuso_horario})`;
  }

  return `Compromisso criado com sucesso!\n- Título: ${result.subject}\n- Período: ${periodoStr}${convidadosStr}\n- Link: ${link}`;
}
