# Golden run — lab:triagem-matinal (A2: 100% read-only nas fontes)

## INVOCAÇÃO (colar numa sessão limpa)

```
/triagem-matinal
```

## VALIDAÇÃO

- [ ] Passo 0: data/dia BRT; fim de semana pula Outlook+ClickUp
- [ ] 4 fontes consultadas ou marcadas indisponíveis (nenhuma abortou a triagem)
- [ ] Retorno grande do ler_emails processado via grep no arquivo tool-results (não é erro)
- [ ] Re-chamada com quantidade=200 quando vieram exatamente 50; teto sinalizado no painel
- [ ] D4Sign: dedupe de lembretes, distratos anonimizados, card vermelho próprio
- [ ] WhatsApp: classificação por categories; VIP via search_deals; golpe vai pro banner
- [ ] ClickUp Satisfação: SÓ contagens agregadas (nunca nome); page=1 quando page 0 = 100
- [ ] Privacidade modo aula/palestra: nenhum nome de cliente em contexto negativo, nenhum detalhe de saúde/pessoal sensível
- [ ] HTML clonado do layout.html (CSS intacto); banner só com 1-3 alertas críticos
- [ ] Ambiente detectado (desktop com preview_start / headless sem); painel salvo no path certo
- [ ] Resumo final no template canônico; NENHUMA escrita nas fontes

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | lab 3.10.2 | APROVADO ponta a ponta (painel real gerado com 200 emails + 8 chats + 118 tasks + 2 recalls) com 7 ACHADOS corrigidos: (1) WORKSPACE_DIR default apontava pro OneDrive morto; (2) retorno de 50+ emails excede o output da tool e vai pra arquivo — skill não previa (agora instrui grep); (3) formato lista do clickup_list_tasks NÃO traz Updated — critério de parada trocado pra due vencido; (4) lista de plataformas do score 3 deixou passar Redis payment failed e Pipedrive 72h; (5) D4Sign sem dedupe de lembretes e distrato exporia nome em rescisão; (6) dado de saúde apareceria no painel (modo palestra agora explícito); (7) categoria descartar virava pendência. Banner real: golpe PIX, Redis 2x payment failed, 2 clientes vencendo hoje |
