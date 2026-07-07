# Golden run — comercial:transferir-lead

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** transferência TESTE ponta a ponta sem terceiros — "lead" = chat real pessoal↔corporativo do próprio Eric (5511937290488, histórico rico com áudio já transcrito), pipeline Prospeccao, vendedor Eric Luciano. Origem sem evidência literal no chat → parada correta da skill; resposta do Eric roteirizada no cenário ("EVENTO presencial"). Executado: pessoa 15470 reutilizada por match forte → deal 15030 (pipeline 7, stage 64, owner Eric) → 2 campos de origem no deal → nota Feynman 18296 → atividade DONE 52200 (06/07) → atividade pendente 52201 (call, hoje 09:00 — regra "<09:00" exercitada) → recall telefone → send real pro corporativo (message_id e1646bc6, template literal). Limpeza: deal + 2 atividades deletados e origem da pessoa REVERTIDA (357 restaurado; success:true em tudo).
- **Resultado: APROVADO — 4 defeitos corrigidos** (comercial 2.5.14 + C:/MCPs/expert-mcps/CLAUDE.md sincronizado).

## Achados e fixes (comercial 2.5.14)

1. **Referência A (enum de origem) DESATUALIZADA vs Pipedrive real (DEFEITO, reproduzido).** `EVENTO | Eric presencialmente` não existe — o real é `EVENTO | Eric conheceu presencialmente`; faltavam `EVENTO | Imersão Expert Integrado` e `ADS | Webinário`; e a lista embutida estava SEM os acentos que os valores reais têm (`Automação`, `Automático`, `Imersão`, `Formulário`, `Lançamento`) num campo de match exato. Fix: lista real (capturada do aviso do MCP) na Referência A + linha do mapeamento + regra de auto-recovery ("aviso de valor inválido lista as opções → usar o aviso como verdade"). **A fonte canônica `C:/MCPs/expert-mcps/CLAUDE.md` seção 2 estava igualmente desatualizada — sincronizada no mesmo ciclo.**
2. **Sobrescrita SILENCIOSA de origem preenchida (DEFEITO grave, aconteceu de fato).** A pessoa 15470 TINHA "Origem do Contato" (option ID 357 no hash) e o `update_person` sobrescreveu sem avisar — o aviso anti-sobrescrita do MCP cobre só campos nativos, não custom_fields; e o critério "atualizar apenas campos VAZIOS" da skill não era executável (enum de pessoa vem como ID numérico, não literal). Fix: PRÉ-CHECK obrigatório com `get_person` + os 2 hashes canônicos da conta (`0408a55a…` = Origem do Contato, `3c41f449…` = Detalhes) documentados no Passo 3.3. Estado original restaurado via API.
3. **Mesmo defeito no procedimento da prospecta-lead (DEFEITO herdado, corrigido junto).** O check "procurar literais de opção nos valores do JSON" falha pra enum (vem ID). Fix no Passo 3 da prospecta-lead: hashes canônicos + regra "valor só-dígitos = enum preenchido".
4. **`search` do whatsapp-agent estoura statement timeout sem recovery (DEFEITO, reproduzido 2x).** Query "37290488" deu timeout 2x (circuit breaker). Fix: linha nova na tabela de recovery — repetir 1x; persistindo, resolver direto com `read(chat=<telefone/nome>)` (foi o caminho que funcionou).

## Execução real (o que foi validado)

- Regra da ORIGEM bloqueou corretamente (nenhum trecho literal no chat) — pergunta ao Eric é o comportamento certo; cenário roteirizou a resposta.
- Match forte: busca por nome trouxe 5 pessoas sem relação (fuzzy do Pipedrive de novo); busca por telefone trouxe a certa — a regra últimos-8/e-mail idêntico da skill filtrou exatamente como desenhada (é a proteção que faltava na calendly-agendar, corrigida no run 42).
- Deal na PRIMEIRA etapa, owner = vendedor; título `Nome | Empresa`; atividade DONE retroativa + pendente com `due_time 09:00` (execução 01:5x BRT).
- Send do Passo 8 validado de verdade (ok:true, provider 43B934894CBA47B187E1) — instância pessoal → corporativo do Eric, template literal com link do deal logo após o nome e wa.me na última linha.
- MCP resolveu `pipeline_id=7`/`stage_id=64`/`user_id="Eric Luciano"` como a skill descreve.

## Observações (não-defeito)

- **Nota do Brain 60ri3np9ja65 está factualmente errada** ("Contato corporativo Eric Luciano" traz o número PESSOAL 5511996647492; o corporativo é 5511937290488) — o critério de recall do Passo 8 acharia esse número e mandaria a notificação pro chat errado. Corrigida no Brain neste ciclo (qualidade de dado, não defeito da skill).
- `update_person` aceitou o valor inexistente "EVENTO | Eric presencialmente" resolvendo pra option ID 333 sem erro (resolução leniente pra pessoa; o `update_deal_fields` rejeita com aviso). Pendência de MCP registrada: enum de pessoa deveria validar como o de deal e avisar sobrescrita de custom_fields — fica pro repo expert-mcps.
- Limpeza fora da skill: deletes via API v1 + PUT restaurando `{"0408…": 357, "3c41…": null}`.
