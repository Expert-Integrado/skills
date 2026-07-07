# Golden run — marketing:cortar-respiros

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** clipe de fala crua de 45,087s (`C:/tmp/golden-srt-teste.mp4`, corte do OBS "WhatsApp Agent - Configuração"). Sem modo nomeado + primeira vez (nenhuma saída prévia) → regra 2 do passo 2 → `--both`. `--both` → background com log + sentinela `.rc` (conforme passo 3).
- **Resultado: APROVADO** — RC=0, os 2 arquivos gerados e medidos: `_enxuto` 0:41 (cortou 3,8s, 8%) e `_agressivo` 0:37 (cortou 7,8s, 17%). Revalidação pós-fix com encode único (`--out`): saída limpa, EXIT=0. Artefatos de teste removidos após o run.

## Achados e fixes (marketing 2.13.2)

1. **Resolução de PY por PATH quebrou com drift de ambiente (DEFEITO, SKILL.md).** O PC do Eric agora tem um Python 3.14.3 (Store/WindowsApps) no PATH — `command -v python3` resolve pra ele, que NÃO tem auto_editor; a skill instalaria o auto-editor num interpretador órfão, fora do ecossistema 3.12 documentado (whisper etc.). O CLAUDE.md ("não há python no PATH") está desatualizado nesse ponto. Fix: passo 0 agora resolve por CAPACIDADE (primeiro candidato que já tem `auto_editor` vence; sem nenhum, instala na ordem PYTHON_BIN > 3.12 documentado > python3 > python). Validado: resolveu o 3.12 e instalou auto-editor 29.3.1 nele.
2. **Reader thread do subprocess crasheava com UnicodeDecodeError (DEFEITO, cortar_respiros.py).** `subprocess.run(capture_output=True, text=True)` sem encoding usa cp1252 no Windows; o output UTF-8/binário do auto-editor derrubava a thread de captura (traceback no meio do log; exit ainda 0, mas o stdout/stderr capturado se perdia — o diagnóstico de falha do auto-editor viria vazio). Fix: `encoding="utf-8", errors="replace"` nas 2 chamadas (`run_autoeditor` e `duration`).
3. **Mojibake no stdout (transversal cp1252).** "come�o" no print final. Fix: `sys.stdout/stderr.reconfigure(encoding="utf-8")`.

## Observações (não-defeito)

- SKILL_DIR pela ordem da skill resolve pro cache do plugin (2.11.0, desatualizado vs repo) — comportamento correto de plugin instalado; o run validou a versão do REPO. Propagação: `/plugin update skills@expertintegrado`.
- Critérios objetivos do passo 2 (lista fechada de frases-gatilho, check verificável de "primeira vez") e do passo 3 (background por duração/tamanho/--both) funcionaram sem ambiguidade no cenário real.
- auto-editor 29.3.1 baixa um binário standalone no primeiro uso (release do GitHub) — primeira execução precisa de internet.
