---
name: agente-publisher-blog
description: Publica post MDX aprovado no blog expertintegrado.com.br/blog. Salva arquivo em src/content/blog/, faz git commit+push, aguarda Vercel deploy, salva nota no Expert Brain, e atualiza cross-links nos posts relacionados. TRIGGER quando Claude ou Eric pedir "publica o post", "faz o deploy do artigo", "sobe o post" após revisão aprovada.
---

# Agente Publisher Blog — Expert Integrado

Skill que executa pipeline completo de publicação: arquivo → git → Vercel → Brain → cross-links.

## Quando ativar

- Draft foi aprovado pelo `agente-revisor-blog`
- Eric pede "publica o post", "faz o deploy do artigo", "sobe o post"
- Pipeline batch terminou batch de revisão com APROVADO

## Pré-requisito

Post deve ter sido revisado pelo `agente-revisor-blog` com veredicto APROVADO ou RETRABALHO MENOR. Nunca publicar com RETRABALHO MAIOR.

## Input esperado

1. `slug`: identificador do post
2. MDX aprovado (conteúdo completo)
3. `related`: lista de slugs dos posts relacionados (pra cross-link inverso)

## Pipeline de publicação

### Passo 1: Salvar arquivo MDX

```
Salvar em: C:\repos\expertintegrado-blog\src\content\blog\<slug>.mdx
```

Verificar que:
- Frontmatter está completo (title, description, pubDate, pillar, tipo, status: published)
- Import do InlineCta presente se usado
- Sem placeholders não preenchidos

### Passo 2: Git commit + push

```bash
cd C:\repos\expertintegrado-blog
git add src/content/blog/<slug>.mdx
git commit -m "feat(blog): post <slug>

Publish: <título curto>
Pillar: <pillar>
Tipo: <tipo>"
git push
```

Verificar que o push foi bem-sucedido antes de continuar.

### Passo 3: Aguardar Vercel deploy

Aguardar ~60s após o push. Então verificar via Playwright:
```
https://expertintegrado.com.br/blog/<slug>
```

Verificar:
- HTTP 200 ✓
- Título aparece na página
- CSS carregou (sem layout quebrado)

### Passo 4: Atualizar cross-links nos posts relacionados

Para cada slug em `related`:

1. Ler arquivo `src/content/blog/<slug-relacionado>.mdx`
2. Verificar se o frontmatter `related` já inclui o novo slug
3. Se não inclui: adicionar o novo slug ao array `related`
4. Salvar arquivo atualizado
5. Commit individual: `fix(blog): cross-link bidirecional <slug-relacionado> ↔ <slug-novo>`

Após todos os cross-links:
```bash
git push
```

### Passo 5: Salvar nota no Expert Brain

```
mcp__expert-brain__save_note(
  title: "Post publicado: <título>",
  kind: "fact",
  domains: ["marketing", "ai-applied"],
  body: "Post #X do blog Expert Integrado publicado em 2026-MM-DD.
URL: https://expertintegrado.com.br/blog/<slug>
Pillar: <pillar> | Tipo: <tipo>
Keyword alvo: <kw>
Posts relacionados: <lista de slugs>
Cross-links atualizados: <lista>",
  tldr: "Blog post '<título>' publicado em expertintegrado.com.br/blog/<slug>"
)
```

### Passo 6: Atualizar index de publicados

Verificar se existe `outputs/blog-publicados-2026.md` no repo expert-brain.
Se não existe: criar.
Se existe: adicionar linha:

```
| <#> | <slug> | <pillar> | <tipo> | <pubDate> | https://expertintegrado.com.br/blog/<slug> |
```

## Relatório de publicação

Ao final, reportar:

```
✓ Publicado: <slug>
URL: https://expertintegrado.com.br/blog/<slug>
Git: <commit hash>
Vercel: OK (HTTP 200)
Brain: nota <id>
Cross-links: <lista de slugs atualizados>
```

## Como usar

```
/lab:agente-publisher-blog

Slug: <slug>
Related: [<slug1>, <slug2>, ...]

[MDX completo aprovado aqui]
```

O agente executa o pipeline completo e reporta resultado.

## Tratamento de erros

| Erro | Ação |
|---|---|
| Git push falha | Investigar conflito, resolver, retomar do push |
| Vercel HTTP 404 | Verificar build logs, checar frontmatter do MDX |
| Vercel HTTP 500 | Checar erros de build (import inválido, sintaxe MDX) |
| Brain timeout | Tentar novamente (Brain D1 eventually consistent) |
| Arquivo relacionado não existe | Skip cross-link, registrar no relatório como pendente |
