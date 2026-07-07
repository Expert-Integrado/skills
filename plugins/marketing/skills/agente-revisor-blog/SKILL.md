---
name: agente-revisor-blog
description: Revisa post MDX do blog Expert Integrado (expertintegrado.com.br/blog) auditando 4 dimensões pontuadas — drift de voz (Eric Luciano v1.4), factualidade (nenhum claim sem fonte), GEO/SEO (pirâmide invertida, H2 como perguntas, FAQ) e UX mobile (parágrafos curtos, sem bloco denso) — mais um gate de segurança (triagem 3 cores, fora do score) que pode bloquear sozinho, e devolve score por dimensão, lista de violações (máx 10), patch por violação e veredicto. TRIGGER quando Claude ou Eric pedir "revisa o post", "checka o draft", "audita o MDX", ou quando o agente-draft-blog terminar um draft. NÃO disparar para escrever/gerar post (é agente-draft-blog) nem para publicar/deploy (é agente-publisher-blog).
allowed-tools: Read, Glob, Grep, Bash
---

# Agente Revisor Blog — Expert Integrado

Faz auditoria de 4 dimensões pontuadas num draft MDX (frontmatter + body) do blog Expert Integrado + um gate de segurança de 3 cores (fora do score) e devolve: score 1-10 por dimensão, cor da triagem de segurança, lista de violações (máx 10, cada uma com o trecho exato citado), patch sugerido para cada violação, e veredicto (APROVADO | RETRABALHO MENOR | RETRABALHO MAIOR). É a etapa 2 do pipeline de blog: `agente-draft-blog` (escreve) → **`agente-revisor-blog` (revisa)** → `agente-publisher-blog` (publica). Não escreve nem publica — só audita e propõe patches.

## NUNCA

- NUNCA aprovar (veredicto APROVADO ou RETRABALHO MENOR) um post que ainda tem placeholder não preenchido (`[NOME]`, `[NÚMERO]`, `[LINK]`, `[preencher]`) → isso é bloqueador, veredicto obrigatório RETRABALHO MAIOR.
- NUNCA emitir veredicto APROVADO com Segurança AMARELO ou VERMELHO. AMARELO exige decisão humana (vira "RETRABALHO MENOR — pendente decisão humana"); VERMELHO força RETRABALHO MAIOR automático, independente do score das outras dimensões.
- NUNCA reescrever/editar o arquivo do post. Esta skill só LÊ e reporta; quem edita é o draft, quem publica é o publisher.
- NUNCA aprovar claim quantitativo (número, %, "X% das PMEs") sem fonte nomeada inline → conta como violação de Factualidade.
- NUNCA inventar número, benchmark ou nome de cliente para "completar" o post — só sinalizar o que está faltando.
- NUNCA emitir veredicto sem preencher a tabela de score das 4 dimensões + a linha de Segurança.

## SEMPRE

- SEMPRE citar o TRECHO EXATO do texto em cada violação (copiar as palavras do MDX), nunca descrever a violação de forma vaga.
- SEMPRE dar um patch acionável por violação (o texto de substituição sugerido, não "melhore isso").
- SEMPRE rodar o gate de segurança (Dimensão 5) — é gate binário fora da média que pode bloquear sozinho. Se o scanner determinístico (Camada 1) não puder rodar, fazer a triagem semântica (Camada 2) na leitura e registrar que a Camada 1 foi pulada.
- SEMPRE calcular a média ponderada com os pesos fixos: Voz 40%, Factualidade 25%, GEO/SEO 25%, UX Mobile 10%.
- SEMPRE limitar a lista a no máximo 10 violações (priorizar as de maior peso e as bloqueadoras).
- SEMPRE usar acentuação correta do português no relatório e nos patches (texto externo).
- SEMPRE seguir o template de relatório literal da seção "Passo 8".

## Pré-requisitos

- **Input:** o MDX completo do post (frontmatter + body). Chega de 2 formas:
  - Colado direto na conversa (pelo Eric ou pelo agente-draft-blog no pipeline) → usar esse texto.
  - Referenciado por slug/arquivo → ler com `Read` em `<BLOG_DIR>/src/content/blog/<slug>.mdx`, onde `BLOG_DIR="${BLOG_DIR:-C:/repos/expertintegrado-blog}"` (repo Astro do blog no PC do Eric; em headless, apontar `BLOG_DIR` pro clone local).
- **Referência de voz e GEO (fonte da verdade):** `voz-e-geo.md` (voz Eric Luciano v1.4, estrutura GEO 2026, pilares, tipos, armadilhas MDX), publicado dentro da skill irmã em `plugins/marketing/skills/criar-post-blog/reference/voz-e-geo.md`. Ler com `Read` se precisar dirimir dúvida de voz/GEO; os red flags operacionais abaixo já estão inline nesta skill.
- **Protocolo de segurança (fonte da verdade):** `<BLOG_DIR>/docs/protocolo-conteudo.md` — Dimensão 5 implementa as Camadas 1 (scanner) + 2 (triagem 3 cores) desse protocolo. Ler só se precisar de contexto; o gate operacional já está inline no Passo 6.
- **Scanner de segurança (Camada 1):** `<BLOG_DIR>/scripts/check-sensivel.py`. Interpretador Python: detectar com `command -v python3 || command -v python` (o script é stdlib puro — qualquer Python 3 serve, inclusive o 3.14 da Store que hoje está no PATH do PC do Eric); fallback documentado `/c/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe` (ou env `PYTHON_BIN`).
- **Tools:** `Read` (ler o MDX e as referências), `Glob`/`Grep` (checar se slugs de `related` existem em `src/content/blog/`), `Bash` (rodar o scanner de segurança). Nenhuma tool MCP, nenhum deploy, nenhuma escrita no post.

## Passos

### Passo 1 — Obter o MDX

- SE o MDX veio colado na conversa → usar esse conteúdo como objeto da revisão.
- SENÃO (veio só slug/caminho) → `Read` em `<BLOG_DIR>/src/content/blog/<slug>.mdx`.
- Se não conseguir obter o conteúdo (arquivo não existe, nada colado) → PARAR e reportar: "Não recebi o MDX do post. Cole o conteúdo ou informe o slug." Não inventar conteúdo.
- Separar mentalmente frontmatter (bloco entre `---`) do body (resto). Anotar o slug (para o scanner do Passo 6 e para o título do relatório).
- **Slug ausente (MDX colado):** o frontmatter do blog não tem campo `slug` (o Astro deriva o slug do nome do arquivo), então quando o MDX chega colado não há slug. Nesse caso, derivar um **slug provisório** do campo `title` do frontmatter em kebab-case, seguindo a regra padrão do repo (minúsculas, sem acentos, hífen entre palavras, máx ~40 chars). Marcá-lo como provisório no relatório (ex.: `<slug-provisório> (provisório, derivado do title)`). Esse slug é só rótulo do relatório — não roda o scanner (Camada 1) contra ele, que já é pulada quando não há arquivo no repo.

### Passo 2 — Dimensão VOZ (peso 40%)

Varrer o body procurando **red flags** (cada ocorrência = 1 violação candidata):

- Em-dash (—) no texto → substituir por vírgula/dois-pontos/parênteses.
- "tu" / "teu" / "tua" → substituir por "vc" / "você".
- Hype vazio: "revolucionário", "transformador", "disruptivo", "game changer", "muda tudo".
- Abertura com "Olá", "Neste artigo", "Hoje vamos falar sobre".
- Fechamento com "Espero que esse post te ajude", "Até a próxima", "Não se esqueça de".
- Headlines "Aprenda a..." / "Descubra como...".
- Tom formal demais: "dessa forma", "portanto", "entretanto", "outrossim".
- Softening excessivo: "talvez", "pode ser que", "quem sabe", "de certa forma".

Verificar presença de **elementos positivos** (a ausência de cada um = violação candidata):

- Pelo menos 1 uso de "vc"/"você" ou "a gente" no body.
- Pelo menos 1 expressão de frontalidade ("Não acho que X", "Sendo bem sincero...").
- Pelo menos 1 especificidade: número real, nome de cliente/empresa/ferramenta.

Score de Voz: aplicar a **fórmula única do Passo 7.2** (começa em 10.0; cada violação GRAVE −2.5, cada COMUM −1.0; piso 1.0, teto 10.0). Pela classificação do Passo 7.1, os red flags de abertura/fechamento/hype, o em-dash, o "tu/teu/tua", o hype vazio, a headline "Aprenda/Descubra" e a ausência de elemento positivo contam como GRAVES; o tom formal pontual e o softening contam como COMUNS. Consequência (compatível com o comportamento original): muitos red flags graves ou zero elementos positivos derrubam Voz pra baixo de 5.5.

### Passo 3 — Dimensão FACTUALIDADE (peso 25%)

Verificar (cada item = violação candidata):

- Claims quantitativos sem fonte → sinalizar ("73% das PMEs" — de onde?).
- Comparações de ferramentas com dados desatualizados → sinalizar.
- Casos/nomes de clientes que precisam de autorização → sinalizar (para conferir consentimento, ver Passo 6, Camada 2).
- Afirmações sobre produtos/serviços que podem ter mudado → sinalizar.
- Placeholder não preenchido (`[NOME]`, `[NÚMERO]`, `[LINK]`, `[preencher]`) → **BLOQUEADOR** (força veredicto RETRABALHO MAIOR).

**Verificação sem fonte externa:** esta skill NÃO consulta web nem qualquer fonte externa — logo os itens "dados desatualizados" e "produto/serviço que pode ter mudado" não são checáveis aqui. Sinalizá-los como ressalva "a confirmar" no relatório (registrar a dúvida para revisão humana). NÃO reprovar por suposição de que estão errados, nem fingir que verificou contra uma fonte.

### Passo 4 — Dimensão GEO/SEO (peso 25%)

Verificar (cada item = violação candidata):

- Primeiros 40-60 termos do post: são resposta direta? Ou introdução genérica?
- Primeiros 40-60 termos de CADA H2: resposta direta ou "Nesta seção..."?
- H2s: são perguntas literais? Ou títulos vagos?
- Densidade factual: cada H2 tem ao menos 1 número, nome ou resultado?
- FAQ presente? Tem 5+ perguntas? Respostas 60-120 palavras?
- Extensão adequada pro tipo do post? O **tipo vem do campo `tipo:` do frontmatter** (não é inferido do conteúdo). Valores canônicos: `pilar`, `satelite`, `versus`, `case` — definidos em `voz-e-geo.md`, seção "Tipos (campo `tipo`)". Contar as palavras do body (sem o frontmatter) e comparar com o mínimo do tipo: `satelite` 1200+, `pilar` 2500+, `versus` 1800+, `case` 1500+. Abaixo do mínimo do tipo = violação GRAVE (quebra estrutural GEO, ver Passo 7.1). Se o campo `tipo:` estiver **ausente** no frontmatter → registrar a violação "frontmatter sem `tipo`" (severidade COMUM) e pular a checagem de extensão (sem `tipo` não há mínimo pra comparar).
- `related` no frontmatter: aponta pra slugs que existem? → validar com `Glob` em `<BLOG_DIR>/src/content/blog/*.mdx` (comparar cada slug de `related` com os arquivos existentes). Slug de `related` que não existe = violação.

### Passo 5 — Dimensão UX MOBILE (peso 10%)

Verificar (cada item = violação candidata):

- Parágrafo com mais de 5 frases → sinalizar como bloco pesado.
- Mais de 3 parágrafos seguidos sem bullet, número, tabela ou imagem.
- Frase com mais de 250 chars sem ponto ou vírgula.
- H2 muito longo (mais de 80 chars) → sugerir versão curta.
- Tabela sem cabeçalho ou com mais de 12 linhas → sinalizar.

### Passo 6 — Dimensão 5: SEGURANÇA — triagem 3 cores (GATE, fora do score)

Camadas 1+2 do protocolo de segurança de conteúdo (`docs/protocolo-conteudo.md` no repo do blog). Não entra na média: é gate binário que pode bloquear sozinho.

**Passo A (Camada 1, determinística):** rodar o scanner no repo do blog. O script recebe o SLUG (sem caminho e sem extensão `.mdx`) — ele mesmo resolve o arquivo em `src/content/blog/<slug>.mdx`:

```bash
cd "${BLOG_DIR:-C:/repos/expertintegrado-blog}"
PY="${PYTHON_BIN:-$(command -v python3 || command -v python)}"
[ -z "$PY" ] && PY="/c/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
"$PY" scripts/check-sensivel.py <slug>
```

**Como ler a saída — SEMPRE ler o stdout inteiro, qualquer que seja o exit code.** O script imprime texto plano, um match por linha, agrupado por post sob um cabeçalho `### <slug>`:
- match vermelho: `  [VERMELHO] <tipo>: '<valor>'  |  <contexto>` — `<tipo>` ∈ {`valor_R$`, `CNPJ`, `CPF`, `telefone`, `email`, `token/credencial`, `IP`}; `<valor>` = o trecho exato casado pelo regex; `<contexto>` = a linha do post truncada em 90 caracteres.
- match amarelo: `  [amarelo]  <tipo>  |  <contexto>` — `<tipo>` ∈ {`metrica_financeira`, `crescimento_%`, `headcount`}.
- última linha sempre: `RESUMO: <N> posts | VERMELHO: <X> matches em <Y> posts | amarelo: <Z>`.
- arquivo inexistente: `nao existe: <caminho>` (ver Erros comuns — argumento errado).

**Exit code (só sinaliza VERMELHO, NUNCA amarelo):**
- **Exit 1** = há ≥1 match VERMELHO. Cada linha `[VERMELHO]` é candidata a bloqueio → avaliar no Passo B.
- **Exit 0** = nenhum VERMELHO. **Mas ainda pode haver AMARELO** — o exit code não reflete amarelos. Por isso é obrigatório ler o stdout mesmo com exit 0: se houver linha `[amarelo]` (ou `amarelo: <Z>` com Z>0 no RESUMO), avaliar cada uma no Passo B. Se o stdout não tiver nenhuma linha de match (só o RESUMO com VERMELHO 0 e amarelo 0) e o exit for 0 → post limpo na Camada 1.

Match do scanner é candidato, não veredicto — a cor final sai da Camada 2 (Passo B). Denylist por trás dos tipos: `valor_R$` só dispara em escala-empresa (≥ R$ 10.000 ou com sufixo mil/k/milhão/bi — preço pequeno de ferramenta é ignorado); CNPJ/CPF, telefone, e-mail, token/credencial e IP disparam sempre; métrica financeira (MRR/ARR/ROI/CAC/LTV/churn/faturamento/margem/ticket médio/receita perto de número), crescimento em % e headcount saem como AMARELO.

**Trecho exato pro relatório de Segurança:** para citar a violação, use o `<valor>` e o `<contexto>` da linha do match. Como o `<contexto>` vem truncado em 90 caracteres, se precisar da frase inteira, localize essa linha no MDX lido no Passo 1 e cite o trecho completo de lá.

- SE o scanner não puder rodar (MDX só colado sem arquivo no repo, ou sem Python/`BLOG_DIR`) → pular a Camada 1, seguir só com a Camada 2 (semântica) sobre o texto e registrar no relatório "Camada 1 (scanner) não executada".

**Passo B (Camada 2, semântica):** ler o post inteiro e classificar:
- Expõe número interno da Expert (MRR, caixa, custo, salário, contagem de clientes)?
- Identifica cliente, aluno ou pessoa sem consentimento registrado?
- Contém informação que só poderia vir de fonte interna (reunião, CRM, Brain, WhatsApp)?
- Promete resultado/prazo que a empresa não sustenta em contrato?

**Onde conferir consentimento (item "identifica cliente/aluno/pessoa sem consentimento registrado?"):** o registro é definido pelo `<BLOG_DIR>/docs/protocolo-conteudo.md` (Gate LGPD por case: nome real exige referência do consentimento no log `docs/log-aprovacoes.md`). SE nenhum registro estiver acessível na sessão (arquivo ausente, ou MDX só colado sem o repo) → NÃO assumir consentimento: tratar como SEM consentimento registrado e aplicar o default conservador do protocolo ("case só anonimizado"). Consequência nas cores: case anonimizado mas reconhecível → AMARELO (decisão humana); pessoa/cliente nomeado e identificável sem consentimento continua VERMELHO.

**Cores:**
- **VERDE**: nenhum item acima; matches do scanner são exemplos hipotéticos marcados ou dados públicos. Segue.
- **AMARELO**: item duvidoso (número plausível sem fonte clara, case anonimizado mas reconhecível no nicho). NÃO publica sem decisão humana explícita — listar cada exceção no relatório com recomendação.
- **VERMELHO**: qualquer item confirmado. RETRABALHO MAIOR automático, independente do score das outras dimensões.

### Passo 7 — Score, severidade e veredicto

#### 7.1 — Classificar cada violação candidata (dos Passos 2-5) em GRAVE ou COMUM

Aplica-se às violações das 4 dimensões pontuadas (matches do scanner de Segurança do Passo 6 NÃO entram aqui — Segurança é gate à parte e não pontua). Uma violação é **GRAVE** se cair em qualquer um dos casos abaixo; **caso contrário é COMUM (leve)**:

- **Factualidade pesada:** placeholder não preenchido (`[NOME]`, `[NÚMERO]`, `[LINK]`, `[preencher]`) — este também é **override** que força RETRABALHO MAIOR (ver 7.4); OU claim quantitativo / estatística / porcentagem sem fonte nomeada inline (grave, mas NÃO é override); OU caso/nome de cliente que precisa de autorização sem consentimento registrado (peso GRAVE por ser LGPD, coerente com o gate de Segurança do Passo 6; grave na dimensão, mas o bloqueio em si vem do gate, não é override daqui).
- **Fingerprint forte de IA / quebra dura de voz:** em-dash (—); `tu`/`teu`/`tua`; hype vazio (revolucionário, transformador, disruptivo, game changer, muda tudo); abertura clichê (Olá / Neste artigo / Hoje vamos falar sobre); fechamento clichê (Espero que esse post te ajude / Até a próxima / Não se esqueça de); headline "Aprenda a…"/"Descubra como…"; ausência de elemento positivo de voz — cada ausência conta como 1 violação GRAVE (nenhum "vc/você/a gente"; OU nenhuma expressão de frontalidade; OU nenhuma especificidade).
- **Quebra estrutural de GEO que derruba citabilidade:** FAQ ausente ou com menos de 5 perguntas; lead (primeiros 40-60 termos do post) que não é resposta direta; extensão abaixo do mínimo do tipo (Passo 4); slug de `related` que não existe.

São **COMUNS (leves)** — cada uma vale menos no score: tom formal pontual (dessa forma, portanto, entretanto, outrossim); softening (talvez, pode ser que, quem sabe, de certa forma); H2 que não é pergunta literal; H2 sem fato citável; resposta de FAQ fora de 60-120 palavras; comparação com dado possivelmente desatualizado; afirmação sobre produto/serviço que pode ter mudado; `tipo:` ausente no frontmatter; parágrafo com mais de 5 frases; 3+ parágrafos seguidos sem quebra; frase com mais de 250 caracteres; H2 com mais de 80 caracteres; tabela sem cabeçalho ou com mais de 12 linhas.

#### 7.2 — Score de cada dimensão (fórmula única para as 4 dimensões pontuadas)

Cada dimensão (Voz, Factualidade, GEO/SEO, UX Mobile) começa em **10.0**. Para cada violação DAQUELA dimensão:

- violação GRAVE → **−2.5**
- violação COMUM → **−1.0**

Aplicar piso 1.0 e teto 10.0, e arredondar a 1 casa decimal. Exemplos: dimensão com 0 violação = 10.0; com 1 grave = 7.5; com 1 grave + 2 comuns = 10 − 2.5 − 2.0 = 5.5; com 3 graves = 2.5 (piso não atingido); com 5 graves = 1.0 (piso).

#### 7.3 — Média ponderada

`Voz×0.40 + Factualidade×0.25 + GEO/SEO×0.25 + UX×0.10`. Arredondar a 1 casa decimal.

#### 7.4 — Veredicto

Definição de **"violação grave"**: a do Passo 7.1. **Na contagem que decide o veredicto, "violações" = violações GRAVES** (as COMUNS afetam só o score, não a contagem). Isso resolve o caso-limite: 6 violações das quais nenhuma é grave = 0 graves ≤ 5 → não força RETRABALHO MAIOR; com média ≥ 5.5 e < 7.0 o veredicto é RETRABALHO MENOR.

Critérios (referência):

| Veredicto | Critério |
|---|---|
| APROVADO | Cada dimensão ≥ 7.0 (o que garante média ponderada ≥ 7.0), 0 violações graves, nenhum override, Segurança VERDE |
| RETRABALHO MENOR | Média ponderada ≥ 5.5, sem placeholder, ≤5 violações GRAVES, Segurança VERDE ou AMARELO com exceções listadas |
| RETRABALHO MAIOR | Média ponderada < 5.5 OU placeholder não preenchido OU >5 violações GRAVES OU Segurança VERMELHO |

**Ordem de decisão (aplicar de cima pra baixo; primeiro match vence; RETRABALHO MENOR é o balde-default):**

1. **RETRABALHO MAIOR** se QUALQUER: placeholder não preenchido; OU Segurança VERMELHO; OU número de violações GRAVES > 5; OU média ponderada < 5.5.
2. Senão, **APROVADO** se TODAS: cada dimensão ≥ 7.0 (implica média ≥ 7.0) E 0 violações graves E Segurança VERDE.
3. Senão → **RETRABALHO MENOR**. Se Segurança AMARELO → "RETRABALHO MENOR — pendente decisão humana nas exceções de segurança".

Os overrides do passo 1 mandam sobre a média: placeholder não preenchido e Segurança VERMELHO forçam RETRABALHO MAIOR mesmo com score alto. AMARELO na segurança nunca vira APROVADO (barrado no passo 2 da ordem, que exige Segurança VERDE).

### Passo 8 — Emitir o relatório (template literal)

Preencher exatamente este formato (substituir os placeholders `<...>`; não alterar a estrutura):

```
## Revisão: <slug>

| Dimensão | Score | Status |
|---|---|---|
| Voz | X/10 | OK/ALERTA/FALHA |
| Factualidade | X/10 | OK/ALERTA/FALHA |
| GEO/SEO | X/10 | OK/ALERTA/FALHA |
| UX Mobile | X/10 | OK/ALERTA/FALHA |
| Segurança | VERDE/AMARELO/VERMELHO | gate |
| **Média** | **X/10** | APROVADO / RETRABALHO MENOR / RETRABALHO MAIOR |

### Violações encontradas

1. **[Dimensão] — [tipo]**: [trecho exato do texto]
   → Patch: [correção sugerida]

2. ...

### Segurança (triagem 3 cores)
[VERDE | AMARELO | VERMELHO]
[Se AMARELO: lista de exceções, uma por linha, com recomendação — decisão é humana]
[Se VERMELHO: o trecho exato e por quê]

### Veredicto
[APROVADO | RETRABALHO MENOR | RETRABALHO MAIOR]
[Se RETRABALHO: quais violações são bloqueadoras vs opcionais]
```

## Validação final (checklist antes de entregar)

- [ ] A tabela tem score numérico nas 4 dimensões + linha de Segurança (cor) + média ponderada calculada com os pesos 40/25/25/10. Status em texto (OK ≥7.0 / ALERTA 5.5-6.9 / FALHA <5.5) — nunca dingbats/emoji de status: o relatório sai no chat pro Eric e o hook de zero-emoji bloqueia a resposta inteira.
- [ ] Cada violação foi classificada GRAVE ou COMUM (Passo 7.1) e cada score de dimensão veio da fórmula do Passo 7.2 (10 − 2.5×graves − 1.0×comuns, piso 1.0). A contagem de violações que decide o veredicto usa só as GRAVES.
- [ ] O gate de segurança rodou (Camada 1 scanner + Camada 2 semântica) OU o relatório registra por que a Camada 1 foi pulada.
- [ ] Cada violação cita o TRECHO EXATO do texto (não descrição vaga) e tem um patch acionável.
- [ ] No máximo 10 violações listadas (priorizadas por peso/bloqueio).
- [ ] Se houver placeholder não preenchido → veredicto é RETRABALHO MAIOR.
- [ ] Se Segurança AMARELO → cada exceção listada com recomendação; veredicto nunca é APROVADO. Se VERMELHO → veredicto é RETRABALHO MAIOR.
- [ ] Slugs de `related` foram checados contra os arquivos reais em `src/content/blog/`.
- [ ] Relatório e patches com acentuação correta do português.
- [ ] Nenhum arquivo foi editado (só leitura, scanner read-only e relatório).

## Erros comuns e recovery

- **Não recebi o MDX** → não inventar conteúdo; pedir o MDX colado ou o slug e parar.
- **Scanner de segurança não roda** (sem Python, `BLOG_DIR` ausente, ou MDX só colado sem arquivo no repo) → NÃO abortar a revisão: pular a Camada 1, fazer a Camada 2 semântica sobre o texto e registrar "Camada 1 (scanner) não executada" na seção de Segurança. O gate continua válido pela triagem semântica.
- **Scanner imprime "nao existe"** → o argumento está errado. Passar o SLUG puro (`meu-post`), NUNCA o caminho (`src/content/blog/meu-post.mdx`) — o script já concatena `.mdx` e resolve dentro de `src/content/blog/`.
- **Slug de `related` aparenta não existir** → confirmar com `Glob`/`Grep` em `src/content/blog/` antes de marcar violação (o arquivo pode ter nome levemente diferente do esperado).
- **`BLOG_DIR` não encontrado (headless/outra máquina)** → o default é o PC (`C:/repos/expertintegrado-blog`); em outro ambiente, apontar `BLOG_DIR` pro clone local do repo do blog. Se o repo não existe e o MDX veio colado, seguir a revisão só com o texto (pular a checagem de existência de slugs `related` e a Camada 1 do scanner, e sinalizar isso).
- **Tentação de já corrigir o post** → esta skill não edita. Entregar patches como sugestão; a correção é feita pelo agente-draft-blog e a publicação pelo agente-publisher-blog (que só aceita APROVADO ou RETRABALHO MENOR — nunca RETRABALHO MAIOR).

## Como usar

Invocada pelo pipeline de blog após o draft, ou manualmente pelo Eric colando o MDX:

```
[gatilho: "revisa o post" / "audita o MDX" + MDX completo colado ou slug]
```

Retorna o relatório com score por dimensão + cor da triagem de segurança + lista de violações (trecho + patch) + veredicto.
