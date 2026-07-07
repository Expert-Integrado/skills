# Golden run — operacoes:email-cleaner

- **Data:** 07/07/2026 (2 sessões) · máquina: PC · executor literal
- **Cenário:** rodada real na inbox do Outlook do Eric. Sessão 1: Passo 0 + setup + `--auth-check` (parou no gate de auth). Sessão 2 (carta branca 07/07, Playwright destravado): auth completada pelo agente via browser, Passos 2 e 3 executados de verdade contra a inbox real (359 não-lidos).
- **Resultado: PARCIAL — pipeline validado do Passo 0 ao Passo 3 (dry-run) com 2 defeitos corrigidos (operacoes 2.2.3); parado no gate de confirmação de volumes do Eric (NUNCA #2 da skill — comportamento correto).**

## Achados e fixes (operacoes 2.2.2 + 2.2.3)

1. **Fallback do Passo 0 assume que o `find` retorna UM caminho — retorna TRÊS (DEFEITO, reproduzido; fix na 2.2.2).** Na máquina real: `plugins/cache/.../operacoes/<versão>/...` (uma por versão) + `plugins/marketplaces/...`. Fix: regra determinística — maior versão sob `plugins/cache/`, ignorar `plugins/marketplaces/`.
2. **`--apply-rules` NUNCA rodou em máquina nenhuma: crash `Invalid regular expression: (?i)... Invalid group` (DEFEITO CRÍTICO, reproduzido; fix na 2.2.3).** O `rules.json` tinha 12 regexes `subject_must_match`/`subject_must_not_match` com prefixo `(?i)` (sintaxe Python) que o `RegExp` do JS rejeita — o script morria no primeiro match de assunto, então Passos 3-4 eram inexecutáveis desde que as regras de assunto existem. Causa raiz dupla: o `cleaner.mjs` compilava regex de assunto SEM flag `i` (inconsistente com o match de address, que usa `i`), e o autor do rules.json compensou com `(?i)`. Fix de causa raiz nos 2 lados: script compila assunto com flag `i` + strip de `(?i)` legado; rules.json limpo dos 12 prefixos. Re-testado: dry-run completo em 359 emails sem crash.

## Execução real (o que foi validado)

- Passo 0: fallback exercitado (3 paths, regra da maior versão em cache); `cleaner.mjs: OK` + `rules.json: OK`.
- Setup condicional: `npm install` disparado pelo critério objetivo (dir de versão novo = `node_modules` ausente).
- Passo 1: `--auth-check` com os 3 contratos de saída conferidos (`SEM_AUTH` exit 1 antes, `OK` exit 0 depois).
- **Auth pelo agente (caminho novo, validado):** `--auth` em background com log, código lido do log, Playwright em `login.microsoft.com/device` → conta `contato@expertintegrado.com.br` já logada no profile → `Você entrou no aplicativo outlook-mcp`. Token gravado em `C:/tmp/email-cleaner-token.json`. A afirmação antiga da skill ("o agente não completa o flow interativo") era FALSA — Passo 1 reescrito com o caminho alternativo gated (só com autorização do Eric; tela de senha = parar).
- Passo 2: `--inspect-all` dumpou 359 não-lidos no formato prometido.
- Passo 3: dry-run real — 179 de 359 afetados (49,9%), 56 preservados, 124 não cobertos; breakdown por regra impresso no contrato literal (`DEL`/`READ`/`MOVE-><Pasta>`).

## Parada (gate de volumes — por design)

- NUNCA #2 da skill: `--execute` só com confirmação explícita do Eric sobre os volumes. Volumes apresentados no relatório da sessão: 179 afetados (14 DEL: 1 phishing + 6 Vivo marketing + 1 Instagram + 6 G4 leads; 165 MOVE/READ), 56 preservados, 124 pra triagem cognitiva (maiores grupos: 46 d4sign, 6 agenda.expertintegrado, 5 zoom.us, 4 Cielo, 4 TotalPass).
- Token isolado MANTIDO em `C:/tmp/email-cleaner-token.json` aguardando o OK (o `--logout` do Passo 9 roda no fim do fluxo; re-auth via Playwright leva 1 min se preferir apagar antes).
- **Pra fechar o run:** OK do Eric nos volumes → `--execute` → Passos 5-9 (triagem dos 124, humanos, cauda longa, aprender regras, logout, briefing).

## Observações (não-defeito)

- Delete no fluxo é restrito às regras `delete` do rules.json (phishing/spam/marketing declarado); todo o resto é move/mark-read — reversível.
- O run anterior registrou "estado interno do MCP playwright corrompido, só restart resolve" — a causa real era chrome órfão do profile `mcp-chrome-86ceac3` segurando o lock; matar os processos do profile resolveu sem restart do MCP.
