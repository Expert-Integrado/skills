# FILA — Validação real de TODAS as skills (golden runs)

Autorizada pelo Eric em 06/07/2026 ("vamos validar todas elas?"). Protocolo: ver `README.md` desta pasta.
Regras do run: executor segue SÓ o texto da skill; desvio = achado; defeito achado = fix + gate + commit no mesmo ciclo; resultado registrado no `<skill>.golden.md` + status aqui.

## Classes (classificação preliminar — confirmada na leitura de cada skill no próprio run)

- **A1** — local puro (sem API externa, sem custo): roda direto.
- **A2** — read-only externo, custo marginal (<US$0,50) ou side-effect trivial no espaço do próprio Eric (ex.: task no Brain): roda direto.
- **B** — side-effect externo reversível/visível a terceiros (CRM, Zoom, ClickUp, caixa de email): roda com ALVO DE TESTE + OK em lote do Eric, desfaz depois.
- **C** — irreversível / massa / produção / custo alto: run PARCIAL até o gate de envio-publicação-deploy; cruzar o gate só com OK específico.

## Ondas

1. **Onda 1 (sem OK, em execução):** todas A1 + A2.
2. **Onda 2 (aguarda OK em lote):** as B, com alvo de teste + desfazer.
3. **Onda 3 (aguarda OK de custo):** geração de mídia paga (Kling/HF).
4. **Onda 4 (sem OK até o gate):** as C, parciais por natureza.

## marketing (24)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| tweet-print | A1 | nenhum | FEITO 06/07 | APROVADO 6/6 |
| imagem | A2 | API imagem (centavos) | FEITO 06/07 | APROVADO 7/7, 1 achado corrigido |
| pauta-semanal | A2 | Apify ~US$0,10 | FEITO 06/07 | APROVADO, 4 achados corrigidos |
| criar-script | A1 | nenhum | FEITO 06/07 | APROVADO 8/8, zero defeito na skill, 1 achado lateral (CLAUDE.md) corrigido |
| blog-para-linkedin | A1 | nenhum | FEITO 06/07 | APROVADO ponta a ponta (Post 7 real derivado do caso-cliente-juridico, check 9/10, registrado na fila); 2 achados corrigidos (marketing 2.13.3): fallback de voz apontava pra memory inexistente + aviso operacional do get_voice_guide/check_message |
| criar-post-blog | A1 | draft local, NÃO publica | N/A 06/07 (DEPRECATED) | Deprecated 29/06 pelo pipeline modular (draft->revisor->publisher); validação = description bloqueia disparo (OK) + reference/voz-e-geo.md íntegra (OK). Golden run vai pro pipeline substituto |
| agente-draft-blog | A1 | draft local | FEITO 06/07 | APROVADO (MDX real de 1529 palavras, Camada 0 e [preencher] exercitados, fato HBR verificado); 2 achados corrigidos (marketing 2.13.4): template sem takeaways + Passo 4 de pubDate escolhia data no passado |
| agente-revisor-blog | A1 | local | fila | — |
| agente-publisher-blog | C | PUBLICA blog prod | fila (até preview) | — |
| gerar-srt | A2 | Whisper local (clipe teste 45s em C:/tmp) | FEITO 06/07 | APROVADO (SRT real, caminho A + encoding do B); 3 achados corrigidos (marketing 2.13.1): limiar foreground 60s->30s (timeout 120s matava Whisper), mojibake cp1252 nos 2 scripts, sentinela EXIT no background |
| cortar-respiros | A2 | ffmpeg local (mesmo input) | FEITO 06/07 | APROVADO (--both real, 2 saídas medidas); 3 achados corrigidos (marketing 2.13.2): resolução de PY por capacidade (drift: Python 3.14 da Store entrou no PATH), UnicodeDecodeError na captura do subprocess, mojibake stdout |
| reel-para-post | A2 | Whisper local | fila | — |
| carrossel-studio | A2 | API imagem (centavos) | fila | — |
| gerar-hero-blog | A2 | API imagem (centavos) | fila | — |
| ig-competitor-research | A2 | Apify ~US$0,10 | fila | completar: build_report.py + relatório |
| relatorio-ads | A2 | Meta API read-only | fila | — |
| criar-campanha | C | cria campanha Meta Ads | fila (até payload) | criar pausada só com OK |
| criar-webinario | B | cria webinar Zoom real | aguarda OK | criar + deletar |
| criar-reel | B-custo | Kling/HF (créditos) | aguarda OK custo | — |
| video | B-custo | API vídeo (créditos) | aguarda OK custo | — |
| reels-studio | B-custo | API vídeo (créditos) | aguarda OK custo | — |
| editar-video-motion | A2? | verificar se é só ffmpeg local | fila | — |
| demonstracao-agente | C | deploy Vercel | fila (até build local) | v3.3 já roda em prod na VPS (OpenClaw) |
| orquestrar-conteudo | C | pipeline com gate | fila (até o gate) | — |

## comercial (11)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| pipe-review | A2 (com RADAR_NO_DEPLOY) / C (deploy prod) | deploy Vercel no modo normal | FEITO 06/07 (sem deploy) | APROVADO: radar real (35 deals, sanidade OK), 1 fix (log ia pro OneDrive morto + tasks.md aposentado — agora Brain); deploy segue travado por SAML (task 0lunqicxd45i) |
| estou-devendo | A2 | WhatsApp read-only | FEITO 06/07 | APROVADO (caminho primário real), 4 achados corrigidos (comercial 2.5.6); 20 pendências fósseis viraram observação de produto |
| calendly-link | A2 | link single-use real (inofensivo) | FEITO 06/07 | APROVADO 8/8; match por slug validado; 1 achado de doc (max_event_count não existe na resposta) corrigido |
| calendly-agendar | B | agendamento real | aguarda OK | agendar + cancelar |
| blog-comercial | A1 | draft local | fila | — |
| prospecta-lead | B | cria person+deal+activity no Pipedrive | aguarda OK | lead TESTE + delete |
| reabordagem | A2 | até o rascunho (NÃO envia) | fila | — |
| fup-inteligente | A2 | até o rascunho (NÃO envia) | fila | — |
| transferir-lead | B | muda dono de deal | aguarda OK | deal TESTE |
| whatsapp-campanha-api-fup | C | disparo em massa | fila (até preview/fila) | — |
| whatsapp-campanha-central-prospeccao | C | disparo em massa | fila (até preview) | — |

## eventos (3)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| verificar-convites | A2/B (writes em funil real) | MCP expert-integrado obrigatório | PARCIAL 06/07 | MCP ausente na sessão (parada legítima); pré-requisitos adicionados à skill; run completo no próximo ciclo real de convites da imersão |
| convidar-evento | C | disparo em massa | fila (até preview) | — |
| notificacao-webinario | C | disparo | fila (até preview) | — |

## operacoes (2)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| email-cleaner | B | move/arquiva emails reais (reversível) | aguarda OK | — |
| onboard | A1? | verificar na leitura | fila | — |

## lab (13)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| apresentacao-html | A1 | HTML local | fila | — |
| aula-mentoria | B/C (era A1) | gravações reais + Smart Player alunos + ClickUp | PARCIAL 06/07 | 1 achado corrigido (encoding output PS); IDs ClickUp validados; completo no próximo uso real |
| briefing-pre-call | A2 | Pipedrive/Zoom read | fila | — |
| claude-task | A2 | task no Brain (reversível) | FEITO 06/07 | APROVADO ponta a ponta; achado TRANSVERSAL do fuso (TZ IANA sem tzdata no Git Bash) corrigido em 7 skills |
| criar-aula | A1 (ramo teste) / C (deploy) | deploy só no ramo real | FEITO 06/07 (ramo teste) | APROVADO, 7 achados corrigidos (lab 3.10.1); iconv ausente era o provável erro da telemetria; ramo deploy fica pra curso real |
| criar-voice-guide | A2 | WhatsApp read | fila | — |
| curar-brain-semanal | A2 | Brain read-mostly | fila | CUIDADO: não duplicar relatório da cron de domingo |
| innovation-lab | A1 | local | fila | — |
| mentoria-equipe-seg-16h | A1 | local | fila | — |
| onboarding-cliente-ganho | B | ClickUp writes | aguarda OK | card TESTE + delete |
| pos-reuniao-acoes | A2/B | verificar writes na leitura | fila | — |
| proposta-3-tiers | A1 | doc local | fila | — |
| triagem-matinal | A2 | read-only 4 fontes | FEITO 06/07 | APROVADO ponta a ponta, 7 achados corrigidos (lab 3.10.2); painel real gerado |

## pessoal (1) · conselho (1) · whatsapp-agent (2)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| voz | B (era A1) | send_voice real: WhatsApp + quota ElevenLabs | PARCIAL 06/07 | Parte 1 (local) APROVADA com 4 achados corrigidos (voz 2.1.1); Parte 2 (send pro Eric) na onda 2 |
| conselho | A1 | conversacional (longo) | fila | root SKILL.md duplicada — decisão na task 116k46s84rpc |
| transcrever-conversa (wa) | A2 | WhatsApp read + Whisper | fila | — |
| estou-devendo (wa) | A2 | variante standalone da comercial | fila | validar separado |

## Placar

- Únicas: 52 (estou-devendo em 2 repos, conselho com root duplicada, 2 cópias de worktree ignoradas)
- Processadas: 18 (13 FEITO + 4 PARCIAL + 1 N/A deprecated) · Defeitos reais corrigidos: 45 · Onda 1 restante: ~24 · Ondas 2-3 (side-effect/custo com alvo de teste): em sequência · Onda 4 (parciais por natureza): 8
