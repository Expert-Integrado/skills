# Golden run — lab:mentoria-equipe-seg-16h

- **Data:** 06/07/2026 (segunda, ~23h) · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "prep mentoria equipe" com dados REAIS — logs desta máquina (7d e 8-14d), universo real de MCPs/skills, pauta salva no Drive, lembrete Outlook criado de verdade. Card ClickUp: rota de fallback exercitada (sem MENTORIA_LIST_ID e MCP sem default list → pular e reportar, conforme regra 3 do 7b).
- **Resultado: APROVADO, ciclo completo, com 2 defeitos corrigidos.** Passo 1: coleta real (Read 25.085, Bash 23.316, pipedrive get_deal 2.694; skills: estou-devendo 13x, triagem-matinal 6x, pipe-review 5x); trend 8-14d comparado (recall do Brain 3.255→550); universo 1.3 conferido (11 MCPs + skills do cache); Passo 2: gap por observação absoluta N=1 (calendly = 0 usos na semana, agendamento de diagnóstico ainda manual); Passo 3: recall trouxe munição de verdade (link oficial s50efdayhuw1, válvula de escape 905j4winjwky, princípio do gate de confirmação 36rnk6nrk93g); Passos 4-6: pauta no template exato + exercício derivado do SKILL.md REAL da calendly-agendar (triggers verbais, sem flags inventadas) + material sem slides (critério objetivo: gap de fluxo de texto); Passo 7: pauta salva em `Pautas/2026-07-13-pauta.md`, card pulado com report, compromisso Outlook 13/07 15:45 criado (link retornado).

## Entregável real

- Pauta: `G:/Meu Drive/claude-workspace/Workspace/Educacional/Mentoria_Equipe_Interna/Pautas/2026-07-13-pauta.md` (aproveitável pra segunda 13/07 — tema calendly-agendar; Eric pode regenerar com dados mais frescos no dia)
- Compromisso Outlook real: "Mentoria Equipe 16h — pauta pronta", 13/07 15:45-16:00, mostrar_como=free

## Achados e fixes (lab 3.10.9)

1. **Cálculo da data-alvo ignora a HORA (DEFEITO temporal, reproduzido ao vivo).** Rodada numa segunda às 23h: `offset=(8-dow)%7 = 0` → DATA = HOJE, com a aula das 16h já passada — pauta retroativa + lembrete Outlook 15:45 no passado. Fix: guarda de hora no 7a (segunda com hora >= 16 BRT → offset=7, próxima segunda) + troca do `TZ='America/Sao_Paulo'` por `TZ='BRT3'` (achado transversal: IANA não resolve no Git Bash sem tzdata — a skill ainda tinha o TZ IANA que as outras 7 já corrigiram).
2. **`C:/repos/skills` e `C:/repos/ericluciano-skills` são DOIS CLONES do mesmo remote (DEFEITO latente, medido).** Os Passos 1.3/5/6 referenciam `C:/repos/skills`, que estava 5 versões atrás (lab 3.10.3 vs 3.10.8) — o Passo 5 manda copiar flags EXATAS do SKILL.md local: leria sintaxe stale. Fix: ericluciano-skills entra como primeiro candidato no `ls` + regra de `git pull --ff-only` antes de ler SKILL.md de clone. (O clone stale foi sincronizado nesta rodada.)

## Observações (não-defeito)

- Comandos jq do Passo 1 funcionaram todos como escritos (validados de novo nesta máquina; janela 7d com ~26 mil eventos de Read).
- A rota 3 do card ClickUp (sem env, sem default → pular e reportar) é o caminho real desta máquina: o MCP ClickUp está com "Default list: (not set)".
- N=1 tratado conforme prescrito: "Quem brilhou" com traço + nota, rodapé de cobertura parcial no texto exato.
- O exercício evita side-effect em produção por desenho: modo link (sem booking) pra todas as duplas + 1 agendamento supervisionado com colega interno cancelado em seguida (calendly_cancel).
