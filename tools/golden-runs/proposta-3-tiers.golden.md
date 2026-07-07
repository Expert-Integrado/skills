# Golden run — lab:proposta-3-tiers

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "proposta AI Lab presencial pra Gustavo Lobo" (produto nomeado inequívoco — pula a pergunta do Passo 2; deal real 10964 Madeplant, cross-validado nos runs 27 e 30). Side-effects executados de verdade e marcados: PDF no path final do Drive + nota no deal com prefixo [GOLDEN RUN].
- **Resultado: APROVADO no escopo, com 4 defeitos corrigidos.** Passo 1: search_persons (1 pessoa, sem homônimo) + search_deals (1 deal open) → 10964; Passo 2: todos os rótulos extraídos do summary; Passo 3: list_deal_notes → 6 notas, nenhuma indica proposta ENVIADA (pitch verbal na call com valores, docs pendentes) → v1 correto; Passo 4: template lido do Google Drive na 1ª tentativa; Passo 5: tiers do AI Lab presencial (12K/20K/44K) travados; Passo 7: fallback Playwright (http.server + page.pdf) → PDF A4 4 páginas, paleta Midnight Executive, 56.466 bytes em `Processo Comercial/Propostas/0607-Madeplant-AILabPresencial.pdf`; Passo 8: create_note → ID 18289. Checklist final completo.

## Entregável real

- PDF: `G:/Meu Drive/claude-workspace/Workspace/Processo Comercial/Propostas/0607-Madeplant-AILabPresencial.pdf` (real, aproveitável — o deal está em negociação e o Eric ainda deve os documentos ao Gustavo; conferir ROI antes de enviar, ver observação 1)
- Fonte: `C:/tmp/golden-proposta/` (proposta.md, proposta.html, render_pdf.py)
- Nota Pipedrive ID 18289 no deal 10964, prefixada [GOLDEN RUN — pode apagar]

## Achados e fixes (lab 3.10.6)

1. **Template canônico NÃO tem placeholders (DEFEITO central, reproduzido).** `Proposta_Comercial.md` é transcrição do PDF genérico: zero `{{...}}` e a seção Investimento tem só 2 preços, sem estrutura de tiers. O Passo 6 ("substituições automáticas no template") não tinha onde acontecer e a validação "nenhum {{...}} remanescente" passava trivialmente com proposta 100% genérica. Fix: Passo 6 reescrito — mapa de inserção explícito (capa personalizada, seção nova "Seu contexto", ROI em Resultados, case antes do investimento, seção Investimento SUBSTITUÍDA pelo bloco de 3 tiers) + validação trocada pra presença das inserções.
2. **Case == cliente (DEFEITO, reproduzido).** Segmento Indústria → mapa fixo manda usar case Madeplant... num deal DA Madeplant. Fix: guarda obrigatória — case mapeado == empresa do deal → usar default PSP e sinalizar.
3. **`Total de colaboradores` é FAIXA, não número (DEFEITO, reproduzido).** Veio "201 a 500"; a fórmula de ROI assume número (o exemplo da skill usa 45). Fix: se faixa, extrair número explícito de `Estrutura de colaboradores` (aqui "~210"); senão piso da faixa; sempre sinalizar.
4. **Trigger de tier indefinido só disparava com "tier pedido" (DEFEITO por trace).** Proposta completa de Mentoria (sem Platina) ou Combo (sem Prata) renderiza 3 tiers sempre — o gap era silencioso porque Eric nunca "pede o tier Prata". Fix: trigger mudado pra "SE produto = Combo/Mentoria → PERGUNTAR (definir o tier ou sair com 2)".

## Observações (não-defeito)

- **Fórmula de ROI superestima quando a maioria do quadro é operação de campo**: 210 colaboradores × 1h/dia = R$231K/mês, mas ~150 são motoristas/colheita; com os 60 admin daria R$66K/mês (ainda 3,3x o Ouro). A fórmula é decisão comercial do Eric — não alterada; fica a sugestão de usar colaboradores ADMIN quando o campo Estrutura detalhar.
- O critério do v2 ("nota indicando proposta já enviada") funcionou no caso cinzento: pitch verbal com valores registrado em nota, mas nenhum documento enviado → v1.
- create_note aceita e retorna id normalmente (sem precisar do proxy pipedrive_write); o MCP não tem delete de nota — nota de teste fica marcada no conteúdo.
- Playwright page.pdf via file server local funcionou de primeira; margens zero + page-break-after por div = paginação limpa em A4.
