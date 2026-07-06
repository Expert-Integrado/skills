# Template — post-objeção (MODO CRIAR)

Post de 900-1400 palavras, tom do blog Expert Integrado: prático, educador, sem hype, pro dono de PME não-técnico. Proibido: "revolucionário", "game changer", "transformador", "mindset". Preferir: exemplos concretos, números com fonte, passo acionável.

## Frontmatter obrigatório

```yaml
---
title: "<pergunta ou afirmação orientada a busca — a objeção do jeito que o setor pesquisa>"
description: "<1 frase, até 160 chars, com a resposta essencial>"
pubDate: <data de publicação>
pillar: <produtividade | vendas | vibe-coding | lideranca>
tipo: satelite
tags: ["objecao:<slug>", "setor:<slug>"]
status: draft
takeaways:
  - "<3 a 4 bullets com o essencial — LLMs citam takeaways>"
---
```

## Estrutura de 6 blocos (nesta ordem)

1. **Reconhece a objeção sem strawman** (1-2 parágrafos). Formular a objeção do jeito FORTE, como o dono de PME realmente pensa. O leitor precisa se ver na frase. Nunca ridicularizar a dúvida.

2. **Por que ela faz sentido** (1-2 parágrafos). Validar o que há de verdadeiro: experiências ruins reais (chatbot burro, automação que quebrou), riscos reais do setor (regulação, sazonalidade, cliente exigente). Isso compra o direito de discordar depois.

3. **O mecanismo que muda o jogo NO SETOR** (coração do post, 3-5 parágrafos). O que mudou tecnicamente e por que a objeção deixa de valer no setor em questão. Falar das dores específicas do setor (farmácia: regulação e balcão; imobiliária: lead frio em volume; educação: matrícula sazonal). NUNCA mencionar o lead ou a empresa dele.

4. **Exemplo concreto** (1-2 parágrafos). Prioridade: (a) case real anonimizado com consentimento de uso anônimo, (b) exemplo hipotético MARCADO ("imagine uma farmácia de bairro com 3 balconistas..."). Números plausíveis e conservadores — o vendedor precisa sustentar em call.

5. **O que fazer amanhã** (lista de 3-5 passos). Ações que o leitor executa sem comprar nada: medir X, listar Y, testar Z grátis. Gera reciprocidade e qualifica.

6. **CTA mapeamento** (padrão do blog). Convite pro mapeamento gratuito conectado à objeção: "quer ver onde isso se aplica na sua operação?".

## Checklist antes de entregar o draft

- [ ] Zero dados do lead (nome, empresa, cidade identificável, números dele)
- [ ] Exemplo hipotético está marcado como hipotético
- [ ] Números têm fonte ou são explicitamente estimativa conservadora
- [ ] Tags `objecao:` e `setor:` no frontmatter
- [ ] `python scripts/check-sensivel.py <arquivo>` rodou limpo no repo do blog
- [ ] `status: draft` (a publicação é do aprovador)
