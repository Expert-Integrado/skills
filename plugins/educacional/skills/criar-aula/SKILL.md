---
name: criar-aula
description: Cria estrutura completa de aula/curso gravado no Educacional — pasta organizada, Ementa.md+docx, apresentação HTML 16:9 (slides), materiais HTML (prompts copiáveis), HANDOFF.md + SESSAO.md (continuidade entre máquinas) e deploy Vercel + DNS Cloudflare automáticos no subdomínio <slug>.ericluciano.com.br. Processa insumos (transcrições, gravações, pesquisas) da pasta 00_Inputs pra construir a ementa. TRIGGER quando Eric pedir "cria aula", "novo curso", "monta estrutura pra curso X", "transforma esses insumos em aula", "gera ementa+slides+materiais pra X", "continua aula <slug>", ou mencionar curso/aula novo a gravar. NÃO disparar pra deck de apresentação standalone (só os slides de uma palestra, sem pacote educacional com pasta/ementa/materiais — isso é a skill apresentacao-html); já uma aula/palestra avulsa que precisa do pacote educacional próprio É desta skill (ramo 'aula avulsa' do Passo 1). Também NÃO disparar pra material complementar sem curso (não vale a fábrica inteira pra 1 PDF), nem pra aulas no PowerPoint/Slides Google (esta skill é HTML-only).
allowed-tools: AskUserQuestion, Read, Write, Edit, Glob, Grep, Bash, mcp__expert-brain__recall, mcp__expert-brain__save_note, mcp__expert-brain__link
---

# criar-aula — Fábrica de cursos gravados

Pega insumos (transcrições, vídeos, pesquisas, palestras anteriores) e devolve pacote completo de curso gravado: ementa estruturada, slides HTML pra cola na gravação, materiais HTML com prompts copiáveis, docs de continuidade entre máquinas, e tudo publicado em URL própria. Reusa os padrões aprendidos nos 2 cursos G4 — Construir Empresa (2026-05-27/28) e Automatizar Rotina (2026-05-29) — embutidos como templates e regras nas pastas `docs/`, `templates/` e `css/` desta skill.

> **Pasta desta skill** = o diretório onde este `SKILL.md` está carregado (varia por máquina/instalação — derivar do path REAL deste arquivo em runtime, NUNCA hardcodar). Todos os caminhos `scripts/`, `css/`, `templates/`, `docs/` citados abaixo são relativos a essa pasta.

## NUNCA

- NUNCA criar pasta, arquivo, deploy ou QUALQUER coisa antes do briefing do Passo 1 respondido — pular esse passo já gerou pasta-teste órfã com deploy quebrado no passado.
- NUNCA fazer deploy Vercel nem criar DNS quando o Eric marcou o destino como teste/rascunho no briefing — gerar só o conteúdo local. Deploy/DNS só pra aula real com destino confirmado.
- NUNCA assumir a paleta — ela é escolhida no briefing (Passo 1), sempre perguntada antes de gerar. NÃO reconstruir cores na mão: usar `css/paleta-{scale|traction|midnight}.css` desta skill.
- NUNCA deletar arquivo da pasta do curso — arquivo fora do padrão é MOVIDO pra `_arquivo/`, nunca apagado.
- NUNCA confiar em token do env — SEMPRE puxar do 1P na hora com `op read` (env do Windows fica defasado quando o token é rotacionado; causou falha de deploy em 30/05/2026).
- NUNCA `vercel build` (regra global — gera output pesado que trava o sync da pasta sincronizada, hoje Google Drive); só `vercel deploy`, sempre com `--prod`.
- NUNCA deixar `Ementa.md`/`Ementa.docx` divergirem do `apresentacao.html` oficial — depois do feedback do Eric, o HTML manda (ver seção "Fonte da verdade"). O docx vai pra cliente (Maria) — tem que refletir exatamente o que foi gravado.
- NUNCA publicar HTML que viole os 8 anti-patterns (ver seção "Anti-patterns embutidos") — validar ANTES do deploy; se algum check falhar, abortar deploy e mostrar qual arquivo + linha tem o problema.
- NUNCA usar `which` — detecção de CLI é `command -v` (POSIX).

## SEMPRE

- SEMPRE fazer as 3 perguntas do briefing JUNTAS (AskUserQuestion, numa tacada só, sem spam) e ESPERAR a resposta antes de qualquer criação.
- SEMPRE acentuação correta do português em TODO conteúdo gerado (ementa, slides, materiais, docx, README) — é entregável externo.
- SEMPRE backup da versão anterior em `01_Ementa/_versoes-historicas/` antes de sobrescrever `Ementa.md`.
- SEMPRE ler os docs da pasta `docs/` desta skill antes de gerar (PADRAO-EMENTA, PADRAO-MATERIAIS, PALETAS, ANTI-PATTERNS, FLUXO-EXECUCAO).
- SEMPRE atualizar `SESSAO.md` a cada execução — inclusive em erro (Eric retoma sabendo o que falhou).
- SEMPRE nomear a ferramenta exata (Lovable, HeyGen, Suno, etc) — nunca "ferramenta de IA" genérico.
- SEMPRE executar deploy Vercel, criação de DNS Cloudflare e renomeio de pastas SEM pedir confirmação — decisão Eric (27/05/2026); a skill assume que os tokens 1Password estão disponíveis e que reorganizar pasta é OK (não deleta nada, só move pra `_arquivo/`). Única exceção: destino teste/rascunho (ver NUNCA).
- SEMPRE `--ssl-no-revoke` em curl HTTPS (obrigatório no Windows do Eric — sem a flag o curl Schannel falha com exit 35; em Linux/macOS a flag é aceita e ignorada). CORREÇÃO-DE-FATO: os comandos curl do original omitiam a flag, contra a regra canônica do CLAUDE.md global; adicionada em todos os curl desta skill.

## Pré-requisitos (checar TODOS no início; se faltar algo obrigatório, abortar com mensagem clara)

Paths — resolver por env var com default do PC documentado (padrão agnóstico):

```sh
WORKSPACE_DIR="${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}"   # PC do Eric = G:\Meu Drive\claude-workspace\Workspace (Google Drive via Drive for Desktop). CORREÇÃO-DE-FATO: migrado do OneDrive em 05/07/2026 — `OneDrive/Workspace` agora é arquivo morto, NÃO gravar lá (regra global). Path verificado nesta virada: `$EDU/04_Cursos_G4_Gravados` existe no Google Drive.
EDU="$WORKSPACE_DIR/Educacional"
```

Checks de capacidade (rodar no shell; cada falha obrigatória → abortar e reportar exatamente o que falta):

```sh
command -v op   || echo "FALTA op"    # 1Password CLI, logado em team-expertintegrado.1password.com — se deslogado: "1Password CLI não logado, rode `op signin` primeiro"
command -v npx  || echo "FALTA npx"   # Node.js — obrigatório pro deploy
PANDOC=$(command -v pandoc || find "$LOCALAPPDATA/Microsoft/WinGet/Packages" -name pandoc.exe 2>/dev/null | head -1)
test -n "$PANDOC" || echo "FALTA pandoc"   # no PC vive em C:/Users/<user>/AppData/Local/Microsoft/WinGet/Packages/JohnMacFarlane.Pandoc_*/pandoc.exe
command -v ffmpeg || echo "sem ffmpeg"     # obrigatório SÓ se houver vídeo pra transcrever (Passo 5); ffmpeg do winget no PC
```

Tokens — puxar frescos do 1P a cada execução e passar inline no comando (`CLOUDFLARE_API_TOKEN="$TOKEN" npx wrangler/vercel ...`), nunca depender de `$env:`:

```sh
VERCEL_TOKEN=$(op read "op://Agentes Eric/VERCEL_API_TOKEN/credential")            # token PRIMÁRIO deste fluxo (item 1P = VERCEL_API_TOKEN; env resultante = VERCEL_TOKEN). Usado com --scope contato-5574s-projects
CLOUDFLARE_API_TOKEN=$(op read "op://Agentes Eric/CLOUDFLARE_API_TOKEN/credential")
```

**Conflito conhecido VERCEL_API_TOKEN × SAML — reconciliação (ler ANTES do Passo 8):** o `CLAUDE.md` global e a memória do Eric registram que o `VERCEL_API_TOKEN` pode estar bloqueado por SAML em scopes de time (sintomas: HTTP 401, mensagem `re-authenticate to this scope`, ou `GET /v2/teams` voltando vazio). Esta skill mantém o `VERCEL_API_TOKEN` como token PRIMÁRIO (é o documentado pro scope `contato-5574s-projects` que ela usa) — NÃO trocar preventivamente. Regra determinística de fallback: SE QUALQUER comando `npx vercel` do Passo 8 retornar um desses sintomas SAML → trocar UMA vez por `VERCEL_TOKEN=$(op read "op://Agentes Eric/Token_Vercel_Produto_Claude_Eric/credential")` (mesmo vault) e repetir o MESMO comando. Falhou de novo com o 2º token → abortar e reportar ao Eric (circuit breaker: no máximo 1 troca de token).

Constantes (já existentes, não criar):
- Cloudflare zone `ericluciano.com.br`, id `48ff0f4bd2bf17da3f66e4d739b98e2f`
- Vercel scope `contato-5574s-projects`
- IP do registro A pra Vercel: `76.76.21.21`

MCP Brain: SE `mcp__expert-brain__recall` não existe na sessão (ex: G4 OS, headless sem o MCP) → PULAR silenciosamente os passos de Brain (2 e 9.2/9.3) e seguir sem Brain.

## Passos

### 1. Briefing inicial — perguntar SEMPRE antes de criar qualquer arquivo (BLOQUEANTE)

SE o pedido inicial do Eric JÁ responde os 3 itens (destino, data, paleta) → ecoar as respostas em 1 linha e seguir SEM AskUserQuestion (não repetir pergunta respondida). SENÃO, fazer estas 3 perguntas juntas via AskUserQuestion e **esperar a resposta**:

1. **Destino — pra onde é a aula/palestra?** Evento, cliente ou programa (ex: `G4 Tools`, `G4 Skills`, `G4 Traction`, `G4 Scale`, `Mentoria Automações Inteligentes`, ou cliente externo). Determina o **path-raiz** (ver decisão de destino abaixo); e SÓ no caminho de aula avulsa vira também o `<Programa>` do nome da pasta. Se for teste/rascunho, o Eric diz aqui — e a skill NÃO faz deploy nem cria DNS.
2. **Data do evento / gravação** (DD/MM/AAAA). Convertida pra ISO `AAAA-MM-DD`. SÓ no caminho de aula avulsa ela vira o prefixo do nome da pasta; no caminho de curso multi-aula ela NÃO entra no nome (é metadado de gravação — ver tabela "Onde Destino e Data entram" abaixo).
3. **Paleta / template** — `scale` (azul petróleo, default educacional), `traction` (preto+azul, técnico) ou `midnight` (navy+dourado, premium/C-level). Ver seção "Paletas".

**4ª pergunta CONDICIONAL — classificação aula avulsa vs curso multi-aula (fazer JUNTO com as 3 acima, na MESMA rodada bloqueante, NUNCA como pergunta separada depois).** Critério objetivo pra decidir se pergunta:
- SE a frase do Eric cita nome de um programa/curso (ex: "curso de X", "programa Y", "monta o curso Z") → é **curso multi-aula**, NÃO perguntar.
- SE a frase é "palestra/aula única pra X" (evento pontual, 1 data) → é **avulsa**, NÃO perguntar.
- SE NENHUM dos dois padrões está presente (= critério objetivo de dúvida) → perguntar, junto com Destino/Data/Paleta: "é aula/palestra avulsa (1 data, pasta em `01_Aulas_e_Palestras/`) ou curso gravado multi-aula (deploy, pasta em `04_Cursos_G4_Gravados/`)?"

Com as respostas, decidir o destino:
- SE palestra/aula avulsa DENTRO do fluxo educacional (evento pontual, 1 data, mas ainda com pacote educacional próprio — pasta/ementa/materiais desta skill) → `$EDU/01_Aulas_e_Palestras/AAAA-MM-DD - <Programa> - <Tema>/` (ex: `2026-08-10 - G4 Scale - Agentes de IA`; convenção de nomes completa em `01_Aulas_e_Palestras/README.md`). Se for só um deck de slides de palestra, SEM pacote educacional, isso NÃO é esta skill — é a `apresentacao-html` (ver anti-trigger da description)
- SE curso gravado multi-aula (ementa, várias aulas, deploy) → `$EDU/04_Cursos_G4_Gravados/<slug>/`
- SE na dúvida entre aula avulsa e curso → a classificação já foi resolvida pela 4ª pergunta condicional do briefing acima; nunca criar pasta sem ela definida.
- SE o curso é pra outro cliente que não o G4 → confirmar o path-raiz com o Eric antes de criar.

**Onde Destino e Data entram em CADA caminho (não confundir — nome da pasta com prefixo de data + campo de destino é EXCLUSIVO da aula avulsa; no curso gravado o nome é só `<slug>`):**

| Caminho | Nome da pasta | Papel do **Destino** | Papel da **Data** |
|---|---|---|---|
| Aula avulsa (`01_Aulas_e_Palestras/`) | `AAAA-MM-DD - <Programa> - <Tema>/` | vira o `<Programa>` (1º campo do nome) | vira o prefixo `AAAA-MM-DD` do nome (ordena sozinho no Explorer) |
| Curso gravado multi-aula (`04_Cursos_G4_Gravados/`) | `<slug>/` (sem data e sem destino no nome) | SÓ escolhe o path-raiz: G4 → `04_Cursos_G4_Gravados/`; outro cliente → confirmar a raiz com o Eric (Passo 2). Nunca entra no nome da pasta | NÃO entra no nome da pasta. É a data planejada de gravação — anotada nas "Próximas pendências" do `SESSAO.md` (ex.: `Eric: gravar dia DD/MM`) e usada no Passo 9 |

### 2. Resolver contexto, nome e slug

1. SE o MCP Brain está na sessão → `mcp__expert-brain__recall` com query `"curso <tema>"` — busca aulas anteriores do mesmo tema. SENÃO → pular silenciosamente.
2. Nome do curso: usar o que veio no pedido; SE não veio → perguntar.
3. Gerar slug kebab-case (sem acentos, sem chars especiais, stopword inicial removida): "Como Construir Empresa com IA" → `construir-empresa-com-ia`. **Fonte canônica do algoritmo = `scripts/slug.sh "<nome>"` na pasta desta skill — RODAR o script pra gerar o slug; a descrição acima é só resumo ilustrativo.**
4. **Convenção de slug/URL — regra determinística do prefixo (não adivinhar):**
   - SE o Destino (Passo 1) é um programa/produto do **G4** — nome começa com "G4" (ex: `G4 Tools`, `G4 Skills`, `G4 Traction`, `G4 Scale`) → prefixo `g4-` (ex: `g4-<slug>` → `g4-<slug>.ericluciano.com.br`).
   - SENÃO — QUALQUER outro Destino, incluindo `Mentoria Automações Inteligentes`, cliente externo, ou destino não-G4 → NÃO assumir prefixo: perguntar ao Eric qual prefixo usar (ou nenhum) ANTES de gerar o slug/URL. `g4-` só é aplicado automaticamente pra G4; fora disso, sempre confirmar.
   - URL pública final = `<slug-já-com-o-prefixo-resolvido>.ericluciano.com.br`.
5. SE a pasta `$EDU/04_Cursos_G4_Gravados/<slug>/` já existe → modo ATUALIZAR (não criar do zero; backup do que muda vai pra `_versoes-historicas/`). SE o pedido foi "continua aula <slug>" → ver seção "Modo continuar curso existente".

### 3. Criar/atualizar pasta organizada

Caminho canônico (curso gravado estruturado, multi-aula): `$EDU/04_Cursos_G4_Gravados/<slug>/` (no PC: `G:/Meu Drive/claude-workspace/Workspace/Educacional/04_Cursos_G4_Gravados/<slug>/`).

Estrutura criada (`mkdir -p` de tudo):

```
<slug>/
├── 00_Inputs/
│   ├── audio-transcricoes/    # .txt, .md de transcrições (NotebookLM, Whisper, TurboScribe)
│   ├── video-analises/         # análise de frames, slides extraídos
│   └── palestras-fonte/        # links ou referências de arquivos originais
├── 01_Ementa/
│   ├── Ementa.md              # markdown canônico
│   └── _versoes-historicas/   # backups de versões anteriores
├── 02_Roteiros/
│   ├── aulas/                 # 1 .md por aula com fala/ação/tela
│   ├── Kit_Gravacao.md        # cola interna do Eric com frases verbatim
│   └── setup-preparatorio.md  # checklist de ferramentas + ativos pré-prontos
├── 03_Assets/
│   ├── prompts/               # prompts copiáveis em md (também aparecem em /materiais)
│   ├── exemplos/              # outputs gerados (sites, vídeos, jingles)
│   ├── slides/                # PPTX/imagens auxiliares
│   └── slides-html/
│       ├── apresentacao.html  # canônico — cola visual pra gravação
│       ├── index.html         # cópia pro Vercel root
│       ├── materiais/index.html  # prompts copiáveis com botão Copiar
│       ├── vercel.json        # cleanUrls
│       └── README.md          # docs do deploy
├── 04_Entregaveis/
│   └── Ementa.docx            # versão Word pra mandar pra cliente
├── HANDOFF.md                 # ponte entre máquinas (PC ↔ notebook ↔ VPS)
├── SESSAO.md                  # estado dinâmico atualizado a cada execução
├── VALIDACAO-PRE-GRAVACAO.md  # checklist pra Eric marcar OK/AJUSTE
├── README.md                  # visão geral da pasta
└── CLAUDE.md                  # regras específicas dessa aula
```

**Reorganizar pasta bagunçada (se houver):** antes de criar arquivos, varrer a pasta (Glob) e mover arquivos fora do padrão pra `_arquivo/<timestamp>/`. Não deleta nada.

### 4. Detectar o modo de input (modo híbrido)

| Tipo | Como entra | O que skill faz |
|---|---|---|
| **Conversa interativa** | Eric: "cria aula sobre vibe coding" | Faz perguntas passo-a-passo: nome, duração-alvo, número de aulas, módulos, etc |
| **Markdown estruturado** | Eric cola ementa pronta em `.md` | Parseia direto, gera tudo de uma vez |
| **Insumos em `00_Inputs/`** | Eric coloca transcrições/vídeos/pesquisas na pasta antes | Lê tudo, extrai temas/padrões, propõe rascunho de ementa, refina interativamente |

Detectar automaticamente: SE `00_Inputs/` tem arquivos → modo insumos (Passo 5). SENÃO SE o Eric anunciou que vai colocar insumos em `00_Inputs/` (ex: "com base nos insumos que tô jogando agora em 00_Inputs") mas a pasta está VAZIA na checagem → NÃO cair em conversa interativa silenciosamente; perguntar ao Eric se já subiu os arquivos ou se é pra aguardar (parada legítima) e só decidir o modo depois da resposta. SENÃO SE Eric colou/apontou ementa `.md` pronta → parsear direto e ir pro Passo 7. SENÃO → conversa interativa (perguntar nome, duração-alvo, número de aulas, módulos) e ir pro Passo 6.

### 5. Processar insumos em `00_Inputs/`

SE a pasta tem arquivos (listar `audio-transcricoes/`, `video-analises/`, `palestras-fonte/`):
- Ler transcrições (.txt, .md, .vtt) e extrair: temas-chave recorrentes, expressões verbatim do Eric, ferramentas mencionadas, erros/dúvidas que aluno costuma ter
- Ler pesquisas/PDFs e extrair dados citáveis
- Ler análises de vídeo (`.md` em `video-analises/`) com a tool `Read` e extrair padrões visuais/timing. Essas análises normalmente já vêm PRONTAS na pasta (input do Eric) — a skill só as LÊ, não as gera automaticamente. Gerar do zero só quando o vídeo tem slides estruturados e não veio análise: ver "Análise de frames" abaixo.
- Construir **rascunho de ementa** baseado nisso (Passo 6)

**Transcrever vídeo MP4 do zero** (quando o insumo é um vídeo sem transcrição — ex: gravação de aula/live). Pipeline validado em 30/05/2026 (~$0.006/min, ~2-3 min pra vídeo de 2h). Pré-condição: `command -v ffmpeg` OK; rodar num workdir temporário `WORK=$(mktemp -d)`:

```bash
KEY=$(op read "op://Agentes Eric/OPENAI_API_KEY/credential")
# 1. extrai áudio mono 16kHz 64k (ffmpeg do winget)
ffmpeg -i video.mp4 -vn -ac 1 -ar 16000 -b:a 64k audio.mp3
# 2. corta em chunks de 10min (limite de 25MB/req do Whisper)
ffmpeg -i audio.mp3 -f segment -segment_time 600 -c copy chunk_%03d.mp3
# 3. transcreve em paralelo (xargs -P 7) via Whisper API
ls chunk_*.mp3 | xargs -P 7 -I {} curl -s --ssl-no-revoke https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $KEY" -F file=@{} -F model=whisper-1 -F language=pt -F response_format=text
# 4. concatena na ordem com marcador de timestamp aproximado → 00_Inputs/audio-transcricoes/
```

**Análise de frames** (extrair e ler os slides de um vídeo — ferramentas exatas):
- Regra de custo: SE o vídeo é palestra com slides estruturados que carregam o argumento → vale análise de frames. SE aula prática (Eric narra enquanto faz na tela) → só a transcrição de áudio basta; PULAR frames (não gasta processamento).
- SE já existe um `.md` de análise em `video-analises/` → usar ele (só `Read`), NÃO regerar.
- SENÃO, quando precisar produzir a análise (num `WORK=$(mktemp -d)`):
  1. Extrair frames com **ffmpeg** — 1 quadro a cada 15s (ajustar `1/15` se os slides trocam mais rápido): `ffmpeg -i video.mp4 -vf fps=1/15 "$WORK/frame_%04d.png"`
  2. Ler cada PNG com a tool **`Read`** (lê imagem visualmente) e descrever slide/título/bullets/timing de cada um.
  3. Consolidar num `.md` gravado em `00_Inputs/video-analises/` (ex.: `analise-frames-<video>.md`), que vira input do Passo 6.

### 6. Construir rascunho de ementa e refinar interativamente

Rascunho (regras completas em `docs/PADRAO-EMENTA.md` desta skill):
- Sugerir número de aulas (~10-16), agrupadas em 4-6 módulos
- Cada aula com 3-7 bullets
- Marcar 📋 nos bullets que vão virar prompts copiáveis (cross-check com `docs/PADRAO-MATERIAIS.md`)

Loop de refino: apresentar o rascunho → Eric ajusta ("tira aula 7", "muda título da 3", "adiciona bullet em 9") → cada ajuste atualiza `Ementa.md` (versão anterior vai pra `_versoes-historicas/`) → repetir até Eric aprovar.

### 7. Gerar todos os arquivos

A partir da `Ementa.md` consolidada, usando os templates de `templates/` desta skill:
- `Ementa.docx` (via pandoc: `"$PANDOC" 01_Ementa/Ementa.md -o 04_Entregaveis/Ementa.docx`; equivalente empacotado: `scripts/pandoc-docx.sh <pasta>`) → `04_Entregaveis/`
- `apresentacao.html` (slides 16:9 — **paleta escolhida no briefing**; ver seção "Paletas" + `docs/PALETAS.md`) → `03_Assets/slides-html/`
- `materiais/index.html` (prompts copiáveis com botão Copiar; regras em `docs/PADRAO-MATERIAIS.md`) → `03_Assets/slides-html/materiais/`
- `index.html` (cópia da apresentação pra Vercel root)
- `Kit_Gravacao.md` (rascunho — Eric completa com frases verbatim depois)
- `setup-preparatorio.md` (checklist)
- `HANDOFF.md` + `SESSAO.md` (continuidade)
- `README.md` da pasta + da `slides-html/`
- `CLAUDE.md` (regras locais)
- `vercel.json` (cleanUrls — copiar de `templates/vercel.json`)

**Validar HTML antes do deploy** — rodar os greps abaixo a partir de `<pasta>/03_Assets/slides-html/`; QUALQUER falha → abortar deploy e mostrar arquivo + linha. Checks 1-4 rodam em `apresentacao.html` (o `index.html` é cópia byte-a-byte — mesmo resultado); check 5 roda em `materiais/index.html`. Usar `grep -nE` (regex estendida + nº de linha):

1. **Sem `position: relative` em `.slide.*`** (anti-pattern 1.1 — override encolhe o slide):
   - `grep -niE 'position:\s*relative' apresentacao.html`
   - Critério: pra CADA hit, subir até a linha do seletor que abre aquele bloco `{`. FALHA só se o seletor for `.slide` sozinho ou `.slide` + modificador de classe (`.slide.dark`, `.slide.darker`, `.slide.quem`…). OK (ignorar, é permitido) se o seletor for um FILHO que não começa exatamente por `.slide` — ex.: `.stage`, `ul.bullets li`, `.hero-meta span`, `.quem-card`. Zero hits escopados em `.slide*` = passa.
2. **Sem `--cyan-deep` em texto de fundo dark** (anti-pattern 1.2):
   - `grep -niE 'style="[^"]*--cyan-deep' apresentacao.html` → esperado ZERO (nenhum override de cor cyan-deep inline num `<strong>`/elemento).
   - `grep -niE '\.(dark|darker)[^{]*\{[^}]*cyan-deep' apresentacao.html` → esperado ZERO (nenhuma regra escopada em `.dark`/`.darker` usando cyan-deep).
   - NÃO conta como falha: a definição da variável (`--cyan-deep:` no `:root`) nem a regra base `strong { color: var(--cyan-deep) }` — ela é sobrescrita por `.dark strong, .darker strong { color: var(--cyan) }`, que DEVE existir: confirmar com `grep -nE '\.(dark|darker) strong' apresentacao.html` → esperado ≥1 (se faltar, FALHA).
3. **Footer com texto único `<curso> · @ericluciano`** (anti-pattern 1.3):
   - `grep -nE 'class="brand"' apresentacao.html` → ler o texto de cada `<span class="brand">`.
   - Critério: cada brand casa `NOME · @ericluciano` com EXATAMENTE um separador `·` (U+00B7, meio-de-linha) e termina em `@ericluciano`. FALHA se algum brand tiver 2+ `·` (ex.: `Tema A · Tema B · @ericluciano`). Todos os brands devem ser idênticos entre si (footer uniforme). O `<span class="nslide">` (número do slide) é outro elemento — NÃO conta como "2º texto".
4. **`viewport-bg` presente** (anti-pattern 1.5 — sem ele, letterbox branco):
   - `grep -cE 'class="viewport-bg"' apresentacao.html` → esperado ≥1. Zero = FALHA.
5. **Todos os prompts têm tag Direto/Meta** (anti-pattern 3.1 — roda em `materiais/index.html`):
   - `grep -cE 'id="prompt-p[0-9]' materiais/index.html` → N = nº de blocos de prompt.
   - `grep -cE 'class="meta-badge' materiais/index.html` → T = nº de badges Direto/Meta (um por slide de prompt).
   - Critério: T == N (todo bloco de prompt tem seu badge). T < N = FALHA (algum prompt sem tag).

**Se precisar visualizar o HTML antes do deploy (ex.: conferir layout com o Eric)**: NUNCA abrir via `file://` em tool de browser (Playwright/Chrome MCP bloqueiam o protocolo `file:` por segurança — erro `Access to "file:" protocol is blocked`, visto em telemetria). Servir localmente: `python -m http.server` na pasta `03_Assets/slides-html` e navegar em `http://127.0.0.1:<porta>` via Playwright, ou `cmd //c start chrome "<arquivo>"` pra abrir no Chrome nativo do Eric.

### 8. Deploy Vercel + Cloudflare + SSL (100% automático)

SE destino = teste/rascunho (briefing) → PULAR este passo inteiro e ir pro Passo 9.

Equivalente empacotado: `scripts/deploy.sh <slug> <pasta>` na pasta desta skill. Sequência (tokens frescos do 1P, ver Pré-requisitos):

```sh
cd "<pasta>/03_Assets/slides-html"
cp apresentacao.html index.html    # sync

# 8.1 Deploy
npx vercel deploy --prod --yes --scope contato-5574s-projects --token="$VERCEL_TOKEN" --name "<slug>"

# 8.2 Domain no projeto
npx vercel domains add "<slug>.ericluciano.com.br" "<slug>" --scope contato-5574s-projects --token="$VERCEL_TOKEN"

# 8.3 DNS Cloudflare — checar se já existe ANTES de criar (idempotente)
curl -s --ssl-no-revoke -X GET "https://api.cloudflare.com/client/v4/zones/48ff0f4bd2bf17da3f66e4d739b98e2f/dns_records?name=<slug>.ericluciano.com.br" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
# SE result vazio → criar registro A (DNS only, sem proxy):
curl -s --ssl-no-revoke -X POST "https://api.cloudflare.com/client/v4/zones/48ff0f4bd2bf17da3f66e4d739b98e2f/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"type":"A","name":"<slug>","content":"76.76.21.21","ttl":1,"proxied":false,"comment":"Vercel - <slug> (criado por skill criar-aula)"}'
# SE já existe → não duplicar; atualizar se apontar pra outro lugar. Capturar record_id retornado.

# 8.4 SSL
npx vercel certs issue "<slug>.ericluciano.com.br" --scope contato-5574s-projects --token="$VERCEL_TOKEN"

# 8.5 Validar HTTPS
sleep 15
curl -s --ssl-no-revoke -o /dev/null -w "%{http_code}" "https://<slug>.ericluciano.com.br"   # raiz — esperar 200
curl -s --ssl-no-revoke -o /dev/null -w "%{http_code}" "https://<slug>.ericluciano.com.br/materiais?v=$(date +%s)"   # rota /materiais — esperar 200 (checklist exige acessível; mesmo padrão --ssl-no-revoke + cache-bust)
```

Validação: capturar URL + deploy id do 8.1, record_id do 8.3, e HTTP 200 nas DUAS rotas (raiz + `/materiais`) do 8.5. Falhas → seção "Erros comuns e recovery".

### 9. Atualizar SESSAO.md e Brain

1. `SESSAO.md` ganha entry da execução atual (template literal — preencher placeholders):

```markdown
## Sessão {AAAA-MM-DD HH:MM} ({máquina: PC/notebook/VPS})

- {o que foi feito — ex: Skill rodou completa}
- URL deployed: https://{slug}.ericluciano.com.br
- Vercel deploy id: {dpl_xxx}
- Cloudflare DNS id: {record_id}
- Próximas pendências:
  - Eric: {pendência 1}
  - Eric: {pendência 2}
```

2. SE destino = teste/rascunho → PULAR 9.2 e 9.3 (nota Brain é só pra curso REAL; curso de teste polui o vault). SENÃO, SE MCP Brain na sessão → `mcp__expert-brain__save_note` com:

```javascript
{
  title: "Curso {nome} criado via skill criar-aula em {data}",
  tldr: "Pacote completo criado: Ementa, slides HTML, materiais, deploy {url}. {X} aulas em {Y} módulos.",
  body: "{detalhes da execução: ids do deploy, referência da pasta}",
  domains: ["education"],
  kind: "decision"
}
```

3. SE houver curso anterior do mesmo tema (achado no recall do Passo 2) → `mcp__expert-brain__link` criando edge com a nota do curso anterior (`why` substantivo ≥ 20 chars explicando o mecanismo; preferir `same_mechanism_as`).

## Modo "continuar curso existente"

Eric: "continua aula <slug>" (funciona entre máquinas — Google Drive via Drive for Desktop sincroniza a pasta automaticamente):
1. Ler `HANDOFF.md` (doc estático: paths/URLs/IDs Brain — atualizado só quando estrutura muda) + `SESSAO.md` (doc dinâmico: 1 entry por execução).
2. Recuperar contexto (URLs, IDs Brain, decisões anteriores).
3. Adicionar nova entry em `SESSAO.md` ("continuando em {máquina}").
4. Rodar a checagem de reconciliação da seção "Fonte da verdade" abaixo.
5. Perguntar ao Eric o que ele quer fazer agora. NÃO regerar arquivos sem comando explícito.

## Fonte da verdade: o HTML manda depois do feedback (REGRA)

A skill gera `Ementa.md → apresentacao.html + Ementa.docx` (uma direção) na 1ª passada. **Mas assim que o Eric edita o feedback final direto no `apresentacao.html` (a "versão oficial" pra gravar), o HTML vira a fonte da verdade** — `Ementa.md` e `Ementa.docx` ficam atrás.

Quando reabrir um curso já gravado/ajustado:
1. SE mtime de `apresentacao.html` > mtime de `Ementa.md` → sinal de que o HTML avançou.
2. **Reconciliar na direção reversa**: extrair títulos+bullets do HTML e reescrever `Ementa.md` pra bater, depois regerar `Ementa.docx` via pandoc.
3. Backup do `Ementa.md` anterior em `_versoes-historicas/` ANTES.
4. Conferir consistência do número de aulas nos 3 formatos (cabeçalho do md/docx tem que bater com o HTML — divergência clássica: "15 aulas" no cabeçalho com 16 no corpo).

## Paletas — escolher o tom (NÃO reconstruir cores na mão)

As 3 paletas validadas ficam salvas em `css/paleta-{scale|traction|midnight}.css` desta skill. Os templates HTML são **paleta-agnósticos** (placeholder `{{PALETA_ROOT}}` + `var(--bg-*)`). Pra aplicar: copiar o `:root` da paleta escolhida pro placeholder na `apresentacao.html` **E** na `materiais/index.html`.

- **scale** (azul petróleo + ciano) — default pra aula/imersão/educacional
- **traction** (preto + azul vibrante) — técnico/SaaS/produto
- **midnight** (navy + dourado) — premium/executivo/C-level

Detalhes, regra de contraste e foto: `docs/PALETAS.md`.

## Categorização de prompts (regra)

Cada prompt copiável é **Direto** ou **Meta**:
- **Direto** — aluno cola direto na ferramenta-alvo (ex: prompt do Lovable). Tag verde.
- **Meta** — aluno cola na sessão principal da empresa Claude/ChatGPT; IA contextualizada gera o prompt da ferramenta-alvo OU exporta contexto pra outra sessão. Tag dourada.

Aula 12 (PRD do app) usa padrão **META combinado**: 1 prompt único que gera contexto + instrução de entrevista num bloco só, aluno cola na sessão nova.

## Aprendizados do Curso 02 (Automatizar Rotina) — incorporar

- **Apêndice opcional** — aula extra FORA da contagem oficial (ex: "Instalando o Claude Code"), com nota pra cliente avaliar se inclui ou linka curso existente
- **Persona-rotina em vez de empresa-exemplo** — quando o curso é sobre automatizar o que o aluno já faz (não criar algo novo), o fio condutor é a rotina de um perfil-alvo, não uma empresa fictícia
- **Aula final motivacional pura** — fechamento NÃO leva checklist operacional (isso vai numa aula anterior de "cuidados"); a última é só evolução + mentalidade + frase de impacto (primacy/recency)
- **Slide único permitido** — curso é zero-slide por padrão (tela do PC é o "slide"), mas 1 aula conceitual pode usar deck (ex: Aula 2 "5 níveis de IA"); documentar a exceção no CLAUDE.md local
- **Fio de ferramenta progressivo** — usar a MESMA conta/ferramenta evoluindo entre aulas (ex: Agendor via navegador na Aula 9 → MCP próprio na Aula 12) cria continuidade e reduz setup do aluno
- **Vídeo: Veo 3 → Gemini Omni** (lançado mai/2026, dentro do app Gemini) é o padrão atual pra vídeo animado

## Anti-patterns embutidos (rejeitar geração que viola)

1. **Apresentação HTML com `position: relative` em `.slide.*`** — quebra layout (anti-pattern Brain 60lwck7i8gfx)
2. **`<strong style="color: var(--cyan-deep)">` em fundo dark** — contraste ruim; usar `--cyan` claro
3. **Footer com 2 textos diferentes** — usar só `<curso> · @ericluciano`
4. **Aula sem entregável tangível** — viola princípio da Maria
5. **"Ferramenta de IA" sem nome exato** — sempre nomear (Lovable, HeyGen, Suno, etc)
6. **Empresa-exemplo diferente em cada aula** — fio condutor único é obrigatório
7. **Hype** ("isso revoluciona tudo") — princípio canônico "empoderamento > hype"
8. **Pitch comercial >5min** — princípio canônico

## Arquivos da skill (ler/usar, não recriar)

- `docs/PADRAO-EMENTA.md` — 12 princípios da Maria (G4) + decisões canônicas (10min/aula, "1 aula = 1 micro-conceito", emoji 📋 nos prompts, faseamento, etc)
- `docs/PADRAO-MATERIAIS.md` — categorização Direto vs Meta, botão Copiar com feedback verde, fluxo da Aula 12 (META combinado)
- `docs/PALETAS.md` — as 3 paletas, qual usar, como aplicar, regra de contraste
- `docs/ANTI-PATTERNS.md` — bugs aprendidos em prod
- `docs/FLUXO-EXECUCAO.md` — ordem das operações + tratamento de erro detalhado
- `templates/` — `ementa.template.md`, `apresentacao.template.html` (16:9, paleta injetável via `{{PALETA_ROOT}}`, capa + índice + N slides), `materiais.template.html`, `handoff.template.md`, `sessao.template.md`, `readme-curso.template.md`, `kit-gravacao.template.md`, `setup-preparatorio.template.md`, `validacao-pre-gravacao.template.md`, `claude-md.template.md`, `vercel.json`
- `css/paleta-{scale,traction,midnight}.css` — o `:root` que entra no placeholder
- `scripts/slug.sh`, `scripts/pandoc-docx.sh`, `scripts/deploy.sh` — equivalentes empacotados dos Passos 2, 7 e 8

Scripts corrigidos no golden run de 06/07/2026: `slug.sh` não depende mais de `iconv` (não existe no Git Bash do Windows — transliteração via sed literal byte-safe); `deploy.sh` ganhou `--ssl-no-revoke` nos 3 curl; `pandoc-docx.sh` detecta pandoc por capacidade (env PANDOC > PATH > WinGet do usuário atual) e gera direto no destino. NOTA-DOC: `docs/FLUXO-EXECUCAO.md` § 2 ainda verifica a pasta do curso em `01_Aulas_e_Palestras/<slug>/` e o § 7 cita "paleta Midnight" fixa — ambos pré-0.2.0/0.3.0; vale o que está NESTE arquivo (path canônico `04_Cursos_G4_Gravados/` + paleta do briefing).

## Validação final (checklist)

- [ ] Briefing (destino/data/paleta) respondido ANTES de qualquer arquivo criado
- [ ] Pasta na convenção certa (curso → `04_Cursos_G4_Gravados/<slug>/`; avulsa → `01_Aulas_e_Palestras/AAAA-MM-DD - <Programa> - <Tema>/`)
- [ ] `Ementa.md` aprovada pelo Eric + `Ementa.docx` gerado em `04_Entregaveis/`
- [ ] `apresentacao.html` + `materiais/index.html` com a paleta escolhida aplicada nos DOIS
- [ ] 5 checks de anti-pattern passaram nos 2 HTMLs
- [ ] SE destino real: HTTPS 200 em `https://<slug>.ericluciano.com.br` + `/materiais` acessível
- [ ] SE destino teste/rascunho: NENHUM deploy/DNS executado
- [ ] `SESSAO.md` com entry desta execução (mesmo em erro)
- [ ] SE Brain na sessão: nota `kind=decision` salva + edges com curso anterior (se houver)
- [ ] Nada deletado — arquivos fora do padrão em `_arquivo/`, versões antigas em `_versoes-historicas/`

## Erros comuns e recovery

1. **Deploy Vercel (8.1) falha** — causa comum: token expirado → puxar fresco do 1P (`op read`) + retry 1x. **401 / `re-authenticate to this scope` / `GET /v2/teams` vazio → é o bloqueio SAML do `VERCEL_API_TOKEN`: trocar por `Token_Vercel_Produto_Claude_Eric` (op read, mesmo vault) e repetir 1x** (ver "Conflito VERCEL_API_TOKEN × SAML" nos Pré-requisitos). Conteúdo malformado → reverter estado e mostrar erro. Quota excedida → abortar, avisar Eric.
2. **DNS Cloudflare (8.3) falha** — token sem permissão Zone:DNS:Edit → abortar, instruir Eric a rotacionar token. Subdomain já existe → perguntar se sobrescreve. Zona errada → abortar com mensagem.
3. **SSL (8.4) falha** — DNS ainda não propagou → aguardar 30s e retry (até 3x). Vercel não reconhece o domain → repetir o 8.2 e tentar de novo.
4. **Validação (8.5) retorna não-200** — 502/503 (gateway/timeout) → aguardar 30s e retry. 404 → deploy não copiou arquivos: verificar `index.html` na raiz e refazer 8.1. Erro de resolução DNS → confirmar registro Cloudflare ativo.
5. **curl exit 35 no Windows** — faltou `--ssl-no-revoke` (Schannel). Adicionar a flag e repetir.
6. **`op read` falha** — 1Password CLI deslogado → abortar com "1Password CLI não logado, rode `op signin` primeiro". No desktop do Eric o `op` autentica via env `OP_SERVICE_ACCOUNT_TOKEN` (read-only no vault Agentes Eric); se ela não foi herdada pela sessão, reportar e parar.
7. **pandoc não encontrado** — checar `command -v pandoc` e o fallback WinGet (Pré-requisitos); se nada → abortar e avisar (não gerar docx por outra via sem ok).
8. **Idempotência** — rodar a skill 2x na mesma pasta NÃO duplica arquivos: sobrescreve com versões mais novas (backup do anterior em `_versoes-historicas/<timestamp>/`), deploy substitui a versão Vercel (mesmo project name), DNS detecta registro existente e atualiza em vez de criar duplicata.

Em QUALQUER erro: logar em `<pasta>/SESSAO.md` mesmo assim — Eric retoma sabendo o que falhou.

## Exemplo

```
/criar-aula

Eric: "Cria aula nova sobre Vibe Coding com base nos insumos que tô jogando agora em 00_Inputs/"

→ Skill faz o briefing (destino/data/paleta) e espera a resposta
→ Detecta insumos novos, lê, propõe ementa em 7 módulos
→ Eric refina interativamente
→ Skill gera tudo, valida anti-patterns, faz deploy em vibe-coding.ericluciano.com.br
→ Salva nota Brain, atualiza SESSAO.md
→ Pronto pra gravar
```

## Status

- **Nasceu:** 27/05/2026 · **Versão:** 0.4.1 (golden run 06/07/2026: slug.sh sem iconv, deploy.sh com --ssl-no-revoke, pandoc-docx.sh portável, templates SESSAO/HANDOFF sem OneDrive morto, briefing pré-respondido sem AskUserQuestion, Brain note pulada em destino teste; 0.3.0 reescrita no padrão Sonnet-executável em 05/07/2026)
- **Base de evidência:** 2 cursos G4 montados manualmente seguindo este padrão — Construir Empresa (`g4-construir-empresa-com-ia`) e Automatizar Rotina (`g4-automatizar-rotina-com-ia`), ambos com deploy ativo + docx entregue. Golden run de 06/07/2026 executou o ramo TESTE ponta-a-ponta num curso novo (4 aulas, pacote completo, 5 checks anti-pattern verdes, docx via pandoc) — o ramo DEPLOY segue validado só pelos 2 cursos manuais.
- **Pronto pra graduar:** após rodar ponta-a-ponta com DEPLOY em 1 curso novo de verdade + 0 bugs reportados
