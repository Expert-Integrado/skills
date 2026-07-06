---
name: pauta-semanal
description: "Gera a pauta de conteúdo da semana automaticamente a partir do que está viralizando no nicho. Roda a pesquisa de concorrentes do Instagram (skill ig-competitor-research) dos últimos 7 dias e transforma os achados em 5 pautas prontas — cada uma com tema, ângulo, formato sugerido, hook e por que tende a funcionar. Feita para rodar toda segunda-feira (agendável). USAR quando o pedido for 'monta a pauta da semana', 'me dá 5 pautas', 'pauta semanal', 'ideias de conteúdo da semana', ou quando a tarefa agendada de segunda disparar. NÃO usar para escrever o roteiro/script de UM post específico (isso é /criar-script), nem para só rodar a pesquisa sem gerar pautas (isso é /ig-competitor-research)."
command: "pauta-semanal"
argument-hint: "[@handle1 @handle2 ...] (opcional — usa competitors.txt se não passar)"
allowed-tools: Bash, Read, Write, Edit
---

# Pauta Semanal — 5 pautas a partir do que viraliza no nicho

Transforma a pesquisa de concorrentes da semana em **5 pautas de conteúdo prontas pra produzir**. É a camada de "decisão de pauta" em cima da skill `ig-competitor-research`: a pesquisa mostra o que bombou nos últimos 7 dias; esta skill decide o que a pessoa vai postar a partir disso. Genérica: nenhum perfil, nicho, token ou marca vem embutido — quem assume configura os próprios concorrentes (`competitors.txt`) e a própria chave de API.

## NUNCA
- Nunca inventar tendência ou tema que não apareceu na pesquisa. Cada pauta cita a `Referência` real (@perfil + o que ele fez que bombou).
- Nunca mandar copiar o conteúdo viral — **adaptar** o tema ao contexto/nicho da marca da pessoa.
- Nunca rodar sem handles (`competitors.txt` ou argumento) e sem `APIFY_TOKEN` — parar e pedir pra configurar.
- Nunca entregar 5 pautas iguais — diversificar formatos e pilares.
- Nunca criar a tarefa agendada sem a pessoa pedir explícito; e confirmar o canal de entrega antes.
- Nunca remover/trocar acento em texto externo (pautas, hooks, CTAs) — português com acentuação correta.

## SEMPRE
- Sempre rodar Python com `PYTHONUTF8=1` (captions têm emoji; cp1252 quebra no Windows).
- Sempre janela de 7 dias por padrão (`--dias 7`).
- Sempre basear as pautas nos posts de maior `outlier_score` do `research_data.json` (engajamento ÷ mediana do próprio perfil).
- Sempre entregar as 5 pautas na conversa **E** salvar o arquivo registrado.
- Sempre pautas acionáveis (dá pra gravar/produzir esta semana).

## Pré-requisitos (configurar uma vez)
- A skill **`ig-competitor-research`** instalada — esta skill roda o script `research.py` dela.
- **`APIFY_TOKEN`** no ambiente (cada pessoa usa a própria conta Apify; free tier ~US$5/mês cobre). O script também aceita `APIFY_API_TOKEN`.
- **Python 3**, **`ffmpeg`** no PATH e **`openai-whisper`** + `requests` (`pip install -U openai-whisper requests`) — para transcrever os Reels.
- Um **`competitors.txt`** com os @ dos concorrentes do nicho, dentro da pasta da skill `ig-competitor-research` (1 handle por linha; `#` é comentário). É isto que personaliza a pauta.

## Passo 1 — Localizar a pesquisa e checar configuração
1. Descubra `RESEARCH_DIR` (a pasta raiz da skill `ig-competitor-research`, a que contém `scripts/research.py`). Diretórios-base a varrer, nesta ordem: `$HOME/.claude/plugins` e `$HOME/.claude/skills` (instalação global — `$HOME` do usuário, em Git Bash no Windows = `/c/Users/<voce>`), depois `$PWD/.claude/skills`, `$PWD/plugins` e `$PWD` (raiz do projeto onde a sessão está rodando). Rode:
   ```bash
   # (0) Override manual: se a pessoa/rotina já setou RESEARCH_DIR no ambiente apontando pra um dir válido, ele vence — desempate definitivo, pula a busca. (NÃO zere RESEARCH_DIR antes deste teste, senão o override some.)
   if [ -n "$RESEARCH_DIR" ] && [ -f "$RESEARCH_DIR/scripts/research.py" ]; then
     echo "RESEARCH_DIR=$RESEARCH_DIR (override do ambiente)"
   else
     RESEARCH_DIR=""
     for base in "$HOME/.claude/plugins" "$HOME/.claude/skills" "$PWD/.claude/skills" "$PWD/plugins" "$PWD"; do
       [ -d "$base" ] || continue
       # sort -V | tail -n1 = determinístico E pega a versão MAIS NOVA quando o cache tem várias (2.11.0 vs 2.13.0 — sort alfabético cru pegava a mais antiga; achado do golden run 06/07).
       hits="$(find "$base" -maxdepth 9 -type f -path '*/ig-competitor-research/scripts/research.py' 2>/dev/null | sort -V)"
       [ -z "$hits" ] && continue
       n="$(printf '%s\n' "$hits" | grep -c .)"
       hit="$(printf '%s\n' "$hits" | tail -n1)"
       [ "$n" -gt 1 ] && printf 'AVISO: %s cópias de ig-competitor-research em %s; usando a mais nova (sort -V). Pra forçar outra, rode com RESEARCH_DIR=<caminho> setado.\n%s\n' "$n" "$base" "$hits"
       RESEARCH_DIR="$(dirname "$(dirname "$hit")")"; break
     done
     echo "RESEARCH_DIR=${RESEARCH_DIR:-<vazio>}"
   fi
   ```
   - **Regra de desempate (quando existe mais de uma cópia da skill — cenário real: `cache/`, `marketplaces/` e/ou repo do projeto têm o mesmo `research.py`):** (a) `RESEARCH_DIR` setado no ambiente e válido ganha de tudo; (b) senão, os base-dirs são testados NA ORDEM da lista (é ordem de prioridade — instalação global do usuário antes de cópias do projeto), e o **primeiro** base-dir que contém a skill vence (`break`); (c) dentro de um mesmo base-dir, `sort | head -n1` escolhe o caminho alfabeticamente menor. As cópias `cache/` e `marketplaces/` do mesmo plugin têm `research.py` idêntico, então qualquer uma serve; o critério só precisa ser determinístico, e é. Se você precisa de uma cópia específica, defina `RESEARCH_DIR=<caminho>` antes de rodar.
   - SE `RESEARCH_DIR` ficar **vazio** (nenhum dos base-dirs tem a skill) → a skill `ig-competitor-research` não está instalada. **Pare** e reporte: "instale a skill ig-competitor-research (`/plugin install`) e rode de novo" — não tente adivinhar outro caminho nem baixar/recriar o script.
2. Determine os handles (o script lê `competitors.txt` no próprio `RESEARCH_DIR`, isto é `RESEARCH_DIR/competitors.txt`):
   - SE o usuário passou `@handles` como argumento → use esses.
   - SENÃO → leia `RESEARCH_DIR/competitors.txt` (1 handle por linha; `#` é comentário; linhas em branco não contam). Considere "sem handles" quando o arquivo não existe OU não sobra nenhuma linha depois de descartar comentários/linhas vazias.
   - SE ficou sem handles, o que fazer depende do **modo de execução**. NÃO adivinhe "pelo contexto" — detecte por variável de ambiente (teste programático, verificável). A rotina cron seta `PAUTA_MODO=agendado` ao disparar (ver "Rodar sozinha"); qualquer outro valor, ou a variável ausente, = interativo. Rode:
     ```bash
     if [ "$PAUTA_MODO" = "agendado" ]; then echo "MODO=agendado"; else echo "MODO=interativo"; fi
     ```
     - **`MODO=interativo`** (`PAUTA_MODO` não é `agendado` — inclui o caso comum de invocação manual, em que a variável nem existe: default seguro é assumir que há uma pessoa na conversa) → **pergunte os @** à pessoa e ofereça salvar no `RESEARCH_DIR/competitors.txt` (Edit) pra próxima vez. Pare até ter handles.
     - **`MODO=agendado`** (a rotina cron setou `PAUTA_MODO=agendado`, sem humano na conversa) → **não pergunte** (não há quem responda): **aborte** e envie no canal de entrega configurado (variável `PAUTA_CANAL`, setada pela rotina — o mesmo canal onde entregaria as pautas) a mensagem "Pauta da semana não gerada: `competitors.txt` está vazio ou ausente em RESEARCH_DIR — configure os @ concorrentes e a rotina volta a rodar na próxima segunda." Depois encerre sem gerar pautas.
3. Cheque o token: `[ -n "$APIFY_TOKEN" ] || [ -n "$APIFY_API_TOKEN" ]`. SE ambos vazios, use o MESMO teste de modo do Passo 1.2 (`$PAUTA_MODO`):
   - **`MODO=interativo`** → oriente: "crie uma conta grátis em apify.com, pegue o token e configure a variável de ambiente `APIFY_TOKEN`" — e **pare** até resolver.
   - **`MODO=agendado`** → **não pergunte**: aborte e envie no canal `PAUTA_CANAL` a mensagem "Pauta da semana não gerada: `APIFY_TOKEN` ausente no ambiente do cron — configure o token e a rotina volta a rodar na próxima segunda." Depois encerre sem gerar pautas.
4. Detecte o interpretador Python 3 e guarde em `PY` (usado nos Passos 2 e 5). Rode:
   ```bash
   PY="$(command -v python3 || command -v python || command -v py)"
   # Se nada no PATH: no Windows o launcher `py` sabe o caminho absoluto do interpretador
   [ -z "$PY" ] && PY="$(py -3 -c 'import sys; print(sys.executable)' 2>/dev/null)"
   # Validar por CAPACIDADE, não só por -x: o stub do WindowsApps (…/WindowsApps/python3) é executável
   # mas não roda nada (abre a Microsoft Store) — achado do golden run 06/07. Stub reprova neste teste:
   [ -n "$PY" ] && ! "$PY" -c "import sys" >/dev/null 2>&1 && PY=""
   # Fallback documentado do PC do Eric (Python 3.12 não fica no PATH aqui — ground truth CLAUDE.md)
   if [ -z "$PY" ] || { [ "$PY" != "py" ] && [ ! -x "$PY" ]; }; then
     for cand in "$HOME/AppData/Local/Programs/Python/Python312/python.exe" \
                 "/c/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"; do
       [ -x "$cand" ] && PY="$cand" && break
     done
   fi
   echo "PY=${PY:-<vazio>}"
   ```
   - SE `PY` ficar **vazio** → em outra máquina, ache o caminho absoluto com `where python` / `where py` (Windows) ou `command -v python3` (macOS/Linux), e use esse caminho no lugar de `$PY` nos comandos seguintes. Se nem isso encontrar → Python 3 não está instalado; **pare** e reporte que falta instalar Python 3.

## Passo 2 — Rodar a pesquisa (últimos 7 dias)
**Contrato do script** (verificado em `ig-competitor-research/scripts/research.py`, final da função `main`): ele imprime tudo no **stdout** e, como **última ação**, um `print` de **uma** linha no formato exato `RUN_DIR=<caminho>` — a única linha do stdout que começa com `RUN_DIR=`. Ele também grava `<RUN_DIR>/research_data.json`. Não confie em "é a última linha do terminal": **extraia por padrão** (`grep '^RUN_DIR='`) e **valide** que o `research_data.json` existe. Assim o contrato fica verificável só com o que este passo executa.

Rode tudo num **único bloco Bash** (variáveis não sobrevivem entre chamadas da tool Bash). Substitua `<PY>` e `<RESEARCH_DIR>` pelos valores literais que o Passo 1 ecoou:
```bash
OUT_LOG="$(PYTHONUTF8=1 "<PY>" "<RESEARCH_DIR>/scripts/research.py" [@handles...] --dias 7 --top-total 15 2>&1)"; RC=$?
printf '%s\n' "$OUT_LOG"
RUN_DIR="$(printf '%s\n' "$OUT_LOG" | grep -E '^RUN_DIR=' | tail -n1 | cut -d= -f2-)"
echo "RC=$RC / RUN_DIR=${RUN_DIR:-<vazio>}"
if [ "$RC" -eq 0 ] && [ -n "$RUN_DIR" ] && [ -f "$RUN_DIR/research_data.json" ]; then echo "PASSO2=OK"; else echo "PASSO2=FALHOU"; fi
```
- `[@handles...]`: passe os handles SÓ se a pessoa os deu como argumento; se vieram do `competitors.txt`, **não** passe nada (o script lê o arquivo sozinho, via `--file` default). **Formato dos handles** (posicionais no `argparse`, tratados por `read_handles`/`normalize_handle` no `research.py`): o `@` é **opcional** (o script faz `lstrip("@")`), e vários handles são separados por **espaço ou vírgula** (cada argumento ainda é re-dividido por `[\s,]+`); a URL completa do perfil também é aceita. Ex. com 2 handles: `"<PY>" "<RESEARCH_DIR>/scripts/research.py" @rowancheung @mattgray1 --dias 7 --top-total 15` — equivalente a passar `rowancheung,mattgray1` (sem `@`); ambos resolvem para os mesmos dois handles.
- **Resultado esperado / validação:** o passo só é bem-sucedido quando imprime `PASSO2=OK` (exit 0 **E** `RUN_DIR` não-vazio **E** `research_data.json` existe). Guarde esse `RUN_DIR` pros Passos 3 e 5. SE imprimir `PASSO2=FALHOU`:
  - `RC` ≠ 0 → ver "Erros comuns e recovery" (token, janela sem posts, Python não encontrado).
  - `RC` = 0 mas `RUN_DIR` vazio ou sem `research_data.json` → o script não cumpriu o contrato; **não invente um caminho**. Releia o `$OUT_LOG` impresso pra achar o erro real e rode o Passo 2 inteiro de novo (não reaproveite `RUN_DIR` de run anterior — URLs de vídeo do IG expiram).
- Rápido: acrescente `--no-transcribe` pra pular o download de vídeo + Whisper (só metadados+capa). Mais rápido, mas a transcrição deixa a pauta muito melhor — só usar se a pessoa pedir velocidade.

## Passo 3 — Analisar e escolher
1. `Read` o `<RUN_DIR>/research_data.json`. Estrutura: `{"meta": {...}, "posts": [...]}`.
2. Ordene `posts` por `outlier_score` (desc) — os que mais superaram a média do próprio perfil.
3. Defina o conjunto a analisar: os **8 primeiros** posts dessa lista ordenada (maior `outlier_score`). SE `posts` tiver menos de 8 itens → use **todos**. (8 é o corte porque a `ig-competitor-research` trata ≤8 posts como analisáveis direto no contexto principal, e 8 dá folga sobre as 5 pautas finais para diversificar.) Para cada post desse conjunto: `Read` o `frame_path` (a capa) e leia os campos `transcript` e `caption`. O `frame_path` já vem como **caminho absoluto** (o script grava `str()` de `<RUN_DIR>/frames/<arquivo>.jpg`, e o `RUN_DIR` é absoluto por padrão) — passe-o **direto** pro `Read`, sem concatenar com `RUN_DIR` nem com nada. (Pode ser `null`/ausente quando o download da capa falhou ou o post não tinha imagem — nesse caso pule o `Read` e use só `transcript`/`caption`.)
4. Identifique os padrões da semana: que **temas**, **formatos** e **hooks** estão puxando o engajamento.

## Passo 4 — Montar as 5 pautas

### Fontes de contexto da marca (use nesta ordem — vale pra tom, nicho, capacidade e pilares)
Esta skill **não tem tool de memória/recall** (allowed-tools = Bash, Read, Write, Edit). Todo "contexto de marca" (tom, nicho, capacidade de produção, pilares) sai destas fontes, nesta ordem de prioridade — nunca chamar recall/save_note (não existem aqui):
1. O que a pessoa disse **NESTA conversa** (ex.: "sou só eu com o celular", "meu pilar é finanças").
2. O arquivo local de marca — SE existir `marca.md` OU `perfil-marca.md` no diretório de trabalho atual (`$PWD`), faça `Read` dele. Se ele declarar capacidade de produção e/ou pilares próprios, esses **substituem** os defaults abaixo.
3. O nicho implícito pelos concorrentes do `RESEARCH_DIR/competitors.txt` (Read) — dá o assunto, não a capacidade.
4. Nenhuma das anteriores → use os **defaults** definidos abaixo (capacidade e pilares) e tom **neutro** (sem inventar posicionamento de marca).

### O que "a marca consegue produzir" significa (critério verificável)
"Consegue produzir" = cabe no **baseline de produção**. **Default** (quando nada nas fontes 1-2 diz o contrário): 1 pessoa, celular, edição simples (ex.: CapCut), **sem** equipe/estúdio/orçamento de mídia, gravável e postável **dentro desta semana**. Uma pauta passa no critério se dá pra executar dentro desse baseline. SE as fontes 1-2 declararem outra capacidade (tem equipe/editor/estúdio, ou ao contrário "não apareço na câmera"), respeite-a: descarte pauta que exija recurso que a marca declarou não ter. Sem declaração, aplique o default e não invente restrição nem folga.

### Formato de saída (entregue EXATAMENTE assim — os 6 campos, nesta ordem)
```
📌 PAUTA <n> — <título do tema>
• Ângulo: <o recorte específico>
• Formato sugerido: <um dos formatos da lista fechada abaixo>
• Hook sugerido: "<primeira frase que prende>"
• Por que tende a funcionar: <mecanismo — baseado no que viralizou esta semana>
• CTA sugerido: <orgânico por padrão (ex.: "comenta X", "salva", "compartilha"); só use CTA de tráfego pago se a pessoa disse NESTA conversa que a pauta é pra anúncio — sem menção, sempre orgânico>
• Referência: <@perfil + o que ele fez que bombou>
```
> **Sobre o `📌`:** é parte **obrigatória** deste template — marcador estrutural que abre cada pauta, não enfeite. A regra global "sem emoji" vale pra prosa/conversa; aqui o `📌` é um formato de saída **pedido explicitamente pela skill** (a exceção "só quando pedido explícito"), então mantenha-o exatamente. **Nenhum outro emoji** no texto das pautas.

### Lista fechada de "Formato sugerido" (escolha 1 por pauta — não crie formato fora desta lista)
1. Reel talking-head (você falando pra câmera)
2. Reel talking-head + B-roll (fala + cortes de apoio)
3. Reel screen-share / tutorial (gravação de tela)
4. Reel B-roll narrado (voz over + imagens, sem aparecer na câmera)
5. Reel trend / áudio em alta (usa formato ou áudio viral do momento)
6. Carrossel listicle (lista numerada de dicas/erros)
7. Carrossel storytelling / passo-a-passo (sequência que conta ou ensina algo)
8. Post estático (imagem única + legenda)
9. Stories em sequência (série de stories)

Pode **combinar até dois** desses formatos com `+` quando fizer sentido (ex.: "Reel talking-head + screen-share" = item 1 + item 3). Fora da lista e dessas combinações, não invente rótulo novo. Para a regra de diversidade (≥3 formatos distintos), um combo conta como um formato próprio.

### Pilar de conteúdo (o que é, de onde vem, e a regra de diversidade)
"Pilar" = a **função/intenção** do post (não o assunto). Se `marca.md`/`perfil-marca.md` declarar os pilares próprios da marca (fonte 2), use ESSES. Senão, classifique cada pauta em **um** destes 5 pilares default:
1. **Educar** — ensina um conceito, dica ou passo-a-passo.
2. **Autoridade/Prova** — caso, resultado, bastidor ou dado que mostra competência.
3. **Inspirar** — visão, motivação ou história de transformação.
4. **Entreter** — humor, trend, algo "relatable".
5. **Conexão** — pergunta, opinião ou pauta que puxa participação/comunidade.
(O pilar é critério interno de diversificação — não precisa aparecer no texto entregue.)

### Regras
- **Diversifique de forma verificável:** as 5 pautas devem cobrir **≥ 3 formatos distintos** (da lista fechada) **E ≥ 3 pilares distintos** (da lista de pilares). Nunca 5 pautas iguais.
- Cada pauta deve ser **acionável**: passa no critério de "consegue produzir" acima (baseline default ou capacidade declarada) e dá pra gravar/produzir esta semana.
- Baseie-se no que **realmente** apareceu na pesquisa — cite a `Referência` real. Nada de inventar tendência.
- Adapte o tema viral ao contexto da marca (fontes 1-4) — **não** mande copiar. Sem contexto de marca, tom neutro.

## Passo 5 — Entregar
1. Mostre as 5 pautas na conversa.
2. Salve o arquivo registrado. O caminho é **relativo ao diretório de trabalho atual da sessão** (`$PWD`) — não à pasta da skill nem ao `RESEARCH_DIR`. Rode a partir do `$PWD`:
   ```bash
   mkdir -p pautas
   OUT="pautas/$(date +%F)_pauta-semana.md"   # date +%F = AAAA-MM-DD; máquina no fuso America/Sao_Paulo (Brasília)
   # ... escreva as 5 pautas em "$OUT" (Write) ...
   echo "Pautas salvas em: $(pwd)/$OUT"
   ```
   Ao terminar, informe à pessoa o **caminho absoluto** onde salvou (`$(pwd)/pautas/<AAAA-MM-DD>_pauta-semana.md`).
3. (Opcional) Gere o relatório de pesquisa e aponte pra pessoa, caso ela queira se aprofundar:
   ```bash
   "$PY" "<RESEARCH_DIR>/scripts/build_report.py" "<RUN_DIR>"
   ```
   Gera `<RUN_DIR>/report.html` (funciona mesmo sem `analysis.json`).
4. Ofereça emendar com a skill `/criar-script` pra já roteirizar a pauta escolhida.

## Validação final (checklist antes de encerrar)
- [ ] 5 pautas, cada uma com os 6 campos do template (Ângulo, Formato, Hook, Por que funciona, CTA, Referência).
- [ ] Cada pauta cita uma `Referência` real vinda da pesquisa (@perfil que apareceu no `research_data.json`).
- [ ] Cada "Formato sugerido" é um item da lista fechada do Passo 4 (nenhum formato inventado).
- [ ] As 5 pautas cobrem ≥ 3 formatos distintos E ≥ 3 pilares distintos (diversidade verificável).
- [ ] Cada pauta cabe no baseline de produção (default solo-celular-1-semana, ou a capacidade declarada nas fontes 1-2).
- [ ] Só o `📌` de cada cabeçalho de pauta; nenhum outro emoji no texto.
- [ ] Acentuação correta em todo texto externo (pautas, hooks, CTAs).
- [ ] Arquivo `pautas/<AAAA-MM-DD>_pauta-semana.md` salvo.

## Erros comuns e recovery
- **`ERRO: APIFY_TOKEN nao encontrado`** → env var não setada. Setar `APIFY_TOKEN` (ou `APIFY_API_TOKEN`) e repetir o Passo 2.
- **`HTTP Error 401: Unauthorized` no traceback (RC=1)** → token PRESENTE mas inválido/expirado (a checagem do Passo 1.3 só vê presença, não validade — achado do golden run 06/07). Recovery: buscar token válido na ordem de credenciais do ambiente (env, depois 1Password — no vault do Eric o item é `Apify` e o campo tem rótulo em português: `op read "op://Agentes Eric/Apify/credencial"`) e repetir o Passo 2 com ele inline; se nenhum funcionar, orientar a regenerar o token em apify.com e parar.
- **`Nenhum post recente na janela` (exit 1)** → aumentar a janela (`--dias 14`) ou conferir os handles.
- **Perfil privado/inexistente** → o Apify retorna sem `latestPosts`; o script ignora e segue com os demais. Nada a fazer.
- **Emoji/caption quebrando no Windows** → garantir `PYTHONUTF8=1` na frente do comando.
- **`python`/`python3` não encontrado** → refazer a detecção do Passo 1.4 (launcher `py -3`, depois o fallback documentado `C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe`, senão `where python`).
- **URLs de vídeo do Instagram expiram rápido** → o script já transcreve na mesma sessão do scrape; se falhar, rerodar o Passo 2 inteiro (não reaproveitar `RUN_DIR` antigo).

## Rodar sozinha toda segunda (opcional — só a pedido)
Para automatizar: agendar com cron `0 8 * * 1` (segunda, 8h) usando o agendador do ambiente — no Claude Code, a skill `schedule` (rotinas cron). A rotina dispara esta skill e entrega as pautas no canal escolhido (WhatsApp/Zoom/Telegram/e-mail), apontando pro `competitors.txt` e `APIFY_TOKEN` da pessoa.
- Não criar a rotina sem a pessoa pedir; confirmar o canal de entrega antes.
- **Variáveis que a rotina DEVE setar no ambiente do cron** (é o que torna a detecção de modo verificável nos Passos 1.2/1.3):
  - `PAUTA_MODO=agendado` — sinaliza "sem humano na conversa". Sem isso, a skill se comporta como interativa e trava esperando resposta que nunca vem.
  - `PAUTA_CANAL=<canal>` — onde a rotina entrega as pautas E manda o aviso de abort (ex.: `whatsapp`, `telegram`, `zoom`, `email`; combine o valor exato com a pessoa ao criar a rotina).
- **Pré-condição travada antes de agendar:** `RESEARCH_DIR/competitors.txt` já preenchido com os @ e `APIFY_TOKEN` (ou `APIFY_API_TOKEN`) setado no ambiente onde o cron roda. Sem isso a rotina não tem o que pesquisar. Ao criar a rotina, confirme com a pessoa que os dois estão configurados.
- **Sem humano na conversa (execução agendada):** os "pare e pergunte" desta skill (handles ausentes no Passo 1.2; token ausente no Passo 1.3) NÃO se aplicam — não há quem responda. Detectado por `PAUTA_MODO=agendado`, a rotina **não pergunta**: aborta e manda um aviso no canal `PAUTA_CANAL` dizendo qual pré-condição faltou (competitors.txt vazio/ausente, ou APIFY_TOKEN ausente), e encerra sem gerar pautas. O "pergunte os @" só vale na execução interativa.

## Custo
Apify ~US$0,10–0,15 por run (cabe no free tier). Whisper roda local = grátis. Só paga a assinatura do Claude.

## Exemplo (uma pauta preenchida)
```
📌 PAUTA 1 — O erro de prompt que trava 90% dos iniciantes
• Ângulo: mostrar ao vivo o antes/depois de um prompt vago vs. um estruturado
• Formato sugerido: Reel talking-head + screen-share
• Hook sugerido: "Seu prompt não está errado, ele está incompleto — e é por isso que a resposta vem genérica."
• Por que tende a funcionar: contraste imediato (antes/depois) + prova na tela; padrão que bombou em @rowancheung esta semana
• CTA sugerido: orgânico — "comenta EU pra receber o template de prompt"
• Referência: @rowancheung — Reel de screen-share comparando duas respostas
```
