# Golden run — lab:curar-brain-semanal

- **Data:** 06/07/2026 23:43 BRT · máquina: PC · executor literal via subagente (economia de contexto do run principal)
- **Cenário:** "cura o brain" contra o vault REAL (2.945 notas, 2.894 edges, +1.161 em 7d). Propose-only — Passos 0-6 executados, ZERO mutação, parou no gate do Passo 7. Sem colisão com a cron de domingo: aquela cura TASKS 14+ dias; esta cura NOTAS/edges (rotinas distintas).
- **Resultado: APROVADO no escopo, com 3 defeitos corrigidos + relatório real entregue.** Relatório: vault SAUDÁVEL — 0 notas kind=null (aritmética fecha: soma dos kinds = 2.945), 0 tldr fraco nas 333 enumeradas, 0 domínios fora do canon (stats devolveu exatamente os 12), 0 duplicatas pela rubrica, 33 edges auditados todos com why >= 20 chars. Custo: 43 chamadas MCP (1 stats, 27 recall, 0 get_note, 15 expand).

## Achados e fixes (lab 3.10.10)

1. **Sem guarda superior de escala (DEFEITO central, reproduzido).** A skill só tem piso (<50 notas); com 2.945 o censo literal exigiria ~210 páginas de recall no Passo 2 + ~6.154 recalls no Passo 3 (1 por nota) — estoura qualquer sessão. Fix: vault > 500 notas → MODO AMOSTRAL obrigatório (página offset=0 por domínio; dup-check e edges nas primeiras 15 do inventário; AVISO de cobertura no relatório); censo completo só sob pedido e via leitura direta do D1 (nota do vault yt4g3yqy9md3).
2. **Inventário multi-domínio tem repetições (DEFEITO, reproduzido).** `domains_filter` casa qualquer domínio do array da nota — counts por domínio somam 6.154 > 2.945 e >= 8 IDs apareceram em 2-3 páginas; o SKILL.md não mandava dedupar e o teste "mesmo domain" da duplicata ficava ambíguo (o campo `domain` do item é o primário). Fix: dedupe por id antes dos Passos 3/5/6 + definição do teste.
3. **Rubrica de duplicata cega a paráfrase (DEFEITO de recall da rubrica, caso real).** Trio do mesmo incidente (ActiveCampaign expirado: gzxbugwz7sro / 92drkkhvoyjo / tqlyof3cemhv, todas operations) tem Jaccard ~0.13-0.14 — invisível pros limiares 0.6/0.7. Fix: regra nova de duplicata SEMÂNTICA → B no top-3 de A + tldrs descrevendo o MESMO evento com >= 2 entidades próprias em comum = Tier C (investigar), preservando o determinismo dos tiers A/B.
4. **Doc fixes menores:** bucket `{kind: null}` NÃO aparece quando é zero (o texto prometia bucket explícito; agora manda conferir pela aritmética); premissa "recall do título traz A em 1º" falha com em-dash/nomes próprios (2 de 15) → "remover A SE presente"; template ganhou a linha padrão para tier vazio.

## Observações (não-defeito)

- O trio ActiveCampaign fica como candidato Tier C REAL pro Eric decidir (merge ou manter): gzxbugwz7sro / 92drkkhvoyjo / tqlyof3cemhv.
- Dois whys de 482fpvf9maer passam o teste literal mas são fracos em mecanismo ("Implementação concreta da coordenação...") — o teste de generic é lista de exemplos, não critério fechado; mantido (endurecer = decisão do Eric).
- `expand` devolve o vizinho sem `kind` (não documentado, sem impacto); recall inclui `url` (Pré-requisitos certos, modelo do Passo 2 omitia — inofensivo).
- Vault em ótima forma: a disciplina de save (kind obrigatório, recall-antes-de-salvar) está funcionando na origem — a curadoria achou zero lixo estrutural em 333 notas amostradas.
