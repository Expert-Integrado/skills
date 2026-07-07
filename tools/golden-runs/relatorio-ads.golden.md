# Golden run — marketing:relatorio-ads

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** run completo exige o MCP do Meta Ads (`ads_get_ad_accounts`, `ads_get_ad_entities`), que vem do conector Meta no ambiente do João — NÃO existe nesta sessão (ToolSearch sem match). Parada legítima no Passo 1, mesma classe do verificar-convites.
- **Resultado: PARCIAL.** Validado tudo que é local: estrutura da skill íntegra (`reference/metas-cpl.md` bundlado no lugar), limites da tabela inline IDÊNTICOS aos do reference (webinário 40/80, mentoria 200/400, WhatsApp 5/12, cursos a definir), regras de guardrail consistentes entre os dois arquivos, lógica de casamento por palavra-chave e fallbacks de tipagem sem contradição interna. Run completo fica pro ambiente com o conector (sessão do João ou tarefa agendada).

## Achados e fixes (marketing 2.13.10)

1. **Regra de +30% divergente entre SKILL.md e a fonte de verdade (DEFEITO, inconsistência).** O SKILL.md define critério objetivo ("+30% SÓ quando CPL ≤ 50% do limite Bom"), mas o `metas-cpl.md` — que a skill manda ler A CADA run como fonte de verdade — dizia só "ou +30% se estiver bem abaixo do Bom" (subjetivo). Executor que seguir o reference aplicaria +30% frouxo. Fix: reference sincronizado com o critério dos 50% e exemplo numérico.

## Observações (não-defeito)

- O template do relatório usa emojis/dingbats (📊🔴🟢) — deliberado: o entregável é pro João (celular/canal), não é resposta ao Eric. Se algum dia esta skill rodar numa sessão do Eric com o hook Stop de zero-emoji, a impressão na conversa pode ser bloqueada — mitigação óbvia é enviar direto ao canal; não mexi porque o formato é do consumidor final.
- A skill já traz blindagens boas nascidas de produção: campos sem prefixo de nível, `amount_spent_descending`, parse de string BR, proibição de somar tipos de resultado, CTR ponderado por impressões, MATAR vence ESCALAR.
- Pré-requisito de envio (Zoom/WhatsApp/Telegram) não exercitado — só entra sob pedido do João.
