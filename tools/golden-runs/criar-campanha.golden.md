# Golden run — marketing:criar-campanha

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Status: PARCIAL — presa em contexto externo (MCP ausente).** A skill exige o MCP do Meta Marketing API (`ads_get_ad_accounts`, `ads_create_campaign`, ...) e o MCP Nano Banana (`mcp__nanobanana-mcp__gemini_generate_image`) — NENHUM dos dois existe nesta sessão/máquina (ToolSearch confirmou 0 matches). Esses MCPs vivem no ambiente do João (gestor de tráfego), mesma situação do `relatorio-ads`. Sem eles não há como executar as Fases 3-4 (criativos + publicação PAUSADA) de verdade, e simular seria violar o protocolo do golden run.
- **Validação estática executada (o que dava pra validar daqui):**
  - `reference/` completa: os 6 arquivos exigidos existem (`produtos.md`, `copy.md`, `criativos.md`, `budget.md`, `meta-config.md` + o CLAUDE.md global opcional).
  - `CAMPANHAS_DIR` default (`G:/Meu Drive/claude-workspace/Workspace/Processo Comercial/Campanhas/`) EXISTE no PC — o path novo do Google Drive está correto (skill já migrada do OneDrive).
  - Coerência interna: checkpoints 1-4 bem definidos, budget em centavos consistente nos exemplos, regra CBO/ABO sem contradição, tabela de CTA com precedência clara, naming com histórico.
- **Retomada:** rodar o golden na sessão do João (ou quando o MCP Meta + Nano Banana forem plugados aqui), com cenário do exemplo da própria skill ("Super SDR, R$50/dia, WhatsApp") até a campanha PAUSADA + checkpoint 4.

## Achados

- Nenhum defeito verificável daqui. Nota: a skill já foi atualizada pro Workspace novo do Google Drive (diferente da orquestrar-conteudo, que ainda apontava pro OneDrive morto — corrigida hoje).
