# /criar-script — Roteiros de vídeo prontos pra gravar (anúncio e conteúdo)

> Você responde algumas perguntas e envia um guia de voz; a skill devolve roteiros prontos pra alguém ler e gravar — no tom dessa pessoa, no tempo certo e na linguagem da plataforma.

## O que faz
Cria **roteiros/scripts de vídeo curto** — tanto para **anúncio pago** quanto para **conteúdo orgânico**.
Você manda um *voice guide* (guia de voz/tom de quem vai gravar) e o roteiro sai escrito naquela voz,
aplicando boas práticas atuais de hook, estrutura e CTA. É genérica: serve pra qualquer marca, produto
ou pessoa — nada vem embutido, você informa tudo na conversa.

## Quando usar
- "cria um roteiro pra esse anúncio"
- "me dá um script pra gravar um reel sobre X"
- "roteiro pra LinkedIn / TikTok / Shorts"
- "escreve 3 variações de script pra testar"
- colar um voice guide e pedir roteiros

## O que você precisa dar
A skill pergunta (numa rodada só):
1. **Anúncio ou conteúdo orgânico?**
2. **Plataforma** (Instagram, TikTok, YouTube Shorts, X, LinkedIn — pode ser mais de uma).
3. **Duração** (se for anúncio: 6s, 15s, 30s, 60s).
4. **Voice guide** — o guia de voz/tom de quem vai gravar (arquivo, link ou texto colado).
5. **Produto** — se é um que o assistente já conhece, ou um novo. Se for novo, ela pergunta: o que é,
   público, promessa/benefício, diferenciais e prova (reais), oferta/próximo passo.
6. **Ângulo** (opcional) — se você tem um recorte, ou deixa ela propor.

## O que ela entrega
- Roteiros prontos pra gravar, com **hook (0-3s), corpo e CTA**, marcações de tempo, direção de gravação
  (entonação/energia) e sugestão de texto-na-tela.
- **Anúncio:** 2-3 variações do mesmo conceito (ângulos diferentes) pra testar A/B.
- **Conteúdo:** 2-3 opções de hook e, se útil, formato alternativo.
- **Multiplataforma:** versões adaptadas (duração/tom/legenda/CTA) por plataforma.
- Opção de salvar tudo num arquivo `.md` pra levar pra gravação.

## Como funciona (passo a passo resumido)
1. Faz o briefing (as perguntas acima).
2. Escolhe framework, tipo de hook e formato com base nas boas práticas.
3. Escreve o roteiro na sua voz, no tempo e na linguagem da plataforma.
4. Entrega na conversa e oferece salvar / gerar variações / mandar pra legenda.

## Integrações e ferramentas
- Não depende de nenhuma API paga. Usa o próprio Claude + a referência de boas práticas embutida.
- Pode usar busca na web pra checar uma tendência pontual, se necessário.
- Combina bem com `/gerar-srt` (legenda depois de gravar) e `/editar-video-motion` (edição).

## Pré-requisitos
- Nenhuma chave de API.
- Ter em mãos o **voice guide** da pessoa que vai gravar e os **dados do produto** (se for novo).
  Sem isso o roteiro fica genérico — a skill vai pedir.

## Dicas e observações
- A base técnica está em [`reference/boas-praticas-roteiro.md`](reference/boas-praticas-roteiro.md)
  (tipos de hook, frameworks, formatos de anúncio vs orgânico, durações, diferenças por plataforma,
  CTA e retenção — pesquisa 2025-2026). Atualize esse arquivo quando as boas práticas mudarem.
- Regra de ouro de tempo: **6s = 1 ideia · 15s = hook+1 mensagem+CTA · 30s = +1 prova · 60s = narrativa completa.**
- Anúncio que performa **parece orgânico** — nada de "comercial de TV".
- Nunca inventa número/caso: o que você não fornecer vira `[preencher]` no roteiro.
