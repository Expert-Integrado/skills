# Budget — lógica, metas e alocação

Verba **na campanha (CBO)** é o padrão Meta atual e o que esta skill usa por default. O Meta distribui
entre os conjuntos. Só use ABO (verba por conjunto) se o João pedir controle por conjunto.

> No MCP, budget vai em **centavos** e na **moeda da conta (BRL)**. R$25/dia = `2500`. Sempre leia
> `min_daily_budget_cents` em `ads_get_ad_accounts` antes de definir — abaixo do mínimo é rejeitado.

## Metas da Expert (âncoras de viabilidade)

Da memória `expert-integrado-metricas` e `canais-e-mix-marketing`:
- Meta de leads: **1.058/mês** · Meta de vendas: **16/mês**
- CTR (ads): **>1%** · Conversão LP: **>5%** · ROAS: **>3x**
- CPL histórico Super SDR: **R$2,88–12,18** (melhor volume ~R$4) — use como baseline B2B.

## CPL/CAC aceitável por produto (regra de leitura)

Quanto maior o ticket, mais CPL você tolera. Faça sempre a conta na Fase 1:

| Produto | Ticket | CPL aceitável (ordem de grandeza) | Lógica |
|---|---|---|---|
| Cursos R$97 | R$97 | baixo — foco em **ROAS >3x** e CPA < margem | compra direta; só escala o que paga |
| Agentes IA | R$1-3K | CPL médio (dezenas de R$) | lead → proposta; conversão da call manda |
| Super SDR | ~R$1.8K/mês | CPL R$4-15 ok (baseline real) | recorrente; LTV alto justifica |
| Mentoria | R$18-24K | CPL **alto** ok (centenas de R$ se o lead for quente) | ticket altíssimo; qualidade > volume |

Não invente CPL "esperado" como promessa — use como **alvo de viabilidade** e diga que é estimativa
a validar nos primeiros dias.

## Quanto a verba define estrutura e criativos

Regra prática de quantos conjuntos/criativos a verba sustenta (cada conjunto precisa de volume pra
sair do aprendizado — mire ~50 eventos de otimização/semana por conjunto):

| Verba diária | Estrutura sugerida | Criativos |
|---|---|---|
| R$20-40/dia | 1 campanha, **1 conjunto** (broad/Advantage+) | 2-3 estáticos |
| R$50-100/dia | 1 campanha CBO, **2 conjuntos** (broad + 1 vertical/interesse) | 3-4 estáticos + 1 vídeo |
| R$150-300/dia | 1 campanha CBO, **2-3 conjuntos** | 4-6 criativos, vídeo incluído |
| R$300+/dia | CBO + considerar conjunto de remarketing/lookalike | 6+ criativos, múltiplos formatos |

Não fragmentar verba em muitos conjuntos pequenos — mata o aprendizado. Na dúvida, **menos conjuntos,
mais criativos dentro deles**.

## Regra 70/20/10 (quando o João pensar em escala/portfólio)

- 70% no que comprovadamente performa, 20% em variações do que funciona, 10% em aposta nova.
- Aplica-se mais quando já há histórico — em campanha nova, comece concentrado e leia os dados.

## Período

- Campanha nova precisa de **fase de aprendizado** (~7 dias / ~50 conversões por conjunto) antes de
  julgar. Recomende rodar pelo menos 7 dias antes de cortar/escalar.
- Se o João der verba **total** (lifetime), exige `end_time` no conjunto (ver `meta-config.md`).

## Sugestão padrão quando o João não define verba

Para um teste inicial honesto: **R$50/dia, 7 dias (R$350)**, 1 campanha CBO, 1-2 conjuntos, 3-4
criativos. Ajuste pelo produto (mentoria suporta mais; curso R$97 pode começar igual e escalar por ROAS).
