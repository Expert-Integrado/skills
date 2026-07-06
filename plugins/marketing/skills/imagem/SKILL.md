---
name: imagem
description: Gera e edita imagens do Eric ou da Expert Integrado com dois backends (OpenAI gpt-image-2 primário, Gemini 2.5 Flash Image fallback). SEMPRE usa foto real do catálogo como referência quando envolve o Eric. TRIGGER quando Eric pedir "gera imagem", "edita foto", "cria imagem com minha cara", "coloca eu de...", "thumbnail pro YouTube", "banner pro site" ou descrever edição visual envolvendo ele ou a marca. NÃO disparar para apresentação/slides HTML (skill apresentacao-html), reels (criar-reel), carrossel (carrossel-studio) nem hero de post de blog (gerar-hero-blog).
allowed-tools: Bash, Read
---

# Imagem — Geração e Edição com Identidade

Gera/edita imagens do Eric ou da marca. Backend primário = OpenAI gpt-image-2 (edição fiel de identidade, ~3min); fallback = Gemini 2.5 Flash Image (~15s). Quando o Eric aparece na imagem, a geração NUNCA é from-scratch: baixa uma foto real do catálogo `agent-assets` e edita a partir dela. Confirma o formato antes de gerar, aplica a paleta canônica quando é material Expert/Super SDR, gera em pasta temporária e entrega (não salva permanente por padrão).

## NUNCA
- Gerar imagem do Eric SEM foto real de referência — geração sem referência produz pessoa genérica.
- Usar `generate` (from-scratch) pra simular o Eric — sempre `edit` a partir de foto real do catálogo.
- Salvar a imagem em local permanente por padrão — só gerar em pasta temp e entregar; salvar apenas se Eric pedir.
- Baixar a foto de referência pela Contents API padrão (JSON base64): arquivo >1MB volta com `.content` vazio → OpenAI devolve `invalid_image_file`. SEMPRE baixar com header raw (passo 3).
- Usar cor fora da paleta canônica em material Expert Integrado ou Super SDR.

## SEMPRE
- Confirmar o formato antes de gerar, se não estiver óbvio no pedido (passo 1).
- Quando envolver o Eric: ler o catálogo, escolher a foto por `tags`/`uso` e passar como `--image`.
- Material Expert Integrado ou Super SDR → paleta canônica (seção Paletas). Pessoal → cores livres.
- Backend primário = OpenAI gpt-image-2; cair pro Gemini só se OpenAI falhar OU se Eric pedir "usa Gemini/Flash".
- Texto em português dentro da imagem (se houver): acentuação correta.

## Pré-requisitos
- CLIs: `gh` (autenticado no GitHub), `op` (1Password), Python 3.12 com `openai` instalado (`pip install openai`); pro fallback, `google-generativeai`. Detectar com `command -v gh op`.
  - **Binário AUSENTE (não só deslogado):** se `command -v gh` OU `command -v op` não retornar nada, o CLI não está instalado — parar e reportar ao Eric com o comando de instalação, NUNCA prosseguir sem: `gh` → `winget install --id GitHub.cli`; `op` → `winget install --id AgileBits.1Password.CLI`. (Deslogado é caso diferente: `gh` instalado mas sem auth → `gh auth login`, tratado nos passos 2-3.)
  - **`op` instalado mas SEM sessão válida (análogo a `gh` deslogado):** só checar isto se for realmente precisar do `op read` — isto é, se a credencial correspondente NÃO estiver já no env. Checagem verificável: `op whoami` (imprime a conta ativa e sai 0 se autenticado; sai != 0 se sem sessão). Saiu != 0 → `op` sem sessão. No PC do Eric o `op` autentica por Service Account token (env `OP_SERVICE_ACCOUNT_TOKEN`), então "sem sessão" = esse token ausente/expirado. Recovery, nesta ordem: (a) se `OPENAI_API_KEY`/`GEMINI_API_KEY` já está no env, o `op read` nem é usado — seguir normal, sem checar `op`; (b) senão, reportar ao Eric ("op sem sessão — rodar `op signin` ou reexportar OP_SERVICE_ACCOUNT_TOKEN") e PARAR. NÃO repetir `op read` em loop (circuit breaker: 2 falhas iguais = parar).
- Credenciais (env ou 1Password vault "Agentes Eric"):
  - `OPENAI_API_KEY` → `op read "op://Agentes Eric/OPENAI_API_KEY/credential"`
  - `GEMINI_API_KEY` → `op read "op://Agentes Eric/GEMINI_API_KEY/credential"`
  - O script `image_gen.py` já lê `OPENAI_API_KEY` do env ou do 1Password sozinho — não precisa exportar à mão.
- Repo de fotos: `ericlucianoferreira/agent-assets` (privado) → catálogo `fotos/eric/catalogo.json`.
- Variáveis de ambiente (default do PC do Eric, sobrescrevíveis — mantêm a skill portável):
  ```bash
  PYTHON="${PYTHON:-C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe}"
  # IMG_SCRIPT: esta e uma skill de PLUGIN (nao standalone) — o image_gen.py vive ao lado deste SKILL.md,
  # em scripts/image_gen.py. Resolver o 1o path existente (cache do plugin, versao-agnostico; repo clonado como fallback):
  if [ -z "$IMG_SCRIPT" ]; then
    for cand in \
      "$HOME/.claude/plugins/cache/expertintegrado/marketing"/*/skills/imagem/scripts/image_gen.py \
      "C:/repos/expertintegrado-skills/plugins/marketing/skills/imagem/scripts/image_gen.py"; do
      [ -f "$cand" ] && IMG_SCRIPT="$cand" && break
    done
  fi
  [ -f "$IMG_SCRIPT" ] || echo "image_gen.py nao encontrado — setar IMG_SCRIPT manual (ver Erros comuns)"
  WORK="${IMG_WORK:-C:/tmp}"; mkdir -p "$WORK"

  # DETECÇÃO DE AMBIENTE (rodar AQUI, antes do passo 4 — não esperar o passo 4 falhar):
  # o default acima assume o PC do Eric (Windows). Validar por CAPACIDADE, não por nome de SO:
  # testar se o $PYTHON default roda um interpretador. Roda → é o ambiente do PC, seguir com os defaults.
  # Não roda (headless/Linux/container/outro user, onde o path Windows não existe) → resolver por command -v + workdir POSIX.
  if ! "$PYTHON" -c "import sys" >/dev/null 2>&1; then
    PYTHON="$(command -v python3 || command -v python)"   # só cai aqui quando o default falhou; no PC NÃO usar (pega o stub WindowsApps — ver Erros comuns)
    WORK="${IMG_WORK:-$(mktemp -d)}"; mkdir -p "$WORK"
    [ -n "$PYTHON" ] && "$PYTHON" -c "import sys" >/dev/null 2>&1 \
      || echo "Python ausente/inválido — instalar Python 3.12+ com openai (ver Pré-requisitos) e reexportar PYTHON"
  fi
  ```
  Nota: no PC usa-se path Windows (`C:/tmp`) de propósito — o Python do Windows NÃO lê paths Git-bash `/tmp/...`. Override manual continua valendo (a detecção só age quando o default não resolve): setar `PYTHON=...` / `IMG_WORK=...` no env vence, porque os defaults usam `${VAR:-...}`.

## Passos

> **Shell NÃO persiste entre chamadas Bash — rode o fluxo numa invocação só.** A tool Bash executa cada bloco fenced como uma invocação separada; só o `cwd` sobrevive entre chamadas, variáveis de shell NÃO. Se você rodar os blocos soltos, `$PYTHON`/`$IMG_SCRIPT`/`$WORK` (e `$GEMINI_API_KEY` no passo 6) chegam VAZIOS nos passos seguintes → path relativo errado e Python sem script. Regra: **concatene o bloco de setup dos Pré-requisitos + os comandos dos passos que usam essas variáveis (3 → 4, e 6 se cair no fallback) numa ÚNICA chamada Bash.** Motivo extra pra não re-rodar o setup em chamadas separadas: no caminho headless o `$WORK` vem de `mktemp -d`, que cria um diretório DIFERENTE a cada invocação — re-derivar `$WORK` em chamadas distintas apontaria `eric_ref.jpg` e `imagem-gerada.jpg` pra pastas diferentes e quebraria a referência. Se for inevitável dividir, faça `echo "$WORK"` na 1ª chamada e reuse o path LITERAL impresso nas seguintes, em vez de re-derivar `$WORK`. Nunca dependa de uma variável exportada numa chamada Bash anterior.

### 1. Confirmar formato (se não óbvio)
Se o pedido já indica o formato (ex: "thumbnail pro YouTube", "banner do site"), pular. Senão, perguntar UMA vez:

```
Qual formato?
- **Story** (1080x1920) — Instagram Stories, Reels
- **YouTube** (1280x720) — thumbnails, banners
- **Quadrado** (1024x1024) — feed Instagram, LinkedIn
- **4x5** (1024x1280) — feed Instagram retrato
- **Horizontal** (1536x1024) — sites, banners largos
```

Mapear o formato pedido pro `--size` aceito pelo gpt-image-2 (ele só aceita `1024x1024`, `1536x1024`, `1024x1536`, `auto`):

| Formato pedido | Proporção | `--size` gpt-image-2 |
|----------------|-----------|----------------------|
| Story, 4x5 | retrato | `1024x1536` |
| YouTube, Horizontal | paisagem | `1536x1024` |
| Quadrado | quadrado | `1024x1024` |

**Pixel exato importa? Critério verificável:** o gpt-image-2 só entrega `1024x1024`/`1536x1024`/`1024x1536`. As plataformas (YouTube, Instagram, sites) aceitam a PROPORÇÃO e reescalam sozinhas, então o pixel exato NÃO importa por padrão → gerar na proporção mais próxima da tabela acima e entregar. Tratar o pixel exato como obrigatório APENAS se o pedido exigir a dimensão de forma literal e cravada — o Eric escrever o número em pixels + dizer que tem de ser exato (ex.: "exatamente 1280x720", "tem que ter 1080x1920 cravado"), ou um sistema que rejeita outros tamanhos. Só nesse caso: usar o Gemini (passo 6, respeita a proporção da foto de referência) OU avisar o Eric que o gpt-image-2 não crava pixel e perguntar como seguir — nunca esticar/distorcer.

### 2. Escolher a foto do catálogo (só se a imagem envolve o Eric)
Ler o catálogo e escolher a foto por `tags`/`uso` conforme o contexto:

```bash
gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/catalogo.json \
  -H "Accept: application/vnd.github.raw"
```

O JSON é um **array na raiz** (não vem envolto em nenhuma chave — iterar direto sobre ele). Cada entrada tem `file`, `uso` (pra que serve) e `tags` (array de strings). Formato literal (2 entradas de exemplo, extraídas do catálogo real):

```json
[
  {"file": "eric_branco_olhar_direto.jpg", "uso": "identidade frontal, LinkedIn, thumbnails", "tags": ["casual", "estudio", "branco", "frontal"]},
  {"file": "eric_terno_perfil.jpg", "uso": "perfil profissional, B2B", "tags": ["formal", "estudio", "terno", "perfil"]}
]
```

Guia de escolha:
- Edição fiel / identidade → `tags` `identidade`/`referencia` (ex: `eric_avatar_profissional.jpg`, `eric_branco_bracoscruzados.jpg`).
- Perfil B2B / terno → `formal` (ex: `eric_terno_perfil.jpg`, `eric_terno_sorrindo.jpg`).
- Palco / apresentação → `palestra` (ex: `eric_palestra_chatgpt.jpg`).
- Frontal pra thumbnail/LinkedIn → `frontal` (ex: `eric_branco_olhar_direto.jpg`).

**Pedido envolve o Eric mas não casa NENHUMA das 4 categorias acima** (ex.: casual, hobby, lazer, academia, esporte, fantasia genérica): a cena/atividade/figurino vem do `--prompt` (a edição), NÃO de uma foto temática do catálogo — o contexto todo entra pelo prompt (como no exemplo do pirata). Escolha determinística da foto-base:
- Destino pede rosto de frente (thumbnail, LinkedIn, capa, avatar) → tag `frontal`.
- Caso contrário → default tag `identidade`/`referencia` (base neutra, de maior precedência, melhor para transformação livre preservando o rosto).
Depois rodar o Desempate abaixo dentro da tag escolhida. NÃO perguntar ao Eric nesse caso — o default já resolve num arquivo único; só cair na "Regra final de ambiguidade" se, mesmo assim, restar dúvida real entre 2 fotos.

**Precedência quando o pedido ativa 2+ categorias** (ex.: pede "foto formal, bem fiel" → casa `identidade`/`referencia` E `formal` ao mesmo tempo): aplicar a ordem de precedência `identidade`/`referencia` > `formal` > `palestra` > `frontal`. A categoria de maior precedência vence e define a tag a filtrar (edição fiel de identidade é o objetivo-mor da skill, por isso lidera). Só então rodar o Desempate abaixo dentro da tag vencedora.
- Regra final de ambiguidade: SE, mesmo depois de aplicada a precedência, ainda restar dúvida real entre 2 fotos de categorias diferentes (o pedido não deixa claro qual intenção domina) → mostrar as 2 candidatas ao Eric e perguntar qual usar, em vez de adivinhar.

**Desempate (mais de uma foto casa com a mesma tag — sempre resolve num arquivo único, nunca "adivinhar"):**
1. Filtrar as entradas cujo array `tags` contém a tag do contexto.
2. Entre as candidatas, escolher aquela cujo campo `uso` **casa** com o pedido/destino. **"Casar" = match LITERAL, não semântico (critério verificável):** uma candidata casa quando alguma palavra de conteúdo do pedido/destino (>= 3 letras; ignorar preposições/artigos como "de", "pro", "com") aparece como substring **case-insensitive** dentro do campo `uso`. Os exemplos são todos substring literal: pedido cita "LinkedIn"/"thumbnail" → `uso` que contém "LinkedIn"/"thumbnails"; "B2B"/"perfil" → `uso` "perfil profissional, B2B"; "simpático" → `uso` "perfil profissional simpático". Sinônimo que NÃO é substring literal (ex.: pedido diz "executivo" e `uso` diz "perfil profissional, B2B" — sinônimo, mas nenhuma palavra literal em comum) **NÃO conta como match**: na menor dúvida se a palavra está literalmente contida no `uso`, tratar como "não casou" e seguir pro item 3. Isso mantém o desempate 100% determinístico e sempre terminante (nunca vira julgamento subjetivo).
3. Se nenhuma `uso` casar, ou se mais de uma casar igual, usar a PRIMEIRA candidata na ordem em que aparece no array do catálogo (de cima pra baixo). Essa regra é determinística e sempre termina num único `file`.
   - Ex.: tag `formal` retorna `eric_terno_perfil.jpg` e `eric_terno_sorrindo.jpg`. Pedido "perfil B2B" → `eric_terno_perfil.jpg` (uso casa). Pedido "formal" sem mais contexto → `eric_terno_perfil.jpg` (primeiro no array).

**Validação:** o JSON precisa retornar a lista de fotos. Se vier 404/vazio → repo/caminho errado ou `gh` não autenticado (`gh auth status`); reportar e parar.

### 3. Baixar a foto de referência (raw — obrigatório)
```bash
gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/ARQUIVO.jpg \
  -H "Accept: application/vnd.github.raw" > "$WORK/eric_ref.jpg"
```
Motivo do header raw: a Contents API zera o `.content` inline pra arquivos >1MB → `base64 -d` gera arquivo vazio e o OpenAI responde `invalid_image_file`.

**Validação:** `[ -s "$WORK/eric_ref.jpg" ]` (arquivo não-vazio). Se estiver vazio (o comando acima JÁ usa o header raw — então não é o base64 truncado; diagnosticar a causa real, sem repetir cegamente):
1. Reexecutar o mesmo `gh api` SEM o `>` de redirecionamento pra ler o corpo da resposta:
   `gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/ARQUIVO.jpg -H "Accept: application/vnd.github.raw"`
2. Corpo vem **404 / "Not Found"** → o nome do arquivo está errado → voltar ao passo 2, escolher um `file` que exista no catálogo e refazer.
3. Corpo vem **erro de auth / 401 / "Bad credentials"** → `gh auth status`; se não autenticado, reportar ao Eric ("gh não autenticado — rodar `gh auth login`") e parar.
4. Corpo vem OK (bytes da imagem) mas o arquivo salvo continua vazio → confirmar que `$WORK` é gravável (`touch "$WORK/.t" && rm "$WORK/.t"`) e refazer o redirecionamento pra dentro de `$WORK`; persistindo, reportar ao Eric e parar.

### 4. Gerar com o backend primário (OpenAI gpt-image-2)

**Edição a partir de foto do Eric:**
```bash
"$PYTHON" "$IMG_SCRIPT" edit \
  --model gpt-image-2 \
  --image "$WORK/eric_ref.jpg" \
  --prompt "DESCRIÇÃO_TÉCNICA_DA_EDIÇÃO" \
  --out "$WORK/imagem-gerada.jpg" \
  --size 1024x1536 \
  --output-format jpeg \
  --force \
  --quality high
```

**Geração sem referência (banner/ilustração SEM rosto):**
```bash
"$PYTHON" "$IMG_SCRIPT" generate \
  --model gpt-image-2 \
  --prompt "DESCRIÇÃO_TÉCNICA" \
  --out "$WORK/imagem-gerada.jpg" \
  --size 1024x1024 \
  --output-format jpeg \
  --force \
  --quality high
```

Trocar o `--size` pelo mapeado no passo 1. Prompt = descrição técnica e objetiva da edição/cena. Classificar o pedido pelo critério no início da seção Paletas: se for material Expert/Super SDR, citar os hex da paleta correspondente no prompt; se for pessoal, cores livres; se ambíguo, perguntar uma vez (ver Paletas).

**Template do `--prompt` (edição a partir de foto do Eric)** — preencher os placeholders nesta ordem:
```
{cena/fundo}, {ajustes na pessoa — manter rosto}, {estilo/paleta com hex quando aplicável}, {enquadramento}
```
Nível de detalhe esperado = o prompt-exemplo do pirata (seção "Exemplo", passo 4): "Retrato do mesmo homem vestido de pirata, chapéu de pirata, cenário de navio, iluminação cinematográfica, preservar rosto e identidade". Mapeando aos placeholders: `cenário de navio` = cena/fundo; `vestido de pirata, chapéu de pirata` + `preservar rosto e identidade` = ajustes na pessoa (manter rosto); `iluminação cinematográfica` = estilo (trocar por "paleta `#hex`, `#hex`" quando for material Expert/Super SDR); `Retrato do mesmo homem` = enquadramento.

**Características:** ~3min por imagem; excelente preservação de identidade em edits; tamanhos aceitos `1024x1024`, `1536x1024`, `1024x1536`, `auto`.

**Validação:** o script imprime `OK: <path> — <n> bytes` e sai com código 0. Se sair diferente de 0 → passo 6 (fallback Gemini).

### 5. Entregar ao Eric
`Read` no arquivo de saída (`$WORK/imagem-gerada.jpg`) pra pré-visualizar/anexar e entregar. NÃO salvar permanente a menos que Eric peça ("salva em X").

Mecanismo da entrega: por padrão é na MESMA sessão — o `Read` já anexa a imagem à resposta, então basta responder ao Eric. SE o pedido chegou por um canal externo (ex.: Telegram), o `Read` sozinho não chega ao canal: enviar o arquivo pela tool de resposta desse canal (ex.: `mcp__plugin_telegram_telegram__reply` passando o path absoluto da imagem em `files` + o `chat_id` do canal).

### 6. Fallback — Gemini 2.5 Flash Image
Acionar se o OpenAI falhar (passo 4, exit != 0) OU se Eric pedir "usa Gemini/Flash". Modelo: `gemini-2.5-flash-image`. Requer o pacote `google-generativeai` (Pré-requisitos).

Diferente do `image_gen.py` (que lê a key sozinho), aqui a `GEMINI_API_KEY` é resolvida ANTES de rodar e exportada pro ambiente; o script abaixo a lê de `os.environ`. Comando pronto — copiar/colar como está, trocando só a `DESCRIÇÃO_TÉCNICA_DA_EDIÇÃO` (usa os mesmos `$PYTHON`, `$WORK` e `$WORK/eric_ref.jpg` dos passos anteriores):

```bash
# 1. resolver a key (env, senão 1Password) e exportar
export GEMINI_API_KEY="${GEMINI_API_KEY:-$(op read "op://Agentes Eric/GEMINI_API_KEY/credential")}"

# 2. gravar o script no $WORK (heredoc — sem substituição de variável dentro por causa do 'PYEOF' entre aspas)
cat > "$WORK/gemini_gen.py" <<'PYEOF'
import os, sys, base64
import google.generativeai as genai

ref, out, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash-image")

with open(ref, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

response = model.generate_content(
    [{"inline_data": {"mime_type": "image/jpeg", "data": img_b64}}, prompt],
    generation_config={"response_modalities": ["IMAGE", "TEXT"]},
)

for part in response.candidates[0].content.parts:
    if getattr(part, "inline_data", None) and part.inline_data.data:
        with open(out, "wb") as g:
            g.write(part.inline_data.data)
        print(f"OK: {out} — {len(part.inline_data.data)} bytes")
        break
else:
    sys.exit("ERRO: Gemini nao retornou imagem")
PYEOF

# 3. rodar: <ref> <saida> <prompt>
"$PYTHON" "$WORK/gemini_gen.py" "$WORK/eric_ref.jpg" "$WORK/imagem-gerada.jpg" "DESCRIÇÃO_TÉCNICA_DA_EDIÇÃO"
```

Geração SEM referência (banner/ilustração sem rosto) no Gemini: passar um `ref` inexistente não funciona — nesse caso remova o bloco `inline_data` da lista e chame `generate_content([prompt], ...)`. Para o caso padrão (edição a partir da foto do Eric), usar o comando acima como está.

**Validação:** o script imprime `OK: <path> — <n> bytes` (código 0) e grava em `$WORK/imagem-gerada.jpg`. Se sair com `ERRO:` → ver Erros comuns (Gemini) ou, se OpenAI e Gemini falharam, avisar o Eric e parar.

**Características:** ~15s por imagem; bom em preservar identidade; modelo `gemini-2.5-flash-image`.

## Paletas (usar SEMPRE em material Expert / Super SDR; pessoal = cores livres)

**Como classificar o pedido (critério verificável — decidir ANTES de montar o prompt do passo 4):**
- **Paleta Expert Integrado** SE o pedido cita "Expert", "Expert Integrado", "institucional", "material da empresa", um produto/serviço da empresa, ou o destino é canal oficial da Expert (site institucional, LinkedIn/Instagram da empresa).
- **Paleta Super SDR** SE o pedido cita "Super SDR" ou o produto Super SDR.
- **Cores livres (pessoal) = DEFAULT em todo o resto:** conteúdo pessoal do Eric, fantasia/diversão (ex.: "coloca eu de pirata"), canal/redes pessoais, ou quando nenhuma marca/produto é citado. A paleta canônica é a EXCEÇÃO (só entra pelos gatilhos acima); na ausência de gatilho, cores livres.
- **Ambíguo de verdade** (o destino pode ser institucional OU pessoal e o pedido não cita marca — ex.: "thumbnail pro YouTube" sem dizer o canal): perguntar UMA vez, "É material da Expert/Super SDR (uso a paleta canônica) ou pessoal (cores livres)?", e seguir a resposta. Não assumir.

### Expert Integrado (material institucional)
| Cor | Hex | Uso |
|-----|-----|-----|
| Azul principal | `#575ECF` | primário, CTAs, destaques |
| Laranja | `#FE7B02` | acentos, energia |
| Vermelho | `#FE3F21` | alertas, urgência |
| Rosa | `#F858BC` | detalhes, diferenciação |
| Fundo escuro | `#1b1b1b` | backgrounds, hero sections |
| Fundo claro | `#FCFBF8` | backgrounds claros |
| Texto | `#c5c1b9` / `#dcdad5` | texto secundário |

### Super SDR (produto)
| Cor | Hex | Uso |
|-----|-----|-----|
| Azul | `#3c83f6` | primário |
| Verde neon | `#00d6a4` / `#33ffcf` | sucesso, métricas positivas |
| Dourado | `#e7b008` / `#f99e1f` | premium, destaque |
| Fundo escuro | `#0d1526` / `#142c52` | backgrounds |

## Credenciais
| Var | Backend | Fonte (1Password) |
|-----|---------|-------------------|
| `OPENAI_API_KEY` | gpt-image-2 | `op read "op://Agentes Eric/OPENAI_API_KEY/credential"` |
| `GEMINI_API_KEY` | Gemini Flash Image | `op read "op://Agentes Eric/GEMINI_API_KEY/credential"` |

## Validação final (checklist antes de entregar)
- [ ] Formato confirmado (ou óbvio no pedido) e `--size` mapeado corretamente.
- [ ] Se envolve o Eric: usou `edit` com foto real do catálogo (nunca `generate` from-scratch).
- [ ] Foto de referência baixada com header raw e não-vazia (`[ -s ]`).
- [ ] Material Expert/Super SDR: paleta canônica aplicada no prompt.
- [ ] Script saiu com `OK: ... bytes` (código 0) OU fallback Gemini gerou a imagem.
- [ ] Arquivo entregue; não salvo permanente (a menos que Eric tenha pedido).
- [ ] Identidade confere com o Eric: `Read` na foto-base (`$WORK/eric_ref.jpg`) E na gerada (`$WORK/imagem-gerada.jpg`) e comparar traço a traço — formato do rosto, barba (presença + estilo), cabelo e linha do cabelo, olhos e sobrancelhas, nariz, faixa etária. PASSA se dá pra reconhecer como a MESMA pessoa da foto-base em todos esses traços; FALHA se algum traço diverge claramente, o rosto parece outra pessoa/genérico, ou saiu distorcido/derretido → recovery "Identidade ruim" (outra foto `identidade`/`referencia` ou trocar backend).

## Erros comuns e recovery
- **`image_gen.py nao encontrado` (IMG_SCRIPT vazio nos Pré-requisitos)** → o script não está em nenhum dos dois paths candidatos. Localizar na máquina:
  `find "$HOME/.claude/plugins" "C:/repos" -name image_gen.py -path "*imagem*" 2>/dev/null`
  - Imprimiu um path → `export IMG_SCRIPT="<path impresso>"` e seguir do passo 4.
  - Não imprimiu nada → a skill `imagem` não está instalada nesta máquina (nem via plugin marketing, nem repo `expertintegrado-skills` clonado). Reportar ao Eric ("image_gen.py ausente — instalar o plugin marketing ou clonar o repo de skills") e parar. Sem o script não roda o backend OpenAI; o único caminho restante é o fallback Gemini (passo 6, que grava o próprio script no `$WORK` e não depende do `IMG_SCRIPT`).
- **`invalid_image_file`** → a foto de referência chegou vazia/corrompida ao OpenAI. NÃO é "esqueceu o raw" (o passo 3 já usa raw): rodar o diagnóstico de arquivo-vazio do passo 3 (404 → nome errado, volta ao passo 2; auth → `gh auth status`; `$WORK` não-gravável → outra pasta).
- **`ERRO: openai nao instalado. Rode: pip install openai` (script sai com código 1, backend OpenAI)** → o pacote `openai` não está NO interpretador `$PYTHON`. Instalar no MESMO interpretador (não no `pip` solto do PATH, que pode ser outro Python): `"$PYTHON" -m pip install openai` e reexecutar o passo 4. Persistindo (ex.: sem rede/pip) → fallback Gemini (passo 6).
- **`ModuleNotFoundError: No module named 'google.generativeai'` (traceback do `gemini_gen.py`, passo 6)** → pacote do fallback ausente no `$PYTHON`. Instalar: `"$PYTHON" -m pip install google-generativeai` e reexecutar o passo 6. Se os DOIS backends estiverem sem pacote e o `pip install` também falhar → reportar ao Eric (com o erro de import de cada um) e parar.
- **`ERRO: OPENAI_API_KEY nao encontrada` (script sai 1) OU `op read` falha ao resolver a key** → NÃO é falha de geração, é CREDENCIAL: a key não estava no env e o `op read` não a devolveu. Rodar `op whoami`; saiu != 0 → `op` está sem sessão (ver Pré-requisitos, "`op` instalado mas SEM sessão válida") → reportar ao Eric e parar. NÃO cair cegamente no fallback Gemini por causa disso: o passo 6 também usa `op read` (mesma raiz — vai falhar igual), a menos que `GEMINI_API_KEY` já esteja no env.
- **OpenAI 401** → key presente mas inválida/expirada (é diferente de "nao encontrada" acima) → conferir `OPENAI_API_KEY` (env ou `op read`); se persistir, fallback Gemini.
- **OpenAI 429** → rate limit → fallback Gemini (passo 6).
- **Gemini "modelo não encontrado"** → listar modelos disponíveis com `genai.list_models()` e usar o de image generation.
- **Ambos falham** → avisar o Eric com o erro específico de cada backend e parar.
- **Identidade ruim** (reprovou o check de identidade da Validação final — algum traço diverge da foto-base: rosto/barba/cabelo/olhos/nariz/idade, ou rosto genérico/distorcido) → tentar outra foto do catálogo (tag `identidade`/`referencia`) ou trocar de backend.
- **`command -v python3` acha stub do WindowsApps** → é o alias falso da Microsoft Store; usar o `PYTHON` absoluto (Python312) no PC.

## Exemplo — "coloca eu de pirata pra thumbnail do YouTube"
1. Formato óbvio (YouTube) → `--size 1536x1024`.
2. Catálogo → foto frontal com identidade (ex: `eric_branco_olhar_direto.jpg`).
3. `gh api ... eric_branco_olhar_direto.jpg -H "Accept: application/vnd.github.raw" > "$WORK/eric_ref.jpg"`.
4. `"$PYTHON" "$IMG_SCRIPT" edit --model gpt-image-2 --image "$WORK/eric_ref.jpg" --prompt "Retrato do mesmo homem vestido de pirata, chapéu de pirata, cenário de navio, iluminação cinematográfica, preservar rosto e identidade" --out "$WORK/imagem-gerada.jpg" --size 1536x1024 --output-format jpeg --force --quality high`.
5. `Read "$WORK/imagem-gerada.jpg"` → entregar. Se OpenAI falhar → passo 6 (Gemini).

## Histórico
- **v1.0–v1.1 (13/05/2026)**: skill criada; dois backends (OpenAI primário, Gemini fallback); catálogo via `agent-assets`; paletas Expert e Super SDR; formatos nomeados; script `image_gen.py`.
- **v1.2 (05/07/2026)**: reescrita pro padrão Sonnet-executável. Corrigido o path do Python (era `C:/Users/ericl/.../Python313` inexistente → `C:/Users/Eric Luciano/.../Python312`, 3.12). Corrigido o path do script (`IMG_SCRIPT`): esta é skill de PLUGIN, então resolve o `image_gen.py` co-located (cache `expertintegrado/marketing` versão-agnóstico ou repo clonado) em vez do `~/.claude/skills/imagem/...` standalone inexistente. `PYTHON`/`IMG_WORK` via env var com default do PC + nota headless. Adicionado mapa formato→`--size` do gpt-image-2.
- **v1.3 (05/07/2026)**: pass de clareza (sem mudar comportamento) — eliminadas 6 ambiguidades do teste Sonnet: (1) desempate determinístico quando várias fotos casam a mesma tag (uso→ordem do array); (2) critério verificável Expert/Super SDR vs pessoal + pergunta única quando ambíguo; (3) recovery real de `IMG_SCRIPT` ausente (find → export ou reportar/parar); (4) diagnóstico real de arquivo-ref vazio no passo 3 (404/auth/gravação) em vez de "refaça com raw"; (5) fallback Gemini virou comando pronto (heredoc no `$WORK` + `GEMINI_API_KEY` exportada) em vez de trecho ilustrativo; (6) critério de "pixel exato importa" no passo 1.
- **v1.4 (05/07/2026)**: 3 explicitações do teste de executabilidade (tornam explícito o implícito, sem mudar comportamento): (1) ordem de precedência quando o pedido ativa 2+ categorias de foto (`identidade`/`referencia` > `formal` > `palestra` > `frontal`) + regra final de mostrar 2 candidatas e perguntar se persistir ambiguidade entre categorias; (2) pré-requisito de binário `gh`/`op` AUSENTE (não só deslogado) → parar e reportar com `winget install --id GitHub.cli` / `AgileBits.1Password.CLI`; (3) template literal do `--prompt` no passo 4 com placeholders (cena/fundo, ajustes na pessoa—manter rosto, estilo/paleta, enquadramento) apontando o prompt do pirata como referência de detalhe.
- **v1.5 (05/07/2026)**: 3 explicitações do teste de executabilidade Sonnet (tornam explícito o implícito, sem mudar comportamento): (1) passo 2 — regra determinística quando o pedido envolve o Eric mas não casa NENHUMA das 4 categorias (casual/hobby/lazer/academia): foto-base = `frontal` se o destino pede rosto de frente, senão default `identidade`/`referencia`; contexto vem do prompt, sem perguntar ao Eric; (2) checklist final + "Identidade ruim" — critério verificável do check de identidade (Read foto-base + gerada, comparar rosto/barba/cabelo/olhos/nariz/idade; PASSA = mesma pessoa reconhecível, FALHA = traço diverge/rosto genérico/distorcido); (3) Pré-requisitos — detecção de ambiente formalizada como passo de decisão (testar se o `$PYTHON` default roda; se não, fallback `command -v python3` + `mktemp -d`) em vez de comentário passivo de override manual.
- **v1.6 (05/07/2026)**: 4 explicitações do teste de executabilidade Sonnet (tornam explícito o implícito, sem mudar comportamento): (1) nota no topo de `## Passos` — a tool Bash não persiste variáveis entre chamadas (só `cwd`), então concatenar setup + passos 3→4→6 numa ÚNICA invocação; alerta extra do `mktemp -d` gerar `$WORK` diferente a cada chamada no caminho headless; (2) Pré-requisitos — recovery de `op` instalado mas SEM sessão (análogo a `gh` deslogado): checar `op whoami`, só se a key não estiver no env; sem sessão → `op signin`/reexportar `OP_SERVICE_ACCOUNT_TOKEN` e parar, sem loop; (3) Erros comuns — pacote Python ausente: `ERRO: openai nao instalado` → `"$PYTHON" -m pip install openai`; `ModuleNotFoundError: google.generativeai` → `"$PYTHON" -m pip install google-generativeai`; + entrada de credencial (`OPENAI_API_KEY nao encontrada`/`op read` falha) distinta de falha de geração, com aviso de não cair cego no Gemini (mesma raiz `op read`); (4) Desempate passo 2 — "casar" definido como match LITERAL de substring case-insensitive (não semântico); sinônimo sem palavra literal em comum não casa → item 3 (primeira do array).
- **v1.7 (05/07/2026)**: 2 explicitações do teste de executabilidade Sonnet (tornam explícito o implícito, sem mudar comportamento): (1) passo 5 — mecanismo da entrega tornado explícito: por padrão é na MESMA sessão (o `Read` já anexa a imagem à resposta); se o pedido veio de canal externo (ex.: Telegram), enviar o arquivo pela tool de resposta do canal (`mcp__plugin_telegram_telegram__reply` com o path em `files`), porque o `Read` sozinho não chega ao canal; (2) passo 2 — mini-exemplo literal do payload do `catalogo.json` (array na raiz, sem chave envolvente; campos `file`/`uso`/`tags`), 2 entradas extraídas do catálogo real, pra remover a ambiguidade da estrutura antes de iterar.
