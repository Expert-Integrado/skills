---
name: tweet-print
description: Gera imagem PNG estilo "tweet print" (mockup de post do X/Twitter) para postar no Instagram, LinkedIn ou outras redes. Aceita texto com palavras em negrito (markdown **word**), avatar real, selo verificado, tema claro/escuro/branco, formato feed/retrato/story e modo carrossel nativo. TRIGGER quando o usuario pedir "tweet print", "fake tweet", "post tipo tweet", "post estilo X", "post estilo Twitter", "mockup de tweet", "imagem de tweet pro feed", "carrossel de tweets", "transforma esse texto em tweet print", "post de Instagram tipo tweet", "post estilo print viral", "viraliza essa frase", "transforma em meme estilo tweet", "daquele tipo de Twitter", "aquele post que parece tweet", "post que parece um tweet", "quero fazer um post que fala assim", ou similar. IMPORTANTE: invocar imediatamente ao detectar a intencao — nao esperar o texto estar finalizado. NAO disparar quando: o usuario quer postar texto puro sem virar imagem, quer outro tipo de design (cartao/infografico), ou quer que o post seja publicado de fato no Instagram (esta skill SO GERA o PNG).
allowed-tools: Bash
---

# Tweet Print — Mockup de Post do X/Twitter

Transforma uma frase / piada / insight em imagem PNG estilo "tweet print" (foto circular do autor + nome com selo verificado + handle + texto grande com palavras-chave em negrito) pronta pra postar no Instagram (feed, story ou carrossel), LinkedIn, etc. Renderiza via `generate.py` (Playwright + Chromium headless). Invocar IMEDIATAMENTE ao detectar a intencao — mesmo que o texto final ainda nao esteja pronto; nao esperar o usuario terminar de redigir.

## NUNCA

- NUNCA estampar nome/handle errado. Os defaults (`--name "Eric Luciano"`, `--handle "@ericluciano"`) sao do Eric; esta skill e do plugin marketing e e usada por varios colaboradores. Default = quem assina e o Eric (dono da sessao). So trocar `--name`/`--handle` quando o PEDIDO nomear explicitamente outra pessoa como autor — nao ha mecanismo de deteccao de identidade alem do texto do pedido (a skill nao sabe quem esta rodando). Se o pedido citar outra pessoa como autor mas nao der o handle dela, ai sim perguntar o handle antes de gerar.
- NUNCA usar esta skill pra POSTAR no Instagram. Ela so GERA o PNG; publicacao e fluxo separado (Make/API).
- NUNCA rodar `generate.py` de um cwd arbitrario — o cwd do agente nao e garantido. Sempre `cd` na pasta da skill (a que contem `generate.py`) ou usar caminho absoluto pro script.
- NUNCA declarar "gerado/pronto" sem o script ter impresso `OK: <caminho>` E o arquivo PNG existir de fato no destino.

## SEMPRE

- SEMPRE assumir os defaults quando o usuario nao especificar e seguir direto — NAO travar pedindo confirmacao (isso conflitaria com "invocar imediatamente"). Defaults: nome/handle do Eric, tema `white` (branco puro), formato `1080x1080`, avatar da env `TWEET_PRINT_DEFAULT_AVATAR` (ou inicial estilizada se nao houver), selo verificado ativo. REPORTAR na entrega quais defaults foram usados (autor, tema, formato, avatar) pra o usuario ajustar se quiser. Perguntar ANTES so quando o pedido for de fato ambiguo — ex.: menciona outra pessoa como autor sem dar o handle dela.
- SEMPRE marcar negrito com `**dois asteriscos**` nas palavras-chave da punchline (2-4 termos no maximo — mais que isso polui).
- SEMPRE copiar o PNG gerado pro `$HOME/Downloads` e reportar ESSE caminho como link clicavel (nao o temporario de `OUT`), reportar tambem os defaults que foram usados (autor, tema, formato, avatar) e oferecer ajustes (trocar foto/handle/tema, refazer texto, gerar variante story/retrato, adicionar slide ao carrossel).
- Para carrossel, SEMPRE usar `--texts` (uma string por slide) + `--output-prefix` (o script gera `prefix-01.png`, `prefix-02.png`, ...).
- Texto EXTERNO (o conteudo do tweet, se em portugues) usa acentuacao correta.

## Pre-requisitos

- **Shell:** Git Bash POSIX.
- **Interpretador Python:** detectar (nao chumbar caminho). No PC do Eric nao ha `python`/`python3` no PATH, so o binario absoluto; em Linux/VPS ha `python3`:
  ```bash
  PY="$(command -v python3 || command -v python || echo 'C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe')"
  ```
- **Pasta da skill:** onde vivem `generate.py` e `requirements.txt`. Default do PC via env var:
  ```bash
  SKILL_DIR="${TWEET_PRINT_SKILL_DIR:-C:/repos/expertintegrado-skills/plugins/marketing/skills/tweet-print}"
  cd "$SKILL_DIR"
  ```
- **Deps:** Playwright + Chromium (instalar 1x por maquina — passo 2).
- **Rede:** a fonte Inter carrega do Google Fonts em runtime; sem internet, ver recovery.

## Parametros (anatomia do post)

| Elemento | Default | Customizavel |
|----------|---------|--------------|
| Avatar | inicial estilizada (gradiente azul) | `--avatar /caminho/foto.jpg` |
| Nome | "Eric Luciano" | `--name "Outro Nome"` |
| Handle | "@ericluciano" | `--handle "@outro"` |
| Selo verificado | sim (azul) | `--no-verified` para esconder |
| Texto | obrigatorio | `--text "..."` (use `**word**` pra negrito) |
| Tema | `white` (branco puro #ffffff) | `--theme light` (creme #f5f3ee) ou `--theme dark` (preto X #000000) |
| Formato | `1080x1080` (feed) | `--format 1080x1350` (retrato) ou `--format 1080x1920` (story) |
| Tamanho da fonte | auto (varia 40-64px conforme texto) | `--font-size 56` |
| Output single | `./tweet-print.png` | `--output /caminho/saida.png` |
| Output carrossel | `./carrossel-NN.png` | `--output-prefix /caminho/prefixo` |

## Passos

### 1. Coletar inputs

NAO travar pedindo confirmacao: assumir os defaults do bloco SEMPRE pra tudo que o usuario nao especificou e seguir direto pra geracao. Ao final, REPORTAR as escolhas (passo 4). Campos e seus defaults:

- **Texto** completo (quais palavras vao em negrito? marcar com `**`).
- **Autor:** default = Eric (dono da sessao). So usar `--name`/`--handle` de outra pessoa quando o PEDIDO nomear outra pessoa como autor — nao ha deteccao de identidade alem do texto do pedido.
- **Tema:** default `white` (branco puro); alternativas `light` (creme) ou `dark` (X preto).
- **Formato:** default `1080x1080` (feed); alternativas `1080x1350` (retrato) ou `1080x1920` (story).
- **Avatar:** default env `TWEET_PRINT_DEFAULT_AVATAR` (ou inicial estilizada); ou caminho da foto passado no pedido.
- **Carrossel:** se forem varios slides, listar o texto de cada um.

Perguntar ANTES so em ambiguidade real — ex.: o pedido menciona outra pessoa como autor mas nao da o handle dela.

### 2. Garantir dependencias (1x por maquina)

Rodar de dentro da pasta da skill. Primeiro checar se o Playwright ja esta importavel; se estiver, PULAR o `pip install`:
```bash
cd "$SKILL_DIR"
# import ok -> ja instalado, pula o pip; senao instala:
"$PY" -c 'import playwright' 2>/dev/null && echo "Playwright ja instalado, pulando pip install." || "$PY" -m pip install -r requirements.txt
"$PY" -m playwright install chromium
```
`playwright install chromium` e idempotente (so baixa se faltar), pode rodar sempre. Se `pip`/`playwright` falhar, ver recovery.

### 3. Executar o gerador

Definir um destino de saida (pasta gravavel; ex.: `OUT="$(mktemp -d)"`), depois rodar.

**Single tweet:**
```bash
"$PY" generate.py \
  --text "Se **Matrix** fosse lancado hoje, o **Neo** se chamaria **Claudio**." \
  --name "Eric Luciano" \
  --handle "@ericluciano" \
  --avatar "C:/Users/Eric Luciano/OneDrive/Imagens/Perfil profissional/Avatar.jpg" \
  --theme light \
  --format 1080x1080 \
  --output "$OUT/tweet-claudio.png"
```
Se a env `TWEET_PRINT_DEFAULT_AVATAR` estiver setada, pode OMITIR `--avatar` (o script resolve sozinho na ordem `--avatar` > `TWEET_PRINT_DEFAULT_AVATAR` > inicial estilizada).

**Carrossel (modo nativo — gera N PNGs numerados numa so chamada):**
```bash
"$PY" generate.py \
  --texts "**1/** primeira tese" "**2/** segunda tese" "**3/** punchline final" \
  --avatar "C:/caminho/foto.jpg" \
  --output-prefix "$OUT/meu-carrossel"

# Gera: $OUT/meu-carrossel-01.png, -02.png, -03.png
```

Validar: o script imprime `OK: <caminho>` por PNG. Sem essa linha = falhou; ver recovery.

**Avatar default por usuario (setar 1x, opcional):** para nao passar `--avatar` toda vez, cada colaborador define a env `TWEET_PRINT_DEFAULT_AVATAR` com o caminho da propria foto.
- Windows (PowerShell, persistente): `[Environment]::SetEnvironmentVariable("TWEET_PRINT_DEFAULT_AVATAR", "C:\Users\seu-user\foto.jpg", "User")`
- Mac/Linux (bashrc/zshrc): `export TWEET_PRINT_DEFAULT_AVATAR="/Users/seu-user/foto.jpg"`

### 4. Mostrar o resultado

Confirmar que o(s) arquivo(s) existe(m), copiar pro `$HOME/Downloads` (destino final, persistente — `OUT` do `mktemp` e temporario) e reportar ESSE caminho:
```bash
ls -la "$OUT"
mkdir -p "$HOME/Downloads"
cp "$OUT"/*.png "$HOME/Downloads/"
ls -la "$HOME/Downloads"/*.png
```
Reportar o caminho em `$HOME/Downloads` como link clicavel (nao o de `OUT`), reportar tambem os defaults usados (autor, tema, formato, avatar — ver passo 1) e oferecer ajustes (trocar foto/handle/tema, refazer com texto ajustado, gerar variantes story/retrato, adicionar slide ao carrossel).

## Regras de negrito

O usuario marca palavras com `**dois asteriscos**`. Exemplos:

- `"Se **Matrix** fosse hoje o **Neo** seria **Claudio**"` → 3 palavras em bold
- `"essa decisao **muda tudo**"` → 2 palavras em bold (frase inteira)
- `"sem negrito mesmo"` → texto sem grifos

Boas praticas: bold nas palavras-chave da punchline (substantivos, marcas, numeros); 2-4 termos no maximo; bold no que o leitor tem que ler se passar voando.

## Decisoes de design padrao (valores travados no script — nao alterar)

| Decisao | Valor | Por que |
|---------|-------|---------|
| Fonte | Inter (Google Fonts) | Visualmente igual a Chirp do X, gratuita, mesma referencia do Rafael Milagre |
| Cor de fundo `light` | `#f5f3ee` (creme) | Da cara de "post organico", nao "screenshot" |
| Cor do nome / texto | `#0f1419` | Preto suave do X (nao puro) |
| Cor do handle | `#8a8a8a` italico | Mesma estetica de prints virais |
| Selo verificado | sempre azul `#1d9bf0` | Padrao X |
| Avatar circular | 120px | Proporcao de print real |
| Letter-spacing | -1.5px no texto | Compactacao tipica do X |

## Validacao final (checklist)

- [ ] Script imprimiu `OK: <caminho>` pra CADA PNG esperado.
- [ ] PNG existe no destino de geracao (`ls -la "$OUT"`) E foi copiado pro `$HOME/Downloads` (`ls -la "$HOME/Downloads"/*.png`) — o link reportado e o de Downloads.
- [ ] Nome/handle no post sao os da pessoa certa (nao o default do Eric por engano).
- [ ] Negrito nas palavras-chave certas (2-4 termos).
- [ ] Texto nao cortou na borda direita (se cortou → recovery).

## Erros comuns e recovery

| Sintoma | Causa | Acao |
|---------|-------|------|
| `ERRO: Playwright nao instalado` / import falha | dep faltando | `"$PY" -m pip install playwright && "$PY" -m playwright install chromium` |
| Texto cortado na borda direita | fonte/negrito ocupam mais largura | aumentar formato (`--format 1080x1350`), reduzir `--font-size`, ou marcar menos palavras em negrito |
| Avatar aparece quadrado | imagem nao-quadrada ou mal centralizada | conferir extensao (.jpg/.png/.webp); pre-cortar a foto em quadrado antes |
| `AVISO: avatar nao encontrado` no stderr | caminho de `--avatar`/env errado | corrigir o caminho; sem avatar valido o script cai na inicial estilizada |
| Fonte saiu Segoe UI / Helvetica (nao Inter) | Inter nao carregou (sem internet) | checar conexao; se offline, usar `--theme dark` que disfarca melhor a fonte |
| `generate.py: No such file` | rodou fora da pasta da skill | `cd "$SKILL_DIR"` (ou chamar o script por caminho absoluto) e repetir |

Circuit breaker: se a MESMA chamada falhar 2x com o mesmo erro, parar e reportar o diagnostico — nao tentar uma 3a vez identica.

## Exemplo

Pedido: "faz um tweet print tema escuro pra story: 'A IA nao vai te substituir. Quem usa IA vai.'" (autor Eric, sem foto).

```bash
PY="$(command -v python3 || command -v python || echo 'C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe')"
cd "${TWEET_PRINT_SKILL_DIR:-C:/repos/expertintegrado-skills/plugins/marketing/skills/tweet-print}"
OUT="$(mktemp -d)"
"$PY" generate.py \
  --text "A IA nao vai te **substituir**. Quem **usa IA** vai." \
  --theme dark \
  --format 1080x1920 \
  --output "$OUT/tweet-ia.png"
mkdir -p "$HOME/Downloads"
cp "$OUT/tweet-ia.png" "$HOME/Downloads/"
ls -la "$HOME/Downloads/tweet-ia.png"
```
Reportar o caminho de `$HOME/Downloads/tweet-ia.png` como link e oferecer variante de feed (`--format 1080x1080`).
