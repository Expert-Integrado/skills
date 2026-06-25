# Montar a composição (vídeo-base + overlays)

## Estrutura do `index.html`
Composição standalone HyperFrames: `#root` com `data-composition-id="main"`, `data-width/height` (a proporção),
`data-duration` (fim da fala + ~2-3s pro end card). UMA timeline GSAP pausada controla TODOS os overlays.
O vídeo é o ÚNICO clip com `data-*`; os overlays são divs comuns controlados por GSAP (opacity/transform).

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="189" data-width="1920" data-height="1080">
  <div id="ecobg"> ... backdrop full-motion (z-index:0, atrás do vídeo; só aparece quando PiP) ... </div>
  <div id="stage"> <video .../> </div>   <!-- z-index:5 -->
  <audio .../>                            <!-- mesmo base.mp4 -->
  <div id="brand">...</div>               <!-- z-index:40 -->
  ...overlays laterais (lower-third, listas, chips, tags)...   <!-- z-index:30 -->
  ...cards full (stings, stat, end)...    <!-- z-index:60 -->
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  /* ...todas as tweens dos overlays... */
  window.__timelines["main"] = tl;
</script>
```

## Camadas (z-index) — decore essa pilha
| z | camada | observação |
|---|---|---|
| 0 | backdrop full-motion (pilares/diagrama) | atrás do vídeo; visível só quando a pessoa vira PiP |
| 5 | `#stage` (vídeo da pessoa) | animável pra PiP |
| 30 | overlays laterais (lower-third, listas, chips, section tag) | sobre a pessoa |
| 40 | brand mark | quase sempre por cima |
| 60 | cards full (stings de seção, stat, end card) | cobrem tudo |

Backdrop em z0: quando o `#stage` encolhe pro canto, o backdrop (pilares) aparece em volta, com a pessoa (PiP) por cima dele.

## Sincronizar com a fala
Rode `scripts/word_times.py` → tempos das palavras na timeline limpa. Ancore cada overlay na palavra que ele ilustra
(ex.: o contador "300+" começa quando ela diz "trezentas"; o pilar "Softwares" entra em "softwares").

## Mascarar os cortes entre takes (CRÍTICO)
Cada emenda entre dois takes = um "pulo" de posição da pessoa. Em todo corte, faça UMA das três:
1. **Card de seção full por cima** (melhor pras trocas de assunto): o sting cobre o corte. Estenda o card pra
   começar ANTES e terminar DEPOIS do corte.
2. **Punch-in** (zoom rápido) onde não cabe card:
   ```js
   tl.fromTo("#stage",{scale:1.05,transformOrigin:"50% 45%"},{scale:1,duration:0.4,ease:"power2.out",immediateRender:false},Tcorte);
   ```
   ⚠️ `immediateRender:false` é obrigatório (senão o zoom aplica em t=0 e fica torto).
3. **Corte sob o fade de um card** que já estava saindo/entrando ali.

Takes ADJACENTES no original (gap < ~0.3s) NÃO são pulo — não precisa mascarar.

## Handoff "cobre ANTES de revelar" (evita a pessoa piscar em tela cheia)
Ao sair de um PiP (pessoa no canto) pra um card de seção: suba o card PRIMEIRO, e só DEPOIS, escondido sob o
card opaco, resete o `#stage` pra tela cheia. NUNCA expanda a pessoa pra full e deixe ela aparecer 1s antes do card.
```js
tl.to("#sting2",{opacity:1,duration:0.4,ease:"power2.inOut"},40.05);     // 1) card cobre o PiP
tl.set("#stage",{...FULL,borderRadius:0,boxShadow:"none",border:"none"},40.6); // 2) reseta full SOB o card
tl.to("#sting2",{opacity:0,...},43.4);                                    // 3) card revela a pessoa em full
```
Mesma lógica saindo de um card full pro próximo take: estenda o `opacity:0` do card pra DEPOIS do corte, pra revelar
direto no take novo (sem mostrar 2x a pessoa).

## Re-timing quando você re-corta o vídeo-base
Se ajustar os cortes (tirar respiro, palavra duplicada), as durações dos trechos mudam e TODOS os overlays
DESLOCAM. Não recalcule um a um: trimar o FIM de um trecho desloca todos os trechos seguintes igualmente.
1. Rode `cut_base.py` de novo → novos offsets por trecho.
2. `shift_da_secao = novo_clean_start − antigo_clean_start`.
3. Some o `shift` da seção a TODOS os overlays daquela seção (é constante por seção).
Isso foi exatamente como os 4 ajustes finais do vídeo Expert foram refeitos.

## Decorativos = SEMPRE estáticos + grain
Glow e grid NÃO animam (degradê animado sobre fundo escuro = flicker de banding no H.264). O movimento vem das
ENTRADAS dos elementos. Toda card full leva `.glow` (estático) + `.grain`. Detalhe e prova: `gotchas.md`.

## Validar e renderizar
```bash
npx hyperframes lint            # 0 errors antes de renderizar
npx hyperframes render --quality high --fps 30 --output renders/final.mp4   # fps = o do video-base
```
Verifique por frames (um por seção + transições). `hyperframes validate` audita contraste (texto-fantasma a 4% pode
acusar falso-positivo — é decorativo, ok).
