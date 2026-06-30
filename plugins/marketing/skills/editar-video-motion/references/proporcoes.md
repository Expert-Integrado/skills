# Proporções: 16:9, 9:16, 1:1

O **`base.mp4` é o mesmo** pros três formatos — quem muda é a composição (`data-width/height` + posições dos overlays).
O `cut_base.py` já corta o vídeo na proporção alvo (`--target`), usando `scale=...:force_original_aspect_ratio=increase,crop`
pra preencher cobrindo (center-crop). Pra cada formato, gere o `base.mp4` naquela proporção OU deixe o `object-fit:cover`
do `<video>` reenquadrar (mais simples: corte o base só em 1920x1080 e deixe o cover cortar nas outras telas).

| Formato | data-width × height | uso |
|---|---|---|
| 16:9 | 1920 × 1080 | YouTube, institucional, apresentação |
| 9:16 | 1080 × 1920 | Reels, Stories, TikTok |
| 1:1  | 1080 × 1080 | feed do Instagram |

## 9:16 (1080×1920) — talking-head vertical
O vídeo 16:9 vira vertical por **center-crop** (`object-fit:cover` no `<video>` num `#stage` de 1080×1920). A pessoa fica
centralizada; sobra muito espaço vertical (topo e base) pros gráficos. Estratégia recomendada:
- **Pessoa no centro/meio**, gráficos nas **faixas de cima e de baixo** (não nas laterais — vertical é estreito).
- **lower-third**: base, largura quase total.
- **listas/callouts**: cards de largura total empilhados na **faixa inferior** (não na lateral direita como no 16:9).
- **cards de seção / stat / end**: full, texto centralizado, `font-size` ~70-80% do 16:9 (tela mais estreita).
- **PiP**: a pessoa encolhe pra uma faixa (ex.: topo, 1080×~720) e o motion ocupa a metade de baixo — OU vira um
  quadrado menor no canto. Em vertical, "pessoa em cima + motion embaixo" funciona melhor que PiP no canto.
- **brand mark**: topo. **section tag**: logo abaixo do brand.
- Tamanhos: títulos full ~90-100px (cabe ~12-14 chars/linha), body ~30-34px, deixe respiro nas margens (padding ~80px).

Reaproveite os MESMOS componentes (`componentes.md`), só reposicione (top/bottom/left/width) e reduza fontes.

## 1:1 (1080×1080)
Center-crop também. Quadrado é apertado:
- Gráficos preferencialmente em **faixa inferior** ou **cards full** que cobrem.
- Listas: 1-2 itens visíveis por vez, fonte menor, OU vira card full.
- Títulos full ~80-90px.

## Fluxo multi-formato
1. Produza e aprove o **16:9** primeiro (é onde o layout respira melhor).
2. Duplique a composição, mude `data-width/height` e reposicione os overlays (a timeline/tempos NÃO mudam — a fala é a mesma).
3. Renderize cada um: `--output renders/final-9x16.mp4` etc.
4. Dica: mantenha os TEMPOS idênticos entre formatos; só geometria muda. Assim um ajuste de timing vale pros três.

## Reenquadrar o sujeito (se ele ficar mal cortado no vertical)
Se o center-crop cortar mal (cabeça muito alta/baixa), ajuste o `object-position` do `<video>`:
`object-position: 50% 35%;` (puxa o enquadramento pra cima, bom pra deixar o rosto na parte superior do vertical).
