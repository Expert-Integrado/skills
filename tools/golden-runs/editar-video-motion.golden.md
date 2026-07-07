# Golden run — marketing:editar-video-motion

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** clipe de teste de 45s (fala real do Eric) como gravação crua; pedido canônico documentado "edita em 16:9, estrutura da própria fala, CTA agendar diagnóstico" (formato+estrutura fornecidos — as paradas legítimas do Passo 0 não dispararam). Escopo: pré-requisitos + Passos 1-4 (transcribe STT real, segment_map, KEEP-LIST com OK documentado, cut_base mp4+mp3, word_times). Passos 5-6 (compose+render HyperFrames) NÃO re-executados: validados em produção em 24/06/2026 (vídeo do ecossistema, 8min→3min) — re-render não acrescenta cobertura de binding e custa dezenas de minutos.
- **Classificação confirmada: A2** (STT ElevenLabs em centavos; resto 100% local).
- **Resultado: APROVADO no escopo.** `hyperframes doctor` resolve o pacote (faltas são opcionais TTS/BGM/Docker); ffmpeg/ffprobe/curl no PATH; 4 scripts + 4 pesos woff2 bundlados; chave achada em `C:/MCPs/elevenlabs.env` (fonte 2). fps medido 30/1. Transcrição real: 45s, 259 tokens. Corte real: 3 trechos, 45s→27,2s, offsets da timeline limpa impressos, mp3 gerado, lip-sync preservado por construção (mesmo corte A/V).

## Achados e fixes (marketing 2.13.11)

1. **`transcribe.py` sem `--ssl-no-revoke` no curl (DEFEITO, reproduzido).** No PC o schannel falha a checagem de revogação → curl exit 35 → `ERRO STT HTTP 000` sempre. É o gotcha global documentado no CLAUDE.md ("curl HTTPS: SEMPRE --ssl-no-revoke") que o script bundlado não aplicava. Fix: flag adicionada condicionalmente em `os.name == "nt"` (não afeta VPS Linux) + `encoding="utf-8", errors="replace"` na captura do subprocess. Verificado: re-run deu HTTP 200, `OK -> transcript.json (45.0s, 259 tokens)`.
2. **Mojibake cp1252 no stdout dos 4 scripts (DEFEITO transversal, reproduzido).** `segment_map.py` ecoava os segmentos com `Ent�o`/`instala��o` no console (o ARQUIVO estava correto em UTF-8 — só o eco quebrava, que é justamente o que o operador lê pra montar a KEEP-LIST). Fix: `sys.stdout/stderr.reconfigure(encoding="utf-8", errors="replace")` nos 4 scripts (transcribe, segment_map, cut_base, word_times); sintaxe validada por AST e verificado no re-run (word_times imprimindo "instalação" correto).

## Observações (não-defeito)

- O `python3` do PATH (3.14 da Store) rodou os 4 scripts sem problema — são stdlib+curl puros. A nota do Pré-requisito 2 sobre "stub da Store" está datada (hoje é um 3.14 real), mas o fallback documentado continua correto como rede de segurança; não mexi porque a resolução atual funciona pros scripts desta skill.
- `cut_base.py` de fato normaliza `/c/`→`C:/` como documentado; passei `C:/` direto conforme a regra.
- O eco duplicado dos OFFSETS nas duas chamadas do cut_base (mp4 e mp3) é design, não bug.
- Cobertura não exercitada: identidade via landing (Playwright), formatos 9:16/1:1, e o render — todos com referência de produção de 24/06.
