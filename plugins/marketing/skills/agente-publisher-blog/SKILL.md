---
name: agente-publisher-blog
description: Publica um post MDX APROVADO no blog blog.expertintegrado.com.br/blog. Roda os gates de segurança (protocolo docs/protocolo-conteudo.md), grava o arquivo em src/content/blog/, escreve o log de aprovação, faz git commit+push, aguarda o deploy Vercel, valida a página no ar, atualiza cross-links bidirecionais nos posts relacionados, salva nota no Expert Brain e atualiza o índice de publicados. TRIGGER quando Eric (ou o pipeline de conteúdo) disser "publica o post", "faz o deploy do artigo", "sobe o post", "publica o artigo <slug>" APÓS revisão aprovada. NÃO disparar para escrever/revisar rascunho (isso é agente-draft-blog / agente-revisor-blog), nem para gerar hero/imagem, nem quando o veredicto da revisão for RETRABALHO MAIOR.
allowed-tools: Read, Write, Edit, Bash, mcp__expert-brain__save_note, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot
---

# Agente Publisher Blog — Expert Integrado

Executa o pipeline completo de publicação de UM post MDX já aprovado: passa pelos gates de segurança bloqueantes → grava o arquivo no repo do blog → registra o log de aprovação → git commit+push → aguarda e valida o deploy Vercel → atualiza cross-links bidirecionais nos posts relacionados → salva nota no Expert Brain → atualiza o índice `blog-publicados-2026.md`. Opera sobre dois repos: `expertintegrado-blog` (o site) e `expert-brain` (o índice de controle). Host de produção: `blog.expertintegrado.com.br`.

## NUNCA

- NUNCA publicar sem passar o Passo 0 (gates de segurança). Qualquer gate que falhe = ABORTAR e reportar ao Eric.
- NUNCA publicar um post com veredicto **RETRABALHO MAIOR** do `agente-revisor-blog`. Só publicar APROVADO com Segurança VERDE, ou AMARELO com decisão humana explícita registrada.
- NUNCA publicar MDX com placeholder não preenchido (ex.: `<...>`, `TODO`, `[inserir]`, `[preencher]`, `Lorem ipsum`) ou frontmatter incompleto.
- NUNCA publicar `tipo: case` com nome real de cliente/aluno SEM referência de consentimento registrada — sem registro, publicar só a versão anonimizada.
- NUNCA rodar o Passo 4+ (cross-links / Brain / índice) se o Passo 2 (push) ou o Passo 3 (deploy 200) falhar — parar e reportar ao Eric.
- NUNCA fazer `git push --force` nem reescrever histórico em nenhum dos dois repos.
- NUNCA sobrescrever o array `related` inteiro de um post relacionado — apenas ADICIONAR o novo slug se ainda não estiver lá.
- NUNCA publicar um lote inteiro no mesmo dia — escalonar `pubDate` 1 post/dia (Passo 0.5).

## SEMPRE

- SEMPRE rodar o scanner `check-sensivel.py` de novo antes do commit (defesa em profundidade), mesmo que o revisor já tenha rodado.
- SEMPRE escrever a linha no `docs/log-aprovacoes.md` NO MESMO COMMIT do post (Passo 0.4 + Passo 2).
- SEMPRE `git pull` ANTES de editar qualquer repo (fluxo multi-máquina — working tree não viaja sozinha).
- SEMPRE validar que o push retornou sucesso ANTES de aguardar o deploy.
- SEMPRE validar HTTP 200 + título presente na página ANTES de considerar publicado.
- SEMPRE commit+push JUNTOS (commit local sozinho não chega no outro PC nem dispara o Vercel).
- SEMPRE reportar cross-link ausente (arquivo relacionado inexistente) como pendência no relatório final — não abortar por causa dele.

## Pré-requisitos

Repos (paths do PC como default; overridable por env var pra rodar em notebook/VPS):

- Blog: `BLOG_DIR="${BLOG_DIR:-C:/repos/expertintegrado-blog}"` — remote `ericlucianoferreira/expertintegrado-blog`, branch `master`. Posts em `src/content/blog/<slug>.mdx`. Host de produção: `https://blog.expertintegrado.com.br`.
- Brain repo (índice de publicados): `BRAIN_REPO="${BRAIN_REPO:-C:/repos/expert-brain}"` — remote `Expert-Integrado/expert-brain`. Índice em `outputs/blog-publicados-2026.md`. Commitar no branch ATUAL do repo (não trocar de branch).

Protocolo de segurança canônico: `${BLOG_DIR}/docs/protocolo-conteudo.md` (4 camadas). Log de aprovação: `${BLOG_DIR}/docs/log-aprovacoes.md`. Scanner: `${BLOG_DIR}/scripts/check-sensivel.py`.

Ferramentas: `git`, `curl`, um Python (detectar com `command -v`). MCP `mcp__expert-brain__save_note`. Playwright é opcional (fallback visual do Passo 3; se não houver ambiente de browser, usar só `curl`).

Resolver o Python uma vez (não há `python`/`python3` no PATH do PC — usar o interpretador documentado como fallback):

```bash
PY=$(command -v python3 || command -v python || echo "C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe")
```

## Input esperado

1. `slug`: identificador do post (kebab-case, sem extensão).
2. MDX aprovado completo (conteúdo do arquivo).
3. `related`: lista de slugs dos posts relacionados (pra cross-link inverso). Pode ser vazia.
4. Veredicto do revisor: APROVADO / RETRABALHO MENOR / RETRABALHO MAIOR, e a cor da triagem de Segurança (VERDE / AMARELO + exceções aprovadas / VERMELHO).
5. `aprovador`: quem aprovou (pro log). Se `tipo: case` com nome real: referência do consentimento.
6. (Contexto pro Passo 5/6) `pillar`, `tipo`, `pubDate` — extraíveis diretos do frontmatter do próprio MDX. A **keyword-alvo** NÃO tem campo próprio no frontmatter: os únicos campos existentes são `title`, `description`, `pubDate`, `pillar`, `tipo`, `heroImage`, `heroAlt`, `status`, `readingTime`, `tags`, `related`, `takeaways`. Usar `tags[0]` (primeira tag = tópico principal) como keyword-alvo; se o invocador informar uma keyword-alvo explícita no input, essa tem prioridade.
7. (OPCIONAL) **Relatório do revisor** (`agente-revisor-blog`): path do arquivo ou o texto colado. Necessário APENAS se o scanner do Passo 0.2 acusar match VERMELHO — é a fonte que diz se cada match foi justificado. Sem ele, um match VERMELHO NÃO pode ser liberado (ver Passo 0.2).

Se o veredicto/cor de segurança não forem informados → PERGUNTAR ao Eric antes de prosseguir. RETRABALHO MAIOR ou Segurança VERMELHO → NÃO publicar.

---

## Passo 0 — Gates de segurança (BLOQUEANTES — protocolo `docs/protocolo-conteudo.md`)

Rodar os 4 gates NA ORDEM (0.1 → 0.2 → 0.3 → 0.4). Qualquer um que falhe = ABORTAR e reportar ao Eric: não commitar nem publicar (não seguir pro Passo 2, que é o que efetivamente publica). Gravar o MDX no disco (working tree, sem commit) é local e reversível e NÃO conta como publicar — ver a nota de ordem abaixo.

**Ordem real de execução (resolve a dependência scanner ↔ arquivo).** O gate 0.2 roda `check-sensivel.py`, que LÊ `src/content/blog/<slug>.mdx` do DISCO (`open(path)` no script — não aceita conteúdo por stdin). Num slug novo (caso típico) esse arquivo ainda não existe. Então a gravação do MDX em disco (o `git pull` + Write descritos no Passo 1) é PRÉ-CONDIÇÃO do 0.2 e roda ANTES dele. Sequência literal a executar:

1. **0.1** (veredicto — checagem pura, não toca arquivo). Se reprovar → ABORTAR antes de gravar qualquer coisa.
2. **Passo 1** (git pull + Write do MDX em `src/content/blog/<slug>.mdx`) — grava SÓ no working tree, sem `git add`/commit.
3. **0.2** (scanner sobre o arquivo já gravado) → **0.3** → **0.4** (linha do log).
4. **Passo 0.5** (cadência de lote, se 2+ posts) → **Passo 2** (`git add` + commit + push — é AQUI que publica).

Gravar o MDX no Passo 1 antes do 0.2 NÃO "adianta o Passo 2": o que publica é o commit+push (Passo 2), e esse permanece bloqueado enquanto qualquer gate não passar. Se 0.2/0.3 abortarem DEPOIS da gravação, o arquivo fica só no disco, não commitado — descartar com `git checkout -- src/content/blog/<slug>.mdx` (arquivo pré-existente) ou `rm src/content/blog/<slug>.mdx` (slug novo/untracked). Se o arquivo já existir no disco (republicação do mesmo slug), a gravação do Passo 1 é idempotente.

**0.1 — Veredicto do revisor.** Exige APROVADO com Segurança **VERDE**, ou **AMARELO** com decisão humana explícita registrada (quem aprovou cada exceção). Segurança VERMELHO ou RETRABALHO MAIOR = ABORTAR. SE a triagem for AMARELO e o input trouxer só um aprovador único, SEM granularidade por exceção (sem dizer quem aprovou CADA exceção) → PARAR e pedir ao solicitante a lista exceção-por-exceção antes de publicar; nunca inferir quem aprovou o quê.

**0.2 — Scanner (defesa em profundidade).** Rodar de novo antes do commit. **Pré-condição:** o MDX já precisa estar gravado no disco — rodar o Passo 1 (git pull + Write) ANTES deste gate (ver "Ordem real de execução" acima). O script recebe o SLUG (sem extensão e sem caminho — ele resolve `src/content/blog/<slug>.mdx` sozinho e lê do disco):

```bash
cd "${BLOG_DIR:-C:/repos/expertintegrado-blog}"
"$PY" scripts/check-sensivel.py <slug>
```

Exit 0 = sem match VERMELHO → segue. Exit 1 = há match VERMELHO → decidir SÓ com o relatório do revisor (input opcional 7), nunca por conta própria:
- SE o relatório está disponível E o match consta como justificado nele → segue.
- SE o relatório está disponível E o match NÃO consta como justificado → ABORTAR e devolver ao revisor/Eric com os matches.
- SE o relatório NÃO está disponível → ABORTAR e pedir o relatório do revisor ao solicitante antes de qualquer decisão (gate bloqueante conservador — um match VERMELHO nunca é liberado sem o relatório que o justifique).

Se o scanner reclamar de arquivo inexistente (`FileNotFoundError`/`No such file`) = o MDX não foi gravado — voltar ao Passo 1 e gravá-lo primeiro, depois repetir o 0.2.

**0.3 — Gate LGPD de case.** Se `tipo: case` no frontmatter e o post cita nome real de cliente/aluno → exige a referência do consentimento (onde está registrado). Sem registro, NÃO publicar a versão nomeada. O publisher NÃO edita/anonimiza conteúdo (quem gera e anonimiza o texto é o `agente-draft-blog` / `agente-revisor-blog`) — então PARAR e devolver ao solicitante pedindo a versão anonimizada; só publicar quando ela chegar pronta no input, ou quando a referência de consentimento da versão nomeada for fornecida.

**0.4 — Log de aprovação.** Adicionar UMA linha no fim da tabela de `${BLOG_DIR}/docs/log-aprovacoes.md` (Edit). Ela será commitada no MESMO commit do post (Passo 2). Formato de cada coluna (idêntico ao das linhas já existentes no arquivo):

- `<data>`: data da publicação em ISO `AAAA-MM-DD` (fuso America/Sao_Paulo), ex.: `2026-07-05`. Em geral é igual ao `pubDate` do frontmatter.
- `<slug>` e `<aprovador>`: como vieram no input.
- `<triagem>`: `VERDE`, ou `AMARELO aprovado (<exceções — quem aprovou o quê>)`.
- `<consentimento>`: `n/a`, ou a referência do consentimento apurada no gate 0.3.

```
| <data> | <slug> | <aprovador> | <triagem VERDE/AMARELO+exceções> | <consentimento: n/a ou ref> |
```

## Passo 0.5 — Cadência de lote (quando publicando 2+ posts)

Lote NUNCA vai ao ar de uma vez: escalonar `pubDate` 1 post/dia a partir de amanhã. O blog filtra `pubDate` futuro no build (todas as queries `getCollection`); cada rebuild diário revela o post do dia via GitHub Action `.github/workflows/daily-rebuild.yml`. Se o schedule estiver desativado, o rebuild é manual (`workflow_dispatch` na Action, ou `vercel --prod`).

## Passo 1 — Gravar o arquivo MDX

Este passo é PRÉ-CONDIÇÃO do gate 0.2 e roda ANTES dele (ver "Ordem real de execução" no Passo 0): a gravação abaixo é só no working tree, sem `git add`/commit — o commit+push que publica é o Passo 2. Se já gravou o MDX aqui e depois abortou num gate, a gravação é reversível (`git checkout`/`rm`).

Antes de escrever, `git pull` no repo do blog:

```bash
cd "${BLOG_DIR:-C:/repos/expertintegrado-blog}"
git pull
```

Se o pull der conflito → parar e reportar ao Eric (não sobrescrever).

Gravar (Write) o MDX aprovado em:

```
${BLOG_DIR}/src/content/blog/<slug>.mdx
```

**Validação (todas obrigatórias antes de seguir):**
- Frontmatter completo: `title`, `description`, `pubDate`, `pillar`, `tipo`, `status: "published"`. Os posts do repo também trazem `heroImage`, `heroAlt`, `readingTime`, `tags`, `related`, `takeaways` — preservar os que vierem no MDX aprovado, não removê-los.
- Se o post usa o componente InlineCta, o import `import InlineCta from '../../components/InlineCta.astro';` deve estar presente (logo após o frontmatter).
- Sem placeholder não preenchido (grep por `<...>`, `TODO`, `[inserir]`, `[preencher]`, `Lorem`).

Se qualquer validação falhar → NÃO commitar; reportar ao Eric o campo/placeholder problemático e parar.

## Passo 2 — Git commit + push (repo do blog)

Commitar o post E a linha do log de aprovação (Passo 0.4) JUNTOS:

```bash
cd "${BLOG_DIR:-C:/repos/expertintegrado-blog}"
git add src/content/blog/<slug>.mdx docs/log-aprovacoes.md
git commit -m "feat(blog): post <slug>

Publish: <título curto>
Pillar: <pillar>
Tipo: <tipo>"
git push
```

Preenchimento dos placeholders do commit (todos vêm do frontmatter, sem inventar):
- `<título curto>` = o campo `title` do frontmatter, SEM as aspas. Não criar um título novo. Se o `title` tiver mais de 72 caracteres, truncar no último espaço antes do caractere 72 (palavra inteira, sem reticências); se tiver 72 ou menos, usar inteiro.
- `<pillar>` e `<tipo>` = os campos homônimos do frontmatter, sem aspas.

**Validação:** o `git push` deve retornar sucesso (exit code 0; sem `rejected`/`error`). Confirmar com `git log -1 --oneline` e guardar o hash do commit pro relatório.

Se falhar → ver "Erros comuns e recovery". Não avançar pro Passo 3 sem push confirmado.

## Passo 3 — Aguardar e validar o deploy Vercel

O push na branch `master` dispara o build automático na Vercel. Aguardar o deploy antes de validar.

Caminho primário (agnóstico, funciona headless) — polling com `curl` até HTTP 200, tentando por ~180s:

```bash
URL="https://blog.expertintegrado.com.br/blog/<slug>"
for i in $(seq 1 12); do
  CODE=$(curl -s --ssl-no-revoke -o /dev/null -w "%{http_code}" "$URL")
  echo "tentativa $i: HTTP $CODE"
  [ "$CODE" = "200" ] && break
  sleep 15
done
```

**Validação:**
- HTTP 200 (o loop acima deve terminar com `CODE=200`).
- Título do post presente no HTML. Buscar por LITERAL (`-F`, não regex — evita falso-positivo/erro com metacaracteres do título) usando um FRAGMENTO estável: as primeiras 3-4 palavras do `title`, sem pontuação especial e sem entidades HTML (o HTML renderizado pode escapar acento/aspas/`&`, então um pedaço curto e simples casa melhor que o título inteiro):
  ```bash
  curl -s --ssl-no-revoke "$URL" | grep -qiF "<primeiras 3-4 palavras do título>"
  ```
  → deve encontrar. Se HTTP for 200 mas o `grep` não bater, NÃO declarar falha ainda — ver "Erros comuns e recovery".

Caminho de fallback visual (OPCIONAL — o `curl` acima já é suficiente pra validar; este passo é só confirmação visual extra, nunca bloqueia). Critério verificável de "há ambiente de browser disponível": a tool `mcp__playwright__browser_navigate` está listada/disponível nesta sessão. SE disponível → `mcp__playwright__browser_navigate` para a URL, depois `mcp__playwright__browser_snapshot`, e confirmar que o título aparece e o layout não está quebrado (CSS carregou). SENÃO (tool ausente — ex.: headless/VPS) → pular esta parte; a validação por `curl` (HTTP 200 + título presente) já basta.

Se após ~180s o código ainda não for 200 → ver "Erros comuns e recovery". NÃO seguir pro Passo 4.

## Passo 4 — Atualizar cross-links nos posts relacionados

Para CADA slug em `related`:

1. Verificar se o arquivo existe: `${BLOG_DIR}/src/content/blog/<slug-relacionado>.mdx`.
   - Se NÃO existe → registrar como pendência no relatório e pular pro próximo (não abortar).
2. Read do arquivo. Localizar o array `related:` no frontmatter.
3. SE o array `related` já inclui `<slug-novo>` → nada a fazer, pular.
4. SENÃO → Edit adicionando `"<slug-novo>"` ao array `related` (apenas adicionar; não remover os existentes).
5. Commitar individualmente:

```bash
git add src/content/blog/<slug-relacionado>.mdx
git commit -m "fix(blog): cross-link bidirecional <slug-relacionado> ↔ <slug-novo>"
```

Após processar TODOS os relacionados, um único push:

```bash
git push
```

**Validação:** push com exit 0. Guardar a lista de slugs efetivamente atualizados (e a lista de pendentes) pro relatório.

## Passo 5 — Salvar nota no Expert Brain

**Pré-cálculo do `<#>` (número sequencial do post).** O `<#>` aparece nesta nota E na linha do índice (Passo 6), e vem da MESMA fonte: a tabela de `${BRAIN_REPO}/outputs/blog-publicados-2026.md`. Como o índice só é ESCRITO no Passo 6, adiantar aqui APENAS a LEITURA dele (read-only — não altera a ordem de escrita nem publica nada):

```bash
cd "${BRAIN_REPO:-C:/repos/expert-brain}"
git pull
```
- Read de `outputs/blog-publicados-2026.md`. `<#>` = (maior valor da coluna `#` nas linhas de dados da tabela) + 1. Se o arquivo não existir, ou a tabela não tiver nenhuma linha de dados → `<#>` = 1.
- Guardar `<#>`: é o MESMO número usado na linha do índice no Passo 6 (lá NÃO recalcular — reusar este valor).

**Origem do `<kw>` (keyword alvo).** NÃO há campo dedicado de keyword/SEO no frontmatter. Usar `tags[0]` (a primeira tag do array `tags` do frontmatter, que é o tópico principal do post). Se o invocador passou uma keyword-alvo explícita no input, essa tem prioridade sobre `tags[0]`.

Chamar `mcp__expert-brain__save_note` com o template abaixo (preencher os `<...>` com os valores reais — `<título>`/`<pubDate>`/`<pillar>`/`<tipo>` do frontmatter, `<#>` e `<kw>` conforme acima, `<slug>`/listas do input):

```
mcp__expert-brain__save_note(
  title: "Post publicado: <título>",
  kind: "fact",
  domains: ["marketing", "ai-applied"],
  body: "Post #<#> do blog Expert Integrado publicado em <pubDate>.
URL: https://blog.expertintegrado.com.br/blog/<slug>
Pillar: <pillar> | Tipo: <tipo>
Keyword alvo: <kw>
Posts relacionados: <lista de slugs>
Cross-links atualizados: <lista>",
  tldr: "Blog post '<título>' publicado em blog.expertintegrado.com.br/blog/<slug>"
)
```

**Validação:** o save retorna um `id`. Guardar o id pro relatório.

Se der timeout/erro → tentar novamente 1x (o Brain roda em D1, eventually consistent). Se ainda falhar, registrar no relatório como "Brain: pendente" e seguir — não bloquear a publicação por causa da nota.

## Passo 6 — Atualizar o índice de publicados

Arquivo: `${BRAIN_REPO}/outputs/blog-publicados-2026.md`.

```bash
cd "${BRAIN_REPO:-C:/repos/expert-brain}"
git pull
```

- Read do arquivo. Ele tem a tabela `| # | slug | pillar | tipo | pubDate | URL |`.
- SE o arquivo não existe → criar com o cabeçalho canônico:

```
# Blog Expert Integrado — Publicados 2026

> Índice de controle. Atualizar a cada publicação.
> Blog: https://blog.expertintegrado.com.br/blog

| # | slug | pillar | tipo | pubDate | URL |
|---|---|---|---|---|---|
```

- Adicionar a linha usando o MESMO `<#>` já calculado no Passo 5 (próximo número sequencial = maior `#` atual + 1; não recalcular aqui). O `git pull` acima traz a versão mais recente do índice; se ele revelar uma linha de dados nova que não existia no Passo 5 (outra máquina publicou no intervalo), recalcular `<#>` a partir da tabela atual:

```
| <#> | <slug> | <pillar> | <tipo> | <pubDate> | https://blog.expertintegrado.com.br/blog/<slug> |
```

Commit + push do índice no branch ATUAL do repo (pra sobreviver ao multi-máquina; não trocar de branch):

```bash
git add outputs/blog-publicados-2026.md
git commit -m "docs(blog): índice — post #<#> <slug>"
git push
```

**Validação:** push com exit 0.

---

## Validação final (checklist)

Só reportar "publicado" quando TODOS forem verdadeiros:

- [ ] Passo 0 completo: veredicto APROVADO/AMARELO-com-exceção, scanner exit 0 (ou match justificado), gate LGPD ok, linha no `docs/log-aprovacoes.md`.
- [ ] `${BLOG_DIR}/src/content/blog/<slug>.mdx` gravado, frontmatter completo, sem placeholder.
- [ ] Commit+push do blog OK (hash guardado), incluindo `docs/log-aprovacoes.md` no mesmo commit.
- [ ] `https://blog.expertintegrado.com.br/blog/<slug>` responde HTTP 200 com o título presente.
- [ ] Cross-links dos relacionados adicionados (ou registrados como pendentes) e push OK.
- [ ] Nota salva no Brain (id guardado) — ou registrada como pendente.
- [ ] `blog-publicados-2026.md` com a nova linha, commit+push OK.

## Relatório de publicação

Ao final, reportar exatamente neste formato:

```
✓ Publicado: <slug>
URL: https://blog.expertintegrado.com.br/blog/<slug>
Git: <commit hash>
Vercel: OK (HTTP 200)
Brain: nota <id>
Cross-links: <lista de slugs atualizados>
```

Se algum item ficou pendente, adicionar linha `Pendências: <descrição>` (ex.: cross-link de post inexistente, Brain em timeout).

## Erros comuns e recovery

| Erro | Ação |
|---|---|
| Gate 0.1 (veredicto) reprovado | ABORTAR. RETRABALHO MAIOR ou Segurança VERMELHO não publica. |
| Scanner (0.2) exit 1 sem justificativa | ABORTAR; devolver ao revisor / Eric com os matches VERMELHO. |
| `git pull` com conflito | Parar e reportar ao Eric. Não sobrescrever nem forçar. |
| `git push` rejeitado (non-fast-forward) | `git pull --rebase` e repetir o push. Se persistir conflito de conteúdo → resolver ou reportar. |
| HTTP 200 mas `grep -qiF` do título não bateu | NÃO declarar falha ainda. Confirmar VISUALMENTE com Playwright (`mcp__playwright__browser_navigate` na URL + `mcp__playwright__browser_snapshot`) que o título aparece na página. SE aparece → era só encoding/fragmento do grep, considerar publicado OK. SE não aparece → tratar como deploy incompleto (linha do 404). |
| Vercel HTTP 404 após ~180s | Sem acesso à Vercel nesta sessão (nenhuma tool Vercel em `allowed-tools`) — NÃO inventar leitura de build log. Validar localmente o frontmatter do MDX (campo faltando quebra o build do Astro) e reportar ao Eric o HTTP recebido + o que foi checado. SE `gh` disponível (`command -v gh`) → `gh run list --workflow=daily-rebuild.yml -R ericlucianoferreira/expertintegrado-blog` como diagnóstico adicional (só reflete rebuilds disparados, não o build nativo do push). NÃO seguir pro Passo 4. |
| Vercel HTTP 500 | Sem acesso à Vercel nesta sessão (fora de `allowed-tools`) — provável erro de build (import inválido, sintaxe MDX quebrada). Revisar o MDX localmente; se achar o erro, corrigir e fazer novo commit+push. Reportar ao Eric o HTTP + o que foi checado. SE `gh` disponível → checar o status da Action `daily-rebuild` como diagnóstico adicional. NÃO seguir pro Passo 4. |
| `curl` falha schannel (exit 35) | Já usar a flag `--ssl-no-revoke` (presente nos comandos acima). |
| Brain timeout | Tentar de novo 1x (D1 eventually consistent). Se falhar, registrar "Brain: pendente" e seguir. |
| Arquivo relacionado não existe | Pular o cross-link; registrar como pendente no relatório. Não abortar. |
| `python`/`python3` ausente no PATH | Usar o `$PY` resolvido nos Pré-requisitos (fallback: interpretador documentado do PC). |

## Como usar

Invocar por prosa ("publica o post", "sobe o artigo <slug>") ou pelo comando de skill:

```
/marketing:agente-publisher-blog

Slug: <slug>
Related: [<slug1>, <slug2>, ...]
Veredicto: APROVADO (Segurança VERDE)
Aprovador: <nome>

[MDX completo aprovado aqui]
```

O agente executa o pipeline completo (Passos 0–6) e devolve o relatório de publicação.
