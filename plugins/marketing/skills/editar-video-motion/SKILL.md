---
name: editar-video-motion
description: "Edita um vídeo gravado (talking-head do Eric ou de qualquer pessoa) num vídeo final PRONTO com motion graphics por cima — corta os erros/retakes/respiros da gravação, monta o vídeo-base limpo com áudio sincronizado, e mixa gráficos animados (lower-thirds, listas, cards de seção que mascaram os cortes, contadores, PiP no canto, chips, end card de CTA) na identidade da marca. Renderiza em 16:9 (1920x1080), 9:16 (1080x1920) e 1:1 (1080x1080). Usar quando o João/Eric pedir 'edita esse vídeo', 'transforma essa gravação em vídeo com motion', 'bota uns gráficos nesse vídeo', 'faz a versão 9x16 desse vídeo', 'corta os erros desse vídeo e bota motion', ou mandar um vídeo gravado pra virar peça final. NÃO usar quando o pedido for gerar avatar ou voz sintética (isso é a skill criar-reel), nem pra vídeo 100% motion sem gravação de base."
argument-hint: "[video-gravado.mp4] [--formato 16:9|9:16|1:1|todos] [--landing URL] [--identidade dark-azul]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot
---

# Editar Vídeo com Motion (talking-head + gráficos)

Transforma uma gravação crua (alguém falando pra câmera, com erros e retakes) num vídeo final editado: corta os erros, deixa a fala corrida e sincronizada, e mixa motion graphics por cima — ora a pessoa em tela cheia com gráfico em volta, ora corta pra motion full (cobrindo a pessoa), ora a pessoa num quadradinho (PiP) com o motion tomando a tela. Renderiza em qualquer proporção. O vídeo gravado é a BASE: NÃO gera avatar nem TTS — usa a fala real da pessoa. (Validado em 24/06/2026 no vídeo do ecossistema Expert Integrado: 8min de gravação crua do Eric → 3min editado com Mentoria + AI Innovation Lab + CTA, em 16:9, voz real, motion sincronizado.)

## NUNCA
- NUNCA anime degradê/glow/grid sobre fundo escuro (scale/opacity no fundo) → gera flicker de banding no H.264. Decorativos SEMPRE estáticos + camada `.grain`. O movimento vem das ENTRADAS dos elementos, não do fundo.
- NUNCA deixe respiro/silêncio sobrando nas emendas (defeito nº1 percebido pelo cliente). Corte exatamente no `end` da última palavra (+0.10–0.15s no máximo).
- NUNCA deixe a pessoa "piscar" em tela cheia (~1s) na troca de PiP→card ou card→take. Use o handoff "cobre antes de revelar".
- NUNCA renderize a 60fps quando há vídeo-base (duplica frames, dobra tamanho/tempo, zero ganho). 60fps só em peça 100% motion (sem vídeo).
- NUNCA "corrija" o vídeo por erro do STT: o ElevenLabs Scribe troca termos técnicos ("MCP", "Claude") e números — isso é o RECONHECIMENTO, o áudio real está certo. Use o STT só pros TIMESTAMPS.
- NUNCA passe o caminho da fonte pro Python como `/c/Users/...` (formato MinGW) — o Python nativo do Windows não entende. Use `C:/Users/...`.
- NUNCA gere avatar ou voz sintética aqui — isso é a skill `criar-reel`.

## SEMPRE
- SEMPRE rode `npx hyperframes lint` antes de renderizar e corrija todos os erros.
- SEMPRE use UMA paleta, UMA fonte display (Space Grotesk), contraste de peso 300↔700.
- SEMPRE embuta a fonte via `@font-face` apontando pros `.woff2` (fontes NÃO são auto-resolvidas pelo HyperFrames).
- SEMPRE `fps` do render = fps do vídeo-base (geralmente 30).
- SEMPRE mascare todo corte entre takes com card de seção OU punch-in (zoom 1.05→1) OU sob o fade de um card.
- SEMPRE verifique o render por amostras de frames (um por seção + pontos de transição) antes de entregar.

## Pré-requisitos (checar no início — nesta ordem)

### 1. Binários e HyperFrames (detecção de capacidade)
- **Node ≥ 22 + FFmpeg + HyperFrames.** Checar os três de uma vez: `npx hyperframes doctor`.
  - **HyperFrames NÃO está bundlado nesta skill** — a pasta não tem `package.json` nem script `hyperframes` local; só se chama por `npx hyperframes`, que resolve o pacote `hyperframes` pelo registro npm e baixa na 1ª execução (cache em `~/.cache/hyperframes/`). Faz a composição vídeo+motion; requer Node ≥ 22 + acesso à internet.
  - **Registro/versão do pacote NÃO é confirmável pela pasta da skill.** Se `npx hyperframes doctor` NÃO resolver o pacote (erro de fetch / `E404` / registro) → **PARAR e reportar**: "hyperframes não resolvido via npx — confirmar nome/versão/registro do pacote", sem trocar de registro nem fixar versão sozinho.
  - **Se `doctor` acusar falta de Node / FFmpeg / HyperFrames → NÃO instalar sozinho; PARAR e avisar o Eric** com o componente que falta + o comando de instalação sugerido, e esperar o OK dele (instalar software é side-effect que exige confirmação). Comandos sugeridos no PC do Eric (tem `winget`; NÃO tem `choco`): Node → `winget install OpenJS.NodeJS.LTS`; FFmpeg → `winget install Gyan.FFmpeg`. HyperFrames não se instala à mão (roda por `npx`); se ele faltar no `doctor`, quase sempre é Node < 22 ou falta de rede.
- **FFmpeg + ffprobe + curl no PATH** (os scripts chamam via subprocess). Checar: `command -v ffmpeg && command -v ffprobe && command -v curl` (os três devem imprimir um caminho). Se faltar ffmpeg/ffprobe, mesmo tratamento acima (avisar + `winget install Gyan.FFmpeg`, não instalar sozinho).

### 2. Python 3.12+ (`$PY`)
```bash
PY=$(command -v python3 || command -v python)
"$PY" --version   # DEVE imprimir "Python 3.1x" (3.12+)
```
- **Se `"$PY" --version` NÃO imprimir "Python 3.1x"** (vier vazio, der erro, ou abrir a Microsoft Store — no PC do Eric o `python3` do PATH costuma ser o stub da Store), **OU se `$PY` vier vazio**, use como fallback final o caminho absoluto do Python 3.12 do PC Windows do Eric: `PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"` — SEMPRE entre aspas (tem espaço no caminho). Confirme que o arquivo existe: `[ -f "$PY" ] && echo OK || echo AUSENTE`. **Se nem esse caminho existir** (outro PC / sem Python 3.12) → **PARAR e reportar** que falta Python 3.12 — instalar Python é side-effect que exige OK do Eric, não instalar sozinho. Nos comandos abaixo, `"$PY"` = esse interpretador confirmado.

### 3. Chave ElevenLabs (Scribe STT)
- O `scripts/transcribe.py` procura NESTA ordem: (1) env var `ELEVENLABS_API_KEY`; (2) `C:/MCPs/elevenlabs.env`; (3) `~/.config/elevenlabs.env`; (4) `~/elevenlabs.env`. Em ambiente sem esses arquivos, exportar a env var a partir do cofre: `export ELEVENLABS_API_KEY=$(op read "op://Agentes Eric/ELEVENLABS_API_KEY/credential")` (detectar `op` com `command -v op`).

### 4. Diretório de trabalho, paths e fps (definir ANTES do Passo 1)
- **`SKILL`** = a pasta absoluta desta skill (a que contém este `SKILL.md`; o loader da skill informa esse caminho ao abrir). Guarde: `SKILL="<caminho absoluto desta pasta>"` (no PC, algo como `/c/Users/Eric Luciano/.claude/plugins/.../marketing/skills/editar-video-motion`). Os scripts SEMPRE são chamados por `"$SKILL/scripts/<script>.py"` e as fontes por `"$SKILL/assets/fonts/"` — assim funcionam de qualquer cwd.
- **`WORK`** = diretório de trabalho dedicado: `WORK=$(mktemp -d); cd "$WORK"`. **TODOS os artefatos intermediários nascem AQUI** (no `$WORK`), NUNCA na pasta da skill: `transcript.json`, `<base>-audio.mp3`, `segmentos.txt`, `pieces.json`, `base.mp4`, `narracao-limpa.mp3`, a pasta `projeto/` do HyperFrames e os `projeto/renders/*.mp4`. Rode todos os comandos dos Passos de dentro do `$WORK`.
- **Fonte Space Grotesk:** os `.woff2` (pesos 300/400/500/700) já vêm em `"$SKILL/assets/fonts/"`. São copiados pro `projeto/` no Passo 5 (NÃO são auto-resolvidos pelo HyperFrames).
- **Vídeo de entrada (`$SRC`):** o `.mp4` gravado. Use o caminho absoluto no formato `C:/Users/...` (NUNCA `/c/Users/...` — o Python nativo não entende; ver bloco NUNCA). `SRC="C:/caminho/para/video.mp4"`.
- **fps real do vídeo-base (`$FPS`) — medir ANTES de cortar/renderizar** (a regra é: fps do render = fps do vídeo-base):
  ```bash
  ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate \
    -of default=noprint_wrappers=1:nokey=1 "$SRC"
  # imprime "30/1" (=30), "25/1" (=25), "30000/1001" (=29.97 -> use 30), etc.
  # FPS = numerador/denominador, arredondado pro padrão mais próximo (24/25/30/50/60).
  FPS=30   # SUBSTITUA pelo valor medido acima (talking-head costuma ser 30)
  ```
  Use `"$FPS"` em `cut_base.py --fps` (Passo 3) E em `hyperframes render --fps` (Passo 6) — o MESMO número nos dois.
- **Destino final (`$DL`):** `DL="$HOME/Downloads"` (no PC do Eric = `C:/Users/Eric Luciano/Downloads`, já existe). Cópia final no Passo 6.

---

## Passos

### Passo 0 — Briefing & identidade
Faça UMA rodada de `AskUserQuestion` SÓ pros itens que faltarem no pedido. **Só a identidade visual tem default; formato e conteúdo/estrutura, se não vierem no pedido nem na resposta, são PARADA LEGÍTIMA — aguarde a resposta do usuário, não fabrique.**

1. **Formato(s):** `16:9` (institucional/YouTube), `9:16` (Reels/Stories), `1:1` (feed), ou vários.
   - **Sem resposta:** parada legítima — aguardar. NÃO assumir formato (não há default). O `argument-hint` sugere 16:9, mas é sugestão de flag, não default silencioso.
2. **Identidade visual:** uma de três opções —
   - **Landing page** (usuário passou `--landing URL`): ler `references/identidade.md` e seguir o fluxo com as tools MCP `mcp__playwright__browser_navigate` (abrir a URL) + `mcp__playwright__browser_evaluate` (extrair paleta CSS computada + textos/números dos slides) + `mcp__playwright__browser_take_screenshot` (ver a vibe). WebFetch NÃO serve aqui (não renderiza CSS computado). Se o MCP `playwright` não existir no ambiente (`command -v` não aplica a MCP — checar se a tool está disponível), cair pro padrão dark-azul Expert.
   - **Marca conhecida** que o usuário nomear.
   - **Padrão dark-azul Expert** (default): bg `#070F26` + accent `#2C6BFF`.
   - **Default se não responder:** padrão dark-azul Expert.
3. **Conteúdo/estrutura:** o que a gravação cobre, a ordem narrativa desejada, o CTA.
   - **Sem resposta:** parada legítima — aguardar. NÃO inventar estrutura nem CTA (não há default). Depois que o usuário confirmar, a ordem narrativa vira a KEEP-LIST do Passo 2 (a fala manda; ver `references/identidade.md` §"Sem landing") e os números/áreas dos gráficos saem do que a pessoa DIZ no transcript (não invente números).

**Validação:** seguir só com formato(s) + estrutura/CTA definidos pelo usuário e paleta resolvida (resposta ou default dark-azul Expert). Faltando formato ou estrutura sem resposta = **parar e aguardar**, reportando o que está pendente; só a identidade cai pro default.

### Passo 1 — Transcrição (timestamps por palavra)
```bash
"$PY" "$SKILL/scripts/transcribe.py" "$SRC" transcript.json
```
Gera `transcript.json` (ElevenLabs Scribe, `words[]` com `start`/`end`/`type`) e extrai o áudio cru (`<base>-audio.mp3`).

**Validação:** `transcript.json` existe e tem `words[]` não-vazio (o script imprime `OK -> transcript.json (<Ns>, <N> tokens)`). **Se falhar** com `ERRO STT HTTP <code>`: checar a chave (Pré-requisitos) e o HTTP code; `401` = chave inválida/ausente. **Nota:** o Scribe às vezes erra termos técnicos e números — é o STT, não o áudio. NÃO corrigir o vídeo por isso.

### Passo 2 — Mapa de cortes (achar os takes bons)
```bash
"$PY" "$SKILL/scripts/segment_map.py" transcript.json segmentos.txt
```
`segmentos.txt` = a transcrição quebrada em frases com `[idx] início-fim (dur) texto`, marcando pausas e eventos de áudio (pigarro etc.).

**Leia o `segmentos.txt` e monte a KEEP-LIST** — os trechos bons, na ordem narrativa final, jogando fora:
- retakes / falsos começos (a pessoa erra e refaz a mesma frase — fica o melhor take)
- comentários pra produção ("deixa eu voltar", "tu se vira aí", "João, acho que...")
- pigarros, silêncios longos, a notificação inicial
- flubs no fim de um take ("agentes de A--", "com trabalho fa--")

**Cortes apertados (regra de ouro):**
- Começa ~0.08–0.12s antes da primeira palavra falada.
- Termina ~0.10–0.15s depois da última palavra — **sem deixar respiro/silêncio sobrando** (defeito nº1; pega exatamente o `end` da última palavra no transcript). Cuidado: uma última palavra "esticada" (ex.: "empresaaaa" de 1.1s) é fala, não silêncio — o respiro é o que vem DEPOIS dela.
- **Palavra duplicada na emenda:** se o take A termina em "...negócio. Um" e o take B começa em "Um outro...", corte o "Um" sobrando do fim de A. Pegue os `end` das palavras no transcript pra cortar no ponto exato; confirme depois transcrevendo o trecho cortado.
- Use `ffmpeg -af silencedetect=noise=-32dB:d=0.28` pra achar respiros se precisar (mas respiro = pessoa respirando, não silêncio digital → confie no `end` da palavra).

Detalhes e exemplos: `references/cortes.md`.

**Validação:** KEEP-LIST montada como lista `[["rótulo", início, fim], ...]` em segundos, na ordem narrativa final. **A KEEP-LIST é uma PROPOSTA — apresente-a ao usuário** (rótulos + o que entra/sai, na ordem final) **e aguarde o OK antes de rodar o corte no Passo 3** (corte/render consomem tempo; confirme seleção e ordem antes de gerar o `base.mp4`). **Se falhar** (transcrição confusa, não dá pra separar takes): reler `references/cortes.md` e, em último caso, ouvir/checar o `<base>-audio.mp3` cru.

### Passo 3 — Vídeo-base limpo + MP3
```bash
# KEEP-LIST como JSON pieces.json: [["intro",505.95,515.13],["hook",82.42,96.20], ...]
"$PY" "$SKILL/scripts/cut_base.py" "$SRC" pieces.json --out base.mp4 --target 1920x1080 --fps "$FPS"
"$PY" "$SKILL/scripts/cut_base.py" "$SRC" pieces.json --out narracao-limpa.mp3 --audio   # versão só áudio
```
- `base.mp4` = a pessoa falando, erros removidos, **áudio sincronizado** (lip-sync preservado, mesmo corte).
- O script imprime os **offsets da timeline limpa** por trecho — **guarde**, é o que sincroniza os overlays.
- ⚠️ **Caminho no Python (Windows):** passe `C:/Users/...` (NÃO `/c/Users/...`). O script normaliza `/c/`→`C:/`, mas prefira já passar `C:/`.

**Validação:** `base.mp4` existe; o script imprime `-> base.mp4 (<duração>s)` e `OK` por trecho. **Se falhar** com `FALHA ao cortar <lbl>`: quase sempre é o caminho da fonte — reexecute passando `C:/...`.

### Passo 4 — Plano de motion (sincronizar com a fala)
Pegue os timestamps das palavras-chave já na **timeline limpa**:
```bash
"$PY" "$SKILL/scripts/word_times.py" transcript.json pieces.json   # imprime palavras por trecho em tempo-limpo
```
Mapeie cada batida da narração a um **componente** (biblioteca em `references/componentes.md`):
- **lower-third** (nome/cargo na intro)
- **lista lateral** (dores, ou benefícios/checklist — entram um a um na fala)
- **card de seção / sting full** — cobre a pessoa e **mascara o corte** entre takes (use nas trocas de assunto)
- **contador (count-up)** pra números ("300+ aulas", "30 dias")
- **PiP** — encolhe a pessoa pro canto enquanto um motion full toma a tela (pilares, diagrama)
- **chips de área/lista** que acendem na sequência
- **card de feature** (título + 3 mini-cards)
- **end card** de CTA no fim
- **brand mark** fixo + **section tag** (top-left) por seção

**Regras de transição** (em `references/composicao.md`):
- Todo corte entre takes deve ser mascarado por um card de seção OU um *punch-in* (zoom rápido 1.05→1) OU acontecer sob o fade de um card.
- **Handoff "cobre antes de revelar":** ao sair de um PiP pra um card, suba o card PRIMEIRO (cobrindo o PiP), só DEPOIS resete o vídeo pra tela cheia (escondido sob o card). Nunca mostre a pessoa em tela cheia "piscando" 1s antes do próximo slide.
- Quando o card cobre o corte, estenda o card até DEPOIS do corte (revela direto no próximo take, sem mostrar 2x a pessoa).

**Validação:** cada corte da KEEP-LIST tem uma máscara (card/punch-in/fade) planejada e cada overlay está ancorado numa palavra da timeline limpa. **Se falhar** (dúvida de camadas/handoff): ler `references/composicao.md`.

### Passo 5 — Compor no HyperFrames
```bash
npx hyperframes init projeto --video base.mp4 --non-interactive
cp "$SKILL/assets/fonts/"*.woff2 projeto/assets/fonts/
```
Autore `index.html` (modelo e biblioteca em `references/composicao.md` + `references/componentes.md`):
- `#stage` envolve o `<video>` (base, mutado) → animável pra PiP. `<audio>` separado do MESMO `base.mp4` (lip-sync).
- Overlays como divs em z-index acima do vídeo, controlados por UMA timeline GSAP pausada (não `data-start` — controle por opacity/transform). Camadas: z0 backdrop full-motion; z5 `#stage` (vídeo); z30 overlays laterais; z40 brand mark; z60 cards full.
- Identidade unificada + **grain estático + decorativos estáticos** (NUNCA degradê animado — flicker).
- `data-width`/`data-height` = a proporção alvo. Pra 9:16 e 1:1, reposicione os overlays (ver `references/proporcoes.md`).
- Embuta a fonte via `@font-face` apontando pros `.woff2` copiados (senão o lint acusa `font_family_without_font_face`).

**Validação:** `projeto/index.html` existe, com `@font-face` e os `.woff2` em `projeto/assets/fonts/`. **Se falhar** o lint no Passo 6 com `font_family_without_font_face`: confirmar cópia dos `.woff2` e o `@font-face`.

### Passo 6 — Render + verificar + entregar
```bash
cd projeto && npx hyperframes lint
npx hyperframes render --quality high --fps "$FPS" --output renders/final-16x9.mp4   # --fps = "$FPS" medido via ffprobe nos Pré-requisitos (30 é só o caso comum)
```
- **Verifique por frames** (`ffmpeg -ss T -i ... -vframes 1`): um por seção + os pontos de transição. Corrija e re-renderize.
- Pra **flicker/respiro suspeito:** extraia frames consecutivos e compare hash/`signalstats` (ver `references/gotchas.md`).
- Copie o render final pro destino: `cp "$WORK/projeto/renders/final-16x9.mp4" "$DL/"` (`$DL` = `$HOME/Downloads`; no PC do Eric `C:/Users/Eric Luciano/Downloads`). **Reporte o caminho absoluto final como link clicável** — ex.: `[final-16x9.mp4](file:///C:/Users/Eric%20Luciano/Downloads/final-16x9.mp4)`.
- **Arquivo grande (>~200MB)?** Ofereça versão comprimida:
  ```bash
  ffmpeg -i final.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k final-leve.mp4
  ```
- **Vários formatos:** refaça os Passos 5–6 com `data-width/height` e posições do formato (o `base.mp4` é o mesmo; só a composição muda).

**Validação:** `npx hyperframes lint` passa sem erros; o render existe; frames-amostra conferem por seção e transição. **Se falhar** o lint: corrigir o erro apontado e rodar de novo antes de renderizar.

---

## Validação final (checklist antes de entregar)
- [ ] `npx hyperframes lint` passou sem erros.
- [ ] Emendas sem respiro/silêncio sobrando (cortadas no `end` da última palavra +0.10–0.15s).
- [ ] Nenhuma palavra duplicada nas emendas ("Um Um").
- [ ] Nenhum corte entre takes exposto — todos mascarados por card/punch-in/fade.
- [ ] Nenhuma pessoa "piscando" em tela cheia entre slides (handoff "cobre antes de revelar").
- [ ] Decorativos estáticos + grain (sem degradê/glow animado) — sem flicker.
- [ ] `fps` do render = fps do vídeo-base (30).
- [ ] UMA paleta, fonte Space Grotesk embutida via `@font-face`, contraste 300↔700.
- [ ] Frames-amostra conferidos (um por seção + transições).
- [ ] Final copiado pro `Downloads`; versão leve oferecida se >~200MB.
- [ ] Todos os formatos pedidos (16:9 / 9:16 / 1:1) renderizados.

## Erros comuns e recovery
- **Flicker/cintilação em cena parada (~30Hz):** degradê/glow animado sobre fundo escuro (banding H.264). Diagnóstico: extraia ~60 frames de trecho parado e compare hash — se TODOS diferem com texto parado, é isso (referência: glow animado dava YAVG 0.047 / pico 5 níveis; estático+grain → YAVG 0.00008). Correção: decorativos ESTÁTICOS + camada `.grain` (feTurbulence). Ver `references/gotchas.md` §1.
- **`cut_base.py` gera arquivo vazio / `FALHA ao cortar`:** caminho da fonte em formato MinGW (`/c/...`). Passe `C:/...`. Ver `gotchas.md` §2.
- **Lint acusa `font_family_without_font_face`:** faltou `@font-face` ou os `.woff2` não foram copiados pro `projeto/assets/fonts/`. Se precisar de contraste 300↔700 real, os `.woff2` do cache do HyperFrames às vezes são idênticos por peso — baixe os pesos reais do fontsource (`cdn.jsdelivr.net/npm/@fontsource/space-grotesk/files/space-grotesk-latin-{300,400,500,700}-normal.woff2`). Ver `gotchas.md` §3.
- **Respiro sobrando nas emendas:** cortar exatamente no `end` da última palavra (+0.10–0.15s máx.). `silencedetect=noise=-32dB:d=0.28` ajuda, mas confie no `end` da palavra. Ver `gotchas.md` §5.
- **Pessoa "piscando" em tela cheia entre slides:** handoff "cobre antes de revelar" + estender cards por cima dos cortes. Ver `composicao.md`.
- **Punch-in (zoom) aplicando torto em t=0:** `from()`/`fromTo()` têm `immediateRender:true` por padrão. Pra `fromTo` de scale no MEIO do vídeo, use `immediateRender:false`. Ver `gotchas.md` §8.
- **STT erra termos/números:** é o reconhecimento, não o áudio. Use o STT só pros TIMESTAMPS; não conserte o vídeo por causa do texto. Ver `gotchas.md` §9.
- **Arquivo final grande:** 3min 1080p em CRF 18 ≈ 270MB. Versão leve: `ffmpeg -i final.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k final-leve.mp4` (~40MB). Ver `gotchas.md` §10.

## Referências (ler sob demanda)
- `references/cortes.md` — achar takes bons, cortes apertados, tirar respiros e palavras duplicadas.
- `references/componentes.md` — **biblioteca de componentes** de motion (CSS+HTML+GSAP copia-e-cola).
- `references/composicao.md` — montar a composição (vídeo+overlays), camadas z-index, handoffs, mascarar cortes, re-timing.
- `references/proporcoes.md` — adaptar pra 9:16 / 1:1 (reenquadrar o talking-head + reposicionar overlays).
- `references/gotchas.md` — armadilhas: flicker de banding (grain!), caminho Windows no Python, fontes, fps, etc.
- `references/identidade.md` — extrair paleta+conteúdo de uma landing page (Playwright).
