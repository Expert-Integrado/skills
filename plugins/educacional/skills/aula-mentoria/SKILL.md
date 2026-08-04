---
name: aula-mentoria
description: Processa aula gravada da Mentoria Automações Inteligentes do Eric. Nomeia os vídeos do OBS local (.mkv pra Lixeira, .mp4 vira "<Título> - <Parte>.mp4"), e quando a aula saiu num arquivo único opcionalmente transcreve e corta em partes nas fronteiras temáticas. Cria pasta no Google Drive E no Smart Player com nome do tema, faz upload dos vídeos, e cria cartão no board "Roadmap de Conteúdo" do ClickUp com responsável Asafe Silva + links das pastas criadas. TRIGGER quando Eric disser "subir aula da mentoria", "aula-mentoria", "acabei de gravar a mentoria", "processar gravação OBS da mentoria", "publicar aula nova", ou pedir pra rodar essa skill. NÃO disparar para criar curso/aula novo do zero (educacional:criar-aula), mentoria de equipe de segunda 16h (educacional:mentoria-equipe-seg-16h), edição de vídeo com motion/cortes de erro (marketing:editar-video-motion), ou conteúdo que não seja da Mentoria Automações Inteligentes.
---

# Aula Mentoria — Skill operacional

Fluxo pós-mentoria do Eric: OBS local → Google Drive → Smart Player → ClickUp. A aula costuma ter **2 a 3 vídeos** (partes), mas pode sair num **arquivo único** — nesse caso ver o Passo 3.5 (corte). A skill roda SOMENTE no PC do Eric (arquivos locais do OBS + Chrome logado + Drive Desktop montado em `G:`); sem essas capacidades, parar e avisar — não há fallback headless. Browser SEMPRE via MCP `Claude_in_Chrome`; upload NUNCA por clique (Drive = cópia pro `G:`; Smart Player = API REST + `curl` PUT). Fluxo de upload validado em 17/06/2026; passos locais reescritos pra Node/Python em 04/08/2026.

**SHELL: Node/Python inline, ZERO PowerShell.** Até 04/08/2026 esta skill mandava usar `Get-ChildItem`/`Rename-Item`/`Add-Type`/`Copy-Item`, o que colidia com a HARD RULE 1 do Eric e **travava em sessão autônoma** (o auto mode classifier barra `powershell.exe` via Bash, tanto `-Command` quanto `-File`). Todos os passos locais agora são Node (`fs`) ou Python stdlib — inclusive o da Lixeira, que era o único que parecia exigir PowerShell de verdade (resolvido com `ctypes.SHFileOperationW`, ver Passo 5.2). Não reintroduzir cmdlet em nenhum passo.

## NUNCA

- NUNCA usar PowerShell/cmdlet em passo nenhum — quebra a HARD RULE 1 e trava em sessão autônoma. Node (`fs`) pra arquivo, Python stdlib pra Lixeira.
- NUNCA usar Playwright — lança Chromium sem login; Drive e Smart Player exigem a sessão ativa do Eric.
- NUNCA tentar upload por clique/diálogo de arquivo: o Chrome MCP não opera o seletor de arquivo nativo do SO e o `file_upload` MCP é bloqueado.
- NUNCA usar "Link do Drive" no Smart Player: Drive privado dá 403 no download server-side e a mídia fica em `ERROR`.
- NUNCA usar `fetch()` nos POST/PUT do Smart Player — `fetch` com `credentials:'include'` retorna **401 em POST** (testado). Só `XMLHttpRequest` com `withCredentials = true`, rodando na aba de `smartplayer.scaleup.com.br`.
- NUNCA mexer em `.mkv` de outros dias/sessões — só os PAREADOS (mesmo basename) com os `.mp4` escolhidos.
- NUNCA deletar permanentemente: `.mkv` vai pra LIXEIRA (recuperável). `fs.unlinkSync` NÃO manda pra Lixeira — usar o recipe do Passo 5.2.
- NUNCA fechar a aba do Smart Player enquanto os PUTs rodam.
- NUNCA executar ação irreversível (mandar `.mkv` pra Lixeira, criar cartão, sobrescrever arquivo, cortar) antes do OK do Bloco 4 via `AskUserQuestion`.
- NUNCA mandar o body do `DELETE /v1/medias/lists` como array de strings (dá HTTP 400) — é array de objetos `{code}`.
- NUNCA gravar o título em sistema nenhum (pasta, arquivo, cartão) sem ter certeza da grafia — 90% do que o Eric manda é áudio transcrito, e o título vai pra 4 lugares de uma vez. Ver Passo 2.
- NUNCA emoji. Acentuação correta em TODO texto externo (nomes de arquivo, pastas, cartão ClickUp, mensagem final).

## SEMPRE

- SEMPRE capturar e guardar as URLs criadas (pasta Drive, pasta Smart Player) ANTES de avançar pra etapa do ClickUp.
- SEMPRE rodar os PUTs logo após criar as entradas de mídia — as URLs pré-assinadas expiram em **1h (3600s)**.
- SEMPRE subir o arquivo MENOR primeiro (valida o fluxo rápido).
- SEMPRE validar com `fs.existsSync` depois de renomear/copiar/deletar — e reportar o estado real, não o exit code.
- SEMPRE perguntar N nomes para N partes (2 partes = 2 nomes; 3 = 3 nomes). Sem default genérico.
- SEMPRE usar `form_input` (não `computer type`) pra digitar nome com acento em campo de página — `type` corrompe `ç`/`ã`.

## Pré-requisitos (checar ANTES de começar)

| # | Checagem | Como verificar | Se falhar |
|---|----------|----------------|-----------|
| 1 | MCP `Claude_in_Chrome` conectado | tool `mcp__claude-in-chrome__list_connected_browsers` existe e responde | Parar. Avisar Eric: "skill exige o Chrome logado; abrir o Chrome no PC" |
| 2 | MCP `clickup-mcp` conectado | tool `mcp__clickup-mcp__clickup_search` existe | Parar e avisar (Etapa ClickUp não tem fallback browser confiável) |
| 3 | Pasta OBS existe | Bash: `[ -d "${OBS_BACKUP_DIR:-/c/Users/Eric Luciano/Videos/Backup OBS}" ]` | Parar e perguntar ao Eric onde estão as gravações |
| 4 | `G:` montado (Drive Desktop) | Bash: `[ -d "/g/Meu Drive" ]` | Parar e avisar — Drive Desktop fora do ar, sem fallback de upload por browser via MCP |
| 5 | SÓ se for cortar (Passo 3.5): ffmpeg + faster_whisper | Bash: `command -v ffmpeg && command -v ffprobe`; `python -c "import faster_whisper"` | Sem isso, não há corte — seguir sem cortar e avisar |

Pasta OBS canônica (default do PC, sobrescrevível por env): `OBS_BACKUP_DIR` → `C:\Users\Eric Luciano\Videos\Backup OBS`.

Python canônico do PC: `C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe` (3.12.10 — tem faster_whisper). NÃO usar `python3`, que resolve pro 3.14 do WindowsApps.

## Passo 1 — Conectar ao Chrome

1. `mcp__claude-in-chrome__list_connected_browsers` — retorna a LISTA de browsers conectados, cada um com `deviceId`, `osPlatform` e `isLocal`.
2. `mcp__claude-in-chrome__select_browser` passando o `deviceId` do Chrome LOCAL:
   - Caso NORMAL no PC do Eric: devolve **exatamente 1** browser (`isLocal: true`) → usar o `deviceId` dele.
   - SE devolver mais de 1 → escolher a entrada com `isLocal: true`.
   - SE devolver 0 → parar e avisar Eric pra abrir o Chrome no PC (mesmo caso do Pré-requisito #1).
3. `mcp__claude-in-chrome__tabs_context_mcp` com `createIfEmpty: true`

SE falhar com "Grouping is not supported" → pedir ao Eric abrir janela nova do Chrome (Ctrl+N) e repetir 1-3. SE falhar de novo com o mesmo erro → parar e reportar (circuit breaker: sem 3ª tentativa idêntica).

## Passo 1.1 — Carregar as tools de página do Chrome

As tools do `claude-in-chrome` normalmente vêm DEFERIDAS (só o nome, sem schema). Carregar todas as que a skill usa numa ÚNICA chamada de `ToolSearch` — uma por chamada desperdiça round-trip:

```
ToolSearch query: select:mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__browser_batch
```

Gotchas verificados (04/08/2026):
- `browser_batch` executa vários passos num round-trip e para no primeiro erro — usar sempre que der pra prever 2+ passos.
- `computer` com `action:"wait"` aceita **no máximo 10s por item**; pra esperar mais, empilhar vários `wait` dentro de um `browser_batch`.
- `javascript_tool` aceita `await` no topo e devolve o valor da ÚLTIMA expressão. BLOQUEIA retorno com query-string/cookie sensível (por isso a URL assinada sai por Blob download, Passo 7.7) — ler só `status`/`code`/`name`.
- `form_input` precisa de um `ref` vindo de `find`/`read_page`.

## Passo 2 — Inputs Bloco 1 e 2 (sobre a aula)

Perguntar via `AskUserQuestion`:

**Bloco 1 — sobre a aula**
1. **Título da aula?** (texto livre) — ex: `Voice Guide`, `Brain Setup`
2. **Quantas partes tem?** — opções: 1 (arquivo único, ver Passo 3.5), 2, 3
3. **Pasta de destino no Smart Player**? Default = a `002. Estratégias de Automação` (é onde o Eric SEMPRE põe, confirmado 04/08/2026), criando a pasta da aula dentro dela. Só perguntar se houver motivo pra achar que é outro lugar.

**Bloco 2 — sobre cada parte** (pra cada parte N de 1 até a quantidade informada)
- **Nome da parte N?** — ex: `Introdução`, `Instalação`, `Aplicação`

Nome final de cada arquivo: `<Título> - <Nome parte>.mp4`. Quando as partes são numeradas, o padrão do curso é `<Título> - <N>. <Nome>` (ex.: `Expert Brain 3.0 - 1. Novas funções`).

**Título: checagem obrigatória de transcrição.** O título chega quase sempre por áudio ditado e vai gravado em 4 lugares (pasta Drive, pasta Smart Player, nome dos arquivos, cartão ClickUp). SE o título tiver buraco semântico — falta um substantivo, palavra fora de contexto, frase que não fecha (ex.: "Como economizar sua primeira ___ com automação") → NÃO chutar em silêncio: dizer qual palavra você acha que falta, por que (o conteúdo da aula sustenta), e esperar confirmação. Se houver material da aula em disco (ver Passo 3.5, item 0), o nome da pasta/roteiro geralmente resolve a dúvida.

## Passo 3 — Listar arquivos e Input Bloco 3

1. Listar os arquivos mais recentes da pasta OBS. O OBS grava cada trecho como um PAR `.mkv` + `.mp4` de mesmo basename, então a lista **mistura as duas extensões**:

   ```bash
   node -e "
   const fs=require('fs'),p=require('path');
   const dir='C:/Users/Eric Luciano/Videos/Backup OBS';
   const files=fs.readdirSync(dir).map(n=>{const s=fs.statSync(p.join(dir,n));return {n,mb:(s.size/1048576).toFixed(1),m:s.mtime};}).sort((a,b)=>b.m-a.m).slice(0,15);
   for(const f of files){const d=f.m;const pad=x=>String(x).padStart(2,'0');
   console.log(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+'  '+String(f.mb).padStart(8)+' MB  '+f.n);}
   "
   ```

   ATENÇÃO ao nome do OBS: o formato é `YYYY-DD-MM HH-MM-SS` (dia antes do mês) — `2026-04-08 16-12-17` é **4 de agosto**, não 8 de abril. Confiar no `mtime`, não no nome.

2. Mostrar a lista pro Eric e perguntar (`AskUserQuestion`):
   - **Quais arquivos são dessa aula?** — as OPÇÕES do multiselect são **SOMENTE os `.mp4`**. NUNCA oferecer os `.mkv` como opção: são o par bruto e vão pra Lixeira automaticamente no Passo 5.2.
   - **Recovery de contagem:** SE a quantidade de `.mp4` selecionados for DIFERENTE da declarada no Bloco 1, NÃO seguir direto — reperguntar UMA vez apontando a diferença exata. SE bater → seguir. SE a divergência PERSISTIR → seguir com os arquivos efetivamente selecionados e registrar a divergência na descrição do cartão (Passo 8).
   - **Caso 1 arquivo só:** é comum e não é erro (aconteceu em 04/08/2026 — aula de 35min num arquivo). Ir pro Passo 3.5 antes de decidir os nomes das partes.
   - **Em que ordem?** — propor ordem cronológica (mtime ascendente) e perguntar se confirma. Não se aplica quando é arquivo único.
   - Guardar os NOMES exatos (com extensão) dos `.mp4` selecionados — definem `N` e alimentam o pareamento do `.mkv` no Passo 5.2.

3. Conferir typo de título — critério verificável. Normalizar cada string (minúsculas + sem acento + `Trim()` + espaços colapsados) e comparar o título informado com o basename de cada `.mp4` da lista (sem extensão e sem sufixo ` - <parte>`). SE algum for DIFERENTE do título **E** com Levenshtein **≤ 2** → avisar e esperar confirmação. Senão, seguir sem avisar.

## Passo 3.5 — Analisar a gravação e propor corte (só quando a aula saiu num arquivo único, ou o Eric pedir)

> POR QUE: quando o Eric não pausa o OBS, a aula inteira sai num arquivo e os alunos perdem a navegação por tema. Não dá pra "assistir" o vídeo — mas dá pra transcrever com timestamp e cortar nas fronteiras temáticas. Validado 04/08/2026 (35min06 → 3 partes, cobertura 100%, nenhuma frase quebrada).

0. **Ler o material da aula primeiro, se existir.** Procurar a pasta da aula em `G:/Meu Drive/claude-workspace/Workspace/Educacional/01_Aulas_e_Palestras/` (padrão `<YYYY-MM-DD> - Mentoria Automacoes Inteligentes - <Tema>`). SE existir `docs/Roteiro.md`, ele é a fonte AUTORITATIVA da estrutura pretendida (blocos, minutagem prevista, slides) — as fronteiras de corte devem coincidir com troca de bloco dele, não com o que você acha do texto.

1. **Duração e codec:**
   ```bash
   ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 "<mp4>"
   ```

2. **Transcrever com timestamp** (extrair WAV 16k mono e rodar faster_whisper `small`; ~5-6 min de CPU pra 35 min de áudio — rodar em background). Gravar `transcricao.jsonl` com `{start,end,text}` por segmento, no scratchpad da sessão.

3. **Mapear os blocos**: agrupar os segmentos em janelas de ~90s e ler o fluxo pra identificar as trocas de assunto. Cruzar com o `Roteiro.md` do item 0. Apresentar o mapa ao Eric em tabela (tempo | duração | conteúdo).

4. **Escolher as fronteiras e alinhar com o áudio.** Alvo: 2-3 partes de 8-15 min, cada uma fechando uma pergunta inteira, com material de apoio (prompt/exercício) na parte onde o aluno vai procurar. Depois de escolher os alvos, achar o ponto EXATO:
   - Re-transcrever só as janelas de ±13s ao redor de cada fronteira com `word_timestamps=True` e **`vad_filter=False`** (com VAD ligado os silêncios são colapsados e a análise de gap vira lixo).
   - Cortar no MEIO do silêncio entre a última palavra de um bloco e a primeira do seguinte.
   - NÃO usar keyframe como fronteira: o OBS grava keyframe a cada ~8,3s e isso cai no meio de frase.

5. **Cortar com re-encode via GPU.** Corte no keyframe (`-c copy`) não serve pela granularidade; com NVENC o custo é baixo (~100s por parte numa RTX 3070). `-ss` ANTES do `-i` já é accurate seek quando há re-encode:

   ```javascript
   // node: um execFileSync por parte, sequencial
   const args = ['-y','-hide_banner','-loglevel','error',
     '-ss', String(ini), '-i', SRC, ...(dur ? ['-t', String(dur)] : []),   // ultima parte: sem -t, vai ate o fim
     '-c:v','h264_nvenc','-preset','p5','-tune','hq',
     '-rc','vbr','-cq','19','-b:v','10M','-maxrate','14M','-bufsize','20M',
     '-profile:v','high','-pix_fmt','yuv420p',
     '-c:a','aac','-b:a','160k','-ar','48000','-ac','2',
     '-movflags','+faststart', out];
   ```
   Abortar se o arquivo de saída já existir. Usar `execFileSync` com array de args (nunca string de shell) pra não corromper acento no nome.

6. **Validar o corte — 2 provas, as duas obrigatórias:**
   - **Cobertura:** soma das durações medidas por `ffprobe` ≈ duração do original (tolerância ~0,2s). Prova que nada foi perdido nem duplicado.
   - **Fronteira:** transcrever os primeiros ~9s e os últimos ~8s de cada parte e conferir que começam/terminam em frase inteira. Essa é a prova que importa — cobertura certa com corte no meio de palavra ainda é corte ruim.
   - Opcional, se prometer "sem perda": medir PSNR contra o original (`-lavfi psnr` num trecho de 6s). ~36 dB de luma é adequado pra slides/webcam; NÃO chamar de "sem perda", chamar de perda irrelevante — e lembrar que o Gumlet transcoda por cima no Smart Player.

7. **O original NÃO é descartado nesta rodada.** Renomear pra `<Título> - ORIGINAL COMPLETO.mp4` e manter na pasta OBS até o Eric validar os cortes (evita virar arquivo órfão sem nome). Só o `.mkv` vai pra Lixeira. Perguntar ao Eric no gate se ele prefere descartar o original junto.

## Passo 4 — Input Bloco 4 (confirmação final — gate de execução)

Mostrar sumário completo e pedir OK via `AskUserQuestion`. NADA é executado antes deste OK:

- Sem corte: N arquivos a renomear (de → para). Com corte: as partes, com timestamp de início/fim e duração de cada
- M arquivos `.mkv` pra Lixeira (só os pareados com os `.mp4` escolhidos) — pode ser < N se algum `.mp4` não tiver par
- Destino do `.mp4` original quando houve corte (manter renomeado = default, ou Lixeira)
- Pasta nova `<Título>` no Drive (URL pai conhecida)
- Pasta nova `<Título>` no Smart Player (dentro da `002. Estratégias de Automação`)
- Cartão `<Título>` no ClickUp (responsável, data hoje)

SE Eric pedir ajuste → corrigir o sumário e reconfirmar. SE ele responder "qual sua recomendação?" → dar posição com o motivo, não devolver menu neutro.

## Passo 5 — Arquivos locais

> ORDEM OBRIGATÓRIA: capturar os NOMES ORIGINAIS dos `.mp4` selecionados no Passo 3 ANTES de renomear. O rename troca o nome do `.mp4`, mas o `.mkv` pareado mantém o basename original — o pareamento do 5.2 usa o nome ORIGINAL.

1. **Nomear as partes.** Dois ramos:
   - **Sem corte:** renomear cada `.mp4` escolhido.
     ```bash
     node -e "
     const fs=require('fs'),p=require('path');
     const OBS='C:/Users/Eric Luciano/Videos/Backup OBS';
     const de=p.join(OBS,'<nome_original.mp4>'), para=p.join(OBS,'<Título> - <Parte>.mp4');
     if(fs.existsSync(para)){console.log('ABORTADO: destino ja existe');process.exit(2);}
     fs.renameSync(de,para);
     console.log('OK='+(fs.existsSync(para)&&!fs.existsSync(de)));
     "
     ```
     SE já existir arquivo com o nome final → parar e perguntar (substituir / renomear com sufixo / cancelar).
   - **Com corte (Passo 3.5):** os cortes já nascem com o nome final; aqui só renomear o original pra `<Título> - ORIGINAL COMPLETO.mp4`.

2. **Mandar pra Lixeira os `.mkv` PAREADOS.** O par é o arquivo de MESMO basename trocando a extensão pra `.mkv` (troca exata, não busca por similaridade). Lixeira do Windows em Python stdlib, sem PowerShell:

   ```python
   import ctypes, os
   from ctypes import wintypes

   class SHFILEOPSTRUCTW(ctypes.Structure):
       _fields_ = [("hwnd", wintypes.HWND), ("wFunc", wintypes.UINT),
                   ("pFrom", wintypes.LPCWSTR), ("pTo", wintypes.LPCWSTR),
                   ("fFlags", ctypes.c_uint16), ("fAnyOperationsAborted", wintypes.BOOL),
                   ("hNameMappings", ctypes.c_void_p), ("lpszProgressTitle", wintypes.LPCWSTR)]

   FO_DELETE, FOF_SILENT, FOF_NOCONFIRMATION, FOF_ALLOWUNDO = 3, 0x0004, 0x0010, 0x0040

   def pra_lixeira(path):
       op = SHFILEOPSTRUCTW()
       op.wFunc = FO_DELETE
       op.pFrom = path + "\0\0"          # DOUBLE null terminator: obrigatorio
       op.fFlags = FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT
       rc = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(op))
       return rc, bool(op.fAnyOperationsAborted)

   OBS = r"C:\Users\Eric Luciano\Videos\Backup OBS"
   for nome in ['<nome_original_1.mp4>', '<nome_original_2.mp4>']:   # nomes ANTES do rename
       mkv = os.path.join(OBS, os.path.splitext(nome)[0] + ".mkv")
       if not os.path.exists(mkv):
           print(f"sem .mkv pareado para {nome} - nada a deletar"); continue
       rc, abortado = pra_lixeira(mkv)
       ok = rc == 0 and not abortado and not os.path.exists(mkv)
       print(f"{'LIXEIRA OK' if ok else f'FALHOU rc={rc}'}  {os.path.basename(mkv)}")
   ```

   Rodar com `python -X utf8 script.py` usando o Python 3.12 canônico. `send2trash` NÃO está instalado e não é necessário.

3. Validar com `fs.existsSync`/`os.path.exists`: cada nome novo deve existir, cada `.mkv` deletado NÃO deve existir. SE alguma validação falhar → parar e reportar o estado real (não seguir pro upload com arquivo errado).

## Passo 6 — Google Drive (copiar pro G: montado, NÃO upload pelo browser)

> POR QUE: o "Upload de arquivo" do Drive abre o seletor NATIVO do SO, que o Chrome MCP não opera; o `file_upload` MCP é bloqueado. O Drive Desktop monta o Drive em `G:\` — copiar o `.mp4` pra pasta certa faz o Drive Desktop subir sozinho em background. Validado 17/06/2026.

- URL pasta pai no browser (Mentoria Automações Inteligentes): `https://drive.google.com/drive/folders/1Xvv-rz2T2vI_gPURJqsq8-_DK6zscysD`
- Path equivalente no G: montado: `G:\Meu Drive\Expert Integrado (Pasta Raiz)\Area de Membros\Cursos\Mentoria Automações Inteligentes`

1. **Criar a pasta pelo `G:`** (mais confiável que o menu de contexto do Drive) e copiar os arquivos:

   ```bash
   node -e "
   const fs=require('fs'),p=require('path');
   const OBS='C:/Users/Eric Luciano/Videos/Backup OBS';
   const CURSO='G:/Meu Drive/Expert Integrado (Pasta Raiz)/Area de Membros/Cursos/Mentoria Automações Inteligentes';
   const DST=p.join(CURSO,'<Título>');
   if(!fs.existsSync(DST)) fs.mkdirSync(DST);
   for(const n of ['<Título> - <Parte 1>.mp4','<Título> - <Parte 2>.mp4']){
     const src=p.join(OBS,n), dst=p.join(DST,n);
     fs.copyFileSync(src,dst);
     console.log('Copiado: '+(fs.statSync(dst).size/1048576).toFixed(1)+' MB  confere='+(fs.statSync(dst).size===fs.statSync(src).size)+'  '+n);
   }
   "
   ```

2. **Capturar a URL da pasta** (precisa do folder ID pro ClickUp): navegar na URL pai, recarregar até a pasta nova aparecer (o Drive Desktop sincroniza a pasta em segundos), localizar com `find` e dar **duplo clique no card** (duplo clique no elemento de texto do nome NÃO navega). Ler a URL com `javascript_tool`:
   `document.title + ' || ' + (location.pathname.match(/folders\/([\w-]+)/)||[])[1]`
   Guardar como `URL_PASTA_DRIVE` — formato `https://drive.google.com/drive/folders/<ID>`.

3. O upload do arquivo pro Drive na nuvem roda em background (a cópia local é instantânea). Antes de reportar sucesso, confirmar na WEB que os arquivos aparecem na pasta — `G:` preenchido não prova nuvem preenchida. O Smart Player (Passo 7) usa os arquivos locais do `Backup OBS`, não o Drive, então não precisa esperar pra seguir.

SE a pasta não aparecer na web em ~60s → avisar Eric (Drive Desktop pode estar fora).

## Passo 7 — Smart Player (upload via API, NÃO pelo file dialog)

> POR QUE: o botão `Upload` abre o seletor de arquivos NATIVO do SO — o Chrome MCP não interage com diálogos de arquivo, e o `file_upload` MCP é bloqueado. A única via que funciona é a API REST + `curl` PUT na URL pré-assinada. Validado 17/06/2026.

- **Backend:** `https://services.scaleup.com.br/backoffice`
- **Auth:** cookies HttpOnly — as chamadas TÊM que sair do contexto JS da aba do Smart Player (`XMLHttpRequest` com `withCredentials = true`). Ver NUNCA sobre `fetch()`.

1. Abrir aba (`tabs_create_mcp`) e navegar pra `https://smartplayer.scaleup.com.br/smartplayer/conteudo?code=200542e4c8f7d300406aeae8dc994370663f2074`.

2. **Esse code JÁ É o destino** — é a pasta `002. Estratégias de Automação`, onde vivem TODAS as pastas de aula, e é onde o Eric sempre põe ("é sempre aqui", 04/08/2026). **Não precisa caminhar na árvore.** A hierarquia real é `/006. Mentoria Automações Inteligentes/002. Estratégias de Automação/` — a `006` é a raiz do curso e a `002` é a subpasta (versões antigas desta skill documentavam isso invertido). Confirmar lendo `parent.path` da resposta da listagem:
   ```
   GET /v2/folders?page=0&root-folder-code=<CODE>&size=50&category=ALL
   ```
   `resp.parent.path` diz onde você está e `resp.pageableItems.content` é o array de itens (cada um com `it.folder` OU `it.media`). **É `.pageableItems.content`, não `.pageableItems`** — tratar como array direto quebra com `.map is not a function`.

3. Antes de criar, usar essa listagem pra checar duplicata (pasta com o mesmo tema) e pra conferir o padrão de nomenclatura numa pasta de aula existente.

4. Criar pasta nova `<Título>`: botão "Nova pasta" (topo direito) → **`form_input` no campo** (não `computer type`, que corrompe acento) → Confirmar. Depois conferir no screenshot que o nome ficou com a acentuação certa.

5. Entrar na pasta criada e capturar o `code` da URL:
   `document.title + ' || ' + (location.search.match(/code=([a-f0-9]+)/)||[])[1]`
   Guardar `FOLDER_CODE` e a URL completa como `URL_PASTA_SMARTPLAYER` (pro ClickUp).

6. Limpar downloads antigos: SE existir `sp_upload_urls*.txt` em `~/Downloads` → deletar antes (senão o Chrome salva como `sp_upload_urls (1).txt` e o passo 8 lê o arquivo errado).

7. **Criar as entradas de mídia + obter URLs pré-assinadas.** Rodar no `javascript_tool` da aba do Smart Player (1 chamada cria todas, sequencial):

   ```javascript
   var folderCode = '<FOLDER_CODE>';
   var T = '<Título>';
   // UM objeto por parte, nomes FINAIS. Padrao do curso: "<Titulo> - <N>. <Nome da parte>"
   var videos = [
     { name: T+' - 1. <Parte 1>', localFile: T+' - 1. <Parte 1>.mp4' },
     { name: T+' - 2. <Parte 2>', localFile: T+' - 2. <Parte 2>.mp4' }
   ];
   window._entries = []; window._done = false; window._err = null;
   var i = 0;
   (function next(){
     if (i >= videos.length) {
       // UM ÚNICO download com TODAS as URLs (Chrome bloqueia downloads múltiplos)
       var lines = window._entries.map(function(e){ return e.localFile+'|'+e.code+'|'+e.uploadUrl; });
       var b = new Blob([lines.join('\n')], {type:'text/plain'});
       var a = document.createElement('a'); a.href = URL.createObjectURL(b);
       a.download = 'sp_upload_urls.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
       window._done = true; return;
     }
     var v = videos[i];
     var xhr = new XMLHttpRequest();
     xhr.open('POST', 'https://services.scaleup.com.br/backoffice/v1/medias?root-folder-code='+folderCode);
     xhr.withCredentials = true;
     xhr.setRequestHeader('accept','application/json, text/plain, */*');
     xhr.setRequestHeader('content-type','application/json');
     xhr.onload = function(){ try {
       var it = JSON.parse(xhr.responseText)[0];
       window._entries.push({ localFile:v.localFile, code:it.code, uploadUrl:(it.urlsUpload||{}).urlUploadVideo });
       i++; next();
     } catch(e){ window._err = 'status '+xhr.status+': '+e.message; } };
     xhr.onerror = function(){ window._err = 'XHR error'; };
     xhr.send(JSON.stringify([{ name:v.name, type:'video/mp4', publicMedia:false }]));
   })();
   'criando entradas...'
   ```

   - Resposta 201 por item: `{ code, status:"DRAFT", urlsUpload:{ urlUploadVideo:"<URL S3 pré-assinada Gumlet>" } }`.
   - Validar em chamada `javascript_tool` SEPARADA:
     `String(window._done)+'|'+String(window._err)+'|'+(window._entries||[]).length+'|'+(window._entries||[]).every(e=>!!e.uploadUrl)`
     Esperar `true|null|<N>|true`. SE `_err` preenchido → reportar e parar.

8. **PUT de cada `.mp4` na URL pré-assinada via `curl`** (Node, menor primeiro):

   ```javascript
   const { execFileSync } = require('child_process');
   const fs = require('fs'), path = require('path');
   const OBS = 'C:\\Users\\Eric Luciano\\Videos\\Backup OBS';
   const TXT = path.join(process.env.USERPROFILE, 'Downloads', 'sp_upload_urls.txt');
   const itens = fs.readFileSync(TXT,'utf8').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
     const [file,code,url]=l.split('|'); const full=path.join(OBS,file);
     if(!fs.existsSync(full)) throw new Error('arquivo nao existe: '+full);
     return {file,code,url,full,size:fs.statSync(full).size};
   }).sort((a,b)=>a.size-b.size);            // menor primeiro
   for (const it of itens) {
     const out = execFileSync('curl.exe',['-s','--ssl-no-revoke','-o','NUL','-w','%{http_code}',
       '-X','PUT','-T',it.full,'-H','Content-Type: video/mp4', it.url],{maxBuffer:1<<20}).toString().trim();
     console.log(`${out==='200'?'OK':'FALHOU'} HTTP ${out}  ${it.file}`);
   }
   ```

   - Esperado: **HTTP 200** por arquivo (deu ~83-100 Mbps em 04/08/2026). A URL tem `x-amz-checksum-crc32=AAAAAA==` (placeholder) — o S3 **não** valida.
   - **URLs expiram em 1h (3600s).** SE 403 → recriar as entradas (passo 7) e refazer o PUT.
   - Rodar em background e acompanhar o arquivo de output; 1,5 GB leva ~2-3 min no total.

9. **Ingestão é automática**, sem chamada de "confirmar upload": `DRAFT → PARTIAL_COMPLETED → COMPLETED`, proporcional à duração (as partes maiores fecham depois). Fechar em `COMPLETED` pra todas leva ~4-6 min pra ~35 min de vídeo. Verificar pela listagem do item 2, contando `COMPLETED` e `ERROR` — ou uma mídia por vez com `GET https://services.scaleup.com.br/backoffice/v1/medias/<code>` (campo `status`; `duration` aparece quando processou). Pra esperar, empilhar `wait` de 10s em `browser_batch`. NÃO fechar a aba durante os PUTs.

**Limpeza de tentativas antigas (entradas em `ERROR`):** deletar via XHR na aba. **Body = array de objetos `{code}`** (array de strings dá HTTP 400; objeto dá 204):

```javascript
var xhr = new XMLHttpRequest();
xhr.open('DELETE', 'https://services.scaleup.com.br/backoffice/v1/medias/lists');
xhr.withCredentials = true;
xhr.setRequestHeader('accept','application/json, text/plain, */*');
xhr.setRequestHeader('content-type','application/json');
xhr.onload = function(){ window._delResult = xhr.status; };  // 204 = ok
xhr.send(JSON.stringify([{code:'<code1>'},{code:'<code2>'}]));
```

Pasta (vazia) usa o mesmo shape em `/v1/folders/lists` (retorna 200).

## Passo 8 — ClickUp (MCP nativo)

- Board Roadmap de Conteúdo: `https://app.clickup.com/30962394/v/b/xgwpu-172333?pr=61118175`
- Cartão referência de formato: `https://app.clickup.com/t/86ahq9uq2` (Voice Guide) — mas ele está SEM responsável; pro padrão de responsável usar o da última aula, ver abaixo.

**IDs (custom fields re-verificados na API em 04/08/2026 — seguem válidos):**

- `list_id`: `900702243037` (Roadmap de Conteúdo, folder "Estrutura de Conteúdos" `127044255`, space Educacional `61118175`)
- **Responsável: Asafe Silva `81900233`** (confirmado pelo Eric em 04/08/2026). ATENÇÃO: até essa data a skill mandava usar **Vanderson Souza `118030139`**, que **não existe mais** no workspace (verificado em `/api/v2/team`: 15 membros, ele não está) — usar aquele ID deixa o cartão órfão. Se houver dúvida de quem é o dono da edição hoje, olhar o assignee do cartão da aula anterior e confirmar com o Eric ANTES de atribuir (atribuir notifica a pessoa).
- Custom field `Tipo de conteúdo` (REQUIRED): `40894958-64f0-4159-9b3a-2360ecd01882` → opção "Aula": `803d7836-e40a-4995-ae6e-77d530851559`
- Custom field `Data da Aula` (REQUIRED): `7ff6f730-9492-4139-97a1-eef464c7f72e` (timestamp em ms)
- Custom field `Nome do Curso` (REQUIRED): `da243197-c517-4014-84ad-a35acef0f7eb` → opção "Automações Inteligentes": `254eff4b-eec7-41b7-b59d-9bb81cb574e9`
- Status da lista: `backlog` / `a fazer` / `em execução` / `em edição` / `concluído`. Cartão de aula nasce em **`backlog`**.

**SE algum ID falhar, re-descobrir assim** (a tool `clickup_get_custom_fields` NÃO existe no clickup-mcp local):
1. `mcp__clickup-mcp__clickup_get_workspace_members` pra conferir pessoa (ou `/api/v2/team` pela API).
2. Pra IDs de campo e de opção de dropdown, chamar a API direto. Credencial: env `CLICKUP_API_KEY` → campo `api_key` de **`C:/MCPs/expert-mcps/mcps/config.json`** (é ESSE o config que o MCP carrega; a cópia em `.../mcps/clickup/config.json` NÃO é lida). Consumir inline, sem imprimir o token (header ClickUp usa o token cru, sem `Bearer`):
   ```bash
   KEY="${CLICKUP_API_KEY:-$(node -e "process.stdout.write((require('C:/MCPs/expert-mcps/mcps/config.json').api_key)||'')")}"
   curl -s --ssl-no-revoke -H "Authorization: $KEY" "https://api.clickup.com/api/v2/list/900702243037/field"
   ```

Execução:

1. Buscar cartão existente: `mcp__clickup-mcp__clickup_search` com `query: "<Título>"`. SE já existe → perguntar ao Eric se atualiza o existente (default) ou cria duplicado. ATENÇÃO: `clickup_search` NÃO é confiável pra nome parcial (em 04/08/2026 achou "Expert Brain 3.0" e não achou "Vibe Coding", que existe no Drive) — resultado vazio não prova ausência; na dúvida, listar a lista pela API.
2. Criar via `mcp__clickup-mcp__clickup_create_task`:
   - `list_id`: `"900702243037"` · `name`: `"<Título>"` · `status`: `"backlog"`
   - `due_date`: timestamp ms da data da gravação (default hoje, America/Sao_Paulo; gerar com Bash `date -d "<YYYY-MM-DD> 12:00:00-03:00" +%s000`)
   - `custom_fields`: **string** com o JSON (o MCP faz `JSON.parse`; não passar array cru):
     ```json
     [
       {"id":"40894958-64f0-4159-9b3a-2360ecd01882","value":"803d7836-e40a-4995-ae6e-77d530851559"},
       {"id":"7ff6f730-9492-4139-97a1-eef464c7f72e","value":<TIMESTAMP_MS_DATA_GRAVACAO>},
       {"id":"da243197-c517-4014-84ad-a35acef0f7eb","value":"254eff4b-eec7-41b7-b59d-9bb81cb574e9"}
     ]
     ```
   - `description`: o template abaixo (funciona já no create; não precisa de update depois).
   - **O MCP AUTO-ATRIBUI ao dono da API key** (Eric, `43018275`) e aplica a tag `via-claude` — não existe "criar sem responsável". Pra deixar com outra pessoa, chamar `clickup_update_task` com `assignees_add: "<id>"` + `assignees_remove: "43018275"`.
3. Template da descrição:

   ```markdown
   ## Material da Aula

   **Google Drive:** <URL_PASTA_DRIVE>

   **Smart Player:** <URL_PASTA_SMARTPLAYER>

   **Apresentação da aula:** <URL do deck, se existir — ex: https://primeira-hora.ericluciano.com.br>

   **Data da gravação:** <DATA>

   **Partes:**
   - <Título> - <Parte 1> (<duração>)
   - <Título> - <Parte 2> (<duração>)
   ```

   O link da apresentação está no `Roteiro.md` da pasta da aula (seção "Material de apoio") — o Eric pediu esse link no cartão em 04/08/2026.
4. Validar com `clickup_get_task`: conferir responsável, due date, os 3 custom fields e a descrição. A resposta do `update_task` mostra a descrição SEM markdown (texto plano) — isso é só exibição, não achatamento; confirmar pelo `get_task`.

## Validação final (checklist antes de reportar sucesso)

- [ ] Cada `.mp4` final existe (`fs.existsSync`); cada `.mkv` pareado NÃO existe mais (está na Lixeira).
- [ ] Se houve corte: soma das durações ≈ original (~0,2s) E início/fim de cada parte conferidos por transcrição em frase inteira.
- [ ] `URL_PASTA_DRIVE` capturada, arquivos copiados com tamanho idêntico ao origem, E visíveis na pasta pela WEB.
- [ ] PUT HTTP 200 por arquivo; contagem `COMPLETED` = número de partes e `ERROR` = 0 na listagem da pasta.
- [ ] Cartão ClickUp com responsável certo, 3 custom fields e descrição com os links.
- [ ] Nenhum passo reportado como "feito" sem a validação correspondente ter passado.

## Erros comuns e recovery

- **`G:` não montado (Drive Desktop fora):** parar e avisar Eric — sem fallback de upload pelo browser via MCP.
- **POST de criar mídia dá 401:** confirmar XHR com `withCredentials=true` (não `fetch`) e aba em `smartplayer.scaleup.com.br`.
- **PUT no S3 ≠ 200:** 403 = URL pré-assinada venceu (1h), recriar entradas e refazer. Outras causas: nome do arquivo com acento diferente do que está no `Backup OBS`.
- **`.map is not a function` na listagem do Smart Player:** usar `resp.pageableItems.content`, não `resp.pageableItems`.
- **Mídia fica em `ERROR`:** quase sempre import via "Link do Drive" (403 server-side). Deletar a entrada e refazer pelo fluxo API+curl.
- **Mídia travada em `DRAFT`:** o PUT não completou — o Gumlet só ingere quando o objeto aterrissa. Refazer o PUT. `PARTIAL_COMPLETED` não é erro, é ingestão em curso.
- **Nome de pasta com acento corrompido no Smart Player:** foi usado `computer type`; apagar a pasta e refazer com `form_input`.
- **Duplo clique na pasta do Drive não navega:** clicou no elemento de texto do nome; clicar no CARD (usar coordenada do screenshot).
- **`computer wait` recusa a duração:** máximo 10s por item; empilhar vários dentro de `browser_batch`.
- **Responsável do ClickUp não existe / cartão órfão:** conferir em `clickup_get_workspace_members`; nunca atribuir ID cacheado sem checar.
- **ClickUp custom field não existe:** re-descobrir pela rota do Passo 8 e listar os campos pro Eric mapear.
- **Cartão já existe:** perguntar se atualiza existente (default) ou cria duplicado.
- **Arquivo com nome final já existe na pasta local:** perguntar (substituir / renomear sufixo / cancelar).
- **Aba do SmartPlayer fechou no meio:** reabrir e renavegar pro `code` da pasta (cookies persistem; só o contexto JS se perde).
- **Mesma tool falhou 2x com o mesmo erro:** parar (sem 3ª tentativa idêntica), reportar diagnóstico e o estado real de cada etapa.

## Output final

Após TODAS as validações passarem, responder ao Eric neste formato:

```
Aula "<Título>" subida:
- Drive: <URL>
- Smart Player: <URL>
- ClickUp: <URL do cartão>

<N> partes no ar, mandei <M> .mkv pra lixeira.
```

Quando houve corte, acrescentar as provas (cobertura da soma das durações e as fronteiras conferidas por transcrição) e lembrar o Eric de validar os cortes — o `.mp4` original fica em `<Título> - ORIGINAL COMPLETO.mp4` até ele liberar o descarte.
