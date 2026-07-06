# Golden run — marketing:pauta-semanal (side-effect: 1 run Apify, ~US$0,10-0,15)

## INVOCAÇÃO (colar numa sessão limpa)

```
/marketing:pauta-semanal monta a pauta da semana
```

## VALIDAÇÃO

- [ ] Achou RESEARCH_DIR e competitors.txt sem perguntar; Python detectado via command -v com fallback documentado
- [ ] research.py rodou com --dias 7 --top-total 15 e o RUN_DIR foi capturado da última linha do output
- [ ] frame_path lido como caminho ABSOLUTO direto no Read (sem concatenar com RUN_DIR); frame null/ausente não quebrou
- [ ] 5 pautas geradas no template literal (6 campos), acentuação correta, Referência real citada em cada uma
- [ ] Arquivo salvo em pautas/<AAAA-MM-DD> E entregue na conversa (os dois, não um só)
- [ ] SE APIFY_TOKEN ausente: parou com a mensagem de erro real do script (não inventou fallback)

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
