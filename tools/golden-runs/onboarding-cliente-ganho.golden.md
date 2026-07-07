# Golden run — lab:onboarding-cliente-ganho

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** esteira completa com deal TESTE real — org 8395 + pessoa 22964 (tel = corporativo do Eric) + deal 15031 "TESTE Golden Onboarding | Mentoria Automacoes" (Educacional, Formalização 82, won, R$1.000). Executado: passo 1 (summary + validação won) → passo 2 (playbook Mentoria LIDO no path canônico do Google Drive — bate com a lista embutida) → passo 3 (folder 901318548868 no space Educacional + listas Implementacao/Suporte + 5 cards) → passo 4 (voice guide via recovery + check_message 10/10 + send REAL validado, provider 0C30758FD4F7E2ECBD8F, pessoal→corporativo, OK roteirizado) → passo 5 (Calendly sugerido; roteiro: não agendado) → passo 6 (template de contrato INEXISTENTE em Workspace+Brain → parada correta; roteiro: pular) → passo 7 (nota 18301 + atividade diagnostico 52204 com force) → passo 8 (nota Brain). Limpeza TOTAL: 3 atividades + deal + pessoa + org deletados via API v1 (6x success:true), folder ClickUp deletado via API v2 (HTTP 200), nota Brain soft-deleted.
- **Resultado: APROVADO — 7 defeitos corrigidos (lab 3.10.12 + fix de causa raiz no clickup-mcp, commit 34babbd).**

## Achados e fixes (lab 3.10.12)

1. **due_date date-only do clickup-mcp caía no dia ANTERIOR (DEFEITO grave, reproduzido).** `due_date="2026-07-07"` criou card com due 06/07 — `new Date("YYYY-MM-DD")` = meia-noite UTC = 21h do dia anterior em BRT; o ClickUp normaliza all-day pro dia local do instante. Card "due hoje" nascia VENCIDO ontem. **Fix de causa raiz no MCP** (`mcps/clickup/tools/tasks.js`, commit 34babbd): date-only ancora ao meio-dia BRT + envia `due_date_time/start_date_time=true` quando o input tem hora explícita (antes o horário era sempre descartado). Na skill: formato `AAAA-MM-DDTHH:MM:SS-03:00` documentado (robusto mesmo em MCP antigo). MCP em execução só pega o fix após restart.
2. **"Criar card sem assignee" não é executável (DEFEITO, reproduzido).** Omitir `assignees` faz o MCP auto-atribuir ao dono da key (Eric) — os 2 cards "sem assignee" nasceram atribuídos ao Eric em silêncio. Fix: gotcha documentado + alternativa (assignees_remove) na skill.
3. **create_task DROPA assignee sem acesso ao space em silêncio (DEFEITO, reproduzido).** Card do Jair (user_id 55008714 correto) nasceu "Assignees: none"; o update com o mesmo id rejeita explícito (ITEM_087 "All assignees must have access"). Jair NÃO tem acesso ao space Educacional; **"Vanderson" não existe no workspace** — 2 dos 5 responsáveis embutidos na skill são inatribuíveis. Fix: regra "conferir a linha Assignees: do retorno" + estado verificado documentado; quem substitui Vanderson fica pro Eric (não inventado).
4. **get_voice_guide estoura ~91K sem recovery na skill (DEFEITO, reproduzido — mesmo do run 43).** Fix: recovery documentado (ler `## 0. Motor da voz` + `## TL;DR` de `~/.claude/voice-guide.md`).
5. **send sem `instance` não envia quando o contato existe nas 2 instâncias (DEFEITO, reproduzido).** Retorna `{ambiguous:true, candidates:[...]}` e para; a skill não documentava o parâmetro. Fix: `instance="pessoal"` no exemplo + linha de recovery.
6. **Guardrail de pendências bloqueia o kickoff em TODO deal ganho (DEFEITO, reproduzido).** Automação da conta cria "Preencher dados da Organização" ao entrar em Formalização/won → create_activity sempre bate no aviso e sem `force=true` nada é criado. Fix: force documentado com pré-check de duplicata de kickoff.
7. **Template de welcome sem acentuação correta (DEFEITO).** "a familia/comecar/formulario/diagnostico/proximos" é texto EXTERNO em nome do Eric — e a regra "NUNCA alterar o template" congela o erro. Fix: template acentuado no SKILL.md (a regra agora protege o texto certo). check_message deu 10/10 no texto sem acento (não pega ortografia — observação pro whatsapp-agent).

## Execução real (o que foi validado)

- Validação do passo 1 funciona e os stage_ids embutidos {82, 81, 83} CONFEREM com a API real (82=Educacional/6, 81=Super SDR/2, 83=SaaS/1). Existe um 4º não listado (89=Formalização Parceria/10) — won cobre pelo OR; anotado na skill.
- **Automação da conta reverte won→open fora de Formalização** (com nota automática "Etapa não é formalização...") — descoberto ao montar o fixture; documentado na validação do passo 1.
- Playbook Mentoria existe no path canônico e é consistente com a lista embutida do passo 2 (formulário diagnóstico, call onboarding, Cademi, grupo WhatsApp, consultoria Eric ~7d).
- ClickUp: folder+2 listas+5 cards criados no space certo; find_member_by_name resolveu Jair/Ricardo/Eric.
- Welcome: check_message 10/10; send real ok:true na 2ª tentativa (com instance).
- Kickoff: atividade `diagnostico` (nunca meeting), due_date sem due_time, criada com force.
- Contrato: `Processos Expert Integrado/Contratos/` não existe e nenhum template de contrato foi achado (find + recall) — parada correta da skill. **Pendência de conteúdo pro Eric: subir templates de contrato pro Workspace.**
- Higiene: todos os registros TESTE removidos (Pipedrive/ClickUp/Brain); mensagem TESTE fica no chat corporativo do próprio Eric (padrão do run 44).

## Observações (não-defeito)

- `update_deal(stage_id="Formalização")` por NOME moveu o deal pro pipeline SaaS (a etapa existe em 4 pipelines; a resolução não prioriza o pipeline atual do deal) — gotcha do MCP pipedrive, pendência registrada (resolução de stage por nome deveria preferir o pipeline atual).
- Automação da conta duplicou "Preencher dados da Organização" (1 por passagem por Formalização) — comportamento da conta, não da skill.
- MCP clickup não devolve URL do folder; link montado com team_id 30962394 (`https://app.clickup.com/30962394/v/o/f/<folder_id>`).
- Skill segue 0.1.0 sandbox ("pronto pra graduar após 5 usos reais") — este run conta como uso 1 validado.
