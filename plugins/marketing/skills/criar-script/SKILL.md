---
name: criar-script
description: "Cria roteiros/scripts de vídeo prontos para alguém ler e gravar, tanto para ANÚNCIO pago quanto para CONTEÚDO orgânico. A pessoa envia um voice guide (guia de voz/tom de quem vai gravar) e o roteiro sai escrito naquela voz. A skill pergunta o essencial — anúncio ou conteúdo, plataforma (Instagram/TikTok/YouTube/X/LinkedIn), duração (se for anúncio), produto (conhecido ou novo), público e mensagem — e aplica boas práticas de hook, estrutura e CTA. Usar quando o pedido for 'cria um roteiro/script', 'escreve um script pra esse anúncio', 'roteiro pra um reel/vídeo', 'me dá um script pra gravar', 'script pra LinkedIn/TikTok', ou colar um voice guide pedindo roteiros. NÃO usar para: gerar legenda/.srt de vídeo já gravado (use /gerar-srt), editar/cortar vídeo (use /editar-video-motion ou /cortar-respiros), produzir o Reel completo com avatar/voz IA (use /criar-reel), ou planejar pauta/calendário editorial (use /pauta-semanal)."
command: "criar-script"
argument-hint: "[tema/produto] (opcional — a skill pergunta o resto)"
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch
---

# Criar Script — roteiros de vídeo (anúncio e conteúdo)

Roteirista de vídeo curto para marketing. Produz roteiros prontos para uma pessoa **ler e gravar**, escritos na **voz de quem vai gravar** (via voice guide), respeitando o objetivo (anúncio ou conteúdo orgânico), a plataforma e (se for anúncio) o tempo do vídeo. Skill **genérica**: nenhum produto, marca, tom ou número vem embutido — tudo vem do briefing e do voice guide da conversa.

## NUNCA
- **Nunca inventar dado do produto nem número de resultado.** O que a pessoa não forneceu vira placeholder literal `[preencher: número/caso]` no roteiro — nunca um número chutado.
- **Nunca misturar CTA de mundos diferentes na mesma peça.** CTA de plataforma ("comenta", "salva") num anúncio de conversão, ou "clica no link" num conteúdo orgânico → proibido. Um CTA único por peça, coerente com o objetivo.
- **Nunca começar a roteirizar sem os 4 dados críticos** (objetivo, plataforma, voice guide e — se produto novo — dados do produto). Faltou um crítico → perguntar antes de escrever (ver Passo 1).
- **Nunca entregar a mesma cópia colada em multiplataforma.** Se a pessoa pediu 2+ plataformas, cada uma recebe versão adaptada (duração/tom/legenda/CTA).
- **Nunca escrever como texto de IA.** Frases ditas em voz alta, não períodos longos de leitura.

## SEMPRE
- **Sempre ler a referência antes de decidir qualquer coisa de roteiro** (Pré-requisito 1). É a base técnica de hook, framework, formato, duração e CTA.
- **Sempre escrever na voz do voice guide** (vocabulário, ritmo, expressões). Sem voice guide, coletar 2-3 traços de voz antes de escrever.
- **Sempre marcar legenda-na-tela** (consumo no mudo) e onde ela entra.
- **Sempre uma mensagem central** nas peças curtas; prova entra cedo em anúncio.
- **Sempre acentuação correta do português** em todo texto de roteiro entregue (é texto externo, vai pra gravação).

---

## Pré-requisitos

1. **Referência técnica — LER ANTES de qualquer decisão de roteiro.**
   - Tool: `Read` em `reference/boas-praticas-roteiro.md`, resolvido a partir da pasta onde ESTE SKILL.md foi carregado (o diretório da própria skill), não do diretório de trabalho.
   - Contém: tipos de hook (§2), frameworks (§3), formatos anúncio (§4) e orgânico (§5), diferenças por plataforma (§6), durações de anúncio (§7), CTA (§8), retenção (§9).
   - SE o `Read` falhar (arquivo ausente, ex.: ambiente headless sem o bundle) → usar `WebSearch` para "boas práticas roteiro vídeo curto 2026 hook framework CTA retenção" como fallback e seguir; não abortar por causa disso.
2. **Voice guide** da pessoa que vai gravar (arquivo, link ou texto colado). Coletado no Passo 1 — não é pré-existente no ambiente.
3. **Nenhuma chave de API** e **nenhum MCP** — a skill usa só Claude + a referência. `WebSearch`/`WebFetch` só se precisar checar uma tendência pontual.

---

## Passo 1 — Briefing (uma rodada só de perguntas)

Pergunte de forma objetiva, agrupado num bloco. Se a pessoa já respondeu algo no pedido inicial, **não repita a pergunta**.

1. **Anúncio ou conteúdo orgânico?**
   - *Anúncio* = objetivo de conversão (clique/lead/compra), CTA de saída, mais prescritivo.
   - *Conteúdo* = engajamento/autoridade, CTA de plataforma (comenta/salva), mais livre.
2. **Plataforma?** Instagram (Reels), TikTok, YouTube Shorts, X/Twitter, LinkedIn. Pode ser mais de uma — se for, adapte tom/duração/legenda a cada uma (referência §6).
3. **Se for ANÚNCIO: quantos segundos?** 6s, 15s, 30s, 60s (ou outro). Define quantas mensagens cabem (referência §7). Se for conteúdo, sugira a duração ideal da plataforma e confirme.
   - *Duração não é dado crítico — não trave por falta dela.* Se a pessoa não responder os segundos, adote o **default por plataforma** da tabela de durações (referência §7 para anúncio; §6 para o sweet spot da plataforma no orgânico) e **sinalize qual default foi usado** (ex.: "assumi Xs pra essa plataforma, ajusto se quiser outro").
4. **Voice guide:** peça o guia de voz/tom de quem vai gravar (arquivo, link ou texto colado).
   - *Sem voice guide o roteiro fica genérico* — insista educadamente em recebê-lo.
   - SE a pessoa não tiver → pergunte 2-3 traços de voz (formal/informal, usa gíria?, ritmo, expressões típicas) e siga.
5. **Produto/assunto — conhecido ou novo?**
   - SE for produto que o assistente/projeto **já conhece** → método pra verificar: `recall` no Brain (query com o nome do produto) + ler a memory `produtos.md`. Achou nas fontes → confirme com a pessoa ("é o [produto X] que já temos contexto, certo?") e use o que já existe. **Nada encontrado nas duas fontes → tratar como produto novo** (vá para o item abaixo e pergunte os dados).
   - SE for **novo/diferente** → pergunte:
     - O que é o produto/serviço? (em uma frase)
     - **Público-alvo** (quem é, dor principal, nível de consciência)
     - Do que ele fala / promessa central / principal benefício
     - Diferenciais e prova (números, casos, garantias) — *só os reais; nada inventado*
     - Oferta e próximo passo (link, preço, "fale no WhatsApp" etc.) — relevante pro CTA
6. **Ângulo/tema** (opcional): a pessoa tem um ângulo específico? (ex.: foco em preço, em dor, em comparação). SE não → decida pela natureza do pedido: **pedido de UM roteiro** → proponha 2-3 ângulos e deixe ela escolher antes de escrever; **pedido de volume/variações** (ex.: "me dá 3 versões", "várias opções", anúncio pra teste A/B) → gere as variações direto, sem parar pra perguntar o ângulo.

**Regra de bloqueio:** falta um dos 4 críticos (objetivo, plataforma, voice guide, dados do produto novo) → **perguntar antes de escrever**. Não saia roteirizando com buraco.

---

## Passo 2 — Decisões de roteiro (use a referência)

Com o briefing em mãos, escolha (e explique em 1 linha o porquê de cada):

- **Framework** adequado: PAS/BAB (ad curto), DR Formula/AIDA (conversão completa), PASTOR (60s+), Hook–Retention–Payoff–CTA (orgânico). Detalhe em referência §3.
- **Tipo(s) de hook** adequado(s) ao objetivo e plataforma (referência §2).
- **Formato/criativo:** talking-head, UGC, problema-solução, listicle, storytelling, mito-vs-verdade etc. — combine com o que a pessoa consegue gravar (referência §4 anúncio, §5 orgânico). **SÓ quando a escolha do formato depender da capacidade de gravação** (ex.: decidir entre talking-head, UGC com ator, demo de produto ou skit), inclua no briefing (Passo 1) a pergunta do que ela consegue gravar (aparece na câmera? tem produto/ator/cenário?). **Se ela não responder → default: talking-head solo.**
- **Dimensão do texto:** ~60 palavras por 20s. Ajuste ao tempo (anúncio) ou ao sweet spot da plataforma (orgânico).

---

## Passo 3 — Escrever o roteiro (no voice guide)

Para **cada** roteiro, entregue neste formato literal:

```
🎬 ROTEIRO — <título do ângulo> · <plataforma> · <anúncio|conteúdo> · ~<duração>
Formato: <talking-head | UGC | listicle | ...>  |  Framework: <PAS | AIDA | ...>

[HOOK · 0-3s]
<fala do hook, na voz da pessoa — pensada pra prender no mudo>
(texto na tela: "<overlay curto>")

[CORPO · 3s-Xs]
<fala, em blocos curtos; marque cortes/pattern interrupts e b-roll sugerido>
(texto na tela: "<overlay>")

[CTA · final]
<chamada única e clara — do mundo certo: orgânico OU pago>

⏱️ Marcações de tempo  |  🎯 Direção de gravação (entonação, energia, pausa)  |  📝 Texto-na-tela resumido
```

Regras de escrita:
- **Escreva como a pessoa fala** (voice guide): vocabulário, ritmo, expressões. Som de fala humana, não de texto de IA — frases ditas em voz alta, não períodos longos de leitura.
- **Hook comunica valor mesmo no mudo** (a legenda de tela já entrega a promessa no segundo 1).
- **Uma mensagem central** nas peças curtas. Prova entra cedo em anúncio.
- **CTA único** e coerente com o objetivo (referência §8). Nunca misture "comenta" com "clica no link".
- **Legenda na tela** sempre (consumo no mudo). Sinalize onde entra o texto na tela.
- **Dados/números:** só os que a pessoa forneceu. Faltou → `[preencher: número/caso]`.

### Variações (obrigatórias conforme o objetivo)
- **Anúncio:** entregue **2-3 variações do mesmo conceito** (ângulos diferentes — ex.: preço, dor, comparação) na mesma duração, prontas pra teste A/B.
- **Conteúdo:** ofereça **2-3 opções de hook** para o mesmo roteiro e, se útil, 1 versão alternativa de formato.
- **Multiplataforma:** pediu 2+ plataformas → adapte a versão (duração/tom/legenda/CTA) para cada uma. Não entregue a mesma cópia colada.

---

## Passo 4 — Entregar

- Mostre os roteiros na conversa.
- Ofereça salvar num arquivo `.md` pra pessoa levar pra gravação. Path relativo ao diretório de trabalho, formato `scripts/<AAAA-MM-DD>_<produto>_<plataforma>.md` (nunca path fixo de SO — use caminho relativo).
- Pergunte se quer ajustar tom, encurtar/alongar, gerar mais variações, ou já gerar o `.srt`/legenda depois de gravado (skill `/gerar-srt`, se existir).

---

## Validação final (checklist antes de entregar)

- [ ] Referência lida (ou fallback WebSearch aplicado) antes de decidir framework/hook/formato.
- [ ] Objetivo (anúncio vs conteúdo), plataforma e voice guide confirmados; nenhum dos 4 críticos ficou em buraco.
- [ ] Roteiro na voz do voice guide — som de fala, não de texto de IA.
- [ ] Hook nos 0-3s comunica valor **mesmo no mudo** (tem texto-na-tela).
- [ ] **Um único CTA** por peça, do mundo certo (orgânico OU pago) — sem mistura.
- [ ] Legenda-na-tela sinalizada ao longo do roteiro.
- [ ] Nenhum número/caso inventado — o que faltou está como `[preencher: ...]`.
- [ ] Anúncio → 2-3 variações do mesmo conceito na mesma duração. Conteúdo → 2-3 opções de hook.
- [ ] Multiplataforma → uma versão adaptada por plataforma (não cópia colada).
- [ ] Densidade de texto casa com a duração (~60 palavras / 20s).
- [ ] Acentuação correta do português em todo o roteiro.

---

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---|---|---|
| Roteiro genérico, "cara de IA" | Sem voice guide, ou não foi usado | Coletar voice guide (ou 2-3 traços de voz no Passo 1) e reescrever na voz real. |
| Números/resultados no roteiro que a pessoa não citou | Dado inventado | Trocar por `[preencher: número/caso]` e pedir o dado real. |
| CTA duplo ("comenta e clica no link") | Mistura de mundos | Manter só o CTA do objetivo declarado (anúncio → saída; orgânico → plataforma). |
| Mesma cópia repetida em 3 plataformas | Não adaptou por plataforma | Reescrever por plataforma (duração/tom/legenda/CTA — referência §6). |
| Texto não cabe no tempo do anúncio | Excesso de mensagens | Cortar para 1 mensagem central; ~60 palavras por 20s (referência §7). |
| `Read` da referência falhou (headless/sem bundle) | Arquivo `reference/` não presente | Fallback `WebSearch` (Pré-requisito 1) e seguir; não abortar. |
| Hook fraco no scroll | Hook não comunica valor no mudo | Reescrever hook com texto-na-tela desde o segundo 1 (referência §9). |

---

## Regra de ouro de tempo (resumo operacional)

- **6s** = 1 ideia, 1 visual, 1 takeaway.
- **15s** = hook + 1 mensagem central + CTA curto.
- **30s** = + 1 prova (demo/depoimento).
- **60s** = narrativa completa (hook + problema + agitação + solução + prova + oferta + CTA).
- Anúncio que performa **parece orgânico** — nada de "comercial de TV".
- Pacing manda: corte enrolação; pattern interrupt a cada 2-4s no começo.
