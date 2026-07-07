# Golden run — marketing:criar-webinario

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** edição GOLDEN RUN TESTE ponta a ponta até a parada legítima — briefing colado (a skill aceita), Fase 1 `brief.md`, Fase 2 LPs geradas dos templates reais, validação literal da fase, Fase 3 roteiro manual entregue. Pasta: `Workspace/temp/webinario-golden-teste-ia-operacao` (brief.md, lp-a.html, lp-b.html, confirmacao.html, roteiro-pixel-fase3.md).
- **Resultado: PARCIAL (por natureza) — Fases 1-3 APROVADAS; 2 defeitos corrigidos** (marketing 2.13.12). Fases 4-8 não são exercitáveis em golden run: custo de criativo (criar-reel/imagem têm runs próprios), configuração manual no Meta (parada legítima aguardando confirmação), disparo em lote e live real.

## Achados e fixes (marketing 2.13.12)

1. **`{{ASSIM}}` literal no comentário do templates/lp.html (DEFEITO, reproduzido).** A validação da Fase 2 exige `grep -o "{{[A-Z_]*}}"` VAZIO nos 3 HTMLs gerados, mas o comentário de instrução do template ("Trocar os tokens {{ASSIM}}...") é copiado pra toda edição e não está na tabela de tokens — a validação NUNCA passava. Fix: comentário reescrito sem sintaxe de chaves ("tokens de chaves duplas"); revalidado, grep vazio.
2. **NUNCA #7 contradizia a própria skill (DEFEITO de consistência).** Proibia pixel_id real em QUALQUER arquivo versionado, mas `references/pixel-e-tracking.md` documenta o pixel da conta (1535333454552021) e a Fase 1 DEPENDE dessa documentação ("o pixel documentado em references"). Fix: regra reescrita — proibição vale pra templates/HTMLs; a reference é a exceção explícita e única.
3. **Classificação da FILA estava errada (defeito de tracker, não conta no placar).** Dizia "cria webinar Zoom real — criar + deletar"; a skill NÃO cria webinar Zoom (é playbook de funil: LP + pixel + criativos + campanha Meta pausada + lembretes + pós-live). Linha corrigida.

## Execução real (o que foi validado)

- Fase 1: brief com todos os itens da validação (tema, oferta, data/hora/duração/plataforma, bônus, link de agendamento com UTM ppt, URL-base planejada sem UTM, endpoint, pixel, bio) — insumos vindos do briefing TESTE, nada inventado; prova social com número REAL da 1ª edição (76 inscritos, references/funil-e-metricas.md).
- Fase 2: lp-a/lp-b/confirmacao gerados dos templates; **0 tokens pendentes** (validação literal passou pós-fix); diff A/B confirma que só headline+variante mudam; form com 3 campos visíveis; LINK_CALENDARIO com conversão BRT→UTC correta (20:00 BRT = 23:00Z).
- Fase 3: pixel base só PageView nas LPs e `InscricaoWebinar` (trackCustom) só na confirmação — os templates já implementam a regra de ouro; roteiro manual do Gerenciador de Eventos entregue (`roteiro-pixel-fase3.md`); fase PARA aguardando confirmação (comportamento correto da skill).
- Deploy: fallback correto da skill exercido — HTMLs gerados e deploy reportado PENDENTE com URLs planejadas (edição TESTE nunca sobe; em edição real é gate de prod).

## Observações (não-defeito)

- A validação "formulário tem exatamente 3 campos" refere-se aos campos VISÍVEIS: contagem crua de `<input|<select` dá 14 (4 hidden de variante/UTM + bloco duplicado modal/inline). Executor futuro: contar visíveis.
- Pixel de TESTE `000000000000000` usado de propósito no artefato (o real fica só na reference, conforme NUNCA #7 pós-fix).
