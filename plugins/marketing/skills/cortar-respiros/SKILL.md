---
name: cortar-respiros
description: "Tira os respiros e pausas de silêncio de um vídeo automaticamente, deixando a fala numa cadência seguida, com áudio e vídeo em sincronia (usa auto-editor sobre o FFmpeg). Usar quando o Eric pedir 'corta os respiros', 'tira as pausas', 'deixa o vídeo mais corrido', 'versão enxuta', 'cadência seguida', 'jump cut', 'remove os silêncios', ou mandar um vídeo gravado pedindo pra agilizar. NÃO usar pra: gerar legenda/SRT (ver skill gerar-srt), editar motion/B-roll, cortar por conteúdo/trechos específicos, nem transcrever áudio."
argument-hint: "[caminho-do-video.mp4] [--margin 0.2] [--both] [--threshold N] [--out saida.mp4]"
allowed-tools: Read, Bash
---

# Cortar Respiros

Remove os trechos de silêncio (respiros, pausas, tempos mortos) de um vídeo gravado e remonta a fala numa cadência seguida, sem perder a sincronia áudio/vídeo. Roda o script `scripts/cortar_respiros.py`, que chama o `auto-editor` (trabalha sobre o FFmpeg) e usa o `ffprobe` pra medir durações. Entrega o(s) MP4 novo(s) na mesma pasta do original + tabela de antes/depois com o quanto cortou (segundos e %). Roda 100% local — nenhuma chave de API ou login.

## NUNCA
- NUNCA rodar num vídeo que já tem B-roll, overlay ou legenda "chapada" no arquivo — o auto-editor re-encoda e os cortes deixam esses elementos dessincronizados/estranhos. Rodar SÓ no clipe de fala cru.
- NUNCA gerar a legenda/SRT antes deste corte — os timestamps mudam depois do corte. Esta etapa vem ANTES de `gerar-srt`.
- NUNCA entregar sem avisar o Eric pra assistir e conferir se nenhum corte comeu o começo de uma palavra.
- NUNCA sobrescrever o arquivo original: o script sempre grava com sufixo (`_enxuto`/`_agressivo`/`_cortado`) ou no `--out`, nunca no mesmo nome do fonte.

## SEMPRE
- SEMPRE confirmar que o arquivo de vídeo existe (passo 1) antes de rodar o script.
- SEMPRE rodar em background quando o vídeo for "longo" — critério objetivo no passo 3 (duração ≥ 180 s medida no passo 1, OU arquivo ≥ 200 MB, OU flag `--both`, que faz dois encodes). Abaixo disso, foreground. O re-encode demora (é normal).
- SEMPRE, na PRIMEIRA vez com um vídeo, usar `--both` (gera enxuto 0.2s + agressivo 0.1s) e deixar o Eric escolher o ponto. "Primeira vez com este vídeo" = critério verificável no passo 2: NENHUM arquivo de saída (`_enxuto`/`_agressivo`/`_cortado`) existe ainda ao lado do original E o Eric não nomeou um modo específico.
- SEMPRE entregar os caminhos absolutos das saídas + a tabela de durações + o aviso de conferir os cortes.

## Pré-requisitos
Verificar ANTES de rodar (passo 0). Todos precisam existir:
- **Python 3** — resolver o interpretador em `$PY` (passo 0): env `PYTHON_BIN` → `command -v python3` → `command -v python` → fallback documentado do PC do Eric (`C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe`, porque nesse PC o Python NÃO está no PATH).
- **auto-editor** — instalar com `"$PY" -m pip install auto-editor` se faltar.
- **ffmpeg** e **ffprobe** — detectar com `command -v ffmpeg` e `command -v ffprobe`. Se faltar, avisar o Eric que precisa instalar o FFmpeg (o script depende do `ffprobe` pra medir a duração).
- Script: `cortar_respiros.py`, em `$SKILL_DIR/scripts/` (o `$SKILL_DIR` absoluto é resolvido no passo 0). É o único recurso; NÃO editar.

## Passos

### Passo 0 — Checar dependências e resolver caminhos ABSOLUTOS
> O cwd e as variáveis de shell RESETAM entre chamadas Bash (execução como subagente). Por isso este passo resolve o interpretador (`$PY`) e o diretório da skill (`$SKILL_DIR`) como caminhos ABSOLUTOS e os ECOA. Nos passos seguintes, substitua `$PY` e `$SKILL_DIR` pelas strings literais que este passo imprimir (OU cole este bloco no topo do mesmo comando Bash que roda o script — os passos 2 e 3 já mostram como). Nunca chamar `python`/`python3` nem `scripts/...` com caminho relativo.

```bash
# 1) Interpretador: env > python3 > python > caminho documentado do PC do Eric (lá o Python NÃO está no PATH)
PY="${PYTHON_BIN:-$(command -v python3 || command -v python)}"
[ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"

# 2) Diretório ABSOLUTO desta skill. O Claude Code exporta CLAUDE_PLUGIN_ROOT apontando pra raiz do plugin `marketing`
#    (a pasta que contém .claude-plugin/plugin.json). Se estiver vazia, cair pro cache do marketplace e depois pro repo clonado.
SKILL_DIR="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/skills/cortar-respiros}"
if [ -z "$SKILL_DIR" ] || [ ! -f "$SKILL_DIR/scripts/cortar_respiros.py" ]; then
  for cand in \
    "$HOME/.claude/plugins/cache/expertintegrado/marketing"/*/skills/cortar-respiros \
    "C:/repos/expertintegrado-skills/plugins/marketing/skills/cortar-respiros"; do
    [ -f "$cand/scripts/cortar_respiros.py" ] && SKILL_DIR="$cand" && break
  done
fi

echo "PY=$PY"
echo "SKILL_DIR=$SKILL_DIR"
"$PY" --version                                        # confirma que o interpretador roda
"$PY" -m auto_editor --version                         # confirma auto-editor instalado
command -v ffmpeg && command -v ffprobe                # ambos precisam existir
test -f "$SKILL_DIR/scripts/cortar_respiros.py" && echo "script: OK" || echo "script: NAO ENCONTRADO"
```
- SE `"$PY" --version` falhar (nenhum Python resolvido) → PARAR, reportar ao Eric "Python não encontrado (nem no PATH nem no caminho padrão)" e não seguir.
- SE `auto_editor` não estiver instalado → rodar `"$PY" -m pip install auto-editor` e repetir.
- SE `ffmpeg`/`ffprobe` faltar → PARAR, reportar ao Eric "FFmpeg não está no PATH, preciso que instale" e não seguir.
- SE imprimir `script: NAO ENCONTRADO` (nenhum dos caminhos existe) → PARAR e reportar ao Eric que a skill `marketing/cortar-respiros` não está instalada; NÃO improvisar caminho relativo.
- ANOTAR os valores absolutos impressos em `PY=...` e `SKILL_DIR=...`: são eles que entram nos comandos dos passos 2 e 3 (o shell reseta entre chamadas, então esses valores não sobrevivem sozinhos).

### Passo 1 — Confirmar o arquivo de entrada
Esta skill opera sobre um CAMINHO DE ARQUIVO LOCAL no disco (allowed-tools = Read, Bash — ela NÃO baixa anexos).
- Pegar o caminho do vídeo do pedido do Eric. SE ele não deu caminho → perguntar qual arquivo.
- SE o vídeo veio como ANEXO de chat (WhatsApp/Telegram, ex.: "manda esse vídeo gravado pra agilizar"): o download é feito pelo fluxo do CANAL ANTES de invocar esta skill (ex.: `download_attachment` do Telegram/WhatsApp) — usar o caminho local que esse fluxo já gravou no disco. Se você só tem uma referência de anexo e NENHUM caminho de arquivo local, a ação DENTRO desta skill é PARAR e pedir o path local (esta skill não tem tool de download); recomeçar o passo 1 com o caminho local.
- Verificar existência: `test -f "<video>" && echo OK || echo MISSING`.
- SE `MISSING` → reportar "arquivo não encontrado: <video>" e parar (o próprio script também aborta com essa mensagem).
- Usar sempre barra normal no caminho (`C:/Users/...`), mesmo no Bash do Windows.
- Medir duração e tamanho agora (alimentam o critério de "longo" do passo 3; `ffprobe` já foi confirmado no passo 0):
  ```bash
  ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "<video>"   # duração em segundos
  du -m "<video>"                                                                   # tamanho em MB (1a coluna)
  ```

### Passo 2 — Escolher o modo
Decisão em ordem de precedência (parar na PRIMEIRA regra que casar):
1. Eric NOMEOU um modo → usar esse modo (independe de ser a 1ª vez):
   - "enxuto"/"natural" → default, margem 0.2s (sem flag).
   - "agressivo"/"mais colado"/"sem respiro nenhum" → `--margin 0.1`.
   - "no talo"/"o máximo" → `--margin 0.05`.
   - "quero comparar"/"as duas versões" → `--both`.
   - Esta lista de frases-gatilho é FECHADA: só as expressões acima contam como "nomeou modo". Expressão fora dela (mesmo que pareça sinônimo) = "NÃO nomeou modo" → cair na regra 2. Nunca interpretar sinônimo por conta própria pra escolher margem/flag.
2. Eric NÃO nomeou modo → checar se é a PRIMEIRA vez com este vídeo (critério verificável, sem adivinhar). Rodar — trocar `<base>` pelo caminho do vídeo SEM a extensão; remover só a ÚLTIMA extensão, igual ao script (`video.final.mp4` → `video.final`; ex. simples: `C:/Users/Joao/Downloads/video`):
   ```bash
   ls "<base>_enxuto.mp4" "<base>_agressivo.mp4" "<base>_cortado.mp4" 2>/dev/null
   ```
   - NENHUM arquivo listado (saída vazia) → é a primeira vez → `--both` (gera enxuto 0.2s + agressivo 0.1s pro Eric escolher).
   - JÁ existe pelo menos um → não é a primeira vez e o Eric não deu direção → PERGUNTAR qual versão ele quer (não re-rodar às cegas).
3. Eric reclamou que "sobrou respiro" mesmo no agressivo → manter a margem escolhida e adicionar `--threshold 6` (sobe o limiar de silêncio, pega respiros mais "altos" que passaram batido).

Referência das margens (padding mantido em volta de cada fala; maior = mais natural, menor = mais corrido — é o que separa "natural" de "robótico/picotado"). O SUFIXO do arquivo é derivado da MARGEM pelo script, por FAIXAS (não por valor exato):
| Faixa de margem | Perfil | Sufixo do arquivo |
|-----------------|--------|-------------------|
| ≥ 0.2s (default 0.2; inclui 0.3 do recovery "picotado") | enxuto, natural (preserva pausas curtas) | `_enxuto` |
| ≤ 0.1s (inclui 0.1 E 0.05) | agressivo / no talo, cadência seguida | `_agressivo` |
| entre 0.1 e 0.2 (0.11s–0.19s) | intermediário | `_cortado` |

- NÃO é erro de documentação: `--margin 0.1` e `--margin 0.05` caem AMBOS na faixa `≤ 0.1s` → geram o MESMO arquivo `<base>_agressivo.mp4`. Consequência: rodar 0.1 e depois 0.05 no MESMO vídeo SOBRESCREVE o `_agressivo.mp4` anterior, sem avisar. SE precisar manter as duas variantes agressivas lado a lado → dar nome distinto a pelo menos uma com `--out` (ex.: `--out "<base>_notalo.mp4"`).

### Passo 3 — Rodar o script
Sempre com caminho ABSOLUTO: `$PY` e `$SKILL_DIR` são as strings que o passo 0 imprimiu. Nunca `python`/`python3` nem `scripts/...` relativo. Como o shell reseta entre chamadas Bash, o jeito à prova de erro é substituir `$PY`/`$SKILL_DIR` pelas strings literais anotadas no passo 0 (OU colar o bloco resolvedor do passo 0 no topo do MESMO comando).

**Decidir foreground x background (critério objetivo, com os dados do passo 1):**
- "Longo" = duração ≥ 180 s (3 min) OU arquivo ≥ 200 MB OU flag `--both` (faz dois encodes). Qualquer um desses → BACKGROUND.
- Abaixo de tudo isso → foreground (roda direto, lê o stdout, exit code em `$?`).

**Foreground (vídeo curto):**
```bash
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "<video>" [flags]; echo "EXIT=$?"
```

**Background (vídeo longo / `--both`):** redirecionar a saída pra um log e gravar o exit code num arquivo-sentinela `.rc`, pra recuperar depois só com Bash/Read (esta skill não lista tool de monitor). Disparar com o modo background da própria tool Bash (`run_in_background: true`) — ela re-invoca quando o processo terminar:
```bash
LOG="<video>.corte.log"; RC="<video>.corte.rc"
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "<video>" [flags] > "$LOG" 2>&1; echo $? > "$RC"
```
Ao concluir: `cat "<video>.corte.rc"` = exit code (0 = ok, ≠ 0 = falha); `cat "<video>.corte.log"` = a tabela de durações que o script imprimiu.

Exemplos de flags (trocar `$PY`/`$SKILL_DIR` pelos valores do passo 0; mostrados na forma foreground — se o vídeo for "longo", adaptar pro bloco background acima):
```bash
# Enxuto (default)
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "C:/Users/Joao/Downloads/video.mp4"

# As duas versões pra comparar (enxuto 0.2s + agressivo 0.1s) — sempre background (--both faz dois encodes)
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "C:/Users/Joao/Downloads/video.mp4" --both

# Agressivo
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "C:/Users/Joao/Downloads/video.mp4" --margin 0.1

# Subir o limiar de silêncio
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "C:/Users/Joao/Downloads/video.mp4" --threshold 6

# Saída com caminho explícito (usar quando precisar de dois agressivos sem sobrescrever — ver passo 2)
"$PY" "$SKILL_DIR/scripts/cortar_respiros.py" "C:/Users/Joao/Downloads/video.mp4" --out "C:/Users/Joao/Downloads/final.mp4"
```
- O script imprime a duração ORIGINAL, roda o auto-editor, mede cada saída com `ffprobe` e imprime `<nome_saida>  ->  M:SS  (cortou Xs, Y%)`.
- Saídas ficam na MESMA pasta do original (a menos que `--out` seja passado): `<nome>_enxuto.mp4`, `<nome>_agressivo.mp4` ou `<nome>_cortado.mp4`.
- Validação: exit code (foreground = `$?`; background = conteúdo de `<video>.corte.rc`). SE ≠ 0 (o script imprime "auto-editor falhou (margem X)." e as últimas linhas do erro no stdout/log) → ver "Erros comuns" abaixo antes de repetir.

### Passo 4 — Entregar
Reportar ao Eric com o template abaixo (caminhos absolutos, tabela, aviso).

## Validação final (checklist antes de reportar)
- [ ] Passo 0: `$PY` resolvido, auto-editor, ffmpeg e ffprobe confirmados.
- [ ] Passo 1: o vídeo de entrada existe.
- [ ] O script terminou com exit code 0 (foreground: valor de `$?`; background: `cat "<video>.corte.rc"` = 0).
- [ ] O(s) arquivo(s) de saída existe(m) na pasta esperada (`test -f`).
- [ ] A tabela de durações tem os valores de corte (s e %) — não veio `?` na duração (background: ler de `<video>.corte.log`).
- [ ] O aviso de "assistir e conferir os cortes" está incluído na entrega.

## Erros comuns e recovery
- **`auto-editor falhou`** (exit ≠ 0): ler as últimas linhas do stdout/stderr que o script imprime. Causas típicas: codec/arquivo corrompido, ou vídeo sem faixa de áudio (o auto-editor edita pela faixa de áudio). Reportar o erro ao Eric.
- **`ffprobe`/`ffmpeg` não encontrado**: FFmpeg não está no PATH → instalar e repetir (não é falha do script).
- **`ModuleNotFoundError: auto_editor`**: rodar `"$PY" -m pip install auto-editor` e repetir (instala no mesmo interpretador que roda o script).
- **`pip install auto-editor` falhou** (sem internet, sem permissão ou erro de rede): PARAR e reportar ao Eric o stderr do pip; NÃO tentar rotas alternativas (outro índice, sudo, baixar wheel na mão).
- **Duração aparece como `?`**: o `ffprobe` não conseguiu ler o arquivo (formato incomum/corrompido) — o corte pode ter funcionado mesmo assim; conferir se o MP4 de saída abre.
- **Ficou picotado/robótico** (cortou demais): rodar de novo com margem MAIOR (0.2 → 0.3).
- **Sobrou respiro** (cortou de menos): baixar a margem OU subir o `--threshold` (ex.: `--threshold 6`).
- **Corte comeu o começo de uma palavra**: subir a margem (mais padding em volta da fala) e regerar.

## Fluxo recomendado (encaixe com outras skills)
- Esta é a etapa ANTES da legenda: cortar os respiros → Eric escolhe a versão final → só então gerar o SRT (skill `gerar-srt`), porque os timestamps mudam depois do corte.
- Rodar SEMPRE no clipe de fala cru (sem B-roll/legenda/motion). Motion e legenda entram depois da versão escolhida.

## Template de saída (mensagem pro Eric)
```
Cortei os respiros do vídeo.

ORIGINAL: {M:SS} ({total}s)
{nome_saida_1}  ->  {M:SS}  (cortou {X}s, {Y}%)
{nome_saida_2}  ->  {M:SS}  (cortou {X}s, {Y}%)   ← só quando --both

Arquivos:
- {caminho_absoluto_saida_1}
- {caminho_absoluto_saida_2}

Assista e confira se nenhum corte comeu o começo de uma palavra. Se ficou picotado, gero com margem maior; se sobrou respiro, mais agressivo (ou subo o limiar).
```

## Recursos
- **`scripts/cortar_respiros.py`** — wrapper do auto-editor: parseia `--margin`, `--threshold`, `--both`, `--out`; suprime as barras de progresso; imprime o relatório de durações. NÃO editar (fora do escopo desta skill).
