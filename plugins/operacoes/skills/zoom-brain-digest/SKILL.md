---
name: zoom-brain-digest
description: Use when o usuário pede para varrer reuniões do Zoom e alimentar o Expert Brain, quando a rotina diária de digestão de reuniões dispara, ou quando ele manda um link de gravação do Zoom pedindo para salvar o conteúdo no Brain.
---

# Zoom → Brain Digest

## Overview

Destila conhecimento durável (decisões, princípios, padrões, insights) dos resumos de IA das reuniões gravadas no Zoom e salva como notas atômicas no Expert Brain, com edges. Resumo do Zoom AI basta — só puxar transcrição completa se o resumo for insuficiente para uma reunião crítica.

## Pré-requisitos

- Conector **Zoom for Claude** conectado no claude.ai (Configurações > Conectores).
- Conector do **Expert Brain** do usuário conectado.
- Para a rotina diária automática: criar uma routine na nuvem via `/schedule` pedindo "rotina diária às 8h que varre as reuniões do Zoom do dia anterior e alimenta meu Brain seguindo a skill zoom-brain-digest".

## Janela de tempo

- A rodada vem do prompt de disparo (o agendamento declara "rodada da manhã"); sem declaração, usar a hora local: antes de 12h BRT = manhã.
- Rodada da manhã: reuniões do **dia anterior** (00:00–23:59 BRT). Rodada da noite ou pedido "de hoje": **dia atual**.
- BRT = UTC-3. Dia D em BRT = `D 03:00Z` até `D+1 02:59Z`. A API só aceita data (`yyyy-mm-dd`), então **listar um dia a mais de cada lado e pós-filtrar client-side por `start_time` dentro da janela UTC** — sem esse pós-filtro, reuniões do dia BRT errado entram na rodada.

## Workflow

1. **Carregar tools** via ToolSearch: `mcp__claude_ai_Zoom_for_Claude__recordings_list`, `get_recording_resource`, `search_meetings`, e do Brain: `recall`, `save_note`.
   - Erro "requires re-authorization (token expired)" → PARAR e reportar: usuário precisa reautorizar o conector *Zoom for Claude* nas configurações do claude.ai. Não tentar OAuth.
2. **Listar**: `recordings_list` com `from`/`to`. Se o output estourar o limite, o erro informa o path do arquivo salvo (pasta `tool-results/`) → parsear com PowerShell `ConvertFrom-Json` no Windows ou `python -c "import json..."` (**não assumir que jq existe**). Extrair só: `start_time`, `topic`, `uuid`, tipos de arquivo, e duração real = **delta entre `recording_start`/`recording_end` dos arquivos** (o campo `duration` não é confiável — já veio `2` numa gravação de 42min).
3. **Filtrar** (o que analisar):
   - PULAR: "Daily" com <40min, gravações <10min, "Sala Pessoal" sem tema identificável, reuniões sem TRANSCRIPT/SUMMARY.
   - PRIORIZAR: planejamentos, análises (churn, métricas com discussão), consultorias, mentorias 1:1 e técnicas longas, comitês, alinhamentos estratégicos.
4. **Puxar conteúdo**: `get_recording_resource` com `meetingId` = `uuid` da gravação (se o uuid contiver `/` ou começar com `/`, aplicar double URL-encoding) e `types: "summary,nextStep"` (nunca pedir playUrl). Output em arquivo → extrair só `overall_summary`, `items[].label/summary`, `next_steps[].items[].text`; **ignorar `thumbnailUrls`/`smart_pic_url`**. Para link avulso de gravação (`/rec/share/...`): abrir com Playwright headless, aguardar ~5s, ler `document.title` (= tópico) e buscar a reunião via `search_meetings`.
5. **Normalizar** a transcrição ruim do Zoom antes de salvar: "Enric/Erick"→Eric, "Cláudio/Claudio"→Claude, "fermentas"→ferramentas, "depósito"→repositório, "lideranças/lideres"→leads, "cadeiras"→cadências, "vendores"→vendedores. Nomes de pessoas: validar contra `attendees` retornado por `search_meetings` para a mesma reunião. Termo garbled fora do mapa: normalizar por inferência se o contexto for inequívoco (ex.: variações da mesma ferramenta), senão manter literal.
6. **Destilar e salvar**: durável apenas (decisão, princípio, padrão, insight — nada de status de tarefa ou minúcia operacional do dia); `recall` antes de CADA `save_note`; 1 nota = 1 conceito (título sem "e"); edges com `why` nomeando o mecanismo compartilhado; citar reunião e data no corpo. **Recall achou nota que já cobre o conceito → NÃO criar nota nova**: se a reunião agrega evidência ou nuance nova, `update_note` na existente ou criar edge; senão pular e registrar no relatório. Reunião importante rende tipicamente 1–4 notas; Daily normalmente rende zero.
7. **Reportar**: tabela reunião → notas criadas (com links), o que foi pulado e por quê, reuniões indisponíveis (404/sem resumo).

## Erros comuns

| Erro | Correção |
|---|---|
| Usar `jq` sem verificar | Pode não existir; PowerShell `ConvertFrom-Json` ou python |
| Salvar next steps operacionais como notas | Next steps ≠ conhecimento durável; só entram se revelarem decisão/padrão |
| Nota por reunião ("resumo da reunião X") | Nota é por CONCEITO; a reunião é só a fonte citada no corpo |
| Salvar sem recall | Sempre recall antes — dedupe + edges cross-domain |
| Pedir transcript completo de tudo | Resumo basta; transcript só em exceção justificada |
