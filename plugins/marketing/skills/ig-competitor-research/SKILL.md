---
name: ig-competitor-research
description: "Pesquisa automatizada de conteudo viral no Instagram. Scrapeia os concorrentes de um nicho via Apify, rankeia os posts de maior performance da semana (outlier score), transcreve os Reels com Whisper local, analisa o visual de cada post e gera um relatorio HTML com hook + formato + transcricao + por que viralizou. Use quando o Eric pedir 'pesquisa de concorrentes no Instagram', 'o que ta viralizando no nicho X', 'IG competitor research', 'research de conteudo', 'analisa os perfis [@...]', ou quando precisar de ideias de conteudo baseadas no que ja funciona. NAO usar para: postar/agendar conteudo no Instagram, criar Reel/carrossel (isso e criar-reel/carrossel-studio), nem para pesquisa web generica (isso e tavily/deep-research)."
argument-hint: "[@handle1 @handle2 ...] [--dias N] [--top-total N] [--no-transcribe]"
allowed-tools: Bash, Read, Write, Edit, Task
---

# IG Competitor Research

Descobre o que esta performando no nicho e devolve um relatorio HTML acionavel (topicos, formatos e hooks prontos pra copiar/adaptar). Pipeline: um script Python deterministico scrapeia via Apify, rankeia por outlier score e transcreve os Reels com Whisper local; o Claude analisa o visual + transcricao de cada post e preenche os campos qualitativos; um segundo script monta o `report.html`.

## NUNCA
- NUNCA rodar Python sem `PYTHONUTF8=1` — captions tem emoji e o cp1252 do Windows quebra.
- NUNCA copiar o texto cru do ASR como `hook` — reescreve limpo (o Whisper introduz ruido).
- NUNCA gravar tokens no texto/JSON de saida. `APIFY_TOKEN` so via env ou `op read`.
- NUNCA rodar a transcricao numa sessao diferente do scrape — as URLs de video do Instagram expiram rapido; scrape + download + Whisper acontecem no mesmo `research.py`.
- NUNCA misturar clientes numa unica run quando estiver atendendo agencia — uma conversa/run por cliente, cada uma com seus handles.

## SEMPRE
- SEMPRE guardar a linha `RUN_DIR=...` que o `research.py` imprime na ultima linha — todos os passos seguintes usam esse diretorio.
- SEMPRE preencher os 4 campos qualitativos em portugues (`hook`, `format`, `why_it_worked`, `visual_notes`).
- SEMPRE analisar TODOS os posts do `research_data.json`, um por um (visual da capa + transcript + caption).
- SEMPRE que houver >8 posts, paralelizar a analise com subagentes (Task tool, 1 por post); com <=8, fazer no contexto principal.

## Pre-requisitos

### Diretorio da skill — resolver `SKILL_DIR` ANTES de tudo (obrigatorio)
Os scripts (`scripts/research.py`, `scripts/build_report.py`) e o `competitors.txt` vivem DENTRO da pasta desta skill. Voce conhece o caminho absoluto dela: e a pasta de onde este `SKILL.md` foi carregado (a mesma que contem as subpastas `scripts/` e — depois da 1a run — `output/`). O `cwd` do Bash RESETA entre chamadas, entao invocar `scripts/research.py` como caminho relativo falha com `No such file or directory`. Solucao: guardar o caminho absoluto em `SKILL_DIR` e SEMPRE chamar os scripts como `"$SKILL_DIR/scripts/..."` (nunca relativo, nunca com `cd`).
```bash
SKILL_DIR="<caminho absoluto da pasta deste SKILL.md>"
# ex. no PC do Eric: C:/repos/expertintegrado-skills/plugins/marketing/skills/ig-competitor-research
# (use SEMPRE o caminho real de onde a skill foi carregada, nao este exemplo)
```
Os proprios scripts resolvem `competitors.txt` e `output/` via `__file__` (relativo a `SKILL_DIR`), entao o `cwd` nao afeta ONDE os dados sao escritos — so afeta se o caminho do script e encontrado. Por isso basta o caminho absoluto do `.py`.

**Se a pasta carregada NAO tiver `scripts/` e `competitors.txt` ao lado** — checar `ls "$SKILL_DIR/scripts/research.py" "$SKILL_DIR/competitors.txt"`: a instalacao esta INCOMPLETA. NAO tente adivinhar, reconstruir ou "achar" o caminho (isso e recovery circular — sem os scripts a skill nao roda). PARAR e reportar ao Eric "instalacao incompleta", listando os 2 caminhos candidatos REAIS pra ele apontar o certo (setar `SKILL_DIR` pro que ele confirmar e so entao seguir):
- Cache do marketplace: `~/.claude/plugins/cache/expertintegrado/marketing/<versao>/skills/ig-competitor-research` (a `<versao>` muda a cada release — hoje `2.11.0`)
- Repo fonte: `C:/repos/expertintegrado-skills/plugins/marketing/skills/ig-competitor-research`

### Token Apify — resolver `APIFY_TOKEN` (obrigatorio, nao-circular)
O script aceita `APIFY_TOKEN` OU `APIFY_API_TOKEN`. Resolver nesta ordem, parando no primeiro que funciona:
1. **Ja no ambiente?** `printenv APIFY_TOKEN APIFY_API_TOKEN` — se qualquer um tiver valor, usar. ATENCAO (achado do golden run 06/07): presenca nao e validade — se a run falhar com `HTTP Error 401: Unauthorized`, o token do env esta expirado; NAO repetir com ele: cair pro item 2 (cofre) e re-rodar com o token do 1Password inline.
2. **Senao (ou apos 401 do env), via 1Password** (se `op` instalado E autenticado): exportar do cofre na MESMA chamada de Bash que roda o script (o env NAO persiste entre chamadas — ver comando do Passo 1). CORRECAO-DE-FATO (golden run 06/07): o item real do vault chama `Apify` e o campo tem rotulo em portugues `credencial` (nao existe item APIFY_TOKEN):
   ```bash
   [ -n "$APIFY_TOKEN$APIFY_API_TOKEN" ] || { command -v op >/dev/null 2>&1 && export APIFY_TOKEN="$(op read 'op://Agentes Eric/Apify/credencial')"; }
   # pos-401 do env: forcar o token do cofre mesmo com env presente -> APIFY_TOKEN="$(op read 'op://Agentes Eric/Apify/credencial')" APIFY_API_TOKEN="" na frente do comando
   ```
3. **Se `op` nao existir / nao estiver autenticado E nenhuma env var tiver valor:** PARAR e pedir ao Eric pra deixar o token disponivel — ou autenticando o 1Password (`op signin`), ou exportando `APIFY_TOKEN` no ambiente ele mesmo. NUNCA pedir, colar ou gravar o VALOR LITERAL do token no chat/arquivo (e secret — ver bloco NUNCA). Nao ha outra fonte: sem env var e sem cofre acessivel, a run nao roda.

### Python + midia
- **Python 3 + `ffmpeg` + `openai-whisper` (`import whisper`) + `requests`.** O shell NAO mantem env entre chamadas, entao cada comando Python abaixo resolve o interpretador inline via `$PY` na MESMA chamada de Bash. Resolver por CAPACIDADE (quem ja tem whisper), nao por PATH — no PC do Eric o `python3` do PATH e o 3.14 da Windows Store, mas o ecossistema whisper/ffmpeg documentado vive no 3.12; instalar `openai-whisper` num interpretador novo e download pesado desnecessario:
  ```bash
  PY=""
  for cand in "$(command -v python3 || true)" "$(command -v python || true)" \
    "$HOME/AppData/Local/Programs/Python/Python312/python.exe"; do
    [ -n "$cand" ] && "$cand" -c "import whisper, requests" >/dev/null 2>&1 && PY="$cand" && break
  done
  [ -n "$PY" ] || { PY="$(command -v python3 || command -v python || echo "$HOME/AppData/Local/Programs/Python/Python312/python.exe")"; "$PY" -m pip install -U openai-whisper requests; }
  command -v ffmpeg >/dev/null 2>&1 || echo "instale ffmpeg e coloque no PATH"
  ```
  Se `ffmpeg` ou `whisper` faltarem e nao der pra instalar agora, rodar com `--no-transcribe` (so metadados + capa; sem transcricao dos Reels).

## Entradas
- **Handles** — duas fontes, com PRIORIDADE FIXA (nao ha merge):
  1. **Argumento vence sempre.** Se vierem handles como argumento (`@handle1 @handle2`, com ou sem `@`, separados por espaco ou virgula), o script usa SO eles e IGNORA o `competitors.txt` por completo, mesmo que o arquivo exista.
  2. **`competitors.txt` (em `$SKILL_DIR/competitors.txt`) so e lido quando NENHUM handle foi passado como argumento** (1 handle por linha, `#` e comentario). **Nunca rodar as cegas com esse arquivo:** o `competitors.txt` pode estar preenchido com handles de OUTRO nicho (o default vem de exemplos do nicho de IA). Se o pedido do Eric NOMEIA um nicho (ex: "o que ta viralizando em advocacia") e nenhum handle veio como argumento, ANTES de rodar o Passo 1: `cat "$SKILL_DIR/competitors.txt"`, mostrar ao Eric os handles ativos (linhas sem `#`) e confirmar em UMA pergunta se eles cobrem o nicho pedido — ou receber os handles novos (que passam a valer como argumento, ver ponto 1). So rodar depois do OK; nunca assumir que o arquivo bate com o nicho do pedido.
  3. Sem argumento E sem `competitors.txt` com conteudo -> o script sai com exit 2 (`ERRO: sem handles`); pedir os @ ao Eric e parar.
- Flags opcionais: `--dias N` (janela, default 7), `--top-total N` (picks no relatorio, default 15), `--top-per-handle N` (default 3), `--posts-per-profile N` (posts puxados por perfil no scrape, default 24), `--whisper-model tiny|base|small|medium` (default small), `--max-audio-seconds N` (segundos transcritos por video, default 120), `--no-transcribe` (pula video+Whisper, so metadados+capa — muito mais rapido).

## Passos

### Passo 1 — Coleta + ranking + transcricao (script deterministico)
Rodar sempre com `PYTHONUTF8=1`. Como o shell nao persiste env entre chamadas, este bloco unico resolve `SKILL_DIR`, `$PY` e o token e roda o script — tudo na MESMA chamada de Bash (substitua o caminho de `SKILL_DIR` e os handles/flags):
```bash
SKILL_DIR="<caminho absoluto da pasta deste SKILL.md>"
PY=""
for cand in "$(command -v python3 || true)" "$(command -v python || true)" \
  "$HOME/AppData/Local/Programs/Python/Python312/python.exe"; do
  [ -n "$cand" ] && "$cand" -c "import whisper, requests" >/dev/null 2>&1 && PY="$cand" && break
done
[ -n "$PY" ] || { echo "nenhum interpretador com whisper — ver Pre-requisitos"; }
[ -n "$APIFY_TOKEN$APIFY_API_TOKEN" ] || { command -v op >/dev/null 2>&1 && export APIFY_TOKEN="$(op read 'op://Agentes Eric/Apify/credencial')"; }
PYTHONUTF8=1 "$PY" "$SKILL_DIR/scripts/research.py" <@handles...> [flags]
```
O script: scrapeia via Apify (1 chamada batch) -> filtra a janela (`--dias`, descarta pinned) -> calcula engajamento (`likes + comentarios*3`) e **outlier score** (engajamento / mediana do proprio perfil) -> top N por handle -> reordena global -> baixa a capa (`displayUrl`) de cada pick e, pros Reels, baixa o mp4, extrai audio com ffmpeg e transcreve com Whisper local. Sai um `output/<timestamp>/` com `research_data.json` (metricas + `transcript` + `frame_path`) e a pasta `frames/`.

**Validacao:** a ultima linha do stdout e `RUN_DIR=<caminho>`. Guardar esse caminho como `RUN_DIR` — os passos 2-3 usam ele.

**Se falhar:**
- Exit code 2 com `APIFY_TOKEN nao encontrado` -> resolver o token pela ordem em Pre-requisitos ("Token Apify"); se `op` indisponivel e sem env var, PARAR e pedir ao Eric (nunca colar valor literal).
- Exit code 1 / `Nenhum post recente na janela` -> reexecutar com `--dias` maior (ex: `--dias 14`).
- `ERRO: nenhum handle valido` / `ERRO: sem handles` (ambos exit 2) -> pedir os @ ao Eric.
- `openai-whisper nao instalado` no log -> o script segue sem transcricao; instalar depois ou aceitar so metadados.
- Perfil privado/inexistente -> o Apify retorna sem `latestPosts`; o script ignora e segue com os demais (nao abortar).

### Passo 2 — Analise visual (trabalho do Claude)
Os posts estao no array `posts[]` do `<RUN_DIR>/research_data.json`; cada objeto traz `shortcode`, `caption`, `transcript` (vazio se `--no-transcribe` ou Reel sem audio), `frame_path` (capa baixada), `type`, `outlier_score` e metricas.

O campo `type` vem cru do ator Apify (`apify~instagram-profile-scraper`) e assume 3 valores conhecidos — use-os pra orientar o rotulo de `format`:
- `Video` -> Reel/video. E o UNICO tipo que dispara download de mp4 + transcricao Whisper (`research.py` so baixa audio quando `type == "Video"`), entao so posts `Video` tem `transcript` preenchido.
- `Image` -> post de imagem unica (foto/estatico). Sem `transcript`.
- `Sidecar` -> carrossel (multiplas midias no mesmo post). Sem `transcript`.

**Formato do `frame_path`:** e um caminho ABSOLUTO ja pronto no JSON (o script resolve tudo internamente) — passe o VALOR LITERAL do campo `frame_path` direto pro `Read`, sem construir/adivinhar/concatenar nada. Padrao do nome do arquivo, so pra referencia: `<RUN_DIR>/frames/NN_handle_shortcode.jpg` (`NN` = indice de 2 digitos); no modo `--no-transcribe` e `<RUN_DIR>/frames/NN_handle.jpg` (sem shortcode). O valor pode ser `null` ou o campo pode estar ausente se o download da capa falhou — nesse caso NAO tente `Read` (nao inventar caminho); analisar so `transcript` + `caption` e anotar em `visual_notes` que a capa nao veio.

Para **cada post**:
1. `Read` o valor literal de `frame_path` (a capa/thumbnail) e analisar o visual: formato (talking head, B-roll, carrossel, listicle, split-screen, screen-share...), texto na tela, elementos que prendem o olhar. (Se `frame_path` for `null`/ausente, pular este passo — ver acima.)
2. Ler o `transcript` e a `caption` do mesmo post.
3. Produzir 4 campos, **em portugues**:
   - `hook` — a primeira frase/promessa que segura o espectador (reescreva limpa, nao copie ruido do ASR)
   - `format` — rotulo curto do formato (ex: "Talking head + B-roll", "Carrossel listicle", "Screen-share tutorial")
   - `why_it_worked` — 1-2 frases sobre o mecanismo psicologico (curiosidade, stakes, contraste, autoridade, prova social...)
   - `visual_notes` — o que a imagem mostra e por que funciona visualmente

**Regra de paralelizacao (contagem = `len(posts[])` do `research_data.json`):**
- **`len(posts) <= 8`** -> fazer no contexto principal, um post por vez (mais simples e barato).
- **`len(posts) > 8`** -> disparar 1 subagente por post via **Task tool** (todos os `Task` no MESMO turno pra rodarem em paralelo).

**Contrato do subagente (quando paralelizar) — prompt EXATO a passar em cada Task** (substituir os `{...}` pelos valores do post; o subagente herda a tool `Read`):
```
Voce e um analista de conteudo de Instagram. Analise UM unico post e devolva 4 campos qualitativos em portugues.

Post (do research_data.json):
- shortcode: {shortcode}
- type: {type}
- frame_path (capa/thumbnail, caminho absoluto): {frame_path}
- caption: {caption}
- transcript (ASR, pode ter ruido; vazio se nao houver): {transcript}

Passos:
1. Se frame_path nao for null/vazio, use a tool Read nesse caminho literal pra ver o visual. Se for null/vazio, pule e use so caption+transcript.
2. Produza EXATAMENTE 4 campos, em portugues:
   - hook: primeira frase/promessa que segura o espectador (REESCREVA limpa, nao copie o ruido do ASR)
   - format: rotulo curto (ex.: "Talking head + B-roll", "Carrossel listicle", "Screen-share tutorial")
   - why_it_worked: 1-2 frases sobre o mecanismo psicologico (curiosidade, stakes, contraste, autoridade, prova social...)
   - visual_notes: o que a imagem mostra e por que funciona visualmente

RETORNE APENAS um objeto JSON valido, sem nenhum texto antes ou depois, exatamente neste formato (com o shortcode preenchido):
{"shortcode":"{shortcode}","hook":"...","format":"...","why_it_worked":"...","visual_notes":"..."}
```
**Agregacao dos retornos:** cada subagente devolve 1 objeto JSON no formato acima. Junte os N objetos retornados num unico array — esse array E o `analysis.json` do Passo 3. Se algum subagente devolver texto extra alem do JSON, extraia so o bloco `{...}`. Se algum falhar/nao retornar JSON valido, reprocessar aquele post no contexto principal (nunca inventar os campos).

### Passo 3 — Gerar o relatorio
1. Escrever `<RUN_DIR>/analysis.json` — um array de objetos, um por post analisado, no formato:
   ```json
   [
     {
       "shortcode": "<shortcode do post>",
       "hook": "...",
       "format": "...",
       "why_it_worked": "...",
       "visual_notes": "..."
     }
   ]
   ```
   O `shortcode` de cada post esta no `research_data.json` (campo `shortcode` de cada item de `posts[]`) — e a chave do merge.
2. Rodar (resolvendo `SKILL_DIR` e `$PY` na mesma chamada — script por caminho absoluto, `<RUN_DIR>` e o valor guardado do Passo 1):
   ```bash
   SKILL_DIR="<caminho absoluto da pasta deste SKILL.md>"
   PY="$(command -v python3 || command -v python || echo "$HOME/AppData/Local/Programs/Python/Python312/python.exe")"
   "$PY" "$SKILL_DIR/scripts/build_report.py" "<RUN_DIR>"
   ```
   O script faz o merge do `analysis.json` por `shortcode`, gera `<RUN_DIR>/report.html` (dark-theme, imagens embutidas em base64, transcricao copiavel) e tenta abrir no navegador.

**Validacao:** stdout mostra `[merge] analysis.json aplicado em N posts` e `OK -> <RUN_DIR>/report.html`. Confirmar que N > 0; se a linha `[merge]` nao aparecer, o `analysis.json` nao foi encontrado ao lado do `research_data.json` ou os `shortcode` nao batem (ver Erros comuns).

### Passo 4 — Entregar ao Eric

**Como computar os "Top 3 padroes" (criterio objetivo e reproduzivel — nao chutar):**
1. Junte o campo `format` de TODOS os posts analisados.
2. Normalize cada rotulo pra agrupar (minusculas, sem acento e sem pontuacao) e agrupe os iguais/quase-iguais (ex.: "Talking head + B-roll" e "talking head com b-roll" = mesmo grupo).
3. Conte quantos posts caem em cada grupo. Ordene por contagem (desc); empate -> desempatar pela SOMA do `outlier_score` dos posts do grupo (desc).
4. Os 3 grupos com mais posts sao os "Top 3 padroes". Se houver menos de 3 formatos distintos, complete a lista com os mecanismos de `why_it_worked` mais repetidos, contados pelo mesmo metodo.
5. Rotular cada item com o nome do formato + a contagem (ex.: "Talking head + B-roll (5 posts)").

**Derivar 3 pautas a partir dos padroes (JA incluir na resposta — nao oferecer):** pra cada um dos Top 3 padroes, propor 1 pauta concreta pro nicho do Eric, reaproveitando o `format` + o `hook`/`why_it_worked` dos posts daquele grupo (adaptar, nao copiar). Cada pauta = um titulo/angulo acionavel que o Eric poderia gravar, ancorado no mecanismo que fez o padrao performar. (Correcao deliberada em relacao ao original, que so PERGUNTAVA "quer que eu brainstorme pautas?": a regra global do Eric e nunca perguntar "quer que eu faca X", ja fazer — entao as 3 pautas entram prontas no fim do relatorio.)

Responder no formato (texto externo — manter a acentuacao):
```
Relatório pronto: <RUN_DIR>/report.html

Top 3 padrões que mais aparecem (teste isso):
1. {formato 1} ({N} posts)
2. {formato 2} ({N} posts)
3. {formato 3} ({N} posts)

3 pautas pra testar essa semana (derivadas dos padrões acima):
1. {pauta 1 — aplica o padrão 1 ao nicho do Eric}
2. {pauta 2 — aplica o padrão 2}
3. {pauta 3 — aplica o padrão 3}
```
Jogar o HTML de volta no chat ja "treina" o contexto no top content do nicho — util pra refinar/expandir essas pautas se o Eric pedir.

## Validacao final (checklist)
- [ ] `research.py` terminou e imprimiu `RUN_DIR=`; o diretorio existe.
- [ ] `<RUN_DIR>/research_data.json` existe e tem posts no array `posts[]`.
- [ ] Cada post analisado tem os 4 campos preenchidos em portugues, `hook` reescrito (nao ASR cru).
- [ ] `<RUN_DIR>/analysis.json` escrito como array com `shortcode` batendo com o `research_data.json`.
- [ ] `build_report.py` reportou `[merge] ... aplicado em N posts` com N > 0 e gerou `report.html`.
- [ ] Resposta ao Eric inclui o caminho do `report.html` + top 3 padroes + as 3 pautas ja derivadas dos padroes (nao uma oferta de brainstorm).

## Erros comuns e recovery
- **cp1252/UnicodeEncodeError no Windows** -> faltou `PYTHONUTF8=1` na frente do comando. Repetir com o prefixo.
- **`can't open file '.../scripts/research.py'` / `No such file or directory`** -> `SKILL_DIR` errado ou vazio, ou script chamado por caminho relativo. Setar `SKILL_DIR` pro caminho absoluto da pasta deste SKILL.md e chamar `"$SKILL_DIR/scripts/..."` (ver "Diretorio da skill" em Pre-requisitos). Conferir com `ls "$SKILL_DIR/scripts/research.py"`.
- **`command not found` no `$PY`** -> o `python3`/`python` nao esta no PATH e o caminho absoluto do fallback nao existe nessa maquina. Ajustar o `PY=...` pro interpretador local (ou instalar Python 3).
- **`APIFY_TOKEN nao encontrado`** -> resolver pela ordem em Pre-requisitos ("Token Apify"): env var -> `op read` (na mesma chamada) -> se `op` indisponivel/nao-autenticado, PARAR e pedir ao Eric (autenticar 1Password ou setar a env var). Nunca colar valor literal. Repetir o Passo 1.
- **Janela sem posts** (`Nenhum post recente`) -> aumentar `--dias`.
- **Perfil privado/inexistente** -> esperado; o script pula e segue. Nao e erro.
- **URLs de video expiraram** -> so acontece se a transcricao rodar depois; o `research.py` ja faz scrape+download+Whisper na mesma execucao. Se precisar reprocessar, rodar `research.py` de novo (novo scrape), nao reaproveitar um `research_data.json` antigo.
- **Reels longos** -> o script transcreve so os primeiros `--max-audio-seconds` (default 120s); hook e conteudo principal vivem no inicio. Aumentar a flag se precisar de mais.
- **`[merge]` nao aparece no Passo 3** -> `analysis.json` fora do `<RUN_DIR>` (precisa estar ao lado do `research_data.json`) ou com `shortcode` que nao bate. Reescrever no diretorio certo com o mesmo `shortcode` do `research_data.json`.
- **Sem `ffmpeg`/`whisper`** -> rodar com `--no-transcribe` (perde transcricao, mantem metadados + analise visual da capa).

## Custo
- Apify: ~US$ 0,10–0,15 por run (cabe no free tier de US$ 5/mes). Whisper roda local = gratis.
- Unico custo real e a assinatura do Claude.

## Aviso
Scraping via ator Apify de terceiros pode violar os Termos de Uso do Instagram. Usar por conta e risco; preferir perfis/dados publicos e evitar uso abusivo (volume alto, dados sensiveis).

## Exemplo
```
Eric: roda o IG competitor research nesses perfis: @perfil1 @perfil2 @perfil3
```
1. Resolver `SKILL_DIR` + `$PY` + token (bloco unico do Passo 1) e rodar `PYTHONUTF8=1 "$PY" "$SKILL_DIR/scripts/research.py" @perfil1 @perfil2 @perfil3 --dias 7` -> imprime `RUN_DIR=.../output/20260703_101500`.
2. `Read` do valor literal de cada `frame_path` + `transcript`; preencher `hook`/`format`/`why_it_worked`/`visual_notes` (1 subagente por post se >8 posts, agregando os JSONs retornados).
3. Escrever `<RUN_DIR>/analysis.json` (array de `{shortcode,hook,format,why_it_worked,visual_notes}`) -> `"$PY" "$SKILL_DIR/scripts/build_report.py" "<RUN_DIR>"`.
4. Entregar: caminho do `report.html`, top 3 padroes (contados por `format`) e as 3 pautas ja derivadas desses padroes.
