# /cortar-respiros — Remove pausas e silêncios de vídeos gravados

> Tira automaticamente os respiros e silêncios de um vídeo, deixando a fala numa cadência seguida e mais corrida, sem perder a sincronia entre áudio e imagem.

## O que faz

Pega um vídeo gravado (normalmente o talking-head do Eric) e remove os trechos de silêncio — as pausas, os respiros e os tempos mortos entre as frases. O resultado é um vídeo mais enxuto e dinâmico, com a fala "colada", parecendo aquele estilo de corte rápido (jump cut) que prende a atenção.

Tudo é feito de forma automática: a skill detecta onde tem som de fala e onde tem silêncio, recorta os silêncios e remonta o vídeo já sincronizado. No fim, ela informa quanto tempo o vídeo tinha antes, quanto ficou depois e quantos segundos (e qual porcentagem) foram cortados.

## Quando usar

Sempre que você quiser deixar um vídeo gravado mais ágil. Exemplos de pedido:

- "corta os respiros desse vídeo"
- "tira as pausas"
- "deixa o vídeo mais corrido"
- "faz uma versão enxuta"
- "deixa numa cadência seguida"
- "põe jump cut nisso"
- "remove os silêncios"
- mandar um vídeo gravado e pedir "agiliza isso aí"

## O que você precisa dar

- **O caminho do vídeo** (o arquivo .mp4 que você quer enxugar). Ex.: `C:/Users/Joao/Downloads/meu-video.mp4`.
- Opcionalmente, você pode dizer o quão agressivo quer o corte:
  - **Enxuto (padrão):** corte mais natural, preserva pausas curtas.
  - **Agressivo:** corta mais fundo, fala mais colada.
  - **As duas versões:** gera enxuto e agressivo de uma vez pra você comparar e escolher.

Se você não disser nada, ela usa o padrão enxuto.

## O que ela entrega

- Um (ou dois) arquivos de vídeo novos, salvos na **mesma pasta do original**:
  - `<nome>_enxuto.mp4` — versão natural
  - `<nome>_agressivo.mp4` — versão mais colada (quando você pede a versão agressiva ou as duas)
- Um resumo com a **duração original, a duração de cada saída e quanto foi cortado** (em segundos e em %).
- Um aviso pra você assistir e conferir se nenhum corte "comeu" o começo de uma palavra.

## Como funciona (passo a passo resumido)

1. Você passa o caminho do vídeo.
2. A skill mede a duração original do vídeo.
3. Ela roda a ferramenta de detecção de silêncio, que identifica os trechos de fala e descarta o silêncio entre eles.
4. O vídeo é remontado já sincronizado (áudio + imagem juntos) e salvo como um arquivo novo.
5. A skill compara a duração antes e depois e mostra a tabela com o quanto cortou.
6. Se você pedir as duas versões, ela repete o processo gerando enxuto e agressivo.

## Integrações e ferramentas

- **auto-editor** — a ferramenta que detecta o silêncio e faz os cortes.
- **FFmpeg / ffprobe** — o motor de vídeo por baixo (o auto-editor trabalha sobre o FFmpeg); o ffprobe é usado pra medir a duração dos vídeos.
- **Python** — roda o script que orquestra tudo (`scripts/cortar_respiros.py`).

## Pré-requisitos

- **Python** instalado na máquina.
- **auto-editor** instalado (via `pip install auto-editor`).
- **FFmpeg** e **ffprobe** disponíveis no PATH do sistema (precisam estar instalados e acessíveis pelo terminal).

Nenhuma chave de API ou login é necessário — roda 100% local na máquina.

## Dicas e observações

- **Rode no clipe de fala cru, antes de qualquer edição.** Como a ferramenta re-encoda o vídeo (gera um MP4 novo), qualquer overlay, legenda ou B-roll já "chapado" no arquivo vai junto e pode ficar estranho com os cortes. Use a skill no vídeo gravado limpo, sem motion/legenda ainda.
- **Esta é a etapa antes de gerar a legenda.** Os tempos do vídeo mudam depois do corte, então primeiro corte os respiros, escolha a versão final e só depois gere o SRT (ver skill `gerar-srt`).
- **Na primeira vez, peça as duas versões** (enxuto e agressivo), compare as durações e escolha o ponto que ficou melhor.
- **Margem é o "tempo de respiro" que sobra em volta de cada fala.** Margem maior = mais natural (mantém pausas curtas); margem menor = mais corrido. É o que separa o "natural" do "robótico/picotado".
- **Se ficar picotado demais**, peça uma versão menos agressiva (mais margem). **Se sobrar respiro**, peça uma versão mais agressiva ou suba o limiar de silêncio (pra pegar respiros mais "altos" que passaram batido).
- **Sempre assista o resultado** antes de usar, conferindo se nenhum corte cortou colado demais e comeu o início de uma palavra.
- **Vídeos longos demoram** pra processar (o re-encode leva tempo) — é normal.
