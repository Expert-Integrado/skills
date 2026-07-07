# Golden run — lab:pos-reuniao-acoes

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "extrai ações do arquivo <Downloads>/GMT20260521-123046_Recording.transcript.vtt" — transcrição REAL da call de diagnóstico do Gustavo Lobo/Madeplant (21/05, 1h, 202 falas, 9.482 palavras), deal 10964. Confirmação do deal-alvo simulada pelo roteiro. Run PAROU no gate do Passo 7 (skill é propose-only) — ZERO escrita executada.
- **Resultado: APROVADO no escopo, com 3 defeitos corrigidos.** Passo 1: modo path explícito OK (VTT 1.678 linhas, coube no Read); Passo 2: deal único + recall achou as notas da própria call; Passo 3: decisões/ações/owners extraídos fiéis (fechou os 2 programas, combo 15-20% a confirmar, Eric deve 2 docs, data junho, Paraguai 3-4 meses); Passo 4: as 5 atualizações propostas — TODAS "sem alteração" (call antiga, deal já evoluiu); Passo 5: hierarquia ClickUp descoberta (via recovery de overflow), 3 listas candidatas no Space Comercial → regra "não é óbvio, perguntar" funcionou; Passo 6: recall → notas da call JÁ existem (mgyws59r83qf, x6g6048x3ste) → não propor (dedupe correto).

## Proposta montada (parou no gate)

Pipedrive deal 10964 — TRANSCRIÇÃO ANTIGA (46 dias): 1. nota: sem alteração (nota 14281 da mesma call já existe); 2. campos: sem alteração (score 10.0, tudo preenchido); 3. etapa: sem alteração + "?" (desfecho "fechou verbalmente" → Formalização, mas deal já foi e REGREDIU em 29/05); 4. valor: sem alteração (R$39.600 já reflete desconto pós-call); 5. atividade: sem alteração (pendente "travar data imersão" due 06/07 já cobre). ClickUp: task "Enviar 2 propostas + condição do combo" — 3 listas candidatas listadas, aguardando escolha. Brain: nada (já salvo).

## Achados e fixes (lab 3.10.7)

1. **Sem guarda de call antiga (DEFEITO, demonstrado com dado real).** Call de 21/05 processada em 06/07: desfecho "cliente fechou verbalmente" mapeia pra Formalização — e o deal JÁ esteve em Formalização (28/05) e regrediu pra Em negociação (29/05). A regra "só avançar, nunca retroceder" NÃO pega o caso: re-avançar É avanço. Executor literal proporia mover etapa, duplicar nota da call e recriar atividade. Fix: guarda obrigatória no Passo 4 — extrair a data da call (nome do arquivo GMT/YYYY-MM-DD) e comparar com histórico de movimentação + notas + valor; deal evoluiu depois da call → "sem alteração" nos itens já refletidos + aviso "TRANSCRIÇÃO ANTIGA".
2. **Diretório Plaud default não existe (DEFEITO de binding, reproduzido).** `$HOME/Documents/Plaud` → "Directory does not exist" no primeiro Glob do modo por-nome. Estrutura real: `Processo Comercial/Transcricoes Calls/` (VTTs nomeados por lead — único buscável por nome), `Processo Comercial/transcricoes/<vendedor>/` e `Downloads/` (exports Zoom GMT*, data no nome, lead não). Fix: cascata real de diretórios no pré-requisito + aviso de truncamento do Read em VTT >2.000 linhas.
3. **`clickup_get_workspace_hierarchy` estoura o token limit da tool (DEFEITO, reproduzido).** Workspace do Eric = 67K chars → erro com output salvo em arquivo. Mesma família do overflow do get_voice_guide. Fix: recovery documentado (grep no arquivo salvo pelo Space-alvo) + referência real do Space Comercial (3 listas, IDs anotados).

## Observações (não-defeito)

- A regra ">1 lista candidata = perguntar" do Passo 5 segurou o chute (3 listas no Space Comercial).
- O filtro do Passo 6 (só propor nota generalizável + recall antes) funcionou de ponta a ponta: o pattern da call (Besetta/homeopatia) já estava salvo — proposta correta foi NÃO duplicar.
- Cenário de call antiga é raro no uso normal (fluxo é pós-call imediato), mas é exatamente o que acontece ao reprocessar backlog de transcrições — a guarda protege o CRM de regressão silenciosa.
- VTT desta call (1h) = 1.678 linhas; coube no Read default. Compactei com script Python (Write + rodar, nunca heredoc) só pra parsing eficiente — a skill em si não tem Bash/Write, e não precisa.
