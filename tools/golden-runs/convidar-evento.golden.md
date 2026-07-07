# Golden run — eventos:convidar-evento

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Status: PARCIAL — presa em contexto externo (MCP `expert-integrado` ausente nesta sessão).** A fonte da verdade da skill (list_participantes, get_evento, gerar_convite_pdf, update_status_convite, list_lista_espera) vive no MCP expert-integrado, que não está conectado aqui (ToolSearch: 0 matches). Sem ele não há lista de convidados nem PDF — e simular violaria o protocolo do golden. O disparo em si também é gated (Regra 1: "SEMPRE confirmar com Eric antes de disparar").
- **Validação executada (o que dava pra validar daqui):**
  - **whatsapp-agent VIVO e íntegro (smoke read-only):** `status` retornou as 2 instâncias conectadas (pessoal 5511996647492 + profissional), webhook ativo — o canal de disparo do operador Eric funciona.
  - **Atalho local íntegro:** `segmentacao.json` da edição jul/2026 existe no Workspace novo (G:), parseia (lista de 138 itens) e tem exatamente as chaves que a skill promete usar (`participante_id, nome, telefone, envia, segmento, copy, mes_convite_anterior, gancho`).
  - **Tools citadas existem:** todas as `mcp__whatsapp-agent__*` (send/read/inbox/search/zapi_action/get_voice_guide/check_message) e `mcp__pipedrive__*` (search_persons/create_person/create_activity) referenciadas no texto estão registradas nesta máquina.
  - Coerência interna: fluxo de 4 mensagens consistente entre operadores, regras de elegibilidade sem contradição, UUIDs de operador e evento documentados, incidentes históricos (02-03/07) refletidos nas regras duras (instance por chat, número canônico, LIDs).

## Achados e fixes (eventos)

1. **Atalho local citava OneDrive (DEFEITO documental).** "ex: PC do Eric com OneDrive" + path relativo `Workspace\temp\...` — OneDrive é arquivo morto desde 05/07/2026 e a pasta já vive no `G:/Meu Drive/claude-workspace/Workspace/temp/convites-imersao-julho/` (verificado: existe nos 2 lugares, o G: é o canônico). Fix: path absoluto do G: + nota de arquivo morto.

## Observações (não-defeito)

- O MCP expert-integrado provavelmente vive na config de outro diretório/projeto (sessões de eventos) — não é defeito da skill; registrar que o golden completo precisa rodar numa sessão com esse MCP conectado.
- **Retomada:** próxima leva real de convites do Eric (lote ~30/dia) numa sessão com o MCP expert-integrado — o fluxo até o gate (listar → segmentar → PDF → checagem 3.5) valida sozinho; o disparo aguarda o "confirmo o disparo?" do Eric.
