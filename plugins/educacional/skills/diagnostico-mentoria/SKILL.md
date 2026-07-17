---
name: diagnostico-mentoria
description: Gera o pacote completo de diagnóstico e plano de ação inicial do onboarding da Mentoria de Automações Inteligentes da Expert Integrado. Use SEMPRE que o usuário mencionar diagnóstico de onboarding, diagnóstico inicial de aluno, plano de ação para mentorado, relatório pós-call de onboarding, montar diagnóstico do aluno X, gerar diagnóstico interno + cliente, apresentação de plano de ação para o aluno, ou qualquer variação envolvendo transcrição de call de onboarding, formulário diagnóstico preenchido, gravação de reunião com cliente da MAI, ou o pedido "gera o pacote do aluno X". A skill recebe transcript da call, formulário diagnóstico, chat da reunião (e opcionalmente a gravação) e entrega quatro materiais — Diagnóstico Interno DOCX+PDF, Diagnóstico Cliente DOCX+PDF, Plano de Ação PPTX+PDF e mensagem de envio — seguindo o padrão visual e de linguagem da Expert Integrado consolidado no caso Marcelo Coelho.
---

# Diagnóstico Mentoria — Expert Integrado

Esta skill transforma o material bruto de uma call de onboarding da Mentoria de Automações Inteligentes em quatro entregáveis padronizados: um diagnóstico interno (para a equipe Expert/Eric), um diagnóstico do cliente (para o aluno), um plano de ação em apresentação (para apresentar ao aluno e enviar em PDF) e uma mensagem curta de envio. O Vanderson é o CS da operação e a skill assume o ponto de vista dele.

A skill foi calibrada a partir do caso Marcelo Coelho — Coelho Music Produções. Esse caso é o padrão de referência para estrutura, linguagem, profundidade e identidade visual. Quando estiver em dúvida sobre formato ou tom, replique o padrão Marcelo.

---

## Quando esta skill ativa

Use sempre que o Vanderson:

- Compartilhar transcript/gravação/chat de uma call de onboarding de um aluno da MAI e pedir o diagnóstico, o plano de ação, ou os "documentos para o aluno"
- Disser frases como "monta o pacote do aluno X", "gera o diagnóstico do X", "faz igual fizemos com o Marcelo", "tô com o onboarding do X, me ajuda a montar os materiais", "preciso enviar os documentos pro X"
- Pedir só a apresentação, só o documento interno, ou só a mensagem de envio — neste caso, gere só o que foi pedido, mas mantendo a coerência com os outros materiais já gerados
- Estiver consolidando informações de mais de uma reunião (ex.: onboarding + setup técnico). Neste caso, una os dois transcripts e gere um diagnóstico consolidado, como foi feito no caso Alberto Grossman / Mundo Maker

Não use esta skill para:

- Onboarding de outros produtos que não a MAI (ex.: Mestres do ChatGPT, AI Innovation Lab, eventos). Use `cs-educacional-expert`
- Mensagens da régua de comunicação de aulas. Use `regua-comunicacao-aulas`
- Reabordagem comercial de leads do Pipedrive. Use `reabordagem`

---

## Inputs que a skill aceita

Trate qualquer subconjunto destes como input válido:

- **Transcript da call** (.vtt, .txt, .srt) — é a fonte principal. Quase tudo do diagnóstico vem daqui.
- **Formulário diagnóstico preenchido** (PDF/DOCX/imagem) — fornece os dados estruturados: empresa, CNPJ, setor, faturamento, folha, ferramentas, atividades por área e horas/semana, resultados esperados.
- **Chat da reunião** (.txt) — costuma trazer e-mail confirmado, CNPJ, links enviados, eventuais correções.
- **Gravação em vídeo** (.mp4) — fallback. Se já houver transcript, ignore o vídeo. Se só houver vídeo, peça ao usuário para transcrever antes (ou avise que o transcript é o ideal).
- **Materiais adicionais** — site da empresa, deck do aluno, dossiês prévios. Use para enriquecer o entendimento de negócio.

Se faltar qualquer input crítico, pergunte ao Vanderson antes de gerar. Nunca invente CNPJ, e-mail, faturamento, folha ou ferramentas. Esses campos saem do formulário/chat; se não houver dado, escreva "Não informado" e siga.

---

## Os quatro entregáveis

Para um onboarding completo, a skill gera quatro materiais (com PDFs derivados, totalizando até seis arquivos):

1. **Diagnóstico Interno (DOCX + PDF)** — documento de uso interno da Expert. Versão expandida com análise consultiva, observações de equipe, ferramentas para apoio, riscos e recomendações para Eric. Leitor: Vanderson, Eric, equipe técnica.

2. **Diagnóstico Cliente (DOCX + PDF)** — versão entregue ao aluno. Mesmo entendimento de negócio, mas mais enxuta, mais direta, sem comentários internos, com os links de cursos/plugins/MCPs já clicáveis. Leitor: aluno e equipe dele.

3. **Plano de Ação (PPTX + PDF)** — apresentação 16:9 com identidade visual da Mentoria de Automações Inteligentes. Usada para apresentar ao aluno na reunião de devolutiva e enviada em PDF posteriormente. Tem 10 a 12 slides. Leitor: aluno na reunião + leitura assíncrona.

4. **Mensagem de envio** — texto curto (WhatsApp ou e-mail) que o Vanderson manda junto com os arquivos, com o link do Calendly de Setup de Implementação. Linguagem CS, direta, sem floreio.

Antes de gerar, confirme com o Vanderson **quais dos quatro entregáveis** ele quer agora (ele pode estar pedindo apenas um, ou todos). Se ele disser "o pacote completo" ou "igual ao Marcelo", entregue os quatro.

---

## Fluxo de trabalho

### Etapa 1 — Ler todo o material

1. Leia o transcript inteiro. Não pule trechos. Pontos de atenção:
   - Frases que o aluno repete (dores reais)
   - Números mencionados (faturamento, folha, equipe, horas/semana, ticket)
   - Ferramentas, sistemas, plataformas citados
   - Frentes de negócio (B2B, B2C, produto, serviço, etc.)
   - Resultados esperados ("eu quero", "preciso", "minha meta é")
   - Sinais de prioridade ("o que mais me consome tempo é...", "isso é o que mais dói")
   - Sinais de maturidade ("eu já uso", "já tentei", "nunca mexi com")
2. Leia o formulário preenchido — confirme os dados objetivos e veja se há divergências com a fala da call (e-mail diferente, etc.). Quando houver divergência, registre internamente.
3. Leia o chat — confirme e-mail e CNPJ. Use o e-mail do chat sempre que houver diferença, porque é o que o aluno digitou na hora.
4. Se houver mais de uma reunião (onboarding + setup técnico), trate como duas fontes complementares e una as informações.

### Etapa 2 — Construir o entendimento do negócio

Antes de gerar qualquer arquivo, escreva mentalmente (ou em rascunho) o entendimento de negócio do aluno em **três a cinco frases**. Esse é o coração de todos os entregáveis. Inclua:

- Quem é o cliente (nome, empresa, setor)
- O que ele vende, para quem
- Em quantas frentes ele opera (e quais)
- Qual é o gargalo central (não confundir com lista de tarefas — gargalo é estrutural)
- Qual é o projeto/iniciativa em curso que pode ser ponto de partida da mentoria

O padrão Marcelo aqui foi: "Negócio educacional híbrido — três frentes: palestra Jazz Corporativo, workshop de criatividade, startup educacional. Gargalo: arquitetura de processos. Projeto-âncora: dashboard pedagógico da startup."

### Etapa 3 — Decidir a prioridade de implementação

Em todo diagnóstico, há uma decisão de prioridade. Ela vira o fio condutor dos quatro materiais. Critérios:

- O que o aluno **já está fazendo** (projeto vivo, energia atual)
- O que ele declara como mais doloroso
- O que tem **maior carga semanal** mapeada
- O que pode virar **prova de valor** para o cliente final dele

Quando esses sinais convergem, a prioridade vira óbvia (caso Marcelo: dashboard). Quando não convergem, escolha a frente que combina projeto-vivo + dor declarada e justifique no documento por que essa frente vem primeiro.

### Etapa 4 — Gerar os entregáveis

Siga as instruções específicas de cada entregável nos arquivos de referência:

- Estrutura completa dos DOCX (interno e cliente): `references/estrutura_diagnostico.md`
- Estrutura completa do PPTX (12 slides, conteúdo de cada): `references/estrutura_apresentacao.md`
- Linguagem e tom (regras de escrita, anti-padrões): `references/linguagem_e_tom.md`
- Catálogo de aulas, plugins, MCPs e templates Lovable com links: `references/catalogo_recursos.md`
- Paleta visual e regras de identidade do PPTX: `references/paleta_visual.md`
- Mensagem de envio (template + variações): `references/mensagem_envio.md`

Para acelerar, use os scripts:

- `scripts/build_diagnostico_docx.py` — gera o DOCX interno OU cliente a partir de um JSON estruturado
- `scripts/build_plano_acao_pptx.py` — clona o template `assets/plano_acao_template.pptx` e substitui o conteúdo de cada slide
- `scripts/to_pdf.py` — converte DOCX e PPTX para PDF via LibreOffice headless

---

## Regras de linguagem e tom (essencial)

O Vanderson foi explícito sobre o padrão de linguagem desejado, ajustando manualmente o material do Marcelo. Replique esse padrão. Leia `references/linguagem_e_tom.md` antes de escrever qualquer parágrafo. Princípios não negociáveis:

- **Direto, sucinto, objetivo.** Frases curtas. Subordinadas só quando agregam.
- **Informação organizacional.** Cada frase carrega um fato ou uma análise — não enfeite.
- **Não pareça IA.** Evite "explorar oportunidades", "alavancar sinergias", "navegar pelo cenário", "no ecossistema dinâmico", "este documento visa", "considera-se importante destacar", "uma jornada de transformação".
- **Sem repetição.** Se já disse uma vez, não diga de novo em outra seção com palavras diferentes.
- **Lógica antes de estética.** A ordem dos parágrafos importa: contexto → diagnóstico → decisão → roadmap → execução.
- **Tabelas em vez de listas longas.** Quando há comparação ou matriz (atividades × horas, recursos × etapa, etc.), use tabela.
- **Bullets curtos.** Bullet com mais de duas linhas vira parágrafo ou vai para tabela.
- **Português direto do CS.** O Vanderson é o autor implícito. Tom: consultor sênior, sem condescendência, sem coaching.

Quando tiver dúvida entre duas formas de escrever a mesma coisa, escolha a mais curta.

---

## Catálogo de recursos: regra crítica

Toda menção a curso, aula, plugin, skill, MCP ou template Lovable **precisa vir com link válido**. Use exclusivamente o catálogo em `references/catalogo_recursos.md`. Esse arquivo tem os URLs oficiais conferidos pelo Vanderson.

- Não invente URL. Se o recurso que você quer recomendar não está no catálogo, recomende um equivalente que esteja, ou pergunte ao Vanderson antes de inserir.
- Use a coluna "quando recomendar" do catálogo para escolher os recursos certos para o perfil do aluno.
- No DOCX interno, mostre os links como hyperlink na palavra "Abrir aula" / "Abrir catálogo".
- No DOCX cliente, idem. Não exponha URLs cruas no meio do texto.
- No PPTX, o link vai discreto no canto direito da linha da aula (texto "abrir" verde, como no padrão Marcelo).

---

## Identidade visual do Plano de Ação (PPTX)

O PPTX é o entregável onde a identidade visual da Mentoria de Automações Inteligentes precisa aparecer com fidelidade. Detalhes completos em `references/paleta_visual.md`. Resumo:

- Slide 16:9 (13.33 × 7.5 polegadas)
- Fundo escuro (preto/grafite)
- Título em fonte **Play** (bold), cor `#FAFAFA`
- Corpo em **Arial**, branco/cinza
- Cor de marca: ciano `#06B6D4` (linhas, marcadores, label superior "PLANO DE AÇÃO", números)
- Destaques numéricos: roxo `#8B5CF6`, verde `#10B981`
- Microcopy de apoio: cinza `#A1A1AA`
- Label superior pequeno: "PLANO DE AÇÃO" em Arial 8.5pt bold ciano
- Linha ciano fina logo abaixo do título de cada slide

Use sempre o template em `assets/plano_acao_template.pptx` como base — o script `build_plano_acao_pptx.py` clona o arquivo e substitui o conteúdo slide a slide, preservando layout, fontes e cores exatas.

---

## Sequência sugerida de execução

Quando o Vanderson entregar todos os inputs e pedir o pacote completo:

1. Confirme em uma frase o entendimento de negócio que você extraiu — é a chance dele corrigir cedo antes de você gerar três arquivos com o framing errado.
2. Confirme a decisão de prioridade.
3. Gere o **Diagnóstico Interno** primeiro. É a base. Tudo nos outros documentos é um recorte deste.
4. Gere o **Diagnóstico Cliente** a partir do interno, enxugando e tirando observações de equipe.
5. Gere o **Plano de Ação (PPTX)** a partir do interno, transformando em narrativa visual de 10-12 slides.
6. Gere a **mensagem de envio**.
7. Converta para PDF.
8. Entregue tudo com links `computer://` em uma lista organizada por entregável (DOCX + PDF lado a lado).

Não pergunte permissão entre uma etapa e outra. Execute em linha e mostre o resultado.

---

## Anti-padrões observados

Aprendidos com o material do Marcelo que o Vanderson reeditou. Evite:

- **Repetição entre seções.** Se a "síntese executiva" já disse o gargalo, o "diagnóstico consolidado" não precisa repetir as mesmas frases — ele aprofunda.
- **Listas genéricas.** "Aumentar produtividade" não é insight. "41h/semana mapeadas em atividades padronizáveis" é insight.
- **Catálogo enciclopédico.** Não recomende 30 plugins. Recomende 4–8 plugins que fazem sentido para o caso e diga por quê.
- **Tom inspiracional.** Nada de "iniciar uma jornada de transformação". O aluno paga por isso — escreva como consultor que respeita o tempo dele.
- **Promessas vazias.** Não escreva "esse plano vai revolucionar seu negócio". Escreva "este plano resolve X e Y em 90 dias".
- **Esconder a decisão.** A decisão de prioridade aparece logo no início, não no meio do documento. O leitor não pode chegar na página 4 sem saber por onde começar.

---

## Referências internas desta skill

- `references/estrutura_diagnostico.md` — Estrutura completa do DOCX interno e cliente (todas as seções, todas as tabelas)
- `references/estrutura_apresentacao.md` — Estrutura completa do PPTX (12 slides, propósito de cada)
- `references/linguagem_e_tom.md` — Regras de linguagem, exemplos bons e ruins, anti-padrões
- `references/catalogo_recursos.md` — Catálogo fixo de aulas, plugins, MCPs e templates Lovable com links
- `references/paleta_visual.md` — Cores exatas, fontes, layouts e medidas do PPTX
- `references/mensagem_envio.md` — Template da mensagem final + variações por contexto
- `assets/plano_acao_template.pptx` — Template visual exato (caso Marcelo) a ser clonado e adaptado
- `scripts/build_diagnostico_docx.py` — Gera DOCX (interno ou cliente) a partir de JSON estruturado
- `scripts/build_plano_acao_pptx.py` — Gera PPTX a partir do template + JSON estruturado
- `scripts/to_pdf.py` — Converte DOCX/PPTX em PDF via LibreOffice
