/**
 * attachments.js — helpers compartilhados para anexos via Microsoft Graph.
 *
 * Graph aceita anexos inline em base64 (fileAttachment) até ~3 MB.
 * Acima disso seria preciso usar upload session (não suportado aqui).
 */

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const MIME_BY_EXT = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
};

export function guessMime(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function buildAttachment(caminho) {
  const info = await stat(caminho);
  if (!info.isFile()) {
    throw new Error(`Anexo não é um arquivo: ${caminho}`);
  }
  if (info.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Anexo "${basename(caminho)}" tem ${(info.size / 1024 / 1024).toFixed(2)} MB. Limite via API inline é 3 MB.`
    );
  }
  const buf = await readFile(caminho);
  return {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: basename(caminho),
    contentType: guessMime(caminho),
    contentBytes: buf.toString("base64"),
  };
}
