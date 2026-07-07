# Frames de B-roll e Thumb — padrão visual

Imagens são geradas com **`scripts/openai_image.py`** (GPT Image 2 / OpenAI, credencial `C:/MCPs/openai.env`),
sempre `9:16`, como mandam as etapas 5, 8 e 9 da SKILL. Canva AI é proibido. HTML/CSS+Playwright só como último fallback.

## Estilo visual da série (manter coeso entre Reels)
Paleta: **fundo escuro carvão + brilho âmbar/coral**, render 3D cinematográfico, god rays volumétricos,
alto contraste, premium high-tech, ultra-detalhado. Esse look amarra B-roll + thumb numa identidade só.

## Frames-base para o Kling (image-to-video)
- 1 frame por clipe de 5s. Total de clipes = duração do vídeo ÷ 5 (arredondar pra cima).
- Cada frame é o **quadro inicial** da cena (o Kling adiciona o movimento depois).
- **SEM TEXTO nos frames** (o texto entra na edição). Sempre incluir no prompt:
  `no text, no words, no logos`. E evitar logos de marca reais (renderizam torto).
- Representar marcas/conceitos de forma **abstrata** (ex: pagamento = rede de nós brilhando;
  "uma IA" = esfera de energia; arquivo = folha/card genérico).
- Salvar em `$REEL/frames/frame-01.png ... frame-NN.png`.
- Sufixo de estilo recomendado no prompt:
  `Style: cinematic 3D render, dark charcoal studio background, warm amber and coral glow, volumetric god rays, high contrast, premium high-tech mood, ultra-detailed, sharp focus, no text, no words, no logos, vertical 9:16 with clean negative space at the top.`

## Negative prompt padrão (B-roll, usado no manifesto do Kling)
```
text, letters, words, captions, watermark, logo, brand name, distorted face, deformed hands, extra fingers, low quality, blurry, jittery motion, flicker, oversaturated, cartoon
```

## Thumb do Reel (realista, COM texto)
- Diferente do B-roll: aqui é **fotográfico/cinematográfico realista** e **leva texto** (o GPT Image 2 renderiza texto bem).
- Fórmula da série: visual dramático que traduz o gancho + **headline branca em CAIXA ALTA** no terço
  superior (negrão, sombra leve, com espaço limpo atrás) + **selo/pill âmbar** embaixo com 1 palavra
  (o nome da ferramenta/tema). Headline curta (3-4 palavras).
- Salvar em `$REEL/thumb-<tema>-reels.png` (junto dos demais artefatos do reel).
- Conferir o resultado (Read na imagem). Oferecer variações de gancho e, se fizer sentido, versão com o
  rosto do Eric (pedir foto dele olhando pra câmera, usar como reference_images).
- Atenção: moedas/ícones podem sair com cara de cripto — pedir "neutral generic coins, no crypto symbols"
  quando o tema for "token de IA".
