# Golden run — eventos:notificacao-webinario

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** preview REAL da cadeia com dados de produção — CSV real de inscritos do Calendly (`event-1389254839-invitees-export.csv`, 125 inscritos → 226 telefones indexados com/sem 9) do webinário "O Imposto Invisível do Empresário" (12/06), cruzado ao vivo com os deals do Pipedrive. Toque 1 (lembrete) e toque 6 (FUP com camada 2) rodados em PREVIEW — modo sem `--confirmar` não dispara nada, só lê o Pipedrive.
- **Escopo (onda 4):** até o preview. Disparo real exige aprovação do Eric (modo SEMI da própria skill) e um webinário futuro real — o evento do CSV já passou.
- **Status: APROVADO (pipeline completo validado em preview; disparo = gate humano por design).** Camada 1 funcionando (199 deals do evento; 174 leads antigos descartados; VAO RECEBER: 25), camada 2 funcionando (toque 6 imprime "Ja agendaram (excluidos do FUP): 0" e aplicaria stages 54/60/79), segmentação A/B contada (10 decisores / 15 funcionários), copy envelopada certinha (`Olá. <miolo> Obrigado.`, linha única, acentuação correta, sem travessão), `--diag` default aplicado no toque 6.

## Achados e fixes (eventos)

1. **Match do `--evento` era ACENTO-SENSÍVEL e o exemplo da própria skill retornava 0 (DEFEITO CRÍTICO, reproduzido nos 2 sentidos).** `--evento "Imposto Invisivel"` (sem acento, como no exemplo da skill e no docstring do script) → 0 deals; `"Imposto Invisível"` (como está no Pipedrive) → 199 deals. O executor literal que seguisse o exemplo teria `VAO RECEBER: 0` e travaria no Passo 3 sem pista da causa (a skill dizia "o script ja e case-insensitive", omitindo o acento). Fix de causa raiz no script: `_fold()` com NFD strip (match case E acento-insensitive) — re-testado: sem acento agora casa os mesmos 199 deals; SKILL.md atualizado.
2. **`SYNC` do `disparar_toque.py` hardcoded no OneDrive morto (DEFEITO, mesmo padrão dos runs 55-56; era o PENDENTE-SCRIPT da skill).** Fix: mesma resolução robusta das engines (env `CLAUDE_SYNC_DIR` → autodetecção G: → OneDrive legado); a nota do Passo 2 foi reescrita e o PENDENTE-SCRIPT deixa de existir. Validado: preview rodou com a engine carregada do G:.
3. **Instrução de rotação de token defasada em 2 pontos (NUNCA + Erros #8, mesmo defeito latente dos runs 55-56).** "Rodar setup-secrets.ps1" não propaga mais o cache da claude-sync que o script lê. Fix: procedimento reescrito nos 2 pontos.

## Observações (não-defeito)

- O algoritmo de cron do Passo 7 (date -d com offsets) e a decisão do Toque 5 (MANUAL default) não foram exercitados — sem webinário futuro real; a sintaxe foi conferida a seco e está coerente com o CronCreate desta máquina.
- "Ja agendaram: 0" no toque 6 é plausível: o evento passou há ~1 mês e os deals que agendaram já saíram de open ou os 25 remanescentes nunca agendaram.
- **Retomada (próximo webinário real):** insumos do Passo 1 com o Eric → preview por toque → piloto fora da janela 24h no número de teste dele → aprovação → disparo/agendamento via CronCreate (durable:true).
