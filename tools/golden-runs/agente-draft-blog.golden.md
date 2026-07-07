# Golden run — marketing:agente-draft-blog

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** outline canônico de satélite (pillar vendas, slug `atendimento-whatsapp-fora-horario-comercial`) desenhado pra exercitar os ramos críticos: `pubDate` ausente (Passo 4), dado interno no outline (ramo `[preencher]`), fato público sem fonte no outline (árvore de verificação com WebSearch), tema sem sinal de objeção (ramo negativo das tags comerciais).
- **Resultado: APROVADO com entregável real.** MDX de 1.529 palavras salvo em `C:/tmp/atendimento-whatsapp-fora-horario-comercial.mdx` (pronto pro publisher). Autocheck integral: 0 em-dash, 0 tu/teu, 0 hype, 0 emoji, faixa satélite OK, related = 3 slugs reais, FAQ 5 pares, sem tags objecao/setor (correto: sem sinal no outline). Camada 0 respeitada: 2 `[preencher]` (fatia de leads fora do expediente nos funis da Expert; custo de plantão humano com fonte) em vez de consultar fonte interna. Fato público verificado antes de citar (HBR 2011, "The Short Life of Online Sales Leads": ~7x qualificação em resposta <1h; 23% nunca respondem; média 42h). Cross-links pra post publicado (case jurídico) como fonte permitida.

## Achados e fixes (marketing 2.13.4)

1. **Template sem `takeaways` (DEFEITO, SKILL.md).** O frontmatter do template e o item de autocheck omitiam o campo `takeaways`, que os posts reais têm e que o build usa pra gerar o box "Em resumo" (a criar-post-blog deprecated tinha; a substituta perdeu na migração). Post gerado pelo template sairia publicado sem resumo. Fix: campo no template (3-4 claims) + item do autocheck.
2. **Passo 4 (pubDate) obsoleto vs realidade do repo (DEFEITO, SKILL.md).** A cadência seg/qua/sex "a partir de 2026-06-25" sem piso de data escolheria 26/06 — data no PASSADO (o lote de 05-06/07 publicou 106 posts de uma vez e a janela original ficou pra trás). Além disso o repo agora tem `pubDate` em 2 formatos (date simples e datetime `...Z` do lote), que a regra de comparação não previa. Fix: piso em max(2026-06-25, hoje), comparação truncada por dia, emissão em `YYYY-MM-DD`. No run, a regra corrigida escolheu 2026-07-08 (qua, primeira livre ≥ hoje).

## Relatório de pendências do draft (contrato do bloco 2)

- `[preencher]` no H2 "Quando os leads realmente chegam...": fatia % de leads fora do expediente nos funis da Expert (dado interno; humano preenche).
- `[preencher]` no H2 "Quanto custa atendimento 24h...": custo mensal de atendente de plantão noturno com encargos + fonte.
- `pubDate` escolhida pela skill: 2026-07-08 (cadência seg/qua/sex, primeira data livre não-passada).
- Fato HBR 2011 verificado via WebSearch e citado inline com fonte nomeada.

## Observações (não-defeito)

- criar-post-blog (predecessora) marcada N/A na FILA: deprecated 29/06, description bloqueia disparo, referência de rollback íntegra.
- O output oficial da skill é "MDX em code block" (não salva arquivo); no harness de validação o MDX foi salvo em C:/tmp como artefato do run — adaptação de registro, não desvio da skill (quem salva no repo é o publisher).
