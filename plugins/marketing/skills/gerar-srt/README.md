# /gerar-srt — Legenda na tela (.srt) para Reels e vídeos

> Gera o arquivo de legenda `.srt` (aquele texto que aparece na tela do vídeo) a partir do vídeo do Eric ou de um print do roteiro, já com os termos técnicos corrigidos e pronto pra importar no CapCut.

## O que faz
Cria o **arquivo de legenda `.srt`** — a legenda que aparece **na tela** do Reel/vídeo, sincronizada com a fala. Funciona de dois jeitos:

- **A partir do vídeo (recomendado):** transcreve a fala automaticamente (com a ferramenta Whisper, que roda no próprio computador) e já calcula os tempos certos de cada legenda.
- **A partir de um print do roteiro do Ray Jam:** quando não há vídeo, monta o `.srt` a partir do texto do roteiro, com os tempos estimados.

Em ambos os casos, ela corrige sozinha os erros que a transcrição costuma cometer com nomes técnicos (ex: escreve "cloud" quando o certo é "Claude") e sinaliza os termos que precisam de uma conferida manual.

> **Atenção:** isto **não** é a legenda do post (o texto que vai na descrição do feed). É só o arquivo de legenda que aparece **na tela** do vídeo.

## Quando usar
Use quando o Eric pedir algo como:

- "gera o SRT desse vídeo"
- "faz a legenda desse Reels"
- "transcreve esse vídeo"
- "cria as legendas"
- ou mandar **um vídeo** (ou **um print do roteiro do Ray Jam**) pedindo a legenda

## O que você precisa dar
Uma das duas entradas abaixo:

- **O vídeo** (caminho do arquivo `.mp4`) — de preferência **a versão final que vai ao ar** (por exemplo a versão enxuta, já sem os respiros). Assim a legenda bate certinho com a fala. **Esta é a melhor opção.**
- **Ou um print do roteiro do Ray Jam** — quando ainda não existe o vídeo. Nesse caso também é bom informar a **duração total da fala em segundos** (para distribuir os tempos).

## O que ela entrega
- Um arquivo **`.srt`** salvo na mesma pasta do vídeo (ou ao lado do texto), já com os termos técnicos corrigidos.
- Um **resumo do que foi corrigido** e a lista de termos que foram conferidos no contexto.
- A **instrução de como importar no CapCut** (Texto → Legendas → Importar arquivo de legenda).

No caminho a partir do print, o `.srt` sai com **tempo estimado** — o aviso de que a sincronia provavelmente vai precisar de um ajuste fino no CapCut já vem junto.

## Como funciona (passo a passo resumido)

**Caminho A — a partir do vídeo (recomendado)**
1. A skill roda o Whisper localmente para transcrever a fala do vídeo.
2. Por padrão, quebra a legenda em **trechos curtos (até 4 palavras)** colados na fala — estilo Reels, em vez de uma frase grande parada na tela.
3. Aplica as correções automáticas dos termos técnicos.
4. O Claude **revisa** o `.srt`, conferindo contra o roteiro os termos sensíveis ao contexto.
5. Entrega o caminho do `.srt` + resumo das correções + como importar no CapCut.

**Caminho B — a partir do print do Ray Jam (sem vídeo)**
1. O Claude lê o print e transcreve o roteiro, um segmento de legenda por linha.
2. Estima/pergunta a duração total da fala.
3. Monta o `.srt` distribuindo o tempo proporcional ao tamanho de cada trecho (**tempo aproximado**).
4. Confere os termos técnicos (já costumam vir certos por saírem do roteiro).

## Integrações e ferramentas
- **Whisper local** — transcrição automática de fala em texto, rodando no próprio computador (não precisa de internet nem de serviço pago). Lê o `.mp4` direto, sem precisar extrair o áudio antes.
- **Correção automática de termos técnicos** — uma lista de erros comuns que a transcrição comete no nicho de IA/marketing é corrigida sozinha (ex: "cloud" → **Claude**, "git hub" → **GitHub**, "mcp" → **MCP**, "you tube" → **YouTube**, "linked in" → **LinkedIn**).
- **Conferência guiada por contexto** — termos que dependem da frase (o mais importante: **Markdown**, o *formato*, versus **MarkItDown**, a *ferramenta da Microsoft*) e nomes de marca/produto (Anthropic, Opus, Fable, Nano Banana, Kling, Super SDR, ChatGuru) são sinalizados para revisão manual, não trocados às cegas.
- **CapCut** — destino final: o `.srt` é importado lá como faixa de legenda.

## Pré-requisitos
- **Whisper** instalado no computador (`openai-whisper`).
- **ffmpeg** disponível no sistema.
- **Python** para rodar os scripts da skill.

> Esses itens já estão instalados na máquina do Eric. Esta skill **não** usa chaves de API nem serviços online — roda tudo localmente.

## Dicas e observações
- **Prefira sempre o vídeo ao print.** O vídeo dá os tempos reais e o texto certo; o print só tem o texto, então o tempo é estimado e quase sempre precisa de ajuste no CapCut.
- **Mande a versão final do vídeo** (a que vai ao ar, ex: a enxuta sem respiros) — assim a legenda bate certinho.
- O tamanho dos trechos da legenda pode ser ajustado: trechos mais curtos ou mais longos, ou voltar para o modo de frase inteira, conforme a preferência.
- Se o vídeo final tiver B-roll em tela cheia por cima, a legenda precisa ficar **acima de tudo** — importar numa faixa de texto no topo do CapCut, ou queimar a legenda só no export final.
- A revisão de **Markdown vs MarkItDown** e de **números/claims** (ex: "140 mil estrelas", "70%", preços) é sempre feita conferindo o roteiro — não confie só na transcrição automática.
