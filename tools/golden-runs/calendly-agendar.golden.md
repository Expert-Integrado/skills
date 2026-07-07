# Golden run — comercial:calendly-agendar

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** ciclo REAL completo agendar → cancelar. Convidado "TESTE Golden Run - apagar" (eric-backup-4@expertintegrado.com.br), evento Office Hours 13/07/2026 17:30-17:45 BRT. Agendamento confirmado na página ("Você está agendado"), invitee `fda2e895-76fe-43c7-a836-49af2ed4885c`, cancelado em seguida pela página pública ("Cancelamento Confirmado"). Nenhum resíduo no Calendly nem no Pipedrive.
- **Resultado: APROVADO — 3 defeitos corrigidos** (comercial 2.5.12 + calendly-mcp 7a8f326).

## Achados e fixes

1. **Passo 3 gerava 400 na primeira chamada do dia (DEFEITO duplo, reproduzido e isolado).** `hoje → hoje+7` falhou 400; `hoje → hoje+6` TAMBÉM falhou (prova de que start no passado é fatal, não só a janela); `amanhã → +6` passou. Causa raiz no MCP: `handleListAvailableSlots` convertia `start_date` pra `T00:00:00-03:00` (sempre no passado depois da meia-noite) e não capava a janela em 7 dias. **Fix em 2 camadas:** (a) calendly-mcp commit `7a8f326` — helper `clampAvailabilityWindow` clampa start em "agora+1min" e capa end em start+7d, aplicado também no lookup do one-off link; (b) SKILL.md Passo 3 — `end_date: hoje+6` + recovery documentado pro 400 (repetir com start=amanhã) + janela seguinte ajustada pra hoje+7→hoje+13. **O MCP em execução só pega o fix após restart do calendly-mcp.**
2. **Fallback Playwright não fornece `event_uuid` — cancelamento via MCP impossível (GAP, vivido na prática).** `calendly_cancel` exige `event_uuid`, que o fluxo browser nunca vê. Fix: nota técnica no 5g — guardar a URL da página de confirmação (contém o `invitee_uuid`) e cancelar via página pública `https://calendly.com/cancellations/<invitee_uuid>`; foi exatamente assim que este run desfez o agendamento.
3. **Passo 6 registraria nota em deal REAL errado (DEFEITO, reproduzido).** `search_deals "TESTE Golden Run"` devolveu o deal Madeplant (fuzzy match do Pipedrive, zero relação com o termo); com "exatamente 1 deal aberto", a skill literal criaria a nota nele. Fix: filtro de falso-positivo no item 2 — descartar resultado cujo `contato`/`empresa`/`titulo` não contenha o nome buscado. Pós-fix: 0 deals → nada registrado (comportamento correto pro convidado TESTE).

## Execução real (o que foi validado)

- Passos 1-2: dados do convidado da sessão; tipo de evento explicitado antes de agendar.
- Passo 3: defeito da janela isolado em 3 chamadas controladas (acima). Evento "para teste" tinha 0 slots nas duas janelas — comportamento literal seria parar; diretor trocou pra Office Hours pra exercitar o fluxo (registrado, não é desvio da skill).
- Passo 4: `calendly_schedule` retornou `invalid_location_choice` — caminho PREVISTO pela skill (E6 scope/location) → fallback.
- Passo 5 (5a-5g): fluxo Playwright ponta a ponta — navegar, escolher data/hora, preencher form (nome/email/telefone `55DDD...`), snapshot pré-submit, confirmar, screenshot+snapshot da confirmação. "Você está agendado" extraído.
- Cancelamento (fora da skill, higiene do teste): página pública `/cancellations/<invitee_uuid>` → "Cancelamento Confirmado".
- Passo 6: search → falso-positivo detectado (defeito 3) → pós-fix 0 deals → nada registrado.
- Passo 7 (report, como seria entregue):

```
Reunião agendada no Calendly:
- Convidado: TESTE Golden Run - apagar (eric-backup-4@expertintegrado.com.br)
- Evento: Office Hours
- Horário: 13/07/2026 às 17:30 (Brasília)
- Link Zoom: (evento de teste sem Zoom)
- Método: Playwright (fallback após invalid_location_choice)
- Pipedrive: sem deal encontrado — nada registrado
```

## Observações (não-defeito)

- Crash do browser no meio do cancelamento deixou o perfil `ms-playwright-mcp` travado ("Browser is already in use") — recovery: `wmic process get ProcessId,CommandLine | grep ms-playwright-mcp` + `taskkill //PID <pid> //T //F` nos Chrome órfãos. Transversal-r do FILA.
- Integração nativa Calendly→Pipedrive não disparou porque o convidado TESTE não existe no CRM — em lead real, as 3 atividades automáticas do Passo 6 item 4 se aplicam.
