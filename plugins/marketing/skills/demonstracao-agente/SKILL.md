---
name: demonstracao-agente
description: "Orquestra demo ao vivo de uma empresa fictícia do zero: 4 imagens gpt-image-2 + carrossel + vídeo HeyGen com avatar do Eric + landing completa + jogo + formulário + deploy no domínio do Eric — tudo em paralelo, ~5min no ar. TRIGGER quando Eric pedir 'faz um site', 'faz uma demonstração', 'monta uma demo', 'cria uma empresa de X'. NÃO usar pra página/site real de produto da Expert Integrado, apresentação/deck (skill apresentacao-html), Reel (skill criar-reel) nem post de blog."
allowed-tools: Read, Write, Edit, Bash, WebFetch, mcp__plugin_telegram_telegram__reply
---

# Demonstração de agente (landing completa no ar em ~5min)

Recebe um tema (empresa fictícia), inventa TUDO que faltar (nome, números, copy, preços) e coloca no ar uma LANDING de empresa de verdade — imagem + carrossel + vídeo + jogo + formulário — no domínio do Eric. O vídeo é o gargalo (~75s+ de render), então ele dispara PRIMEIRO, em background, no segundo 0: o tempo total vira o tempo do vídeo, não a soma das etapas.

> **Autorização (deploy de produção + DNS) — escopo travado:** o próprio disparo desta skill pelo Eric JÁ é o OK prévio para o `vercel deploy --prod` (passo 6) e para o CNAME/TXT `_vercel` do subdomínio da demo `{slug}.ericluciano.com.br` (passo 7) — a regra global de "1 OK antes de deploy de produção e mutação de DNS" está satisfeita por esse disparo. Escopo restrito a ESSE subdomínio e a ESTE projeto Vercel. Qualquer ação fora disso (outro domínio, deploy de produto real, outra zona/registro DNS, remoção de projeto) continua exigindo OK explícito do Eric.

## NUNCA
- NUNCA perguntar nada ao Eric durante a execução — inventar todo dado que faltar.
- NUNCA usar `gpt-image-1` (desatualizado) — imagem é SEMPRE `model=gpt-image-2`.
- NUNCA usar o token Vercel pessoal (item 1P `VERCEL_API_TOKEN`, `vcp_6480...`) — travado por SAML (`saml:true`), dá 403 em escrita. Só o token do time (item 1P `Token_Vercel_Produto_Claude_Eric`).
- NUNCA anunciar URL com base só em HTTP 200 — o nome limpo `<slug>.vercel.app` pode ser de um estranho. Verificar o CONTEÚDO (grep do texto da demo + content-type dos assets).
- NUNCA upload multipart no asset de áudio do HeyGen — é `curl --data-binary` com `-H "Content-Type: audio/mpeg"`.
- NUNCA esperar o vídeo terminar pra começar o resto — vídeo em background no segundo 0.
- NUNCA emoji como ícone nos cards (ícone é SVG de linha) nem retrato cru gigante sem overlay.
- NUNCA path temporário fixo (`C:/tmp`, `/tmp`) — pasta de trabalho é `WORK=$(mktemp -d)`.

## SEMPRE
- SEMPRE disparar o vídeo (ElevenLabs + HeyGen) ANTES de qualquer outra etapa, em background (`run_in_background: true`).
- SEMPRE 4 imagens `1536x1024` (3:2) com a foto ref do Eric e `Preserve his exact face and identity` no prompt.
- SEMPRE paleta de UMA cor só e copy específica (números, autoridade real do Eric) — nunca genérica.
- SEMPRE acentuação correta do português em TODO texto da landing (é texto externo).
- SEMPRE `vercel deploy --prod` (sem `--prod` cai em preview e o domínio serve build antigo).
- SEMPRE entregar em DUAS mensagens: a mensagem 1 com o link `.vercel.app` logo após o passo 6 (SEM a linha do domínio próprio); a mensagem 2, curta e separada, só quando o passo 7d confirmar o domínio (200 + grep do conteúdo).
- SEMPRE limpar o workdir no fim (`rm -rf "$WORK"`).

## Pré-requisitos

> **Persistência entre chamadas Bash (LEIA — vale pra TODA a skill):** a tool Bash NÃO preserva variáveis de shell entre chamadas (só o diretório de trabalho persiste). Logo: (1) no passo 0 crie o `WORK` UMA vez e ANOTE o caminho impresso; (2) no INÍCIO de toda chamada Bash seguinte, e no topo do `video.sh`, cole o **preâmbulo** abaixo — re-setando `WORK` com o caminho literal anotado e re-resolvendo as credenciais que aquela chamada usa. NUNCA gravar o valor resolvido de um secret em arquivo (regra de segurança do Eric): sempre re-resolver via `op read`/env em cada chamada.

- **Passo 0 — criar o workdir UMA vez e guardar o caminho:**
  ```bash
  WORK=$(mktemp -d); mkdir -p "$WORK/site"; echo "WORK=$WORK"   # ANOTE o caminho impresso
  ```
- **Preâmbulo — colar no início de CADA chamada Bash e no topo do `video.sh`** (numa chamada que só use uma credencial, colar só a linha dela + a linha do `WORK`):
  ```bash
  WORK=/caminho/impresso/no/passo/0            # SUBSTITUIR pelo valor literal anotado no passo 0
  OPENAI_API_KEY="${OPENAI_API_KEY:-$(op read "op://Agentes Eric/OPENAI_API_KEY/credential")}"
  HEYGEN_API_KEY="${HEYGEN_API_KEY:-$(op read "op://Agentes Eric/HEYGEN_API_KEY/credential")}"
  ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-$(op read "op://Agentes Eric/ELEVENLABS_API_KEY/credential")}"
  VTOK="${VERCEL_TOKEN:-$(op read "op://Agentes Eric/Token_Vercel_Produto_Claude_Eric/credential")}"
  CF_TOKEN="${CLOUDFLARE_API_TOKEN:-$(op read "op://Agentes Eric/CLOUDFLARE_API_TOKEN/credential")}"   # começa com cfut_
  ```
  Quem usa o quê: passo 2 (`video.sh`) → `HEYGEN_API_KEY` + `ELEVENLABS_API_KEY`; passo 3 → `OPENAI_API_KEY`; passos 6 e 7 → `VTOK` (e `CF_TOKEN` no 7). Passos 4/5/8 (Write/Edit/checagem de arquivo) não usam credencial, mas precisam do `WORK`.
- **op CLI (resolução de secrets) — ordem exata, do mais provável ao último recurso (nas 6 demos validadas o `op` sempre existia; itens 3-4 quase nunca disparam):**
  1. `command -v op` acha o binário → USAR direto. Os fallbacks `${VAR:-$(op read ...)}` do preâmbulo funcionam sozinhos: no PC do Eric e no container o `op` autentica via `OP_SERVICE_ACCOUNT_TOKEN` já exportado (Service Account read-only do vault "Agentes Eric"). Nada a instalar.
  2. `op` ausente, MAS as chaves já vêm no ambiente → como cada linha do preâmbulo é `${VAR:-$(op read ...)}`, se `VAR` já estiver exportada o `op` nunca é invocado. Testar as que a sessão usa: `for v in OPENAI_API_KEY HEYGEN_API_KEY ELEVENLABS_API_KEY VERCEL_TOKEN CLOUDFLARE_API_TOKEN; do [ -n "${!v}" ] && echo "$v ok" || echo "$v FALTA"; done`. Se nenhuma marcar FALTA → seguir sem `op`.
  3. `op` ausente E alguma chave FALTA E `OP_SERVICE_ACCOUNT_TOKEN` disponível → instalar o `op` v2 (só Linux/headless; no PC ele sempre existe). De onde vem o token fora do PC: no container = conteúdo do arquivo `/home/node/.claude/op_service_account_token` (`export OP_SERVICE_ACCOUNT_TOKEN="$(cat /home/node/.claude/op_service_account_token)"`); no PC do Eric já é env var de usuário `OP_SERVICE_ACCOUNT_TOKEN` (herdada por processo novo). Instalar sem root, dentro do `$WORK` (o nome do arquivo `op_linux_<arch>_v<versao>.zip` sob `/dist/1P/op2/pkg/v<versao>/` é estável; só a versão muda):
     ```bash
     case "$(uname -m)" in x86_64) OPARCH=amd64 ;; aarch64|arm64) OPARCH=arm64 ;; *) OPARCH=amd64 ;; esac
     OPVER=""   # PREENCHER com a versao estavel atual do op v2 — obter via WebFetch na pagina oficial (developer.1password.com/docs/cli). NAO chutar versao.
     [ -z "$OPVER" ] && { echo "defina OPVER com a versao atual do op v2 antes de instalar"; }
     mkdir -p "$WORK/bin"
     curl -sL "https://cache.agilebits.com/dist/1P/op2/pkg/v${OPVER}/op_linux_${OPARCH}_v${OPVER}.zip" -o "$WORK/op.zip"
     unzip -o "$WORK/op.zip" op -d "$WORK/bin" && chmod +x "$WORK/bin/op"
     export PATH="$WORK/bin:$PATH"
     command -v op || echo "instalacao do op falhou (cair no item 4)"
     ```
     (curl HTTPS no Windows/Schannel leva `--ssl-no-revoke`, ver item curl abaixo.)
  4. Sem `op`, sem chaves no env E sem `OP_SERVICE_ACCOUNT_TOKEN` → não há como resolver secret. Reportar ao Eric ("ambiente sem op, sem chaves exportadas e sem token de service account — não consigo autenticar") e PARAR. Nunca chumbar valor de token no texto.
- **node/npm (dependência DURA, sem fallback):** `command -v node`. O node aparece em quase todo o pipeline: escapar o JSON do TTS e do generate (passo 2a/2c), extrair `data.id`/`video_id`/`status`/`video_url` das respostas HeyGen (2b/2c/2d), decodificar o base64 das imagens (passo 3), instalar/rodar a CLI do Vercel (passo 6) e rodar o Playwright do screenshot (passo 8). SE `command -v node` falhar → a skill NÃO tem como rodar (nenhuma dessas etapas tem alternativa: `jq`/`python`/shell puro quebram no escaping de acento/aspas e no decode base64). Nos dois ambientes reais (PC do Eric e container VPS) o node já está instalado; se mesmo assim faltar, reportar ao Eric ("ambiente sem Node.js — a demo inteira depende dele, não dá pra rodar") e PARAR.
- **curl no Windows (backend Schannel):** todo curl HTTPS leva `--ssl-no-revoke` (sem isso: exit 35). Detectar: `curl -V | grep -qi schannel`. Em Linux, omitir a flag.
- **Foto ref do Eric (OBRIGATÓRIA — sem ela, parar):**
  1. SE existe `/workspace/agent-assets/fotos/eric/eric_avatar_profissional.jpg` (clone local do container) → `cp` pra `$WORK/eric.jpg` (não precisa de `gh`) e seguir.
  2. SENÃO → baixar do repo privado `ericlucianoferreira/agent-assets` via `gh`. ANTES, checar se o `gh` existe E está autenticado:
     ```bash
     if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then echo GH_OK; else echo GH_NAO; fi
     ```
     - SE `GH_OK` → baixar e validar:
       ```bash
       gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/eric_avatar_profissional.jpg \
         -H "Accept: application/vnd.github.raw" > "$WORK/eric.jpg"
       ```
       Validar: `$WORK/eric.jpg` > 10KB E `file "$WORK/eric.jpg"` contém "image". Se não bater → tratar como o caso `GH_NAO` abaixo.
     - SE `GH_NAO` (gh ausente OU sem auth/token) OU o download falhar/veio < 10KB → a foto é obrigatória e não há outra fonte. Reportar ao Eric ("não consigo obter a foto de referência do Eric: sem clone local em /workspace/agent-assets e sem gh autenticado") e PARAR. NUNCA seguir sem a foto — as 4 imagens do passo 3 dependem dela.

## Passos

### 1. Definir a empresa (segundos, sem chamadas externas)
- Inventar: nome, `slug` (kebab-case, sem acento — vira projeto Vercel e subdomínio), promessa, 3-4 números de impacto, 3 passos de "como funciona", copy do formulário.
- **Escrever a fala do vídeo** e salvá-la com a tool Write em `$WORK/fala.txt` (UTF-8). Gravar pela tool Write, NÃO por `echo`/`-d` no shell — isso evita o problema de escaping de aspas/quebras/acentos (o passo 2 lê esse arquivo). Formato: apresentação curta da empresa fictícia, em 1ª pessoa, na voz do Eric.
  - **Tamanho (definição verificável de "curta"):** 3 a 5 frases, ~70 a 110 palavras (~25-40s de fala). Mais que isso só alonga o render do HeyGen sem ganho.
  - **"Na voz do Eric" — checklist objetivo (a skill NÃO tem tool de voz; validar a fala contra ISTO antes de mandar pro TTS):**
    - [ ] Sem em-dash `—` (usar vírgula, dois-pontos, parênteses ou `..`).
    - [ ] "vc/vcs" ao falar com o público, nunca "tu/teu/tua".
    - [ ] Zero emoji.
    - [ ] Sem hype: nada de "revolucionário", "game changer", "mindset", "solução definitiva".
    - [ ] Sem saudação vazia de IA ("Olá pessoal", "Bom dia, tudo bem?"): começar direto no problema/promessa.
    - [ ] Sem "exatamente"/"faz todo sentido"/"com certeza" (fingerprint de IA).
    - [ ] Frases curtas e concretas, com pelo menos 1 dos números de impacto inventados.

### 2. VÍDEO PRIMEIRO — disparar em background no segundo 0
Escrever `$WORK/video.sh` (tool Write) com, NESTA ordem:
1. Cabeçalho + rede de segurança do sentinela:
```bash
#!/usr/bin/env bash
WORK=/caminho/do/passo/0                 # literal (o script roda detached, não herda variável)
trap '[ -f "$WORK/video.done" ] || echo "video.sh abortou sem sinalizar" > "$WORK/video.fail"' EXIT
HEYGEN_API_KEY="${HEYGEN_API_KEY:-$(op read "op://Agentes Eric/HEYGEN_API_KEY/credential")}"
ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-$(op read "op://Agentes Eric/ELEVENLABS_API_KEY/credential")}"
```
(Sem `set -e`: as falhas que importam já gravam `video.fail` + `exit 1` explícito nos guardas abaixo, e um erro transitório de rede no poll deve só repetir, não abortar. O `trap` cobre qualquer saída inesperada.)
2. O pipeline a-d abaixo (que termina gravando `$WORK/video.done` no sucesso ou `$WORK/video.fail` no erro).

Rodar com a tool Bash em `run_in_background: true` (comando: `bash "$WORK/video.sh"`). O `trap` garante que SEMPRE exista um sentinela (`video.done` ou `video.fail`) mesmo num erro inesperado — é assim que o passo 5 sabe que acabou, já que a skill não tem tool de acompanhamento de background. Só depois seguir pro passo 3, sem esperar aqui.

a) **TTS ElevenLabs** (voz Eric casual `HSqIMKW3FHpkAcy8JJLM`, modelo `eleven_turbo_v2_5`). Montar o corpo JSON com `node` lendo `$WORK/fala.txt` — o `JSON.stringify` escapa aspas, quebras de linha, barras e acentos da fala. NUNCA interpolar a fala crua na string `-d` (aspas/quebras na fala quebram o JSON e o shell):
```bash
node -e 'const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8").trim();process.stdout.write(JSON.stringify({text:t,model_id:"eleven_turbo_v2_5",voice_settings:{stability:0.35,similarity_boost:0.75,style:0.50,use_speaker_boost:true}}))' "$WORK/fala.txt" > "$WORK/tts.json"
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/HSqIMKW3FHpkAcy8JJLM?output_format=mp3_44100_128" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  --data @"$WORK/tts.json" \
  -o "$WORK/fala.mp3"
```
Validar: `$WORK/fala.mp3` > 20KB e NÃO começa com `{` (se começar com `{`, é JSON de erro — key/quota; gravar em `$WORK/video.fail` e sair != 0). Checar o 1º byte: `[ "$(head -c1 "$WORK/fala.mp3")" = "{" ] && { echo "ElevenLabs erro: $(cat "$WORK/fala.mp3")" > "$WORK/video.fail"; exit 1; }`.

b) **Upload do asset no HeyGen** — binário puro, NÃO multipart. Capturar `data.id` em `ASSET_ID` com `node` (usar `node`, não `jq` — `jq` pode não existir; `node` é pré-requisito). A variável persiste porque tudo isto roda dentro do mesmo `video.sh`:
```bash
ASSET_ID=$(curl -s -X POST "https://upload.heygen.com/v1/asset" \
  -H "x-api-key: $HEYGEN_API_KEY" -H "Content-Type: audio/mpeg" \
  --data-binary @"$WORK/fala.mp3" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write((j.data&&j.data.id)||"")})')
[ -z "$ASSET_ID" ] && { echo "HeyGen upload sem data.id" > "$WORK/video.fail"; exit 1; }
```

c) **Gerar o vídeo** — avatar "Eric 2026" + voice `type=audio` + `input_text` OBRIGATÓRIO (mesmo com áudio pronto, a API exige). Montar o corpo com `node` (injeta `$ASSET_ID` e a fala escapada de `$WORK/fala.txt`) e capturar `data.video_id`. **A recuperação de avatar (abaixo) tem que estar EMBUTIDA aqui no `video.sh`:** o script roda detached (`run_in_background`), então não dá pra, depois de lançado, listar avatares e reaplicar à mão — ou a lógica está escrita no script, ou não acontece. Por isso o guarda de `VIDEO_ID` vazio já resolve o avatar e regera, tudo dentro do script:
```bash
AVATAR_ID="bd4f2d9e3ed342a2999b2f585dacc567"
gen_body(){ node -e 'const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8").trim();const a=process.argv[2];const av=process.argv[3];process.stdout.write(JSON.stringify({video_inputs:[{character:{type:"avatar",avatar_id:av},voice:{type:"audio",audio_asset_id:a,input_text:t}}],dimension:{width:1280,height:720}}))' "$WORK/fala.txt" "$ASSET_ID" "$1"; }
generate(){ curl -s -X POST "https://api.heygen.com/v2/video/generate" -H "x-api-key: $HEYGEN_API_KEY" -H "Content-Type: application/json" --data @"$WORK/gen.json" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write((j.data&&j.data.video_id)||"")})'; }
gen_body "$AVATAR_ID" > "$WORK/gen.json"; VIDEO_ID=$(generate)
if [ -z "$VIDEO_ID" ]; then          # avatar pode ter mudado — resolver pelo avatar_name, DENTRO do script
  AV=$(curl -s "https://api.heygen.com/v2/avatars" -H "x-api-key: $HEYGEN_API_KEY")
  RES=$(printf '%s' "$AV" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch(e){};const out=[];(function w(o){if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==="object"){if("avatar_id"in o&&"avatar_name"in o)out.push(o);Object.values(o).forEach(w)}})(j);const er=out.filter(a=>/eric/i.test(a.avatar_name||""));const y=er.filter(a=>/2026/.test(a.avatar_name||""));if(y.length===1)process.stdout.write("ID:"+y[0].avatar_id);else if(y.length===0&&er.length===1)process.stdout.write("ID:"+er[0].avatar_id);else process.stdout.write("FAIL:"+out.map(a=>(a.avatar_name||"?")+" -> "+(a.avatar_id||"?")).join("; "))})')
  case "$RES" in
    ID:*) AVATAR_ID="${RES#ID:}"; gen_body "$AVATAR_ID" > "$WORK/gen.json"; VIDEO_ID=$(generate) ;;
    *)    echo "avatar Eric nao resolvido univocamente (mais de um 'eric' sem '2026', ou nenhum 'eric'): ${RES#FAIL:}" > "$WORK/video.fail"; exit 1 ;;
  esac
  [ -z "$VIDEO_ID" ] && { echo "HeyGen generate sem video_id mesmo apos resolver avatar" > "$WORK/video.fail"; exit 1; }
fi
```
Regra de resolução codificada acima (mantida idêntica): filtrar `avatar_name` com "eric" (case-insensitive); dentre esses, se algum tiver "2026" usar o `avatar_id` dele, senão se sobrou EXATAMENTE 1 "eric" usar esse; se sobrou mais de um "eric" sem "2026" OU nenhum "eric", NÃO escolher avatar qualquer (colocaria o rosto de um estranho na demo do Eric) — grava `$WORK/video.fail` com a lista `avatar_name -> avatar_id` e `exit 1`. O vídeo é best-effort: nesse caso o passo 5 lê o `video.fail` e entrega a demo SEM a seção de vídeo (avisando o Eric) — a demo não trava por causa do avatar.

d) **Poll** a cada 15s até `data.status == "completed"`, então baixar `data.video_url`. Extrair status/url com `node`. **O fallback de 404 (v1 → v2) tem que estar EMBUTIDO no loop** — o script roda detached, então não dá pra trocar a URL à mão depois de lançado; ou o loop já sabe cair pro v2, ou não cai. No FIM, sinalizar via arquivo-sentinela (o passo 5 lê `video.done`/`video.fail` — a skill não tem tool de acompanhamento de background):
```bash
STATUS_URL="https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID"; V2=0
for i in $(seq 1 60); do                       # 60 x 15s = teto de 15min
  R=$(curl -s "$STATUS_URL" -H "x-api-key: $HEYGEN_API_KEY")
  ST=$(printf '%s' "$R" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(((JSON.parse(d).data)||{}).status||""))' 2>/dev/null)
  if [ -z "$ST" ] && [ "$V2" = 0 ]; then       # v1 404/sem status -> cair pro v2 (mesma extracao), embutido pq detached
    STATUS_URL="https://api.heygen.com/v2/videos/$VIDEO_ID"; V2=1; continue
  fi
  if [ "$ST" = "completed" ]; then
    URL=$(printf '%s' "$R" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(((JSON.parse(d).data)||{}).video_url||""))')
    curl -s "$URL" -o "$WORK/site/video-eric.mp4"
    echo ok > "$WORK/video.done"; exit 0
  fi
  [ "$ST" = "failed" ] && { echo "HeyGen status=failed: $R" > "$WORK/video.fail"; exit 1; }
  sleep 15
done
echo "timeout 15min sem completar" > "$WORK/video.fail"; exit 1
```
O fallback embutido acima troca a URL do poll de `GET https://api.heygen.com/v1/video_status.get` para `GET https://api.heygen.com/v2/videos/$VIDEO_ID` (mesmo header e mesma extração) quando o v1 devolve 404/sem status. O teto de 15min está no `for`; ao estourar, grava `video.fail` e o passo 5 segue a entrega SEM a seção de vídeo (avisando o Eric).

### 3. Em paralelo: 4 imagens gpt-image-2
Enquanto o vídeo renderiza — hero com `quality=high`; c1/c2/c3 (carrossel) com `quality=medium`. Todas `size=1536x1024` (3:2), com a foto ref e `Preserve his exact face and identity` no prompt.

**Como montar cada `{cena da demo}` (o que distingue as 4):** todas coerentes com a empresa fictícia do passo 1, todas com o Eric em cena, cada uma VISUALMENTE distinta (ambiente e ação diferentes). Papel de cada uma:
- **hero** (`quality=high`, sai em `hero.png`): plano amplo de "capa" — o Eric no ambiente-símbolo da empresa, transmitindo a promessa principal. É o topo da página.
- **c1 / c2 / c3** (`quality=medium`, saem em `c1.png`/`c2.png`/`c3.png`): uma imagem para cada um dos 3 passos de "como funciona" do passo 1, na mesma ordem. Ângulos e cenas diferentes entre si e do hero.

Exemplo (empresa fictícia "Cano Mestre", encanamento inteligente):
- hero: `Eric, a confident plumbing-tech founder, standing in a bright modern utility room next to a smart water panel, arms crossed, wide establishing shot`
- c1: `Eric using a tablet to run a leak diagnostic on a home water system, over-the-shoulder close shot`
- c2: `Eric guiding a technician installing a smart valve under a kitchen sink`
- c3: `Eric reviewing a water-savings dashboard on a wall screen, satisfied`

Comando (repetir para as 4, trocando o `quality` e o arquivo de saída — `hero.png`, depois `c1.png`/`c2.png`/`c3.png`):
```bash
curl -s -X POST "https://api.openai.com/v1/images/edits" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F model=gpt-image-2 -F size=1536x1024 -F quality=high \
  -F "image[]=@$WORK/eric.jpg" \
  -F "prompt={cena da demo}. Preserve his exact face and identity." \
| node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(Buffer.from(JSON.parse(d).data[0].b64_json,"base64")))' > "$WORK/site/hero.png"
```
As 4 podem rodar em paralelo (`&` + `wait`). **Validação de cada `.png`:** (a) tamanho > 50KB; (b) é PNG de verdade — `file "$WORK/site/hero.png"` contém "PNG image" (se vier < 50KB ou não-PNG, o curl devolveu JSON de erro em vez da imagem). SE uma falhar → retry 1x; persistiu → seguir sem ela (ajustar o HTML) e avisar na entrega.

### 4. Montar o `index.html` (landing real, não vitrine)
Escrever em `$WORK/site/index.html`, já com a seção de vídeo apontando pra `video-eric.mp4` (que chega no passo 5). Seções NESTA ordem:

`nav → hero → barra de números → como funciona → quem está por trás (autoridade real do Eric: educador há 25 anos, CEO da Expert Integrado, mentor de IA no G4) → carrossel → vídeo → jogo → formulário → footer`

> **Sobre "preços" (o frontmatter e o resumo dizem que a skill inventa preços):** preço é dado inventável OPCIONAL, exibido INLINE na copy quando fizer sentido pra empresa fictícia (ex.: um "a partir de R$ X" no hero, dentro de "como funciona" ou perto do CTA/formulário). NÃO é uma seção própria: a lista de 10 seções acima é FIXA — não criar uma seção "Preços"/"Planos" dedicada nem mudar a ordem. Se a empresa fictícia não pede preço (serviço sob orçamento, etc.), simplesmente não citar preço. O checklist final conta essas mesmas 10 seções.

Regras duras ANTI-CARA-DE-IA:
1. Foto sempre com overlay/gradiente — nunca retrato cru gigante.
2. Paleta de UMA cor só.
3. Ícones SVG de linha — nunca emoji nos cards.
4. Copy específica (números, autoridade) — nunca genérica.

**Carrossel:** 3 imagens (c1/c2/c3), CSS literal `.slide img{width:100%;aspect-ratio:3/2;height:auto;object-fit:cover}` — proporção travada em 3:2 (a mesma das imagens geradas), nunca corta. Setas + dots + autoplay.

**Jogo:** alvos em chips estilizados (borda + glow + animação pop), não emoji solto. Alvo dourado = +5; alvo errado = -3 (a evitar); combo x2 a partir de 3 acertos seguidos e x3 a partir de 6, com barra de combo; animação de hit; ranking no fim.

**Formulário:** estático, SEM backend — é demo. O botão de submit NÃO tem endpoint real (nenhum POST/fetch pra lugar nenhum); ao enviar, o JS previne o envio e troca o form por uma mensagem de confirmação fake no próprio HTML (ex.: "Recebemos seu contato, retornamos em breve").

**Extra (só quando o Eric pedir QR):** QR Code via `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://instagram.com/ericluciano`.

### 5. Juntar o vídeo e fechar o pacote
A skill só tem Read/Write/Edit/Bash/telegram — sem tool de acompanhamento de processo. O sinal de fim do `video.sh` são os arquivos-sentinela que ele grava (passo 2d, garantidos pelo `trap` do passo 2). Mecânica exata:
- Depois de terminar as imagens (passo 3) e montar o HTML (passo 4), rodar UMA chamada Bash checando o estado:
  ```bash
  if [ -f "$WORK/video.done" ]; then echo DONE
  elif [ -f "$WORK/video.fail" ]; then echo "FAIL: $(cat "$WORK/video.fail")"
  else echo PENDING; fi
  ```
- **SE `DONE`** → confirmar `$WORK/site/video-eric.mp4` existe e > 500KB (`ls -l "$WORK/site/video-eric.mp4"`) → manter a `<section>` de vídeo no HTML apontando pra `video-eric.mp4`.
- **SE `FAIL`** → remover a `<section>` de vídeo do HTML (tool Edit) e anotar pra avisar o Eric na entrega.
- **SE `PENDING`** → o render ainda roda. Como o `video.sh` foi lançado com `run_in_background`, o harness te re-invoca quando ele terminar; ao ser re-invocado (ou após ~30-60s), rodar o mesmo check de novo. Repetir até `DONE`/`FAIL` — nunca fica infinito porque o `video.sh` tem teto de 15min e grava `video.fail` ao estourar. NÃO seguir pro deploy (passo 6) enquanto estiver `PENDING`: o deploy é de TUDO junto (nunca deploy parcial + redeploy).

### 6. Deploy Vercel (time expert-integrados-projects)
- Renomear a pasta pro slug (o nome da pasta vira o nome do projeto): `mv "$WORK/site" "$WORK/{slug}"`.
- CLI: se não houver `vercel` global, instalar local no `$WORK/cli`:
```bash
command -v vercel >/dev/null || npm i --prefix "$WORK/cli" vercel   # instala em $WORK/cli/node_modules/.bin/vercel (NÃO entra no PATH sozinho)
```
- **Resolver o caminho do binário** — o local instalado não está no PATH, então o deploy tem que invocar o caminho completo (sem isto, `vercel deploy` dá "command not found"):
```bash
VERCEL_BIN="$(command -v vercel || echo "$WORK/cli/node_modules/.bin/vercel")"
```
- Deploy (limpar env de projeto herdado; usar o `$VERCEL_BIN` resolvido acima):
```bash
cd "$WORK/{slug}" && env -u VERCEL_ORG_ID -u VERCEL_PROJECT_ID \
  "$VERCEL_BIN" deploy --prod --yes --token "$VTOK" --scope expert-integrados-projects
```
- **Desabilitar SSO** (o projeto nasce com `ssoProtection` e pede login Vercel):
```bash
curl -s -X PATCH "https://api.vercel.com/v9/projects/{slug}?teamId=team_UAgnWON7MrvFUEjnZinLfUpg" \
  -H "Authorization: Bearer $VTOK" -H "Content-Type: application/json" -d '{"ssoProtection":null}'
```
- **Verificar CONTEÚDO** (não só 200):
```bash
curl -s "https://{slug}.vercel.app" | grep -c "{nome da empresa}"          # tem que ser > 0
curl -sI "https://{slug}.vercel.app/hero.png" | grep -i "content-type: image"
```
- SE grep = 0 ou content-type errado → o alias pode ser de outro projeto/build antigo. Repetir o deploy 1x; persistiu → reportar com o diagnóstico e parar.
- **Entregar o link `.vercel.app` JÁ** — mandar AGORA a mensagem 1 (template do passo 8, SEM a linha do domínio próprio), sem esperar o domínio próprio.

### 7. Domínio próprio `{slug}.ericluciano.com.br`
a) **Anexar no Vercel:**
```bash
curl -s -X POST "https://api.vercel.com/v10/projects/{slug}/domains?teamId=team_UAgnWON7MrvFUEjnZinLfUpg" \
  -H "Authorization: Bearer $VTOK" -H "Content-Type: application/json" \
  -d '{"name":"{slug}.ericluciano.com.br"}'
```
b) CNAME no Cloudflare (zona `ericluciano.com.br`, id `48ff0f4bd2bf17da3f66e4d739b98e2f`):
```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/48ff0f4bd2bf17da3f66e4d739b98e2f/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"{slug}","content":"cname.vercel-dns.com","proxied":false}'
```
c) Como a zona já existe noutra conta Vercel, o domínio vem `verified:false` pedindo TXT: ler `verification[].value` em `GET https://api.vercel.com/v9/projects/{slug}/domains/{slug}.ericluciano.com.br?teamId=...` → criar TXT `_vercel` na zona (mesmo endpoint do CNAME, `{"type":"TXT","name":"_vercel","content":"{value}"}`) → `POST .../domains/{fqdn}/verify?teamId=...`.
d) SSL leva minutos. Loop explícito — **40 tentativas de 15s = teto de ~10min** (mesma cadência do poll do passo 2d). Sucesso = HTTP 200 E grep do nome da empresa > 0:
```bash
OK=0
for i in $(seq 1 40); do                       # 40 x 15s = ~10min
  CODE=$(curl -s -o "$WORK/dom.html" -w "%{http_code}" "https://{slug}.ericluciano.com.br")
  if [ "$CODE" = "200" ] && grep -q "{nome da empresa}" "$WORK/dom.html"; then OK=1; break; fi
  sleep 15
done
echo "OK=$OK"
```
(curl HTTPS no Windows/Schannel leva `--ssl-no-revoke`, ver Pré-requisitos.) SE `OK=1` → mandar a **mensagem 2** — curta e separada, ex.: `Domínio próprio no ar: https://{slug}.ericluciano.com.br`. SE o loop esgotar (`OK=0`, ~10min sem 200+grep) → NÃO mandar a mensagem 2 e avisar que o domínio ainda propaga (o `.vercel.app` da mensagem 1 já está no ar). Não estender o loop além das 40 tentativas.

### 8. QA + entrega
- **Screenshot** com Playwright (node), viewport fixo — NÃO `fullPage` (print alto demais estoura `PHOTO_INVALID_DIMENSIONS` no Telegram; se precisar, redimensionar):
```bash
node -e 'const{chromium}=require("playwright");(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});await p.goto(process.argv[1],{waitUntil:"networkidle"});await p.screenshot({path:process.argv[2]});await b.close();})()' \
  "https://{slug}.vercel.app" "$WORK/print.png"
```
  SE Playwright não estiver disponível → pular o print e entregar só as URLs.
- **Entrega — mensagem 1 (logo após o passo 6, sem esperar o domínio):** SE o pedido veio por Telegram → `mcp__plugin_telegram_telegram__reply` no chat_id de origem com o print em `files` e o texto (SEM a linha do domínio próprio):
```
{Nome da empresa} no ar:
https://{slug}.vercel.app
```
  SENÃO → mesma URL + path do print no chat. A **mensagem 2** (domínio próprio) sai depois, separada, pelo passo 7d — nunca juntar as duas na mesma mensagem.
- **Limpar:** `rm -rf "$WORK"`.

## Validação final (checklist)
- [ ] Vídeo do avatar embutido e servido (ou Eric avisado de que a demo saiu sem vídeo).
- [ ] 4 imagens gpt-image-2 no ar com content-type de imagem (ou aviso das que faltaram).
- [ ] Landing com as 10 seções na ordem do passo 4.
- [ ] Anti-cara-de-IA: overlay na foto, 1 cor, SVG de linha, copy com números.
- [ ] Carrossel 3:2 sem corte, setas + dots + autoplay; jogo com dourado +5 / errado -3 / combo x2-x3 / ranking.
- [ ] Acentuação correta em todo o texto da landing.
- [ ] `.vercel.app` verificado por CONTEÚDO (grep > 0), SSO desabilitado.
- [ ] Link `.vercel.app` entregue primeiro; domínio próprio só após 200 + grep.
- [ ] Print enviado (viewport, não fullPage) e `WORK` limpo.

## Erros comuns e recovery
- **Vercel 403 em escrita** → token pessoal SAML em uso. Trocar pro `Token_Vercel_Produto_Claude_Eric` (time `expert-integrados-projects`).
- **Página pede login Vercel** → `ssoProtection` ativo; rodar o PATCH do passo 6.
- **Domínio `verified:false`** → esperado (zona noutra conta Vercel); seguir o fluxo TXT `_vercel` do passo 7c.
- **curl exit 35 (Windows)** → faltou `--ssl-no-revoke`.
- **HeyGen upload 4xx** → provavelmente multipart; refazer com `--data-binary` + `Content-Type: audio/mpeg`.
- **HeyGen generate reclama de voice** → faltou `input_text` (obrigatório mesmo com `type=audio`).
- **`fala.mp3` começa com `{`** → ElevenLabs devolveu erro JSON (key/quota); ler a mensagem e reportar.
- **JSON malformado no TTS/generate, ou fala com aspas/quebras "sumindo"** → interpolou a fala crua na string `-d`. Salvar a fala em `$WORK/fala.txt` (tool Write) e montar o corpo com `node` (`JSON.stringify`) + `curl --data @arquivo` (passos 1, 2a, 2c) — nunca `-d '{"text":"..."}'` com o texto inline.
- **`jq: command not found` / não sei extrair campo do JSON** → não usar `jq` (pode não existir); extrair com `node -e` como nos passos 2b/2c/2d/3.
- **curl/API sem credencial (ex.: 401 silencioso) numa chamada Bash** → a variável do secret não persiste entre chamadas Bash; faltou colar o preâmbulo dos Pré-requisitos no início daquela chamada (ou o `WORK` literal). Re-resolver via `op read`/env, nunca gravar o secret em arquivo.
- **Passo 5 fica `PENDING` pra sempre** → o `video.sh` não gravou sentinela; conferir que ele tem o `trap ... EXIT` do passo 2 e o `WORK` literal correto no topo. O teto de 15min do `for` do passo 2d sempre grava `video.fail` ao estourar.
- **`PHOTO_INVALID_DIMENSIONS` no Telegram** → print fullPage alto demais; refazer com viewport fixo ou redimensionar.
- **Mesma chamada falhou 2x com o mesmo erro** → parar (circuit breaker), reportar diagnóstico; nunca a 3ª tentativa idêntica.

## Nota de validação
v3.1 (30/06/2026), validada em 6 demos reais: Cano Mestre, EcoRota, NovaFibra, Codeflow, Sapatto Mania e "Eric Domador de Leões" (fluxo vídeo-primeiro + token/scope Vercel + TXT de verificação).
