# Golden run — whatsapp-agent:transcrever-conversa

- **Data:** 06-07/07/2026 · máquina: PC (Windows, Git Bash, Whisper local) · executor literal
- **Cenário:** transcrição REAL ponta a ponta — "transcreve a conversa com o João Vaqueiro dos últimos 10 dias" (18 msgs, 12 áudios em cache → valida reaproveitamento) e grupo "Eric & Fred" 25 dias (86 msgs, **4 áudios baixados do bucket e transcritos AGORA no Whisper local small**, cache gravado de volta em messages.content, exit 0, JSON íntegro, resumo do Passo 5 produzido). Fonte canônica da skill = branch `legacy/main` do repo whatsapp-agent (main v3.1.0 não tem `skills/`).
- **Resultado: APROVADO ponta a ponta, com 4 defeitos corrigidos** (commit `419e146` em legacy/main; worktree local sincronizado por ff).

## Achados e fixes (legacy/main 419e146)

1. **Cascata do Passo 2 inteira falha nesta máquina (DEFEITO, reproduzido no bloco literal).** Os 3 candidatos ($CLAUDE_PLUGIN_ROOT, ~/.claude/skills, /c/repos/whatsapp-agent/skills) não existem — o checkout está em `main` v3+, que dropou `skills/`; o `find` de recovery acha só a cópia do worktree `.claude/worktrees/` (estava 68 commits atrás). Fix: recovery documentado com `git show legacy/main:skills/...` (extrai a canônica sem trocar branch) + aviso de que cópia de worktree pode estar stale.
2. **curl sem `--ssl-no-revoke` nas 3 chamadas do script (DEFEITO transversal-e na causa raiz, reproduzido).** schannel exit 35 → stdout vazio → `RuntimeError: SQL error:` (vazio, ilegível). Era o PENDENTE-SCRIPT. Fix: helper `CURL = ["curl", "--ssl-no-revoke"] if os.name == "nt"` (Linux/VPS não recebe a flag) + erro agora inclui stderr/exit do curl.
3. **`print` do JSON estoura cp1252 no Windows (DEFEITO transversal-b, reproduzido — emoji no chat_name).** UnicodeEncodeError após transcrição bem-sucedida. Fix: `sys.stdout/stderr.reconfigure(encoding="utf-8")` no topo do script.
4. **Regra de ambiguidade 1P forçava parada evitável (DEFEITO de fluxo, reproduzido).** O vault tem DOIS itens de service role (`WHATSAPP_SUPABASE_SERVICE_KEY` novo + `SUPABASE_SERVICE_ROLE_KEY_WHATSAPP` antigo) — a regra "2+ candidatos → PARAR e perguntar" travaria todo run. Fix: tentar o de update mais recente primeiro; parar só se todos falharem autenticação. Nomes reais verificados documentados (PAT = `SUPABASE_ACCESS_TOKEN`) + dica stale "memory-mcp" do exit-2 trocada pelos itens 1P.

## Resumo real produzido (Passo 5, deliverable)

Conversa com Eric & Fred (86 msgs, 4 áudio(s) transcrito(s) agora):

Tópicos: logística da creche do Fred (dias, horários de busca e entrega), banho, encomendas deixadas na portaria por engano.
Decisões: entrega às 22h na creche (13/06); busca de domingo movida pra terça por causa do jogo (28/06); dias na creche remanejados pra quinta+sexta emendando com o banho (30/06); creche pega as encomendas da portaria (29/06 e 03/07).
Pendências: nenhuma em aberto — um áudio do Eric (30/06 22:28) veio vazio/com chiado e o conteúdo se perdeu; o combinado foi refeito por texto na sequência.

## Observações (não-defeito)

- Cache validado: re-rodar João Vaqueiro não re-transcreve (12 já transcritos, 0 pra fazer).
- Áudio sem transcrição só existe em GRUPOS (o agente auto-transcreve 1:1 na chegada) — o valor real da skill hoje é backlog de grupos.
- `python3` (3.14) EXISTE no PATH desta máquina e tem whisper — a nota "não há python3 no PATH" do CLAUDE.md/memória está desatualizada; a cascata da skill resolveu certo.
- `[audio vazio]` (13 chars) apareceu no run real e o resumo o citou sem inventar conteúdo, conforme o NUNCA #1.
- resolve_chat preferiu o chat da instância profissional ("Asafe Silva | Expert Integrado") sobre o pessoal no teste inicial — comportamento do ORDER BY last_message_at, coberto pelo SEMPRE de conferir chat_name.
