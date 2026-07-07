# Golden run — lab:criar-voice-guide

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** entrada "otimizar meu voice guide" (o guide do Eric existe, v1.6.3) → decisão de entrada correta: pular pra FASE 5. Antes, os dois artefatos de código embutidos (Fases 1-2) foram executados literalmente contra corpus REAL (18 exports de WhatsApp em `C:/tmp/wa-migration/txt/`, os mesmos do ciclo v1.6). Fase 5 Camada 1 rodada de verdade: holdout INÉDITO pela opção 1 da skill (trocas de 03-06/07/2026, posteriores à v1.6.3 de 03/07), 3 pares do estrato equipe via whatsapp-agent read, gerador e juiz em subagentes ISOLADOS (nenhum viu as respostas reais), prompt do juiz usado ao pé da letra. Camada 2 (teste humano cego) = gate do usuário — run PARA ali, propose-only.
- **Resultado: APROVADO no escopo, com 1 defeito central (3 modos de falha) corrigido.** Snippet Python da Fase 2 funcionou COMO ESCRITO (família n=10.270 mediana=26 minúscula=38%; equipe n=4.071 mediana=37 — ordem de grandeza bate com o guide). Formato de export Android confirmado idêntico ao regex da skill. Juiz cego devolveu as 3 linhas no formato pedido; mini mapa: sintaxe 8,7 / vocabulário 8,3 / modulação 8,7 / retórica 8,7 / anti-padrões 9,7 / substância 10 — coerente com o critério de parada da skill (superfície ~9 saturada; guide v1.6.3 não precisa de iteração de superfície).

## Achados e fixes (lab 3.10.11)

1. **Snippet de corte pré-IA da Fase 1 quebrado em 3 modos (DEFEITO central, todos reproduzidos no corpus real):**
   - (a) **Cego ao autor** — grepa em-dash de QUALQUER linha; no chat `+55 11 93028-0488` o primeiro em-dash era do interlocutor, e em grupos (CONFRA, G4) de terceiros. Em-dash alheio não diz nada sobre a escrita da pessoa e derruba meses de corpus limpo.
   - (b) **Linha de continuação exclui o arquivo** — mensagem multi-linha só tem data na 1ª linha; quando o primeiro em-dash cai numa continuação, o `grep -oE` de data devolve vazio e o arquivo SAI do cálculo (aconteceu com 7 de 10 arquivos com em-dash). Os dois bugs se compunham: o snippet original dava corte 13/01/2026 por acaso (arquivos com em-dash real do Eric estavam excluídos).
   - (c) **Cego às fontes 3/4** — no corpus bruto, bot/atendente ainda estão atribuídos ao autor da conta: o bot "📡 Resumo Tático" dava corte falso 20/05/2025; o primeiro em-dash do Eric mesmo (comunicado colado de IA) era 13/01/2026.
   - **Fix:** snippet substituído por awk que rastreia a mensagem corrente do AUTOR (cobre continuações), ignora runs `———` (separador = fonte 5), imprime top-3 datas + instrução obrigatória de inspecionar o hit antes de aceitar (bot/atendente/encaminhada → descarta e desce pra próxima). Validado: acha as ocorrências que o original perdia e a inspeção converge pro corte verdadeiro.

## Blind test Camada 1 real (registro)

- Holdout: 3 pares equipe (Asafe), 03-06/07, posteriores ao guide — inéditos por construção (opção 1 da Fase 5).
- Isolamento respeitado com desvio anotado: o FACILITADOR viu as respostas reais ao coletar os pares (inevitável quando é ele que lê o chat); mitigação = gerador em subagente que recebeu SÓ estímulo + guide (protocolo Camada 1 preservado na geração e no julgamento).
- Ilustração perfeita do "teto de substância" da skill: no par das duas pautas, o Eric real respondeu o CONTEÚDO (agenda ok, votação da imersão); o clone, sem contexto, devolveu formato ("manda áudio dos dois"). Nota de voz alta, substância impossível — exatamente o que a Fase 6 prevê.
- Pares preparados servem pro Eric rodar a Camada 2 (cego humano) se quiser — mas v1.6.3 já está no critério de parada.

## Observações (não-defeito)

- Prompt do juiz presume "colar o guide"; em Claude Code é mais prático o subagente LER `~/.claude/voice-guide.md` — equivalente ao "prompt que já embute o guide" da opção 1, sem mudança de comportamento.
- Snippet Fase 2 em corpus BRUTO conta placeholders de mídia/"Mensagem apagada" — não é defeito: a skill manda rodar após a higiene (fonte 5 remove).
- A skill é deliberadamente infra-independente (export manual); nesta máquina o whatsapp-agent read encurta a coleta do holdout — usado no run como fonte dos pares, sem tocar no pipeline prescrito.
