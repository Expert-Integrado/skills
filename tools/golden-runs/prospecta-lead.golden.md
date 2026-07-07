# Golden run — comercial:prospecta-lead

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** lead TESTE fictício ponta a ponta ("Teste Golden Run Prospecta - apagar" | Empresa Fictícia Golden Run, Sócio fundador, tel 5511999990042, origem default PUBLI | G4 Tools). Fluxo completo: Passo 0 relógio → dedupe (0/0) → WebSearch (nada) → REGRA ZERO `nao-confirmada` → pessoa 22963 + 4 campos → deal 15029 (pipeline 7, stage 64→65) → campos do deal (só input + 2 enums PENDENTE) → voice guide + rascunho (check_message ok=true score 10) → atividade 52199 (whatsapp, due 07/07 02:06, done=false) → nota 18295 → JSON do Passo 10 (194s). Limpeza: deal, pessoa e atividade deletados via API (success:true nos 3; soft delete).
- **Resultado: APROVADO — 3 defeitos corrigidos** (comercial 2.5.13).

## Achados e fixes (comercial 2.5.13)

1. **`get_voice_guide` estoura o limite de tokens e o 7.1 não tinha recovery (DEFEITO, reproduzido).** Resultado de 91.029 chars excede o máximo; o harness salva em arquivo e retorna erro. Mesmo defeito já visto na fup-inteligente (2.5.11), mas a prospecta-lead não tinha o recovery. Fix: 7.1 documenta — não re-chamar; ler `## 0. Motor da voz` + `## TL;DR` do guide canônico `~/.claude/voice-guide.md` (ou do arquivo salvo), usar a tabela de regras hard da skill e registrar `voice_guide_via_arquivo: true`.
2. **Path do guide errado na seção Voice Guide (DEFEITO factual).** Dizia `claude-sync/memory/eric-voice.md` — seed legado que NÃO existe (CLAUDE.md global já avisa). Fix: fonte canônica `~/.claude/voice-guide.md`.
3. **Passo 2d não-executável com segmento indeterminado (ambiguidade).** `recall("dor segmento {X}")` sem `{X}` quando o input não traz segmento e a pesquisa não confirma nada. Fix: 1 linha — pular o item e deixar `dor_inferida` vazio.

## Execução real (o que foi validado)

- REGRA ZERO honrada de ponta a ponta: nenhum sinal A/B → `nao-confirmada` → ZERO campo vindo de pesquisa; só input. Enums sem fonte = `❌ INFORMAÇÃO PENDENTE` (aceitos com emoji+acentos exatos); Segmento/Informações gerais/Mídias ficaram vazios.
- Mapeamento mecânico do `Nível de decisão`: "Sócio fundador" → `Sócio decisor` (aceito).
- Regra da madrugada exercitada de verdade: run às 01:36 BRT → atividade `due_time 02:06` cru, sem deslocar pra horário comercial (comportamento literal do Passo 8).
- Dedupe: 4 buscas (nome/telefone × persons/deals) = 0 resultados; fluxo de criação completo (caminho "pessoa não existe").
- `check_message` em burst de 3 linhas: ok=true, score 10, zero violações.
- Passo 10 JSON: `{ok: true, deal_id: 15029, person_id: 22963, stage_movido: "Lead Mapeado -> Tentando contato", identidade: {confianca: "nao-confirmada", sinais_batidos: [], discrepancias: []}, tempo_execucao_s: 194, atencao_manual: ["registro TESTE — apagar (feito)", "WebSearch não localizou perfil único"]}`.

## Observações (não-defeito)

- Limpeza (fora da skill): MCP pipedrive não tem delete — usado API v1 `DELETE /deals/15029`, `/persons/22963`, `/activities/52199` com token 1P (`PIPEDRIVE_API_KEY` — o nome do item NÃO é PIPEDRIVE_API_TOKEN). Soft delete, lixeira 30 dias.
- `create_person` aceita `custom_fields` direto (o fluxo em 2 chamadas da skill funciona e protege origem 1x-na-vida; não mudar).
