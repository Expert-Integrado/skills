# Golden run — comercial:pipe-review (A2 com RADAR_NO_DEPLOY=1; deploy prod = classe C)

## INVOCAÇÃO

```
roda o pipe review (golden run: prefixar RADAR_NO_DEPLOY=1 no node — valida tudo menos o deploy)
```

## VALIDAÇÃO

- [ ] SCRIPT resolvido via find sob CLAUDE_PLUGIN_ROOT (nunca path chumbado)
- [ ] Token Pipedrive por env ou op read (nunca impresso)
- [ ] JSON único no stdout; sanidade: total == comPendencia + ok E total <= totalAbertos
- [ ] totalAbertos > 0 (0 = falha silenciosa de token, nunca reportar números)
- [ ] Report no template literal com URL canônica pipe-review.vercel.app
- [ ] Desvio (se houver) vira task no Brain — nunca log em arquivo morto

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | comercial 2.5.8 (script do cache 2.3.0) | APROVADO no modo sem deploy: radar REAL rodou (35 deals auditados de 2354 abertos, 23 pendência / 12 OK, top r5=20 estagnados, HTML 19KB local, sanidade aritmética verde). 1 ACHADO corrigido: Passo 5 logava em $HOME/OneDrive (morto) com fallback pro tasks.md (aposentado 03/07) — desvio agora vira task no Brain. OBSERVAÇÕES: (a) cache de plugin em 2.3.0 vs repo 2.5.8 — rodar /plugin update pra propagar; (b) ramo deploy é classe C e segue travado por SAML (task 0lunqicxd45i) |
