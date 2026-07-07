---
name: criar-webinario
description: >-
  Playbook ponta a ponta pra lançar um webinário/live gratuita de tráfego pago
  da Expert Integrado — da definição do produto até a otimização da próxima edição.
  Orquestra as skills que já existem (criar-campanha, criar-reel) e adiciona os
  passos próprios do funil de webinário: landing page em HTML com teste A/B + pixel,
  criativos (estático e vídeo), campanha no Meta, sequência de lembretes no WhatsApp,
  dia da live e análise pós-live.
  USAR quando o pedido for "cria um webinário", "monta a live", "lança a próxima
  edição da aula gratuita", "campanha de webinar", ou colar um briefing de live/webinário.
  NÃO usar pra: post/reel avulso de orgânico (use criar-reel), campanha de ads que não
  é de webinário (use criar-campanha), ou evento presencial/pago (não é live gratuita de tráfego).
allowed-tools: Read, Write, Edit, Bash, Skill, mcp__whatsapp-agent__status, mcp__whatsapp-agent__send
---

# Criar Webinário — funil completo de live gratuita (Expert Integrado)

Pega uma ideia de live/webinário e entrega tudo pronto pra rodar: `brief.md`, landing page A/B em HTML (a partir dos templates da própria skill) com pixel, criativos (vídeo via `criar-reel` + estático), campanha no Meta pausada, sequência de lembretes no WhatsApp e o plano de análise pós-live. É um playbook de orquestração: cada fase produz um arquivo na pasta do webinário e usa as skills/MCPs já existentes.

## NUNCA
- NUNCA usar o evento de pixel `Lead` genérico pro registro do webinário. Cada funil tem o SEU evento (ex: `InscricaoWebinar`) — reusar o `Lead` compartilhado com outro site contamina os números (foi o que inflou os leads na 1ª edição, biblioteca vazando pra dentro do webinário).
- NUNCA disparar o evento de registro na landing page. Ele dispara SÓ na página de confirmação/obrigado.
- NUNCA usar CTA de orgânico ("comenta X", "manda DM") em criativo de ad. CTA de ad aponta o link ("o link tá aqui embaixo").
- NUNCA abrir criativo com pergunta abstrata ("quanto custa sua hora?"). Abrir com cena concreta de dor operacional repetitiva.
- NUNCA subir a campanha no Meta com play direto. Publicar SEMPRE pausada; Eric/responsável revisa e dá play.
- NUNCA inventar case, número ou benchmark. Conferir os números na 1ª edição (`references/funil-e-metricas.md`) antes de citar; se não tiver o dado, não citar.
- NUNCA pôr chave/token real nem hardcodar pixel_id nos templates ou HTMLs versionados da skill. Valores da edição vão nos tokens de chaves duplas preenchidos na pasta do webinário. (Única exceção versionada: `references/pixel-e-tracking.md` documenta o pixel da conta — a Fase 1 depende dele.)
- NUNCA disparar WhatsApp fora da sequência de 4 toques (vira spam) nem pedir dado sensível por WhatsApp (só lembrete + link). Respeitar quem pedir pra sair.
- NUNCA colocar mais de 3 campos no formulário da LP. Só nome + WhatsApp + nº de funcionários.

## SEMPRE
- SEMPRE travar a régua de ICP em toda peça: donos/sócios/diretores de empresa com MAIS de 20 funcionários. A régua entra na copy do criativo E na segmentação E na LP.
- SEMPRE janela curta de inscrição: até 3-4 dias antes da live (quem se inscreve com 10 dias esquece e não aparece).
- SEMPRE gerar `lp-a.html` e `lp-b.html` mudando SÓ o `{{HEADLINE}}` (o resto idêntico) — o headline é a variável do A/B.
- SEMPRE otimizar E reportar a campanha na Conversão Personalizada do webinar (por URL), nunca no `Lead` genérico. Conjunto NOVO a cada edição (Meta não deixa trocar o evento de otimização de um conjunto que já roda).
- SEMPRE tratar a presença ao vivo (show rate) como a maior alavanca — não custa mídia. Não pular a Fase 6 (lembretes).
- SEMPRE escrever texto externo (LP, criativo, lembrete) na voz do Eric: humano, oral, específico; você/seu (nunca "tu"); frases inteiras conectadas (nunca fragmentos com ponto); sem buzzword. Detalhe em `../criar-reel/references/voz-eric.md`.
- SEMPRE fuso America/Sao_Paulo em toda data/hora exibida ou agendada.

## Público-alvo (ICP) — trava
Donos, sócios e diretores de empresa com mais de 20 funcionários. Empresa abaixo disso entra no funil mas raramente vira agendamento bom. A régua entra na copy do criativo, na LP e na segmentação.

## Pré-requisitos
- **Skills orquestradas (invocar via tool `Skill`):** `criar-reel` (vídeos, Fase 4) e `imagem` (estático, Fase 4). `criar-campanha` (Fase 5) é o CAMINHO PREFERIDO quando estiver instalada na sessão (aparece no catálogo de skills); quando NÃO estiver, as instruções inline da Fase 5 são o fallback completo — a fase roda mesmo sem ela. Nenhuma dessas skills é bloqueante: skill de criativo ausente → registrar o criativo como pendente (Fase 4).
- **Templates da própria skill** (na pasta desta skill, `templates/`): `lp.html`, `confirmacao.html`, `pixel-snippet.html`. Não editar os originais — copiar pra pasta do webinário e preencher os tokens.
- **References da própria skill** (`references/`): `funil-e-metricas.md`, `criativo-formula.md`, `pixel-e-tracking.md`, `landing-page-ab.md`, `mensageria-lembretes.md`. Ler ANTES da fase correspondente (indicado em cada passo).
- **WhatsApp** (Fase 6): MCP `whatsapp-agent` conectado (o WhatsApp pessoal do Eric, Z-API). Confere com `mcp__whatsapp-agent__status` antes de disparar em lote. Disparo = tool `mcp__whatsapp-agent__send`.
- **Meta Ads (Fases 3 e 5):** NÃO há MCP de Meta Ads confirmado neste ambiente (`C:/MCPs/expert-mcps/mcps/` não tem `ads`) e esta skill NÃO navega no navegador (sem tool de browser). Então a configuração de pixel (Fase 3) e da campanha (Fase 5) no Gerenciador de Eventos/Ads Manager é MANUAL: a skill GERA o roteiro de configuração passo-a-passo (o que criar, onde, quais valores), ENTREGA ao Eric/responsável e AGUARDA a confirmação textual de que foi feito antes de seguir pra próxima fase (parada legítima de fase). As chamadas `ads_*` citadas nas references são placeholders — só chamar uma tool `ads_*` se ela existir de fato no ambiente; existindo, usá-la no lugar do roteiro manual.
- **Geração de imagem (Fase 4, estático):** feita pela skill `imagem` (invocar via `Skill`; backend OpenAI gpt-image-2 com fallback Gemini 2.5 Flash Image). Se a skill `imagem` não estiver disponível na sessão, gerar só os vídeos e registrar que o estático ficou pendente (fallback já existente).
- **Deploy da LP (Fase 2):** a skill NÃO carrega host/projeto/token fixo — é deploy de PRODUÇÃO e exige OK explícito do responsável antes de subir. Roda via `Bash` (já em allowed-tools): **Cloudflare Pages** (preferido, ref `references/landing-page-ab.md`) com `wrangler pages deploy <pasta> --project-name <projeto>`, ou **Vercel** com `vercel deploy --prod` (nunca `vercel build`). Os sites do webinário rodam hoje no **Lovable** (ref `references/pixel-e-tracking.md`) — se o domínio ainda estiver no Lovable, editar/subir por lá, não por CLI. Confirmar com o responsável: (a) qual host está ativo no domínio, (b) o projeto, (c) a credencial/método. Sem esses três → gerar os HTML e reportar deploy pendente (não chutar conta/token).
- **Pasta do webinário:** criar uma pasta de trabalho pra edição (todas as saídas vão nela). Sugestão de default: `$WEBINARIO_DIR` se definida, senão `${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}/temp/webinario-<slug-do-tema>`. Criar com `mkdir -p`. (O Workspace hoje é o Google Drive, `/g/Meu Drive/claude-workspace/Workspace` — sincroniza entre máquinas e aceita `.md`/`.png`/`.mp4`; `~/OneDrive/Workspace` virou arquivo morto em 05/07/2026, não usar.)

---

## Passos (8 fases)

### Fase 1 — Definição do webinário → `brief.md`
Levantar e travar com o responsável (perguntar UMA vez cada item que faltar; não spamar). Todos os itens abaixo viram tokens da LP na Fase 2 — ver a tabela "Origem de cada token" lá.

**Decisões de conteúdo:**
- **Tema e promessa** — o que a pessoa sai sabendo/resolvendo. Ângulo que funciona: tirar tarefa repetitiva/operacional da empresa usando IA. Vira `{{HEADLINE}}`/`{{SUBHEADLINE}}` e os 4 bullets `{{APRENDE_1..4}}`.
- **Oferta do fim da live** — o que é apresentado pra gerar agendamento (ex: Super SDR, mentoria).
- **Data, horário (America/Sao_Paulo), duração e plataforma** (ex: Zoom). Duração (`{{DURACAO}}`): default **~1h** (ideal ≤1h, ref `references/landing-page-ab.md`). Regra: janela curta de inscrição, até 3-4 dias antes da live.
- **Bônus exclusivo pra quem está ao vivo** (material/template entregue só no final) — alavanca de presença.

**Links — atenção ao UTM de cada um (são coisas diferentes):**
- **Link de agendamento** (Calendly/RD da oferta): link JÁ existente que aparece nos slides no fim da live. Guardar no brief COM os UTMs de slide: `?utm_campaign=webinario&utm_source=<slug-do-tema>&utm_medium=ppt` (medium=`ppt` = aparece no PowerPoint — usado na Fase 7). Já dá pra preencher agora; não depende de deploy.
- **Link de inscrição** = a URL pública PLANEJADA da LP (ver "URLs planejadas" na Fase 2: `.../lp-a` e `.../lp-b`). O brief guarda só a URL-base, **SEM UTM embutido**: os UTMs de campanha entram na URL do anúncio (Fase 5) e o JS da LP os captura da query string. NÃO usa `medium=ppt` (ppt é exclusivo do link de agendamento).

**Insumos técnicos a coletar com o responsável (pra Fase 2/3) — se faltar, perguntar UMA vez, nunca inventar:**
- **Serviço/endpoint do formulário** (`{{ENDPOINT}}`): a URL que recebe o POST do form E da qual dá pra EXPORTAR a lista de inscritos depois (nome+WhatsApp+nº func). É a MESMA fonte usada na Fase 6 (disparo dos lembretes) e na Fase 8 (inscritos reais). Pode ser serviço de form/no-code, webhook, RD Station, planilha, ou o backend do site (os sites do webinário rodam hoje no Lovable — ref `references/pixel-e-tracking.md`). Sem esse dado a LP não sabe pra onde mandar o lead nem dá pra recuperar os inscritos depois.
- **Pixel ID** (`{{PIXEL_ID}}`): o pixel "EXPERT INTEGRADO" documentado em `references/pixel-e-tracking.md`. Confirmar com o responsável que segue sendo esse pixel; se ele indicar outro, usar o que ele der. Não hardcodar o ID nos arquivos versionados da skill (só na pasta da edição).
- **Bio do apresentador** (`{{BIO_ERIC}}`): 2-3 frases sobre quem apresenta (Eric por padrão) e por que tem autoridade em IA pra operação. Fonte: responsável OU reaproveitar de uma LP de edição anterior. Pra achar edição anterior, rodar `ls -d "${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}/temp/"webinario-* 2>/dev/null`, listar as pastas candidatas e perguntar ao Eric qual usar (ler o `lp-a.html` dela pra pegar o `{{BIO_ERIC}}` já preenchido); nenhuma pasta encontrada → pedir a bio ao Eric. NUNCA inventar credencial/número sobre o apresentador (mesma regra de "nunca inventar case/número").

**Saída:** escrever `brief.md` na pasta do webinário com todos os itens acima (conteúdo + os dois links + os insumos técnicos).
**Validação:** o brief tem tema, oferta, data+hora+duração+plataforma, bônus, o link de agendamento com os 3 UTMs, a URL-base planejada da LP, o endpoint do formulário, o pixel confirmado e a bio. Item faltando → perguntar ao responsável antes de seguir pra Fase 2 (não inventar valor).

### Fase 2 — Landing page (HTML + A/B) → `lp-a.html`, `lp-b.html`, `confirmacao.html`
Ler `references/landing-page-ab.md` antes. A skill (você) gera as LPs a partir dos templates.

**URLs planejadas (decidir AGORA, antes do deploy — é o que resolve a "dependência circular"):**
As URLs públicas são determinísticas: domínio + caminho escolhido. Decidir os caminhos já, pra preenchê-los nos HTMLs antes de subir. O deploy (passo 6) só coloca os arquivos NESSES caminhos — a URL é uma constante planejada, não uma descoberta pós-deploy.
- Domínio: `webinario.expertintegrado.com.br` (ref `references/pixel-e-tracking.md`; confirmar com o responsável se mudar).
- LP A: `https://webinario.expertintegrado.com.br/lp-a` · LP B: `.../lp-b` · Confirmação: `.../confirmacao` (= `{{URL_CONFIRMACAO}}`).

**Origem de cada token (de onde vem cada valor — nada é adivinhado):**
| Token | Valor / origem |
|---|---|
| `{{HEADLINE}}` | benefício, do brief; é a ÚNICA variável do A/B (headline 1 no lp-a, headline 2 no lp-b) |
| `{{SUBHEADLINE}}` | 1 frase que complementa o benefício, do brief |
| `{{DATA}}` `{{HORA}}` | brief (Fase 1), America/Sao_Paulo |
| `{{DURACAO}}` | brief (Fase 1); default ~1h |
| `{{PLATAFORMA}}` | brief (Fase 1), ex: Zoom |
| `{{CTA_TEXTO}}` | "Garanta sua vaga" ou "Quero participar" (ref `references/landing-page-ab.md`) |
| `{{BONUS}}` | brief (Fase 1) |
| `{{APRENDE_1..4}}` | 3-4 bullets do que a pessoa sai sabendo, derivados da promessa/tema do brief |
| `{{PROVA_SOCIAL}}` | histórico REAL da série (responsável / `references/funil-e-metricas.md`) — ver regra abaixo |
| `{{BIO_ERIC}}` | bio do apresentador (brief / LP de edição anterior); nunca inventar |
| `{{VARIANTE}}` | `a` no lp-a.html, `b` no lp-b.html |
| `{{PIXEL_ID}}` | pixel "EXPERT INTEGRADO" (`references/pixel-e-tracking.md`), confirmado no brief |
| `{{ENDPOINT}}` | serviço de formulário coletado no brief (Fase 1) |
| `{{URL_CONFIRMACAO}}` | a URL de confirmação planejada acima (`.../confirmacao`) |

**Regra do `{{PROVA_SOCIAL}}`:** é o histórico da SÉRIE de aulas gratuitas (agregado — pode cruzar temas/edições, é o track record da série, não do tema específico), com número REAL confirmado. Ex: "Mais de X donos e diretores já participaram das aulas". Se for a 1ª edição de todas (sem histórico algum), NÃO inventar número: deixar sem a contagem ou usar prova social não-numérica só se for real. Os depoimentos que já vêm no `lp.html` são PLACEHOLDERS — substituir por depoimentos reais ou remover; nunca publicar depoimento inventado.

1. Copiar `templates/lp.html` → `lp-a.html` e `templates/confirmacao.html` → `confirmacao.html` na pasta do webinário.
2. Preencher os tokens conforme a tabela acima. No `lp.html`: `{{HEADLINE}}` `{{SUBHEADLINE}}` `{{DATA}}` `{{HORA}}` `{{DURACAO}}` `{{PLATAFORMA}}` `{{CTA_TEXTO}}` `{{BONUS}}` `{{APRENDE_1..4}}` `{{PROVA_SOCIAL}}` `{{BIO_ERIC}}` `{{VARIANTE}}` `{{PIXEL_ID}}` `{{ENDPOINT}}` `{{URL_CONFIRMACAO}}`. No `confirmacao.html`: `{{PIXEL_ID}}` `{{DATA}}` `{{HORA}}` `{{PLATAFORMA}}` `{{BONUS}}` `{{LINK_CALENDARIO}}` (= link "adicionar ao calendário" da live — formato padrão de URL de evento do Google Calendar: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<título-url-encoded>&dates=<início>/<fim>`, com `<início>`/`<fim>` no padrão UTC `AAAAMMDDTHHMMSSZ`; o horário do brief é BRT (UTC-3), então converter somando 3h — ex: início 10/07/2026 20:00 BRT vira `20260710T230000Z`). `{{URL_CONFIRMACAO}}` já é conhecido (bloco "URLs planejadas") — preencher agora, não esperar o deploy.
3. Gerar `lp-b.html` = cópia de `lp-a.html` mudando SÓ o `{{HEADLINE}}` (e `{{VARIANTE}}` = "b"). Resto idêntico — o headline é a única variável do A/B.
4. Formulário enxuto: só nome + WhatsApp + nº de funcionários (o qualificador de ICP). Já vem assim no template. Grava a variante (`?lp=a`/`?lp=b`) e os UTMs no lead.
5. Headline = BENEFÍCIO, não tópico ("Tire X horas da sua operação", não "Webinar de IA"). Régua de ICP visível ("+20 funcionários"). Mobile-first, CTA âmbar em fundo escuro.
6. Deploy (ver "Deploy da LP" nos Pré-requisitos): subir `lp-a.html`, `lp-b.html` e `confirmacao.html` para os caminhos planejados no domínio do webinário. É deploy de PRODUÇÃO → confirmar host+projeto+credencial com o responsável e pedir OK explícito antes de subir. Sem target/credencial confirmados: gerar os HTML e reportar deploy PENDENTE com as URLs planejadas.

**Validação:** existem `lp-a.html` e `lp-b.html` diferindo SÓ no headline; nenhum token `{{...}}` sobrou sem preencher em NENHUM dos 3 arquivos (`grep -o "{{[A-Z_]*}}" lp-a.html lp-b.html confirmacao.html` deve vir vazio); formulário tem exatamente 3 campos.
**Se falhar:** token faltando → voltar ao `brief.md` / coletar com o responsável; deploy falhou ou sem OK → gerar os HTML mesmo assim e reportar as URLs planejadas como pendentes.

### Fase 3 — Pixel & tracking
Ler `references/pixel-e-tracking.md` (lição cara — leitura obrigatória) e `templates/pixel-snippet.html`.
1. Pixel base (`PageView`) no `<head>` das DUAS variantes da LP. Trocar `{{PIXEL_ID}}`.
2. Evento de registro EXCLUSIVO do funil (ex: `InscricaoWebinar`, via `fbq('trackCustom', ...)`) SÓ na página de confirmação — nunca o `Lead` genérico compartilhado com outro site.
3. Criar Conversão Personalizada por URL no Gerenciador de Eventos: evento de registro AND `URL contém webinario...`. Otimizar E reportar a campanha nessa conversão.
4. Conjunto NOVO a cada edição (Meta não deixa trocar o evento de otimização de conjunto que já roda).
5. Se houver CAPI server-side: casar o `event_id` pixel↔server pra deduplicar (senão dobra a contagem).

**Validação:** confirmação dispara `InscricaoWebinar` (não `Lead`); auditar com `ads_get_dataset_stats` (aggregation:url) SE o MCP de ads existir — se a URL do evento não for a do webinário, tem vazamento. Sem MCP de ads: auditar manualmente no Events Manager.
**Se falhar / sem MCP de ads:** a skill não navega — gerar o roteiro de configuração passo-a-passo, entregar ao responsável e AGUARDAR a confirmação textual de que foi feito antes de seguir (ver "Meta Ads" nos Pré-requisitos); registrar no arquivo da fase que foi manual.

### Fase 4 — Criativos (vídeo + estático) → `criativos/`
Ler `references/criativo-formula.md` antes.
- **Vídeos:** invocar a skill `criar-reel` (voz Eric no ElevenLabs + lip-sync HeyGen + B-roll do banco). Roteiro segue a fórmula:
  1. **Hook (0-3s):** cena concreta de dor operacional repetitiva (não pergunta abstrata).
  2. Diagnóstico (multiplica a cena pela operação inteira).
  3. Ponte pra IA.
  4. Régua de ICP na fala ("se você é dono ou diretor de empresa com mais de vinte funcionários...").
  5. **CTA de AD:** "o link pra se inscrever na próxima edição tá aqui embaixo." NUNCA "comenta X".
- **Estático:** 1 formato estático por edição (carrossel da "conta" converte bem em B2B), via skill `imagem` (invocar com a tool `Skill`; backend OpenAI gpt-image-2 com fallback Gemini). Formato: vertical `1024x1536` (feed/Stories) ou quadrado `1024x1024` — os que o gpt-image-2 aceita (o original pedia 9:16/1:1 no Gemini; `1024x1536` é o vertical equivalente suportado). **Estilo "dark+âmbar da série" = a MESMA paleta do template da LP** (`templates/lp.html`, bloco `:root`): fundo escuro `#0d0d0f`/`#15151a`, acento âmbar `#f5a623`→`#ff8a3d`, texto claro `#f4f4f6`. Se a skill `imagem` não estiver disponível na sessão, registrar o estático como pendente (fallback já existente).
- **Lineup enxuto:** 3-4 criativos por conjunto (não 8). Com ~70 leads/edição, mais que isso pulveriza a entrega. Composição: **os comprovados da 1ª edição** ("Reunião que se repete", "Imposto Invisível") **+ 2-3 novos** na fórmula da cena concreta. Os comprovados ficam na pasta de uma edição anterior (`webinario-<tema-anterior>`) ou na biblioteca de criativos do Ads Manager. Pra achar as pastas anteriores, rodar `ls -d "${WORKSPACE_DIR:-/g/Meu Drive/claude-workspace/Workspace}/temp/"webinario-* 2>/dev/null`, listar as candidatas e perguntar ao responsável/Eric qual usar (os criativos ficam em `<pasta>/criativos/`); se o `ls` não achar pasta nenhuma, pedir a localização ao responsável. Não localizou → gerar só os 3-4 novos e registrar os reaproveitados como pendentes. Régua de ICP em todos.

**Validação:** todos os criativos têm régua de ICP e CTA de ad (não de orgânico); abertura é cena concreta; lineup ≤ 4 por conjunto.

### Fase 5 — Campanha no Meta (pausada)
**Caminho preferido:** se a skill `criar-campanha` estiver instalada na sessão, usá-la como base (invocar via `Skill`). Quando ela NÃO estiver disponível, as instruções abaixo são o fallback completo — a fase roda mesmo sem ela. Estrutura validada:
- **2 conjuntos** (configurar no Ads Manager; o Meta **NÃO segmenta por nº de funcionários** — a régua "+20" vive na copy + no criativo + no qualificador do formulário, não em interesse):
  - **"Público Vencedor 20+" (frio):** reusar a audiência SALVA vencedora da 1ª edição — pedir ao responsável o nome/ID da saved audience no Ads Manager. Sem ela: público amplo (sem stack de interesse forçado) com a régua de ICP na copy. NÃO usar lookalike por padrão (só se o responsável tiver uma lista-fonte boa de clientes/inscritos).
  - **"Engajamento 180 dias" (remarketing):** Custom Audience de quem engajou com o **Instagram + Facebook da Expert Integrado nos últimos 180 dias** (criar no Ads Manager a partir dos ativos conectados; retenção 180 dias). CPL costuma ser melhor, mas satura rápido — não escalar demais.
- **Otimização:** na Conversão Personalizada do webinar (Fase 3), NÃO no `Lead` genérico.
- **Conjunto novo a cada edição** (já otimiza na conversão certa).
- **Publicar PAUSADA**, revisar, dar play. Se houver MCP de ads (`ads_create_*`), publicar por ele pausada; senão a skill gera o roteiro de criação passo-a-passo, entrega ao Eric/responsável e AGUARDA a confirmação textual de que a campanha foi criada (pausada) no Ads Manager antes de seguir (parada legítima — ver "Meta Ads" nos Pré-requisitos).
- **Budget:** total default **~R$300/dia** (meio da faixa R$200-400). Critério pra escolher dentro da faixa: criativos/públicos novos ou 1ª vez → base (~R$200); reaproveitando criativos+audiência comprovados → topo (~R$400). Split: **~2/3 no frio** ("Vencedor 20+") + **~1/3 no remarketing** ("Engajamento 180d", que satura rápido). Escalar só depois de 2-3 dias com CPL real estável (subir 20-30% a cada 2-3 dias nos vencedores).

**Validação:** campanha está PAUSADA; otimização aponta pra Conversão Personalizada do webinar; 2 conjuntos configurados. Reportar o link da campanha no chat.

### Fase 6 — Mensageria / lembretes (maior alavanca de presença) → `lembretes.md`
Ler `references/mensageria-lembretes.md` antes. Show rate é onde mais se perde gente (80% de no-show na 1ª edição). Subir presença não custa mídia.

**Cadência (ciclos):** a Fase 6 não é evento único — roda em CICLOS, default **1x/dia** até a live (o Eric pode pedir outra frequência). Cada ciclo: (a) reler o `inscritos.csv` atualizado, (b) identificar os inscritos NOVOS desde o último ciclo, (c) disparar o toque devido pra quem ainda não recebeu. Por isso o toque 1 "imediato na inscrição" é, na prática, **no primeiro ciclo após a pessoa se inscrever** (não em tempo real). Registrar quem já recebeu cada toque — uma coluna de status por toque no próprio `inscritos.csv` ou uma seção de controle no `lembretes.md` — pra NUNCA disparar o mesmo toque duas vezes pro mesmo contato.
1. **Obter a lista de inscritos** (nome + WhatsApp): o responsável exporta do serviço de formulário do brief (`{{ENDPOINT}}`, Fase 1) e salva em `<pasta-do-webinário>/inscritos.csv` (convenção fixa — é o mesmo arquivo lido na Fase 8). Ler com `Read`/`Bash` e descontar registros de TESTE. Se `inscritos.csv` não existir na hora do ciclo, parar e pedir o export ao responsável — nunca inventar/inferir contatos (regra: não enviar a número não confirmado).
2. Rodar `mcp__whatsapp-agent__status` pra confirmar conexão ANTES de disparar em lote.
3. Sequência de **4 toques** (disparar via `mcp__whatsapp-agent__send`, um por vez, ajustando nome/data/hora/link):
   - **1. Confirmação (no 1º ciclo após a inscrição — ver Cadência acima)**
   - **2. Véspera (D-1)** — reforçar o bônus de quem está ao vivo
   - **3. 3h antes** — lembrete curto com o link de entrada
   - **4. Minuto zero ("tô entrando agora")** — o toque que mais recupera gente
4. Esquenta no dia: story/áudio do Eric de manhã.
5. Não pedir dado sensível por WhatsApp (só lembrete + link). Não mandar fora da sequência. Respeitar quem pedir pra sair.

**Templates (voz do Eric — copiar e só trocar [nome]/[data]/[hora]/[link], mantendo a acentuação):**

**1. Confirmação (na inscrição)**
> Oi [nome], aqui é o Eric. Sua vaga na aula tá confirmada pra [data] às [hora]. Salva aí no seu
> calendário, porque eu vou mostrar ao vivo como tirar as tarefas repetitivas da sua empresa usando IA.
> Te mando o link de entrada mais perto. Até lá!

**2. Véspera (D-1)**
> [nome], é amanhã! [data] às [hora]. Vou soltar um material pronto pra usar só pra quem tiver ao vivo,
> então separa esse horário. Te espero lá.

**3. 3h antes**
> Daqui a 3 horas a gente começa, [nome]. [hora] no link: [link]. Entra uns minutos antes pra não perder
> o começo, que é onde eu mostro a parte mais importante.

**4. Minuto zero**
> Tô abrindo a sala agora, [nome]. Vem: [link]. Começando já!

**Saída:** salvar a sequência preenchida em `lembretes.md`.
**Validação:** `inscritos.csv` lido e TESTE descontado; `mcp__whatsapp-agent__status` conectado antes do disparo; controle de quem já recebeu cada toque atualizado (nenhum toque disparado 2x pro mesmo contato); 4 toques prontos com nome/data/hora/link corretos e acentuação preservada.

### Fase 7 — Dia da live
- Checklist: link do Zoom, slides/ppt com o link de agendamento (UTM `medium=ppt`), bônus à mão.
- O agendamento converte no fim da live — garantir que o CTA de agendar apareça claro e mais de uma vez.

**Validação:** o link de agendamento com UTM está nos slides e aparece ≥ 2 vezes.

### Fase 8 — Pós-live: análise e otimização → `analise-pos-live.md`
Ler `references/funil-e-metricas.md` antes. Montar o relatório do funil:
- **Investimento → inscritos → presença ao vivo → agendamentos**, com custo por etapa e CPL real.
- **Show rate**, qualidade ICP dos agendamentos (faixa de funcionários), **ranking dos criativos por CPL** (dados pré-correção de tracking ficam inflados — desconfiar de CPL bom demais).
- **Cruzar 3 fontes** (nenhuma tem MCP garantido — coletar assim; sem acesso direto, PEDIR o export ao responsável, não estimar):
  1. **Meta** (leads reportados, gasto, CPL, ranking por criativo): export CSV do Ads Manager (relatório por conjunto E por anúncio). Se houver MCP de ads (`ads_*`), puxar por ele; senão baixar no painel / pedir ao responsável.
  2. **Inscritos reais**: o `inscritos.csv` da pasta do webinário (o mesmo export usado na Fase 6, do `{{ENDPOINT}}` do brief) — descontar registros de TESTE. Ausente → pedir o export ao responsável.
  3. **Events Manager** (eventos do pixel por URL): auditar no painel (agregação por URL) ou `ads_get_dataset_stats aggregation:url` SE o MCP de ads existir.
  Divergência grande entre as 3 = problema de tracking.
- Reconciliar exports parciais de "anúncios" com o total dos conjuntos (soma conjuntos = soma anúncios) — parcial pode apontar o criativo errado como vencedor.
- Decidir: o que ativar/pausar, e gerar os scripts da próxima edição na fórmula vencedora (cena concreta).

**Saída:** `analise-pos-live.md` com a tabela do funil + decisão + scripts da próxima edição.

---

## Validação final (checklist)
Na pasta do webinário devem existir:
- [ ] `brief.md` — tema, oferta, data+hora+duração+plataforma, link de agendamento com UTM `ppt` + URL-base planejada da LP, endpoint do form, pixel confirmado, bio, bônus.
- [ ] `lp-a.html` e `lp-b.html` — diferindo SÓ no headline, sem token `{{...}}` pendente, form com 3 campos.
- [ ] `confirmacao.html` — tokens preenchidos (sem `{{...}}` pendente), dispara `InscricaoWebinar` (não `Lead`).
- [ ] `criativos/` — 3-4 vídeos por conjunto (+ 1 estático se ferramenta disponível), todos com régua de ICP e CTA de ad.
- [ ] Campanha no Meta PAUSADA, otimizando na Conversão Personalizada do webinar, 2 conjuntos, link reportado no chat.
- [ ] `lembretes.md` — 4 toques prontos, acentuação preservada.
- [ ] `analise-pos-live.md` (após a live).

## Erros comuns e recovery
- **Números inflados no Meta:** evento `Lead` genérico compartilhado com outro site. Recovery: criar evento próprio do funil na confirmação + Conversão Personalizada por URL (Fase 3), auditar por URL.
- **CPL bom demais:** provavelmente dado pré-correção de tracking. Recovery: só ranquear criativo com dados pós-correção; reconciliar com o total dos conjuntos.
- **Criativo com poucos leads:** abertura é pergunta abstrata. Recovery: reescrever hook com cena concreta de dor operacional repetitiva.
- **No-show alto:** faltou a sequência de lembretes ou janela de inscrição longa. Recovery: rodar os 4 toques (Fase 6) + janela de 3-4 dias.
- **Bloco de vídeo do ElevenLabs abortando:** voz "Eric Profissional - Abril-25" é instável em frase longa. Recovery: quebrar a frase longa/complexa em duas e re-rodar (fix da skill `criar-reel`).
- **Tool `ads_*` não existe no ambiente:** não há MCP de Meta Ads confirmado. Recovery: configurar pixel/campanha manualmente no painel e registrar no arquivo da fase.

## Notas
- Tudo na voz do Eric (`../criar-reel/references/voz-eric.md`): humano, oral, específico — nunca IA/corporativo.
- Nunca inventar case/número. Conferir antes.
- CTA de ad ≠ CTA orgânico. Ad = aponta link. Orgânico = "comenta X".
- Esta skill é específica da Expert Integrado (ICP "20+ funcionários", pixel/URLs, voz do Eric). Ao reusar em outra marca, trocar ICP, pixel, URLs e voice guide. Nenhuma chave/token vive na skill.
