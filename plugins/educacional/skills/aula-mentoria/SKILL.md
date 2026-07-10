---
name: aula-mentoria
description: Processa aula gravada da Mentoria Automações Inteligentes do Eric. Renomeia 2-3 vídeos do OBS local (deleta .mkv, renomeia .mp4 pra "<Título> - <Parte>.mp4"), cria pasta no Google Drive E no Smart Player com nome do tema, faz upload dos vídeos em paralelo, e cria cartão no board "Roadmap de Conteúdo" do ClickUp com responsável Vanderson Souza + links das pastas criadas. TRIGGER quando Eric disser "subir aula da mentoria", "aula-mentoria", "acabei de gravar a mentoria", "processar gravação OBS da mentoria", "publicar aula nova", ou pedir pra rodar essa skill. NÃO disparar para criar curso/aula novo do zero (educacional:criar-aula), mentoria de equipe de segunda 16h (educacional:mentoria-equipe-seg-16h), edição/corte de vídeo, ou conteúdo que não seja da Mentoria Automações Inteligentes.
---

# Aula Mentoria — Skill operacional

Fluxo pós-mentoria do Eric: OBS local → Google Drive → Smart Player → ClickUp. Toda aula tem **2 a 3 vídeos** (partes). A skill roda SOMENTE no PC do Eric (arquivos locais do OBS + Chrome logado + Drive Desktop montado em `G:`); sem essas capacidades, parar e avisar — não há fallback headless. Browser SEMPRE via MCP `Claude_in_Chrome`; upload NUNCA por clique (Drive = cópia pro `G:`; Smart Player = API REST + `curl` PUT). Fluxo de upload validado em 17/06/2026.

## NUNCA

- NUNCA usar Playwright — lança Chromium sem login; Drive e Smart Player exigem a sessão ativa do Eric.
- NUNCA tentar upload por clique/diálogo de arquivo: o Chrome MCP não opera o seletor de arquivo nativo do SO e o `file_upload` MCP é bloqueado.
- NUNCA usar "Link do Drive" no Smart Player: Drive privado dá 403 no download server-side e a mídia fica em `ERROR`.
- NUNCA usar `fetch()` nos POST/PUT do Smart Player — `fetch` com `credentials:'include'` retorna **401 em POST** (testado). Só `XMLHttpRequest` com `withCredentials = true`, rodando na aba de `smartplayer.scaleup.com.br`.
- NUNCA mexer em `.mkv` de outros dias/sessões — só os PAREADOS (mesmo basename) com os `.mp4` escolhidos.
- NUNCA deletar permanentemente: `.mkv` vai pra LIXEIRA (`SendToRecycleBin`).
- NUNCA fechar a aba do Smart Player enquanto os PUTs rodam.
- NUNCA executar ação irreversível (deletar `.mkv`, criar cartão, sobrescrever arquivo) antes do OK do Bloco 4 via `AskUserQuestion`.
- NUNCA mandar o body do `DELETE /v1/medias/lists` como array de strings (dá HTTP 400) — é array de objetos `{code}`.
- NUNCA emoji. Acentuação correta em TODO texto externo (nomes de arquivo, pastas, cartão ClickUp, mensagem final).

## SEMPRE

- SEMPRE capturar e guardar as URLs criadas (pasta Drive, pasta Smart Player) ANTES de avançar pra etapa do ClickUp.
- SEMPRE rodar os PUTs logo após criar as entradas de mídia — as URLs pré-assinadas expiram em **1h (3600s)**.
- SEMPRE subir o arquivo MENOR primeiro (valida o fluxo rápido).
- SEMPRE validar renomeação com `Test-Path` depois de renomear.
- SEMPRE perguntar N nomes para N partes (2 partes = 2 nomes; 3 = 3 nomes). Sem default genérico.
- SEMPRE UTF-8 nos comandos PowerShell: gravar o snippet num `.ps1` UTF-8 **com BOM** e rodar com `-File` (padrão abaixo). Acento inline via `-Command` corrompe.

## Pré-requisitos (checar ANTES de começar)

| # | Checagem | Como verificar | Se falhar |
|---|----------|----------------|-----------|
| 1 | MCP `Claude_in_Chrome` conectado | tool `mcp__Claude_in_Chrome__list_connected_browsers` existe e responde | Parar. Avisar Eric: "skill exige o Chrome logado; abrir o Chrome no PC" |
| 2 | MCP `clickup-mcp` conectado | tool `mcp__clickup-mcp__clickup_search` existe | Parar e avisar (Etapa ClickUp não tem fallback browser confiável) |
| 3 | Pasta OBS existe | Bash: `[ -d "${OBS_BACKUP_DIR:-/c/Users/Eric Luciano/Videos/Backup OBS}" ]` | Parar e perguntar ao Eric onde estão as gravações |
| 4 | `G:` montado (Drive Desktop) | Bash: `[ -d "/g/Meu Drive" ]` | Parar e avisar — Drive Desktop fora do ar, sem fallback de upload por browser via MCP |

Pasta OBS canônica (default do PC, sobrescrevível por env): `OBS_BACKUP_DIR` → `C:\Users\Eric Luciano\Videos\Backup OBS` (= `$env:USERPROFILE\Videos\Backup OBS`).

**Padrão pra rodar os snippets PowerShell desta skill via tool Bash** (obrigatório — preserva acentos):

```bash
WORK=$(mktemp -d)
printf '\xEF\xBB\xBF' > "$WORK/passo.ps1"   # BOM: PowerShell 5.1 sem BOM corrompe acentos
cat >> "$WORK/passo.ps1" <<'EOF'
<snippet PowerShell aqui>
EOF
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$WORK/passo.ps1"
```

O BOM protege o INPUT; todo snippet cujo OUTPUT volta pro agente (listagens, echoes com acento) deve começar com `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` — sem isso a saída chega corrompida e um nome copiado dela quebra os passos seguintes.

## Passo 1 — Conectar ao Chrome

1. `mcp__Claude_in_Chrome__list_connected_browsers` — retorna a LISTA de browsers conectados. Cada entrada traz um `deviceId` e metadados de origem (normalmente um flag de máquina local, ex.: `isLocal: true`, e/ou o SO).
2. `mcp__Claude_in_Chrome__select_browser` passando o `deviceId` do Chrome LOCAL. Como escolher, sem chutar nome de campo:
   - Caso NORMAL no PC do Eric: `list_connected_browsers` devolve **exatamente 1** browser (o Chrome local) → usar o `deviceId` dessa única entrada.
   - SE devolver mais de 1 → ler o objeto retornado e escolher a entrada marcada como LOCAL (a que roda na própria máquina — flag tipo `isLocal: true` — e não um browser remoto/cloud); usar o `deviceId` dela.
   - SE devolver 0 → parar e avisar Eric pra abrir o Chrome no PC (mesmo caso do Pré-requisito #1).
3. `mcp__Claude_in_Chrome__tabs_context_mcp` com `createIfEmpty: true`

SE falhar com "Grouping is not supported" → pedir ao Eric abrir janela nova do Chrome (Ctrl+N) e repetir 1-3. SE falhar de novo com o mesmo erro → parar e reportar (circuit breaker: sem 3ª tentativa idêntica).

## Passo 1.1 — Resolver os nomes reais das tools de página do Chrome (capability detection)

Os Passos 6 e 7 usam três capacidades do `Claude_in_Chrome` cujo NOME EXATO de tool NÃO está fixado nesta skill (varia por versão do MCP): (a) rodar JavaScript na aba, (b) clicar / abrir menu de contexto num elemento, (c) ler a URL da aba ativa. NUNCA chutar nem inventar o nome dessas tools. Antes de usá-las, resolver o nome real NESTA sessão via `ToolSearch` e usar EXATAMENTE o nome que voltar:

- Rodar JS na aba → `ToolSearch` query `javascript chrome` (fallback `evaluate javascript tab`).
- Clicar / menu de contexto → `ToolSearch` query `click` (e `context menu` / `right click` pra "Nova pasta").
- Ler a URL da aba → `ToolSearch` query `url tab` (fallback `read page url`).

SE a query não retornar uma tool equivalente → parar e reportar; NÃO substituir por nome inventado nem por clique cego.

**Contrato esperado de cada tool** (comportamento descrito no fluxo validado 17/06 — CONFIRMAR os nomes de parâmetro no schema que o `ToolSearch` devolver; não assumir assinatura não verificada):

- **Rodar JS na aba** (referida como `javascript_tool` nos blocos dos Passos 7.7 e 7.9): recebe um trecho/expressão JS e o executa no contexto da aba SELECIONADA no Passo 1 (browser via `select_browser` pelo `deviceId` + aba via `tabs_context_mcp`/`tabs_create_mcp`); o valor retornado é o da ÚLTIMA expressão do trecho — por isso os snippets terminam num literal (ex.: `'criando entradas...'`). Ler `window._done`/`window._err` é uma SEGUNDA chamada da MESMA tool rodando SÓ a expressão de leitura (ex.: `String(window._done)+'|'+String(window._err)`), nunca uma tool diferente. Essa tool BLOQUEIA retorno que contenha query-string/cookie sensível (por isso a URL assinada sai por Blob download, não pelo valor de retorno — Passo 7.7).
- **Clicar / menu de contexto** (Passo 6.1 "clique direito → Nova pasta"; Passos 7.3/7.4 caminhar na árvore e "Nova pasta"): aciona clique ou menu de contexto num elemento da aba ativa (a mesma aba selecionada no Passo 1).
- **Ler a URL da aba** (Passo 6.1 URL da pasta do Drive; Passo 7.5 `code` do Smart Player): devolve a URL corrente da aba ativa, da qual se extrai `folders/<ID>` (Drive) e `?code=<FOLDER_CODE>` (Smart Player).

## Passo 2 — Inputs Bloco 1 e 2 (sobre a aula)

Perguntar via `AskUserQuestion`:

**Bloco 1 — sobre a aula**
1. **Título da aula?** (texto livre) — ex: `Voice Guide`, `Brain Setup`
2. **Quantas partes tem?** — opções: 2, 3 *(default 2)*
3. **Pasta de destino no Smart Player** dentro de `006. Mentoria Automações Inteligentes`? — ex: `WhatsApp Agent`; responder "raiz" cria a pasta da aula direto na `006`. Sem default: perguntar sempre.

**Bloco 2 — sobre cada parte** (pra cada parte N de 1 até a quantidade informada)
- **Nome da parte N?** — ex: `Introdução`, `Instalação`, `Aplicação`

Nome final de cada arquivo: `<Título> - <Nome parte>.mp4`. Exemplo:
- `Voice Guide - Introdução.mp4`
- `Voice Guide - Instalação.mp4`

## Passo 3 — Listar arquivos e Input Bloco 3

1. Listar os arquivos mais recentes da pasta OBS (snippet PowerShell, rodar pelo padrão do pré-requisito). O OBS grava cada trecho como um PAR `.mkv` + `.mp4` de mesmo basename, então a lista **mistura as duas extensões** — a coluna `Name` mostra a extensão de cada um:

   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8   # sem isso o OUTPUT volta com acento corrompido — e os nomes capturados aqui alimentam o Rename do Passo 5
   Get-ChildItem 'C:\Users\Eric Luciano\Videos\Backup OBS' |
     Sort-Object LastWriteTime -Descending |
     Select-Object -First 15 Name,
       @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,1)}},
       @{Name='Modificado';Expression={$_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')}}
   ```

2. Mostrar a lista pro Eric e perguntar (`AskUserQuestion`):
   - **Quais arquivos são dessa aula?** — as OPÇÕES do multiselect são **SOMENTE os `.mp4`** da lista (basename terminando em `.mp4`). NUNCA oferecer os `.mkv` como opção: são apenas o par bruto e serão derivados e mandados pra lixeira automaticamente no Passo 5.2. O Eric seleciona 1 `.mp4` por parte (2 ou 3, conforme o Bloco 1).
   - **Recovery de contagem:** SE a quantidade de `.mp4` selecionados for DIFERENTE da quantidade de partes declarada no Bloco 1 (2 ou 3), NÃO seguir direto — reperguntar UMA vez via `AskUserQuestion` apontando a diferença exata ("você selecionou X arquivos, mas o Bloco 1 declarou N partes; ajuste a seleção ou confirme"). SE na repergunta as contagens baterem → seguir normal. SE a divergência PERSISTIR → seguir com os arquivos efetivamente selecionados e registrar a divergência na descrição do cartão do ClickUp (Passo 8), deixando explícito "X arquivos selecionados vs N partes declaradas".
   - **Em que ordem?** — propor ordem cronológica (LastWriteTime ascendente) e perguntar se confirma ou ajusta.
   - Guardar os NOMES exatos (com extensão) dos `.mp4` selecionados — são a origem de `$nomesOriginais` no Passo 5.2 e definem `N` (= quantidade de `.mp4` selecionados) usado nos Passos 4 e 5.

3. Conferir typo de título — critério verificável (não é julgamento visual). Normalizar cada string assim: minúsculas + remover acentos + `Trim()` + colapsar espaços internos. Comparar o **título informado** (normalizado) com o basename normalizado de cada arquivo `.mp4` da lista (sem a extensão e sem eventual sufixo ` - <parte>`). SE existir um cujo basename normalizado seja DIFERENTE do título normalizado **E** com distância de edição de Levenshtein **≤ 2** (ex.: título `Voice Guide` vs arquivo `Voice Guida` = distância 1) → avisar Eric ("achei arquivo com nome parecido `<nome>`; confere se o título está grafado certo") e esperar confirmação/ajuste antes de seguir. SE não houver nenhum com distância ≤ 2 → seguir sem avisar.

## Passo 4 — Input Bloco 4 (confirmação final — gate de execução)

Mostrar sumário completo e pedir OK via `AskUserQuestion`. NADA é executado antes deste OK:

- N arquivos a renomear (de → para) — `N` = quantidade de `.mp4` selecionados no Passo 3
- M arquivos `.mkv` a mandar pra lixeira (só os pareados com os `.mp4` escolhidos) — `M` = quantos desses `.mp4` têm um `.mkv` de mesmo basename existente na pasta OBS (contar com `Test-Path`, ver Passo 5.2); pode ser < N se algum `.mp4` não tiver par
- Pasta nova `<Título>` no Drive (URL pai conhecida)
- Pasta nova `<Título>` no Smart Player (caminho árvore)
- Cartão `<Título>` no ClickUp (assignee Vanderson Souza, data hoje)

SE Eric pedir ajuste → corrigir o sumário e reconfirmar.

## Passo 5 — Arquivos locais

> ORDEM OBRIGATÓRIA: capturar os NOMES ORIGINAIS dos `.mp4` selecionados no Passo 3 numa variável ANTES de renomear no 5.1 (`$nomesOriginais` do 5.2 usa esses nomes). O rename do 5.1 troca o nome do `.mp4`, mas o `.mkv` pareado mantém o basename original — por isso o pareamento do 5.2 tem que usar o nome original, não o nome final.

1. Renomear cada `.mp4` escolhido (snippet PowerShell, um `Rename-Item` por arquivo). `<nome_original.mp4>` = o nome exato (coluna `Name`) de cada `.mp4` selecionado no Passo 3:

   ```powershell
   Rename-Item (Join-Path "$env:USERPROFILE\Videos\Backup OBS" '<nome_original.mp4>') '<Título> - <Nome parte>.mp4'
   ```

   SE já existir arquivo com o nome final → parar e perguntar (substituir / renomear com sufixo / cancelar).

2. Mandar pra lixeira os `.mkv` PAREADOS — o par de um `.mp4` é o arquivo de MESMO basename e MESMA pasta, só trocando a extensão pra `.mkv`. `$mkv` (o `$path` passado ao `DeleteFile`) é computado a partir de cada nome original de `.mp4` via `ChangeExtension`; não há busca por similaridade, é troca exata de extensão:

   ```powershell
   Add-Type -AssemblyName Microsoft.VisualBasic
   $obs = "$env:USERPROFILE\Videos\Backup OBS"
   # $nomesOriginais = nomes dos .mp4 escolhidos no Passo 3 (ANTES do rename do 5.1),
   # exatamente como na coluna Name (ex.: '2026-07-05 14-30-00.mp4').
   $nomesOriginais = @('<nome_original_1.mp4>','<nome_original_2.mp4>')
   foreach ($nome in $nomesOriginais) {
     $mkv = Join-Path $obs ([System.IO.Path]::ChangeExtension($nome, '.mkv'))
     if (Test-Path -LiteralPath $mkv) {
       [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($mkv, 'OnlyErrorDialogs', 'SendToRecycleBin')
       Write-Output "Lixeira: $mkv"
     } else {
       Write-Output "Sem .mkv pareado para $nome — nada a deletar"
     }
   }
   ```

3. Validar: `Test-Path` em cada nome novo (`<Título> - <Parte>.mp4`) deve retornar `True`; `Test-Path` em cada `.mkv` que existia e foi deletado deve retornar `False`. SE alguma validação falhar → parar e reportar o estado real (não seguir pro upload com arquivo errado).

## Passo 6 — Google Drive (copiar pro G: montado, NÃO upload pelo browser)

> POR QUE: o "Upload de arquivo" do Drive abre o seletor NATIVO do SO, que o Chrome MCP não opera; o `file_upload` MCP é bloqueado. O Google Drive Desktop monta o Drive em `G:\` — copiar o `.mp4` pra pasta certa faz o Drive Desktop subir sozinho em background. Validado 17/06/2026.

- URL pasta pai no browser (Mentoria Automações Inteligentes): `https://drive.google.com/drive/folders/1Xvv-rz2T2vI_gPURJqsq8-_DK6zscysD`
- Path equivalente no G: montado: `G:\Meu Drive\Expert Integrado (Pasta Raiz)\Area de Membros\Cursos\Mentoria Automações Inteligentes`

1. **Browser:** navegar pra URL pai, criar pasta `<Título>` (clique direito → Nova pasta), entrar nela e **capturar a URL** (`https://drive.google.com/drive/folders/<ID>`). Guardar como `URL_PASTA_DRIVE`. A criação de pasta pela UI funciona normal.
2. **PowerShell:** esperar a pasta sincronizar pro `G:` e copiar os `.mp4` renomeados:

   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $dst = "G:\Meu Drive\Expert Integrado (Pasta Raiz)\Area de Membros\Cursos\Mentoria Automações Inteligentes\<Título>"
   $tentativas = 0
   while (-not (Test-Path $dst) -and $tentativas -lt 30) { Start-Sleep 2; $tentativas++ }
   if (-not (Test-Path $dst)) { throw "Pasta '<Título>' nao sincronizou pro G: — verificar Drive Desktop" }
   $src = "$env:USERPROFILE\Videos\Backup OBS"
   # UMA entrada por parte, com o nome FINAL (pós-rename do Passo 5.1). 2 partes = 2 entradas.
   # 3 partes = acrescentar a 3a linha: ,'<Título> - <Parte 3>.mp4'
   foreach ($nome in @('<Título> - <Parte 1>.mp4','<Título> - <Parte 2>.mp4')) {
     Copy-Item (Join-Path $src $nome) (Join-Path $dst $nome) -Force
     Write-Output "Copiado: $nome"
   }
   ```

   Exemplo do array para **3 partes**: `@('<Título> - <Parte 1>.mp4','<Título> - <Parte 2>.mp4','<Título> - <Parte 3>.mp4')`.

3. O Drive Desktop sobe em background. NÃO esperar terminar — a URL já foi capturada e o Smart Player (Passo 7) usa os arquivos locais do `Backup OBS`, não o Drive.

SE o snippet der `throw` (pasta não sincronizou em ~60s) → parar e avisar Eric (Drive Desktop fora do ar; sem fallback).

## Passo 7 — Smart Player (upload via API, NÃO pelo file dialog)

> POR QUE: o botão `Upload` abre o seletor de arquivos NATIVO do SO — o Chrome MCP não interage com diálogos de arquivo, e o `file_upload` MCP é bloqueado ("only files the user has shared with this session"). A única via que funciona é a API REST + `curl` PUT na URL pré-assinada. Validado 17/06/2026.

- **Backend:** `https://services.scaleup.com.br/backoffice`
- **Auth:** cookies HttpOnly — as chamadas TÊM que sair do contexto JS da aba do Smart Player (via `XMLHttpRequest` com `withCredentials = true`). Ver NUNCA sobre `fetch()`.

1. `mcp__Claude_in_Chrome__tabs_create_mcp` pra abrir nova aba (ou reusar a do Smart Player).
2. Navegar pra `https://smartplayer.scaleup.com.br/smartplayer/conteudo?code=200542e4c8f7d300406aeae8dc994370663f2074` (base "002. Estratégias de Automação").
3. Caminhar pela árvore clicando pasta a pasta (não tem link direto): `002 Estratégias de Automação` → `006. Mentoria Automações Inteligentes` → pasta de destino informada no Bloco 1 (ex: `WhatsApp Agent`; "raiz" = ficar na `006`).
   - SE não achar `006. Mentoria Automações Inteligentes` → parar e perguntar o caminho atual.
   - SE achou a `006` mas a subpasta de destino do Bloco 1 (ex: `WhatsApp Agent`) NÃO existe dentro dela → **NÃO criar a subpasta automaticamente** (não foi confirmada no gate do Bloco 4). Parar e perguntar ao Eric via `AskUserQuestion`, com estas 3 opções: (a) criar a subpasta `<nome>` na `006` e seguir dentro dela; (b) escolher outra subpasta já existente (listar as que existem na `006`); (c) usar a raiz da `006`. Só depois da escolha, seguir pro passo 4. (Destino "raiz" nunca cai aqui — a `006` sempre existe se o passo anterior passou.)
4. Criar pasta nova `<Título>` (botão "Nova pasta" → digitar nome → Confirmar). É um POST que funciona normal via UI.
5. Entrar na pasta criada e **capturar o `code` da URL** (`/conteudo?code=<FOLDER_CODE>`). Guardar `FOLDER_CODE` e a URL completa como `URL_PASTA_SMARTPLAYER` (pro ClickUp).
6. Limpar downloads antigos: SE existir `sp_upload_urls*.txt` em `$env:USERPROFILE\Downloads` → deletar antes (senão o Chrome salva como `sp_upload_urls (1).txt` e o passo 8 lê o arquivo errado).
7. **Criar as entradas de mídia + obter URLs pré-assinadas.** Rodar no `javascript_tool` da aba do Smart Player (1 chamada cria todas, sequencial):

   ```javascript
   var folderCode = '<FOLDER_CODE>';
   // UM objeto por parte, com os nomes FINAIS (pós-rename do Passo 5.1). 2 partes = 2 objetos.
   // 3 partes = acrescentar um 3o objeto: { name: '<Título> - <Parte 3>', localFile: '<Título> - <Parte 3>.mp4' }
   var videos = [
     { name: '<Título> - <Parte 1>', localFile: '<Título> - <Parte 1>.mp4' },
     { name: '<Título> - <Parte 2>', localFile: '<Título> - <Parte 2>.mp4' }
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
     } catch(e){ window._err = e.message; } };
     xhr.onerror = function(){ window._err = 'XHR error'; };
     xhr.send(JSON.stringify([{ name:v.name, type:'video/mp4', publicMedia:false }]));
   })();
   'criando entradas...';
   ```

   - Resposta 201 por item: `{ code, status:"DRAFT", urlsUpload:{ urlUploadVideo:"<URL S3 pré-assinada Gumlet>" } }`.
   - O `javascript_tool` **BLOQUEIA** ler a URL assinada no retorno (trata como query-string sensível) — por isso o Blob download.
   - Validar em chamada `javascript_tool` SEPARADA: `String(window._done)+'|'+String(window._err)` — esperar `true|null` (poll a cada ~5s, até 60s). SE `_err` preenchido → reportar e parar. Confirmar que `sp_upload_urls.txt` apareceu em `$env:USERPROFILE\Downloads`.

8. **PUT de cada `.mp4` na URL pré-assinada via `curl`.** Lê `~/Downloads/sp_upload_urls.txt` (formato `arquivo|code|url` por linha), mapeia pro mp4 em `Backup OBS` e sobe — menor primeiro:

   ```powershell
   $urls = Get-Content "$env:USERPROFILE\Downloads\sp_upload_urls.txt" -Encoding UTF8 | Where-Object { $_.Trim() }
   $src  = "$env:USERPROFILE\Videos\Backup OBS"
   foreach ($l in ($urls | Sort-Object { (Get-Item (Join-Path $src ($_ -split '\|',3)[0])).Length })) {
     $p = $l -split '\|', 3; $file = Join-Path $src $p[0]
     $code = & curl.exe -s --ssl-no-revoke -o NUL -w "%{http_code}" -X PUT -T $file -H "Content-Type: video/mp4" $p[2]
     Write-Output "$($p[0]) -> HTTP $code"
   }
   ```

   - Esperado: **HTTP 200** por arquivo. A URL tem `x-amz-checksum-crc32=AAAAAA==` (placeholder) — o S3 **não** valida, PUT simples funciona.
   - **URLs expiram em 1h (3600s).** SE expirar (403) → recriar as entradas (passo 7) e refazer o PUT.

9. **Ingestão é automática.** Quando o objeto aterrissa no S3, o Gumlet ingere sozinho: `DRAFT → PARTIAL_COMPLETED → COMPLETED`. NÃO há chamada de "confirmar upload". Verificar via XHR na aba: `GET https://services.scaleup.com.br/backoffice/v1/medias/<code>` → campo `status` (e `duration` aparece quando processou). NÃO fechar a aba durante os PUTs.

**Limpeza de tentativas antigas (entradas em `ERROR`):** se rodada anterior deixou mídias com status `ERROR` (ex: import via "Link do Drive" — ver NUNCA), deletar via XHR na aba do Smart Player. **Body = array de objetos `{code}`** (array de strings dá HTTP 400; objeto dá 204):

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

**Listar a pasta pra inventário/conferência** (estrutura aninhada): `GET /v2/folders?page=0&root-folder-code=<FOLDER_CODE>&size=50&category=ALL` → `resp.pageableItems` é array; cada item tem `it.media` (mídia) OU `it.folder` (subpasta), com `.name`, `.status`, `.code`, `.duration`.

**Listar/checar via `javascript_tool`:** o retorno é BLOQUEADO se contiver query-string/cookie sensível (URLs assinadas etc.). Ler só campos não-sensíveis (status, code, name) e guardar em `window._var` pra ler em chamada separada.

## Passo 8 — ClickUp (MCP nativo)

- Board Roadmap de Conteúdo: `https://app.clickup.com/30962394/v/b/xgwpu-172333?pr=61118175`
- Cartão referência (formato): `https://app.clickup.com/t/86ahq9uq2`

**IDs cacheados (discovery de 26/05/2026):**

- `list_id`: `900702243037` (Roadmap de Conteúdo, dentro do folder "Estrutura de Conteúdos" `127044255`, space Educacional `61118175`)
- Assignee padrão **Vanderson Souza** (com V, não W como Eric às vezes fala): `118030139`
- Custom field `Tipo de conteúdo` (REQUIRED): `40894958-64f0-4159-9b3a-2360ecd01882`
  - Opção "Aula": `803d7836-e40a-4995-ae6e-77d530851559`
- Custom field `Data da Aula` (REQUIRED): `7ff6f730-9492-4139-97a1-eef464c7f72e` (timestamp em ms)
- Custom field `Nome do Curso` (REQUIRED): `da243197-c517-4014-84ad-a35acef0f7eb`
  - Opção "Automações Inteligentes": `254eff4b-eec7-41b7-b59d-9bb81cb574e9`

**SE algum desses IDs falhar (estrutura ClickUp mudou), re-descobrir assim.** CORREÇÃO-DE-FATO: o original mandava usar `clickup_get_custom_fields`, tool que NÃO existe no clickup-mcp local (verificado no fonte `C:/MCPs/expert-mcps/mcps/clickup/tools/`). Rota real:
1. `mcp__clickup-mcp__clickup_get_task` com `task_id: "86ahq9uq2"` (mostra nomes/valores dos custom fields preenchidos no cartão referência);
2. Pra obter IDs de campo e das opções de dropdown, chamar a API ClickUp direto (mesma credencial do MCP). A credencial resolve na ordem: env var `CLICKUP_API_KEY` → campo `api_key` do arquivo **`C:/MCPs/expert-mcps/mcps/config.json`** (é ESSE o config que o clickup-mcp carrega — `config.js` resolve `join(__dirname,"..","config.json")`; a cópia dentro de `.../mcps/clickup/config.json` NÃO é a lida). Consumir a chave inline, sem nunca imprimir/colar o token literal (o header ClickUp usa o token cru, sem `Bearer`):
   ```bash
   KEY="${CLICKUP_API_KEY:-$(node -e "process.stdout.write((require('C:/MCPs/expert-mcps/mcps/config.json').api_key)||'')")}"
   curl -s --ssl-no-revoke -H "Authorization: $KEY" \
     "https://api.clickup.com/api/v2/list/900702243037/field"
   ```

Execução:

1. Buscar cartão existente: `mcp__clickup-mcp__clickup_search` com `query: "<Título>"`. SE já existe → perguntar ao Eric se atualiza o existente (default) ou cria duplicado.
2. SE NÃO existe, criar via `mcp__clickup-mcp__clickup_create_task` com estes parâmetros (tipos verificados no fonte do MCP):
   - `list_id`: `"900702243037"`
   - `name`: `"<Título>"`
   - `assignees`: `"118030139"` (string; CSV de user IDs)
   - `due_date`: timestamp ms da data da gravação (default: hoje, fuso America/Sao_Paulo; gerar com Bash `date -d "<YYYY-MM-DD> 12:00:00-03:00" +%s000`)
   - `custom_fields`: **string** contendo o JSON abaixo (o MCP faz `JSON.parse`; não passar array cru):
     ```json
     [
       {"id":"40894958-64f0-4159-9b3a-2360ecd01882","value":"803d7836-e40a-4995-ae6e-77d530851559"},
       {"id":"7ff6f730-9492-4139-97a1-eef464c7f72e","value":<TIMESTAMP_MS_DATA_GRAVACAO>},
       {"id":"da243197-c517-4014-84ad-a35acef0f7eb","value":"254eff4b-eec7-41b7-b59d-9bb81cb574e9"}
     ]
     ```
3. Preencher a descrição do cartão via `mcp__clickup-mcp__clickup_update_task` — o parâmetro chama-se `description` (o MCP converte pra `markdown_description` do ClickUp; passar `markdown_description` direto é ignorado). Template literal:

   ```markdown
   ## Material da Aula

   **Google Drive:** <URL_PASTA_DRIVE>

   **Smart Player:** <URL_PASTA_SMARTPLAYER>

   **Data da gravação:** <DATA>

   **Partes:**
   - <Título> - <Parte 1>
   - <Título> - <Parte 2>
   ```

4. Validar: a resposta do MCP traz o cartão formatado — conferir assignee, due date e os 3 custom fields preenchidos. Guardar a URL do cartão pro output final.

## Validação final (checklist antes de reportar sucesso)

- [ ] `Test-Path` = `True` pra cada `.mp4` renomeado; `.mkv` pareados fora da pasta (na lixeira).
- [ ] `URL_PASTA_DRIVE` capturada e os `.mp4` copiados pro `G:` (output "Copiado:" por arquivo).
- [ ] PUT HTTP 200 por arquivo no Smart Player; `GET /v1/medias/<code>` mostra status ≠ `DRAFT` (ou em progressão) pra cada mídia.
- [ ] Cartão ClickUp criado/atualizado com assignee Vanderson Souza, 3 custom fields e descrição com os 2 links.
- [ ] Nenhum passo reportado como "feito" sem a validação correspondente ter passado.

## Erros comuns e recovery

- **`G:` não montado (Drive Desktop fora):** parar e avisar Eric — sem fallback de upload pelo browser via MCP.
- **POST de criar mídia dá 401:** confirmar que está usando **XHR com `withCredentials=true`** (não `fetch`) e que a aba está em `smartplayer.scaleup.com.br` (cookies HttpOnly só anexam no mesmo domínio).
- **PUT no S3 ≠ 200:** se 403/expirado, a URL pré-assinada venceu (1h) — recriar as entradas (Passo 7.7) e refazer o PUT. Outras causas: arquivo não encontrado no `Backup OBS` (conferir nome exato com acento).
- **Mídia fica em `ERROR` no Smart Player:** quase sempre é import via "Link do Drive" (Drive privado dá 403 server-side). NUNCA usar Link do Drive — sempre o fluxo API+curl. Deletar a entrada `ERROR` e refazer.
- **Mídia travada em `DRAFT` (não vira PARTIAL_COMPLETED):** o PUT no S3 não completou — o Gumlet só ingere quando o objeto aterrissa. Refazer o PUT.
- **SmartPlayer árvore mudou:** se não achar `006. Mentoria Automações Inteligentes`, parar e perguntar caminho atual.
- **ClickUp custom field não existe:** re-descobrir pela rota do Passo 8 e listar os campos disponíveis pro Eric mapear.
- **Cartão já existe:** perguntar se atualiza existente (default) ou cria duplicado.
- **Arquivo com nome final já existe na pasta local:** perguntar (substituir / renomear sufixo / cancelar).
- **Aba do SmartPlayer fechou no meio do processo:** reabrir e renavegar pra pasta antes de continuar (os cookies persistem; só o contexto JS se perde).
- **Mesma tool falhou 2x com o mesmo erro:** parar (sem 3ª tentativa idêntica), reportar diagnóstico e o estado real de cada etapa.

## Output final

Após TODAS as validações passarem, responder ao Eric exatamente neste formato:

```
Aula "<Título>" subida:
- Drive: <URL>
- Smart Player: <URL>
- ClickUp: <URL do cartão>

Renomeei N .mp4 ("<Título> - <Parte>"), mandei M .mkv pra lixeira.
```
