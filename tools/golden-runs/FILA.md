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
| blog-para-linkedin | A1 | nenhum | fila | — |
| criar-post-blog | A1 | draft local, NÃO publica | fila | alimenta decisão h48d9cxqowqt |
| agente-draft-blog | A1 | draft local | fila | — |
| agente-revisor-blog | A1 | local | fila | — |
| agente-publisher-blog | C | PUBLICA blog prod | fila (até preview) | — |
| gerar-srt | A2 | Whisper local (input: mp4 do RUN_DIR 20260706_152645) | fila | — |
| cortar-respiros | A2 | ffmpeg local (mesmo input) | fila | — |
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
| pipe-review | A2 | Pipedrive read-only | fila | — |
| estou-devendo | A2 | WhatsApp read-only | fila | — |
| calendly-link | A2 | cria link reutilizável (inofensivo) | fila | — |
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
| verificar-convites | A2 | read-only | fila | — |
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
| aula-mentoria | A1 | local | fila | telemetria acusou 1 erro — investigar |
| briefing-pre-call | A2 | Pipedrive/Zoom read | fila | — |
| claude-task | A2 | task no Brain (reversível) | fila | — |
| criar-aula | A1 | local | fila | telemetria acusou 1 erro — investigar |
| criar-voice-guide | A2 | WhatsApp read | fila | — |
| curar-brain-semanal | A2 | Brain read-mostly | fila | CUIDADO: não duplicar relatório da cron de domingo |
| innovation-lab | A1 | local | fila | — |
| mentoria-equipe-seg-16h | A1 | local | fila | — |
| onboarding-cliente-ganho | B | ClickUp writes | aguarda OK | card TESTE + delete |
| pos-reuniao-acoes | A2/B | verificar writes na leitura | fila | — |
| proposta-3-tiers | A1 | doc local | fila | — |
| triagem-matinal | A2 | inbox read | fila | telemetria acusou 1 erro — investigar |

## pessoal (1) · conselho (1) · whatsapp-agent (2)

| skill | classe | side-effect / custo | status | resultado |
|---|---|---|---|---|
| voz | A1 | local | fila | — |
| conselho | A1 | conversacional (longo) | fila | root SKILL.md duplicada — decisão na task 116k46s84rpc |
| transcrever-conversa (wa) | A2 | WhatsApp read + Whisper | fila | — |
| estou-devendo (wa) | A2 | variante standalone da comercial | fila | validar separado |

## Placar

- Únicas: 52 (estou-devendo em 2 repos, conselho com root duplicada, 2 cópias de worktree ignoradas)
- FEITAS: 3 · EM EXECUÇÃO: 1 · Onda 1 restante: ~34 · Aguardando OK (ondas 2-3): 9-10 · Parciais (onda 4): 8
