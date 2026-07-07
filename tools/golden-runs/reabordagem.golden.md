# Golden run — comercial:reabordagem

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** campanha canônica "retomar mentoria" com 3 deals perdidos REAIS do Educacional (25 Gustavo Politi, 34 Stefano Guardia, 16 Hugo Pielke), vendedora Kesia, due próximo dia útil (medido `TZ='BRT3'`: hoje 2026-07-06 segunda → due 2026-07-07), sem vínculo ao deal (default). Escopo onda 1: Passos 0-6 (investigação read-only + classificação + mensagem + nota HTML do 1º lead), PARANDO no gate de validação do Passo 6 — o Passo 7 (`create_activity`) é write no CRM real e fica pra onda 2 com OK.
- **Resultado: APROVADO no escopo.** `TZ='BRT3'` da correção anterior funcionou; `get_deal_summary` devolveu o formato exatamente como a skill documenta (Pipeline | Etapa por nome, telefone com DDI na seção PESSOA, histórico com "Etapa X -> Y"); classificação pela ordem da tabela: 25 QUENTE (etapa alcançada "Em negociação"), 34 QUENTE (Proposta enviada; etapa mais avançada do histórico), 16 DESCARTAR (sem telefone E sem email — regra exercitada com lead real); DDI 55 → PT nos dois vivos; mensagem sem emoji, sem em-dash, com pergunta aberta, sem citar SDR que saiu (histórico era Priscila/Elysson/Fabiana → "a gente conversou"; Kesia ativa pode assinar).

## Rascunho validável produzido (1º lead, deal 25 — parou no gate do Passo 6)

Mensagem (topo da nota):
> Oi Gustavo, aqui é a Kesia, da Expert Integrado. A gente conversou no ano passado sobre a mentoria e vc chegou a negociar condições, mas acabou ficando por ali.
>
> De lá pra cá a mentoria mudou de formato: hoje o foco é implantação de agentes de IA no comercial, com acompanhamento semanal. Vários alunos do seu perfil (agência/consultoria) estão colocando isso pra rodar em 30 dias.
>
> Estamos reabrindo turma agora em julho com condição pra quem já esteve em negociação com a gente. Faz sentido eu te mandar os detalhes por aqui?

Estratégia: TEMPERATURA QUENTE (chegou a "Em negociação"); ação = retomar de onde parou + condição de julho; objeções: 1) "Parei de responder porque perdi o interesse" → novidade concreta (novo formato com IA no comercial), 2) "Continua caro" → condição de retorno + parcelamento, 3) "Estou focado em outra coisa" → implantação guiada consome pouco tempo dele. CONTEXTO ADICIONAL: reabordagem anterior em 25/03/2026 (Niverton) e retomada em 06/04/2026 (Kesia) — ajustar tom, não repetir a mesma oferta.

## Achados e fixes (comercial 2.5.10)

1. **Sem regra de cooldown/sinalização de reabordagem anterior (DEFEITO de produto, evidenciado por dado real).** Os 2 leads vivos do lote JÁ tinham atividade "Reabordagem Evento/Mentoria" de 25/03/2026 e "Retomada de contato" de 06/04/2026 — a skill mandava gerar mensagem nova sem nenhum aviso, e o vendedor repetiria abordagem em base queimada. Fix: SEMPRE novo — checar reabordagem nos últimos 90 dias no histórico (que o Passo 2 já coleta), sinalizar no CONTEXTO ADICIONAL e no resumo final.

## Observações (não-defeito)

- **MCP, não skill:** `list_deals(pipeline_id=6, status=lost)` devolveu 2 deals exibindo `pipeline: "Super SDR"` (IDs 4 e 24) no meio dos Educacional — filtro do MCP com vazamento aparente (ou deal movido de pipeline com filtro pela etapa antiga). Não afeta a skill (que instrui conferir os dados por deal), mas vale investigação no expert-mcps.
- O formato documentado do `get_deal_summary` bateu 100% com o retorno real — a doc da skill está fiel ao contrato.
- Etapa numérica fantasma no histórico ("Etapa 42", "Etapa 51") aparece em deals de 2023 (etapas deletadas); a regra "etapa mais avançada" segue funcionando pelos nomes existentes.
- Passos 7-8 (create_activity + resumo) ficam pra onda 2 com alvo de teste + delete, junto com prospecta-lead.
