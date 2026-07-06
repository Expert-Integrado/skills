# Golden run — lab:claude-task (A2: task no Brain do próprio Eric, reversível)

## INVOCAÇÃO (colar numa sessão limpa)

```
me lembra de <ação> amanhã de manhã
(depois) conclui a task <palavra-chave>
```

## VALIDAÇÃO

- [ ] Âncora de data via `TZ='BRT3' date` (POSIX — IANA devolve UTC no Git Bash do Windows)
- [ ] save_task: title verbo-primeiro, due BRT sem Z, sem prazo inventado
- [ ] possible_duplicates avaliado pelo comportamento REAL (task nova já criada; fuzzy com falsos positivos)
- [ ] Fluxo C: id resolvido de listagem real (list_tasks_due_today), nunca chutado
- [ ] complete_task com outcome só quando há resultado declarado
- [ ] Confirmações de 1 linha, sem JSON, sem emoji

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | lab 3.10.3 | APROVADO ponta a ponta (criar → listar → concluir com task de teste real no Brain, id m2xt0he0a5pe) com 2 ACHADOS corrigidos: (1) TRANSVERSAL — Git Bash do Windows sem tzdata: TZ=America/Sao_Paulo devolvia UTC (+3h; dia errado entre 21h-0h); trocado por TZ='BRT3' em 7 skills de 2 repos; (2) texto do possible_duplicates descrevia "não criar duplicata" mas a tool JÁ cria e retorna candidatos fuzzy (5 falsos positivos no teste) — texto alinhado ao real (dup = cancelar a nova). due/when em BRT corretos no retorno da tool |
