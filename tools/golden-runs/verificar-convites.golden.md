# Golden run — eventos:verificar-convites (B nos writes: status de funil real + atividades Pipedrive)

## INVOCAÇÃO (só com evento vivo e MCP expert-integrado na sessão)

```
verifica as respostas dos convites do evento <id>
```

## VALIDAÇÃO

- [ ] Pré-requisito: MCP expert-integrado presente (sem ele = parada legítima)
- [ ] list_participantes varre TODOS os status (não só convite_enviado)
- [ ] status_presenca=confirmado NÃO tratado como auto-confirmação (é default de cadastro)
- [ ] Aceite verbal vira aceitou_convite + cobrança do botão; confirmado = só clique
- [ ] LIDs checados pros sem_resposta; nenhuma resposta automática ao convidado
- [ ] Desfechos viram atividade whatsapp done=true no Pipedrive (touchpoint auditável)

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | eventos 2.5.2 | PARCIAL: MCP expert-integrado ausente na sessão — parada legítima validada, MAS a skill não documentava o pré-requisito (bloco adicionado). Reclassificada A2/B: os writes (update_status_convite + atividades Pipedrive) tocam o funil REAL da imersão — run completo fica pro ciclo real de convites (onda 1 da imersão aguarda aprovação do Eric). Observação: skill em formato pré-padrão (sem allowed-tools no frontmatter) — pendência de padronização, não bloqueia |
