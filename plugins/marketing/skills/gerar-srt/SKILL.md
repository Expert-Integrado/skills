---
name: gerar-srt
description: "Gera arquivo de legenda .srt para Reels/vídeos do Eric a partir do vídeo (Whisper local) ou de um print do roteiro do Ray Jam, e corrige os termos técnicos que o ASR erra (Claude, MarkItDown, MCP, GitHub, etc.). Usar quando o Eric pedir 'gera o SRT', 'faz a legenda desse vídeo', 'transcreve esse vídeo', 'cria as legendas', 'legenda do Reels', ou mandar um vídeo/print do Ray Jam pedindo legenda. NÃO usar para o texto do post/feed (essa é a legenda da descrição, não o arquivo de legenda na tela) — nem para cortar respiros do vídeo (skill cortar-respiros)."
argument-hint: "[caminho-do-video.mp4] | [--print] [--duration SEG] [--model small|medium] [--out DIR]"
allowed-tools: Read, Write, Edit, Bash
---

# Gerar SRT (legenda na tela)

Produz um arquivo `.srt` pronto pra importar no CapCut, com os termos técnicos do nicho de IA/marketing corrigidos. Duas entradas possíveis: **vídeo** (recomendado — Whisper dá timestamps reais + texto via ASR) ou **print do roteiro do Ray Jam** (só texto, sem áudio → tempo estimado, exige ajuste no editor). Este é o arquivo de legenda que aparece NA TELA do vídeo, NÃO o texto do post/feed.

## NUNCA
- NUNCA confundir com o texto do post (descrição do feed) — esta skill só gera o arquivo `.srt` que aparece na tela.
- NUNCA corrigir automaticamente os termos da lista REVISAR (Markdown/MarkItDown, nomes de marca, números/claims) — o script SÓ os sinaliza; a troca é decisão de contexto do Claude conferindo o roteiro.
- NUNCA trocar "Markdown" (o formato) por "MarkItDown" (a ferramenta da Microsoft) sem confirmar pelo contexto da frase — o Whisper escreve "Markdown" pros dois.
- NUNCA extrair o áudio antes de rodar o Whisper — ele lê o `.mp4` direto (usa ffmpeg interno).
- NUNCA usar `\` (barra invertida) no path ao chamar o script pelo Bash do Windows — usar barra normal (`C:/...`).

## SEMPRE
- SEMPRE preferir o VÍDEO ao print. Se o Eric perguntar o que é mais fácil, recomendar mandar o **vídeo já editado** (a versão que vai ao ar, ex: a enxuta sem respiros) — assim o SRT bate certinho.
- SEMPRE revisar o `.srt` gerado (ler + `Edit`) antes de entregar — a revisão de termos sensíveis ao contexto é o trabalho do Claude, não do script.
- SEMPRE conferir os termos sinalizados em "REVISAR:" contra a fonte de verdade textual (roteiro/print/legenda — ver "De onde vem o roteiro original" na seção Correções) quando houver dúvida; SE não existir nenhuma fonte textual, transcrever literal e sinalizar o item ao Eric, NUNCA adivinhar/alterar.
- SEMPRE avisar que o tempo é aproximado quando a entrada for o print (caminho B) — o sync vai precisar de ajuste fino no CapCut.
- SEMPRE entregar: caminho do `.srt` + resumo do que foi corrigido + instrução de importar no CapCut.

## Pré-requisitos
- `openai-whisper` instalado e `ffmpeg` no PATH (já estão na máquina do Eric). O `ffprobe` (usado no Caminho A pra medir a duração do vídeo e decidir background) vem junto com o `ffmpeg`.
- Python pra rodar os scripts. Detectar e resolver o binário no MESMO comando Bash (o estado do shell NÃO persiste entre chamadas): `PY=$(command -v python3 || command -v python || true); [ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"`. No PC do Eric o Python não está no PATH (ver CLAUDE.md) — por isso o fallback pro binário 3.12 documentado; em Linux/VPS a detecção resolve sozinha. Os comandos abaixo já embutem essa linha.
- Scripts e referência ficam DENTRO da pasta desta skill: `scripts/gerar_srt.py` (vídeo), `scripts/srt_from_text.py` (print) e `references/correcoes-comuns.md`. Esses nomes são relativos à pasta da skill — resolva o caminho ABSOLUTO dela no Preparo abaixo ANTES de qualquer comando. O cwd do Bash NÃO é garantido nessa pasta (e reseta entre chamadas), então nunca chame `scripts/...` / `references/...` "cru": sempre com o caminho absoluto que o Preparo imprime.

## Preparo — resolver o diretório da skill (rodar 1x, no início)
`CLAUDE_PLUGIN_ROOT` é a env var que o Claude Code exporta apontando pra raiz do plugin `marketing` (a pasta que contém `.claude-plugin/plugin.json`), dentro da qual esta skill fica em `skills/gerar-srt`. NÃO chute `~/.claude/...`: o hash de versão varia e o path quebra. Rode este bloco (Bash) — ele resolve o Python (`PY`) e o diretório da skill, e valida que os scripts existem:

```bash
PY=$(command -v python3 || command -v python || true); [ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/gerar-srt"
[ -f "$SKILL_DIR/scripts/gerar_srt.py" ] || SKILL_DIR="$(dirname "$(dirname "$(find "$HOME" -type f -name gerar_srt.py -path '*gerar-srt*' 2>/dev/null | head -n1)")")"
SKILL_DIR_WIN="$(cygpath -m "$SKILL_DIR" 2>/dev/null || echo "$SKILL_DIR")"
echo "PY=$PY"; echo "SKILL_DIR=$SKILL_DIR"; echo "SKILL_DIR_WIN=$SKILL_DIR_WIN"
test -f "$SKILL_DIR/scripts/gerar_srt.py" && echo "scripts: OK" || echo "scripts: NAO ENCONTRADO"
```
- ANOTE os três valores impressos. Use SEMPRE o caminho absoluto: `"$SKILL_DIR/scripts/..."` dentro do Bash; `<SKILL_DIR_WIN>/references/...` nas tools `Read`/`Edit` (elas exigem path absoluto — `Read references/...` relativo NÃO funciona; substitua `<SKILL_DIR_WIN>` pela string exata que o `echo` imprimiu).
- SE `CLAUDE_PLUGIN_ROOT` vier vazia (skill rodando fora de plugin, ex.: cópia local do repo), o `find` acha `gerar_srt.py` pelo nome e sobe 2 níveis (arquivo → pasta `scripts/` → pasta da skill) pra montar o `SKILL_DIR`.
- SE imprimir `scripts: NAO ENCONTRADO` → a skill não está instalada corretamente: avisar o Eric e parar.
- Como o shell reseta entre chamadas, cada bloco de comando abaixo já re-resolve `PY` e `SKILL_DIR` nas 2 primeiras linhas (idempotente) — ou substitua pelos valores que você anotou.

## Escolher o caminho
- **Entrada = arquivo LOCAL no disco.** O vídeo (ou o print) chega como um CAMINHO de arquivo; quem baixa o anexo do chat (Telegram/WhatsApp/etc.) é o fluxo do canal ANTES desta skill — ela não baixa anexo (`allowed-tools` não tem tool de download). SE o Eric anexou algo mas você não recebeu um path local pra ele, PARAR e pedir o caminho do arquivo, nunca adivinhar.
- SE o Eric mandou um **vídeo** (`.mp4`) → **Caminho A**.
- SE o Eric mandou um **print do roteiro do Ray Jam** (imagem, sem vídeo) → **Caminho B**.
- SE não ficou claro qual entrada existe → perguntar UMA vez qual ele tem, recomendando o vídeo.

## Caminho A — a partir do VÍDEO (recomendado)

1. **Rodar o Whisper + correções automáticas:**
   ```bash
   PY=$(command -v python3 || command -v python || true); [ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
   SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/gerar-srt"; [ -f "$SKILL_DIR/scripts/gerar_srt.py" ] || SKILL_DIR="$(dirname "$(dirname "$(find "$HOME" -type f -name gerar_srt.py -path '*gerar-srt*' 2>/dev/null | head -n1)")")"
   "$PY" "$SKILL_DIR/scripts/gerar_srt.py" "<caminho-do-video>.mp4"
   ```
   - **Modelo:** default `small`. Trocar pra `--model medium` (senão, ficar no `small`) SÓ quando QUALQUER uma for verdadeira — critério verificável, não "achismo":
     - (a) O Eric pediu explícito: passou `--model medium` no comando, OU escreveu no pedido uma destas palavras: "capricha", "precisão", "modelo maior", "vídeo final", "importante".
     - (b) Fallback pós-revisão: você já rodou o `small`, revisou o `.srt` (passo 3) e sobraram ≥2 termos técnicos/nomes próprios que o Whisper quebrou tanto que nem consultando a fonte de verdade textual (ver seção Correções) dá pra recuperar a grafia certa → re-rodar o MESMO vídeo com `--model medium` e comparar. (`medium` é ~3x mais lento que o `small` — rodar em background, ver abaixo.)
   - Por padrão o `.srt` sai na MESMA pasta do vídeo. SE precisar gravar em outra pasta (ex: quando a skill `criar-reel` chama este script via `../gerar-srt/scripts/gerar_srt.py ... --model medium --out "$REEL"`) → adicionar `--out <pasta>`. Contrato do script (não mudar): posicional `<video>` + `--model`, `--lang`, `--out`, `--words`.
   - Legendas curtas (padrão): o script quebra em trechos de até 4 palavras coladas na fala (timestamps por palavra do Whisper), pra não deixar uma frase de 3–4 linhas parada na tela por vários segundos. Ajustar com `--words N` (ex: `--words 3` mais curto, `--words 5` mais longo); `--words 0` volta ao modo frase-inteira.
   - **Foreground x background — decidir ANTES de rodar, por critério medido (não por palpite de "longo"):** rodar em **background** (`run_in_background: true`) SE QUALQUER uma:
     - Duração do vídeo ≥ 60s. Medir: `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "<caminho-do-video>.mp4"` → imprime os segundos (ex.: `84.3`). SE o `ffprobe` faltar ou falhar → tratar como ≥60s (background por segurança).
     - OU o modelo ainda não foi baixado nesta máquina (o Whisper baixa na 1ª vez): o arquivo `~/.cache/whisper/<model>.pt` não existe — `small.pt` ~500MB, `medium.pt` ~1,5GB. Verificar: `test -f ~/.cache/whisper/small.pt` (troque `small` pelo modelo que vai usar).
     - SENÃO (vídeo < 60s E o modelo já em cache) → rodar em **foreground** normal. Nota: o custo é só tempo de espera — em caso de dúvida, background nunca prejudica (só desacopla a execução).
2. **Validar:** o script imprime `-> N correções automáticas aplicadas.`, o caminho `SRT pronto: <path>` e, quando houver, um bloco `REVISAR (termos sensíveis ao contexto...)` listando os termos a checar.
   - SE o script sair com `ERRO: 'whisper' não está no PATH` → ver Erros comuns abaixo.
   - SE o script sair com `ERRO: SRT não gerado` → ver Erros comuns abaixo.
3. **Revisar o `.srt` (trabalho do Claude):** `Read` no arquivo gerado (caminho absoluto que o script imprime em `SRT pronto: <path>`) e usar `Edit` pra corrigir os termos sinalizados em "REVISAR:", conferindo contra a fonte de verdade textual (ver "De onde vem o roteiro original" na seção Correções). Consultar `<SKILL_DIR_WIN>/references/correcoes-comuns.md` (caminho absoluto do Preparo) — em especial a distinção **Markdown (formato) vs MarkItDown (ferramenta)**, que o script não decide sozinho.
4. **Entregar** no formato do template abaixo.

## Caminho B — a partir do PRINT do Ray Jam (sem vídeo)

1. **Transcrever o roteiro:** `Read` na imagem do print e escrever o texto num arquivo em caminho absoluto conhecido — use `C:/tmp/gerar-srt-segmentos.txt` (Windows) ou `$(mktemp -d)/segmentos.txt` (Linux/VPS) — com **um segmento de legenda por linha** (juntar/quebrar linhas em trechos que façam sentido como legenda). Guarde esse caminho: os passos 2 e 3 usam o MESMO arquivo.
2. **Definir a duração total** da fala em segundos (é o que vai no `--duration` do passo 3).
   - SE o Eric informou os segundos → usar o valor dele.
   - SENÃO → estimar pela contagem de palavras do roteiro, com esta fórmula (não chutar):
     1. Contar as palavras do arquivo do passo 1: `wc -w < "C:/tmp/gerar-srt-segmentos.txt"` → chame de N.
     2. `duração_segundos = arredondar_pra_cima(N / 2,5)` — 2,5 palavras/s ≈ 150 palavras/min, ritmo de fala normal em PT-BR (ex.: N=90 → 36s; N=140 → 56s).
     3. Usar esse número no `--duration` e AVISAR o Eric que é estimativa: o script distribui o tempo proporcional ao tamanho de cada linha, então o sync fino sai no CapCut.
3. **Gerar o SRT com tempo estimado:**
   ```bash
   PY=$(command -v python3 || command -v python || true); [ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
   SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/gerar-srt"; [ -f "$SKILL_DIR/scripts/srt_from_text.py" ] || SKILL_DIR="$(dirname "$(dirname "$(find "$HOME" -type f -name gerar_srt.py -path '*gerar-srt*' 2>/dev/null | head -n1)")")"
   "$PY" "$SKILL_DIR/scripts/srt_from_text.py" "C:/tmp/gerar-srt-segmentos.txt" --duration <segundos>
   ```
   - Use o MESMO arquivo do passo 1 no lugar de `C:/tmp/gerar-srt-segmentos.txt`. O `.srt` sai por padrão ao lado dele, com a mesma base e extensão `.srt` (ex.: `C:/tmp/gerar-srt-segmentos.srt`); pra gravar em outro lugar, adicionar `--out <caminho.srt>`.
   - Distribui o tempo proporcional ao tamanho de cada linha. **É aproximado** — avisar o Eric que o sync vai precisar de ajuste fino no CapCut.
4. **Conferir os termos técnicos:** já costumam vir certos (saíram do roteiro), mas aplicar a mesma revisão do Caminho A (ler + `Edit`, conferindo `<SKILL_DIR_WIN>/references/correcoes-comuns.md` — caminho absoluto do Preparo).
5. **Entregar** no formato do template abaixo, incluindo o aviso de tempo estimado.

## Correções de termos (referência rápida)

Corrigidos AUTOMATICAMENTE pelo script (alta confiança):
- "cloud" / "clod" / "claud" / "claudi" / "Cláudio" → **Claude**
- "chat gpt" → **ChatGPT** · "git hub" → **GitHub** · "you tube" → **YouTube** · "linked in" → **LinkedIn**
- "mcp" → **MCP** · "api" → **API** · "iá" (com acento) → **IA** · "pdf" → **PDF**

REVISAR SEMPRE no contexto (o script só sinaliza, não troca):
- **Markdown vs MarkItDown:** "Markdown" é o *formato*; "MarkItDown" é a *ferramenta da Microsoft*. Decidir pela frase: "a ferramenta chama ___" → MarkItDown; "converte em ___ limpo" / "entende ___" → Markdown; CTA "comenta ___" → conferir a palavra escolhida no roteiro.
- **Nomes de produto/marca:** Fable 5, Opus, Anthropic, Expert Integrado, Nano Banana, Kling, Super SDR, ChatGuru — conferir grafia e maiúsculas.
- **Números e claims:** confirmar o número certo (ex: "140 mil estrelas", "70%", preços) contra a fonte de verdade textual definida abaixo. SEM fonte textual, não "corrigir": transcrever o que o áudio diz e sinalizar ao Eric.

**De onde vem o "roteiro original" pra conferir (a fonte de verdade textual), em ordem de prioridade:**
1. O print/roteiro do Ray Jam, SE o Eric anexou (Caminho B sempre tem; no Caminho A ele pode ter mandado o vídeo + o roteiro escrito junto).
2. O texto/legenda do post que acompanha o Reels, se o Eric passou.
3. SE o vídeo veio da skill `criar-reel`: o arquivo de roteiro/cenas dessa produção (`cenas.txt`, que a `criar-reel` grava na MESMA pasta do vídeo final). Como CONFERIR em vez de supor: `ls "$(dirname "<caminho-do-video>")"` e ver se há um `cenas.txt` ali — SE existe, é esta a fonte de verdade; SE não existe, o vídeo não saiu da `criar-reel` (ou foi movido pra fora da pasta) → seguir a cadeia pra prioridade 4.
4. SE NÃO existe NENHUMA dessas fontes (Caminho A puro — só o vídeo, sem print/roteiro/legenda): não há contra o que validar. Nesse caso NÃO invente nem "corrija" número/nome — transcreva o que o áudio diz literalmente e, na entrega, SINALIZE ao Eric os números/claims ouvidos pra ele confirmar (ex.: "ouvi '140 mil estrelas' e '70%' no áudio, sem roteiro pra conferir — confirma?"). Nunca alterar um número sem fonte (não inventar nem inverter fato).

Lista completa e regras em `<SKILL_DIR_WIN>/references/correcoes-comuns.md` (caminho absoluto do Preparo).

## Notas / edge cases
- Rodar Python com path em barra normal (`C:/...`) no Bash do Windows — nunca barra invertida.
- O Whisper lê o `.mp4` direto (usa ffmpeg interno) — não precisa extrair áudio antes.
- Se o vídeo final tiver B-roll em tela cheia por cima, a legenda precisa ficar acima de tudo — importar o SRT numa faixa de texto no topo do CapCut, OU queimar a legenda só no export final.
- Esta skill roda tudo localmente — não usa chaves de API nem serviços online.

## Template de entrega (literal)

```
Legenda pronta: {caminho-do-arquivo.srt}

Correções: {N} automáticas + {lista dos termos revisados manualmente, ex: "MarkItDown (era Markdown), '140 mil estrelas' conferido"}

Importar no CapCut: Texto → Legendas → Importar arquivo de legenda.
```

Quando for Caminho B (print), acrescentar a linha:
```
Tempo ESTIMADO (sem áudio): o sync provavelmente vai precisar de ajuste fino no CapCut.
```

Quando sobrarem termos do bloco "REVISAR:" que ficaram SEM fonte de verdade textual pra conferir (Caminho A puro — só o vídeo, prioridade 4 da seção Correções), acrescentar ao FINAL do template a linha de sinalização, neste formato:
```
Sem roteiro pra conferir, ouvi no áudio: {termos/números ouvidos, ex: "'140 mil estrelas', '70%'"} — confirma?
```

## Validação final (checklist)
- [ ] Arquivo `.srt` existe no path reportado pelo script.
- [ ] Todos os termos do bloco "REVISAR:" foram checados no `.srt` contra a fonte de verdade textual — ou sinalizados ao Eric quando não houver fonte.
- [ ] Markdown vs MarkItDown resolvido pelo contexto (não às cegas).
- [ ] Números/claims conferidos (estrelas, %, preços).
- [ ] Entrega segue o template (caminho + resumo de correções + instrução CapCut).
- [ ] Se Caminho B: aviso de tempo estimado incluído.

## Erros comuns e recovery
- `ERRO: 'whisper' não está no PATH` → o Whisper não está instalado/acessível. Instalar: `pip install -U openai-whisper`. Reportar ao Eric se a instalação exigir permissão/ambiente que você não pode alterar, e parar.
- `ERRO: SRT não gerado em <path>` → o Whisper rodou mas não produziu o `.srt` (falta ffmpeg no PATH, arquivo de vídeo corrompido, ou modelo não baixou). Confirmar `command -v ffmpeg`; se faltar, reportar. Reexecutar 1x; se persistir, reportar ao Eric.
- `ERRO: arquivo não encontrado: <path>` → path errado. Conferir o caminho do vídeo (barra normal, sem aspas quebradas) e reexecutar.
- `ERRO: arquivo de segmentos vazio.` (Caminho B) → o arquivo do passo 1 (`C:/tmp/gerar-srt-segmentos.txt`) está sem conteúdo. Reescrever com os segmentos do print (uma legenda por linha) e reexecutar.
- Whisper demora muito / trava → rodar em background e monitorar; a 1ª execução baixa o modelo.

## Recursos
Todos dentro da pasta desta skill (o `$SKILL_DIR`/`SKILL_DIR_WIN` resolvido no Preparo):
- **`scripts/gerar_srt.py`** — Whisper + correções automáticas (entrada = vídeo).
- **`scripts/srt_from_text.py`** — SRT com tempo estimado (entrada = texto do print).
- **`references/correcoes-comuns.md`** — lista de erros de ASR do nicho e regras de revisão.
