# Golden run — comercial:estou-devendo (A2: read-only WhatsApp/Supabase)

## INVOCAÇÃO (colar numa sessão limpa)

```
/estou-devendo
```

## VALIDAÇÃO

- [ ] SUPABASE_PAT checado por PRESENÇA (nunca impresso); carregado do 1P item SUPABASE_ACCESS_TOKEN
- [ ] Script primário roda e devolve JSON com as 5 chaves (total_pendencias, mostrando, filtro, por_categoria, chats)
- [ ] UTF-8 íntegro no JSON (nomes com emoji/acento)
- [ ] Zero pendências = resultado válido (não é erro, não cai pro fallback)
- [ ] Classificação: TODOS os chats em exatamente 1 nível; dias_parado >= 3 vence antes do check VIP
- [ ] Links wa.me pra chat_id numérico; nenhuma mensagem enviada
- [ ] --draft/--urgencia nunca passados pro script

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | comercial 2.5.6 | APROVADO no caminho primário (script + Management API, 20 pendências reais) com 4 ACHADOS corrigidos: (1) item 1P `SUPABASE_PAT` NÃO existe — o real é `SUPABASE_ACCESS_TOKEN` (skill e mensagem de erro do script ensinavam caminho quebrado); (2) curl do script sem `--ssl-no-revoke` (exit 35 Schannel, stdout vazio); (3) except engolia o diagnóstico ("ERRO no SQL:" vazio) — agora reporta rc/stderr; (4) stdout cp1252 estourava UnicodeEncodeError com emoji nos nomes. OBSERVAÇÃO DE PRODUTO: as 20 pendências retornadas têm 174-215 dias (fósseis de dez/2025) — o ORDER BY ASC + LIMIT 20 esconde pendências recentes enquanto os fósseis não forem tratados; decisão de design pro Eric (limpar fósseis ou mudar ordenação) |
