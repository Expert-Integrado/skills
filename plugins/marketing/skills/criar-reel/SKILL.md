---
name: criar-reel
description: "Produz um Reel do Instagram PRONTO PRA POSTAR de ponta a ponta na voz do Eric (Expert Integrado): entende a pauta, confere os fatos, escreve o roteiro, gera a FALA no ElevenLabs (voz Eric Profissional) em blocos de até 20s e faz só o LIP-SYNC no HeyGen (Avatar V, audio_asset_id) — fala a US$4/min em vez de US$10-11. B-rolls com GPT Image 2 (imagens) + Kling direto (vídeo, Higgsfield como fallback), composição, legenda amarela, thumb e página de CTA. Versão padrão de produção (validada 11/06/2026). Usar quando o Eric pedir 'cria um reel', 'reel com elevenlabs', 'reel barato', ou qualquer pedido de reel. NÃO usar para: gerar só o SRT de um vídeo já editado (skill gerar-srt), só cortar respiros de uma gravação (skill cortar-respiros), carrossel ou post estático (carrossel-studio)."
argument-hint: "[tema | url | repo | video-gravado.mp4] [--clips N] [--sem-thumb] [--sem-broll] [--manual] [--block-seconds N]"
allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Glob
---

# Criar Reel (Eric / Expert Integrado) — ElevenLabs + HeyGen lip-sync

Produz um Reel **pronto pra postar** a partir de uma pauta (tema, link, repo ou vídeo gravado). Dois modos: **Automático (default)** — a fala é o avatar do Eric (áudio ElevenLabs + lip-sync HeyGen); **Manual** (`--manual` ou quando o Eric mandar um vídeo gravado) — a fala é o vídeo dele, recortado com rembg (troca só a etapa 3). A v3 derruba o custo da fala: o TTS interno do HeyGen cena-a-cena custa ≈ US$10-11/min; gerando o áudio no ElevenLabs (conta Pro, 1,5M chars/mês) e usando o HeyGen só pro lip-sync em blocos de até 20s, cai pra ≈ US$4/min. STATUS: validado em 11/06/2026 (teste reel-quanto-custa-a-hora: blocos OK, voz OK, emenda OK).

## NUNCA

- **NUNCA gastar crédito (ElevenLabs/HeyGen/Kling/Higgsfield) antes do gate da etapa 2.5 aprovado** com "prosseguir? (s/n)".
- NUNCA inventar dado da pauta (versão, estrelas, preço, criador) — conferir na fonte via `WebFetch`/`WebSearch`. Se a referência (ex: Reel viral copiado) estiver errada, corrigir e avisar.
- NUNCA inventar um valor pro custo do Kling — o simulador marca "a confirmar" (ver `references/custos.md`).
- NUNCA mandar o roteiro inteiro de uma vez pro HeyGen — sempre cenas de 1-2 frases (script inteiro degrada a qualidade; regra do Eric).
- NUNCA usar o modelo `u2net_human_seg` no rembg (abre buraco no microfone/objetos) — default é `isnet-general-use`.
- NUNCA usar `force_style` do ffmpeg pra legenda (posiciona errado) — o `compose_reel.py` já converte o SRT em .ass com estilo explícito.
- NUNCA passar caminho RELATIVO pro `compose_reel.py` — a lista de concat vai pro %TEMP% e o ffmpeg não acha os clip-NN.mp4. SEMPRE caminhos ABSOLUTOS em `--brolls-dir`, `--avatar`, `--srt`, `--out`.
- NUNCA gerar frame com figura nua/sem roupa (a moderação do Kling barra) — figuras SEMPRE vestidas.
- NUNCA gerar B-roll no Kling sem antes consultar o banco remoto (etapa 6 — banco primeiro).
- NUNCA deixar arquivo solto fora da pasta do reel (nada solto em Downloads).

## SEMPRE

- SEMPRE ler `references/voz-eric.md` ANTES de escrever qualquer texto — roteiro, legenda do post e página de CTA saem nessa voz.
- SEMPRE escrever "CLAUDI" no lugar de "Claude" e termos em inglês por extenso ("last thirty days") no `cenas.txt` — senão o TTS fala errado. A LEGENDA mostra a grafia certa.
- SEMPRE conferir imagem/frame com `Read` antes de seguir: 1 frame do avatar (fundo verde chapado), 3 frames do vídeo final, thumb e capa da Biblioteca.
- SEMPRE usar acentuação correta do português em todo texto externo (legenda do post, página da Biblioteca, headline da thumb).
- SEMPRE aguardar aprovação do Eric quando a pauta for aberta ("acha um tema") antes de gastar crédito.
- SEMPRE banco de B-rolls primeiro; Kling só pros gaps que o banco não cobre.

## Pré-requisitos

Rodar ANTES da etapa 1; SE algum item crítico faltar → parar e reportar (não improvisar):

1. **Python — resolver por CAPACIDADE, não por PATH:** testar candidatos na ordem `"C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"` (canônico no PC do Eric) → `command -v python3` → `command -v python`, e ficar com o PRIMEIRO que passar em `"$PY" -c "import numpy, sherpa_onnx, requests"`. NÃO confiar em `command -v` sozinho: no PC do Eric ele resolve pro stub Python 3.14 da Microsoft Store, que existe mas NÃO tem os pacotes (validado 07/07/2026). SE nenhum candidato passar → abortar. Pacotes: `numpy sherpa-onnx requests` (+ `rembg` só no modo manual) — instalação no `SETUP.md`.
2. **FFmpeg:** `command -v ffmpeg && command -v ffprobe`. SE faltar → abortar e instruir instalação.
3. **Credenciais** (pasta default do PC: `C:/MCPs/` — os scripts têm esse default chumbado nas constantes do topo; máquina nova = ajustar via `SETUP.md`). Checar existência com `ls`; NUNCA imprimir o conteúdo. Cada `.env` é consumido por uma etapa diferente — abortar conforme o branch, não tudo de cara:
   - **`openai.env` — CRÍTICO INCONDICIONAL** (abortar já aqui se faltar): o `openai_image.py` roda no caminho default — thumb (etapa 8) e capa do CTA (etapa 9), além dos frames de gap (etapa 5).
   - **`elevenlabs.env` + `heygen.env` — CRÍTICOS SÓ NO MODO AUTOMÁTICO** (default): o `elevenlabs_heygen.py` da etapa 3a consome os dois (`heygen.env` = HEYGEN_API_KEY, saldo de API separado da assinatura; `elevenlabs.env` = ELEVENLABS_API_KEY). O modo é conhecido na invocação: se automático e faltar qualquer um → abortar já aqui; se `--manual` (vídeo gravado) → NÃO checar (etapa 3b usa rembg local, sem credencial).
   - **`kling.env` — CONDICIONAL ao gap de B-roll** (saldo de API separado): só é consumido se a etapa 6 achar trechos que o banco NÃO cobre (Kling). Reel 100% coberto pelo banco não usa — checar só quando o gap surgir, não abortar de cara.
   - **`biblioteca.env` — CONDICIONAL ao caminho Biblioteca** (BIBLIOTECA_ADMIN_EMAIL/PASSWORD — login da aba /admin): só é consumido na etapa 9 se a tool `biblioteca_criar_conteudo` existir; no fallback Notion não é usado — checar só ao seguir o caminho Biblioteca.
4. **Pasta do reel + operador.**
   - **Quem roda / em qual máquina:** o fluxo roda na **máquina de produção** — por padrão operada pelo **João**, mas pode ser o **Eric**; quem estiver operando é quem responde o gate da etapa 2.5 ("prosseguir? (s/n)"). O operador NÃO muda a voz: roteiro, legenda e CTA saem SEMPRE na voz do Eric (o avatar HeyGen e a voz clonada no ElevenLabs são do Eric), independente de quem executa.
   - **Slug do tema (`<slug-do-tema>`)** — regra fixa, usada no nome da pasta e no nome do arquivo da thumb: (1) minúsculas; (2) remover acentos (`á`→`a`, `ç`→`c`, `ã`→`a`; resultado ASCII puro); (3) trocar todo caractere fora de `a-z0-9` por `-`; (4) colapsar `-` repetidos em um só; (5) aparar `-` do começo e do fim. Ex.: "Quanto custa a HORA?" → `quanto-custa-a-hora`. (A URL pública da Biblioteca tem slug PRÓPRIO, gerado pela tool a partir do TÍTULO — não é este; este slug local só nomeia arquivos na máquina.)
   - **Diretório:** `REEL="${REELS_DIR:-$HOME/Downloads}/reel-<slug-do-tema>"`. `$HOME/Downloads` resolve pro **Downloads do usuário logado na máquina que está rodando** (no PC do João dá `C:\Users\Joao\Downloads\reel-<slug>\`; em outra máquina/usuário, o Downloads daquele usuário — é portável). Pra forçar outro diretório, setar a env `REELS_DIR`. Rodar `mkdir -p "$REEL"`. TODA saída vai dentro dela.
5. **Skill `gerar-srt`** (etapa 4): script em `plugins/marketing/skills/gerar-srt/scripts/gerar_srt.py` (mesmo marketplace). SE ausente → transcrever com faster-whisper (modelo `medium`, PT-BR) no mesmo formato .srt (ver `SETUP.md` fase 1).
6. **IDs de voz/avatar:** já são default nas constantes `VOICE_ELEVEN_ERIC` (voz `Eric Profissional - Abril-25`, modelo `eleven_multilingual_v2`) e `AVATAR_ERIC_2026` (Avatar V, Eric 2026) no topo de `scripts/elevenlabs_heygen.py` — não precisa passar flag.

## Fluxo (10 etapas — gate de orçamento na 2.5)

### 1. Pauta e fatos
- SE a pauta for URL/repo → `WebFetch`/`WebSearch` pra extrair o que é, números, instalação, diferencial. Conferir versões, estrelas, preços, criador (regra NUNCA inventar).
- SE a pauta for aberta ("acha um tema") → pesquisar o que tá viral, propor conceito com hook, CTA e ângulo, e **aguardar aprovação do Eric antes de gastar crédito**.
- SENÃO (tema direto) → seguir pra etapa 2.

### 2. Roteiro (voz do Eric)
- Ler **`references/estrutura-viral.md`** e seguir o template "Insider de IA": hook = dor já sentida → diagnóstico com número ("ninguém te conta") → batismo ("isso tem nome: X") → solução nomeada com artefato → CTA. Alvo 40-60s (~120-140 palavras).
- Textura da fala: `references/voz-eric.md` (tom, blacklist, frases inteiras).
- Entregar também a **legenda do post** (ângulo DIFERENTE do roteiro) + hashtags → vai pro `legenda-post.md` (template na seção Saídas).
- **Definir A PALAVRA DO CTA AQUI**, ao escrever o beat de CTA do roteiro: uma **única palavra, em MAIÚSCULAS, sem espaço e sem acento** (ex.: `TOKEN`, `CONSELHO`, `CLAUDI`), que o lead comenta pra receber o material no direct (padrão "Comenta [palavra] aqui embaixo" de `references/estrutura-viral.md`). É esta a origem da "palavra do CTA" citada nas etapas 4, 8, no `legenda-post.md` e no checklist — todas reusam ESTA mesma palavra sem alterá-la. Gravar já na seção "Palavra do CTA" do `legenda-post.md`.
- **Quebrar o roteiro em CENAS de 1-2 frases** → `Write` em `$REEL/cenas.txt`, uma cena por linha, ~9-12 cenas por vídeo.
- Aplicar a regra de pronúncia ("CLAUDI", termos por extenso) SÓ no `cenas.txt`.

### 2.5 Gate de orçamento (ANTES de gastar crédito)
- **Forma preferida (o script calcula o nº de B-rolls sozinho):** `"$PY" scripts/simular_custo.py --cenas-file "$REEL/cenas.txt" --clips-kling 0`
  - **NÃO adivinhar duração.** SEM `--clips`, o `simular_custo.py` deriva a duração da fala pela CONTAGEM DE CARACTERES do `cenas.txt` (sem contar quebras de linha) pela taxa medida de **17,8 caracteres/segundo** (fonte: `references/custos.md`) e usa `N = ceil(duração_s ÷ 5)` como default — é exatamente a conta certa, por isso a forma preferida OMITE `--clips` e deixa o script fazer.
  - **`--clips <N>` = override manual OPCIONAL**, só quando quiser forçar um N específico. Nesse caso calcular com a MESMA fórmula (`N = ceil((chars ÷ 17,8) ÷ 5)`), NUNCA com o alvo genérico de 40-60s da etapa 2 (aquilo é meta de roteiro, não fonte do N). Este N é só ESTIMATIVA pré-produção; o N definitivo vem da duração real do vídeo na etapa 4.
  - `--clips-kling` = B-rolls que vão pro Kling DEPOIS de checar o banco (etapa 6) — como ainda não sabe, rodar com `0` e REFAZER a simulação após a etapa 6 se houver gaps.
- O script imprime o **custo conhecido** (HeyGen lip-sync + ElevenLabs + imagens) e o Kling como **"a confirmar"** (taxa não fechada — `references/custos.md`).
- Mostrar o custo pro Eric/João e perguntar **"prosseguir? (s/n)"**. SE aprovado → etapa 3. SENÃO → parar. Esta é a trava herdada da v2.

### 3a. Vídeo do avatar (modo automático — ElevenLabs + HeyGen lip-sync)
- `"$PY" scripts/elevenlabs_heygen.py --scenes-file "$REEL/cenas.txt" --out-dir "$REEL/heygen"` (rodar em background; saída final default `eric-green.mp4`).
- O que o script faz (diferença central pra v2):
  1. Agrupa as cenas em **blocos de até ~20s** (decisão Eric/João 11/06/2026 após teste com 30s; `--block-seconds` muda).
  2. Gera o áudio de cada bloco no **ElevenLabs** (voz `Eric Profissional - Abril-25`, modelo `eleven_multilingual_v2`, chave em `C:\MCPs\elevenlabs.env`).
  3. **Checkpoint de voz no ÁUDIO** (janelas de 10s com embedding de locutor — pega o defeito do ElevenLabs de trocar a voz no MEIO) ANTES de gastar crédito do HeyGen. Regenera com seed diferente se falhar (máx 3x).
  4. Sobe o .mp3 no HeyGen (`upload.heygen.com/v1/asset`) e gera o lip-sync via `POST /v3/videos` com `audio_asset_id` (Avatar V, Eric 2026, fundo verde `#00FF00`, `remove_background: true`, 9:16). Validado 11/06/2026 — o v3 aceita o campo direto.
  5. Baixa, re-verifica a voz no vídeo e concatena.
- Flags úteis: `--so-audio` = para após a validação dos áudios (zero gasto HeyGen — usar pra testar tamanho de bloco); `--blocks 2 3` = reprocessa só os blocos listados.
- **Validação:** extrair 1 frame (`ffmpeg -y -v error -i "$REEL/heygen/eric-green.mp4" -ss 2 -frames:v 1 "$REEL/heygen/check.png"`) e conferir com `Read`: fundo tem que estar **verde chapado**.
- SE erro `MOVIO_PAYMENT_INSUFFICIENT_CREDIT` → crédito de API do HeyGen acabou (separado da assinatura) → avisar e parar.
- SE o lip-sync degradar ou a API recusar o áudio → fallback v2: `scripts/heygen_video.py` (TTS interno cena-a-cena — caro, mas comprovado). Avisar antes: custa mais.
- Pronúncia: o ElevenLabs pronuncia melhor que o TTS do HeyGen, mas manter a regra do "CLAUDI" até o Eric validar o contrário.

### 3b. Recorte (modo manual — vídeo gravado sem fundo verde)
- `"$PY" scripts/rembg_video.py <video> "$REEL" [--crop W:H:X:Y]` (background, ~5 min). Detectar a área útil ANTES (vídeo pode vir encaixotado em 16:9). Modelo default `isnet-general-use`.
- SE o vídeo veio da UI do HeyGen (1920x1080 com o 9:16 encaixotado no centro, sem fundo verde) → `--crop 608:1080:656:0`.

### 4. SRT (legenda da tela)
- `"$PY" ../gerar-srt/scripts/gerar_srt.py "<video-da-fala>" --model medium --out "$REEL"` (cwd = pasta desta skill, como todas as chamadas `scripts/...`; o caminho absoluto do script no repo também serve).
- **Revisar o .srt com `Read` + `Edit`**: corrigir termos ("Cláudio"→"Claude", "Haja"→"Aja") e grafar corretamente **a palavra do CTA** (a mesma definida na etapa 2, em MAIÚSCULAS).
- **Nº DEFINITIVO de B-rolls (N):** medir a duração REAL do vídeo da fala com `ffprobe -v error -show_entries format=duration -of csv=p=0 "<video-da-fala>"` (dá os segundos) e calcular `N = ceil(duração_em_segundos ÷ 5)`. Este N substitui a estimativa da etapa 2.5 e é o que comanda quantos trechos as etapas 5 e 6 precisam cobrir.

### 5. Frames-base dos B-rolls (GPT Image 2 / OpenAI) — RODA DEPOIS DA ETAPA 6, só pros gaps
> **Ordem REAL de execução do bloco de B-rolls (não é a ordem dos números):** (1) fazer primeiro a **etapa 6** (banco remoto) pra descobrir quais dos N trechos o banco NÃO cobre; (2) SÓ ENTÃO voltar a esta etapa 5 e gerar 1 frame por gap; (3) seguir pros sub-passos de Kling da etapa 6. Se o banco cobrir os N trechos, esta etapa 5 gera apenas a thumb (etapa 8) e a capa (etapa 9).
- **Só gerar frame pros trechos que NÃO vierem do banco** (os gaps identificados na etapa 6).
- Ler `references/visual-broll-thumb.md` (estilo dark+âmbar, 9:16, SEM texto, figuras SEMPRE vestidas). 1 frame por clipe (dos gaps), mapeado ao trecho da fala.
- `"$PY" scripts/openai_image.py --prompt "..." --out "$REEL/frames/frame-NN.png"` (modelo gpt-image-2, retrato default 1024x1792; chave em `C:\MCPs\openai.env`). A thumb (etapa 8) e a capa (etapa 9) também saem daqui.
- Validar cada frame com `Read` antes de mandar pro Kling.

### 6. B-rolls — BANCO REMOTO PRIMEIRO, Kling só pro que faltar
- Banco = catálogo público de ~219 clips reutilizáveis em GitHub Release (funciona em qualquer máquina, baixa só o que precisa; cache em `~/.cache/broll-bank/`; override do catálogo: env `BROLL_BANK_URL`). Ver `references/banco-broll.md`.
  1. Listar: `"$PY" scripts/broll_bank.py --list` (filtros: `--cat servidor`, `--hd`).
  2. Listar os N trechos da fala que precisam de B-roll (N = ceil(duração ÷ 5)).
  3. **Casar cada trecho da fala com uma categoria pelo CONCEITO que o trecho menciona**, usando esta tabela fixa de significado (fonte: `references/banco-broll.md`): `robo`=figura/agente de IA · `servidor`=dados/rack/infra · `cerebro`=conhecimento/memória/grafo · `video`=play/gravação/film strip · `documento`=tela/dashboard/arquivo/card · `energia`=partículas/código/fluxo · `rede`=nós/conexões/integração · `relogio`=tempo/velocidade/prazo · `estrela`=explosão/destaque/novidade · `lupa`=busca/análise/radar · `moeda`=custo/dinheiro/economia · `cristal`=esfera âmbar/abstrato genérico · `pessoas`=equipe/humanos+IA. Regra: escolher a categoria cujo significado mais se aproxima do que a frase DIZ (ex.: frase sobre custo/preço → `moeda`; sobre buscar/achar → `lupa`; sobre equipe → `pessoas`; sobre memória/conhecimento → `cerebro`; trecho abstrato sem conceito claro → `cristal`). **Desempate ENTRE categorias (trecho toca 2+ conceitos):** ficar com a categoria do conceito que é o **substantivo principal/dominante** do trecho (o núcleo do que a frase afirma, não o adjunto/complemento); persistindo o empate, a categoria que aparece **primeiro na tabela de significado acima** (ordem de leitura: `robo` → `servidor` → `cerebro` → `video` → `documento` → `energia` → `rede` → `relogio` → `estrela` → `lupa` → `moeda` → `cristal` → `pessoas`). Depois escolher 1 `id` por trecho, alternando, sem repetir o mesmo `id` seguido, preferindo `hd`. SE dois `id` empatarem na escolha → `"$PY" scripts/broll_bank.py --thumb <id1> <id2> ...` (vai pra `_bankthumbs/`, conferir com `Read`) e ficar com o que casa melhor.
  4. Baixar NA ORDEM da fala e em **UMA ÚNICA chamada com TODOS os ids**: `"$PY" scripts/broll_bank.py --get <id1> <id2> ... --out "$REEL"` → vira `clip-01.mp4 ... clip-NN.mp4`. **NUNCA chamar `--get` incremental**: a numeração recomeça em `clip-01` a cada chamada e sobrescreve os clips existentes (validado 07/07/2026). SE a lista mudar depois de já ter baixado → repetir UMA chamada com a lista completa na ordem final (o cache local evita re-download).
  5. **Só gerar no Kling os trechos que o banco NÃO cobre** (visual muito específico) — e só pra esses fazer o frame (etapa 5). Numerar os clips do Kling preenchendo os buracos da sequência. Isso zera/derruba o custo do Kling na maioria dos reels (pedido do João).
  6. Clips novos gerados ENTRAM no banco depois (subir no Release + adicionar no `bank.json`). **Processo MANUAL/EXTERNO, NÃO bloqueia o reel:** nenhum script desta skill escreve no banco — `broll_bank.py` é só leitura (`--list`/`--thumb`/`--get`). O conceito está em `references/banco-broll.md` (seção "Regra de reuso", passo 4), mas SEM comando executável: subir os `clip-*.mp4` novos no GitHub Release do repo `expert-broll-bank` e acrescentar a entrada no `bank.json` na mão. SE não for feito agora → parada legítima: anotar como pendência pós-entrega e seguir sem travar (o reel já composto não depende disso).
- SE houver gaps pro Kling:
  1. Refazer a simulação da etapa 2.5 com `--clips-kling <M>` e reconfirmar com o Eric/João.
  2. `Write` em `$REEL/manifest.json` no formato da v1 (ver `references/kling-api.md`; chave em `C:\MCPs\kling.env`).
  3. Validar 1 clipe antes do lote: `"$PY" scripts/kling_i2v.py manifest.json 1` (background).
  4. Lote: `"$PY" scripts/kling_i2v.py manifest.json 2 3 ...`. Conferir cada clip com `ffprobe`; SE algum falhar → re-disparar só esses (`... manifest.json 7 8 9`).
- SE o Kling falhar/sem saldo → fallback: `"$PY" scripts/higgsfield_i2v.py manifest.json ...` com `"model"` do Higgsfield no manifest. **Campo `model`: usar `veo3_1_lite`** — é o modelo canônico do fallback documentado em `references/custos.md` (US$ 0,05/seg de B-roll, referência herdada da v2). O `higgsfield_i2v.py` aborta se `model` vier vazio, então este campo é obrigatório. `C:/MCPs/hf.exe model list --video` só pra escolher OUTRO modelo (override manual); requer `hf.exe auth login` 1x; saldo: `C:/MCPs/hf.exe account`.

### 7. Composição final
- `"$PY" scripts/compose_reel.py --avatar <fala-ABSOLUTO> --brolls-dir "$REEL" --srt <corrigido-ABSOLUTO>.srt --out "$REEL/video-final-<slug-do-tema>.mp4"` (`<slug-do-tema>` = o slug da pré-req 4, mesmo padrão da thumb)
  - Modo automático (fundo verde): só isso — o chromakey é default.
  - Modo manual (rembg): adicionar `--fg-seq "$REEL/fg-out" --fg-fps 25`.
- Layout: B-roll em tela cheia no fundo o tempo todo + Eric recortado embaixo no centro (~69% da altura) + legenda amarela bold no terço superior (acima da cabeça).
- **Validação:** obter a duração — `DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$REEL/video-final-<slug-do-tema>.mp4")` — e extrair 3 frames nos timestamps **`1`**, **`DUR/2`** e **`DUR-1`** segundos (início/meio/fim): `ffmpeg -y -v error -ss 1 -i "$REEL/video-final-<slug-do-tema>.mp4" -frames:v 1 "$REEL/check-ini.png"`; idem trocando `-ss 1` por `-ss "$(awk "BEGIN{print $DUR/2}")"` (→ `check-meio.png`) e por `-ss "$(awk "BEGIN{print $DUR-1}")"` (→ `check-fim.png`). Conferir os 3 com `Read` antes de entregar.

### 8. Thumb
- Seção "Thumb" de `references/visual-broll-thumb.md`: fotográfico realista, headline branca caixa alta no topo (3-4 palavras) + selo/pill âmbar com **a palavra do CTA** (a MESMA definida na etapa 2).
- Gerar com `openai_image.py`, salvar **DENTRO da pasta do reel**: `$REEL/thumb-<slug-do-tema>-reels.png` (`<slug-do-tema>` = o slug da pré-req 4) e conferir com `Read`.
- SE `--sem-thumb` → pular.

### 9. Página do CTA (Biblioteca — biblioteca.ericluciano.com.br)
- Checar se a tool MCP `biblioteca_criar_conteudo` existe na sessão.
  - **SE existir → seguir os passos abaixo (Biblioteca).**
  - **SE NÃO existir (ou o MCP estiver fora do ar) → pular pro "Fallback (Notion)" no fim desta etapa.**
- **Escrever o material do CTA:** o que foi prometido no CTA (guia de instalação, prompts prontos etc.) em Markdown, na voz do Eric, com crédito ao criador da ferramenta. Esse texto será o campo `corpo_markdown`.
- **Preparar a CAPA ANTES de criar o conteúdo — a capa é SEMPRE imagem; emoji é só fallback quando o upload falha:**
  1. Gerar com `"$PY" scripts/openai_image.py --prompt "..." --size 1536x1024 --out "$REEL/capa.png"` (paisagem 3:2): cena que traduz o tema + estilo dark+âmbar de `references/visual-broll-thumb.md` + **headline branca CAIXA ALTA de 2-4 palavras que provoca o clique** (ex: "70% MENOS TOKEN") + **pill âmbar** com o nome da ferramenta/tema. Conferir com `Read` antes de subir.
  2. Converter pra WebP (PNG do GPT Image 2 tem ~2,4MB; WebP fica ~150KB): `ffmpeg -y -v error -i "$REEL/capa.png" -q:v 80 "$REEL/capa.webp"`.
  3. Subir com `biblioteca_upload_capa` → devolve uma **signed URL** (100 anos; bucket privado, política do Lovable Cloud). Guardar essa URL pro campo `capa_valor` abaixo.
- **Criar via `biblioteca_criar_conteudo`** com estes campos:
  - `titulo` — título do material.
  - `descricao_curta` — 1 linha de card.
  - `categoria` — usar SOMENTE um destes dois valores (NÃO inventar outros): `guia` (tutorial / passo a passo / instalação) ou `prompt` (coleção de prompts prontos pra colar). **Qualquer outro tema (opinião, notícia, case etc.) → usar `guia`** (é o formato padrão do material de CTA). Na dúvida entre os dois → `guia`.
  - `capa_tipo` = `"imagem"` e `capa_valor` = a **signed URL** do passo 3 (NÃO um emoji — a capa imagem é obrigatória; o conteúdo só está pronto com ela).
  - `corpo_markdown` — o material escrito acima.
  - `publicado` = `true`.
  - **SÓ SE o upload da capa (passo 3) tiver falhado → fallback de capa:** `capa_tipo` = `"emoji"` e `capa_valor` = um emoji que casa com o tema; e avisar o Eric/João que a capa saiu como emoji, não imagem.
- A tool devolve a **URL pública** (`https://biblioteca.ericluciano.com.br/c/<slug>`, slug gerado pela tool a partir do título) — colocar no chat e no `legenda-post.md`. O lead se cadastra com nome+telefone pra acessar.
- Requer `biblioteca.env` (pasta de credenciais) com BIBLIOTECA_ADMIN_EMAIL/PASSWORD.
- **Fallback (Notion) — SÓ quando `biblioteca_criar_conteudo` NÃO existe na sessão E HÁ um Notion MCP conectado:** publicar o MESMO material (mesmo `titulo` + o mesmo corpo em Markdown) como uma **página nova no Notion**, via a tool de criação de página do Notion MCP que estiver conectado, criada na **raiz do workspace** (página de topo, SEM página-mãe). Devolver a **URL da página do Notion** como link do CTA (no lugar da URL da Biblioteca), no chat e no `legenda-post.md`. Esta skill NÃO fixa database/template de destino no Notion: se houver um destino canônico esperado, confirmar com o Eric/João antes de publicar — não adivinhar ID de página/database.
- **SE NEM a tool `biblioteca_criar_conteudo` NEM um Notion MCP existirem na sessão → PARADA LEGÍTIMA:** parar e perguntar ao Eric/João onde publicar a página do CTA (entregar o material já pronto em Markdown pra ele apontar o destino). NUNCA inventar um destino e NUNCA pular a etapa em silêncio — o link do CTA é o que o reel promete, sem ele o material não fica completo.

## Saídas (TUDO dentro de `$REEL` — nada solto em Downloads)

- `$REEL/video-final-*.mp4` — pronto pra postar (composto + legendado).
- `$REEL/legenda-post.md` — template:

  ```markdown
  # {tema}

  ## Legenda do post
  {legenda em ângulo diferente do roteiro, na voz do Eric, acentuação correta}

  {hashtags}

  ## Palavra do CTA
  {palavra}

  ## Página da Biblioteca
  https://biblioteca.ericluciano.com.br/c/{slug}
  ```

- `$REEL/thumb-<slug-do-tema>-reels.png` — a thumb (`<slug-do-tema>` = slug da pré-req 4).
- Página na Biblioteca (link no chat e no legenda-post.md).
- `$REEL/` guarda também: cenas, frames, clipes, manifest, SRT/ASS.

## Validação final (checklist antes de entregar)

- [ ] Gate 2.5 foi aprovado ANTES de qualquer gasto (e re-simulado se houve Kling).
- [ ] Frame do avatar conferido: fundo verde chapado (modo automático).
- [ ] .srt revisado ("Cláudio"→"Claude", "Haja"→"Aja", palavra do CTA).
- [ ] 3 frames do vídeo final conferidos com `Read` (início/meio/fim).
- [ ] `legenda-post.md` com legenda (ângulo diferente), hashtags, palavra do CTA e link da Biblioteca.
- [ ] Thumb dentro da pasta do reel, conferida com `Read`.
- [ ] Página da Biblioteca publicada COM capa imagem (ou emoji + aviso, se o upload falhou).
- [ ] Nenhum arquivo solto fora de `$REEL`.

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---|---|---|
| `MOVIO_PAYMENT_INSUFFICIENT_CREDIT` | Crédito de API do HeyGen acabou (separado da assinatura) | Avisar e parar |
| Voz troca no meio do áudio | Defeito conhecido do ElevenLabs | O checkpoint do script pega e regenera (seed diferente, máx 3x); se persistir, testar bloco menor com `--so-audio` e reportar |
| Lip-sync degradado / API recusa áudio | Limitação do v3 `audio_asset_id` | Fallback v2 `scripts/heygen_video.py` (caro, comprovado) — avisar antes |
| Saldo do Kling acabou no meio | Pré-pago separado da assinatura | Re-disparar só os que faltam (`... manifest.json 7 8 9`) |
| Kling falhou de vez / sem saldo | — | `higgsfield_i2v.py` com `"model"` no manifest |
| Cena com pronúncia errada | TTS | Regenerar SÓ a cena (`--text "..."`), substituir o scene-NN.mp4, re-concatenar e rodar o Whisper de novo (timestamps mudam) |
| ffmpeg não acha clip-NN.mp4 na composição | Caminho relativo no compose_reel.py | Repassar TODOS os caminhos como ABSOLUTOS |
| Vídeo gravado vem 1920x1080 encaixotado | Export da UI do HeyGen | `--crop 608:1080:656:0` no rembg_video.py |
| Vídeo gravado mais longo que os B-rolls | — | Gerar clipes extras (o compose loopa, mas repetir B-roll é feio) |
| Upload da capa falhou | Bucket/MCP | Capa emoji como fallback + avisar |
| Submit recusado (HeyGen/Kling) | — | Não gasta crédito; corrigir payload e reenviar |

- Python no Bash do Windows: paths com barra normal (`C:/...`).

## Flags

- `--clips N` força N clipes · `--sem-thumb` / `--sem-broll` pulam etapas · `--manual` modo gravado · `--block-seconds N` muda o tamanho do bloco da fala.

## Skills relacionadas

- `cortar-respiros` — só pro modo manual (avatar do HeyGen não respira).
- `gerar-srt` — usada na etapa 4 (e isolada quando o Eric já editou um vídeo por fora).

## Recursos

- **`scripts/elevenlabs_heygen.py`** — O CORAÇÃO DA V3: TTS ElevenLabs em blocos + checkpoint de voz em janelas + upload de asset + lip-sync HeyGen v3 (`audio_asset_id`) + concat.
- **`scripts/heygen_video.py`** — fluxo antigo da v2 (TTS interno cena-a-cena) — só fallback.
- **`scripts/verificar_voz.py`** — verificação de locutor (sherpa-onnx; ref em `C:/MCPs/eric-voice-ref.wav`).
- **`scripts/simular_custo.py`** — o gate de orçamento (etapa 2.5).
- **`scripts/openai_image.py`** — frames/thumb/capa via GPT Image 2 (OpenAI).
- **`scripts/kling_i2v.py`** — runner do Kling (TITULAR dos B-rolls na v3).
- **`scripts/broll_bank.py`** — banco de B-rolls remoto: `--list`/`--thumb`/`--get`; consultar na etapa 6 ANTES do Kling.
- **`scripts/higgsfield_i2v.py`** — runner do Higgsfield (fallback).
- **`scripts/rembg_video.py`** — recorte por IA pra vídeo sem fundo verde (isnet-general-use).
- **`scripts/compose_reel.py`** — composição (chromakey/alpha + B-roll + legenda .ass estilizada).
- **`references/voz-eric.md`** — tom, blacklist e estrutura de roteiro.
- **`references/estrutura-viral.md`** — template "Insider de IA" dos vídeos que estouraram.
- **`references/custos.md`** — taxas reais + o que falta confirmar (Kling "a confirmar").
- **`references/kling-api.md`** — API do Kling, manifesto, troubleshooting.
- **`references/banco-broll.md`** — banco de B-rolls reutilizáveis; consultar na etapa 6 ANTES de gerar Kling.
- **`references/visual-broll-thumb.md`** — estilo dos frames, da thumb e da capa.
