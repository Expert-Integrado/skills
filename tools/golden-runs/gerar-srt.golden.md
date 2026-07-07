# Golden run — marketing:gerar-srt

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** Caminho A (vídeo). Input de teste: clipe de 45,087s cortado de "WhatsApp Agent - Configuração.mp4" (Backup OBS) via `ffmpeg -t 45 -c copy` → `C:/tmp/golden-srt-teste.mp4`. Modelo `small` já em cache. Validação extra do Caminho B só pro encoding (srt_from_text.py com 2 linhas acentuadas).
- **Resultado: APROVADO** — SRT real gerado (34 legendas de até 4 palavras, timestamps por palavra, UTF-8 correto), 2 correções automáticas aplicadas (GitHub x2), bloco REVISAR sinalizou "opus" (no SRT já estava "Opus 4.8" correto). Revisão manual identificou o que a entrega real sinalizaria ao Eric sem fonte textual: "RL" (provável URL), "App Agent" (provável WhatsApp Agent), "ZAPI" (grafia Z-API).

## Achados e fixes (marketing 2.13.1)

1. **Critério de foreground subestimava CPU (DEFEITO, SKILL.md).** Limiar era "background se ≥60s". Medido: clipe de 45s levou de 69s a >120s de parede (small, CPU FP32, varia com carga) — a 1ª execução foreground foi MORTA pelo timeout default de 120s da tool Bash (exit 143). Fix: limiar baixado pra ≥30s, foreground só <30s e mesmo assim com `timeout: 300000`, e entrada nova em Erros comuns explicando o exit 143.
2. **Mojibake no stdout dos 2 scripts (DEFEITO, transversal cp1252).** `gerar_srt.py` e `srt_from_text.py` imprimiam acentos como `�` em pipe/redirect. Fix: `sys.stdout/stderr.reconfigure(encoding="utf-8")` nos dois + `PYTHONUTF8=1` no env do subprocess do whisper (os prints de segmento dele tinham o mesmo problema). Validado em pipe.
3. **Instrução de background sem sentinela.** Adicionada à SKILL.md a regra do log com `EXIT=$?` no fim e a proibição de `| tail`/`| head` na chamada (na sessão de validação, um pipe desses mascarou o diagnóstico de uma falha — exit 4 sem output visível, não reproduzido depois).

## Não-defeitos anotados

- Exit 4 da 2ª tentativa pré-reboot não reproduziu pós-reboot (execução limpa EXIT=0); atribuído ao ambiente da invocação com pipe, não ao script.
- Path impresso com separador misto (`C:/tmp/golden-srt-out\arquivo.srt`) — cosmético, `Read`/`Edit` funcionam; não corrigido.
- O SRT do whisper já sai UTF-8 correto (o problema de encoding era só no stdout).

## Ambiente (achados laterais, fora desta skill)

- `command -v python3` agora resolve pra um Python 3.14.3 (WindowsApps) — o CLAUDE.md diz "não há python no PATH"; drift de ambiente que afeta a ordem de resolução de PY em várias skills (o ecossistema whisper/auto-editor está no 3.12). Tratar no run do cortar-respiros.
- Cache de plugins do PC segue desatualizado (marketing 2.11.0 vs repo 2.13.x) — propagar com `/plugin update skills@expertintegrado`.
