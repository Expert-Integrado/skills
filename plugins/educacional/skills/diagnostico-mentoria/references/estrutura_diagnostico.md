# Estrutura dos Diagnósticos (DOCX) — Interno e Cliente

Esta é a estrutura exata calibrada a partir do material do Marcelo Coelho. As duas versões compartilham o esqueleto. A diferença é que a Interna tem três seções a mais (Recomendações para Eric, Roteiro da apresentação, Pontos de atenção internos) e tom mais analítico.

---

## Tabela de seções

| # | Seção | Versão Interna | Versão Cliente | Observação |
|---|---|---|---|---|
| 1 | Capa e identificação (nome, empresa, CNPJ, e-mail, setor, faturamento, folha, equipe, nível IA) | Sim | Sim | Tabela. No interno, inclui "Status do acesso" e "E-mail registrado no chat". |
| 2 | Síntese executiva | Sim | Sim | 3-6 frases. Negócio + gargalo + projeto-âncora. |
| 3 | Fontes e escopo do diagnóstico | Sim | Sim, enxuto | Lista as fontes usadas (call, chat, formulário). |
| 4 | Formulário de diagnóstico reconstituído | Sim | Sim | Tabela com dados objetivos. |
| 5 | Diagnóstico consultivo consolidado | Sim | Sim, mais curto | Análise integrada de negócio. |
| 5.1 | Gargalo central | Sim | Sim | 4-6 bullets. |
| 5.2 | Justificativa da prioridade | Sim | Sim | 1-2 parágrafos. Frase "Decisão de prioridade:" em destaque. |
| 6 | Frentes de negócio (tabela) | Sim | Sim | Tabela: frente / descrição / oportunidade de IA. |
| 7 | Mapa de atividades por área e horas/semana (tabela) | Sim | Sim | Tabela: atividade / área / horas / potencial. Inclui linha de total. |
| 8 | Resultados esperados pelo cliente (tabela) | Sim | Sim | Tabela: o que o cliente declarou / leitura consultiva do CS. |
| 9 | Maturidade em dimensões (tabela 1-5) | Sim | Não | Tabela: dimensão / nota 1-5 / justificativa. Só interno. |
| 10 | Riscos e como mitigar (tabela) | Sim | Não | Tabela: risco / mitigação. Só interno. |
| 11 | Prioridades de implementação (tabela ordenada) | Sim | Sim | Tabela: prioridade / frente / objetivo / entrega esperada. |
| 12 | Por que a prioridade nº1 vem primeiro (tabela) | Sim | Sim | Tabela: motivo / implicação. |
| 13 | Estrutura recomendada do projeto-âncora | Sim | Sim | Ex.: para dashboard, lista de categorias de indicadores. |
| 14 | Perguntas estratégicas do projeto-âncora (tabela) | Sim | Sim | Tabela: pergunta / por que importa. |
| 15 | Trilha de aulas recomendada (tabela com links) | Sim | Sim | Tabela: ordem / aula / curso / aplicação direta / link. |
| 16 | Recursos da plataforma recomendados (tabela com links) | Sim | Sim | Tabela: etapa (agora/depois/escala) / recurso / categoria / por que / link. |
| 17 | Roadmap 7/30/60/90 dias (tabela) | Sim | Sim | Tabela: prazo / foco / ações / entregas. |
| 18 | Participação nas recorrências da mentoria | Sim | Sim | Bullets curtos do que levar para os encontros. |
| 19 | Recomendações para Eric e acompanhamento interno (tabela) | Sim | **Não** | Tabela: ponto de atenção / recomendação interna. |
| 20 | Mensagem sugerida para WhatsApp | Sim | Não | Bloco de texto pronto para copiar. |
| 21 | Roteiro da apresentação ao aluno | Sim | Não | Bullets numerados — passo a passo da reunião de devolutiva. |

---

## Capa e cabeçalho

**Interno** começa com:
```
Diagnóstico Interno de Automação Inteligente
[Nome] - [Empresa]
Documento de uso interno para registro, acompanhamento e consulta futura
```

**Cliente** começa com:
```
Diagnóstico Inicial de Automação Inteligente
[Nome] - [Empresa]
```

Nada de "Diagnóstico Final". O Vanderson foi explícito: é inicial.

---

## Tabela de identificação (Seção 1)

**Interno:**
| Campo | Valor |
|---|---|
| Cliente | [nome] |
| Empresa | [empresa] |
| CNPJ | [cnpj ou "Não informado"] |
| E-mail registrado no chat da call | [email] |
| Setor | [setor] |
| Faturamento anual informado | [faixa] |
| Folha mensal informada | [valor] |
| Equipe operacional direta | [tamanho] |
| Nível de IA | [básico/intermediário/avançado] |
| Status do acesso | [descrição do que foi feito na call sobre o portal] |

**Cliente:** mesma tabela, sem o "Status do acesso".

---

## Síntese executiva (Seção 2)

Modelo:

> [Nome] possui um negócio [descrição em 1 linha — tipo de negócio + diferencial]. A operação atua em [N] frentes: [lista das frentes].
>
> [Frase do gargalo central, começando com "O gargalo atual não está em X. O desafio está em Y."] [Frase do projeto-âncora — "Como [nome] já está [fazendo X], este deve ser o primeiro projeto prático da mentoria."]

---

## Frentes de negócio (Seção 6)

| Frente de negócio | Descrição | Oportunidade de automação/IA |
|---|---|---|
| [Nome da frente] | [O que é, para quem, como funciona] | [O que IA/automação pode resolver nessa frente] |

Sempre 2 a 4 frentes. Se o aluno só tem uma operação, divida-a por função (operação, comercial, conteúdo).

---

## Mapa de atividades (Seção 7)

| Atividade | Área | Horas/semana aproximadas | Potencial de automação |
|---|---|---|---|
| [Tarefa] | [Comercial/Marketing/Operação/Gestão/Tecnologia] | [N]h | [Alto / Médio-alto / Médio / Baixo] |
| **Total mapeado** | — | **~[N]h** | Prioridade de padronização |

Sempre incluir a linha de total — é um dos números fortes da síntese.

---

## Resultados esperados (Seção 8)

| Resultados esperados registrados | Leitura consultiva |
|---|---|
| [Frase exata do que o aluno declarou na call/formulário] | [Análise do CS: o que isso requer estruturalmente] |

A "Leitura consultiva" é onde o Vanderson agrega valor. Não copie a declaração — interprete.

---

## Maturidade (Seção 9 — só interno)

| Dimensão | Nota sugerida (1-5) | Justificativa |
|---|---|---|
| Maturidade em IA | [nota] | [1 frase] |
| Clareza de proposta de valor | [nota] | [1 frase] |
| Organização de dados | [nota] | [1 frase] |
| Processo comercial | [nota] | [1 frase] |
| Potencial de ganho com automação | [nota] | [1 frase] |
| Capacidade de implementação | [nota] | [1 frase] |

Use notas com casa decimal (3,5 / 4,5). Justificativa em 1 frase só.

---

## Riscos (Seção 10 — só interno)

| Risco | Como mitigar |
|---|---|
| [Risco identificado a partir das falas/atividades] | [Recomendação concreta] |

Sempre 4 a 6 riscos. Não invente — derive da call.

---

## Prioridades de implementação (Seção 11)

| Prioridade | Frente | Objetivo | Entrega esperada |
|---|---|---|---|
| 1 | [Nome da frente prioritária] | [Frase de objetivo] | [Entrega tangível] |
| 2 | [...] | [...] | [...] |

Sempre 5 prioridades. Ordenadas.

---

## Trilha de aulas (Seção 15)

| Ordem | Aula | Curso/Módulo | Aplicação direta | Link |
|---|---|---|---|---|
| 1 | [Nome exato da aula] | [Curso conforme catálogo] | [Por que essa aula faz sentido para esse aluno] | [Hyperlink "Abrir aula"] |

Use `references/catalogo_recursos.md` para puxar nomes exatos e URLs.

Coluna "Aplicação direta" deve ser **específica do aluno** — não genérica. Errado: "Aprender prompt". Certo: "Melhorar comandos para gerar relatórios pedagógicos e propostas comerciais".

---

## Recursos da plataforma (Seção 16)

| Etapa | Recurso | Categoria | Por que usar | Link |
|---|---|---|---|---|
| Agora / Depois / Escala | [Nome] | Skill / MCP / Template Lovable / Agentes | [Frase específica] | [Hyperlink no catálogo correspondente] |

A coluna "Etapa" só aceita três valores: `Agora`, `Depois`, `Escala`.

---

## Roadmap 7/30/60/90 (Seção 17)

| Prazo | Foco | Ações | Entregas |
|---|---|---|---|
| 7 dias | Ativação e foco | [...] | [...] |
| 30 dias | [Foco da primeira fase] | [...] | [...] |
| 60 dias | [Foco da segunda fase] | [...] | [...] |
| 90 dias | [Foco da terceira fase] | [...] | [...] |

Sempre 4 linhas. Foco é uma expressão curta (2-4 palavras). Ações e entregas são frases.

---

## Recomendações para Eric (Seção 19 — só interno)

| Ponto de atenção | Recomendação interna |
|---|---|
| [Algo que o Eric precisa saber para o acompanhamento] | [Como agir] |

Pelo menos 4 linhas. Foco em: o que evitar, o que orientar, o que monitorar.

---

## Roteiro da apresentação (Seção 21 — só interno)

Lista numerada com 6-8 passos do que o Vanderson vai dizer ao aluno na reunião de devolutiva. Sempre fecha com "três próximos passos objetivos".

Modelo:

1. Abrir reforçando que o diagnóstico foi construído a partir da call e do formulário já preenchido.
2. Mostrar o entendimento do negócio.
3. Apresentar a decisão de prioridade.
4. [...]
8. Fechar com três próximos passos objetivos: [a, b, c].
