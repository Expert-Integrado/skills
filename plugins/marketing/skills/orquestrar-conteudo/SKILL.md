---
name: orquestrar-conteudo
description: "Fábrica de conteúdo multi-agente no Claude Code: cria site/landing page (com ou sem vídeo HeyGen) e post de Instagram (carrossel/reel), copy+design juntos, orquestrando subagentes em paralelo (Estrategista → Copywriter ∥ Designer → Revisor) com gate duro de qualidade (score>=7) e deploy Vercel. Usar quando Eric pedir 'cria um site', 'faz uma landing', 'monta um post/carrossel/reel pro Instagram', 'cria conteúdo', 'produz uma peça'. NÃO usar para: pedido explícito 'cria um reel' end-to-end com avatar/voz (skill criar-reel é a versão padrão de produção — aqui o vídeo só entra como peça opcional de um pacote), estúdio interativo de edição de carrossel (carrossel-studio), imagem avulsa (imagem), vídeo HeyGen avulso (video), post de blog (criar-post-blog)."
allowed-tools: Read, Write, Edit, Bash, Agent, Workflow, Skill, preview_start, mcp__expert-brain__recall
---

# orquestrar-conteudo — Fábrica de conteúdo multi-agente (Claude Code)

Produz conteúdo completo (copy + design) orquestrando um time de subagentes nativos do Claude Code: a sessão principal faz a estratégia (Fase 0), dispara **Copywriter ∥ Designer em paralelo**, passa pelo **Revisor** (obrigatório no Instagram, com gate duro de score) e entrega — PNGs 1080×1080 + legenda (Instagram) ou URL Vercel no ar (site/landing). Por que multi-agente: a sessão principal não fica presa 10-20 min sem responder o Eric, e copy e imagens são tarefas independentes (paralelismo economiza ~35% do tempo — padrão *Parallelization/Sectioning* de "Building Effective Agents" da Anthropic).

## NUNCA
- NUNCA disparar subagente enquanto o Eric ainda está mandando fotos/contexto — espere ele terminar ("steering" destrutivo quebra o job).
- NUNCA disparar subagente com `context` vazio ou pauta genérica — a Fase 0 existe pra isso (briefing raso é a causa nº 1 de subagente "completando" errado).
- NUNCA usar o MCP Playwright pro export do carrossel — DPR ~1.333 corta a área capturada e slides distantes saem em branco (ver protocolo de export).
- NUNCA exportar carrossel com `score < 7` nem com token `{{` sobrando no HTML.
- NUNCA gerar o rosto do Eric do zero — rosto do Eric = SEMPRE `edit` com foto real de referência.
- NUNCA usar `type: "edit"` sem foto de input — imagem sem rosto do Eric usa `type: "generate"` (site/landing: imagens conceituais). No carrossel `instagram` sem `eric_photos` o Designer NÃO gera imagem: monta os slides só em CSS (ver Contrato).
- NUNCA reusar o brand-kit de um perfil em outro — perfil novo exige `brand-kits/<perfil>.md` criado antes.
- NUNCA subir carrossel pra Vercel — a entrega do Instagram é PNGs + legenda.
- NUNCA deixar o Revisor abrir subagentes (profundidade rasa); as skills `imagem`/`video` entram como **ferramenta**, nunca como novo subagente-orquestrador — o **Designer** chama a `imagem`; o **Copywriter** chama a `video` (é ele quem dispara o render do HeyGen, por ser o dono do script — coerente com o pipeline `site` e com o schema do Copywriter, que carrega `mp4_path`/`video_url`). CORREÇÃO-DE-FATO: o original era auto-contraditório (dizia que o Designer chamava `imagem`/`video`, mas o próprio pipeline `site` e o schema do Copywriter — `mp4_path`/`video_url` — mostram que quem dispara o render é o Copywriter); a reatribuição da `video` pro Copywriter é correção deliberada, não mudança silenciosa.
- NUNCA escrever output direto no `.json` final — escrita atômica: escreve `.tmp` → renomeia.
- NUNCA rodar servidor HTTP e script Playwright em Bash calls separados — o Bash tool não persiste processos entre chamadas; ambos no MESMO call.
- NUNCA buzzword na copy (`revolucionário`, `game-changer`, `transformador`, `disruptivo`, `mindset`, `hype`), NUNCA emoji, NUNCA CTA genérico.
- NUNCA cravar nome de usuário em path (ex.: "Eric Luciano") — usar `~`/env, que resolve pro user atual (`ericl` etc.).
- NUNCA rodar `vercel build` — só `vercel deploy`.

## SEMPRE
- SEMPRE Fase 0 (Estrategista) antes de qualquer spawn — as 5 perguntas do briefing.
- SEMPRE carregar o brand-kit do perfil-alvo ANTES de montar o briefing.
- SEMPRE acentuação correta do português em TODA a copy e legenda (erro de acento = Revisor reprova).
- SEMPRE disparar Copywriter e Designer na MESMA mensagem (múltiplos `Agent` num bloco só = execução concorrente).
- SEMPRE confirmar HTTP 200 (curl na URL de produção; no Windows adicionar `--ssl-no-revoke`) antes de mandar a URL ao Eric.
- SEMPRE baixar o MP4 do HeyGen imediatamente (a URL expira ~1h) e comprimir com `ffmpeg` (~5MB) antes do deploy.
- SEMPRE serializar a geração de imagens (1 por vez) e tratar 429 com backoff (Retry-After + 5s, máx 3 retries; fallback: foto real sem edição).
- SEMPRE preferir o Workflow gate no Instagram (trava de código, não confiança no agente); fallback manual só se a tool Workflow não existir no ambiente OU se o perfil não for @ericluciano (o script do gate é hardcoded pro @ericluciano — ver PENDENTE-SCRIPT).
- SEMPRE, no preview do carrossel, nomear o arquivo da galeria `index.html` (o painel de preview abre na RAIZ do server).
- SEMPRE que chegar material tardio (foto/CTA depois do spawn): salvar em `handoffs/<slug>/late/`, esperar os agentes e fazer patch no HTML + redeploy (respawn do Designer só se crítico).
- SEMPRE que o Eric mudar requisito fundamental mid-flight: parar os subagentes, atualizar o briefing e redisparar (refazer barato > entregar errado).

## Pré-requisitos
- **Subagentes** (definidos em `~/.claude/agents/`, verificados no PC): `exp-copywriter.md`, `exp-designer.md`, `exp-ger-marketing.md`. SE ausentes (outra máquina/container) → rodar os papéis com `Agent` genérico usando os prompts dos passos (o script do gate já embute os prompts próprios — não depende dos `.md`).
- **Skills** (mesmo plugin `marketing` desta skill): `imagem` (geração/edição — OpenAI gpt-image-2 primário, Gemini fallback) e `video` (HeyGen + ElevenLabs). CORREÇÃO-DE-FATO: o original dizia "skill do lab"; ambas vivem em `plugins/marketing/skills/` deste mesmo repo.
- **Arquivos desta skill** (na pasta da skill): `brand-kits/ericluciano.md`, `brand-kits/expertintegrado.md`, `assets/pipeline-instagram-gate.mjs` (Workflow do gate), `assets/gallery-template.html` (galeria de preview).
- **Resolver o path absoluto desta skill** (NÃO existe env var tipo `CLAUDE_PLUGIN_ROOT` — resolva por busca no disco). Rode este snippet UMA vez no início e reutilize `$SKILL_DIR`/`$GATE` no resto do job (a tool Workflow exige `scriptPath` absoluto; não aceita `<pasta-desta-skill>`):
  ```bash
  GATE=$(ls -1 \
    "$HOME/.claude/plugins/cache/"*/marketing/*/skills/orquestrar-conteudo/assets/pipeline-instagram-gate.mjs \
    "$HOME/.claude/plugins/marketplaces/"*/plugins/marketing/skills/orquestrar-conteudo/assets/pipeline-instagram-gate.mjs \
    "C:/repos/expertintegrado-skills/plugins/marketing/skills/orquestrar-conteudo/assets/pipeline-instagram-gate.mjs" \
    2>/dev/null | head -1)
  SKILL_DIR=$(dirname "$(dirname "$GATE")")   # => .../skills/orquestrar-conteudo
  echo "SKILL_DIR=$SKILL_DIR"; echo "GATE=$GATE"; test -f "$GATE" && echo OK || echo "GATE NAO ENCONTRADO"
  ```
  Validação: `$GATE` não-vazio e `test -f "$GATE"` imprime `OK`. SE `GATE NAO ENCONTRADO` → a skill não está instalada como plugin nesta máquina; rode `ls "$HOME/.claude/plugins/cache"` pra achar o nome do marketplace, ou peça o path ao Eric — NÃO chutar. Derivados: `scriptPath` do Workflow = valor literal de `$GATE`; galeria = `$SKILL_DIR/assets/gallery-template.html`; brand-kits = `$SKILL_DIR/brand-kits/<perfil>.md`.
- **Credenciais** (env primeiro, fallback 1Password via `op read` — nunca colar valor):
  - `OPENAI_API_KEY` → fallback `op read "op://Agentes Eric/OPENAI_API_KEY/credential"` (imagens diretas).
  - `VERCEL_TOKEN` → fallback `op read "op://Agentes Eric/VERCEL_API_TOKEN/credential"` (deploy de sites).
  - HeyGen/ElevenLabs: a skill `video` resolve as próprias credenciais.
- **Workspace do job**: `CONTEUDO_DIR="${CONTEUDO_DIR:-C:/tmp/conteudo}"` → job em `$CONTEUDO_DIR/<slug>/` (ou subpasta `handoffs/<slug>/` do projeto). ATENÇÃO: o pipeline `instagram` via Workflow EXIGE o default `C:/tmp/conteudo/<slug>` — o script do gate crava esse path. Copie TODAS as fotos/assets pra lá antes de começar.
- **Saída dos PNGs**: `WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}"` → `$WORKSPACE_DIR/temp/<slug>/`.
- **Banco de fotos do Eric**: `ERIC_FOTOS_DIR="${ERIC_FOTOS_DIR:-$HOME/OneDrive/Imagens/Perfil profissional}"` (sincroniza via OneDrive; mesma fonte da skill `tweet-print`).
- **Python + Playwright** (só pro export do carrossel): detectar com `PY=$(command -v python3 || command -v python)`; SE vazio no Windows → `PY="$LOCALAPPDATA/Programs/Python/Python312/python.exe"`.

## Papéis e orquestração

| Papel | Quem executa | Função | Modelo |
|---|---|---|---|
| **Estrategista** | sessão principal (Fase 0) | define objetivo, público, ângulo/pauta, formato, CTA → monta `briefing.json` | sessão |
| Copywriter | `exp-copywriter` | copy de todas as seções/slides + script HeyGen | execução (sonnet) |
| Designer | `exp-designer` | imagens (skill `imagem`) + HTML/slides + deploy v1 | execução (sonnet) |
| Revisor | `exp-ger-marketing` | revisão editorial + score — **obrigatório no Instagram** | rápido (haiku) |

Como orquestrar:
- Tool **Agent** pra cada subagente, uma chamada por papel. Chamada literal: `Agent(subagent_type="exp-copywriter", prompt="<briefing completo + instruções do papel>", run_in_background=true)` (idem `exp-designer`, `exp-ger-marketing`). Paralelo = as 2 chamadas Agent **na mesma mensagem**, com `run_in_background=true` quando os papéis rodam em paralelo; colete o final message de cada uma.
- Cada subagente recebe TODO o material no prompt (briefing completo). O final message dele É o output — instrua a devolver **JSON** no schema definido.
- Job longo sem travar a conversa: `run_in_background: true` e coletar quando terminar.
- Orquestração determinística (loops/fan-out): tool **Workflow** (`pipeline`/`parallel`) — no Instagram é o caminho padrão.
- O Estrategista NÃO é subagente — é a sessão principal pensando antes de disparar. Só vira subagente dedicado se o Eric pedir um plano de pauta separado.
- Modelo: herdar o da sessão; baixar pra modelo rápido SÓ no Revisor; subir pra Opus SÓ se o Eric pedir.

### Prompts canônicos por papel (fallback sem `exp-*.md`)
Quando os arquivos `exp-copywriter.md`/`exp-designer.md` NÃO existirem na máquina (Pré-requisitos), rode os papéis com `Agent` genérico usando os blocos abaixo — **usar verbatim**, substituindo `<slug>` pelo slug do job. São montados a partir do Contrato + Schemas + regras já desta skill.

**Copywriter** (`prompt=` verbatim):
```
Você é o Copywriter da fábrica de conteúdo. Leia o briefing.json em $CONTEUDO_DIR/<slug>/briefing.json (contrato completo) e escreva a copy de todas as seções (sections_required) ou slides na VOZ DO ERIC: 1ª pessoa, direto, sem rodeio, dados quando houver. Acentuação correta do português em TUDO. ZERO buzzword (revolucionário, game-changer, transformador, disruptivo, mindset, hype), zero emoji. CTA específico e único (nunca genérico). Pipeline site: escreva também o script HeyGen (60-90s) e salve seu JSON ANTES de disparar o render do vídeo via skill `video` (circuit breaker). Devolva SOMENTE JSON — site: {status,pipeline,project_slug,headline,sub_headline,sections[],cta_link,heygen_script,mp4_path|null,video_url|null,video_error|null,timestamp}; instagram: {status,caption,hashtags,slides:[{n,title,body}]}. NÃO abra subagentes.
```

**Designer** (`prompt=` verbatim):
```
Você é o Designer da fábrica de conteúdo. Leia o briefing.json em $CONTEUDO_DIR/<slug>/briefing.json. Gere as imagens de image_specs via skill `imagem`: rosto do Eric → type "edit" com a foto real em input_path; imagem sem rosto → "generate"; NUNCA "edit" sem input_path; serialize 1 imagem por vez, 429 → backoff. Monte o HTML/slides respeitando o brand-kit (color_palette + brand_rules: paleta + tipografia), mobile-first, sem emoji. Pipeline site/landing-rapida: deploy Vercel com --prod e devolva deploy_v1_url. Pipeline instagram SEM eric_photos: fundos só em CSS do brand-kit, NÃO chame a skill `imagem`; use <section id="slide-N"> 1080×1080 com os tokens {{SLIDEn_TITLE}}/{{SLIDEn_BODY}}. Devolva SOMENTE JSON: {status:"done|preview",pipeline,project_slug,html_path,images_generated[],video_embedded,deploy_v1_url,timestamp}. NÃO abra subagentes.
```

## Detecção de pipeline

| Eric pede… | Pipeline | Vídeo? |
|---|---|---|
| Site / landing + vídeo | `site` | sim |
| Site / landing (sem mencionar vídeo) | `landing-rapida` | não |
| Post Instagram / carrossel / reel | `instagram` | opcional |

**Pedido genérico SEM formato explícito** (ex.: "cria conteúdo", "produz uma peça", "divulga o workshop", "faz algo pro lançamento" — frases que a `description` lista como gatilho): NÃO escolher o pipeline sozinho. Faça UMA pergunta curta ao Eric antes da Fase 0 — "carrossel de Instagram, landing page, ou site com vídeo?" — e só então mapeie a resposta pra `instagram`/`landing-rapida`/`site`. Formato é uma das 5 perguntas da Fase 0; resolvê-lo é pré-condição do briefing (nunca cravar um pipeline por conta própria num pedido ambíguo).

## Checkpoints adaptativos por risco (NÃO bloquear à toa)

Default = **fluxo contínuo** (a velocidade é a vantagem da skill). Pare pra validar com o Eric **só** quando o job é caro ou arriscado:

| Situação | Checkpoint? |
|---|---|
| Carrossel/landing rotina, brief claro | **Não** — segue direto até a entrega |
| Site com vídeo HeyGen (custo + tempo alto) | **Sim, antes do spawn** — confirma pauta/ângulo + CTA |
| Tema sensível, cliente, ou 1ª vez de um formato novo | **Sim, antes do spawn** — valida o briefing |
| Copy ficou longa/cara de produzir antes de gerar N imagens | **Sim, antes do design caro** — valida a copy |
| Risco reputacional (números, claims) | Revisor cobre — não precisa parar o Eric |

Checkpoint = uma pergunta curta e objetiva ("ângulo X, CTA Y, fecho?"), nunca um interrogatório. Na dúvida entre parar e seguir num job barato: **siga** (é mais barato refazer que travar o Eric).

## Fase 0 — Estratégia (sessão principal, antes de qualquer subagente)

Responda as 5 perguntas (do contexto do Eric, recall no Brain, ou perguntando SÓ o que faltar):
1. **Objetivo** — o que esse conteúdo precisa fazer? (educar, gerar lead, autoridade, lançar algo)
2. **Público** — pra quem? (dono de restaurante, gestor comercial, aluno…)
3. **Ângulo/pauta** — qual a tese central? Qual o gancho que para o scroll?
4. **Formato** — pipeline + nº de slides/seções + tem foto editada do Eric?
5. **CTA** — uma ação específica (seguir @, link, agendar). Nunca CTA genérico.

### Brand-kit (carregar ANTES do briefing)
A identidade visual NÃO é hardcoded — vem de um brand-kit por perfil-alvo, em `brand-kits/`:
- `brand-kits/ericluciano.md` — perfil pessoal **@ericluciano** (dark + azul/ciano tech)
- `brand-kits/expertintegrado.md` — empresa **@expertintegrado** (azul royal + roxo/magenta)
- Outro perfil (ex. @empresariolivre): **criar `brand-kits/<perfil>.md` antes** — NUNCA reusar a marca de outro perfil.

**Qual perfil?** (definir ANTES de carregar o kit — a skill dispara também com "cria conteúdo" sem `@`):
1. O request cita `@perfil` explícito → esse perfil.
2. Sem `@`, mas o tema é claramente da EMPRESA (produto/oferta Expert Integrado, vendas, agência, institucional) → `@expertintegrado`.
3. Sem `@`, mas é autoridade/opinião pessoal do Eric (marca pessoal, bastidores, jornada, tese dele) → `@ericluciano`.
4. Ainda ambíguo → **pergunte em 1 linha** ("esse conteúdo é pro @ericluciano ou @expertintegrado?") ANTES de montar o briefing. NUNCA chutar o perfil nem reusar o kit de outro — postar no perfil errado é erro grave.

Leia o kit do alvo e use a paleta + tipografia dele pra preencher `color_palette` e `brand_rules`. Os hex dos kits são **aproximados (do visual do IG)**; se o Eric tiver os valores/fontes oficiais, eles têm prioridade.

### Contrato único — `briefing.json`
Saída da Fase 0, salvo em `$CONTEUDO_DIR/<slug>/briefing.json`. Contrato que TODOS os subagentes leem:

**Slug do job:** kebab-case derivado do tema/ângulo aprovado — minúsculas, sem acentos, `-` entre palavras, máximo ~40 caracteres (ex.: ângulo "O erro de contratar vendedor errado" → `erro-contratar-vendedor-errado`). É a chave de `$CONTEUDO_DIR/<slug>/` e do path exigido pelo gate.

```json
{
  "slug": "<slug>",
  "pipeline": "site|landing-rapida|instagram",
  "heygen_video": true,
  "objective": "<o que o conteúdo precisa fazer>",
  "target_audience": "<público>",
  "angle": "<tese central / gancho>",
  "tone": "educador, direto, sem hype",
  "color_palette": ["#0D1B2A", "#1B2838", "#FFFFFF", "#C9A227"],
  "cta": {"text": "<CTA>", "url": "<url ou #inscrever>"},
  "sections_required": ["hero", "sobre", "features", "cta-final"],
  "eric_photos": ["<paths das fotos, se houver>"],
  "brand_rules": "azul escuro + preto, Playfair Display + DM Sans, sem emojis, mobile-first",
  "image_specs": [
    {"prompt": "<prompt>", "aspect_ratio": "16:9", "output_path": "<saida.png>", "type": "edit|generate", "input_path": "<foto ou null>"}
  ],
  "context": "<diferenciais, referências, observações do Eric>"
}
```
**Quais campos preencher por pipeline** (o núcleo vale sempre; o resto é `[]`/omitido quando marcado "não usar"):

| Campo | site | landing-rapida | instagram (carrossel) |
|---|---|---|---|
| núcleo: `slug`,`pipeline`,`objective`,`target_audience`,`angle`,`tone`,`cta`,`context`,`color_palette`,`brand_rules` | preencher | preencher | preencher |
| `heygen_video` | `true` | `false` | `false` |
| `sections_required` (seções da PÁGINA — hero/sobre/features/cta-final) | preencher | preencher | **não usar** (`[]`) — não faz sentido em slides; o nº de slides vem do arg `nSlides` do gate, não daqui |
| `eric_photos` | se houver | se houver | se houver (decide imagem vs CSS — ver abaixo) |
| `image_specs` | preencher (ver abaixo) | preencher | **não usar** (`[]`) — o gate NÃO lê `image_specs`; o Designer decide as imagens do carrossel sozinho a partir de `eric_photos` |

**`image_specs` — quem preenche e o `type`:** em `site`/`landing-rapida` é o **Estrategista (Fase 0) que preenche a priori**, 1 entrada por imagem planejada (`prompt`,`aspect_ratio`,`output_path`,`type`,`input_path`); o Designer executa exatamente essa lista. **Quantas imagens (o original não fixa um número):** default = **1 hero + 1 imagem por seção de conteúdo principal de `sections_required`** — default ajustável pelo Estrategista conforme a pauta (mais/menos imagens por seção). Regra de `type`: rosto do Eric → `edit` com a foto real em `input_path`; imagem sem rosto → `generate`; NUNCA `edit` sem `input_path`. Isso rege o `type` de cada imagem que você decidir gerar — **não obriga gerar imagem**. No pipeline `instagram` o gate ignora `image_specs`: deixe `[]`.

**Carrossel `instagram` SEM `eric_photos` (só texto):** o Designer do gate monta TODOS os slides só com HTML/CSS (gradientes + cores do brand-kit, ex. navy `#0B1220`→`#10243F` + glow ciano `#2BB7E0` no @ericluciano) — **NÃO chama a skill `imagem` nenhuma vez**, e `image_specs` fica `[]`. Só há geração de imagem no carrossel quando `eric_photos` está preenchido (aí o fundo dos slides usa `edit` com a foto). Carrossel de texto = zero imagem = mais rápido e barato; não invente imagens de fundo/gráficos "pra preencher".

**Exemplo preenchido — carrossel de texto (sem fotos) pro @ericluciano** ("o erro que me travou como empreendedor"):
```json
{
  "slug": "erro-que-me-travou",
  "pipeline": "instagram",
  "heygen_video": false,
  "objective": "autoridade + gerar conversa sobre a jornada de empreender",
  "target_audience": "empreendedores e donos de pequenos negócios que se cobram demais",
  "angle": "o que mais me travou não foi falta de estratégia, foi querer fazer tudo sozinho",
  "tone": "educador, direto, sem hype",
  "color_palette": ["#0B1220", "#10243F", "#2BB7E0", "#FFFFFF"],
  "cta": {"text": "me segue pra mais bastidores de quem constrói na prática", "url": "#seguir"},
  "sections_required": [],
  "eric_photos": [],
  "brand_rules": "navy escuro de fundo, glow ciano de destaque, texto branco, sem dourado, sem emoji, mobile-first",
  "image_specs": [],
  "context": "@ericluciano; carrossel de 5 slides; fundo só CSS (sem fotos do Eric); tese pessoal: fazer tudo sozinho trava o crescimento; slide final = CTA de seguir"
}
```
(`color_palette`/`brand_rules` saíram de `brand-kits/ericluciano.md` — navy+ciano é a paleta que o gate espera pro @ericluciano; `sections_required`/`image_specs`/`eric_photos` vazios porque é carrossel de texto — o Designer faz os fundos em CSS.)

Validação: arquivo existe, `objective`/`target_audience`/`angle`/`cta`/`context` preenchidos (nenhum vazio). SE algum vazio → volte à Fase 0, não dispare.

## Pipeline `landing-rapida` (sem vídeo) — ~4-6 min
1. Sessão principal monta o `briefing.json` completo (validação acima).
2. Abre **só o Designer** (1 Agent, briefing completo no prompt). Ele gera as imagens, escreve a copy a partir do briefing, monta o HTML e faz deploy v1.0. Validação: retorno no schema Designer (abaixo) com `deploy_v1_url` preenchido. SE schema incompleto → pedir só o campo faltante ao subagente; SE o Agent falhou → redisparar 1x; falhou de novo → reportar ao Eric e parar.
3. `curl -s -o /dev/null -w "%{http_code}" <deploy_v1_url>` (Windows: `--ssl-no-revoke`). SE `200` → devolver a URL ao Eric. SENÃO → desabilitar SSO do projeto Vercel (ver a seção **Deploy (sites)**) e redeploy 1x; SE ainda ≠200 → reportar o estado real (nunca declarar sucesso sem 200).

Sem coordenação entre agentes = mais barato e rápido.

## Pipeline `site` (com vídeo HeyGen) — v1.0 ~8 min, v2.0 ~13 min
1. **Preparação:** esperar o Eric terminar de mandar material, definir `slug`, copiar assets pro workspace, montar `briefing.json`. **Checkpoint antes do spawn** (custo alto) — confirmar pauta/ângulo + CTA em 1 pergunta.
2. **Spawn paralelo (mesma mensagem, 2 Agents):**
   - **Copywriter:** copy de todas as seções + script HeyGen (60-90s). É o Copywriter (dono do script) quem dispara o render do vídeo, via skill `video` (CORREÇÃO-DE-FATO: o original atribuía a `imagem`/`video` ao Designer, contradizendo este pipeline e o schema do Copywriter — `video` reatribuído ao Copywriter deliberadamente); salva `copywriter-output.json` ANTES de disparar o render (circuit breaker: o texto sobrevive mesmo se o render falhar) e devolve `mp4_path`/`video_url` no schema.
   - **Designer:** gera imagens → espera/lê a copy → monta HTML → deploy v1.0.
3. **Coleta + validação de schema** (seção Schemas). SE faltou campo → pedir SÓ o campo faltante ao subagente (mesmo mecanismo do `landing-rapida`: não redisparar o Agent inteiro, não perguntar ao Eric); completar e só então seguir.
4. **Notificar v1.0:** confirmar HTTP 200 via curl → mandar URL ao Eric.
5. **v2.0 (vídeo):** baixar o MP4 do HeyGen IMEDIATAMENTE (URL expira ~1h), comprimir com `ffmpeg` (~5MB), patch da `<video>` no HTML e redeploy. SE o vídeo atrasar → v1.0 já está no ar; atualizar quando chegar.

SE o Copywriter não entregar em ~8 min → o Designer gera **copy derivado do briefing** (nunca placeholder genérico) e sobe **v1.0-preview**; avisar o Eric que o copy final atualiza depois.

## Pipeline `instagram` (gate DURO de qualidade via Workflow)

O ciclo produção→revisão→export roda pelo Workflow `assets/pipeline-instagram-gate.mjs`, que torna o corte de score uma **trava de código**: o export só é alcançado com `score >= 7`; se reprovar, re-gera a copy com o feedback do Revisor e tenta de novo (máx `maxTries`, default 3). Estourou as tentativas sem atingir 7 → retorna `reprovado` **sem exportar**.

1. **Fase 0:** montar o `briefing.json` em `C:/tmp/conteudo/<slug>/` (path EXIGIDO pelo script do gate) e criar a pasta. SE `eric_photos` preenchido → preferir **5 slides** e instruir layouts variados no briefing (capa fullscreen com gradient; foto direita/esquerda; fullscreen bg com stat cards; CTA com overlay) — slides uniformes desperdiçam o impacto visual das fotos.
2. **Rodar o gate:** tool **Workflow** com `{scriptPath: "<valor de $GATE>"}` — o path absoluto real resolvido nos Pré-requisitos (ex.: `$HOME/.claude/plugins/cache/expertintegrado/marketing/<versão>/skills/orquestrar-conteudo/assets/pipeline-instagram-gate.mjs`); NUNCA passar a string `<pasta-desta-skill>` literal. `args: {"slug": "<slug>", "briefingPath": "C:/tmp/conteudo/<slug>/briefing.json", "nSlides": 5, "maxTries": 3}` (o runtime entrega `args` como string JSON; o script já parseia). Internamente o Workflow executa: Copywriter ∥ Designer (paralelo) → montagem determinística (injeta copy nos tokens `{{SLIDEn_TITLE}}`/`{{SLIDEn_BODY}}` → `carrossel-final.html`, 0 `{{`) → Revisor pontua → loop até `score >= 7` → export PNG. **Perfil:** o script do gate é hardcoded pro **@ericluciano** (Copywriter/Designer/Revisor internos — ver PENDENTE-SCRIPT); pra @expertintegrado ou qualquer outro perfil NÃO use o Workflow, vá pelo **fallback manual** (Agents com o brand-kit do perfil), senão o carrossel sai com as cores do @ericluciano OU o Revisor reprova a paleta certa em loop. Interpretar o retorno:
   - SE `status: "aprovado"` → passo 3. O retorno traz `score`, `exported`, `out_dir`, `caption_file`.
   - SE `status: "reprovado"` → o retorno traz `score` e `message`; reportar ambos ao Eric — **não** exportar, **não** tentar burlar o gate.
   - SE `status: "erro"` → conferir `slug`/`briefingPath` nos args e redisparar 1x; falhou de novo → fallback manual.
   - SE a tool Workflow não existir no ambiente → **fallback manual**: mesma sequência Produção→Montagem→Revisor→Export nos Agents, mas o corte `score>=7` vira responsabilidade da sessão (gate mole). Preferir sempre o Workflow.
3. **Preview SEMPRE (desktop):** copiar `assets/gallery-template.html` para `$WORKSPACE_DIR/temp/<slug>/index.html` (galeria-carrossel: 1 slide por vez, setas ‹ ›, teclado ← →, bolinhas, clique-pra-ampliar; auto-detecta o nº de slides). **Tem que ser `index.html`** (não `gallery.html`) — o painel de preview abre na RAIZ do server; sem `index.html` a raiz mostra listagem de arquivos. Achar uma porta livre e subir o server via `preview_start`:
   ```bash
   PORT=4530
   while curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/" 2>/dev/null; do PORT=$((PORT+1)); done
   # curl com sucesso = algo respondeu (porta ocupada) -> incrementa; conexão recusada = $PORT livre
   ```
   Chame a tool `preview_start` apontando o diretório `$WORKSPACE_DIR/temp/<slug>` e a porta `$PORT`. **A própria tool `preview_start` cria/atualiza a entrada no `.claude/launch.json`** — você NÃO edita nem cria o `launch.json` à mão (ele nem precisa existir antes). SE `preview_start` acusar porta em uso → incrementar `$PORT` e repetir. SE headless/VPS (sem preview) → pular e apontar o caminho dos PNGs.
4. **Entrega:** PNGs + legenda (de `copywriter-output.json`) ao Eric. Carrossel NÃO vai pra Vercel.

### Estrutura de copy do Instagram (Copywriter segue)
**Legenda:**
```
[HOOK — 1ª linha que para o scroll; sem rodeio]
[Corpo — 3-5 parágrafos curtos, 1-3 linhas cada]
[CTA específico — uma ação clara]
[Hashtags — 8-20, separadas por espaço, no fim]
```
**Slides:** título curto e forte (não é frase inteira) + corpo enxuto. Capa = gancho; slides do meio = 1 ideia cada; último = CTA. Voz do Eric: 1ª pessoa, direto, dados quando der, **zero buzzword** (`revolucionário`, `game-changer`, `transformador`, `disruptivo`, `mindset`).

### Protocolo de export do carrossel (CRÍTICO — validado em produção jun/2026)

**NUNCA usar MCP Playwright para este export.** O MCP roda em `deviceScaleFactor` ~1.333, o que causa dois bugs combinados:
- `window.scrollTo(0, N*1080)` não funciona — body com `gap` ou `padding` desloca os slides de múltiplos exatos de 1080px; a área capturada fica cortada
- Element locator (`#slide-N`) em slides distantes do viewport produz screenshot em branco (imagens não renderizadas pelo browser)

**Método validado: Python Playwright com `device_scale_factor=1`.**

Servidor HTTP e script Python **obrigatoriamente no mesmo Bash call** — o Bash tool não persiste processos entre chamadas. `<porta>` = porta livre (o gate usa 8911; escolha outra, ex. 8912). `N` = número de slides.

```bash
PY=$(command -v python3 || command -v python || echo "$LOCALAPPDATA/Programs/Python/Python312/python.exe")
cd "${CONTEUDO_DIR:-C:/tmp/conteudo}/<slug>" && "$PY" -m http.server <porta> --bind 127.0.0.1 &
SERVER_PID=$!
sleep 2

"$PY" - << 'PYEOF'
import asyncio, os
from playwright.async_api import async_playwright

# NUNCA cravar o nome do usuario (ex: "Eric Luciano"); ~/env resolve pro user atual (ericl, etc)
OUTPUT = os.path.join(os.environ.get("WORKSPACE_DIR", os.path.expanduser("~/OneDrive/Workspace")), "temp", "<slug>")
os.makedirs(OUTPUT, exist_ok=True)

async def export():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(
            viewport={"width": 1080, "height": 1080},
            device_scale_factor=1          # CRÍTICO — garante 1080px reais, não 1440px
        )
        page = await ctx.new_page()
        await page.goto("http://127.0.0.1:<porta>/carrossel-final.html")
        await page.add_style_tag(content="""
            body { padding: 0 !important; gap: 0 !important; }
            html, body { scrollbar-width: none !important; overflow-x: hidden !important; }
            html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
        """)
        await page.wait_for_function(
            "() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)"
        )
        for i in range(1, N+1):          # N = número de slides
            out = f"{OUTPUT}/slide-{i}.png"
            await page.locator(f"#slide-{i}").screenshot(path=out, type="png")
        await browser.close()

asyncio.run(export())
PYEOF

kill $SERVER_PID 2>/dev/null
```

Conferir tamanhos com `ls -la` — cada PNG deve ter dimensão variada (300KB–1MB); tamanhos todos iguais indicam falha no carregamento da imagem.

## Geração de imagens
**Primário:** a skill **`imagem`** (mesmo plugin `marketing` desta skill — já encapsula o gerador).
**Direto (se preferir API):** OpenAI Images API com `OPENAI_API_KEY` (env ou `op read "op://Agentes Eric/OPENAI_API_KEY/credential"`):
- Gerar: `POST /v1/images/generations` (model `gpt-image-2`)
- Editar (colocar o Eric em outro contexto): `POST /v1/images/edits` (model `gpt-image-2`) com a foto real como input

**Regras de identidade:** rosto do Eric → SEMPRE `edit` com foto real de referência; nunca gerar o rosto dele do zero. Sem rosto → `generate`.

**Banco de fotos do Eric** (`$ERIC_FOTOS_DIR`, default `~/OneDrive/Imagens/Perfil profissional/` — mesma fonte da skill `tweet-print`; em outra máquina, sobrepor com a env `ERIC_FOTOS_DIR`):
- `Avatar.jpg` — headshot/avatar frontal (idêntico ao que a `tweet-print` usa; compatível com a env `TWEET_PRINT_DEFAULT_AVATAR`).
- Ensaio de estúdio pra `edit` (corpo/contexto): `PPGX_SouMemoravel*.jpg` e `Legacy -*.jpg`. Palco/evento: `Eric (imersão High Ticket) 4.jpg`. (Descartar `Automação*.png` e afins — não são foto do Eric.)
- **Escolha da foto-base do `edit` — determinística, sobre ESTE banco** (por nome/tipo de arquivo): ESTE banco NÃO tem as `tags` do catálogo `agent-assets` que a skill `imagem` usa (`identidade`/`formal`/`palestra`/`frontal`) — logo NÃO aplicar aquele guia aqui; é outro acervo. Rode `ls "$ERIC_FOTOS_DIR"` e mapeie o que o `image_specs[].prompt` pede a um grupo: (1) rosto de frente / avatar / headshot → `Avatar.jpg`; (2) corpo / contexto / ensaio profissional → série `PPGX_SouMemoravel*.jpg` (preferência) ou `Legacy -*.jpg`; (3) palco / palestra / evento → `Eric (imersão High Ticket) 4.jpg`. Quando o prompt ativa 2+ grupos, precedência `Avatar` (rosto/identidade) > ensaio (`PPGX` > `Legacy`) > palestra. **Desempate dentro de uma série:** menor sufixo numérico primeiro (ordem alfabética ascendente do nome do arquivo), descartando cópias (`* - Copia.jpg`). Passar o caminho escolhido em `image_specs[].input_path`, nunca por preferência subjetiva. SÓ se, mesmo após a precedência, 2 candidatas de grupos diferentes servirem igualmente pro mesmo spec → **perguntar ao Eric** qual usar, em vez de adivinhar.

Serialize as chamadas (1 imagem por vez) e trate rate limit (429 → espera Retry-After + 5s, máx 3 retries; fallback: foto real sem edição).

**Carrossel `instagram` sem `eric_photos`:** o Designer do gate NÃO chama esta skill — monta os slides só com HTML/CSS do brand-kit (ver Contrato). Geração de imagem no carrossel só quando há foto do Eric (via `edit`).

## Vídeo
Skill **`video`** (mesmo plugin `marketing`; HeyGen + ElevenLabs). Regras: baixar o MP4 **imediatamente** (URL HeyGen expira ~1h) e comprimir com `ffmpeg` (~5MB) antes do deploy.

## Deploy (sites)
```bash
VERCEL_TOKEN="${VERCEL_TOKEN:-$(op read "op://Agentes Eric/VERCEL_API_TOKEN/credential")}"
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```
**Desabilitar SSO / Deployment Protection** (o "Vercel Authentication" que faz o `curl` cair em 401 em vez de 200) — via API REST, setando `ssoProtection: null` no projeto. HIPÓTESE (não verificada contra fonte canônica Vercel nesta revisão): o endpoint `v9/projects/{id}` + campo `ssoProtection: null` é a abordagem padrão/plausível; SE o PATCH retornar erro de campo/rota, conferir a doc atual da API Vercel (Deployment Protection) antes de insistir — não repetir a mesma chamada às cegas. `projectId` e `orgId` (=`teamId`) saem do `.vercel/project.json` que o `vercel deploy` cria na pasta do deploy:
```bash
PROJECT_ID=$(node -e "process.stdout.write(require('./.vercel/project.json').projectId)")
ORG_ID=$(node -e "process.stdout.write(require('./.vercel/project.json').orgId||'')")
curl -s --ssl-no-revoke -X PATCH \
  "https://api.vercel.com/v9/projects/$PROJECT_ID${ORG_ID:+?teamId=$ORG_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection": null}'
```
Depois **redeploy 1x** (mesmo comando `vercel deploy --prod`) e re-`curl` na URL. Payload >10MB → usar file upload API. Confirmar HTTP 200 antes de avisar o Eric. Sem `--prod` o deploy cai em preview e o domínio serve build antigo.

## Schemas (minimum viable output)
**Copywriter:** `{ status, pipeline, project_slug, headline, sub_headline, sections[], cta_link, heygen_script, mp4_path|null, video_url|null, video_error|null, timestamp }` — mínimo: seções `hero` + `cta-final`. **Toda a copy com acentuação correta do português.**
**Copywriter (instagram, schema do gate):** `{ status, caption, hashtags, slides: [{n, title, body}] }`.
**Designer:** `{ status: "done|preview", pipeline, project_slug, html_path, images_generated[], video_embedded, deploy_v1_url, timestamp }`.
**Revisor:** `{ score: 1-10, status: "aprovado|aprovado-com-ajustes|reprovado", checklist: {...}, ajustes_aplicados: [], timestamp }`.

## Revisor — checklist + escala de qualidade (Instagram, obrigatório)

O Revisor (`exp-ger-marketing`) roda este checklist sobre `carrossel-final.html` + legenda ANTES do export:

**Tom de voz (bloqueante):**
- [ ] Acentuação correta do português em TUDO (erro de acento = reprova, conserta e re-checa)
- [ ] 1ª pessoa do singular, direto, sem rodeio
- [ ] Zero buzzword (`revolucionário`, `game-changer`, `transformador`, `disruptivo`, `mindset`, `hype`)
- [ ] Sem emoji

**Conteúdo (bloqueante):**
- [ ] Número/claim → tem fonte ou é experiência real do Eric? Sem fonte = remover ou suavizar
- [ ] Urgência manufaturada ("só hoje", "última chance" sem motivo real) = remover
- [ ] CTA específico e único (não genérico)
- [ ] Hook da capa para o scroll de verdade

**Visual:**
- [ ] 0 tokens `{{` sobrando no HTML
- [ ] Layout varia entre slides quando há foto editada
- [ ] Brand-kit respeitado (paleta + tipografia)

**Escala:**
| Score | Classificação | Ação |
|---|---|---|
| 9-10 | Excelente | Aprovar e exportar |
| 7-8 | Bom | Aprovar **com ajustes** — aplicar e exportar |
| < 7 | Insuficiente | **Reprovar** — corrigir e re-revisar antes de exportar |

Item bloqueante violado derruba o score pra < 7, independente do resto. A sessão principal (ou o gate) só exporta com score ≥ 7. Sites não passam pelo Revisor — a sessão principal fecha a v2.0 direto.

## Validação final (checklist antes de entregar)
**Site/landing:**
- [ ] `curl` na URL de produção retornou 200 (com `--ssl-no-revoke` no Windows)?
- [ ] Copy com acentuação correta e seções mínimas `hero` + `cta-final`?
- [ ] SSO do projeto Vercel desabilitado?
- [ ] Pipeline `site`: MP4 baixado, comprimido ~5MB e embutido (ou v1.0 no ar + aviso de que o vídeo atualiza)?

**Instagram:**
- [ ] Gate retornou `aprovado` com `score >= 7`?
- [ ] 0 tokens `{{` no `carrossel-final.html`?
- [ ] N PNGs em `$WORKSPACE_DIR/temp/<slug>/`, tamanhos variados (300KB–1MB)?
- [ ] Preview servido com `index.html` na raiz (desktop) ou caminho dos PNGs apontado (headless)?
- [ ] Legenda entregue junto (de `copywriter-output.json`)?
- [ ] NADA foi pra Vercel?

**Geral:**
- [ ] Brand-kit do perfil CERTO (nunca o de outro perfil)?
- [ ] Zero buzzword, zero emoji, CTA específico?
- [ ] Material tardio (se houve) aplicado via patch?

## Erros comuns e recovery
- **PNG cortado ou em branco no export** → foi usado MCP Playwright ou DPR ≠ 1. Refazer com o protocolo Python (`device_scale_factor=1`, locator `#slide-N`).
- **PNGs todos com o mesmo tamanho** → imagens não carregaram no browser. Conferir o `wait_for_function` de imagens e re-rodar o export.
- **Token `{{` sobrando após montagem** → Designer saiu do contrato de tokens (só `{{SLIDEn_TITLE}}`/`{{SLIDEn_BODY}}` são permitidos). O gate re-gera o template sozinho; no fallback manual, reabrir o Designer instruindo os 2 tokens por slide (total 2×N) e re-montar.
- **Gate `reprovado`** → o retorno traz `score` e `message` (os `problemas` do Revisor ficam internos ao gate); reportar ao Eric e revisar briefing/voz — NÃO exportar.
- **Gate `erro` (args inválido)** → faltou `slug` ou `briefingPath`; conferir e redisparar 1x.
- **Copywriter passou de ~8 min** → Designer gera copy derivado do briefing (nunca placeholder) e sobe v1.0-preview; avisar que o copy final atualiza.
- **URL do HeyGen expirada** (passou ~1h sem baixar) → re-obter/re-render via skill `video` e baixar na hora.
- **429 na geração de imagem** → backoff (Retry-After + 5s), máx 3 retries; fallback: foto real sem edição.
- **Deploy Vercel caiu em preview/401** → faltou `--prod` ou token com SAML; usar o token do fallback 1P e redeploy com `--prod`.
- **Payload Vercel >10MB** → file upload API.
- **Preview mostra listagem de arquivos** → a galeria não está como `index.html` na raiz do server; renomear e recarregar.
- **Foto/CTA chegou depois do spawn** → salvar em `handoffs/<slug>/late/`, esperar os agentes, patch + redeploy (respawn do Designer só se crítico).
- **Eric mudou requisito fundamental mid-flight** → parar os subagentes, atualizar o briefing e redisparar.
- PENDENTE-SCRIPT: `assets/pipeline-instagram-gate.mjs` tem 3 hardcodes nos prompts internos (corrigir no script, fora do escopo desta skill): (1) **marca @ericluciano** — o Copywriter recebe "carrossel do @ericluciano", o Designer força fundo CSS `navy #0B1220→#10243F + glow ciano #2BB7E0` quando `eric_photos` está vazio (IGNORA `color_palette`/`brand_rules` do briefing) e o Revisor reprova o que não for "navy + ciano, texto branco, sem dourado"; (2) `python` sem detecção `command -v`; (3) `~/OneDrive/Workspace/temp` (ignora `WORKSPACE_DIR`). CONSEQUÊNCIA da (1): o Workflow gate hoje só entrega carrossel coerente pro **@ericluciano** — pra @expertintegrado ou qualquer outro perfil o gate sai com as cores do @ericluciano OU reprova a paleta certa em loop; nesse caso use o **fallback manual** (Agents com o brand-kit do perfil), NÃO o Workflow, até o script ser corrigido. Em máquina sem `python` no PATH, SE o export interno do gate falhar → também usar o fallback manual com o protocolo de export desta skill (que detecta `$PY`).

## Exemplo (mini — carrossel)
Pedido: "monta um carrossel pro @ericluciano sobre os 3 erros de quem começa com IA".
1. Fase 0: objetivo = autoridade; público = empreendedores iniciantes; ângulo = "os erros não são técnicos, são de gestão"; formato = `instagram`, 5 slides, sem foto editada; CTA = "me segue pra mais". Brand-kit `ericluciano.md` (navy `~#0B1220`/`~#10243F` + ciano `~#2BB7E0`, texto branco, sem dourado).
2. `briefing.json` em `C:/tmp/conteudo/3-erros-ia/` (`eric_photos:[]`, `sections_required:[]`, `image_specs:[]` — carrossel de texto, fundos só CSS) → Workflow gate com `scriptPath = $GATE` (resolvido nos Pré-requisitos) e `args {"slug":"3-erros-ia","briefingPath":"C:/tmp/conteudo/3-erros-ia/briefing.json","nSlides":5,"maxTries":3}`.
3. Gate retorna `aprovado` (score 8) → copiar galeria pra `$WORKSPACE_DIR/temp/3-erros-ia/index.html` → `preview_start` porta 4530 → entregar 5 PNGs + legenda.
