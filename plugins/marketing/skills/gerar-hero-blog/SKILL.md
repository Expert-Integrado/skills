---
name: gerar-hero-blog
description: Gera imagem hero pra post(s) do blog expertintegrado.com.br/blog via OpenAI gpt-image-2 (NUNCA gpt-image-1), no estilo editorial azul da marca, converte pra WebP (~60KB) e atualiza heroImage+heroAlt no frontmatter MDX. TRIGGER quando Eric pedir "gera o hero do post X", "cria a imagem de capa", "hero pro blog", ou quando o pipeline de producao de conteudo precisar da imagem de capa de um post. NAO disparar pra: escrever/editar o texto do post (isso e a skill agente-draft-blog); gerar imagem de OG social (o PostLayout usa og/[slug].png dedicada, nao o hero); gerar imagem que nao seja capa de post do blog Expert.
allowed-tools: Bash, Read, Edit
---

# Gerar Hero — Blog Expert Integrado

Cria a imagem de capa (hero) de um post do blog `expertintegrado.com.br/blog` (Astro, repo `C:\repos\expertintegrado-blog`): gera via OpenAI gpt-image-2 no estilo visual da marca, converte pra WebP (~60KB) e conecta `heroImage`+`heroAlt` no frontmatter do MDX. Complementa a skill `agente-draft-blog` (que escreve o texto do MDX): draft escreve o texto, esta gera a capa. A geracao roda pelo script `scripts/gerar-hero.py` bundlado nesta pasta.

## NUNCA
- NUNCA usar `gpt-image-1` — em qualquer circunstancia, nem como fallback (decisao do Eric, 26/06/2026). Se `gpt-image-2` falhar/indisponivel: PARAR e avisar o Eric.
- NUNCA gerar imagem com texto, letras, numeros, logos ou mockups de UI dentro dela.
- NUNCA fugir da paleta travada da marca (ver Direcao de arte).
- NUNCA mexer na imagem de OG social (`og/[slug].png`, 1200x630) — o hero e outra coisa, o PostLayout usa a OG dedicada.
- NUNCA fazer `git commit`/`git push`/deploy sem `npm run build` passar com 0 erros antes.
- NUNCA cair direto na geracao por IA sem antes descartar as 2 fontes reais (foto do Eric / asset de pasta) — ver "Antes de gerar por IA".

## SEMPRE
- SEMPRE `gpt-image-2`, HIGH, 1536x1024 paisagem.
- SEMPRE gerar o conceito visual em ingles, 1 frase, concreto e SEM texto.
- SEMPRE `heroAlt` com acentuacao correta do portugues (e texto EXTERNO — SEO/acessibilidade).
- SEMPRE validar com `npm run build` (0 erros) antes de commit/deploy.
- Custo por imagem: ~US$0,165 (~R$0,85) em HIGH 1536x1024 (~5.488 tokens). 100 imagens ~R$88. Brain: notas `3oh96mtgtl1f` e `ph2qohd66nhh`.

## Pre-requisitos
- **Python com Pillow** disponivel. Resolver o interpretador por CAPACIDADE (quem tem Pillow), nao por PATH — no PC do Eric o `python3` do PATH e o 3.14 da Windows Store, que pode nao ter os pacotes; o ecossistema documentado vive no 3.12:
  ```
  PY=""
  for cand in "${PYTHON:-}" "$(command -v python3 || true)" "$(command -v python || true)" \
    "/c/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"; do
    [ -n "$cand" ] && "$cand" -c "import PIL" >/dev/null 2>&1 && PY="$cand" && break
  done
  ```
  - SE `PY` saiu vazio mas algum interpretador existe -> instalar Pillow nele (`"<interpretador>" -m pip install pillow`) e re-resolver.
  - Parada legitima: SE nenhum interpretador existe (nem PATH nem o 3.12 documentado) -> PARAR e reportar: instalar Python 3.12+ (ex.: `winget install Python.Python.3.12`) ou setar `PYTHON` pro interpretador. NUNCA rodar o script sem interpretador valido.
  O script usa a lib padrao + Pillow pra converter PNG->WebP.
- **`OPENAI_API_KEY`** no ambiente. Se ausente: `op read "op://Agentes Eric/OPENAI_API_KEY/credential"` (detectar `op` com `command -v op`) e exportar antes de rodar. O script aborta com erro se a chave nao estiver no env.
  - Parada legitima: SE `command -v op` falha E `OPENAI_API_KEY` nao esta no env -> PARAR e reportar as 2 saidas (instalar o 1Password CLI: `winget install AgileBits.1Password.CLI`; OU exportar a chave direto: `export OPENAI_API_KEY=<sua-chave>`). NUNCA prosseguir sem a credencial.
- **Repo do blog** clonado. Default do script: `C:\repos\expertintegrado-blog` (passar `--blog-dir` pra outro caminho). Post-alvo em `<blog-dir>/src/content/blog/<slug>.mdx`.
- **Script**: `scripts/gerar-hero.py` na pasta desta skill.

## Antes de gerar por IA: checar as 3 fontes (Brain `xi4pg15yw50a`)
A imagem nao e sempre IA. Ordem de preferencia:
1. **Foto real do Eric** — posts pessoais/reflexao/cases vividos por ele.
2. **Asset original de pasta** — screenshot real de produto, print de demo, foto de evento ja existente.
3. **Gerada por IA** (gpt-image-2) — default pra conceito abstrato/tema sem foto. So cair aqui quando nao houver fonte real adequada.

**De onde vem cada fonte (NAO ha pasta pra varrer no repo do blog):** o repo `expertintegrado-blog` nao mantem biblioteca de fotos do Eric nem de assets originais. Hoje TODO arquivo em `<blog-dir>/public/images/` e um hero ja gerado (`<slug>-hero.webp`) — nao e uma fonte. Logo, fonte 1 ou 2 SO entra quando o proprio Eric fornece o caminho do arquivo no pedido (ex.: "usa esta foto: `C:\...\eric-palestra.jpg`") ou aponta um arquivo especifico existente que ele nomeia. NAO sair procurando/adivinhando foto em pasta nenhuma; se o pedido nao traz caminho de arquivo, nao existe fonte real a verificar.

**Decisao (verificavel — sem julgamento):**
- SE o pedido do Eric inclui um caminho de arquivo de imagem (foto/print/asset) OU aponta um arquivo existente especifico que ele nomeia -> **usar esse arquivo, NAO gerar por IA**:
  1. Converter pra WebP no destino do hero (mesmo encode do script — Pillow ja e pre-requisito):
     ```
     "$PY" -c "from PIL import Image; Image.open(r'<caminho-fornecido>').convert('RGB').save(r'C:\repos\expertintegrado-blog\public\images\<slug>-hero.webp','WEBP',quality=82,method=6)"
     ```
  2. Rodar o script SEM `--concept` pra so aplicar o frontmatter: `"$PY" scripts/gerar-hero.py --slug <slug> --alt "<texto acentuado>"`. Como o `<slug>-hero.webp` ja existe e passa de 8KB, o script imprime `[skip]` (nao regera) e aplica `heroImage`/`heroAlt`.
- SENAO (pedido sem caminho de arquivo) -> **fonte 3 (IA) e o caminho**: seguir pro fluxo de geracao abaixo (Passo 0 -> Passo 1 -> Passo 2).

## Direcao de arte (estilo da marca) — TRAVADA
- Flat-vector editorial com leve profundidade/grao, muito espaco negativo, levemente isometrico.
- Paleta: fundo off-white quente `#FBFAF7`, azul eletrico `#2742E8` dominante, periwinkle `#5B73FF` em apoio, charcoal `#17171B` no traco fino.
- SEM texto, letras, numeros, logos, mockups de UI. 1 sujeito conceitual central com respiro.
- 1536x1024 paisagem, qualidade `high`.
- Obs.: essa direcao ja esta embutida no `STYLE` do script — o `--concept` que voce passa e SO o sujeito (em ingles), o resto do prompt o script monta.

## Passos

### Passo 0 — Resolver o slug exato do post
O `--slug` do script exige o slug EXATO = nome do arquivo em `<blog-dir>/src/content/blog/` sem o `.mdx` (kebab-case, ex.: `pilar-ia-rotina-ceo-1h-dia`). O gatilho "gera o hero do post X" pode trazer X de dois jeitos — resolver ANTES de rodar:
- SE X ja e kebab-case E existe o arquivo `<blog-dir>/src/content/blog/X.mdx` (`ls "<blog-dir>/src/content/blog/X.mdx"` retorna o arquivo) -> o slug e X. Seguir.
- SENAO (X veio como tema/titulo informal, ex.: "aquele post sobre IA na rotina do CEO") -> localizar pelo titulo no frontmatter:
  ```
  grep -rli "<2-3 palavras-chave do tema>" "C:/repos/expertintegrado-blog/src/content/blog/"
  ```
  O slug = nome do arquivo retornado, sem `.mdx`. (Alternativa pra listar todos: `ls "C:/repos/expertintegrado-blog/src/content/blog/"*.mdx`.)
  - SE 1 match -> usar esse slug.
  - SE 0 matches -> avisar o Eric ("nao achei post com esse tema; talvez ainda nao escrito"). NAO inventar slug nem rodar o script.
  - SE 2+ matches -> listar os candidatos (para cada `.mdx`: o slug = nome sem `.mdx`, e o `title:` lido do frontmatter) e perguntar ao Eric qual. NAO escolher sozinho.

### Passo 1 — Montar o conceito visual
Ler (via tool Read no arquivo `<blog-dir>/src/content/blog/<slug>.mdx`) o `title:` e `description:` do frontmatter e escrever, a partir deles, um conceito visual em ingles, 1 frase.
- Exemplo: post "IA na rotina do CEO" -> `a CEO's day compressed into a single glowing hour, a refined clock with AI orbs handling scattered tasks`.
- Validacao do conceito (checklist determinstico — TODOS precisam ser SIM; se algum for NAO, reescrever antes do Passo 2):
  - [ ] Esta em ingles.
  - [ ] E 1 frase unica (sem quebra de linha, sem bullets/lista).
  - [ ] Descreve UM sujeito ou cena central (nao uma lista solta de objetos desconexos).
  - [ ] NAO contem nenhuma destas palavras (induzem texto/UI, proibidos pela direcao de arte): text, word, letter, number, digit, caption, label, title, logo, brand, UI, screen, interface, dashboard, button, mockup.
  - [ ] NAO nomeia cor que contrarie a paleta (a paleta azul/off-white/charcoal ja vem do `STYLE` do script; se citar cor, so `blue`/`off-white`/`charcoal`). Preferir nao citar cor.
  - [ ] O sujeito se relaciona com o `title`/`description` do post (nao e generico/aleatorio).

### Passo 2 — Rodar o script (1 post)
```
"$PY" scripts/gerar-hero.py --slug <slug-do-post> --concept "<conceito em ingles>"
```
**Timeout:** a geracao em HIGH leva 30-150s (medido no PC: 144s) — ACIMA do timeout default de 120s da tool Bash, que mataria o script no meio da chamada paga. SEMPRE rodar esta chamada com `timeout: 300000` explicito (ou em background com log + sentinela `EXIT=$?` se for gerar varios posts em sequencia).
Flags opcionais:
- `--alt "<texto acentuado>"` — define o `heroAlt` manualmente. Sem ela, o script gera um `heroAlt` acentuado a partir do titulo do post.
- `--blog-dir "<caminho>"` — outro repo do blog (default `C:\repos\expertintegrado-blog`).

O que o script faz: gera via gpt-image-2 HIGH -> converte pra WebP q82 (~60KB, -97% vs PNG) -> salva em `<blog-dir>/public/images/<slug>-hero.webp` -> insere/atualiza `heroImage` + `heroAlt` no frontmatter do MDX (acentuacao correta).

Validacao do resultado (ler stdout do script):
- `[ok] <slug>-hero.webp (~60KB)` -> imagem gerada.
- `[skip] <slug> (hero ja existe)` -> WebP > 8KB ja existia; o script NAO regera (idempotente), so reaplica o frontmatter.
- `[frontmatter] <slug>: heroImage + heroAlt aplicados` -> frontmatter atualizado.

SE o script imprimir uma linha `ERRO ...` e sair (exit != 0) -> ver "Erros comuns e recovery". SE for `ERRO gpt-image-2` -> PARAR e avisar o Eric (NAO tentar image-1).

### Passo 2b (alternativo) — Batch de posts sem hero
```
"$PY" scripts/gerar-hero.py --all-missing
```
Lista os posts sem hero (WebP ausente ou < 8KB) com slug + titulo, mas NAO gera nada nesse modo. Para cada slug listado, montar o conceito (Passo 1) e rodar `--slug/--concept` (Passo 2). Idempotente: posts que ja tem hero sao pulados.

### Passo 3 — Validar o build
No repo do blog, rodar:
```
npm run build
```
- SE 0 erros -> pode seguir pra commit/deploy.
- SE erro -> ler a mensagem, corrigir (tipicamente frontmatter malformado ou caminho de imagem errado) e re-rodar. NAO commitar com build quebrado.

### Passo 4 — Deploy (SO quando o Eric pedir explicitamente)
Deploy de producao e side-effect externo: so rodar apos o Eric pedir ("deploya", "publica", "sobe pro ar") — o pedido dele E a confirmacao. Deploy de producao do blog usa o token `Token_Vercel_Produto_Claude_Eric` do 1Password. O `VERCEL_API_TOKEN` generico NAO acessa o team do blog — usar o token dedicado.

O repo `expertintegrado-blog` ja esta linkado ao projeto Vercel (`.vercel/project.json` -> projeto `expertintegrado-blog`), entao nao precisa `--project`/`--scope`. Comando (do repo do blog):
```
cd /c/repos/expertintegrado-blog
vercel deploy --prod --token="$(op read "op://Agentes Eric/Token_Vercel_Produto_Claude_Eric/credential")"
```
- SEMPRE `--prod` (sem isso cai em preview e o dominio serve build antigo). NUNCA `vercel build` (gera output pesado). `command -v vercel` antes; se ausente, avisar o Eric.
- Resultado esperado: o comando imprime uma URL de producao `https://...vercel.app` e o deployment fica `Ready`.
- Prova real (nao declarar "no ar" so com a URL): apos `Ready`, conferir o post publicado com cache-bust, ex.: `curl -sI --ssl-no-revoke "https://expertintegrado.com.br/blog/<slug>?v=$(date +%s)"` -> HTTP 200. So entao reportar "publicado".

## Schema do frontmatter (fonte canonica: `<blog-dir>/src/content/config.ts`)
Esta skill so escreve `heroImage`/`heroAlt`, mas ancora o hero numa das linhas abaixo; se precisar corrigir o frontmatter, use os valores validos do schema (NAO inventar valor de enum):
- `pillar` (obrigatorio, sem default): um de `produtividade` | `vendas` | `vibe-coding` | `lideranca`.
- `tipo` (default `satelite` quando ausente): um de `pilar` | `satelite` | `versus` | `case`.
- `pubDate` (obrigatorio): data ISO `YYYY-MM-DD` (ex.: `2026-07-05`).

Num post valido `pillar` e `pubDate` sempre existem (sao obrigatorios), entao o `ERRO: nao achei ancora` so ocorre em MDX quebrado/incompleto. Correcao = adicionar a linha faltante com valor valido acima de onde o hero entra. Confirmar sempre no `config.ts` se os enums mudaram.

## Validacao final (checklist)
- [ ] Modelo usado foi `gpt-image-2` (nunca image-1).
- [ ] `<blog-dir>/public/images/<slug>-hero.webp` existe e tem ~60KB (WebP, nao PNG).
- [ ] Frontmatter do MDX tem `heroImage: "/images/<slug>-hero.webp"` e `heroAlt: "..."`.
- [ ] `heroAlt` esta com acentuacao correta do portugues.
- [ ] Imagem nao contem texto/numeros/logos e segue a paleta da marca.
- [ ] `npm run build` passou com 0 erros.
- [ ] OG social (`og/[slug].png`) NAO foi tocada.

## Erros comuns e recovery
| Sintoma (saida do script: `[..]` em stdout, `ERRO ...` em stderr) | Causa | O que fazer |
|---|---|---|
| `ERRO: OPENAI_API_KEY ausente no env` | chave nao exportada | `export OPENAI_API_KEY=$(op read "op://Agentes Eric/OPENAI_API_KEY/credential")` e re-rodar |
| `ERRO gpt-image-2: <codigo>` | falha/indisponibilidade do modelo | PARAR. Avisar o Eric. NUNCA usar image-1 |
| `ERRO: post nao existe: <mdx>` | slug errado ou `--blog-dir` errado | conferir o slug em `<blog-dir>/src/content/blog/` e o `--blog-dir` |
| `ERRO: --concept obrigatorio pra gerar <slug>` | rodou sem `--concept` e sem hero pre-existente | passar `--concept "<ingles>"` (Passo 1) |
| `ERRO: nao achei ancora (tipo/pillar/pubDate) no frontmatter` | frontmatter do MDX sem NENHUMA das linhas `tipo`/`pillar`/`pubDate` (o script insere o hero logo apos uma delas) | abrir o MDX e garantir pelo menos uma dessas linhas com valor valido — ver "Schema do frontmatter" pros valores validos de `tipo`/`pillar` — depois re-rodar |
| `ModuleNotFoundError: PIL` | Pillow nao instalado | `"$PY" -m pip install pillow` e re-rodar |
| `npm run build` quebra | frontmatter malformado / caminho de imagem | corrigir e re-rodar; nunca commitar com build vermelho |

## Notas
- `heroAlt` e texto EXTERNO (SEO/acessibilidade) -> acentuacao correta do portugues SEMPRE. Sem `--alt`, o script gera algo como `Ilustração editorial em tons de azul representando o artigo: <titulo>`.
- OG social NAO usa o hero: o PostLayout usa a `og/[slug].png` dedicada (1200x630). Nao mexer nisso.

## Exemplo
```
export OPENAI_API_KEY=$(op read "op://Agentes Eric/OPENAI_API_KEY/credential")
"$PY" scripts/gerar-hero.py --slug pilar-ia-rotina-ceo-1h-dia \
  --concept "a CEO's day compressed into a single glowing hour, a refined clock with AI orbs handling scattered tasks"
# -> [ok] pilar-ia-rotina-ceo-1h-dia-hero.webp (58KB) em 31s
# -> [frontmatter] pilar-ia-rotina-ceo-1h-dia: heroImage + heroAlt aplicados
cd /c/repos/expertintegrado-blog && npm run build   # 0 erros -> pronto pra deploy
```
