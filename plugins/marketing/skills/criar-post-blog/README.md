# criar-post-blog

Escreve um post completo e pronto pra publicar no blog da Expert Integrado (`expertintegrado.com.br/blog`), na voz do Eric (Voice Guide v1.4) e na estrutura GEO 2026.

## O que faz
- Cria o `.mdx` em `C:\repos\expertintegrado-blog\src\content\blog\` com o frontmatter correto (pillar, tipo, tags, related, takeaways).
- Aplica a estrutura GEO: resposta-primeiro no lead, H2 como pergunta, 1+ fato por seção, FAQ obrigatória (5-8 perguntas) que vira FAQPage schema no build.
- Exige 1 visual por post (diagrama SVG on-brand ou screenshot) — fecha o gap de imagem.
- Valida com `npm run build` e faz deploy manual na Vercel (`--token`), porque o blog não tem auto-deploy do GitHub.

## Gatilhos
"escreve um post pro blog", "cria um artigo sobre X", "novo post de blog", "post pilar/versus/case sobre Z".

## Não confundir
- Hub pessoal `ericluciano.com.br` → não é aqui.
- Roteiro de vídeo → `criar-script`.

## Referência
`reference/voz-e-geo.md` — voz do Eric v1.4, estrutura GEO 2026, pilares, tipos e armadilhas de MDX.
