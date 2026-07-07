# Golden run — comercial:whatsapp-campanha-api-fup

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Escopo (onda 4):** validação ATÉ O GATE do disparo. Disparo em massa pra leads reais segue a regra do piloto (aprovação explícita do Eric) e exige `dialog_id` da campanha — a própria skill define essas duas paradas como bloqueantes (Passo 0.2 e Passo 5), então não há campanha sintética possível sem inventar side-effect externo real.
- **Status: PARCIAL — gate humano (dialog_id + piloto).** TODO o caminho até o gate foi validado de verdade: engine importada da produção, credenciais carregadas, token Pipedrive vivo (GET read-only `/users/me` → "Eric Luciano"), `list_deals(pipeline 7, stage 65)` retornando deals reais (e confirmando que NÃO traz phone/person_id, como a skill avisa), funções puras corretas (`_normalize_phone` "+55 (11) 99999-9999"→`5511999999999`; fallback 12↔13 nos dois sentidos), constantes e dialogs conhecidos presentes no módulo.

## Achados e fixes (comercial 2.5.15)

1. **`WORKSPACE_DIR` default apontava pro OneDrive MORTO (DEFEITO, mesmo padrão da orquestrar-conteudo).** Pré-requisitos e o snippet de import do Passo 6 usavam `~/OneDrive/Workspace` — arquivo morto desde 05/07/2026. Fix: default `G:/Meu Drive/claude-workspace/Workspace` nos 2 pontos + aviso.
2. **`SYNC` da engine de PRODUÇÃO hardcoded no OneDrive morto — e o espelho do repo estava À FRENTE da produção (DEFEITO CRÍTICO de single-source).** Alguém corrigiu o espelho (env var `CLAUDE_SYNC_DIR`) e nunca propagou pra produção — inversão exata da regra "espelho pode ficar atrás". Fix: engine de produção (G:) atualizada com resolução robusta (env `CLAUDE_SYNC_DIR` → autodetecção G: primeiro → OneDrive legado, ganha quem tiver `claude_desktop_config.json`), espelho do repo sincronizado byte a byte, seção do SKILL.md reescrita (editar engine deixou de ser o procedimento; exportar env var é o fallback).
3. **Instrução de rotação de token DEFASADA (DEFEITO latente perigoso).** A skill mandava "re-rodar setup-secrets.ps1 pra propagar o cache" — mas o setup-secrets v2 (repo `secrets-bootstrap`) grava em `~/.claude.json` e NÃO toca mais os `claude_desktop_config*.json` do claude-sync que a engine lê (parados em 04/2026). Hoje os valores ainda batem (verificado por hash, sem ecoar) — mas na PRIMEIRA rotação a engine passaria a usar token morto silenciosamente. Fix: procedimento reescrito (atualizar o JSON do claude-sync manualmente OU env var homônima) + gotcha documentado: `~/.claude.json` não tem `CHATGURU_PHONE_ID_OFICIAL` (migração da engine pra ~/.claude.json exige antes incluir a chave no manifesto do secrets-bootstrap).

## Observações (não-defeito)

- Cópias G: e OneDrive do claude-sync eram byte-idênticas (snapshot da migração de 05/07) — por isso o defeito 2 era latente, não ativo.
- ChatGuru não foi chamado (nenhum endpoint read-only inócuo documentado; toda a API da skill é de mutação). A validação do canal ChatGuru fica pro piloto da próxima campanha real.
- **Retomada (próxima campanha real do Eric):** pedir lista (CSV da view filtrada se for por etiqueta), dialog_id do template, confirmar delay 5s no painel, validar 1-2 miolos em texto, piloto 2-3 leads, aprovação, batch. A engine e o dedup já estão prontos.
