# Golden run — comercial:whatsapp-campanha-central-prospeccao

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Escopo (onda 4):** validação ATÉ O PREVIEW (dry-run oficial do Passo 4). Piloto e batch são disparos reais pelo chip da Central (anti-banimento, side-effect externo) e exigem dialog_id por SDR + aprovação do Eric — paradas bloqueantes da própria skill (Passos 1.4, 5, 6b).
- **Status: PARCIAL — gate humano (dialog_id por SDR + piloto).** Validado de verdade até o gate: engine importada da produção (G:), `_load_creds()` OK (PD_TOKEN/CG_KEY/CG_ACCT/CG_PHONE), funções puras batendo com a doc (`_clean_first_name`: "Psicóloga Fátima Cruz"→"Fátima", email→"amigo(a)", "Opa"→"amigo(a)"; `brt_to_utc_hhmm("11:30")`→"14:30"), contrato das 3 lambdas exercitado (msg_2 com `empresa=None` → fallback "sua operação"), e `run_batch(dry_run=True)` com 2 deals reais do pipeline 7: imprimiu `-> deal <id> <sdr>` e retornou `[]` exatamente como o CONTRATO descreve, sem nenhuma chamada de API.

## Achados e fixes (comercial 2.5.15)

1. **`SYNC` da engine de PRODUÇÃO hardcoded no OneDrive morto + espelho do repo À FRENTE da produção (DEFEITO CRÍTICO, mesmo padrão da api-fup).** O espelho já tinha `CLAUDE_SYNC_DIR` (e um `import os` que a produção nem tinha) — correção feita no espelho e nunca propagada pra produção, invertendo a regra "espelho é só leitura". Fix: engine de produção (G:) com resolução robusta (env `CLAUDE_SYNC_DIR` → autodetecção G: primeiro → OneDrive legado), espelho sincronizado byte a byte via copyfile.
2. **SKILL.md documentava o hardcode como "fato do código" em 3 seções (DEFEITO documental extenso).** O CONTRATO DA ENGINE, o Pré-requisito 2 ("só roda no PC do Eric", ls no OneDrive) e o Pré-requisito 3 (consequência do hardcode) descreviam o comportamento antigo. Reescritos: engine se resolve sozinha; máquina fora dos 2 paths conhecidos = exportar `CLAUDE_SYNC_DIR` + `WORKSPACE_DIR` (deixou de ser beco sem saída); confirmação de ambiente agora testa G: primeiro.
3. **`WORKSPACE_DIR` default no OneDrive morto (Pré-req 3 + runner do Passo 4).** Fix: `G:/Meu Drive/claude-workspace/Workspace` + aviso de arquivo morto.
4. **Instrução de credencial faltante mandava "rodar setup-secrets.ps1" (DEFEITO latente, mesmo da api-fup).** O v2 grava `~/.claude.json` e não propaga o cache do claude-sync que a engine lê. Fix: procedimento de rotação reescrito no Pré-requisito 5.

## Observações (não-defeito)

- `normalize_br` reduz pra 12 chars (remove o 9) — é design: a engine faz fallback 12↔13 em toda chamada ChatGuru, documentado em Erros #1.
- ChatGuru não foi chamado (dry-run não toca API; skill não tem endpoint read-only). Piloto real fica pra próxima campanha do Eric.
- Histórico embutido na skill (campanha Imposto Invisível 28/04: 57 leads, 55 OK) confere com o formato do log em `C:/tmp/disparo-imposto/`.
- **Retomada (próxima campanha real):** Passo 1 completo com o Eric (lista, split SDR, 3 mensagens, dialog_id por SDR, Call follow-up, exclusões, vencida_subject_match) → dry-run → piloto 1-2 leads → 6a/6b → batch em background.
