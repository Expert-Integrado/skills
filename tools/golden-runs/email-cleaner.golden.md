# Golden run — operacoes:email-cleaner

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** rodada real na inbox do Outlook do Eric — executado até o gate de auth: Passo 0 (resolver SKILL_DIR pelo fallback, sessão não-plugin), setup condicional (`npm install` rodou 1ª vez na máquina — deps OK), Passo 1 `--auth-check`.
- **Resultado: PARCIAL — 1 defeito corrigido (operacoes 2.2.2); parado no gate de auth (comportamento correto da skill).**

## Achados e fixes (operacoes 2.2.2)

1. **Fallback do Passo 0 assume que o `find` retorna UM caminho — retorna TRÊS (DEFEITO, reproduzido).** Na máquina real: `plugins/cache/.../operacoes/2.1.0/...`, `.../2.2.0/...` e `plugins/marketplaces/.../operacoes/...`. Executor literal não tem regra de escolha. Fix: regra determinística — maior versão sob `plugins/cache/`, ignorar `plugins/marketplaces/` (clone-fonte).

## Execução real (o que foi validado)

- Passo 0: fallback exercitado de verdade (CLAUDE_PLUGIN_ROOT vazia fora de contexto de plugin); `cleaner.mjs: OK` + `rules.json: OK` no dir 2.2.0.
- Setup condicional: critério objetivo funcionou (`node_modules` ausente → `npm install` → "deps: INSTALADAS AGORA").
- Passo 1: `--auth-check` imprimiu exatamente `status: SEM_AUTH` + ação, exit 1 — contrato de saída literal do script confere com a skill.
- `--auth` (device code flow) dispara e imprime URL + código no formato documentado; flow interativo requer login Microsoft do Eric.

## Parada (gate)

- Token isolado nunca foi criado nesta máquina (`C:/tmp/email-cleaner-token.json` inexistente). A skill manda o Eric rodar `node .../cleaner.mjs --auth` no terminal dele e confirmar — parada legítima.
- Tentativa de completar o device flow via browser (goal 07/07 do Eric autorizou) falhou por causa EXTERNA: o MCP playwright travou com "Browser is already in use" mesmo após matar todos os processos do perfil e remover locks — estado interno do MCP corrompido, só restart do MCP resolve (registrado como pendência da sessão; o mesmo lock do run 42 tinha recovery por taskkill, desta vez não bastou).
- **Pra fechar o run:** Eric roda `--auth` (ou reinicia o MCP playwright e o agente completa o device flow no browser logado), e a rodada continua do Passo 2 (`--inspect-all`).

## Observações (não-defeito)

- Delete no fluxo é restrito às regras `delete` do rules.json (phishing/spam); todo o resto é move/mark-read — reversível, compatível com rodar a validação na inbox real quando a auth existir.
