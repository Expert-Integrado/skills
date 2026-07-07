# Golden run — whatsapp-agent:estou-devendo (variante standalone)

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "do que estou devendo?" contra o banco REAL — `--dias=1 --limit=10`. Fonte canônica = branch `legacy/main` do whatsapp-agent (main v3.1.0 não tem `skills/`). Script rodado de verdade: exit 0, JSON íntegro, 564 pendências absolutas, top 10 retornado, briefing produzido.
- **Resultado: APROVADO, com 4 defeitos corrigidos** (commit `b42923c` em legacy/main; worktree local sincronizado por ff).

## Achados e fixes (legacy/main b42923c)

1. **curl sem `--ssl-no-revoke` (DEFEITO transversal-e, reproduzido).** Mesmo bug da skill irmã transcrever-conversa: schannel exit 35 → `ERRO no SQL:` vazio. Fix: helper `CURL` condicional a `os.name == "nt"` + erro com stderr/exit do curl.
2. **`print` do JSON sem utf-8 no Windows (DEFEITO transversal-b, mesma classe reproduzida na skill irmã no mesmo dia).** Nome de chat com emoji estoura cp1252. Fix: `reconfigure(encoding="utf-8")` no topo.
3. **`total_pendencias` calculado DEPOIS do LIMIT (DEFEITO doc vs comportamento, reproduzido).** SKILL.md promete "total absoluto (antes do limit)" e o briefing "+N outros" depende disso; o script devolvia `len(rows)` == mostrando sempre. Fix: `count(*) OVER ()` na query — validado: 564 absoluto vs 10 mostrando. Doc ganhou aviso de que `por_categoria` conta só os retornados.
4. **Execução Windows documentada 100% quebrada (DEFEITO, reproduzido).** Python `AppData/Local/Python/bin/python.exe` (não-canônico) + script `~/.claude/skills/...` (não existe no PC) + dica `$env:` PowerShell (viola regra Git Bash). Fix: bloco de execução PC via `git show legacy/main:...` + `python3` do PATH; creds via `op read` com nomes 1P verificados (`SUPABASE_ACCESS_TOKEN` / `WHATSAPP_SUPABASE_SERVICE_KEY`).

## Briefing real produzido (deliverable)

Você está devendo resposta em 564 conversas (>1 dia, sem grupos/descartar/comunidade). As 10 mais antigas são todas de dez/2025 (~200+ dias — na prática, conversas mortas):

- Clientes (2): Pedro Gabriel Forjaz (216d), Guilherme Schumann (205d)
- Leads (3): Thi Ferreira (212d), Claudia Musa | República Dominicana (203d), Gustavo Peçanha (~199d)
- Fornecedores (2): Jully Viana Chatguru (213d), G2G Internet Fibra (202d)
- Pessoal (2): Noeli Priscila (212d), Rapha Albuquerque (208d)
- Parceiro (1): Felipe Félix Voomp (199d)
- +554 outras

## Observações (não-defeito)

- Ordenação "mais antigo primeiro" faz o briefing default mostrar só fósseis quando o backlog é grande (564) — pra rotina diária, a variante `comercial:estou-devendo` (com tiers de urgência URGENTE/HOJE/SEM PRAZO) é a certa; esta standalone serve pra auditoria de backlog. Design documentado, não defeito.
- Hook pre-commit do repo acusou: SKILL.md sem blocos `## NUNCA`/`## SEMPRE` (rubric R4) — gap estrutural pré-existente da variante standalone; a irmã comercial tem. Fica pra padronização futura, não bloqueia.
- Meu primeiro diagnóstico de "exit 0 em erro" era falso: o `$?` capturado era do `head` no pipe — o script chama `sys.exit(1)` corretamente (erro de medição, retratado).
