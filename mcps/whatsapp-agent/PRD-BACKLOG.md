# PRD — Backlog WhatsApp Agent MCP

Documento vivo com as pendências de evolução do MCP `whatsapp-agent`.
Atualizado em 07/05/2026 após levantamento do Eric.

## Status atual

O MCP cobre o core (read, send, search, react, transcrever áudio) mas tem 7 lacunas que viraram fricção operacional pós-evento Imersão 05/05.

## Pendências

### 1. Acesso pleno ao Supabase pelo MCP

**Problema:** existe um bloqueio onde o MCP não tem acesso total ao Supabase (Eric mencionou mas não recordou o detalhe exato).

**Hipóteses:**
- Service role vs anon key sendo usada de forma errada
- RLS policy bloqueando leitura/escrita em `messages` ou `chats`
- Storage bucket sem permissão pra MCP escrever

**Definition of done:** MCP consegue ler/escrever em todas as tabelas relevantes (`messages`, `chats`, `chat_categories`, `zapi_instance`) e no Storage sem erro de permissão.

---

### 2. Bug `react` (Z-API 404 "Instance not found")

**Problema:** ao chamar a tool `react` o Z-API retorna 404. Causa identificada: env vars do container do MCP estão desatualizadas, mas a Edge Function `messages-receive` já tem creds novas.

**Definition of done:** sincronizar env do container `whatsapp-agent-mcp` com as creds atuais de `zapi_instance` no Supabase (token rotaciona — sempre puxar de lá antes de chamada ad-hoc). Reagir num grupo de teste sem erro.

---

### 3. Mention de pessoas (`@todos` / `@user`)

**Problema:** tool `send` não suporta marcar pessoas em grupos. Eric quer poder mencionar `@all` ou `@user` específico.

**Definition of done:**
- Verificar se Z-API expõe esse parâmetro no endpoint de envio
- Adicionar parâmetro `mentions` (array de phone numbers ou `@all`) na tool `send`
- Renderizar a mention no payload conforme spec do Z-API

---

### 4. Salvar mídia no Storage permanente

**Problema:** documentos, imagens e vídeos recebidos só ficam referenciados via `messages.raw_payload.document.documentUrl` (URL temporária Backblaze CDN da Z-API). Quando o link expira, perdemos o conteúdo.

**Definition of done:**
- Webhook `messages-receive` (ou função análoga) baixa o arquivo no recebimento
- Copia pro Supabase Storage (bucket `whatsapp-attachments` ou similar)
- Salva URL pública estável em novo campo `messages.attachment_url` ou no próprio `raw_payload`
- Vale pra todos os tipos de mídia (image, video, document, audio)

---

### 5. Tool `download_attachment` / `read_document`

**Problema:** MCP não tem tool dedicada pra agente acessar arquivo. Quem não consultar o banco direto fica cego pro conteúdo.

**Definition of done:**
- Tool nova `download_attachment` que recebe `message_id` e devolve path local ou URL pública
- Para PDF/Office, opcionalmente popular `extracted_text` via OCR/parser (mirror do flow Whisper de áudio)

---

### 6. Editar mensagem enviada (`edit_message`)

**Problema:** não dá pra editar mensagem já enviada via MCP.

**Definition of done:**
- Tool `edit_message` que recebe `message_id` + novo `content`
- Mapear endpoint Z-API correspondente
- Atualizar registro no Supabase (`messages.content` + flag `edited_at`)

---

### 7. Excluir mensagem enviada (`delete_message`)

**Problema:** não dá pra deletar mensagem já enviada via MCP.

**Definition of done:**
- Tool `delete_message` que recebe `message_id`
- Mapear endpoint Z-API correspondente
- Atualizar registro no Supabase (flag `deleted_at`)

---

## Origem dos itens

- 1, 2, 4, 5: levantados em 04/05/2026 durante análise do contrato Gizeli
- 3, 6, 7: pedidos pelo Eric no Telegram em 07/05/2026

## Tracking

Este arquivo é o source-of-truth. Quando um item entrar em desenvolvimento, criar branch `feat/whatsapp-<item>` referenciando esta seção. Ao concluir, marcar com `[DONE]` no título e linkar PR.
