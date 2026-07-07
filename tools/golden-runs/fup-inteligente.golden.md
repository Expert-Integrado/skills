# Golden run — comercial:fup-inteligente

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** funil nomeado ("roda o fup do Educacional"), escopo onda 1 = Passos 1-5 até o rascunho apresentado, PARANDO no gate de aprovação (envio + Protocolo Anti-Vencida ficam pra onda 2 com OK real). `HOJE` medido via `TZ='BRT3'` = 2026-07-06 (segunda).
- **Resultado: APROVADO no escopo.** Triagem exercitada com dados reais: 3 deals "Em negociação" com pendente FUTURA (07/07) corretamente PULADOS; deal 10964 (Gustavo Lobo Leite — Madeplant, R$39.600) com pendente de HOJE → PRIORIDADE 2; get_deal_summary + WhatsApp real lidos (áudio do lead de 16/06 com transcrição = fonte de verdade); etapa "Em negociação" disparou consulta obrigatória ao Livro de Objeções (Objeção 3 "Não É o Momento", caso de restrição real de timing por reestruturação); mensagem na voz do Eric aprovada pelo `check_message` (score 9.5, zero violações) após 1 iteração; template do Passo 5 preenchido 100% com placeholders do get_deal_summary; data do próximo fup pela tabela (Em negociação = 1 dia → 07/07, dia útil).

## Rascunho validável produzido (deal 10964 — parou no gate do Passo 5)

> Fala Gustavo! Chegamos na 1ª quinzena de julho que vc cravou no áudio, então vim cobrar o combinado kkk
>
> To fechando a agenda de agosto e quero já travar sua imersão em Campo Grande antes que encha, que eu só faço duas por mês.. como foi a reestruturação aí, consegue bater a data comigo essa semana?

Ângulo: o próprio lead cravou "no máximo 1ª quinzena de julho" no áudio de 16/06 — cobrar o combinado (movimento nativo da voz do Eric) + escassez REAL da agenda de agosto (2 consultorias/mês, fato do histórico). Próxima atividade: whatsapp 2026-07-07, cobrar resposta.

## Achados e fixes (comercial 2.5.11)

1. **Skill confiava cegamente no filtro `pipeline_id` do MCP — que VAZA (DEFEITO, reproduzido em massa).** `list_deals(pipeline_id: 6)` devolveu 75 deals de TODOS os pipelines misturados (Parceria, Super SDR, SaaS, Prospecção). Executor literal tentaria ordenar "Reunião de Alinhamento"/"Lead Mapeado" pela tabela de etapas do Educacional — etapas desconhecidas, sem regra, e risco de fazer fup de deal do funil errado. Fix: filtro defensivo obrigatório no Passo 1 — descartar todo deal com campo `pipeline` != nome do funil da vez antes de ordenar.
2. **`get_voice_guide` estoura o limite de tokens da tool e a skill não documentava o recovery (DEFEITO de binding).** O guide atual (v1.6.3) tem ~90K chars — o overflow acontece em qualquer sessão. O erro salva o conteúdo em arquivo; fix: nota na regra 5 do Passo 4 — ler do arquivo salvo a seção "Motor da voz" + TL;DR (~120 linhas bastam pra calibrar), não re-chamar a tool.

## Observações (não-defeito)

- O vazamento do `pipeline_id` é bug do MCP pipedrive (mesma observação do run reabordagem, agora com reprodução em massa) — investigar no expert-mcps; o fix na skill é mitigação defensiva que vale mesmo depois do fix no MCP.
- `check_message` pegou "tua" (proibido) no 1º draft — o loop redigir→checar→corrigir da skill funcionou como especificado (score 6 → 9.5).
- Soft warning persistente de "msg longa" (300 chars vs mediana 24 do corpus): a regra da skill (1-3 parágrafos) convive com o warning soft; melhoria futura possível = sugerir burst de 2 sends no envio, sem mudar o gate.
- Triagem completa dos ~40 deals Educacional não foi exaustada (golden run corta após o 1º deal acionável, por design de escopo); a mecânica de pular pendente-futura foi validada em 3 deals reais.
- Atividade com `data` = HOJE veio com `atrasada: true` no list_deal_activities (sem hora) — a classificação da skill usa a DATA contra HOJE, não o flag, então não afeta; registrado como semântica do MCP.
