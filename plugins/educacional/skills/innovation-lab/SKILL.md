---
name: innovation-lab
description: >-
  Conduz o CICLO DE VIDA inteiro de uma imersão do AI Innovation Lab de um cliente — uma pasta padrão por cliente, multi-fase, detectando a fase pelos arquivos presentes. ANTES: coleta onboarding + Pipedrive + call, faz OSINT, gera dossiê factual + estrutura de dor/munição + deck de abertura HTML (padrão). DURANTE (fim da manhã): o Eric joga a transcrição do Plaud (diagnóstico + brainstorm) + rascunho de soluções; a skill cruza rascunho × transcrição × o Brain de soluções do PRÓPRIO Eric e cria os cards de solução no ClickUp (pasta do cliente no space AI Innovation Labs). DEPOIS: exporta relatório visual HTML (1 slide por solução + pontos do diagnóstico). Insight reutilizável sobe pro Expert Brain; o factual do cliente fica no dossiê. TRIGGER: "prepara a imersão do [cliente]", "abre a innovation lab do [cliente]", "monta o dossiê do Lab pra [empresa]", "deck de abertura da imersão", "processa a transcrição da manhã/do brainstorm", "monta os cards de solução do [cliente] no ClickUp", "gera o relatório da imersão", "continua a imersão do [cliente]". NÃO usar pra: curso gravado/aula com ementa (→ criar-aula), palestra avulsa (→ apresentacao-html), briefing rápido pré-call comercial antes de fechar a venda (→ briefing-pre-call), decks de treinamento por fase estilo Suno (fora do escopo).
allowed-tools: AskUserQuestion, Skill, Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, mcp__expert-brain__recall, mcp__expert-brain__save_note, mcp__expert-brain__link, mcp__clickup-mcp__clickup_get_workspace_hierarchy, mcp__clickup-mcp__clickup_get_folder, mcp__clickup-mcp__clickup_create_folder, mcp__clickup-mcp__clickup_create_list_in_folder, mcp__clickup-mcp__clickup_create_document, mcp__clickup-mcp__clickup_create_task, mcp__clickup-mcp__clickup_update_task
---

# innovation-lab — Ciclo de vida da imersão do AI Innovation Lab

Uma skill, uma pasta por cliente, várias fases ao longo do dia. Acompanha a imersão do começo (preparação) ao fim (relatório), processando o que o Eric joga na pasta em cada momento. **Detecta a fase pelos arquivos presentes** na pasta do cliente (igual `criar-aula` detecta modo pelos insumos) e produz 4 entregáveis: dossiê factual, estrutura de dor/munição, deck de abertura e (cards ClickUp + relatório visual). O Lab acontece sempre igual: **1 dia, diagnóstico-pesado** (abertura → diagnóstico → brainstorm → almoço → capacitação → roadmap). A imersão da Suno (2 dias de treinamento) foi EXCEÇÃO, não o modelo.

## NUNCA

- **Tratar a Suno como modelo do Lab** — foi exceção (2 dias). O padrão é 1 dia diagnóstico-pesado.
- **Cruzar a solução com o dossiê do CLIENTE** — o repertório de soluções vem do Brain do Eric (Expert Brain + materiais de aula). Solução = dor do cliente × repertório do Eric.
- **Usar o space errado no ClickUp** — é o space **AI Innovation Labs `90131750441`**, NÃO o space Clientes/Clientes Ativos.
- **Criar pasta, lista ou lote de cards no ClickUp sem confirmar** (side-effect externo): se já existe pasta homônima, confirmar antes; **mostrar o lote de cards pro Eric antes de criar**.
- **Subir snapshot factual do cliente pro Brain** — vira museu. Factual fica no dossiê/`CLAUDE.md` local.
- **Inventar dado de empresa** — toda afirmação factual tem fonte + marcação de confiança (✅ ⚠️ ❓ 🔒). Ver regra 2 do CLAUDE.md global.
- **Misturar transcrição/insumo de OUTRO cliente** — conferir cliente + data de cada arquivo antes de usar como fonte (no Play55, 3 Plaud "Diagnóstico" eram da Odery, de um mês antes). Procedência é gate. → Brain `svtytwoivc0f`.
- **Confiar cego no campo "Responsável" da lista clonada** — vem com opções de OUTRO projeto (nomes errados); pôr o responsável NA DESCRIÇÃO até recriar as opções.
- **Personalizar demais o deck de abertura** — é padrão e fechado; só capa/identidade + o slide de dores variam.
- **Tratar exposição regulatória como "dor de IA"** (lição Play55); **prometer reescrita de sistema crítico** (sempre incremental); **hype**.
- **Hard-codear path absoluto do Workspace** — resolver por variável/ordem de fallback (ver Pré-requisitos).
- **Anti-patterns HTML** (herdados da `criar-aula`): `position: relative` em `.slide.*`; `--cyan-deep` em fundo dark; footer com 2 textos; tooltip/cola sobre o título (bug do deck Suno — tooltip por card).

## SEMPRE

- **Comando verbal dispara a FASE 0** (setup); da FASE 1 em diante, **detectar a fase pelos arquivos** presentes na pasta (ver "Mapa do dia"). Tolerante a nome: se o arquivo não seguir a convenção, ler o conteúdo e inferir o bloco.
- **Acentuação correta do português** em TODO texto externo (deck, relatório, títulos de card, docs).
- **Marcação de confiança** (✅ ⚠️ ❓ 🔒) em todo fato do dossiê; fontes no ledger.
- **Brain: insight sobe, factual fica no dossiê.** Munição/princípio/padrão reutilizável → `save_note` atômico (kind correto, domínio canônico kebab-case inglês, `link` com `why` ≥ 20 chars). Factual do cliente NÃO sobe.
- **Deck de abertura reproduz o padrão de 14 slides** — a lista canônica e a ordem fixa ficam na **fonte única `docs/PADRAO-DECK-ABERTURA.md`** (bundlado nesta skill); não há cópia inline aqui. Único slide personalizado = **"O que já mapeamos na {Empresa}"** (dores do pré-diagnóstico), inserido **após o Cronograma (slide 7), antes da Fase 1 (slide 8)** — total 15 slides.
- **Imagens do deck embutidas em base64** (o preview não serve `img/` relativo; vira arquivo único portátil).
- **Guardar `folder_id`/`list_id` do ClickUp** no `CLAUDE.md`/`SESSAO.md` local — dado fixo do projeto (não perguntar de novo).
- **Atualizar `SESSAO.md` a cada execução** e `HANDOFF.md` com paths/URLs/ids pra retomar em outra máquina.

## Pré-requisitos

**Caminho do Workspace (resolver dinâmico — nunca hard-codear).** Testar os candidatos NESTA ordem e usar o PRIMEIRO em que `<candidato>/Educacional` existe como diretório (checar com `[ -d "<candidato>/Educacional" ]`):
1. `$WORKSPACE_DIR` — se a env var estiver setada.
2. `G:/Meu Drive/claude-workspace/Workspace` — Google Drive, destino da migração de 05/07/2026 (default atual do PC).
3. `$HOME/OneDrive/Workspace` — legado (arquivo morto pós-migração, só leitura); usar apenas se 1 e 2 falharem.

SE nenhum candidato tiver a pasta `Educacional` → reportar ao Eric ("não localizei o Workspace") e PARAR (não criar árvore de pastas nova às cegas). O `<WORKSPACE>` resolvido é o candidato aprovado; usar ele em todos os paths daqui pra frente. Caminho canônico do Lab: `<WORKSPACE>/Educacional/02_Produtos/AI_Innovation_Lab/Edicoes_Customizadas/<Cliente>/`. Playbook interno em `<WORKSPACE>/Educacional/02_Produtos/AI_Innovation_Lab/Arquivos MD/Playbook_Interno.md`. Base de evidência: `Edicoes_Customizadas/Suno/` (deck/condução) e `Edicoes_Customizadas/Play55/` (dossiê/munição/cards/relatório — ciclo completo rodado 15-20/06/2026).

**MCPs e reuso:**
- **Expert Brain** — `mcp__expert-brain__recall`/`save_note`/`link`. SE o MCP Brain não está na sessão (headless / G4 OS / pedir reauth) → **pular silenciosamente** os passos de Brain e seguir sem Brain (não tentar OAuth em loop).
- **ClickUp** — `mcp__clickup-mcp__*` (criar folder/list/doc/cards).
- **Coleta de briefing** — invocar a skill `lab:briefing-pre-call` (Skill tool): cruza Pipedrive + Brain + WhatsApp/ChatGuru + e-mail.
- **Deck e relatório** — motor de slides 16:9 da skill `lab:apresentacao-html` (Skill tool), paleta **midnight** (navy + dourado). Padrões de pasta/HANDOFF/SESSAO/deploy da `educacional:criar-aula`.
- **OSINT** — `WebSearch`/`WebFetch`.
- **Transcrição** — o padrão é o Eric jogar a transcrição do Plaud já pronta. SE a gravação vier crua (sem transcrição) → Whisper via `OPENAI_API_KEY` do 1P (pipeline da `educacional:criar-aula` §4).

**IDs fixos do ClickUp:** space AI Innovation Labs = `90131750441`; pasta de referência de estrutura = "Modelo" `90133239966`.

**Deploy (opcional, só pra publicar deck/relatório):** processo completo em `docs/DEPLOY.md`. Token = **`Token_Vercel_Produto_Claude_Eric`** (`op read "op://Agentes Eric/Token_Vercel_Produto_Claude_Eric/credential"`, conta `expertintegrado`). O `VERCEL_API_TOKEN` canônico está com **scope morto (403 SAML)** — NÃO usar. Deploy **via API REST** (o CLI trava). Cloudflare: `op read "op://Agentes Eric/CLOUDFLARE_API_TOKEN/credential"`, zona `ericluciano.com.br` = `48ff0f4bd2bf17da3f66e4d739b98e2f`. **Desligar Deployment Protection** após publicar (senão o link dá 401). curl com `--ssl-no-revoke`.

## Mapa do dia (detecção de fase pelos arquivos)

| Momento | Eric joga na pasta | Arquivo-gatilho | Skill produz |
|---|---|---|---|
| **Pré-imersão** | `00_Inputs/1_onboarding/` (form pré-diagnóstico) | onboarding-*.pdf/docx | Dossiê factual + Estrutura de dor/munição + **Deck de abertura** |
| **Manhã P1 — Diagnóstico** | `00_Inputs/2_transcricoes/diagnostico.txt` | `diagnostico.txt` | Lê e mapeia as dores ditas |
| **Manhã P2 — Brainstorm** | `2_transcricoes/brainstorm.txt` + `3_rascunhos/solucoes.md` | **`brainstorm.txt`** | **CORAÇÃO**: cruza rascunho × transcrição × Brain do Eric → **cards de solução no ClickUp** |
| **Tarde — Roadmap** | (Eric trabalha no ClickUp; opcional `roadmap.txt`) | `roadmap.txt` | Cards já criados; incorpora ajustes/soluções novas da tarde |
| **Pós-imersão** | — (comando do Eric) | — | **Relatório visual HTML** (1 slide por solução + diagnóstico) |

## Estrutura da pasta do cliente

```
<Cliente>/
├── 00_Inputs/                         # o Eric joga aqui, ao longo do dia
│   ├── 1_onboarding/                  #   ANTES: onboarding-<cliente>.pdf/docx (form pré-diagnóstico)
│   ├── 2_transcricoes/                #   DURANTE: transcrições do Plaud
│   │   ├── diagnostico.txt            #     Fase 1 (manhã P1)
│   │   ├── brainstorm.txt             #     Fase 2 (manhã P2) ← gatilho dos cards
│   │   └── roadmap.txt                #     Fase 4 (tarde) — opcional
│   ├── 3_rascunhos/                   #   DURANTE: rascunho de soluções do Eric
│   │   └── solucoes.md                #     1 solução por bloco, com um nome. Numerar é OPCIONAL.
│   └── 4_anexos/                      #   prints, planilhas, docs do cliente
├── 00_LEDGER_pesquisa.md              # ledger das ondas de pesquisa (estilo Play55)
├── 01_Dossie_<Cliente>.md             # fonte de verdade FACTUAL (OSINT + ✅ ⚠️ ❓ 🔒)
├── 02_Estrutura_Dor_e_Municao.md      # dores priorizadas + munição + ângulos + objeções
├── 03_Deck_Abertura/
│   ├── apresentacao.html              # deck 16:9 de abertura (padrão), imagens em base64
│   ├── index.html · vercel.json       # só se deploy
│   └── img/                           # logo do cliente, foto do Eric
├── 04_Solucoes/
│   ├── solucoes_estruturadas.md       # soluções consolidadas (numeradas) + detalhe + responsável sugerido
│   └── clickup_log.md                 # ids dos cards criados (idempotência)
├── 05_Relatorio/
│   ├── relatorio.html                 # relatório visual (1 slide por solução + diagnóstico)
│   └── index.html · vercel.json       # só se deploy
├── HANDOFF.md · SESSAO.md
└── CLAUDE.md                          # regras locais (factual fica aqui, não no Brain; folder_id/list_id)
```

Convenção dos inputs: nomes fixos e previsíveis. Múltiplas gravações do mesmo bloco: sufixo `-2`, `-3` ou data (`brainstorm-2026-07-15.txt`).

**Edições LEGADAS (Suno, Play55) são pré-convenção — NÃO seguem esta estrutura** (medido 06/07/2026: Play55 não tem `00_Inputs/`, usa `02_Estrutura_Dor_e_Municao_Lab.md`, `04_Desafios/`, `05_Relatorio_Entrega/`, sem `SESSAO.md`/`CLAUDE.md`/`clickup_log.md`). Consequências operacionais:
- **Retomada de edição legada** ("continua a imersão do Play55"): entrar SEMPRE pelo `HANDOFF.md` + mapear os arquivos por CONTEÚDO; a detecção por arquivo-gatilho classificaria a imersão concluída como "pré-imersão" (sem `00_Inputs/` ela nunca dispara).
- **Detecção de fase considera também os ENTREGÁVEIS**, não só inputs: `05_Relatorio*/relatorio.html` presente → pós-imersão; `04_*/solucoes_estruturadas.md` ou cards na lista → Fase 2 já feita. Só cair em "pré-imersão" se nem input nem entregável existir.
- **Idempotência de cards em edição legada**: `clickup_log.md` pode NÃO existir mesmo com cards criados (Play55: 20 tasks na lista, zero log). Antes de criar card em edição retomada, conferir as tasks EXISTENTES da lista ClickUp (via `clickup_get_list`/tasks), não só o log local. O gate "mostrar o lote pro Eric" continua valendo.
A estrutura padrão vale INTEGRAL pra edições novas (criadas pela FASE 0).

---

## FASE 0 — Setup ("prepara a imersão do [cliente]")

1. **Resolve o nome de exibição + o slug do cliente:**
   - **Nome de exibição** = grafia original do cliente (ex: `Suno`, `Play55`, `Odery`, `Arqplast`). É o `<Cliente>` usado na **pasta local**, na **pasta do ClickUp** e nos nomes de arquivo internos (`01_Dossie_<Cliente>.md` etc.) — a convenção que as edições reais já usam.
   - **Slug** = normalização do nome: minúsculas, sem acentos, espaços/símbolos viram hífen (kebab-case), máx ~40 chars (ex: `Play55` → `play55`; `Grupo São João` → `grupo-sao-joao`). Usado SÓ no **subdomínio/URL de deploy** e em nomes de arquivo de deploy (ex: `play55-lab.ericluciano.com.br`, `play55-relatorio.ericluciano.com.br`).
   - Cria/abre a pasta local padrão (Estrutura acima) sob `<WORKSPACE>/.../Edicoes_Customizadas/<Cliente>/`.
2. **Vincula/cria a pasta do cliente no ClickUp** no space AI Innovation Labs `90131750441`:
   - `clickup_get_workspace_hierarchy` → procurar folder com o nome do cliente dentro do space `90131750441`.
   - **SE existe pasta homônima** → confirmar com o Eric (AskUserQuestion) que é a mesma imersão; reusar `folder_id`.
   - **SENÃO** → antes de criar, `clickup_get_folder(folder_id="90133239966")` (pasta "Modelo") **como leitura informativa**: confirma a convenção de nome da lista (`Timeline de Projeto - <Cliente>`) e o conjunto de status (`backlog` / `a fazer` / `em execução` / `revisão` / `concluído`). **Não** replicar em loop cada lista do Modelo — cria **exatamente uma** lista. Depois: `clickup_create_folder(space_id="90131750441", name="<Cliente>")` + `clickup_create_list_in_folder(folder_id=<novo>, name="Timeline de Projeto - <Cliente>")`.
   - Guarda `folder_id` + `list_id` no `CLAUDE.md`/`SESSAO.md` local. **Validação:** ambos os ids não-vazios; se `create_folder`/`create_list_in_folder` retornar erro → reportar ao Eric e parar (não seguir sem lista).
3. **`recall` no Brain** (se disponível): imersões anteriores, munição reutilizável, princípios de adoção. O Brain acelera o próximo cliente (efeito composto).

## FASE 1 — Pré-imersão

> **Entrada da FASE 1 (parada legítima):** o **comando verbal** ("prepara a imersão do [cliente]") dispara a **FASE 0** (setup — não precisa de arquivo). A FASE 1 então **checa o form de onboarding** em `00_Inputs/1_onboarding/` (`onboarding-*.pdf/docx`). SE existe → seguir do passo 1. SENÃO → **AskUserQuestion** ao Eric: "Não achei o onboarding em `1_onboarding/`. Você já enviou ou é pra aguardar?" — resposta **"aguardar"** → parar após a FASE 0 (pasta local + ClickUp já criados) e retomar quando o arquivo chegar; resposta **"já enviei"** → pedir o caminho/reenvio e então seguir.

1. **Coleta o briefing existente** → `00_Inputs/1_onboarding/`: invoca `lab:briefing-pre-call` (Skill tool) pra puxar deal Pipedrive, chat de onboarding (WhatsApp/ChatGuru), transcrição da call de diagnóstico, contexto do Brain. Salva os insumos em `00_Inputs/1_onboarding/` (subpasta real da árvore; não usar um `00_Inputs/` solto).
2. **Pesquisa OSINT** → `01_Dossie_<Cliente>.md` (roda ANTES do documento de diagnóstico do passo 3, que usa o dossiê). Default **enxuta**, com gate objetivo: **1 busca `WebSearch` por dimensão** — (a) site institucional, (b) Instagram/LinkedIn, (c) notícias recentes — **máx ~4 buscas no total**. PARAR assim que as 3 dimensões estiverem cobertas (ou ao atingir 4 buscas); não abrir nova onda no default. **Profunda** (multi-onda estilo Play55) só se o Eric pedir "modo profundo". Escreve o dossiê com **marcação de confiança** por afirmação; registra fontes/ondas em `00_LEDGER_pesquisa.md`.
3. **Documento de diagnóstico** (ClickUp Doc na pasta do cliente) — roda DEPOIS do dossiê (passo 2). Primeiro **pergunta ao Eric via AskUserQuestion**: "Você já tem o documento de diagnóstico pronto ou quer que eu gere?" — SE **já tem** → usar o dele (Eric aponta o arquivo/cola o conteúdo); não criar. SENÃO → `clickup_create_document(title="Diagnóstico - <Cliente>", content=<gerado do onboarding + dossiê>, parent_id=<folder_id>, parent_type="folder")`.
4. **Destila dor + munição** → `02_Estrutura_Dor_e_Municao.md`: 3 níveis (estratégico/tático/operacional) + ângulos + munição puxada do Brain + objeções + condutor interno + cuidados de contexto.
5. **Gera o deck de abertura** → `03_Deck_Abertura/apresentacao.html`: motor `lab:apresentacao-html`, paleta **midnight**, seguindo `docs/PADRAO-DECK-ABERTURA.md` (14 slides canônicos). **Único slide personalizado: "O que já mapeamos na {Empresa}"** — dores do pré-diagnóstico (3-5 bullets, só dado COLETADO do diagnóstico/onboarding; OSINT nunca entra no deck), inserido **após o Cronograma** e antes da Fase 1. Imagens em **base64**. Resto fiel ao padrão.

## FASE 2 — Diagnóstico → Soluções (o CORAÇÃO)

**Dispara quando chega `2_transcricoes/brainstorm.txt`** (e/ou `3_rascunhos/solucoes.md`).

0. **Gate de procedência** — confirmar cliente + data de CADA arquivo de transcrição/insumo antes de usar (não misturar cliente). SE houver versão Zoom (ruidosa) e Plaud (limpa) do MESMO bloco → cruzar as duas e **confiar na Plaud** pra corrigir nomes/termos.
1. **Lê a transcrição** (diagnóstico + brainstorm). A fala do Eric é identificável — extrai cada solução que ele propôs, com o detalhe falado. Dores = transcrição da manhã.
2. **Lê o rascunho** de soluções (`3_rascunhos/solucoes.md`): 1 solução por bloco, com um nome. SE o Eric numerou e falou o número na gravação → casamento transcrição↔rascunho exato; SENÃO → casar por nome/conteúdo/ordem.
3. **Cruza com o Brain do Eric** (NÃO o dossiê do cliente): pra cada solução, `recall` no Expert Brain + materiais de `Educacional/` → enriquece com a abordagem que o Eric já ensina/implementou, ferramentas, prompts (Playbook §4.4: "soluções que o consultor já implementou"). SE Brain indisponível → enriquecer só com os materiais de aula e a transcrição.
4. **Consolida** em `04_Solucoes/solucoes_estruturadas.md`: cada solução com número, título, dor que resolve, descrição enriquecida, **responsável sugerido** (cruza com os papéis do dossiê — ex: PMO pra documentação), prioridade/quick-win.
5. **Mostra o lote pro Eric ANTES de criar** (AskUserQuestion ou lista no chat). Após OK → **cria os cards** na lista `"Timeline de Projeto - <Cliente>"` (list_id guardado) com `clickup_create_task`:
   - `name="Solução N — Nome"`, `list_id=<list_id>`, `status="a fazer"`, `description=<estruturada>`.
   - **Responsável sugerido vai na DESCRIÇÃO** (não no campo "Responsável" — a lista clonada do Modelo vem com opções de outro projeto).
   - Loga o `id` de cada card em `04_Solucoes/clickup_log.md`. **Idempotência:** antes de criar, checar `clickup_log.md` — não recriar card que já tem id logado.
6. **Data e responsável final ficam pro Eric ao vivo** na Fase 4 (interface ClickUp) — a skill só deixa o card pronto e sugerido.

**Detalhamento profundo dos cards (validado no Play55)** — quando o Eric pede pra detalhar AO MÁXIMO, cada card ganha descrição rica (**Dor → Como resolver → Ferramentas → Processo → Responsável sugerido**) + campo número **"⛳ Prioridade de Implementação"** (1..N) + **Complexidade** (dropdown) + start/due estimados.
- **NÃO existe tool MCP pra listar custom fields** (o `clickup_get_custom_fields` citado em versões antigas não existe). Pegue os IDs dos campos pela API REST do ClickUp: `curl --ssl-no-revoke -s "https://api.clickup.com/api/v2/list/<list_id>/field" -H "Authorization: $CLICKUP_API_KEY"` (se `$CLICKUP_API_KEY` ausente, `op read` do vault "Agentes Eric" — mesmo token que o MCP ClickUp usa).
- Aplique os valores via o parâmetro `custom_fields` (string JSON: `[{"id":"<field_id>","value":<valor>}]`) no `clickup_create_task` ou `clickup_update_task`.

## FASE 4 — Roadmap (tarde)

> **Por que a numeração pula de FASE 2 pra FASE 4** (não há FASE 3 aqui, de propósito): a **Fase 3 do dia — Treinamento pra toda a empresa** (14:00–16:00, ver cronograma em `docs/PADRAO-DECK-ABERTURA.md`) roda AO VIVO e está FORA do escopo da skill (a skill não atua durante o treinamento). A FASE 4 mantém o número da **Fase 4 — Roadmap** do dia, pra alinhar com o cronograma que o cliente vê no deck.

A skill não atua ao vivo aqui — os cards já estão prontos e o Eric trabalha na interface ClickUp (põe responsável + data + aprofunda). SE o Eric jogar `2_transcricoes/roadmap.txt` depois → incorporar ajustes/soluções novas que surgiram à tarde (novos cards seguem o fluxo da Fase 2, com idempotência via `clickup_log.md`).

## FASE 5 — Relatório visual (pós-imersão) — validada no Play55

1. Gera `05_Relatorio/relatorio.html` — HTML 16:9 na paleta do deck, **data-driven**: arrays JS `SOLUCOES` (uma entrada por solução: título coerente, dor, como resolver, ferramentas, processo, responsável, prazo) + `DORES` + `ROADMAP`, renderizados por um renderer pequeno. **Preencher conteúdo = editar o array, não reescrever HTML.**
2. Estrutura: capa → diagnóstico em N frentes → **1 slide por solução** (número na cor da frente, dor, como resolver, ferramentas em chips, processo com setas, chip de responsável/prazo) → roadmap por blocos → mentoria 12 meses → fechamento. **Inclui link clicável pra pasta do projeto no Drive** (capa + fechamento).
3. Título do slide = versão **coerente/reescrita** do título do card (o título cru do ClickUp fica no board; o slide ganha título limpo).
4. Aqui NÃO precisa base64 (é deploy — linka recursos normal). Entregável pro cliente, deployado (ver `docs/DEPLOY.md`; ex: `play55-relatorio.ericluciano.com.br`). Atualiza se vierem soluções da tarde.

## Brain + continuidade (todas as fases)

- `save_note` do que é reutilizável (munição nova, princípio, padrão de solução) — atômico, `kind` correto, domínio canônico, `link` justificado (`why` ≥ 20 chars, preferir `same_mechanism_as`). **Factual do cliente NÃO sobe.**
- `SESSAO.md` ganha entry a cada execução; `HANDOFF.md` com paths/URLs/ids pra retomar em outra máquina.

## Validação final (checklist)

- [ ] Fase detectada corretamente pelos arquivos presentes (não pular etapa nem antecipar).
- [ ] Dossiê: toda afirmação factual com marcação de confiança + fonte no ledger; nenhum dado inventado.
- [ ] Deck: 14 slides padrão + o único slide "O que já mapeamos na {Empresa}" após o Cronograma; imagens em base64; sem anti-patterns HTML.
- [ ] ClickUp: pasta/lista no space `90131750441` (não Clientes); `folder_id`/`list_id` gravados no local; pasta homônima confirmada antes de criar.
- [ ] Cards: lote mostrado ao Eric antes de criar; título "Solução N — Nome"; responsável na descrição; ids logados em `clickup_log.md` (sem duplicata).
- [ ] Solução cruzada com o Brain do Eric (repertório dele), NÃO com o dossiê do cliente.
- [ ] Relatório: data-driven (array + renderer), 1 slide por solução, link do Drive.
- [ ] Brain: só insight/munição reutilizável subiu; factual ficou no dossiê/`CLAUDE.md` local.
- [ ] Deploy (se aplicável): link de produção retorna 200 e Deployment Protection desligada.
- [ ] `SESSAO.md`/`HANDOFF.md` atualizados; acentuação correta em todo texto externo.

## Erros comuns e recovery

- **`clickup_create_folder`/`create_list_in_folder` erro** → reportar ao Eric e parar (não criar cards sem lista). Reautenticar/checar `CLICKUP_API_KEY` se for auth.
- **Pasta homônima já existe no ClickUp** → NÃO criar duplicata; confirmar com o Eric e reusar o `folder_id` existente.
- **Custom field não aplica** → confirmar o `field_id` via `GET /list/<list_id>/field` (a lista clonada pode ter campos de outro projeto); se o campo "Responsável" tiver opções erradas, pôr responsável na descrição.
- **Transcrição parece de outro cliente** → parar; validar cliente + data do arquivo antes de usar (procedência é gate). → Brain `svtytwoivc0f`.
- **Brain pede reauth / indisponível** (headless / G4 OS) → pular os passos de Brain silenciosamente e seguir; não entrar em loop de OAuth.
- **Deploy 401 no link público** → Deployment Protection ligada: `PATCH` do projeto zerando `ssoProtection`/`passwordProtection` (ver `docs/DEPLOY.md`).
- **Deploy falha com 403 SAML** → é o `VERCEL_API_TOKEN` de scope morto; trocar por `Token_Vercel_Produto_Claude_Eric` e repetir 1x.
- **Card duplicado em re-execução** → checar `clickup_log.md` antes de criar (idempotência).

## Reuso de skills

| Precisa de | Reusa (Skill tool) |
|---|---|
| Coleta de contexto (Pipedrive + WhatsApp + e-mail + Brain) | `lab:briefing-pre-call` |
| Motor de slides 16:9 (deck de abertura E relatório) | `lab:apresentacao-html` |
| Padrões de pasta / HANDOFF / SESSAO / deploy / save Brain | `educacional:criar-aula` |

## Como invocar

```
"prepara a imersão do [cliente]"               → Fase 0/1 (dossiê + deck)
"pesquisa o [cliente] pro Lab (modo profundo)" → Fase 1 pesquisa profunda
"processa a transcrição do brainstorm"         → Fase 2 (cards ClickUp)
"monta os cards de solução no ClickUp"         → Fase 2
"gera o relatório da imersão do [cliente]"     → Fase 5
"continua a imersão do [cliente]"              → retoma via HANDOFF/SESSAO
```
