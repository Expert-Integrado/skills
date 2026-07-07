# Referência — Voz do Eric (v1.4) + Estrutura GEO 2026

Base técnica de todo post do blog Expert Integrado. Leia antes de escrever.

## Voz do Eric Luciano (Voice Guide v1.4)

**Usar:**
- `vc`, `você`, `a gente`, `pra`, `pro`, `tá`, `sacou?`, `bora`
- Frase curta. Ritmo de quem fala, não de quem disserta.
- Posição com argumento: o Eric defende o ponto de vista dele com dado, não com hype.
- Acentuação correta SEMPRE (cedilha, til, agudo, circunflexo). Texto externo nunca vai sem acento.

**NUNCA:**
- Travessão / em-dash (`—`). Use vírgula, dois-pontos, parêntese ou ponto. Esta é a regra mais violada — confira no fim.
- `tu`, `teu`, `tua` (é sempre `você`/`seu`).
- Palavra de hype: "revolucionário", "game-changer", "incrível", "transformador", "disruptivo", "poderoso".
- Emoji. Nenhum, em lugar nenhum.
- Conselho genérico ("escreva código limpo", "siga boas práticas", "invista em IA"). Sempre concreto e específico ao contexto de PME brasileira.

**Quem é o leitor:** empresário/CEO de PME brasileira, não-técnico. Explica pro leigo, mas sem subestimar. O blog é sobre IA aplicada pra ganhar tempo e clareza, sem virar refém da tecnologia.

## Estrutura GEO 2026 (Generative Engine Optimization)

O objetivo é ser **citado por IA** (ChatGPT, Perplexity, AI Overviews) além de rankear no Google. Regras:

1. **Pirâmide invertida — resposta primeiro.** Os primeiros 40-60 termos do post (o `<p class="lead">`) já entregam a resposta direta da pergunta-título. Nada de aquecimento. O LLM extrai esse bloco como claim citável.
2. **H2 em forma de pergunta literal.** Cada seção começa com a pergunta que o leitor digitaria ("Por que a integração manual falha?", "Quando n8n é a escolha certa?"). Espelha intenção de busca.
3. **1+ fato citável por H2.** Cada seção tem pelo menos um dado concreto: número, estatística com fonte nomeada, prazo, preço em real. Fato com fonte ("estudo da Harvard Business Review mostra que...") é o que a IA cita com atribuição.
4. **FAQ obrigatória, 5-8 perguntas.** Seção `## Perguntas frequentes` (ou `## FAQ`) no fim, cada resposta de 60-120 palavras. É o formato que answer engines mais citam direto — e o build converte automaticamente em FAQPage schema (JSON-LD). NÃO pule.
5. **Tabela HTML pra comparação.** Em posts `versus` e `pilar`, use tabela markdown (vira `<table>` estilizada). Tabela > prosa > imagem pra extração por LLM. Nunca dado só em imagem.
6. **Takeaways no frontmatter** (3-4): viram o box "Em resumo" no topo + `abstract` no schema. Cada um é um claim autocontido, ≤140 caracteres, que um LLM cita sozinho.

## Pilares (campo `pillar`)

| Slug | Label | Sobre |
|---|---|---|
| `produtividade` | Produtividade com IA | Devolver horas do CEO: triagem de inbox, resumo de reunião, relatório automático |
| `vendas` | Automação Comercial | Super SDR, qualificação no WhatsApp, follow-up, CRM que se preenche |
| `vibe-coding` | Vibe Coding | IA construindo software pra quem não é dev: prompt, agente, MCP, ferramenta interna |
| `lideranca` | Liderança Agêntica | Liderar empresa onde metade do trabalho é IA: o que automatizar, cultura, orçamento |

## Tipos (campo `tipo`)

- `pilar` — guia-cornerstone profundo (3-5k palavras), referência do pilar.
- `satelite` — post focado num subtema, linka pro pilar.
- `versus` — comparativo (X vs Y vs Z), tabela obrigatória, recomendação por contexto.
- `case` — caso real com números (antes/depois, resultado medido).

## Armadilhas de MDX (quebram o build)

- `<` solto na prosa (ex: "menos de 500ms") vira tag JSX inválida → escreva `&lt;500ms` ou reescreva ("abaixo de 500ms").
- `{algo}` solto vira expressão JSX indefinida → embrulhe em backticks: `` `{nome}` ``.
- O import do componente é **relativo**, nunca alias: `import InlineCta from '../../components/InlineCta.astro';`. O alias `@/components` NÃO resolve e quebrou o build em 34 posts uma vez.
