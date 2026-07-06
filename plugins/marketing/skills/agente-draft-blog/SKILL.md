---
name: agente-draft-blog
description: Escreve post completo em MDX pra o blog expertintegrado.com.br/blog. Recebe outline (título, tipo, pillar, H2s, FAQ, CTA) e produz MDX com voz Eric Luciano v1.4 + GEO 2026 + schema JSON-LD. TRIGGER quando Claude pedir pra escrever draft de post do blog da Expert ou quando Eric pedir "escreve o post X", "draft do artigo Y", "gera o MDX de Z". NÃO dispara pra publicar/deployar post (isso é agente-publisher-blog) nem pra decidir pauta/tema (isso é criar-post-blog/pauta-semanal) — esta skill só ESCREVE o MDX a partir de um outline já definido.
---

# Agente Draft Blog — Expert Integrado

Produz um post `.mdx` completo a partir de um outline, seguindo a voz Eric Luciano v1.4, as regras GEO 2026 e a estrutura do blog Astro em `expertintegrado.com.br/blog`. A skill NÃO salva arquivo, NÃO faz git, NÃO deploya — ela retorna o MDX pronto pra colar em `src/content/blog/<slug>.mdx` (a publicação é da `agente-publisher-blog`).

## Camada 0 — Segregação de fontes (PROTOCOLO DE SEGURANÇA, inegociável)

Causa-raiz do vazamento de 28/06: fonte envenenada. O escritor NÃO toca fonte interna. Protocolo completo: `docs/protocolo-conteudo.md` no repo do blog.

**Fontes PERMITIDAS durante a escrita:**
- O outline recebido (input explícito)
- Posts já publicados do blog (`src/content/blog/`)
- Documentação PÚBLICA de produto (site, catálogo público de preços)
- Conhecimento geral de domínio + dados públicos com fonte citável

**Fontes PROIBIDAS durante a escrita (NUNCA consultar pra escrever post):**
- Expert Brain (`recall`/`get_note`) — o vault contém financeiro, pessoal e dados de clientes
- Memória local do agente (`memory/*.md`) e transcrições de reuniões/aulas
- Pipedrive, WhatsApp, e-mails — dados de clientes e leads
- Qualquer número interno da Expert (MRR, caixa, salários, custos, contagem de clientes)

Se o outline pedir dado interno: deixar `[preencher]` e sinalizar no output — quem preenche e aprova é humano. Case com nome real só com consentimento registrado; default é anonimizado; exemplo hipotético SEMPRE marcado como hipotético no texto.

**Tags comerciais (critério objetivo — quando incluir):** incluir as tags `objecao:<slug>` e `setor:<slug>` no frontmatter SOMENTE quando o outline sinaliza explicitamente uma objeção de venda, ou seja: o outline traz um campo de objeção, OU o `titulo`/algum H2 está literalmente redigido como uma objeção de comprador. Objeções típicas (referência dos slugs já em uso): `objecao:preco` ("é caro?"), `objecao:sem-tempo` ("não tenho tempo"), `objecao:da-pra-fazer-sozinho` ("dá pra fazer sozinho?"), `objecao:sem-equipe-tecnica` ("não tenho equipe técnica"), `objecao:meu-setor-e-diferente` ("meu setor é diferente"), `objecao:medo-dados-lgpd` ("e a LGPD/meus dados?"), `objecao:momento-errado` ("é o momento errado?"). NÃO inferir objeção de um tema que só tangencia vendas: sem sinal explícito no outline → não adicionar essas tags.
- `objecao:<slug>` = kebab-case da objeção (ex.: `objecao:sem-tempo`).
- `setor:<slug>` = kebab-case do setor QUANDO o outline nomear um (ex.: `setor:educacao`, `setor:imobiliaria`, `setor:farmacia`); se o outline não nomear setor, usar `setor:geral` (nunca inventar um setor específico). Esta regra do `setor:` (incluindo o fallback `setor:geral`) só vale DENTRO do caso de objeção descrito acima: os dois tags entram sempre JUNTOS, como par `objecao:`+`setor:`. Sem sinal explícito de objeção no outline, NENHUM dos dois é adicionado — nem `setor:geral`; a skill nunca emite `setor:` isolado. (Coerente com a skill comercial `blog-comercial`, que grava `tags: ["objecao:<slug>", "setor:<slug>"]` sempre em par e cujo índice organiza os posts por pares objeção+setor.)

## NUNCA

- Consultar fonte interna pra escrever (Expert Brain, memory, Pipedrive, WhatsApp, e-mails, números internos da Expert): ver **Camada 0**, protocolo de segurança inegociável.
- Em-dash (—) na prosa. Substituir por vírgula, dois-pontos, parênteses ou "..".
- `tu` / `teu` / `tua`. Sempre `vc` / `você`.
- Hype vazio: "revolucionário", "transformador", "disruptivo", "muda tudo", "game changer".
- Abertura tipo "Olá, tudo bem?" ou "Neste artigo vamos explorar...".
- Fechamento tipo "Espero que esse post te ajude" ou "Até a próxima".
- Headlines clichê: "Aprenda a..." / "Descubra como...".
- `kkk` / `rs` (too casual pra blog).
- Emojis (proibido em blog).
- Inventar métrica, nome de cliente ou fonte. Sem dado real → deixar `[preencher]` e sinalizar; nunca fabricar número.
- Parágrafo de 1 frase só, nem de 10 frases.

## SEMPRE

- Acentuação correta do português em TODO o texto do post (cedilha, til, agudos/graves/circunflexos).
- Pirâmide invertida: os primeiros 40-60 termos do post E de cada H2 respondem a pergunta DIRETAMENTE.
- H2s como perguntas literais que o ICP digita no ChatGPT/Google.
- Densidade factual: cada H2 com ao menos 1 fato (número, nome de cliente/ferramenta, resultado ou fonte).
- FAQ no fim: 5-8 pares `**Pergunta?**` + resposta autocontida de 60-120 palavras.
- Import do `InlineCta` relativo (`../../components/InlineCta.astro`), nunca `@/`.
- Respeitar a faixa de palavras do tipo do post (ver "Extensão por tipo").

## Pré-requisitos

- **Input:** um outline (ver "Input esperado" abaixo). Sem outline, pedir os campos faltantes antes de escrever.
- **Voz/GEO:** todas as regras estão inline nesta skill (seções "Regras de voz" e "Regras GEO"). Não depende de arquivo externo.
- **Destino do MDX (informativo, a skill NÃO escreve o arquivo):** repo do blog `expertintegrado-blog`, posts em `src/content/blog/<slug>.mdx`. No PC do Eric: `C:\repos\expertintegrado-blog` (repos vivem em `C:\repos`, fora do `$HOME`). A gravação/publicação é da `agente-publisher-blog`.
- **Componente disponível no repo:** `src/components/InlineCta.astro` (importado como `../../components/InlineCta.astro`).

## Input esperado

Outline com:
- `slug`: kebab-case do post
- `titulo`: H1 do post
- `pillar`: produtividade | vendas | vibe-coding | lideranca
- `tipo`: pilar | satelite | versus | case
- `description`: meta description (1-2 frases)
- `tags`: array de tags
- `related`: slugs de posts relacionados
- `h2s`: lista de H2s como perguntas + bullet points de cobertura
- `faq`: 5-8 perguntas frequentes
- `cta`: título e descrição do InlineCta
- `pubDate`: data de publicação (YYYY-MM-DD)

**Campos derivados pela skill (NÃO vêm prontos no outline, não pedir ao solicitante):** `heroImage`, `heroAlt`, `readingTime` e `ctaLabel` (atributo do `<InlineCta>` no corpo). Cada um tem regra fixa no Passo 3 ("Como preencher os campos derivados"). O `slug` usado nas fórmulas de `heroImage`/`heroAlt`/`readingTime` é o do próprio outline; o `ctaLabel` deriva do `cta.titulo` do outline.

**Campos que, faltando, TRAVAM a geração:** `slug`, `titulo`, `pillar`, `tipo`. Faltou qualquer um → pedir ao solicitante antes de gerar (única exceção: `pillar`/`tipo` podem ser inferidos pela regra abaixo).

**`pubDate` ausente:** aplicar o Passo 4 (não chutar data).

**`pillar`/`tipo` ausentes — quando INFERIR vs quando PERGUNTAR (critério objetivo):**
Inferir e seguir (registrando o valor no relatório de pendências) SÓ quando o tema/título casa com EXATAMENTE UM valor pelas tabelas abaixo. Se casar com zero, ou com dois-ou-mais, ou ficar ambíguo → PARAR e perguntar ao solicitante (não chutar).

`pillar` — casar o tema com um destes grupos de palavra-chave:
- `vendas`: venda, lead, funil, prospecção, SDR, objeção de compra, CRM, follow-up, WhatsApp comercial.
- `produtividade`: automação de rotina, e-mail, relatório, triagem, ganho de tempo, operação, ferramentas do dia a dia.
- `vibe-coding`: criar app/skill/ferramenta com IA sem ser dev, Claude Code, Lovable, escrever código.
- `lideranca`: gestão de equipe, cultura, decisão estratégica, orçamento, contratação, OKR.

`tipo` — pelos sinais estruturais do título/outline:
- `versus`: título no formato "X vs Y" ou "X ou Y".
- `case`: título descreve um resultado obtido por alguém num prazo ("como <quem> fez X em <prazo>", "caso ...").
- `pilar`: guia abrangente/fundacional do tema (outline com 12+ H2s ou pedido de cobertura completa).
- `satelite`: recorte específico de um subtema. É o default quando não é `versus`, `case` nem `pilar`.

## Output

Devolver DOIS blocos nesta ordem, e nada mais:

1. **O MDX completo** dentro de um bloco de código ` ```mdx `, pronto pra colar em `src/content/blog/<slug>.mdx`. Não salvar arquivo, não fazer git (isso é da `agente-publisher-blog`). Todo dado ausente aparece como o literal `[preencher]` no lugar exato (nunca inventar número/nome/fonte).
2. **O relatório de pendências**, em texto normal FORA do bloco de código, começando com o cabeçalho literal `## Pendências e sinalizações` e com um bullet por item:
   - Cada `[preencher]` do MDX: onde está (nome do campo do frontmatter OU título exato do H2) + qual dado falta.
   - `pillar`/`tipo` inferidos pela skill (quando não vieram no outline) ou enum autocorrigido: valor final + motivo em 1 linha.
   - Data de publicação escolhida (quando `pubDate` não veio no outline): a data + como foi obtida.
   Se não houver nenhum item, escrever uma única linha: `Sem pendências.`

Sempre que qualquer passo desta skill mandar "sinalizar no output" ou "avisar no relatório", o destino é ESTE bloco 2 (nunca comentário dentro do MDX, nunca texto solto em outro lugar).

## Passo 1 — Ler o outline e travar os parâmetros

- Extrair `slug`, `titulo`, `pillar`, `tipo`, `description`, `tags`, `related`, `h2s`, `faq`, `cta`, `pubDate`.
- Validar `pillar` ∈ {produtividade, vendas, vibe-coding, lideranca} e `tipo` ∈ {pilar, satelite, versus, case}. Valor fora do enum → corrigir pro mais próximo e sinalizar, ou pedir.
- Definir a faixa de palavras-alvo pelo `tipo` (ver "Extensão por tipo").
- Se `tipo` for `versus` ou `case`, usar a estrutura especial correspondente (seções abaixo).

## Passo 2 — Escrever o corpo aplicando voz + GEO

Escrever cada parte na estrutura MDX (Passo 3), respeitando as regras de voz e GEO abaixo. Para cada H2 do outline: primeiros 40-60 termos = resposta direta à pergunta do H2; depois desenvolver; garantir 1+ fato na seção. Toda fonte de dado obedece a **Camada 0** (só o que é permitido).

### Regras de voz (INEGOCIÁVEIS)

#### O que MANTER sempre
- `"a gente"`, `"pra"`, `"vc"`, `"você"`, `"sacou?"`, `"bora"`, `"faz sentido?"`
- `"Sendo bem sincero..."` como marcador de honestidade contra interesse próprio
- Auto-ironia funcional: "sou zero em marketing", "rodei isso num fim de semana"
- Frontalidade: "Não acho que X. Pq Y." — nunca hedge suave
- Especificidade: nome de cliente real, número exato, caso concreto
- Empoderamento: "vc consegue" > "vamos fazer por vc"

#### Adaptações pra escrita longa (vs WhatsApp)
- Frase pode crescer pra 130-250 chars (não 80 de chat)
- Parágrafo: 2-5 frases, nunca 1 só, nunca 10
- Bullet list onde fala curta cabe
- Caixa-alta em palavra-chave (máx 1-2 por post, nunca em bloco)

(O que NUNCA aparece está no bloco `## NUNCA` no topo.)

### Regras GEO (obrigatórias)

#### Pirâmide invertida (REGRA DURA)
Os **primeiros 40-60 termos** do post E de cada seção H2 = resposta DIRETA à pergunta.

Anti-padrão: "A inteligência artificial é uma tecnologia que vem..."
Padrão: "Triagem de e-mail com IA economiza ~45min/dia em CEO de PME. Funciona em 3 passos: X, Y, Z."

#### H2s como perguntas literais
Espelhar exatamente o que o ICP digita no ChatGPT ou Google.

Errado: "Configuração avançada do agente"
Certo: "Como configurar um agente que responde no WhatsApp em <5min sem virar spam?"

#### Densidade factual (1+ por seção — vale pra TODO tipo: pilar, satelite, versus e case)
Cada H2 precisa de ao menos UMA de:
- Número/métrica específica
- Nome de cliente ou ferramenta
- Resultado mensurável
- Citação de fonte verificável

**De onde tirar o fato de cada H2 (ordem fixa, mesma pra todos os tipos):**
1. Usar um fato que o outline JÁ traz pra aquele H2.
2. Se o outline não traz, considerar um fato de domínio público atribuível a uma fonte pública citável (permitido pela Camada 0: estatística/fato amplamente conhecido, NUNCA número interno da Expert). Antes de citar qualquer fato assim, seguir esta árvore:
   - SE `WebSearch`/`WebFetch` estiver disponível na sessão → verificar o fato numa fonte pública ANTES de citar e citar a fonte no texto (nome da fonte + ano ou link). Só entra no post depois de verificado.
   - SENÃO (sem WebSearch/WebFetch na sessão) → escrever `[preencher: fato + fonte]` no lugar do fato e sinalizar no relatório de pendências.
   - NUNCA citar fato de memória sem verificação: o conhecimento do modelo pode estar desatualizado ou errado. Ler posts publicados ou documentação pública continua PERMITIDO (Camada 0), é OPCIONAL e só serve pra fato já público — não substitui a verificação da fonte citável.
3. Se o único fato que caberia for um número interno da Expert ou um cliente/métrica específico que não está no outline → escrever `[preencher]` no lugar do fato e listá-lo no relatório de pendências. NUNCA inventar e NUNCA consultar Brain/Pipedrive/memory/WhatsApp (Camada 0).

Falta de fato NÃO trava a entrega: o caminho é sempre `[preencher]` + sinalizar, nunca parar pra pedir mais dado.

#### FAQ obrigatório
5-8 perguntas que o ICP faz no ChatGPT/Perplexity sobre o tema.
Cada resposta: 60-120 palavras, autocontida.
Formatar como `**Pergunta?**` seguido do parágrafo de resposta.

## Passo 3 — Montar o MDX no template

Preencher o template abaixo. Trocar cada `[...]` e `<...>` pelo conteúdo real; não deixar placeholder no output final (exceto `[preencher]` de métrica sem dado, que deve ser sinalizado).

```mdx
---
title: "<título>"
description: "<meta description 1-2 frases>"
pubDate: YYYY-MM-DD
pillar: produtividade|vendas|vibe-coding|lideranca
tipo: pilar|satelite|versus|case
status: published
heroImage: "/images/<slug>-hero.webp"
heroAlt: "Ilustração editorial em tons de azul representando o artigo: <título>"
readingTime: "<N> min de leitura"
tags: [<tags>]
related: [<slugs>]
---

import InlineCta from '../../components/InlineCta.astro';

<p class="lead">[Parágrafo de abertura sem "Olá" — gancho forte, número ou situação real. 80-120 palavras.]</p>

[Parágrafo de contexto rápido antes do primeiro H2, 60-100 palavras]

## [H2 como pergunta literal 1]

[Resposta direta nos primeiros 40-60 termos. Depois desenvolver. 150-250 palavras com 1+ fato.]

## [H2 como pergunta literal 2]

[Idem...]

[InlineCta no meio do post, depois de 3-4 H2s:]

<InlineCta
  title="[Título do CTA — específico pro tema]"
  description="[Descrição 1-2 frases]"
  ctaLabel="[Ação clara]"
/>

## [Continua H2s...]

## Perguntas frequentes

**[Pergunta 1 — literal do ICP]?**

[Resposta 60-120 palavras, autocontida, referencia o post ou context específico]

**[Pergunta 2]?**

[...]

[Mais 3-6 FAQs...]

[Parágrafo de fechamento (2-3 frases). Usa "Bora testar?" ou "Faz sentido?" ou "Me conta no WhatsApp se rodou". Nunca "Espero que..."]
```

### Como preencher os campos derivados

Estes campos NÃO vêm prontos no outline: a skill os gera por regra fixa (mesma convenção dos posts já publicados). `heroImage`, `heroAlt` e `readingTime` vão no frontmatter; `ctaLabel` é atributo do `<InlineCta>` no corpo. Preencher normalmente (não são `[preencher]`, salvo o caso de `ctaLabel` abaixo):

- **`heroImage`**: sempre `/images/<slug>-hero.webp` (extensão `.webp`, usar o `slug` do outline). A skill não gera a imagem em si; quem produz é `gerar-hero-blog`/publisher. O caminho é determinístico, então preencher direto.
- **`heroAlt`**: sempre o texto fixo `Ilustração editorial em tons de azul representando o artigo: ` seguido do `título` completo do post. Não descrever a cena nem inventar imagem: é essa fórmula literal, sempre.
- **`readingTime`**: `<N> min de leitura`, onde `N = arredonda(total_de_palavras / 225)`, mínimo 1. Contar as palavras do CORPO do post (todo o texto após o frontmatter, incluindo H2s e FAQ); excluir o frontmatter, a linha `import` e as tags de componente `<InlineCta ...>`. Arredondar pro inteiro mais próximo. Exemplos reais: 1308 palavras → 6; 1678 → 7; 1999 → 9.
- **`ctaLabel`** (atributo do `<InlineCta>` no corpo, não é frontmatter): derivar do `cta.titulo` do outline como um verbo de ação curto (ex.: título `Diagnóstico gratuito` → `ctaLabel` `Agendar diagnóstico`). Se não der pra derivar com segurança um rótulo de ação a partir do `cta.titulo`, usar `[preencher]` e listá-lo no relatório de pendências.

### Extensão por tipo
- Satélite: 1200-2500 palavras
- Versus: 1800-2800 palavras (incluir tabela comparativa)
- Case: 1500-2500 palavras (estrutura: problema, abordagem, resultados, o que não funcionou)
- Pillar: 2500-4000 palavras (12-18 H2s)

### Estrutura especial: VERSUS (só quando `tipo: versus`)

```
H1: "X vs Y: qual usar em <contexto específico>"
↓ TL;DR honesto: "Use X se A; use Y se B; nenhum se C"
H2: O que é X (1 parágrafo)
H2: O que é Y (1 parágrafo)
H2: Tabela comparativa escaneável (8-12 linhas)
H2: Quando X ganha (com case ou número)
H2: Quando Y ganha (com case ou número)
H2: Quando nenhum dos dois resolve
H2: O que eu (Eric) uso e por quê
↓ CTA: diagnóstico WhatsApp
↓ FAQ
```

Tom: consultor imparcial. Se vender o próprio produto: "isso aqui é o que eu vendo, por isso minha opinião tem viés — mas eis o que aprendi".

### Estrutura especial: CASE STUDY (só quando `tipo: case`)

```
H1: "<resultado tangível> em <prazo>: como <quem> aplicou <método>"
H2: O problema (números reais: tempo gasto, custo, dor)
H2: A abordagem (método passo a passo, sem ocultar trade-offs)
H2: Os resultados (métrica vs baseline)
H2: O que NÃO funcionou (frontalidade — sem isso parece propaganda)
H2: O que aprendi / depoimento
↓ CTA: diagnóstico WhatsApp
↓ FAQ
```

Case sem número real fornecido no outline → deixar `[preencher]` na métrica e avisar no relatório; nunca inventar resultado. Nome real de cliente só com consentimento registrado (Camada 0); default é anonimizado.

## Passo 4 — Definir a data de publicação (se não vier no outline)

Só executar se `pubDate` NÃO veio no outline. Nunca decidir a data às cegas: descobrir quais datas já estão em uso e pegar a próxima livre.

1. Localizar o repo do blog: usar a env `BLOG_DIR` se estiver definida, senão o default `${BLOG_DIR:-C:/repos/expertintegrado-blog}` (no PC do Eric é `C:\repos\expertintegrado-blog`; repos vivem em `C:\repos`, fora do `$HOME`). Listar e ler o frontmatter dos posts publicados em `$BLOG_DIR/src/content/blog/*.mdx` e coletar o valor de `pubDate` de cada um. Ler posts publicados é fonte PERMITIDA (Camada 0).
2. Cadência-alvo: seg/qua/sex, dentro da janela 2026-06-24 a 2026-11-30, começando em 2026-06-25.
3. `pubDate` = a PRIMEIRA data dessa cadência (seg/qua/sex, a partir de 2026-06-25) que ainda NÃO apareça em nenhum `pubDate` coletado no passo 1. Registrar no relatório de pendências qual data foi escolhida.
4. Se `$BLOG_DIR` (ou o default) não existir na máquina, ou não der pra ler os posts publicados (repo indisponível) → deixar `pubDate: [preencher]` e sinalizar no relatório como parada legítima (sem os posts publicados não há como descobrir a próxima data livre da cadência). Nunca chutar nem inventar uma data.

## Passo 5 — Autocheck antes de entregar

Rodar esta checklist no MDX gerado. Qualquer item que falhar → corrigir antes de devolver.

- [ ] Nenhum dado veio de fonte proibida (Camada 0): sem Brain/memory/Pipedrive/WhatsApp/e-mail nem número interno da Expert.
- [ ] Zero em-dash (—) na prosa (é o erro mais comum — procurar e eliminar).
- [ ] Zero emoji, zero `tu/teu/tua`, zero palavra de hype.
- [ ] Acentuação correta em todo o texto.
- [ ] Abertura sem "Olá"/"Neste artigo"; fechamento sem "Espero que"/"Até a próxima".
- [ ] Import do `InlineCta` é relativo (`../../components/InlineCta.astro`), nunca `@/`.
- [ ] Primeiros 40-60 termos do post e de cada H2 respondem direto (pirâmide invertida).
- [ ] Cada H2 tem ao menos 1 fato (número, nome, resultado ou fonte).
- [ ] FAQ com 5-8 pares `**Pergunta?**` + resposta de 60-120 palavras.
- [ ] Contagem de palavras dentro da faixa do `tipo`.
- [ ] Se o post responde objeção de venda, tem tags `objecao:<slug>` e `setor:<slug>` no frontmatter.
- [ ] Frontmatter completo (title, description, pubDate, pillar, tipo, status, heroImage, heroAlt, readingTime, tags, related) — sem placeholder não preenchido, exceto `[preencher]` de métrica/dado ausente (sinalizado). `heroImage` termina em `.webp`; `heroAlt` segue a fórmula fixa; `readingTime` = arredonda(palavras/225).
- [ ] Nenhum `<` solto nem `{...}` solto na prosa (quebra o parser MDX).

## Erros comuns e recovery

| Sintoma | Ação |
|---|---|
| Outline pede dado interno (MRR, nome de cliente, custo) | Deixar `[preencher]` e sinalizar no output; quem preenche/aprova é humano. NUNCA consultar Brain/Pipedrive/memory/WhatsApp pra escrever (Camada 0). |
| Outline sem `slug`/`titulo`/`pillar`/`tipo` | Pedir os campos faltantes antes de gerar. `pillar`/`tipo` só podem ser inferidos pelo critério objetivo de "Input esperado" (casar com EXATAMENTE um valor); se casar com zero ou dois-ou-mais, perguntar. |
| Case sem número real | Deixar `[preencher]` na métrica e avisar explicitamente no relatório. Nunca inventar. |
| Em-dash sobrando após autocheck | Reescrever a frase com vírgula, dois-pontos, parênteses ou ".." — não trocar por hífen simples se muda o sentido. |
| `related` com slug inventado | Não inventar slug; usar só os que vieram no outline. Se vazio, deixar `related: []`. |
| Post ABAIXO da faixa de palavras do tipo | 1º) aprofundar os H2s que JÁ vieram no outline (mais desenvolvimento e mais fatos permitidos em cada um), nunca remover nem reordenar os H2s do outline. 2º) só se ainda estiver abaixo do piso, criar H2 novo: redigido como pergunta literal do ICP, dentro do pillar/tema do post, com 1+ fato (ou `[preencher]`), sem dado inventado. |
| Post ACIMA da faixa de palavras do tipo | Enxugar a prosa. Nunca cortar um H2 do outline nem um H2 obrigatório da estrutura versus/case. |

## Como usar

```
/marketing:agente-draft-blog

[outline do post aqui]
```

O agente lê o outline e retorna o MDX completo, pronto pra salvar em `src/content/blog/<slug>.mdx`.
