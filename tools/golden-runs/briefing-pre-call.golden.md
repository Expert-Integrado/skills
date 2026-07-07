# Golden run — lab:briefing-pre-call

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "briefing Gustavo Lobo" (exemplo canônico da própria skill; lead real com deal 10964 Madeplant, dados cross-checáveis com o run fup-inteligente da mesma sessão). 100% read-only — zero side-effect.
- **Resultado: APROVADO no escopo.** Passo 1: search_persons + search_deals em paralelo → 1 match claro (deal 10964 open); Passo 2: get_deal_summary validado (retorno idêntico ao do run anterior na mesma sessão); Passo 3: 3 recalls conforme a regra (nome, empresa por serem termos distintos, "Indústria dor objecao" com segmento do campo custom) — achou as notas de ouro (mgyws59r83qf combo R$44K, x6g6048x3ste pattern Besetta+homeopatia) e uma dor de segmento MUITO pertinente (na2ozoctjget "IA mata empregos" — o time da Madeplant sabotou após automação 15→5); Passo 4: chat exato + contexto extra legítimo (pedido de reforço no grupo G4 Tools); Passo 5: executado; Passo 6: 1-pager entregue no template exato, com ALERTA implícito de atividade vencendo hoje, tom classificado pelo critério objetivo (informal, 3+ sinais), zero emoji, campos sem dado = "sem registro".

## Achados e fixes (lab 3.10.5)

1. **WhatsApp search sem guarda de homônimo (DEFEITO, reproduzido com dado real).** A busca "Gustavo Lobo" retornou, misturado ao lead da Madeplant, um "Gustavo Lobo" DIFERENTE (infoprodutor mineiro do grupo Antiescola, msgs de 2023, "casado, 47 anos, mercado financeiro"). Executor literal poderia contaminar o dossiê com o perfil do homônimo. Fix: guarda de pertinência no Passo 4 — chat com chat_id == telefone do lead é fonte primária; mensagem de outro chat só entra citando a empresa/deal, como "contexto extra"; perfil que contradiz o deal = homônimo, descartar.
2. **Outlook ler_emails sem validação de pertinência (DEFEITO, reproduzido).** Busca "Gustavo Lobo" devolveu 3 falsos positivos (email interno da Kesia + 2 CSATs em massa do G4 com "lobo.renato" entre 100 destinatários) — nenhum do lead (gustavoloboleite@hotmail.com). Executor literal reportaria "últimas trocas" falsas. Fix: guarda no Passo 5 — só conta email cujo remetente/destinatário contém o email da pessoa (do get_deal_summary) ou assunto cita pessoa/empresa; registrar N descartados.

## Observações (não-defeito)

- O recall multi-query da skill funcionou como desenhado: a nota citada como exemplo no próprio SKILL.md (mgyws59r83qf) apareceu de verdade no recall do nome E da empresa.
- O 1º recall (nome) trouxe ~70% de ruído cross-domain — comportamento esperado do Brain (balanceamento por domínio); a instrução "ler todos os domínios" filtra bem.
- get_deal_summary não re-chamado (validado 2x na mesma sessão com retorno completo) — economia legítima de golden run, não desvio do fluxo.
- O dossiê ganhou um "contexto extra" valioso que só existiu POR CAUSA do search amplo (pedido de reforço no grupo G4 Tools de 11/06: "na beira do gol, lê e não responde") — a guarda nova preserva esse ganho ao classificá-lo como contexto extra em vez de proibi-lo.
