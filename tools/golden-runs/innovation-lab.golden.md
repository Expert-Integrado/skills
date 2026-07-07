# Golden run — lab:innovation-lab

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário (escopo A2):** validação de bindings + detecção de fase contra a edição REAL Play55 (ciclo completo rodado em produção 15-20/06, base de evidência da própria skill). Zero side-effect: nenhuma pasta/lista/card/doc criado (todos os writes da skill são gated por confirmação, e o ciclo de escrita já tem evidência de produção).
- **Resultado: APROVADO no escopo, com 1 defeito composto corrigido.** Workspace resolvido na ordem prescrita (G: candidato 2 OK); árvore canônica confere (Edicoes_Customizadas/{Suno,Play55}, Playbook_Interno.md); bundles docs/PADRAO-DECK-ABERTURA.md + docs/DEPLOY.md presentes no repo; IDs ClickUp conferem contra a hierarquia real — space 90131750441 ✓ (nome real tem typo "AI Inovvation Labs", inofensivo: a skill usa ID), pasta Modelo 90133239966 ✓ com lista "Modelo de Timeline de Projeto", convenção "Timeline de Projeto - <Cliente>" confirmada em Play55 e Odery.

## Achados e fixes (lab 3.10.8)

1. **Estrutura real do Play55 diverge da convenção prescrita (DEFEITO composto, medido).** A edição que a skill cita como base de evidência NÃO tem `00_Inputs/` (nem os arquivos-gatilho), usa `02_Estrutura_Dor_e_Municao_Lab.md`, `04_Desafios/`, `05_Relatorio_Entrega/`, e não tem `SESSAO.md`/`CLAUDE.md`/`clickup_log.md`. Três consequências que o executor literal sofreria: (a) "continua a imersão do Play55" → detecção por arquivo-gatilho classificaria a imersão CONCLUÍDA como "pré-imersão aguardando onboarding"; (b) detecção de fase ignorava entregáveis; (c) idempotência da Fase 2 depende de `clickup_log.md` — inexistente no Play55 apesar de 20 cards na lista → em retomada, "nada logado" e o lote seria reproposto inteiro. Fix: bloco "Edições LEGADAS são pré-convenção" — retomada legada entra pelo HANDOFF.md + mapeamento por conteúdo; detecção de fase considera entregáveis (relatorio.html → pós-imersão); idempotência em retomada confere as tasks reais da lista, não só o log local.

## Observações (não-defeito)

- Estrutura padrão continua válida INTEGRAL pra edições novas (FASE 0 é quem a cria) — o fix não rebaixa a convenção, só reconhece o legado.
- Space real com typo "AI Inovvation Labs" no ClickUp — se algum dia alguém buscar por nome em vez de ID, não acha; a skill acerta ao fixar IDs.
- Clones do Modelo sem renomear a lista existem (Ox Dealer, Caio Aguero mantêm "Modelo de Timeline de Projeto"; Arqplast/Euphoria usam "Projetos") — reforça a regra da skill de criar exatamente 1 lista com o nome na convenção.
- Fases de escrita (FASE 0 ClickUp, FASE 2 cards, FASE 5 deploy): evidência de produção Play55 + gates internos; não re-executadas pra não poluir o space real (sem delete_folder no MCP).
