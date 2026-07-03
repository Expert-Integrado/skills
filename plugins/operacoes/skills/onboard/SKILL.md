---
name: onboard
description: Onboarding inicial da memoria do Claude para um colaborador NOVO da Expert Integrado (primeira configuracao do zero). Cria CLAUDE.md, rules e memory com info da empresa e preferencias do colaborador. TRIGGER quando o usuario pedir "fazer onboard", "onboarding de colaborador novo", "setup inicial do meu Claude", "configurar minha memoria pela primeira vez", "sou novo na Expert e quero configurar o Claude". NAO usar para editar/atualizar memoria ja existente (ex: "atualiza minha memoria com X") nem para a configuracao pessoal do Eric — para isso, editar os arquivos direto.
allowed-tools: Read, Write, Glob, Bash, AskUserQuestion
---

# Onboarding de Memoria — Expert Integrado

Configura do zero a memoria nativa do Claude Code de um colaborador NOVO da Expert Integrado. Coleta 7 dados do colaborador em UMA mensagem, verifica se ja existe memoria antes de sobrescrever, e cria 6 arquivos em `~/.claude/` a partir dos templates bundlados nesta skill. Oferece migracao opcional de ChatGPT/Claude.ai. Publico-alvo: pessoas NAO tecnicas — tom acolhedor mas direto.

## NUNCA
- NUNCA sobrescrever arquivo de memoria existente sem perguntar antes (Etapa 0 e obrigatoria).
- NUNCA usar emoji (a menos que o usuario peca explicitamente).
- NUNCA mencionar "Eric" pelo nome nos arquivos gerados — usar "CEO" ou "fundador".
- NUNCA incluir dado confidencial nos arquivos: MRR, folha de pagamento, metricas de turnover, lista de desligados, OKRs, metas financeiras, precos detalhados dos produtos (so descricao geral).
- NUNCA copiar conversas inteiras na migracao — extrair APENAS informacoes estruturadas (preferencias, contexto profissional).
- NUNCA disparar varios popups AskUserQuestion seguidos para a coleta (AskUserQuestion aceita no maximo 4 perguntas por chamada). Preferir UMA mensagem de conversa com a lista numerada.

## SEMPRE
- SEMPRE escrever todos os arquivos em portugues brasileiro com acentuacao correta.
- SEMPRE usar os templates bundlados nesta skill como base — nao inventar conteudo do zero.
- SEMPRE preencher TODOS os placeholders `{{...}}` (6 em CLAUDE.md, 2 em MEMORY.md) antes de gravar, e conferir com `Read` que nenhum `{{` sobrou.
- SEMPRE manter as secoes do template CLAUDE.md; so remover uma secao se ela ficar factualmente falsa/vazia para o colaborador (com o template atual isso nao ocorre — ver Etapa 2, passo 1). Na duvida, NAO remover.
- SEMPRE usar o path absoluto resolvido em `CONFIG_DIR` nos `Read`/`Write`/`Glob` — nunca a string literal `~/.claude/` nem `$HOME/...` (as tools nao expandem).
- SEMPRE mostrar o resumo final (Etapa 4) com o caminho de cada arquivo criado.

## Pre-requisitos
- Tools: `Read`, `Write`, `Glob`, `Bash`, `AskUserQuestion`.
- **Como resolver o diretorio de config do Claude (`CONFIG_DIR`) — SEM depender de variavel de ambiente**, porque as tools `Glob`/`Read` NAO expandem `$HOME`, `~` nem `${CLAUDE_CONFIG_DIR}`. Resolver assim, em ordem, e usar o PRIMEIRO que funcionar:
  1. **Listar o `.claude/` no HOME do usuario com `Bash`** — o `Bash` (ao contrario de `Glob`/`Read`) expande as variaveis de ambiente. Rodar: `ls "$HOME/.claude"` e, no Windows (Git Bash), tambem `ls "$USERPROFILE/.claude"`. O `Bash` imprime o path efetivo — obter o diretorio absoluto do `.claude/` a partir da resolucao do proprio shell (ex.: `echo "$HOME/.claude"` ou `echo "$USERPROFILE/.claude"` retorna `C:\Users\Joao\.claude`). Esse valor absoluto (ja com o `<user>` real embutido) e o `CONFIG_DIR`. Se `ls` mostrar que a pasta ainda nao existe (colaborador novo), tudo bem: o `CONFIG_DIR` continua sendo esse path absoluto — o `Write` cria a estrutura depois.
  2. **Fallback SO se o `Bash` do passo 1 falhar** (Bash indisponivel ou erro): `Glob` com pattern literal `**/.claude/CLAUDE.md` (sem `path`, usa o diretorio de trabalho atual). Se retornar 1+ caminhos, o `CONFIG_DIR` e a pasta `.claude/` do resultado (ex.: retorno `C:\Users\Joao\.claude\CLAUDE.md` → `CONFIG_DIR = C:\Users\Joao\.claude`). Se tambem vier vazio: montar o path a partir do HOME real. No Windows, o HOME e `C:\Users\<user>` onde `<user>` e o nome da pasta do usuario logado. Para descobrir `<user>` de forma verificavel: rodar `Glob` com pattern `C:/Users/*/AppData` — cada resultado e um perfil de usuario; o `<user>` correto e aquele cuja pasta `C:/Users/<user>/` contem `.claude` OU, se nenhuma contiver ainda, o unico perfil que NAO seja `Public`/`Default`/`Default User`/`All Users`. Se houver ambiguidade (mais de um perfil humano possivel), perguntar ao colaborador via AskUserQuestion: "Qual e o nome de usuario do Windows na sua maquina?" e montar `CONFIG_DIR = C:\Users\<resposta>\.claude`. **Validar o `<user>` informado antes de usar:** rodar `Bash ls "C:/Users/<resposta>"` — SE o diretorio existir, seguir com esse `<user>`; SE NAO existir, mostrar ao colaborador a lista de diretorios de `C:/Users` (rodar `Bash ls "C:/Users"`) e pedir de novo o nome de usuario, repetindo a validacao ate acertar um diretorio existente.
  3. Em ambiente NAO-Windows (macOS/Linux), o `Glob` do passo 1 acima ja cobre; se precisar montar manualmente, o padrao e `<home>/.claude` (ex.: `/home/<user>/.claude` ou `/Users/<user>/.claude`), com `<user>` obtido do mesmo modo (pasta de perfil que contem `.claude` ou e a unica humana).
  - **A partir daqui, no corpo desta skill, `~/.claude/` = o valor resolvido de `CONFIG_DIR`.** Ao chamar `Write`/`Read`/`Glob`, SEMPRE passar o path ABSOLUTO montado com `CONFIG_DIR` (ex.: `C:\Users\Joao\.claude\CLAUDE.md`), NUNCA a string literal `~/.claude/...` nem `$HOME/...` — essas tools nao expandem.
- **Como resolver o path dos templates (`<skill-dir>`):** `<skill-dir>` e o diretorio onde ESTE `SKILL.md` esta sendo lido em tempo de execucao — o executor conhece o caminho absoluto do arquivo que esta lendo, entao usar ESSE diretorio. Os templates ficam em `<skill-dir>/templates/`. Exemplo de como esse path costuma aparecer quando a skill vem via marketplace: `~/.claude/plugins/marketplaces/expertintegrado/plugins/operacoes/skills/onboard/templates/` — mas isso e SO um exemplo; NUNCA assumir esse caminho de cor: derivar sempre do diretorio real do `SKILL.md` em execucao. Ao chamar `Read` nos templates, montar o path como `<skill-dir>/templates/<arquivo>`.
- Templates bundlados nesta skill (em `<skill-dir>/templates/`, resolvido conforme acima). Sao exatamente 6 arquivos; nao existe outro template:
  - `templates/CLAUDE.md` — contem 6 placeholders distintos: `{{NOME}}`, `{{CARGO}}`, `{{DEPARTAMENTO}}`, `{{GESTOR}}`, `{{TOM}}`, `{{FERRAMENTAS}}` (o `{{NOME}}` aparece 2x no arquivo).
  - `templates/rules/preferences.md` — ZERO placeholders (copiar como esta).
  - `templates/memory/MEMORY.md` — contem 2 placeholders distintos: `{{NOME}}` (2x no arquivo) e `{{CARGO}}` (1x).
  - `templates/memory/expert-integrado.md` — ZERO placeholders (copiar como esta).
  - `templates/memory/produtos.md` — ZERO placeholders (copiar como esta).
  - `templates/memory/tech-stack.md` — ZERO placeholders (copiar como esta).
- **Garantia de cobertura de placeholders (obrigatoria):** os unicos placeholders `{{...}}` existentes no conjunto de templates sao os 8 listados acima (6 em CLAUDE.md + 2 em MEMORY.md); todos tem valor de origem definido na Etapa 2. Ainda assim, apos gravar CADA arquivo, rodar `Read` no arquivo gravado e buscar a sequencia `{{` — se sobrar QUALQUER `{{...}}` nao previsto, e erro: nao entregar; reportar qual placeholder sobrou e em qual arquivo.
- Antes do primeiro `Write`, ler cada template com `Read` (path `<skill-dir>/templates/<arquivo>`, com `<skill-dir>` resolvido conforme acima) para obter o conteudo canonico.

## Passos

### Etapa 0 — Resolver CONFIG_DIR e verificar memoria existente (obrigatoria, ANTES de qualquer escrita)
1. **Resolver `CONFIG_DIR`** seguindo o procedimento em "Pre-requisitos" (primeiro `Bash ls "$HOME/.claude"` / `ls "$USERPROFILE/.claude"` no home do usuario; so se o Bash falhar, cair no `Glob` por `**/.claude/CLAUDE.md` e, em ultimo caso, montar `C:\Users\<user>\.claude`). Guardar o path absoluto resolvido — todos os `Read`/`Write`/`Glob` seguintes usam esse prefixo.
2. **Detectar memoria existente.** Rodar as DUAS verificacoes (com o path absoluto de `CONFIG_DIR`):
   - `Glob` com pattern `<CONFIG_DIR>/CLAUDE.md`
   - `Glob` com pattern `<CONFIG_DIR>/memory/*.md`
   Considera-se que "ja existe memoria" SE qualquer uma das duas chamadas retornar 1+ caminhos.
3. SE ja existe memoria:
   - Perguntar ao colaborador (AskUserQuestion, 1 pergunta, 2 opcoes fixas):
     - Pergunta: "Ja encontrei uma memoria configurada aqui. O que voce quer fazer?"
     - Opcao A — rotulo "Sobrescrever tudo": "Apagar a config atual e criar do zero com as respostas de agora."
     - Opcao B — rotulo "Manter tudo": "Nao mexer em nada; sair sem alterar."
   - SE resposta = "Sobrescrever tudo" → seguir para Etapa 1 (a Etapa 2 grava por cima dos arquivos existentes).
   - SE resposta = "Manter tudo" → PARAR e reportar que nada foi alterado (nao ir para Etapa 1).
   - **SE a resposta for ambigua / fora das 2 opcoes** (ex.: colaborador digita "so atualiza uma parte", "muda so meu cargo", "mantem X mas troca Y"): NAO adivinhar e NAO rodar esta skill parcialmente. Esta skill so faz setup do zero (tudo-ou-nada). Responder com este texto literal e ENCERRAR sem escrever nada:
     > Essa configuracao inicial so funciona no modo tudo-ou-nada (criar do zero ou nao mexer). Para trocar so um pedaco (ex: seu cargo, uma ferramenta), a gente nao usa este onboarding — e so voce me pedir depois: "atualiza minha memoria com [o que mudou]". Quer que eu (1) sobrescreva tudo agora, ou (2) deixe como esta?
     - Se depois dessa mensagem o colaborador escolher claramente (1) → tratar como "Sobrescrever tudo"; (2) → tratar como "Manter tudo". Se continuar ambiguo, repetir a pergunta binaria uma vez; persistindo, encerrar como "Manter tudo" (nao escrever nada).
4. SENAO (nao existe memoria) → seguir direto para Etapa 1.

### Etapa 1 — Boas-vindas e coleta
1. Cumprimentar e explicar em 3 bullets:
   - "Vou configurar a memoria do Claude para ele te ajudar melhor no dia a dia."
   - "Sao algumas perguntas rapidas sobre voce e como voce trabalha."
   - "Leva menos de 5 minutos."
2. Coletar os 7 dados abaixo. Preferir UMA mensagem de conversa com a lista numerada (colaborador responde tudo de uma vez). Se optar por AskUserQuestion, agrupar em no maximo 4 perguntas por chamada — nunca disparar 7 popups.

   1. **Nome completo** — texto livre; usar exatamente como o colaborador escrever.
   2. **Cargo/funcao** na Expert Integrado — texto livre; usar exatamente como escrever.
   3. **Departamento** — pedir que escolha UM entre: Operacoes, CS, Comercial, Marketing, Financeiro, Admin. Essa lista NAO e fechada: se o colaborador informar um departamento fora dela (ex.: TI, Produto, RH), ACEITAR o texto livre que ele deu, sem insistir numa das 6 opcoes. As 6 sao so sugestao do que e mais comum. Gravar em `{{DEPARTAMENTO}}` o valor final (uma das 6 OU o texto livre informado). Nao mapear/renomear o que o colaborador disse. **Regra de texto livre:** gravar EXATAMENTE como o colaborador escreveu — mesma capitalizacao e mesma grafia. Nao normalizar caixa (nao "corrigir" `ti` para `TI` nem `Marketing` para `marketing`), nao ajustar acento, nao trocar por um termo "certo". Copiar caractere a caractere.
   4. **Quem e seu gestor direto** — texto livre; nome como o colaborador escrever.
   5. **Quais ferramentas voce mais usa no trabalho?** — RESPOSTA LIVRE (nao e lista fechada). Os exemplos entre parenteses sao so referencia: Pipedrive, ClickUp, Zoom, Outlook, ChatGuru, WhatsApp. Aceitar quantas ele citar, incluindo ferramentas FORA dessa lista (ex.: Notion, Excel, Canva) — registrar exatamente como o colaborador escreveu, sem filtrar, sem mapear e sem trocar por um item "parecido" da lista. **Regra de texto livre:** gravar cada ferramenta EXATAMENTE como escrita — mesma capitalizacao e mesma grafia. Nao normalizar caixa (nao "corrigir" `clickup` para `ClickUp` nem `NOTION` para `Notion`), nao ajustar acento, nao renomear. Gravar em `{{FERRAMENTAS}}` a lista dele separada por virgula. Se ele nao usar nenhuma, gravar "Nenhuma informada".
   6. **Como voce prefere que o Claude se comunique?** — escolher UMA:
      - Direto e curto (padrao Expert)
      - Mais detalhado e explicativo
      - Formal
      (Se responder algo fora das 3, mapear para a mais proxima e, na duvida, usar "Direto e curto (padrao Expert)".)
   7. **Voce usa o Claude no celular tambem?** (sim/nao) — resposta binaria. Acao concreta: ao gerar o `CLAUDE.md` (Etapa 2), registrar a resposta na secao de contexto (`## Como eu trabalho`) como a linha literal `- Usa Claude no celular: sim` ou `- Usa Claude no celular: nao` (conforme a resposta). Nenhuma outra acao — nao criar arquivo, nao mudar tom, nao mexer em outro campo.
3. Validacao: so avancar para Etapa 2 com os 7 campos respondidos (campo 7 conta como respondido com sim OU nao). Se algum faltar, pedir so o(s) que faltou.

### Etapa 2 — Gerar os arquivos de memoria
Estrutura final a criar em `~/.claude/`:
```
~/.claude/
  CLAUDE.md                      <- Preferencias pessoais (personalizado)
  rules/
    preferences.md               <- Regras de comunicacao (padrao)
  memory/
    MEMORY.md                    <- Indice (personalizado)
    expert-integrado.md          <- Info da empresa (padrao)
    produtos.md                  <- Produtos da empresa (padrao)
    tech-stack.md                <- Ferramentas e MCPs (padrao)
```

Em todos os passos abaixo, gravar no path ABSOLUTO montado com `CONFIG_DIR` (ex.: `C:\Users\Joao\.claude\CLAUDE.md`), nunca a string literal `~/.claude/...`.

1. **`<CONFIG_DIR>/CLAUDE.md`** — `Read` `templates/CLAUDE.md`, substituir por busca-e-troca de texto exato CADA ocorrencia dos 6 placeholders abaixo (o valor vem do campo coletado na Etapa 1; usar o texto EXATO informado, sem reescrever):
   - `{{NOME}}` → nome completo (campo 1) — aparece 2x no template; trocar as duas.
   - `{{CARGO}}` → cargo (campo 2)
   - `{{DEPARTAMENTO}}` → departamento (campo 3) — pode ser uma das 6 opcoes OU o texto livre informado.
   - `{{GESTOR}}` → gestor direto (campo 4)
   - `{{FERRAMENTAS}}` → lista de ferramentas (campo 5), separada por virgula; se vazio, "Nenhuma informada".
   - `{{TOM}}` → estilo de comunicacao escolhido (campo 6): gravar o rotulo exato da opcao escolhida — "Direto e curto (padrao Expert)", "Mais detalhado e explicativo" ou "Formal".
   - **Registrar o campo 7 (usa Claude no celular):** na secao `## Como eu trabalho` do CLAUDE.md gerado, acrescentar a linha literal `- Usa Claude no celular: sim` ou `- Usa Claude no celular: nao` conforme a resposta do campo 7. E a UNICA acao do campo 7. Isso nao e um placeholder `{{...}}` — nao entra nas verificacoes de `{{` (o arquivo continua sem `{{` apos gravar).
   - **Sobre "remover secoes que nao se aplicam":** o template `templates/CLAUDE.md` atual tem 5 secoes fixas (`Quem sou`, `Como eu trabalho`, `Ambiente`, `Regras`, `Tarefas`) e NENHUMA delas e condicional a departamento/cargo — todas valem para qualquer colaborador. Portanto, com o template atual, o resultado esperado e: NAO remover nenhuma secao. So remover uma secao SE, apos preencher os placeholders, ela ficar factualmente falsa/vazia para aquele colaborador — o que nao ocorre com as 5 secoes atuais. Na duvida, NAO remover (manter o template intacto e mais seguro que apagar). Nao inventar/adicionar secao nova.
   - Resultado esperado: arquivo gravado identico ao template exceto pelos 6 placeholders resolvidos e pela linha `- Usa Claude no celular: sim/nao` acrescentada em `## Como eu trabalho` (campo 7); 5 secoes presentes.
   - Validacao: `Read` o arquivo gravado e buscar `{{` — nenhum placeholder pode sobrar.

2. **`<CONFIG_DIR>/rules/preferences.md`** — `Read` `templates/rules/preferences.md` e gravar SEM alteracao. Este template tem ZERO placeholders e o tom ja esta embutido no CLAUDE.md (campo 6) — NAO editar preferences.md por causa do tom. Resultado esperado: copia byte-a-byte do template.

3. **`<CONFIG_DIR>/memory/MEMORY.md`** — `Read` `templates/memory/MEMORY.md`, substituir por busca-e-troca exata: `{{NOME}}` (campo 1, aparece 2x) e `{{CARGO}}` (campo 2, aparece 1x). Nao ha outro placeholder neste arquivo. Validacao: `Read` e buscar `{{` — nenhum restante.

4. **`<CONFIG_DIR>/memory/expert-integrado.md`**, **`<CONFIG_DIR>/memory/produtos.md`**, **`<CONFIG_DIR>/memory/tech-stack.md`** — `Read` cada template em `templates/memory/` e gravar SEM alteracao (ZERO placeholders; iguais para todos). Resultado esperado: 3 copias byte-a-byte dos templates.

Validacao da Etapa 2: os 6 arquivos existem em `<CONFIG_DIR>/` e nenhum contem a sequencia `{{`.

### Etapa 3 — Migracao de outros assistentes (opcional)
1. Perguntar (texto literal):
   > Voce usa ou ja usou outros assistentes de IA como ChatGPT ou Claude.ai no navegador?
   > Se sim, pode ser util trazer suas conversas e preferencias de la para ca.
2. SE resposta = nao → pular para Etapa 4.
3. SE resposta = sim → entregar as instrucoes literais abaixo conforme a origem:

   **Para migrar do ChatGPT:**
   ```
   1. Acesse chat.openai.com
   2. Clique no seu nome (canto inferior esquerdo)
   3. Va em Settings > Data Controls > Export Data
   4. Voce vai receber um e-mail com um arquivo .zip
   5. Baixe e extraia o .zip
   6. Dentro vai ter um arquivo conversations.json
   7. Me envie esse arquivo que eu analiso e trago as informacoes relevantes
   ```

   **Para migrar do Claude.ai:**
   ```
   1. Acesse claude.ai
   2. Clique no seu nome (canto inferior esquerdo)
   3. Va em Settings
   4. Procure a secao "Memory" ou "Project Knowledge"
   5. Exporte ou copie o conteudo
   6. Me envie que eu organizo nos seus arquivos de memoria
   ```
4. Apos receber os arquivos:
   - Analisar o conteudo exportado.
   - Extrair APENAS preferencias, contexto profissional e informacoes uteis estruturadas.
   - Adicionar ao `~/.claude/CLAUDE.md` ou criar arquivo em `~/.claude/memory/` conforme necessario.
   - NAO copiar conversas inteiras.

### Etapa 4 — Verificacao e proximos passos
Mostrar ao colaborador o resumo (template literal):
```
Memoria configurada com sucesso!

Arquivos criados:
  ~/.claude/CLAUDE.md                   — Suas preferencias pessoais
  ~/.claude/rules/preferences.md        — Regras de comunicacao
  ~/.claude/memory/MEMORY.md            — Indice da memoria
  ~/.claude/memory/expert-integrado.md  — Info da empresa
  ~/.claude/memory/produtos.md          — Produtos da Expert
  ~/.claude/memory/tech-stack.md        — Ferramentas e MCPs

Para testar, feche e reabra o Claude Code. Depois pergunte:
  "Qual e meu cargo na Expert Integrado?"
  "Quais sao os produtos da empresa?"

Se precisar ajustar algo depois, e so pedir:
  "Atualiza minha memoria com [informacao]"
```

## Validacao final (checklist)
- [ ] `CONFIG_DIR` foi resolvido para um path absoluto (via Glob ou montado com o `<user>` do Windows) antes de qualquer escrita.
- [ ] Etapa 0 rodou: memoria existente foi checada com os 2 Glob; se havia, o colaborador escolheu "Sobrescrever tudo" (nao gravar nada se escolheu "Manter tudo" ou se ficou ambiguo e nao resolveu).
- [ ] Os 6 arquivos existem em `<CONFIG_DIR>/`.
- [ ] Nenhum arquivo gravado contem a sequencia `{{` (conferido com `Read` por arquivo).
- [ ] CLAUDE.md tem os 6 valores (nome/cargo/departamento/gestor/ferramentas/tom) e MEMORY.md tem nome/cargo — todos com o texto EXATO informado pelo colaborador (incluindo departamento/ferramenta fora da lista de exemplos).
- [ ] Nenhum arquivo cita "Eric" pelo nome (so "CEO"/"fundador").
- [ ] Nenhum dado confidencial (MRR, folha, turnover, OKRs, precos detalhados) foi incluido.
- [ ] Todos os textos em PT-BR com acentuacao correta, sem emoji.
- [ ] Resumo da Etapa 4 foi exibido com o caminho absoluto de cada arquivo (usar `<CONFIG_DIR>` real, nao a string `~/.claude/`).

## Erros comuns e recovery
- **Template nao encontrado ao `Read`**: confirmar que o path foi montado como `<skill-dir>/templates/...` (`<skill-dir>/templates/CLAUDE.md`, `<skill-dir>/templates/memory/...`, `<skill-dir>/templates/rules/...`), com `<skill-dir>` = diretorio real do `SKILL.md` em execucao (nao o caminho de exemplo do marketplace). Nao inventar conteudo — sem template, parar e reportar.
- **`CONFIG_DIR` nao resolve (`Bash ls "$HOME/.claude"`/`"$USERPROFILE/.claude"` falhou, `Glob` por `**/.claude/CLAUDE.md` vazio e sem certeza do `<user>` do Windows)**: perguntar ao colaborador via AskUserQuestion "Qual e o nome de usuario do Windows na sua maquina?", VALIDAR a resposta com `Bash ls "C:/Users/<resposta>"` — se nao existir, mostrar `Bash ls "C:/Users"` e pedir de novo ate acertar (mesmo procedimento do passo 2 dos Pre-requisitos) — e montar `C:\Users\<resposta>\.claude`. `Write` cria a estrutura de pastas ausente ao gravar. Se o `Write` falhar, reportar o path absoluto tentado.
- **Placeholder `{{...}}` sobrou no arquivo**: reabrir com `Read`, aplicar o valor correto do campo coletado (busca-e-troca do `{{...}}` exato) e regravar. Se o placeholder que sobrou NAO estiver na lista dos 8 conhecidos (6 CLAUDE.md + 2 MEMORY.md), o template foi alterado fora desta skill — parar e reportar qual `{{...}}` apareceu e em qual arquivo.
- **Colaborador so respondeu parte dos 7 campos**: nao gravar ainda — pedir so o(s) campo(s) faltante(s) e completar antes da Etapa 2.
- **Ja existe memoria e o colaborador escolheu "Manter tudo" (ou resposta ambigua nao resolvida)**: nao gravar nada; reportar que a config atual foi preservada.

## Notas
- Esta skill NAO chama tools de CRM/MCP externo — so leitura de templates e escrita de arquivos locais.
- `rules/preferences.md`, `expert-integrado.md`, `produtos.md` e `tech-stack.md` sao identicos para todos os colaboradores; so `CLAUDE.md` e `MEMORY.md` sao personalizados.
