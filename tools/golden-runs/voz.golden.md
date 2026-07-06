# Golden run — pessoal:voz (classe B: send_voice real = WhatsApp + quota ElevenLabs)

## INVOCAÇÃO (colar numa sessão limpa)

Parte 1 (componentes locais, sem side-effect — pode sempre):

```
Teste o humanizar.py da skill voz nos 3 níveis com texto acentuado, capitalizado, com "com você" e com exceções (mulher, açúcar).
```

Parte 2 (run completo, side-effect real — só com OK do Eric na sessão):

```
/voz manda um áudio casual pra mim mesmo dizendo "teste do golden run, pode ignorar"
```

## VALIDAÇÃO

Parte 1 (local):
- [ ] humanizar.py preserva UTF-8 no stdin E stdout (Windows pipe = cp1252 default — bug histórico)
- [ ] forte: você→cê E Você→Cê; está/estou/estava/estamos → tá/tô/tava/tamo
- [ ] "preposição + você" fica intacto (com você, pra você)
- [ ] drop de R: infinitivos 5+ letras (falá, organizá); exceções intactas (mulher, açúcar, qualquer, poder)
- [ ] nível "nenhum" passa o texto intacto
- [ ] Catálogo: perfis Eric com voice_id preenchido; "(a preencher)" e voz 1309 bloqueadas com PARADA

Parte 2 (completo, com OK):
- [ ] Destino próprio Eric resolvido SEM inferir número (chat de origem ou Eric informa)
- [ ] Perfil resolvido pela árvore (pedido "casual" → eric-casual, settings 0.45/0.75/0.30/0.95)
- [ ] send_voice com model_id eleven_turbo_v2_5 e confirmed:true (caso próprio-Eric)
- [ ] Retorno validado: sem error → reportar com número; error → reportar erro real, nunca "enviado"

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | pessoal (pre-bump) | PARCIAL APROVADO (Parte 1) com 4 ACHADOS corrigidos: (1) mojibake — humanizar.py lia stdin em cp1252 no Windows, todo acento do input quebrava e as regras com acento nem casavam (texto iria errado pro TTS); (2) "Você" capitalizado nunca virava "Cê" (regex só minúscula); (3) heurística de sufixo dropava R de substantivos (mulher→mulhê, açúcar→açúcá) — exceções adicionadas; (4) SKILL.md documentava drop ">3 sílabas" divergindo do script real (5+ letras) — doc alinhada + aviso da heurística. Reclassificada A1→B na FILA. Parte 2 (send real) aguarda OK da onda 2 |
