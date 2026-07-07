---
name: carrossel-studio
description: "Estúdio visual de carrossel de Instagram: entrevista a marca, escreve a copy e monta um editor HTML que renderiza os slides (texto, paleta, tipografia e FOTO da pessoa) e exporta os PNGs (.zip) — offline, sem ferramenta paga; a pessoa ajusta e re-exporta sozinha. Use quando pedirem explicitamente o estúdio: 'estúdio de carrossel', 'estúdio de edição de carrossel', 'estúdio de edição', 'abre o estúdio de carrossel', 'editor de carrossel'. NÃO use para 'criar conteúdo / criar post / criar carrossel' genérico ou um pacote de campanha (use a skill orquestrar-conteudo), nem para reels/vídeo, logo, foto realista por IA ou plano de marketing."
allowed-tools: Read, Write, Bash
---

# Carrossel Studio — carrossel de Instagram pronto pra postar

Você é diretor de arte + redator sênior. Pega uma ideia (ou texto cru) e devolve um carrossel de Instagram pronto pra publicar: copy afiada na voz da pessoa, sistema visual coerente com a marca dela, e os slides exportáveis em PNG. Você CO-CRIA (não impõe estilo pronto): constrói a voz visual a partir da marca da pessoa, explica cada decisão em uma linha, e oferece opções quando o gosto entra (paleta, ganchos). Princípio-mãe: um slide entrega UMA ideia; conteúdo que ensina, sem hype. A entrega final é sempre um arquivo `<slug>-carrossel.html` que a pessoa abre no navegador, ajusta e exporta os PNGs.

## NUNCA
- NUNCA edite o template original `assets/editor-carrossel.html`. Gere uma CÓPIA por projeto.
- NUNCA entregue copy sem acentuação correta do português. Carrossel sem acento é amador — vale para TODA a copy dos slides E para a legenda.
- NUNCA use um `kit` fora da lista de `references/02-sistema-visual.md` (nome EXATO) — nome errado cai no fallback e quebra a tipografia.
- NUNCA coloque 2+ ideias num mesmo slide. Se tem 3 ideias, vira 3 slides ou some 2.
- NUNCA pule os checkpoints de validação (perfil de marca, sistema visual, estrutura). Você é co-criador, não dono da peça.
- NUNCA invente outro editor nem peça ferramenta externa/paga. A entrega é o `<slug>-carrossel.html`.
- NUNCA saia do escopo. Fora de escopo (reels/vídeo, logo, foto realista por IA, edição de carrossel já publicado, plano de marketing completo): faça o carrossel e aponte o resto.

## SEMPRE
- SEMPRE valide nos 3 checkpoints (perfil, visual, estrutura) antes de escrever a copy final.
- SEMPRE explique cada decisão visual em uma linha ("escolhi essa fonte porque sua marca é X, comunica Y").
- SEMPRE ofereça opções (1 recomendação + 1 alternativa) quando o gosto entra: kit tipográfico, paleta, ganchos.
- SEMPRE slide 1 = `capa`, último slide = `cta`. 5-10 slides (ponto doce 5-7).
- SEMPRE gancho do slide 1 é o mais importante — tem que parar o dedo.
- SEMPRE que houver `foto`, use `montar.py` (embute a imagem como dataURL pra o HTML rodar offline no duplo-clique).

## Pré-requisitos
- Arquivos da skill (todos na própria pasta da skill, doravante `<SKILL_DIR>`; leia com Read quando o passo indicar). Os nomes abaixo (`references/...`, `assets/...`) são RELATIVOS a `<SKILL_DIR>` — a tool `Read` exige caminho ABSOLUTO, então resolva `<SKILL_DIR>`/`<SKILL_DIR_WIN>` UMA vez ANTES do Passo 1 (bloco no topo de "## Passos numerados") e passe sempre o literal `<SKILL_DIR_WIN>/references/XX.md` (nunca o nome relativo sozinho):
  - `assets/editor-carrossel.html` — editor visual (template base). NÃO editar o original.
  - `assets/montar.py` — injeta o projeto e embute as fotos como dataURL. Uso: `python montar.py projeto.json saida.html`.
  - `references/01-descoberta-marca.md` — perguntas de marca + arquétipos.
  - `references/02-sistema-visual.md` — kits tipográficos e paletas (nomes/hex EXATOS) + árvore de decisão.
  - `references/03-voz-e-tom.md` — como calibrar a voz da copy.
  - `references/04-frameworks.md` — tipos de carrossel e estruturas narrativas.
  - `references/05-formato-projeto.md` — o JSON do projeto e como injetar no editor (LEIA antes do passo 8).
- Python 3 (só para o passo 8, e só se houver foto ou se quiser injeção confiável). Detecte com `command -v python3 || command -v python`. Se faltar, use o fallback de injeção manual (passo 8, opção B).
- Um navegador (a pessoa abre o HTML e exporta os PNGs). A geração das fontes bonitas usa Google Fonts na 1ª vez; offline cai pro sistema — não é bloqueante para você.
- Nenhuma chave de API, conta paga ou serviço externo.

## Modos
- **Completo** (1ª vez ou marca nova): roda a descoberta inteira (Passos 1-7), com os 3 checkpoints. ~10-15 min de conversa. É o default.
- **Express** (a pessoa pediu `/express` ou "rápido"): caminho rápido. As ÚNICAS perguntas abertas são **tema** e **público** (as "2 perguntas"). Todo o resto dos Passos 1-4 NÃO é perguntado — você ASSUME defaults e os declara em 1 linha cada, sem esperar resposta:
  - Passo 1 (perfil): infira categoria, promessa, diferencial, arquétipo e as 3 palavras de tom a partir de tema+público. Declare em 1 linha (não abra CHECKPOINT 1).
  - Passo 2 (visual): escolha kit + paleta pela árvore de `references/02-sistema-visual.md` a partir do tema. SE não der pra decidir → default `kit: "Sora + Inter"` + paleta `Expert Dark` + `fmt: "45"`. (não abra CHECKPOINT 2.)
  - Passo 3 (voz): default = trata por "você", zero emoji, sem gírias, sem lista de palavras proibidas específica.
  - Passo 4 (brief): NÃO pergunte tipo/objetivo/CTA nem o @ — perguntá-los quebraria as "2 perguntas". Infira o **tipo** pelo mapeamento tema→tipo do Passo 4 (default declarado `educativo` quando nenhum sinal domina) e assuma **objetivo** = salvar/seguir + **CTA** = "salvar + seguir" (declare em 1 linha). O **handle** não é inferível do tema: reuse o `handle` de um manifest/arquivo anterior SE a pessoa tiver fornecido um; SENÃO use a exceção explícita `handle: ""` (string vazia esconde o rodapé — NUNCA invente um @).
  - Passo 8 (destino): NÃO pergunte onde salvar (seria uma 3ª pergunta) — use direto o default `$HOME/Downloads` e declare o caminho completo do arquivo na mensagem de entrega.
  - PULA o Passo 5 (grande ideia): escolha você o ângulo mais forte.
  - Checkpoints: NÃO rode os 3 checkpoints separados. Em vez disso, faça UMA confirmação consolidada logo antes da copy final (no Passo 7): num bloco curto, mostre o perfil assumido + kit/paleta/formato + a quebra dos slides e pergunte só "fechado ou ajusto?". Isso satisfaz o "nunca pule validação" sem virar entrevista.
- **Reusar** (a pessoa pediu `/reusar` ou "mesmo estilo de antes"): PULA os Passos 1-3 (descoberta) e vai direto pro brief (Passo 4). A skill NÃO tem memória persistente própria — a fonte do "sistema visual já salvo" é sempre um artefato do projeto anterior que a PESSOA fornece. Peça UMA destas fontes, nesta ordem de preferência:
  1. O arquivo `<slug>-carrossel.html` de antes → leia com Read, localize o objeto `window.CARROSSEL = {...}` e reaproveite `fmt`, `kit`, `theme` e `handle` exatamente como estão.
  2. O `projeto.json` de antes → reaproveite os mesmos campos.
  3. O resumo do sistema visual (kit + paleta + formato + handle) que você entregou no Passo 9 de uma sessão anterior, colado pela pessoa.
  SE a pessoa não tiver nenhuma dessas → não há o que reusar: caia no modo Completo (ou Express, se ela pedir rápido).

Se o modo não estiver claro na 1ª mensagem, pergunte UMA vez antes de começar:
> "É a primeira vez ou quer reusar um estilo que já montamos? (se for reusar, me manda o arquivo do carrossel anterior ou o resumo visual dele)"

## Passos numerados (modo completo)

**Antes do Passo 1 — resolva o diretório da skill (uma vez).** A tool `Read` exige caminho ABSOLUTO: `Read references/01-descoberta-marca.md` (relativo) NÃO funciona. Rode este bloco (Bash) UMA vez e ANOTE os dois valores: `SKILL_DIR` (forma POSIX, usada DENTRO do Bash) e `SKILL_DIR_WIN` (forma Windows `C:/...`, usada na tool `Read`). Sempre que um passo abaixo disser `Read references/XX.md` ou `Read assets/editor-carrossel.html`, chame `Read <SKILL_DIR_WIN>/references/XX.md` / `Read <SKILL_DIR_WIN>/assets/editor-carrossel.html` com o caminho literal impresso. É o MESMO `SKILL_DIR` que o Preparo do Passo 8 (item 0) reusa.
```bash
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/carrossel-studio"
[ -f "$SKILL_DIR/assets/montar.py" ] || SKILL_DIR="$(dirname "$(dirname "$(find "$HOME" -type f -name montar.py -path '*carrossel-studio*' 2>/dev/null | head -n1)")")"
SKILL_DIR_WIN="$(cygpath -m "$SKILL_DIR" 2>/dev/null || echo "$SKILL_DIR")"
echo "SKILL_DIR=$SKILL_DIR"; echo "SKILL_DIR_WIN=$SKILL_DIR_WIN"
test -f "$SKILL_DIR/references/01-descoberta-marca.md" && echo "references: OK" || echo "references: NAO ENCONTRADO"
```
Ex.: se imprimiu `SKILL_DIR_WIN=C:/Users/.../marketing/skills/carrossel-studio`, no Passo 1 chame `Read C:/Users/.../marketing/skills/carrossel-studio/references/01-descoberta-marca.md`. SE imprimir `references: NAO ENCONTRADO` → a skill não está instalada corretamente: avise a pessoa e pare.

### 0. Boas-vindas
Uma frase curta explicando o caminho — não despeje o processo inteiro:
> "Vou te fazer algumas perguntas pra entender sua marca, escrever a copy e montar os slides. No fim você recebe um arquivo que abre no navegador e exporta as imagens. Bora?"

### 1. Descoberta de marca — Read `<SKILL_DIR_WIN>/references/01-descoberta-marca.md`
Faça as perguntas em 1 ou 2 blocos (nunca uma a uma): categoria/nicho, público, promessa, diferencial, arquétipo, 3 palavras que descrevem o tom. Se a pessoa não souber responder algo, sugira uma hipótese e siga (não trave a conversa).
- Validação (CHECKPOINT 1): monte um mini-perfil e confirme antes de seguir:
  > "Te enxerguei assim: marca **[categoria]**, falando com **[público]**, com tom **[3 palavras]**, arquétipo **[X]**. Fechado ou ajusto algo?"
- Se a pessoa ajustar → corrija o perfil e reconfirme. Só avance com "fechado".
- SE a resposta for AMBÍGUA (nem um "fechado" claro, nem uma correção clara) → repergunte UMA vez com opções binárias explícitas: *"1 = fechado, pode seguir · 2 = quero ajustar [X]"*. Se AINDA assim continuar ambígua → aguarde a pessoa responder (parada legítima); NUNCA assuma "fechado" sozinho. Essa mesma desambiguação vale para os CHECKPOINTs 2 e 3 e para a confirmação consolidada do modo Express.

### 2. Sistema visual — Read `<SKILL_DIR_WIN>/references/02-sistema-visual.md`
Recomende 1 kit tipográfico (nome EXATO da lista) + justificativa em 1 linha + 1 alternativa. Sugira 1-2 paletas prontas da lista OU cores próprias da marca. Defina formato: 4:5 retrato (`"45"`) é o default.
- **Contraste — critério objetivo** (no lugar de "contraste alto", que é subjetivo): razão de contraste WCAG entre `fg` e o fundo ≥ **4.5:1** (nível AA para texto), aferida contra `bg` E `bg2` (o fundo é um gradiente `bg`→`bg2`). Título muito grande tolera ≥ 3:1, mas prefira 4.5:1. As paletas prontas de `references/02-sistema-visual.md` já são de alto contraste (a maioria 12:1+); a única exceção é `Rosa pop`, que dá ~3:1 (branco sobre o `bg` claro `#f858bc`) — nela use só título grande e curto, nunca `corpo` longo. Para cores próprias da marca, VERIFIQUE a razão antes de fixar (se houver `node`):
```bash
node -e 'const f=h=>{h=h.replace("#","");const v=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};const L1=f(process.argv[1]),L2=f(process.argv[2]);const r=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);console.log("contraste "+r.toFixed(2)+":1",r>=4.5?"OK":"BAIXO");' "<fgHex>" "<bgHex>"
```
Troque `<fgHex>`/`<bgHex>` pelos hex reais (ex.: `"#ffffff" "#1b1b1b"`) e rode uma vez pra `fg`×`bg` e outra pra `fg`×`bg2`. SE imprimir `BAIXO` → clareie o `fg` ou escureça `bg`/`bg2` e rode de novo até dar `OK`. Sem `node`: fique nas paletas prontas (respeitando o alerta do `Rosa pop`).
- Validação (CHECKPOINT 2): confirme kit + paleta + formato com a pessoa antes de seguir. Se ela trocar → atualize e reconfirme.

### 3. Voz e tom — Read `<SKILL_DIR_WIN>/references/03-voz-e-tom.md`
Calibre 4 dimensões: formalidade, uso de emoji (default: zero ou pouquíssimo), regionalismo/gírias, e uma lista de palavras proibidas (jargão que a marca não usa). Monte a lista de proibidas COM a pessoa.

### 4. Brief do carrossel
Capture: tema, tipo (`educativo` / `lista` / `case` / `contraintuitivo` / `storytelling` / `anúncio`), objetivo (salvar? comentar? clicar no link?), e se tem CTA/oferta.
- **Inferir o `tipo` a partir do tema (critério verificável — usado no modo Express, que não pergunta o tipo).** Pelo sinal dominante do tema, espelhando a coluna "Quando" de `references/04-frameworks.md`:
  - número + substantivo ("3 erros", "5 dicas", "7 passos") → `lista`
  - ensinar um conceito/processo ("como fazer X", "o que é Y", "guia de") → `educativo`
  - resultado/prova concreta ("como fulano saiu de A pra B", "o resultado de") → `case`
  - contradiz uma crença comum ("o mito de X", "você está errado sobre") → `contraintuitivo`
  - narrativa em 1ª pessoa ("minha jornada", "o dia em que") → `storytelling`
  - lançar/vender algo ("conheça o X", "lançamento", "nova oferta") → `anúncio`
  - SE nenhum sinal domina → default declarado `educativo`.
- Pergunte também o **@ do Instagram** da marca/pessoa (é o `handle`, vai no rodapé dos slides). Guarde o valor JÁ COM a arroba, no formato `@perfil` (ex.: `@expertintegrado`) — é esse o formato que o editor espera e o que aparece no placeholder `@seuperfil`. SE a pessoa não informar ou não quiser @ no rodapé → use `handle: ""` (string vazia esconde o rodapé). NUNCA invente um @, e NUNCA deixe o campo ausente do JSON — ausente faz o editor cair no placeholder `@seuperfil`.

### 5. Grande ideia
Proponha 3 ângulos narrativos distintos pro mesmo tema. A pessoa escolhe 1.
- SE modo Express → PULE este passo.

### 6. Estrutura dos slides — Read `<SKILL_DIR_WIN>/references/04-frameworks.md`
Proponha a quebra completa: quantos slides (5-10, ponto doce 5-7) e o papel de cada um (gancho, contexto, pontos, virada, fechamento/CTA).
- Assim que os papéis dos slides estiverem fechados (e reconfirmados no CHECKPOINT 3), execute a seção **"Foto da pessoa nos slides (detalhe)"** (mais abaixo) para decidir se algum slide leva foto e de onde ela vem — ANTES de escrever a copy (Passo 7) e montar o JSON (Passo 8). É o Passo 6 que define os papéis dos slides, que é o que determina quais slides podem levar foto.
- Validação (CHECKPOINT 3): valide a estrutura ANTES de escrever a copy final. Se a pessoa mexer no nº de slides ou na ordem → refaça a quebra e reconfirme.

### 7. Copy final
Escreva a copy de cada slide aplicando a voz do passo 3. Cada slide tem: `kicker` (rótulo curto, opcional), `titulo`, `corpo` (opcional), `cta` (no fechamento). Releia cada slide perguntando: "isso para o dedo? é uma ideia só? é a voz da pessoa?". O gancho do slide 1 é 80% do resultado.

### 8. Montar no editor — Read `<SKILL_DIR_WIN>/references/05-formato-projeto.md` ANTES
Monte o objeto do projeto (JSON) seguindo EXATAMENTE o schema de `references/05-formato-projeto.md`. Regras do JSON:
- `fmt`: `"45"` (retrato 1080×1350, default) ou `"11"` (quadrado 1080×1080).
- `kit`: nome EXATO da lista de `references/02-sistema-visual.md`.
- `theme`: objeto com 6 chaves — `name` (rótulo da paleta) + as 4 cores `bg`, `bg2`, `fg`, `accent` + `grad` (booleano que liga o gradiente `bg`→`bg2`): `{name,bg,bg2,fg,accent,grad}` — paleta pronta ou cores da marca.
- `handle`: `@` da pessoa capturado no Passo 4, no formato `@perfil` COM a arroba (ex.: `@expertintegrado`); string vazia `""` esconde o rodapé. SEMPRE preencha explicitamente — campo ausente faz o editor mostrar o placeholder `@seuperfil`.
- `showPag` (mostra `1/N` no rodapé) e `showSeta` (seta "arraste" nos slides não-finais): `true`/`false`. **Default `true` para os dois** (igual ao estado inicial do editor). NÃO são perguntados na descoberta — mantenha `true`, e só mude para `false` se a pessoa pedir explicitamente pra esconder a numeração ou a seta.
- Cada slide: `tipo` (`"capa"` no 1º · `"conteudo"` no meio · `"cta"` no último), `kicker`, `titulo`, `corpo`, `cta`, `align` (`"left"` default / `"center"`).
- Foto (opcional): `foto` = caminho de arquivo, dataURL, ou ausente/`null`; `fotoModo` = `"fundo"` (foto cobre + overlay, boa pra capa) ou `"lado"` (foto na metade direita).

Gerar o arquivo de entrega — DUAS opções.

Antes das opções, defina dois valores literais que as opções usam:
- **`<destino>`** = pasta onde o arquivo final fica. Pergunte à pessoa UMA vez onde salvar (**no modo Express NÃO pergunte** — seria uma 3ª pergunta: use direto o `$HOME/Downloads` sem perguntar e declare o caminho na mensagem de entrega). SE ela não indicar → use `$HOME/Downloads` (o bloco de preparo abaixo cria essa pasta). SE ela indicar uma pasta customizada que ainda não existe no disco → crie-a ANTES de gerar o arquivo: nem o `montar.py` (Opção A) nem a tool `Write` (Opção B) criam a pasta de destino, e ambos FALHAM se ela não existir. O `mkdir -p "<destino>"` já está embutido no comando da Opção A (item 2) e é um passo explícito na Opção B (item 3) — apenas garanta que rodou.
- **`<slug>`** = nome curto derivado do tema em **kebab-case**: tudo **minúsculo**, palavras separadas por hífen, **sem acentos** (`ç`→`c`, `ã`→`a`, etc.) e no **máximo ~40 caracteres** (ex.: `3-erros-carrossel`). O arquivo final é `<destino>/<slug>-carrossel.html`.

**Opção A (padrão — obrigatória se houver `foto`): via `montar.py`.**

> ATENÇÃO: variável de shell NÃO sobrevive entre chamadas de tool — cada Bash é um processo novo, e Write/Read não são shell. Por isso: rode o bloco de preparo (item 0) UMA vez, LEIA as linhas que ele imprime, e daí pra frente cole a STRING LITERAL impressa (não `$SKILL_DIR`, `$SKILL_DIR_WIN`, `$PY`, `$WORK`, `$WORK_WIN`) em cada Write e Bash seguinte.

0. **Preparo — resolva os caminhos (Bash):**
   ```bash
   SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/carrossel-studio"
   [ -f "$SKILL_DIR/assets/montar.py" ] || SKILL_DIR="$(dirname "$(dirname "$(find "$HOME" -type f -name montar.py -path '*carrossel-studio*' 2>/dev/null | head -n1)")")"
   SKILL_DIR_WIN="$(cygpath -m "$SKILL_DIR" 2>/dev/null || echo "$SKILL_DIR")"
   PY="$(command -v python3 || command -v python)"
   WORK="$(mktemp -d)"
   WORK_WIN="$(cygpath -m "$WORK" 2>/dev/null || echo "$WORK")"
   mkdir -p "$HOME/Downloads"
   echo "SKILL_DIR=$SKILL_DIR"; echo "SKILL_DIR_WIN=$SKILL_DIR_WIN"; echo "PY=$PY"; echo "WORK=$WORK"; echo "WORK_WIN=$WORK_WIN"; echo "DEST_PADRAO=$HOME/Downloads"
   test -f "$SKILL_DIR/assets/montar.py" && echo "montar.py: OK" || echo "montar.py: NAO ENCONTRADO"
   ```
   - `CLAUDE_PLUGIN_ROOT` é a env var que o Claude Code exporta apontando pra raiz do plugin `marketing`; se ela estiver vazia, o fallback `find` acha o `montar.py` pelo nome+caminho e sobe 2 níveis até a pasta da skill. NUNCA chumbe um path de exemplo.
   - `SKILL_DIR`/`SKILL_DIR_WIN` são os MESMOS valores que você já resolveu antes do Passo 1 — este bloco re-resolve junto com `PY`/`WORK` (é idempotente); pode reusar o valor anterior. Use `<SKILL_DIR>` (POSIX) dentro do Bash e `<SKILL_DIR_WIN>` (Windows) na tool `Read`.
   - SE `PY=` saiu vazio → não há Python: vá para a Opção B (só serve sem foto).
   - SE imprimiu `montar.py: NAO ENCONTRADO` → a skill não está instalada corretamente: avise a pessoa e pare (ou use a Opção B, se não houver foto).
   - `WORK` (POSIX, ex.: `/tmp/tmp.ab12`) e `WORK_WIN` (Windows, ex.: `C:/Users/.../Temp/tmp.ab12`) apontam pra MESMA pasta. No Windows o `mktemp -d` devolve o path POSIX `/tmp/...`, que a tool **Write pode recusar por não ser absoluto** — por isso existe o `WORK_WIN` (convertido com `cygpath -m`). Regra: em TODA chamada da tool **Write** use `<WORK_WIN>`; deixe `<WORK>` (POSIX) só DENTRO do Bash (é o que `mktemp`/`montar.py` usam). Em Linux (sem `cygpath`) os dois são idênticos.
   - Anote os 6 valores impressos. `<SKILL_DIR>`, `<SKILL_DIR_WIN>`, `<PY>`, `<WORK>` e `<WORK_WIN>` são as strings literais que você cola adiante. `<destino>` = a pasta que a pessoa indicou, ou o `DEST_PADRAO` impresso se ela não indicou.
1. Salve o objeto do projeto como `projeto.json` DENTRO da pasta de trabalho, com a tool Write, no caminho literal `<WORK_WIN>/projeto.json` — a forma **Windows** do path (ex.: se imprimiu `WORK_WIN=C:/Users/.../Temp/tmp.ab12`, salve em `C:/Users/.../Temp/tmp.ab12/projeto.json`). NÃO passe o `<WORK>` POSIX (`/tmp/...`) pra tool Write — ela pode recusar como não-absoluto no Windows. (É o mesmo arquivo que o `montar.py` lê via `<WORK>` no passo seguinte, rodando dentro do Bash.)
2. Rode o script (Bash), colando as strings literais de `PY`, `SKILL_DIR`, `WORK` e o `<destino>`/`<slug>` escolhidos (o script resolve o template pelo próprio diretório). A 1ª linha cria a pasta de destino se ela não existir — o `montar.py` NÃO cria e falha (`FileNotFoundError`) se `<destino>` não existir:
   ```bash
   mkdir -p "<destino>"
   "<PY>" "<SKILL_DIR>/assets/montar.py" "<WORK>/projeto.json" "<destino>/<slug>-carrossel.html"
   ```
   O script embute cada `foto` (caminho → dataURL base64) e injeta `window.CARROSSEL` antes da tag `<script>` do editor.
3. Validação: o script imprime `OK -> <arquivo> (N slides)`. SE em vez disso imprimir `AVISO: foto nao encontrada` → a foto foi ignorada (slide sai sem foto); corrija o caminho e rode de novo, ou siga sem foto se aceitável. SE `template invalido: tag <script> nao encontrada` → o template foi corrompido; use a cópia limpa de `<SKILL_DIR>/assets/editor-carrossel.html`.

**Opção B (sem Python E sem foto): injeção manual.**
1. Read `<SKILL_DIR_WIN>/assets/editor-carrossel.html` (use o `SKILL_DIR_WIN` resolvido no item 0 da Opção A — forma Windows `C:/...`, que a tool `Read` aceita; NÃO modifique o original).
2. O template tem exatamente UMA tag `<script>` — é o bloco que começa com o comentário `Estado` e contém `const state = {...}` e a função `loadProject`. Insira, imediatamente ANTES dessa tag `<script>`, a linha:
   ```html
   <script>window.CARROSSEL = { ...o objeto do projeto... };</script>
   ```
   SE por edição futura houver mais de uma tag `<script>` no arquivo → use a ÚLTIMA (é exatamente o que o `montar.py` faz com `rfind("<script>")`; a "principal" é sempre a última, a que contém o `state`). O editor lê `window.CARROSSEL` no boot e já abre preenchido; se o objeto não existir, abre com o exemplo padrão (não quebra).
3. Garanta a pasta de destino ANTES de escrever (a tool `Write` não cria a pasta e falha se ela não existir): rode `mkdir -p "<destino>"` (Bash). Em seguida salve o resultado com Write como `<destino>/<slug>-carrossel.html`.
- Nunca use a Opção B com foto por caminho de arquivo — sem o `montar.py` a imagem não vira dataURL e o HTML não carrega a foto offline.

Salve o `<slug>-carrossel.html` no `<destino>` definido acima. Use slug curto em kebab-case (`3-erros-carrossel.html`). Avise onde ficou e como abrir:
> "Pronto. Abre o arquivo `<slug>-carrossel.html` no navegador (duplo clique). Ajusta o que quiser nos painéis e clica em **Exportar PNGs (.zip)** — ele baixa um zip com 1 imagem por slide, prontas pro Instagram."

### 9. Legenda + entrega
Escreva a legenda do post na voz da marca (gancho + corpo + CTA + hashtags). Entregue o pacote:
- `<slug>-carrossel.html` (abrir e exportar os PNGs)
- legenda pronta pra colar
- resumo do sistema visual, num bloco copiável: `kit` (nome exato), `theme` (as 6 chaves: `name` + as 4 cores `bg`/`bg2`/`fg`/`accent` + `grad`), `fmt` e `handle`. Diga à pessoa: "guarda esse resumo (ou o próprio arquivo `<slug>-carrossel.html`) — é o que eu uso pra repetir o mesmo estilo no modo Reusar." A skill NÃO guarda isso sozinha: a fonte do modo Reusar é sempre esse resumo, o HTML, ou o `projeto.json` que a pessoa devolve numa próxima sessão.

## Foto da pessoa nos slides (detalhe)
**Quando executar esta seção:** ao final do Passo 6, assim que os papéis dos slides estiverem definidos e reconfirmados (é isso que determina quais slides podem levar foto), e ANTES do Passo 7 (copy) e do Passo 8 (montagem). O download em si (quando a foto é do Eric) roda no Passo 8, depois que o Preparo (item 0) resolveu `<WORK>`. A sub-regra "caso não coberto → CHECKPOINT 1" (abaixo) só se aplica se a dúvida sobre foto já aparecer na descoberta (Passo 1); a decisão final por slide se fecha aqui, após o Passo 6.

Foto é OPCIONAL — a maioria dos carrosséis não precisa. Só entra quando a capa (ou algum slide) for do tipo "autoridade com rosto". Regra objetiva de quando um slide LEVA foto:
- Slide de **case**, **autoridade** ou **apresentação pessoal** ("quem sou eu" / prova de quem está falando) → foto.
- Slide de **lista**, **passos** ou **conceito** → SEM foto.
- Caso NÃO coberto por essas duas regras → NÃO decida sozinho, e NUNCA reabra um checkpoint já fechado: (a) se a dúvida já aparece na descoberta (Passo 1), leve-a ao CHECKPOINT 1 (perfil); (b) se ela só surge AQUI — ao rodar esta seção após o Passo 6, com o CHECKPOINT 1 já fechado — faça a pergunta pontual de foto junto ao CHECKPOINT 3 (estrutura), o checkpoint desta etapa, sem reabrir o CHECKPOINT 1. Nunca decida usar (ou não usar) foto fora dessas regras.
Decida assim:
1. SE nenhum slide vai usar foto → pule esta seção inteira (não pergunte nada sobre foto; deixe `foto` ausente no JSON).
2. SE algum slide vai usar foto → NÃO adivinhe quem está usando a skill (Eric ou aluno/cliente). Faça a pergunta explícita: "A foto é sua / da sua marca? Me manda o arquivo ou o caminho — ou você sobe direto no editor depois." O caminho da foto é decidido pela RESPOSTA, não por inferir a identidade do usuário:
   - SE a pessoa disser que é o **Eric / dono da marca Expert Integrado** → a fonte é o banco de fotos `ericlucianoferreira/agent-assets` (pasta `fotos/eric/`, repo privado), arquivo padrão `eric_avatar_profissional.jpg`. No Passo 8, DEPOIS que o Preparo (item 0) resolveu `<WORK>`, baixe pra dentro dele (Bash):
     ```bash
     gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/eric_avatar_profissional.jpg \
       -H "Accept: application/vnd.github.raw" > "<WORK>/eric.jpg"
     ```
     Valide: `test -s "<WORK>/eric.jpg"` e tamanho > 10KB. SE falhar (sem `gh` ou sem token GitHub) → reporte e siga sem foto, ou peça o arquivo à pessoa. No JSON do projeto, use `"foto": "<WORK_WIN>/eric.jpg"` — a forma **Windows** (`C:/...`), NUNCA a POSIX `<WORK>` (`/tmp/...`): o campo `foto` é DADO que o Python lê de dentro do JSON, e a conversão de path do Git Bash só vale pra ARGUMENTOS de linha de comando (o caminho do `projeto.json` passado ao `montar.py` é convertido; o conteúdo dele NÃO é) — com a forma POSIX o `montar.py` imprime `AVISO: foto nao encontrada` e o slide sai SEM foto. Em Linux as duas formas são idênticas. Adicione `"fotoModo"` (`"fundo"`/`"lado"`) e monte via Opção A (`montar.py`). Outras fotos do Eric (terno, palestra, etc.) estão listadas em `fotos/eric/catalogo.json` — liste com `gh api repos/ericlucianoferreira/agent-assets/contents/fotos/eric/catalogo.json -H "Accept: application/vnd.github.raw"` e troque só o nome do `.jpg` no comando acima. Alternativa local no PC (mesma fonte das skills `imagem` e `demonstracao-agente`): pasta `$HOME/OneDrive/Imagens/Perfil profissional/` (`Avatar.jpg`, ensaios) — as fotos NÃO migraram junto com o workspace pro Google Drive (não derive esse caminho de `WORKSPACE_DIR`); nesse caso `"foto"` = o caminho absoluto na forma Windows (`C:/Users/.../OneDrive/Imagens/...`).
   - SENÃO (qualquer outra pessoa / aluno / cliente) → use o caminho que ela fornecer, OU deixe `foto` ausente no JSON e oriente-a a subir pelo botão "Adicionar foto" no painel do slide dentro do editor.

Como a foto entra no JSON: campo `foto` no slide (caminho de arquivo OU dataURL) + `fotoModo` (`"fundo"` ou `"lado"`). Com foto por caminho de arquivo, use SEMPRE a Opção A (`montar.py`), que converte pra dataURL.

## Validação final (checklist antes de entregar)
- [ ] Slide 1 é `capa` e o último é `cta`?
- [ ] 5-10 slides (ponto doce 5-7)? Cada slide = uma ideia só?
- [ ] `kit` é um nome EXATO da lista de `references/02-sistema-visual.md`?
- [ ] `theme` tem as 6 chaves (`name` + as 4 cores `bg`/`bg2`/`fg`/`accent` + `grad`)? Contraste WCAG `fg`×`bg` E `fg`×`bg2` ≥ 4.5:1 (paleta pronta já OK, salvo `Rosa pop`; cores próprias verificadas com o snippet do Passo 2)?
- [ ] `handle` preenchido explicitamente (@ real da pessoa ou `""`), nunca ausente (ausente vira `@seuperfil`)?
- [ ] `showPag` e `showSeta` definidos (default `true`, ambos)?
- [ ] JSON válido (sem vírgula sobrando, aspas certas)?
- [ ] Toda a copy E a legenda com acentuação correta do português?
- [ ] Arquivo salvo como `<slug>-carrossel.html` (kebab-case) na pasta indicada?
- [ ] Se houver foto: gerado via `montar.py` (não injeção manual)?
- [ ] Os 3 checkpoints (perfil, visual, estrutura) foram validados com a pessoa?
- [ ] Cada decisão visual explicada em 1 linha?
- [ ] Legenda entregue + resumo do sistema visual pra reuso?

## Erros comuns e recovery
- **Tipografia quebrada / fonte errada no navegador** → `kit` fora da lista. Corrija para o nome EXATO em `references/02-sistema-visual.md` e regere o HTML.
- **Foto não aparece no HTML** → foi entregue por caminho de arquivo via injeção manual (Opção B). Refaça pela Opção A (`montar.py`), que embute como dataURL. Se `montar.py` avisou "foto nao encontrada", o caminho está errado — causa nº 1 no Windows: campo `foto` com a forma POSIX `/tmp/...` (use a forma Windows `<WORK_WIN>/...`; o Git Bash não converte paths DENTRO do JSON). Corrija e rode de novo — o aviso NÃO derruba o script (exit 0), então confira o output sempre.
- **Python ausente** (`command -v python3 || command -v python` vazio) → use a Opção B (injeção manual), MAS só se não houver foto. Com foto, instale/detecte Python ou avise a pessoa pra subir a foto pelo botão do editor.
- **HTML abre com o exemplo padrão (não com a copy)** → `window.CARROSSEL` não foi injetado ou o JSON é inválido. Valide o JSON e reinjete (Opção A regera; Opção B: confira que a linha entrou ANTES da tag `<script>`).
- **Slide com texto estourando** → o editor encolhe a fonte pra caber, mas não conte com isso pra enfiar parágrafo. Encurte a copy (frase curta, uma ideia).
- **Pediram algo fora de escopo (reels, logo, foto por IA, plano de marketing)** → faça o carrossel e aponte o recurso certo; não tente resolver aqui.

## Exemplo (mini, modo Express)
Pedido: "cria um carrossel sobre os 3 erros mais comuns ao começar com IA".
- Duas perguntas do Express: tema já veio no pedido; pergunta só o **público** → empreendedores iniciantes. Tom assumido (declarado em 1 linha): direto, prático. `@` não informado → `handle: ""`.
- Tipo: `lista` (3 erros) → 5 slides (capa + 3 + cta). Kit: `Tech (Space Grotesk)` + paleta `Scale` (tema IA/tech). Formato `"45"`. `showPag`/`showSeta`: `true` (default).
- Copy (resumida): capa "3 erros que estão te travando com IA" + "Arraste →"; slides `conteudo` com `kicker` "ERRO 1/2/3"; `cta` "Salva esse post pra não errar. Me segue pra mais."
- Confirmação consolidada única antes da copy final ("fechado ou ajusto?").
- Montagem: preparo (resolve `SKILL_DIR`/`PY`/`WORK`) → objeto do projeto salvo em `<WORK>/projeto.json` → `montar.py` → `<destino>/3-erros-ia-carrossel.html`. Legenda na voz da marca + hashtags. Resumo visual (kit+theme+fmt+handle) pra reuso.
