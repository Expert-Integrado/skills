# Armadilhas (aprendidas na marra)

## 1. Flicker de banding — NUNCA anime degradê sobre fundo escuro
**Sintoma:** numa cena parada, a imagem "cintila"/pisca ~30Hz. Os frames mudam todo frame mesmo com o texto imóvel.
**Causa:** um glow/degradê grande e suave ANIMADO (scale/opacity) sobre fundo escuro → o banding do H.264 "anda" a cada frame.
**Diagnóstico:** extraia ~60 frames de um trecho parado e compare o hash — se TODOS diferem com texto parado, é isso.
```bash
ffmpeg -i video.mp4 -vf "select='between(t,12,13)'" -vsync 0 f_%03d.png   # depois md5sum | sort -u | wc -l
ffmpeg -i a.png -i b.png -lavfi "blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -  # YAVG do delta
```
(No vídeo Expert: glow animado dava YAVG 0.047 / pico 5 níveis = cintilação visível. Estático+grain → YAVG 0.00008 = imperceptível.)
**Correção:** decorativos ESTÁTICOS (sem tween de scale/opacity no glow/grid) + camada `.grain` (feTurbulence) que dissolve o banding. O movimento vem das ENTRADAS dos elementos, não do fundo.

## 2. Caminho do vídeo no Python (Windows)
O Python nativo do Windows NÃO entende `/c/Users/...` (formato MinGW). Passe `C:/Users/...`.
Sintoma: o ffmpeg via `subprocess` falha silencioso (nenhum arquivo gerado) mas o mesmo comando no bash funciona.
Os scripts normalizam `/c/` → `C:/`, mas prefira já passar `C:/`.

## 3. Fontes não são auto-resolvidas
Space Grotesk (e Mono) NÃO entram sozinhas no HyperFrames. Embuta via `@font-face` apontando pros `.woff2`
(copie de `assets/fonts/` desta skill pro `projeto/assets/fonts/`). O lint acusa `font_family_without_font_face` se faltar.
Os `.woff2` do cache do HyperFrames (`~/.cache/hyperframes/fonts/`) às vezes são idênticos por peso (variável) — baixe os
pesos reais do fontsource se precisar de contraste 300↔700: `cdn.jsdelivr.net/npm/@fontsource/space-grotesk/files/space-grotesk-latin-{300,400,500,700}-normal.woff2`.

## 4. fps do render = fps do vídeo-base
O talking-head costuma ser 30fps. Renderize a 30. **Não** suba pra 60 (duplica frames do vídeo, dobra tamanho/tempo, zero ganho).
60fps só faz sentido em peça 100% motion (sem vídeo de base) — aí sim ajuda a suavizar transições.

## 5. Respiro/silêncio sobrando nas emendas
Defeito nº1 percebido pelo cliente. Corte exatamente no `end` da última palavra (+0.10-0.15s no máximo). Take longo às vezes
tem a última palavra "esticada" (ex.: "empresaaaa" de 1.1s) — isso é fala, não silêncio; o respiro é o que vem DEPOIS dela.
`silencedetect=noise=-32dB:d=0.28` ajuda, mas respiro = a pessoa respirando (não é silêncio digital), então confie no `end` da palavra.

## 6. Palavra duplicada na emenda
Se o take A foi cortado incluindo o começo da próxima frase ("...negócio. Um") e o take B começa com a mesma palavra
("Um outro..."), vira "Um Um". Olhe os `end` das palavras no transcript e corte A no fim da última palavra BOA (antes da repetida).
Confirme depois transcrevendo o trecho cortado (ElevenLabs de novo) — barato e definitivo.

## 7. Pessoa "piscando" em tela cheia entre slides
Ao trocar de PiP pra card (ou de card pro próximo take), nunca deixe a pessoa aparecer em tela cheia por ~1s.
Use o handoff "cobre antes de revelar" e estenda os cards por cima dos cortes (ver `composicao.md`).

## 8. `gsap.from()` e immediateRender em timeline pausada
`from()`/`fromTo()` têm `immediateRender:true` por padrão → o estado "from" aplica em t=0. Pra entradas isso é OK
(o elemento fica escondido até a hora). Mas pra um `fromTo` de scale no MEIO do vídeo (punch-in), use
`immediateRender:false`, senão o zoom aplica em t=0 e fica torto. `tl.set(...)` em elementos de cenas futuras é seek-safe (reverte no rewind).

## 9. STT erra termos técnicos e números
O ElevenLabs Scribe troca "MCP"→"empе cê pê", "horas"→"milhões", "eficiência"→"resiliência" às vezes. Isso é o
RECONHECIMENTO, não o áudio. O áudio real (a fala da pessoa) está certo. Não "conserte" o vídeo por causa do texto do STT —
use o STT só pros TIMESTAMPS e pra achar os takes.

## 10. Arquivo final grande
3min 1080p em CRF 18 ≈ 270MB. Pra WhatsApp/Drive, ofereça versão leve:
`ffmpeg -i final.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k final-leve.mp4` (~40MB, qualidade boa).
