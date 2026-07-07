# Golden run — conselho (skill aninhada v2.1.0, repo conselho)

- **Data:** 07/07/2026 · máquina: PC · executor literal
- **Cenário:** convocação REAL sobre decisão genuína com tradeoff, emergida dos runs 38-39: "onde devem morar as 2 skills wa (transcrever-conversa, estou-devendo) — repo de skills distribuído ou legacy/main do whatsapp-agent?". Fluxo completo: enquadramento neutro com os 4 componentes, 5 conselheiros `Task general-purpose` em paralelo NUMA mensagem, presidente, veredito no chat.
- **Resultado: APROVADO — execução da skill sem desvios; 4 defeitos de empacotamento do repo corrigidos** (commit `4120ba3`, release 2.1.1, pushado).

## Validações da skill (todas passaram)

- Passo 1A: teto respeitado (contexto já em sessão + 1 leitura da SKILL.md); Passo 1B: pergunta enquadrada neutra com os 4 componentes.
- Passo 2: 5 `Task` em paralelo numa única mensagem, `subagent_type=general-purpose`; contagem real de palavras: Contrário 287, Pergunta-Por-Quê 294, Expansionista 292, Forasteiro 282, Executor 278 — todos em 150-300.
- Passo 3: presidente entregou as 5 seções na estrutura exata (inclusive discordando parcialmente da maioria com raciocínio próprio — o comportamento SEMPRE #4).
- Passo 4: veredito apresentado no chat em markdown, zero HTML/arquivo.
- Passo 5: default NÃO salvar respeitado (nenhum critério disparou; nenhuma transcrição gravada).

## Defeitos de empacotamento corrigidos (repo conselho, 4120ba3 / 2.1.1)

1. **SKILL.md raiz `llm-council` duplicada e desatualizada (DEFEITO — o da task Brain 116k46s84rpc).** Variante manual antiga que ainda descrevia peer review (removido DE PROPÓSITO na v2) — 2 erros de telemetria em 2 invocações. Fix: aposentada (deletada); fonte única = `skills/conselho/SKILL.md`.
2. **commands/conselho.md invocava a skill aposentada.** "Use a skill `llm-council`" → skill `conselho`. Sem o fix, o slash command quebraria após a aposentadoria.
3. **README instalava a variante errada.** Versão 2.0.0, "revisão por pares" na descrição, e TODOS os paths de instalação/uninstall/troubleshooting apontando `~/.claude/skills/llm-council` + SKILL.md raiz. Fix: paths pra `skills/conselho/SKILL.md` e `~/.claude/skills/conselho`, versão 2.1.1, peer review removido. apresentacao.html tinha o mesmo path stale (corrigido; atribuição ao Karpathy preservada).
4. **Versões e URLs inconsistentes nos JSONs.** plugin.json 2.1.0 vs marketplace metadata 2.0.1; homepage/repository na org arquivada `expertintegrado`. Fix: 2.1.1 nos dois + URLs na org canônica `Expert-Integrado`.

## Veredito real produzido (deliverable — resumo)

- Unanimidade: o status quo (skills em branch morto, editáveis só por `git show`) é indefensável; o drift temido já aconteceu no arranjo atual.
- Recomendação do presidente: migrar as 2 skills wa pro repo de skills distribuído, com o mecanismo do dissidente embutido (header declarando dependência de schema + smoke test de contrato no golden run + nota no legacy/main).
- Única coisa a fazer primeiro: diffar `comercial:estou-devendo` já distribuída contra a versão pós-golden-run do legacy/main ANTES de copiar qualquer byte (evita terceira cópia divergida).

## Observações (não-defeito)

- Sed com backslash do Windows (`skills\llm-council`) não casou no Git Bash — Edit tool com match literal resolveu; variantes com `/` o sed pegou normal (registro de método, não defeito da skill).
- O presidente (subagente) verificou sozinho que `comercial:estou-devendo` existe no catálogo da sessão — confirmação do transversal-m (subagente general-purpose herda o ambiente).
- A decisão do veredito (migrar skills wa) é INSUMO pro Eric, não ação executada — mover skill de repo é mudança de topologia que fica gated.
