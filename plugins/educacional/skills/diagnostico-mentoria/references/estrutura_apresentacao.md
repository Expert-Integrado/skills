# Estrutura do Plano de Ação (PPTX) — 12 slides

Calibrada a partir do `Plano_Acao_Marcelo_Coelho.pptx`. O template em `assets/plano_acao_template.pptx` traz os layouts, fontes e cores prontos. O script `scripts/build_plano_acao_pptx.py` clona esse template e substitui o conteúdo de cada slide.

Todos os slides são 16:9, fundo escuro. O label superior pequeno "PLANO DE AÇÃO" aparece em ciano em todos os slides de conteúdo. O título grande aparece em fonte Play branca, com uma linha ciano fina logo abaixo. Detalhes de paleta e tipografia em `paleta_visual.md`.

---

## Slide 1 — Capa

| Elemento | Conteúdo | Estilo |
|---|---|---|
| Label superior | `EXPERT INTEGRADO` | Arial 8.5pt bold, cor `#3F3F46` (cinza escuro, discreto) |
| Título principal (2 linhas) | `Plano de ação` / `[Nome do aluno]` | Play 41pt bold, branco `#FAFAFA` |
| Linha decorativa | Linha horizontal ciano fina | — |
| Subtítulo | `[Razão social ou nome da empresa]` | Arial 17pt cinza `#A1A1AA` |
| Subtítulo 2 | `Mentoria Automações Inteligentes` | Arial 17pt cinza `#A1A1AA` |
| Tag de prioridade (2 linhas em destaque ciano) | Ex.: `Dashboard pedagógico primeiro.` / `Comercial e conteúdo em sequência.` | Play 17pt bold ciano `#06B6D4` |

A tag de prioridade resume o gargalo central em duas frases curtas. É o gancho da apresentação.

---

## Slide 2 — O que entendemos do negócio

| Elemento | Conteúdo |
|---|---|
| Título | `O que entendemos do negócio` |
| Bullets (3 a 4) | Frase curta para cada frente do negócio. Marcador ciano. |
| Bloco de stats (3 colunas) | 3 números marcantes do diagnóstico, cada um com label curto |

Exemplo do Marcelo:
- `41h` aprox. mapeadas em rotinas semanais com potencial de padronização
- `15h` dedicadas à construção do dashboard
- `3` frentes de negócio que precisam conversar entre si

Cada número usa uma cor diferente: roxo `#8B5CF6`, ciano `#06B6D4`, verde `#10B981`. Use os números mais marcantes do diagnóstico (horas, frentes, ferramentas atuais, equipe, etc.).

---

## Slide 3 — Gargalo central

| Elemento | Conteúdo |
|---|---|
| Título | `Gargalo central` |
| Frase âncora | Frase de uma linha que resume o gargalo. Play 21pt bold branca. |
| Bullets (4 a 5) | Os pontos do gargalo. Marcador ciano. |

Frase âncora exemplo: `O desafio não é falta de produto. É arquitetura de processos.`

A frase âncora é o que o aluno vai lembrar. Construa cuidadosamente.

---

## Slide 4 — Por que [a prioridade nº1] vem primeiro

| Elemento | Conteúdo |
|---|---|
| Título | `Por que [a prioridade] vem primeiro` |
| 4 cards numerados | Cada card: número ciano, mini-título Play bold, descrição em cinza |
| Frase de fechamento | `Decisão de prioridade: [frase].` Play 18pt bold ciano. |

Os 4 cards seguem o padrão: 1) Já está em andamento, 2) Maior carga semanal, 3) Prova de valor, 4) Base comercial. Adapte os títulos ao caso, mas mantenha 4 razões e a mesma lógica de "por que essa frente agora".

---

## Slide 5 — Estrutura recomendada de [projeto-âncora]

| Elemento | Conteúdo |
|---|---|
| Título | `Estrutura recomendada do dashboard` (ou nome do projeto-âncora) |
| Bullets (4) | Princípios da estrutura. Marcador ciano. |
| Frase final | Pergunta-chave em verde `#10B981`, Play 18pt bold |

A pergunta-chave traduz a finalidade do projeto: para o caso Marcelo, "que evidência ajuda a escola a perceber valor e continuar avançando?". É a pergunta que orienta as decisões do projeto-âncora.

---

## Slide 6 — Roadmap 7 / 30 / 60 / 90 dias

| Elemento | Conteúdo |
|---|---|
| Título | `Roadmap 7 / 30 / 60 / 90 dias` |
| 4 cards numerados | Cada card: número ciano, prazo em Play, descrição em cinza |

Mesma estrutura do roadmap do DOCX, condensada para uma linha por horizonte.

---

## Slide 7 — Aulas para começar agora

| Elemento | Conteúdo |
|---|---|
| Título | `Aulas para começar agora` |
| Lista numerada (6 a 8 itens) | Cada item: número ciano (01-08), nome da aula em branco bold, uma linha de descrição em cinza, link "abrir" em verde no canto |

Aulas da primeira fase. Use os 6-8 primeiros itens da trilha. Sempre incluir o link clicável "abrir" verde.

---

## Slide 8 — Aulas para segunda etapa

| Elemento | Conteúdo |
|---|---|
| Título | `Aulas para segunda etapa` |
| Lista numerada (4 a 6 itens) | Mesmo formato do slide 7, mas com numeração 09-12+ |
| Frase de fechamento | `Sequência recomendada: [...]` Play 20pt bold branca |
| Mini-frase de apoio | Em cinza, justificando por que segunda etapa |

Aulas da segunda fase. Continua a numeração do slide 7.

---

## Slide 9 — Recursos da plataforma

| Elemento | Conteúdo |
|---|---|
| Título | `Recursos da plataforma` |
| Bullets (4 a 6) | Cada bullet: nome do recurso em bold + descrição. Marcador ciano. |
| Dois botões de link | `Catálogo de Plugins` (ciano) e `Catálogo Lovable` (verde) |

Plugins, skills, MCPs e templates Lovable selecionados. Mesma seleção do DOCX.

---

## Slide 10 — Recorrências da mentoria

| Elemento | Conteúdo |
|---|---|
| Título | `Recorrências diárias` |
| Frase âncora | `Usar as recorrências como ambiente de aceleração prática.` Play 21pt |
| Bullets (4 a 5) | O que levar para os encontros. Marcador ciano. |

Padrão de uso da mentoria — separar este slide do roadmap é importante para reforçar que recorrência é onde a implementação acontece.

---

## Slide 11 — Próximos passos

| Elemento | Conteúdo |
|---|---|
| Título | `Próximos passos` |
| 4 cards numerados | Cada card: número, ação em Play bold, descrição em cinza |
| Frase de fechamento | `Foco inicial: [frase].` Play 18pt bold ciano |

Os 4 cards seguem o padrão: 1. Acessar, 2. Listar dados, 3. Validar [algo], 4. Implementar. Adaptar verbos ao caso, mas manter cadência de quatro ações concretas.

---

## Slide 12 — Encerramento

| Elemento | Conteúdo |
|---|---|
| Label superior | `Expert Integrado` em cinza muito escuro |
| Frase de encerramento (3 linhas) | Frase impactante começando com "Agora é..." | Play 36pt bold branca |
| Linha decorativa | Linha ciano fina |
| Fechamento em cinza | Frase explicativa que conecta diagnóstico → próxima fase | Arial 15pt cinza |

Exemplo do Marcelo: `Agora é transformar` / `o dashboard em prova` / `de valor.`

A frase de encerramento amarra o slide 1 (capa) com a entrega concreta da mentoria.

---

## Como o script substitui o conteúdo

O script `build_plano_acao_pptx.py` recebe um JSON estruturado com o conteúdo de cada slide e clona `assets/plano_acao_template.pptx` substituindo texto a texto, preservando layout, fontes e cores. Estrutura do JSON em `scripts/build_plano_acao_pptx.py` (variável `EXEMPLO_PAYLOAD` no rodapé do arquivo).
