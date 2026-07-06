# Golden run — comercial:calendly-link (A2: link single-use real, inofensivo)

## INVOCAÇÃO (colar numa sessão limpa)

```
/calendly-link gera link de diagnóstico
```

(Sem verbo de envio — o ramo WhatsApp exige a pergunta "agente ou você copia?" e o fluxo de 2 sends.)

## VALIDAÇÃO

- [ ] list_event_types com a forma exata (event_types[].uri/name/slug/duration_minutes)
- [ ] Match por slug EXATO antes de substring (diagnostico não pode casar com diagnostico-ia-parceiro-g4)
- [ ] create_scheduling_link com o campo uri literal + max_uses 1
- [ ] booking_url validado (https://calendly.com/d/...); expires_at null é normal
- [ ] Aviso "expira após 1 agendamento"; NENHUMA atividade Pipedrive manual; só 1 link

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | comercial 2.5.7 | APROVADO 8/8 (link real gerado pro Diagnóstico 60min) com 1 ACHADO de doc corrigido: a resposta real do create_scheduling_link NÃO traz max_event_count (a skill documentava; validação por booking_url + instructions). Match por slug validado contra caso real de colisão (2 tipos com "diagnóstico" no nome) |
