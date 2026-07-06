---
name: agente-revisor-blog
description: Revisa post MDX do blog Expert Integrado verificando 4 dimensões: drift de voz (Eric Luciano v1.4), factualidade (sem claim sem fonte), GEO/SEO (pirâmide invertida, H2 como perguntas, FAQ), e UX mobile (parágrafos curtos, nenhum bloco de texto denso). TRIGGER quando Claude ou Eric pedir "revisa o post", "checka o draft", "audita o MDX".
---

# Agente Revisor Blog — Expert Integrado

Skill que faz auditoria de 4 dimensões em draft MDX e devolve: lista de violações (max 10), score 1-10 por dimensão, e patch sugerido para cada violação.

## Quando ativar

- Pipeline de produção terminou o draft e pede revisão
- Eric pede "revisa o post", "checka o draft", "audita o MDX"
- Antes de qualquer commit/deploy de post novo

## Input esperado

Conteúdo MDX completo (frontmatter + body) do post a revisar.

## Output

Relatório estruturado com:
1. Score por dimensão (1-10)
2. Violações encontradas (máx 10)
3. Patch sugerido pra cada violação
4. Veredicto: APROVADO | RETRABALHO MENOR | RETRABALHO MAIOR

## As 4 dimensões de revisão

### Dimensão 1: VOZ (peso 40%)

**Verificar presença de red flags:**
- Em-dash (—) no texto → substituir por vírgula/dois-pontos/parênteses
- "tu" / "teu" / "tua" → substituir por "vc" / "você"
- Hype vazio: "revolucionário", "transformador", "disruptivo", "game changer", "muda tudo"
- Abertura com "Olá", "Neste artigo", "Hoje vamos falar sobre"
- Fechamento com "Espero que esse post te ajude", "Até a próxima", "Não se esqueça de"
- Headlines "Aprenda a..." / "Descubra como..."
- Tom formal demais: "dessa forma", "portanto", "entretanto", "outrossim"
- Softening excessivo: "talvez", "pode ser que", "quem sabe", "de certa forma"

**Verificar presença de elementos positivos:**
- Pelo menos 1 uso de "vc"/"você" ou "a gente" no body
- Pelo menos 1 expressão de frontalidade ("Não acho que X", "Sendo bem sincero...")
- Pelo menos 1 especificidade: número real, nome de cliente/empresa/ferramenta

### Dimensão 2: FACTUALIDADE (peso 25%)

**Verificar:**
- Claims quantitativos sem fonte → sinalizar ("73% das PMEs" — de onde?)
- Comparações de ferramentas com dados desatualizados → sinalizar
- Casos/nomes de clientes que precisam de autorização → sinalizar
- Afirmações sobre produtos/serviços que podem ter mudado → sinalizar
- Placeholder não preenchido ([NOME], [NÚMERO], [LINK]) → bloquear publicação

### Dimensão 3: GEO/SEO (peso 25%)

**Verificar:**
- Primeiros 40-60 termos do post: são resposta direta? Ou são introdução genérica?
- Primeiros 40-60 termos de CADA H2: resposta direta ou "Nesta seção..."?
- H2s: são perguntas literais? Ou são títulos vagos?
- Densidade factual: cada H2 tem ao menos 1 número, nome ou resultado?
- FAQ presente? Tem 5+ perguntas? Respostas 60-120 palavras?
- Extensão adequada pro tipo? (satélite 1200+, pilar 2500+, versus 1800+, case 1500+)
- `related` no frontmatter: aponta pra slugs que existem?

### Dimensão 4: UX MOBILE (peso 10%)

**Verificar:**
- Parágrafo com mais de 5 frases → sinalizar como bloco pesado
- Mais de 3 parágrafos seguidos sem bullet, número, tabela ou imagem
- Frase com mais de 250 chars sem ponto ou vírgula
- H2 muito longo (mais de 80 chars) → sugerir versão curta
- Tabela sem cabeçalho ou com mais de 12 linhas → sinalizar

## Dimensão 5: SEGURANÇA — triagem 3 cores (GATE, fora do score)

Camadas 1+2 do protocolo de segurança de conteúdo (`docs/protocolo-conteudo.md` no repo do blog). Não entra na média: é gate binário que pode bloquear sozinho.

**Passo A (Camada 1, determinística):** rodar no repo do blog:
```bash
python scripts/check-sensivel.py src/content/blog/<slug>.mdx
```
Exit 1 = há match de denylist (R$ de escala-empresa, CNPJ/CPF, telefone, e-mail, token, IP, métrica financeira). Avaliar cada match no Passo B.

**Passo B (Camada 2, semântica):** ler o post inteiro e classificar:
- Expõe número interno da Expert (MRR, caixa, custo, salário, contagem de clientes)?
- Identifica cliente, aluno ou pessoa sem consentimento registrado?
- Contém informação que só poderia vir de fonte interna (reunião, CRM, Brain, WhatsApp)?
- Promete resultado/prazo que a empresa não sustenta em contrato?

**Cores:**
- **VERDE**: nenhum item acima; matches do scanner são exemplos hipotéticos marcados ou dados públicos. Segue.
- **AMARELO**: item duvidoso (número plausível sem fonte clara, case anonimizado mas reconhecível no nicho). NÃO publica sem decisão humana explícita — listar cada exceção no relatório com recomendação.
- **VERMELHO**: qualquer item confirmado. RETRABALHO MAIOR automático, independente do score das outras dimensões.

## Critérios de veredicto

| Veredicto | Critério |
|---|---|
| APROVADO | Score médio ≥ 7.0 em todas as dimensões, nenhum bloqueador, Segurança VERDE |
| RETRABALHO MENOR | Score médio ≥ 5.5, sem bloqueador de factualidade, ≤5 violações, Segurança VERDE ou AMARELO com exceções listadas |
| RETRABALHO MAIOR | Score médio < 5.5 OU placeholder não preenchido OU >5 violações graves OU Segurança VERMELHO |

AMARELO na segurança nunca vira APROVADO direto: o veredicto sai "RETRABALHO MENOR — pendente decisão humana nas exceções de segurança".

## Formato do relatório

```
## Revisão: <slug>

| Dimensão | Score | Status |
|---|---|---|
| Voz | X/10 | ✓/⚠/✗ |
| Factualidade | X/10 | ✓/⚠/✗ |
| GEO/SEO | X/10 | ✓/⚠/✗ |
| UX Mobile | X/10 | ✓/⚠/✗ |
| Segurança | VERDE/AMARELO/VERMELHO | gate |
| **Média** | **X/10** | APROVADO/RETRABALHO |

### Violações encontradas

1. **[Dimensão] — [tipo]**: [trecho exato do texto]
   → Patch: [correção sugerida]

2. ...

### Segurança (triagem 3 cores)
[VERDE | AMARELO | VERMELHO]
[Se AMARELO: lista de exceções, uma por linha, com recomendação — decisão é humana]
[Se VERMELHO: o trecho exato e por quê]

### Veredicto
[APROVADO | RETRABALHO MENOR | RETRABALHO MAIOR]
[Se RETRABALHO: quais violações são bloqueadoras vs opcionais]
```

## Como usar

```
/lab:agente-revisor-blog

[MDX completo do post aqui]
```

O agente retorna o relatório com score + lista de violações + patches sugeridos.
