# Golden run — marketing:ig-competitor-research (complemento)

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** completar a pendência do run parcial de hoje 15:26 (scrape real @rowancheung via Apify, 3 posts Video com transcript Whisper e capas baixadas, RUN_DIR no cache do marketplace): Passo 2 (análise visual dos 3 posts no contexto principal, ≤8), Passo 3 (analysis.json + build_report.py) e Passo 4 (padrões + pautas).
- **Resultado: APROVADO (ciclo completo).** `analysis.json` escrito com os 4 campos em português por post (hook reescrito, não ASR cru); `build_report.py` fez o merge (`[merge] analysis.json aplicado em 3 posts`) e gerou `report.html` de 520KB (imagens base64 embutidas). Nota: análise e relatório rodaram sobre dados locais do scrape anterior (frames/transcripts já baixados) — a proibição "transcrição na mesma sessão do scrape" não foi violada porque a transcrição JÁ tinha acontecido dentro do `research.py` do run das 15:26.

## Achados e fixes (marketing 2.13.9)

1. **Correção do item 1Password não propagada pro bloco executável (DEFEITO, inconsistência interna).** O golden run anterior corrigiu os Pré-requisitos pra `op://Agentes Eric/Apify/credencial`, mas o bloco único do Passo 1 continuava com `op://Agentes Eric/APIFY_TOKEN/credential` (item inexistente) — o executor literal do Passo 1 falharia na credencial de novo. Fix: bloco do Passo 1 alinhado.
2. **Resolução de `$PY` por PATH com premissa caducada (DEFEITO, drift transversal).** "No PC do Eric não há python/python3 no PATH" — falso (3.14 da Store); pior: o pré-requisito mandava `pip install -U openai-whisper` no interpretador errado quando o import falhasse (download pesado duplicado — provavelmente foi isso que instalou whisper no 3.14 hoje). Fix: resolução por CAPACIDADE (`import whisper, requests`) nos Pré-requisitos e no bloco do Passo 1; install só como último recurso.

## Observações (não-defeito)

- `build_report.py` validado de ponta a ponta (era a pendência): merge por shortcode, HTML dark com imagens embutidas, transcrição copiável.
- Os 3 posts do @rowancheung têm o MESMO formato (split-screen B-roll + talking head com mic de estúdio) — menos de 3 formatos distintos, então o Top 3 do Passo 4 completou com mecanismos de `why_it_worked` (regra 4 do próprio passo, funcionou como escrita).
- RUN_DIR vive no cache do marketplace (run anterior rodou de lá); o repo fonte não tem `output/`. Comportamento esperado — a skill resolve `output/` via `__file__`.
- Relatório: `C:/Users/Eric Luciano/.claude/plugins/marketplaces/expertintegrado/plugins/marketing/skills/ig-competitor-research/output/20260706_152645/report.html`.
