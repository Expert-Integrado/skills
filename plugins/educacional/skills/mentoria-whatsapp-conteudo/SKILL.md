---
name: mentoria-whatsapp-conteudo
description: "Gera conteúdo semanal de IA para os grupos de WhatsApp da Mentoria de Automações Inteligentes da Expert Integrado. Use SEMPRE que o usuário mencionar: conteúdo para o grupo, post para WhatsApp, novidade de IA para alunos, criativo para o grupo da mentoria, notícia de IA pra compartilhar, conteúdo semanal MAI, post educacional IA, ou frases como 'bora postar no grupo', 'que novidade tem pra semana', 'gera um post de IA', 'manda pro grupo', 'cria um criativo'. Também ative quando a conversa mencionar Claude, ChatGPT, Gemini, MCP, Anthropic, OpenAI, automações — combinado com intenção de criar conteúdo. A skill pesquisa as novidades reais da semana, valida com fonte oficial, gera o texto em estilo WhatsApp da MAI, o prompt do criativo visual e (opcional) a legenda do Instagram."
---

# Skill: Conteúdo Semanal de IA — WhatsApp da Mentoria

## Contexto

A Mentoria de Automações Inteligentes (MAI) da Expert Integrado tem grupos de WhatsApp ativos onde Vanderson e o time publicam **um conteúdo de IA por semana**. O objetivo é manter os mentorados informados sobre o que mudou em Claude, ChatGPT, Gemini, MCPs e ferramentas de automação — e gerar debate.

Perfil dos alunos:
- Profissionais que usam IA para automatizar processos
- Empreendedores e freelancers
- Já operam Claude, ChatGPT, Gemini, Make, n8n, Zapier
- Nível intermediário a avançado

Cadência padrão: **toda segunda ou terça**, manhã. O conteúdo costuma ser assinado pela voz da MAI (não personalizado por pessoa).

## O que a skill entrega

Quatro artefatos em uma única resposta organizada:

1. **Texto formatado para WhatsApp** — curto (≤200 palavras), emojis, pergunta final
2. **Prompt do criativo visual** em inglês — pronto pra Gemini Imagen, Midjourney ou similar
3. **Legenda de Instagram** (opcional) — versão adaptada com hashtags
4. **Fonte da notícia** — link da fonte oficial primária

---

## Fluxo de Execução

### PASSO 1 — Pesquisar novidades reais dos últimos 7 dias

Use `web_search` com queries **curtas (2-4 palavras), sem operadores `site:`, sem aspas**. O motor já prioriza recência — não force data nas queries.

Queries recomendadas (rodar 3 a 5):

```
- novidades Claude Anthropic
- atualização ChatGPT OpenAI
- novidade Gemini Google
- MCP Model Context Protocol lançamento
- Claude Code update
- agente IA lançamento
- automação IA nova ferramenta
- IA pequenas empresas Brasil
```

**Critérios de parada:**
- Achou 2-3 candidatos fortes dos últimos 7 dias → **pare e escolha**
- Já rodou 5 buscas e nada relevante → **avise o usuário** e proponha um conteúdo de "fundamentos" (tutorial sobre algo que sempre engaja — ver lista em `references/fontes-ia.md`)

**Validação obrigatória da notícia:**
- ✅ Tem fonte primária? (post oficial da empresa, página de release, anúncio em evento gravado)
- ❌ É só rumor, vazamento ou tweet sem confirmação? → **descartar** ou marcar explicitamente como rumor no texto
- ✅ Está nos últimos 7 dias? Notícia velha não entra
- ✅ É testável pelo aluno hoje? (preferir features liberadas, não "em breve")

### PASSO 2 — Escolher o tema da semana

Selecione a notícia mais **relevante e acionável** para o perfil dos alunos. Use os critérios:

- **Relevância**: mexe com ferramenta que eles já usam?
- **Praticidade**: dá pra testar/aplicar nos próximos 7 dias?
- **Impacto**: muda algo no fluxo deles ou é só cosmético?
- **Engajamento**: provoca debate ou só informa?

Se houver empate, priorize na ordem: **Claude > Automações/MCP > ChatGPT > Gemini > outras**. Esse ranking reflete o foco da MAI.

### PASSO 3 — Escolher o formato

A skill tem 4 formatos. Escolha conforme o tipo de novidade:

| Formato | Quando usar | Cor de fundo do criativo |
|---|---|---|
| **Notícia/lançamento** | Anúncio de feature ou produto novo | 🟧 Laranja vibrante |
| **Tutorial rápido** | Feature já disponível que vale ensinar passo a passo | 🟦 Azul royal |
| **Comparativo** | Claude vs ChatGPT vs Gemini em uma tarefa | 🟪 Roxo vibrante |
| **Alerta de oportunidade** | Trial, grátis, beta aberto, vaga limitada | 🟩 Verde limão |

A paleta fixa por formato cria reconhecimento visual ao longo das semanas — o aluno aprende a identificar o tipo de conteúdo pela cor antes de ler.

### PASSO 4 — Gerar o texto para WhatsApp

Siga este formato **rigorosamente**:

```
[EMOJI IMPACTANTE] *[MANCHETE CHAMATIVA EM NEGRITO]*

[Contextualização em 1-2 frases curtas. O que é? Por que importa?]

👉 [Destaque 1]
👉 [Destaque 2]
👉 [Destaque 3]

[Chamada para ação ou instrução prática — como acessar/testar]

[Link da fonte oficial]

💬 *Pergunta para o grupo:*
[Pergunta aberta que estimula opinião ou experiência dos alunos]
```

**Regras de tom (não-negociáveis):**
- Português brasileiro informal mas profissional
- ≤200 palavras no corpo
- Sem jargão técnico sem explicação rápida
- Negrito apenas em manchete e pergunta final
- Pergunta final genuína — não retórica
- **Linkar sempre a fonte oficial primária** (anthropic.com/news, openai.com/blog, blog.google/technology/ai), nunca agregador ou cobertura de terceiros como fonte principal. Cobertura externa só se a oficial não existir ainda.

### PASSO 5 — Gerar o prompt do criativo visual

Prompt em **inglês**, no template:

```
[Descrição do visual centrado em um objeto: robô / cérebro / engrenagem / logo da ferramenta],
flat illustration style, vibrant solid background in [cor do formato — ver tabela do Passo 3],
minimalist tech aesthetic, bold typography overlay saying "[texto curto da manchete em PT-BR]",
no photorealistic elements, clean and modern design, suitable for WhatsApp educational content,
square 1080x1080
```

**Diretrizes visuais da MAI:**
- Fundo sólido na cor do formato (ver Passo 3)
- Ilustração flat/minimalista — sem fotos realistas
- Tipografia grande e legível mesmo em preview de WhatsApp
- Alternativa: estilo "nano banana" do Gemini (personagens pequenos e fofos em cenário tech) para conteúdo mais leve

Se houver exemplos em `assets/`, referencie-os no prompt como inspiração.

### PASSO 6 — Legenda de Instagram (só se pedido)

Adaptar o texto do WhatsApp:
- Máximo 150 palavras
- Tom ligeiramente mais formal
- Hashtags ao final: `#IA #AutomaçõesInteligentes #ClaudeAI #ChatGPT #InteligenciaArtificial #Mentoria #Inovação #Tecnologia`

---

## Exemplo aprovado (calibração de tom)

Este post foi publicado e teve boa resposta — use como referência de voz:

```
📰 *Pequenas empresas acabaram de ganhar um "sócio operacional" de IA*

A Anthropic lançou o plugin Small Business para o Claude Cowork com fluxos
de trabalho pré-configurados para tarefas do dia a dia:

👉 Folha de pagamento, fechamento mensal, relatórios semanais
👉 Campanhas de crescimento e revisão de contratos
👉 Integração nativa com QuickBooks, PayPal, HubSpot, Canva, Slack e mais

Como instalar:
1. Baixe o Claude Desktop (plano pago)
2. Abra o Cowork → Customize → Navegar por plugins
3. Procure "Small Business" e instale

Detalhes: https://claude.com/plugins/small-business

💬 *Pergunta para o grupo:*
Qual dessas integrações faria mais diferença no seu negócio hoje?
```

---

## Checklist final antes de entregar

- [ ] A notícia é dos últimos 7 dias?
- [ ] A fonte primária está confirmada (post oficial, não rumor)?
- [ ] O texto tem ≤200 palavras?
- [ ] Tem pergunta de engajamento genuína no final?
- [ ] O link aponta pra fonte oficial (não TechCrunch/agregador)?
- [ ] O formato foi escolhido (Notícia / Tutorial / Comparativo / Oportunidade)?
- [ ] O prompt do criativo está em inglês e usa a cor correta do formato?
- [ ] O tom está direto, acessível, sem ser superficial?

---

## Output final

Entregue tudo em uma única mensagem, com estas seções:

```
## 📱 TEXTO PARA WHATSAPP
[texto formatado]

## 🎨 PROMPT DO CRIATIVO (Gemini Imagen / Midjourney)
[prompt em inglês, com a cor do formato]

## 📸 LEGENDA INSTAGRAM (se solicitado)
[legenda com hashtags]

## 🔍 FONTE
[título da notícia + link da fonte oficial primária]

## 🏷️ Formato aplicado
[Notícia / Tutorial / Comparativo / Oportunidade] — cor: [cor]
```

---

## Referências

- `references/fontes-ia.md` — lista curada de sites prioritários, queries por ferramenta, temas que engajam, temas a evitar
- `assets/` — exemplos de criativos aprovados (quando disponíveis) para calibrar o estilo visual
