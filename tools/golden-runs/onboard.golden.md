# Golden run — operacoes:onboard

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** máquina do Eric (a skill PROÍBE usá-la pra config pessoal do Eric) → Etapa 0 literal contra o `~/.claude/` REAL (detecção de memória existente → gate "Sobrescrever/Manter" seguraria, propose-only, zero escrita) + pipeline completo Etapas 1-2 num CONFIG_DIR sandbox (`C:/tmp/golden-onboard/.claude`) com colaboradora de teste ("Joana Teste Golden", CS, ferramentas com caixa livre `clickup/notion`), lendo os templates REAIS do repo.
- **Resultado: APROVADO, com 2 defeitos de contradição doc corrigidos.** Inventário de placeholders bate EXATO com a skill (6 distintos em CLAUDE.md com NOME 2x; MEMORY.md NOME 2x + CARGO 1x; 4 templates com zero). Auditoria dos templates: zero menção a "Eric", zero dado confidencial (MRR/folha/turnover/OKR/preço), 5 seções fixas confirmadas. Sandbox: 0 `{{` restantes nos 6 arquivos, linha do campo 7 dentro de `## Como eu trabalho`, 4 cópias byte-idênticas (cmp), texto livre preservado caractere a caractere.

## Achados e fixes (operacoes 2.2.1)

1. **SEMPRE #1 + checklist contradizem a cópia byte-a-byte (DEFEITO doc, reproduzido).** "SEMPRE escrever todos os arquivos com acentuacao correta" + item de checklist equivalente vs templates deliberadamente SEM acento (convenção de config interna; `expert-integrado.md` é misto — 16 linhas com acento, resto sem) e regra de cópia byte-a-byte. Executor literal ou reprova a própria saída no checklist ou "corrige" o template (violando o byte-a-byte). Fix: regra e checklist rescopados — acentuação correta vale pra CONVERSA com o colaborador; arquivos seguem os templates como estão.
2. **Resumo da Etapa 4 é template literal com `~/.claude/`, mas o checklist exige caminho absoluto (DEFEITO doc).** Impossível satisfazer os dois. Fix: o template do resumo agora usa `<CONFIG_DIR>` com instrução de substituição única pelo path resolvido na Etapa 0.

## Observações (não-defeito)

- Etapa 0 na máquina real: `Bash ls "$HOME/.claude"` resolve CONFIG_DIR de primeira (passo 1 da cascata); memória existe → o fluxo real pararia no AskUserQuestion binário. Gate respeitado — nada foi escrito no `~/.claude/` real.
- A cascata de resolução de CONFIG_DIR (Bash → Glob → perfil Windows validado) é elaborada mas correta; só o passo 1 foi necessário aqui.
- Templates auditados estão saudáveis pra distribuição; a mistura de acento em `expert-integrado.md` é cosmética e não vale reescrita (byte-a-byte é canônico).
