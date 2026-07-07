---
name: prospecta-lead
description: Use quando o usuario quiser processar 1 lead novo de prospeccao (qualquer origem — evento, lista importada, indicacao) — pesquisar o perfil, cadastrar no Pipedrive e rascunhar a abordagem, SEM enviar. TRIGGER (PT-BR) quando pedir "prospecta lead", "prospectar lead", "cadastra novo lead", "cadastrar lead novo", "pipeline de prospeccao a partir de lista", "perfil + cadastro Pipedrive", "pesquisa e cadastra esse contato", ou quando for invocada em paralelo por um orquestrador pra processar uma lista de leads (1 chamada = 1 lead). NAO usar pra enviar mensagem em batch (isso e whatsapp-campanha-api-fup ou whatsapp-campanha-central-prospeccao), nem pra reabordar lead ja existente com historico (isso e reabordagem/transferir-lead).
allowed-tools: Read, Bash, WebSearch, WebFetch, Task, mcp__pipedrive__search_persons, mcp__pipedrive__search_deals, mcp__pipedrive__get_deal, mcp__pipedrive__get_person, mcp__pipedrive__create_person, mcp__pipedrive__update_person, mcp__pipedrive__create_deal, mcp__pipedrive__update_deal, mcp__pipedrive__update_deal_fields, mcp__pipedrive__create_activity, mcp__pipedrive__create_note, mcp__pipedrive__pipedrive_write, mcp__pipedrive__sync_all, mcp__whatsapp-agent__get_voice_guide, mcp__whatsapp-agent__check_message, mcp__expert-brain__recall
---

# Prospecta Lead — pesquisa + cadastro Pipedrive (v3.1 — padrao Sonnet-executavel, 03/07/2026)

Skill atomica: processa UM lead por vez. Pesquisa o perfil publico, cadastra pessoa + deal no pipeline Prospeccao (ID 7) do Pipedrive, preenche os campos de pre-qualificacao, rascunha a 1a mensagem WhatsApp na voz do Eric e agenda a atividade — SEM ENVIAR NADA. Pra processar uma lista (ex: 30 empresarios), um orquestrador invoca esta skill em paralelo em waves de 5 (ver EXECUCAO PARALELA). Envio de mensagem = skill separada com aprovacao explicita do Eric.

## NUNCA

- **NUNCA enviar mensagem** (WhatsApp, email, qualquer canal). Esta skill APENAS rascunha e grava na atividade/nota.
- **NUNCA sobrescrever campo Pipedrive ja preenchido** (`force` sempre `false`; excecao unica: pedido explicito do Eric).
- **NUNCA afirmar identidade so pelo nome** — exigir 1-de-2 sinais da REGRA ZERO. Regiao/DDD NAO conta como sinal.
- **NUNCA escrever hipotese em campo canonico do CRM** ("provavel...", "deve ser..."). Campo de CRM e fato. Sem confirmacao → campo vazio + nota.
- **NUNCA passar `due_time: ""` nem `"00:00"`** em atividade — Pipedrive marca como vencida. Sem horario definido → OMITIR o campo.
- **NUNCA criar deal duplicado** quando ja existe deal aberto pra mesma origem, ou deal aberto em OUTRO pipeline (Super SDR 2, SaaS 1) — usar o existente.
- **NUNCA preencher campos de discovery/SPICED na 1a prospeccao** (lista completa na secao "NAO preencher").
- **NUNCA na mensagem**: `tu/teu/tua/teus/tuas/ti`, em-dash `—`, saudacao generica (`Olá`, `Prezado(a)`, `Cordialmente`, `Atenciosamente`), hype (`revolucionário`, `transformador`, `disruptivo`, `game-changer`, `mindset`), urgencia manufaturada (`última chance`, `só hoje`, `corre que`, `aproveita já`), validacao afetiva (`te entendo`, `imagino como vc tá`, `fica tranquilo q vamos`), emojis, `mano` (proibido em lead frio).
- **NUNCA scraping autenticado** — pesquisa LinkedIn/web e SO publica, sem login.

## SEMPRE

- 1 execucao = 1 lead. Lista → orquestrador chama N vezes.
- `search_persons` + `search_deals` ANTES de criar qualquer coisa (Passo 1). Default real: ~95% dos leads G4Tools JA existem no Pipedrive (integracao G4 sincroniza). Criacao e a EXCECAO, nao a regra.
- `mcp__whatsapp-agent__get_voice_guide()` ANTES de rascunhar mensagem; `mcp__whatsapp-agent__check_message(content)` DEPOIS.
- Origem + Detalhe da origem preenchidos: na PESSOA (so se nova — 1x na vida) E no DEAL (todo deal).
- Telefone formato `55XXXXXXXXXXX` (sem `+`, sem espacos).
- Titulo do deal: `{nome} | {empresa}` (so `{nome}` se sem empresa).
- Datas/horarios em horario de Brasilia (America/Sao_Paulo). `due_date` formato `AAAA-MM-DD`, `due_time` formato `HH:MM` 24h.
- Data/hora atual vem do RELOGIO (Passo 0, `Bash date`) — NUNCA estimada/inventada pelo modelo. Sem Bash na sessao → OMITIR `due_time` e retornar `"tempo_execucao_s": null`.
- Nome de campo e valor de enum EXATOS (acentos, emoji ❌, maiusculas) — o MCP resolve por match exato de string; grafia errada = erro `Campo "X" não existe` ou `valor inválido`.
- Acentuacao correta do portugues em TODO texto que entra no Pipedrive (subject de atividade, nota, campos de texto) e na mensagem rascunhada.
- Retornar o JSON de resultado do Passo 10, incluindo o bloco `identidade`.
- Em duvida sobre cadastrar duplicado: NAO cadastrar. Reportar.

## Pre-requisitos

- **MCPs**: `pipedrive` (local stdio), `whatsapp-agent` (v2.8+, tools `get_voice_guide`/`check_message`), `expert-brain`. Tools nativas `WebSearch`/`WebFetch`.
- **Capability detection** (nao assumir o ambiente):
  - SE `mcp__whatsapp-agent__get_voice_guide` nao existe na sessao → aplicar manualmente a tabela "Regras hard do Voice Guide" abaixo e incluir `"voice_guide_validado": false` no output.
  - SE `mcp__expert-brain__recall` nao existe → pular o item (d) do Passo 2.
  - SE `WebSearch` nao existe → pular Passo 2, classificar identidade como `nao-confirmada`, preencher SO com dados do input.
  - SE `Bash` nao existe → pular Passo 0; no Passo 8 OMITIR `due_time`; no Passo 10 retornar `"tempo_execucao_s": null`.
- **Diretriz de Preenchimento do CRM** (fonte canonica campo-a-campo; a tabela de campos desta skill e o resumo operacional dela):
  - **Resolver o WORKSPACE_DIR primeiro** (Bash, 1x): `echo "${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}"` — guardar o caminho resolvido.
  - Path da Diretriz: `<WORKSPACE_DIR resolvido>/Processo Comercial/Campanha de retomada de leads/Diretriz_Preenchimento_CRM.md`
  - No PC do Eric o resolvido costuma ser: `C:\Users\Eric Luciano\OneDrive\Workspace\Processo Comercial\Campanha de retomada de leads\Diretriz_Preenchimento_CRM.md`
  - SE o diretorio resolvido NAO existe (headless/VPS, ou `Bash` indisponivel pra resolver) → NAO tentar outro caminho: usar SO fontes web (Passo 2) + as tabelas de campos embutidas nesta skill (que espelham a Diretriz), e registrar em `atencao_manual`: `"Diretriz_Preenchimento_CRM.md nao acessivel — segui tabelas embutidas"`.

## INPUT (1 lead)

Obrigatorio:
- `nome` — nome completo
- `telefone` — formato BR com DDD

Opcional (acelera pesquisa):
- `empresa` — nome da empresa
- `cargo` — cargo
- `email` — email
- `faturamento` — faixa do CSV (campo pausado no CRM — NAO gravar; so contexto)
- `total_colaboradores` — faixa do CSV (mapear pro enum)
- `origem_oportunidade` — opcao canonica de Origem (default: `PUBLI | G4 Tools`)
- `detalhes_origem` — texto livre (ex: `Jantar G4 04/05/2026`)
- `sdr_responsavel_user_id` — default: `17987703` (Eric Luciano). Regra: usar o default SEMPRE que o input nao trouxer outro valor explicito — inclusive em wave de lista/evento. A skill NUNCA escolhe outro user nem distribui leads entre users por conta propria; distribuicao e decisao do orquestrador/Eric, que passa o user_id no input de cada lead.

## CONSTANTES DA OPERACAO (verificadas 02/07/2026 contra `C:/MCPs/expert-mcps/mcps/pipedrive/config.js`)

### Pipeline Prospeccao
- **Pipeline ID:** `7` (nome: "Prospeccao")
- **Stage inicial do cadastro:** `64` (Lead Mapeado)
- **Stage destino apos cadastro:** `65` (Tentando contato) — porque o agente preparou a 1a abordagem (mensagem rascunhada + atividade WhatsApp agendada). O ENVIO em si NAO acontece nesta skill.
- Outros stages do pipeline 7: `66` Conexao iniciada/Em qualificacao, `68` Pre-Qualificado, `116` Qualificado, `79` Reuniao agendada

### Users (lista canonica do config.js)
- Eric Luciano: `17987703` (default de `sdr_responsavel_user_id`)
- Niverton Menezes: `23506911`
- Expert Integrado (automacao): `22805147`
- Asafe Silva: `23962061`
- João Pedro: `24813843`

Uso da lista: traduzir ID→nome no output e validar o `sdr_responsavel_user_id` recebido. NAO e menu de escolha — sem input explicito, o responsavel e sempre Eric (`17987703`).

### Campos do DEAL a preencher (pre-qualificacao + origem)

Passar pra `update_deal_fields` no parametro `custom_fields` como **STRING JSON** (ex: `"{\"Segmento\": \"Jurídico\"}"`), usando o NOME EXATO do campo (com acentos — o MCP resolve a key por match exato):

| Campo (nome EXATO) | Tipo | Como preencher |
|---|---|---|
| `Origem da Oportunidade` | enum | Default: `PUBLI \| G4 Tools` (ou outra opcao canonica do input). Lista completa: CLAUDE.md na raiz do repo deste plugin (`expertintegrado/skills`), secao "2. ORIGENS VALIDAS" — no PC do Eric tambem em `C:/MCPs/expert-mcps/CLAUDE.md` secao 2 |
| `Detalhes da origem da oportunidade` | text | Texto livre. Ex: `Jantar G4 04/05/2026` ou `Diagnóstico Traction 099` |
| `Informações gerais` | text long | Resumo da empresa do WebSearch/WebFetch: modelo de negocio, localizacao, particularidades |
| `Mídias e redes da empresa` | text long | Links coletados: `IG: @x \| Site: y.com.br \| LinkedIn: linkedin.com/company/z` |
| `Segmento` | enum | Opcao EXATA da lista abaixo, escolhida pelo procedimento "Mapeamento Segmento" (apos a lista). NUNCA adivinhar entre 2 opcoes |
| `Nicho (detalhes adicionais)` | text autocomplete | Detalhamento livre do nicho. Ex: `Clínica de Ortodontia, franquia 4 unidades` |
| `Produtos que oferece` | text | O que a empresa vende. Ex: `Implantes, ortodontia, lentes` |
| `Total de colaboradores` | enum | Faixa EXATA da lista abaixo, ou `❌ INFORMAÇÃO PENDENTE` |
| `Tamanho da equipe comercial` | double (numero) | SO preencher se a pesquisa publica revelou. Caso contrario, deixar vazio |
| `Nº atendimentos por mês` | enum | `❌ INFORMAÇÃO PENDENTE` — so usar opcao numerica se sabe via pesquisa |
| `Pessoa que indicou` | text autocomplete | Vazio (prospeccao fria nao tem indicador). So preencher se origem for INDIC |

**ATENCAO ENUM:** o valor `❌ INFORMAÇÃO PENDENTE` exige o emoji ❌ + acentos exatos. Sem isso o Pipedrive/MCP rejeita.

**Opcoes EXATAS do enum `Segmento`** (26 opcoes, do config.js):
`Academia e empresas de esporte`, `Agências em geral`, `Agência de Marketing`, `Arte e Cultura`, `Call Center`, `Clínica Estética`, `Clínica Médica`, `Contabilidade`, `Consultoria`, `Educação`, `Ecommerce`, `Energia`, `Entretenimento`, `Eventos`, `Imóveis e Construção`, `Indústria`, `Infoprodutos e Mentorias`, `Jurídico`, `Seguros`, `Serviços Financeiros`, `Serviços Gerais`, `Tecnologia e TI`, `Turismo e Viagens`, `Varejo`, `Vendas`, `Outros (descrever)`

**Mapeamento Segmento (procedimento deterministico — regra canonica da Diretriz 1.3: "selecionar a opcao mais proxima"):**

1. Identificar a atividade PRIMARIA da empresa (o que ela vende), vinda do input ou de fonte confirmada pela REGRA ZERO.
2. SE a atividade aparece literalmente numa opcao do enum (comparar sem caixa/acento; ex: "contabilidade", "consultoria", "seguros", "energia") → usar essa opcao.
3. SENAO usar a tabela de equivalencias:

| Atividade da empresa | Opcao EXATA do enum |
|---|---|
| Odontologia / dentista / ortodontia | `Clínica Médica` (exemplo LITERAL da Diretriz 1.3) |
| Hospital / laboratorio / clinica de saude nao-estetica (fisioterapia, psicologia, nutricao) | `Clínica Médica` |
| Clinica de estetica / harmonizacao / dermato-estetica | `Clínica Estética` |
| Advocacia / escritorio de advogados | `Jurídico` |
| Software / SaaS / desenvolvimento / automacao | `Tecnologia e TI` |
| Escola / faculdade / curso presencial | `Educação` |
| Curso online / mentoria / infoproduto | `Infoprodutos e Mentorias` |
| Agencia de marketing / publicidade / trafego | `Agência de Marketing` |
| Outras agencias (recrutamento, modelos, intercambio) | `Agências em geral` |
| Banco / fintech / credito / investimentos | `Serviços Financeiros` |
| Corretora de seguros | `Seguros` |
| Construtora / incorporadora / imobiliaria | `Imóveis e Construção` |
| Fabrica / manufatura | `Indústria` |
| Loja fisica / comercio | `Varejo` |
| Loja online | `Ecommerce` |
| Academia / crossfit / estudio fitness | `Academia e empresas de esporte` |

4. SE nenhuma linha bate → `Outros (descrever)` + detalhar a atividade real em `Nicho (detalhes adicionais)`.
5. Desempate: SE 2+ opcoes descrevem a empresa, usar a atividade que a PROPRIA empresa declara primeiro (headline do site/bio confirmados). SE nao determinavel → `Outros (descrever)`.

### Regra de fonte (quanto de pesquisa BASTA — criterio unico, sem "avaliar")

- Um dado so entra em campo do CRM se consta EXPLICITAMENTE em 1+ fonte identificavel: o input do lead OU uma URL do Passo 2 (snippet do WebSearch conta como fonte do dado que aparece nele, desde que a URL passe na REGRA ZERO/criterio do Passo 2c).
- 1 fonte ja basta pra preencher. 0 fontes → campo texto fica VAZIO; enum fica `❌ INFORMAÇÃO PENDENTE` (quando a opcao existe) ou vazio.
- Volume de resultados NAO muda a confianca: `confianca` (alta/media/nao-confirmada) e definida EXCLUSIVAMENTE pelos sinais A/B da REGRA ZERO — nunca por "quantos resultados apareceram".
- Prefixo `(a confirmar)` (confianca media) aplica SO a campos de TEXTO (`Informações gerais`, `Nicho (detalhes adicionais)`, `Produtos que oferece`). Enum NAO aceita prefixo: em confianca media, preencher o enum normalmente SE ha fonte explicita; em `nao-confirmada`, NAO preencher NADA vindo da pesquisa.
- `Mídias e redes da empresa`: listar SO links que passaram no criterio de site/perfil oficial do Passo 2c. Nenhum link validado → campo vazio.
- `Total de colaboradores`: preencher faixa SO se `total_colaboradores` veio no input OU uma fonte declara numero/faixa de funcionarios. Senao → `❌ INFORMAÇÃO PENDENTE`.
- `porte_estimado` (JSON interno do Passo 2): so registrar se derivado de fonte explicita (nº de unidades/funcionarios declarado); senao `"sem dado"`.

**Opcoes EXATAS do enum `Total de colaboradores`**:
`1 a 5`, `6 a 10`, `11 a 20`, `20 a 50`, `51 a 100`, `101 a 200`, `201 a 500`, `501 a 1000`, `Acima de 1.000`, `❌ INFORMAÇÃO PENDENTE`

**Opcoes EXATAS do enum `Nº atendimentos por mês`**:
`Até 100`, `101 a 200`, `201 a 500`, `501 a 1.000`, `1.001 a 2.000`, `2.001 a 3.000`, `3.001 a 4.000`, `4.001 a 5.000`, `5.001 a 7.500`, `7.501 a 10.000`, `10.001 a 15.000`, `15.001 a 20.000`, `Acima de 20.000`, `❌ INFORMAÇÃO PENDENTE`

**NAO preencher** (campos pausados/excluidos pela Diretriz): Briefing Prospeccao, Resumo Prospeccao, Canal de Comunicacao, Insights tecnicos / Insights de Vendas, Faturamento mensal (vai ser excluido), Tempo de mercado (vai ser excluido), Nicho (antigo, legado), UTM (preenchido por automacao).

**NAO preencher na 1a prospeccao** (discovery — preenchidos durante/apos reuniao): Dores, Objetivos com a automacao, Oportunidades de melhoria, SPICED-* (Situational, Pain, Impact, Critical Event, Decision), Como funcionam os processos da empresa, Tipo de venda, Funis de vendas utilizados, Canais de atendimento atuais, Tamanho acumulado da lista de leads, Detalhes sobre volume de Leads e Clientes, Estrutura de colaboradores, Automacoes que utiliza atualmente, Ferramenta de WhatsApp atual, CRM atual, Outras ferramentas, Dominio de IA na empresa / Solucoes de IA que utiliza hoje, Nivel de prioridade da contratacao, Forma de Pagamento, Especificacoes do projeto e demais campos de negociacao.

### Campos da PESSOA (entidade Person)

Passar pra `update_person` no parametro `custom_fields` como STRING JSON, nomes EXATOS:

| Campo (nome EXATO) | Tipo | Como preencher |
|---|---|---|
| `Cargo` | text | Direto do CSV ou WebSearch (Sócio/Fundador/CEO/Diretor) |
| `Nível de decisão` | enum | Mapeamento MECANICO pela string do cargo (regra abaixo da tabela). Valores literais EXATOS com acento |
| `Origem do Contato` | enum | Mesma opcao de Origem da Oportunidade. SO se pessoa NOVA — preenchida 1x na vida, NUNCA alterar se ja existir |
| `Detalhes da origem do contato` | text | Mesmo de Detalhes da origem (so pessoa nova) |

**Regra do `Nível de decisão` (mapeamento mecanico por CARGO — NAO exige confirmar poder de decisao real):**

- Fonte do cargo, em ordem: (1) `cargo` do input; (2) cargo achado na pesquisa, SO se confianca alta/media. Divergencia entre os dois → usar o do input e registrar em `identidade.discrepancias`.
- Mapear pela string do cargo (match sem caixa/acento):
  - Contem `sócio(a)`, `fundador(a)`, `founder`, `co-founder`, `proprietário(a)`, `dono(a)` → `Sócio decisor` (inclusive cargo so `Sócio`, sem "fundador"; e prevalece sobre CEO se o cargo tiver os dois, ex: "CEO e sócio").
  - Contem `CEO` ou `Presidente` (sem termo de socio junto) → `Único decisor`.
  - Contem `diretor(a)`, `gerente`, `coordenador(a)`, `head`, `supervisor(a)` → `Não é decisor`.
- O enum e um PROXY deliberado da operacao: quem decide DE FATO se confirma na discovery (por isso Diretor/Gerente entra como `Não é decisor` ate confirmar). NAO tentar verificar poder de decisao na pesquisa publica; NAO escrever `(a confirmar)` (enum nao aceita prefixo — o prefixo da REGRA ZERO vale so pra campos de texto).
- Cargo ausente OU fora das strings acima (ex: `Consultor`, `Analista`, `Advogado`) → deixar o campo VAZIO + registrar em `atencao_manual`.

## REGRA ZERO — VERIFICACAO DE IDENTIDADE (1-de-2 OBRIGATORIO)

**Apenas o NOME nunca basta.** Antes de afirmar que `<perfil pesquisado>` = `<lead do input>`, exigir UM destes dois sinais batendo:

| Sinal | Como verificar |
|---|---|
| **A. Nome + empresa** | Resultado do WebSearch tem o nome do lead COM o nome da empresa do input (ou empresa fortemente similar) |
| **B. Nome + email-do-dominio** | Dominio do email (ex: `@empresa.com.br`) bate com o dominio do site oficial VALIDADO pelo criterio do Passo 2c (nao qualquer site que apareceu no Google) |

Regiao/DDD NAO conta — sinal fraco e enganoso.

### Arvore de decisao da confianca

- SE **A E B** batem → confianca `alta` → preencher campos da empresa normalmente.
- SE **apenas A OU apenas B** bate → confianca `media` → preencher, mas com prefixo `(a confirmar)` nos campos especulativos.
- SE **nenhum** bate (so o nome) → `nao-confirmada` → NAO escrever NADA da pesquisa publica nos campos. So usar dados do CSV/input. Adicionar nota explicita "WebSearch não localizou perfil único — campos da empresa não preenchidos por falta de fonte confiável" + incluir em `atencao_manual`.

### Anti-pattern (o que NAO fazer)

- Pegar primeiro resultado do Google que tem o nome e assumir que e a pessoa.
- Inferir empresa pelo sobrenome do email sem cruzar com nome da empresa.
- Aceitar pessoa do `search_persons` quando retorna >1 sem cruzar email/telefone.
- Em casos ambiguos, escrever "provavel..." nos campos canonicos — campo do CRM e fato, nao hipotese.

### `search_persons` com multiplos resultados

SE `mcp__pipedrive__search_persons(term=nome)` retornar mais de 1 pessoa:
1. SE input tem email → escolher a que tem o mesmo email.
2. SENAO SE input tem telefone → escolher a que tem o mesmo telefone.
3. SENAO → marcar AMBIGUIDADE, usar a primeira com confianca BAIXA e incluir em `atencao_manual`.
4. NUNCA escolher por similaridade so de nome quando ha multiplas opcoes.

## Voice Guide do Eric — regras hard (resumo; fonte canonica via `get_voice_guide`)

O guia completo mora em `~/.claude/voice-guide.md` (fonte canonica; o antigo `claude-sync/memory/eric-voice.md` era seed legado e NAO existe mais) e e retornado integralmente por `mcp__whatsapp-agent__get_voice_guide()`. Regras hard (checadas por regex no `check_message`):

| Regra | O que NAO fazer | Severidade |
|---|---|---|
| `tu-pronome` | NUNCA usar `tu/teu/tua/teus/tuas/ti` — sempre `vc/vcs` | high |
| `em-dash` | NUNCA usar `—` — substituir por virgula, dois-pontos, parenteses ou `..` | high |
| `saudacao-generica` | Proibido `Olá`, `Prezado(a)`, `Cordialmente`, `Atenciosamente` | high |
| `hype` | Proibido `revolucionário`, `transformador`, `disruptivo`, `game-changer`, `mindset` | high |
| `urgencia-manufaturada` | Proibido `última chance`, `só hoje`, `corre que`, `aproveita já` | high |
| `validacao-afetiva` | Proibido `te entendo`, `imagino como vc tá`, `fica tranquilo q vamos` | high |
| `softener-equipe` | Evitar `quando puder, por favor`, `se for possível`, `com todo respeito` | medium |
| `rsrs` | Evitar `rsrs/rsrsrs` (Eric usa `kkk` ou nada) | medium |

Padroes positivos (do corpus): `a gente` (bigrama #1, 2.297x), `acho que` (871x — opiniao como opiniao), `vc` (6:1 vs `você`), `cara` (740x), `fala` (748x). Tom direto, sem hype, sem floreio; empoderamento (`você consegue`) > venda (`isso revoluciona tudo`); vocativo-aberto, frase curta, opiniao explicita. Em vendas-lead frio: `mano` PROIBIDO (em equipe/cliente proximo e permitido).

## PASSOS (sequencial, 1 execucao = 1 lead)

### Passo 0 — Capturar relogio (Bash, 1x no inicio)

```bash
TZ='BRT3' date "+DATA_HOJE=%Y-%m-%d HORA_AGORA=%H:%M EPOCH_INICIO=%s"
TZ='BRT3' date -d "+30 minutes" "+HORA_MAIS_30=%H:%M"
```

Guardar os 4 valores — sao a UNICA fonte de data/hora da execucao (`due_date`, `due_time`, `tempo_execucao_s`). SE `date -d` falhar (date BSD) → seguir sem `HORA_MAIS_30` e OMITIR `due_time` no Passo 8. SE Bash indisponivel → ver capability detection (Pre-requisitos).

### Passo 1 — Verificar duplicata de PESSOA e DEAL

**Ordem obrigatoria: 1.1 (resolver a pessoa) e PRE-CONDICAO de 1.3 (filtrar deals por contato).** So execute 1.3 depois de ter o `person_id` resolvido em 1.1 — a filtragem "deal cujo `contato` e a pessoa do lead" so e determinavel com a pessoa ja resolvida/desambiguada.

1. `mcp__pipedrive__search_persons(term="{nome}")` — e, se input tem telefone, tambem `search_persons(term="{telefone}")`. O resultado JA traz `emails`, `telefones` e `empresa` de cada pessoa — a desambiguacao da REGRA ZERO usa esses campos do proprio search (NAO precisa de `get_person` pra desambiguar). Resolver aqui o `person_id` do lead (ou ausencia dele) ANTES de seguir pro passo 3.
2. `mcp__pipedrive__search_deals(term="{nome}")` — e, se input tem empresa, tambem `search_deals(term="{empresa}")`. O resultado traz SO `id, titulo, valor, status, etapa, pipeline, contato, empresa` — NAO traz campos personalizados.
3. So execute depois de ter o `person_id` de 1.1. Pra CADA deal retornado com `status = "open"` cujo `contato` e a pessoa do lead: `mcp__pipedrive__get_deal(deal_id={id})` — retorna os campos personalizados TRADUZIDOS por nome. Ler `Origem da Oportunidade`.
   - **Definicao de "mesma origem"**: valor de `Origem da Oportunidade` do deal == `origem_oportunidade` do input (comparacao de string exata; default do input: `PUBLI | G4 Tools`). Campo vazio no deal → NAO e mesma origem.
4. Decidir (primeira condicao que bater vence):
   - SE ha deal ABERTO em OUTRO pipeline (`pipeline` != `Prospeccao`; ex: Super SDR, SaaS) → usar esse deal, NAO criar nada. Pular Passos 3 e 4. Executar so: Passo 5 (completar campos VAZIOS do deal), Passos 7-10 (mensagem, atividade, nota, retorno).
   - SENAO SE ha deal ABERTO no pipeline Prospeccao com MESMA origem → idem: usar o deal, pular Passos 3 e 4, executar Passo 5 e Passos 7-10.
   - SENAO SE ha deal ABERTO no pipeline Prospeccao com origem DIFERENTE (ou vazia) → NAO criar deal novo (o guardrail do `create_deal` bloquearia — ver Passo 4.3): usar o deal existente como nos casos acima E registrar em `atencao_manual`: `"deal aberto {id} tem origem '{valor}' != origem do input"`.
   - SENAO SE pessoa existe SEM deal aberto → usar `person_id` existente, pular Passo 3 (criacao), ir pro Passo 4.
   - SENAO (pessoa NAO existe) → seguir Passo 2 e fluxo completo.
   - SE >1 pessoa retornada no search → aplicar arvore de desambiguacao da REGRA ZERO (com `emails`/`telefones` do proprio search) ANTES de avaliar os deals.
5. SE os searches retornaram 3+ deals com `status = "lost"` da mesma pessoa → adicionar em `atencao_manual`: `"3+ deals perdidos — ver motivo antes de abordar"`.

### Passo 2 — Pesquisa publica

a. `WebSearch("{nome} {empresa} LinkedIn")` (sem empresa no input: `WebSearch("{nome} LinkedIn")`) — extrair: cargo, empresa, segmento, descricao publica.
b. SE apareceu URL de LinkedIn → `WebFetch(url)` pra bio publica completa. SE falhar (LinkedIn bloqueia) → seguir so com o snippet do Google.
c. **Site oficial da empresa — criterio verificavel** (vale tambem pro sinal B da REGRA ZERO):
   - Candidato: URL do WebSearch cujo DOMINIO contem o nome da empresa normalizado (minusculas, sem acentos/espacos/pontuacao — ex: "Andrade Odontologia" → dominio contem `andradeodontologia`), OU cujo snippet associa explicitamente o site a empresa do input.
   - Confirmar com `WebFetch(site)`: a pagina deve conter o nome da empresa (match normalizado). Pegar "Quem somos", "O que fazemos".
   - SE o WebFetch falhar → aceitar como oficial SO se o dominio contem o nome normalizado COMPLETO; senao descartar.
   - SE a pagina revela homonimo incompativel (cidade/atividade que contradiz input ou pesquisa) → DESCARTAR o site: nao usar em `Mídias e redes` nem como sinal B, registrar em `atencao_manual`.
   - **Desempate (2+ dominios passam no criterio):** preferir o dominio que contem o nome MAIS COMPLETO da empresa (mais tokens do nome normalizado no dominio). SE persiste empatado → preferir `.com.br` sobre `.com`. SE ainda empatado → NAO escolher no chute: deixar o campo `site` (e `Mídias e redes`) sem esse link e marcar `❌ INFORMAÇÃO PENDENTE` no campo `site` do JSON do Passo 2, registrando a ambiguidade em `atencao_manual`.
d. `mcp__expert-brain__recall("dor segmento {X}")` — pattern de dor SO pra inspirar a mensagem. NAO gravar no campo "Dores" do Pipedrive. SE o segmento nao foi determinado (input sem segmento E pesquisa sem fonte) → PULAR este item (nao ha `{X}` pra preencher) e deixar `dor_inferida` vazio.
e. Aplicar a REGRA ZERO e classificar `confianca` (alta/media/nao-confirmada).

Coletar:
```json
{
  "linkedin_url": "...",
  "site_empresa": "...",
  "instagram_url": "...",
  "cargo_inferido": "...",
  "empresa_segmento": "...",
  "empresa_nicho": "...",
  "empresa_produtos": "...",
  "empresa_resumo": "...",
  "porte_estimado": "...",
  "dor_inferida": "...",
  "confianca": "alta|media|nao-confirmada"
}
```
(`empresa_segmento` ja mapeado pelo procedimento "Mapeamento Segmento"; `empresa_resumo` em 2-3 frases; cada valor coletado precisa de fonte explicita — ver "Regra de fonte" nas CONSTANTES: 1 fonte basta, 0 fontes = vazio/pendente.)

### Passo 3 — Cadastrar Pessoa (so se Passo 1 nao achou)

1. `mcp__pipedrive__create_person(name="{nome}", phone="55XXXXXXXXXXX", email="{email}")` — telefone sem `+` nem espacos. Capturar `person_id` da resposta. OMITIR `org_id` SEMPRE: resolucao/vinculo de organizacao esta FORA do escopo desta skill (cadastrar pessoa sem `org_id`, mesmo quando a empresa e conhecida).
   - SE o MCP retornar aviso de duplicata (ele busca por telefone/email automaticamente) → usar o `person_id` apontado, NAO criar.
2. `mcp__pipedrive__update_person(person_id={person_id}, custom_fields="{JSON}")` — Origem do Contato e OBRIGATORIA ao criar pessoa (checklist Pipedrive Passo 3). JSON com:
   - `Cargo` (do CSV ou pesquisa)
   - `Nível de decisão` (`Sócio decisor` / `Único decisor` / `Não é decisor` — literais exatos)
   - `Origem do Contato` (mesma opcao de Origem da Oportunidade)
   - `Detalhes da origem do contato`

SE a pessoa JA existia — como verificar o que esta vazio (importante: o `update_person` NAO bloqueia sobrescrita de campo personalizado; a protecao e responsabilidade do agente):

1. `mcp__pipedrive__get_person(person_id={person_id})` — atencao: campos personalizados vem com keys HASH (40 caracteres, nao traduzidas). Criterio verificavel — procurar nos VALORES do JSON os literais conhecidos:
   - Algum valor bate com uma opcao de origem (ex: `PUBLI | G4 Tools`, `EVENTO | ...`, `INDIC | ...`) → `Origem do Contato` JA preenchida.
   - Algum valor e um literal de `Nível de decisão` (`Único decisor`/`Sócio decisor`/`Não é decisor`) → campo JA preenchido.
   - Algum valor e uma string de cargo (ex: `CEO`, `Sócio`, `Diretor Comercial`) → `Cargo` JA preenchido.
2. Enviar no `custom_fields` SOMENTE os campos comprovadamente vazios (nenhum valor correspondente achado no JSON). Na duvida (nao da pra afirmar que esta vazio) → NAO enviar o campo e registrar em `campos_ja_preenchidos_sem_overwrite`.
3. `Origem do Contato`/`Detalhes da origem do contato`: NUNCA reenviar se ja tem valor (preenchidos 1x na vida).

### Passo 4 — Criar Deal em "Lead Mapeado"

1. `mcp__pipedrive__create_deal(title="{nome} | {empresa}", person_id={person_id}, pipeline_id=7, stage_id=64, user_id={sdr_responsavel_user_id})` — sem empresa: `title="{nome}"`. Deixar `force=false` (default): a tool ja verifica deals abertos.
2. Capturar `deal_id` da resposta.
3. SE a resposta acusar deal aberto existente → voltar a decisao do Passo 1 (usar o existente, nao forcar).

### Passo 5 — Preencher campos personalizados do deal

1. `mcp__pipedrive__update_deal_fields(deal_id={deal_id}, custom_fields="{JSON}")` com TODOS os campos da tabela "Campos do DEAL" que a pesquisa preencheu: Origem da Oportunidade, Detalhes da origem da oportunidade, Informações gerais, Mídias e redes da empresa, Segmento, Nicho (detalhes adicionais), Produtos que oferece, Total de colaboradores, Tamanho da equipe comercial (so se souber), Nº atendimentos por mês (`❌ INFORMAÇÃO PENDENTE` se nao sabe).
2. `force=false` (default). SE a tool retornar conflitos (campo ja tinha valor) → NAO forcar; registrar os campos em `campos_ja_preenchidos_sem_overwrite` pro output.
3. SE retornar `Campo "X" não existe` ou `valor inválido` → conferir grafia EXATA (acentos!) contra as tabelas desta skill; persiste → ver ERROS COMUNS (`sync_all`).

### Passo 6 — Mover deal pra "Tentando contato"

1. `mcp__pipedrive__update_deal(deal_id={deal_id}, stage_id=65)`.
2. Justificativa (nao pular): o agente preparou a 1a abordagem (mensagem rascunhada + atividade agendada). O envio fica pra skill de campanha separada.

### Passo 7 — Rascunhar mensagem WhatsApp (Voice Guide)

**7.1 — Carregar Voice Guide** (1x por sessao, cacheavel): `mcp__whatsapp-agent__get_voice_guide()`. Ler o markdown retornado e usar como referencia ativa. Nao parafrasear o guide — incorporar os patterns reais (lexico, sintaxe, vocativo, tempo verbal).

SE o resultado estourar o limite de tokens (~91K chars — o harness salva o output num arquivo e retorna erro) → NAO re-chamar a tool: ler as secoes `## 0. Motor da voz` + `## TL;DR` do guide canonico `~/.claude/voice-guide.md` (ou do arquivo salvo pelo harness), seguir com a tabela "Regras hard" desta skill e registrar `"voice_guide_via_arquivo": true` no output do Passo 10.

**7.2 — Rascunhar 4 linhas** (estrutura base — adaptar ao contexto, nao copiar literal):

```
Linha 1 — Gancho pessoal: referencia algo especifico que pesquisou (cargo, empresa, post recente, evento). Usar "vc" sempre. Sem "Olá".
Linha 2 — Ponte Expert: como o que a gente faz se conecta com o que ele faz. Sem hype. Tom "a gente tem ajudado..." ou "acho que faz sentido..."
Linha 3 — CTA suave: "se fizer sentido trocar uma ideia, me chama" ou "topa marcar 20min essa semana?"
Linha 4 (opcional) — Contexto evento: "PS: te vi confirmado no [evento]" ou similar
```

Regras criticas: todas as do bloco NUNCA + mensagem curta (4 linhas max, sem paragrafo longo) + acentuacao correta. SE a pessoa ja for cliente → virar reaproximacao (nao 1o contato) e incluir em `atencao_manual`.

**7.3 — Validar**: `mcp__whatsapp-agent__check_message(content="{mensagem}")`.
- SE `ok=true` → prosseguir.
- SE houver violacoes → REESCREVER atendendo as regras quebradas e validar de novo. NAO gravar mensagem com violacao `high`. (Falso positivo e raro; so aceitar com log explicito no output.)

**7.4 — Gravar** (Passos 8 e 9) apenas apos validacao positiva ou log explicito de falso positivo aceito.

### Passo 8 — Criar atividade no Pipedrive

`mcp__pipedrive__create_activity` com:
- `subject`: `Mensagem de prospecção`
- `type`: `whatsapp`
- `deal_id`: o capturado
- `user_id`: `{sdr_responsavel_user_id}`
- `due_date`: `{DATA_HOJE}` do Passo 0 (`AAAA-MM-DD`, Brasilia)
- `due_time`: `{HORA_MAIS_30}` do Passo 0 (`HH:MM` 24h Brasilia — hora REAL do relogio, nunca estimada pelo modelo). A regra e SEMPRE relogio-atual + 30min, INCLUSIVE fora do horario comercial (madrugada, fim de semana, feriado): NAO deslocar pro proximo horario comercial nem arredondar — usar o `HORA_MAIS_30` cru do Passo 0. SE o Passo 0 nao rodou ou nao gerou `HORA_MAIS_30` → OMITIR o campo. NUNCA `""` nem `00:00`
- `done`: `false` (booleano — sera concluida quando o envio rolar via skill de campanha separada)
- `note`: dados coletados (perfil + dor) + mensagem rascunhada

### Passo 9 — Adicionar nota no deal

`mcp__pipedrive__create_note(deal_id={deal_id}, content=...)` com o template (acentuacao correta — texto entra no Pipedrive):

```
PROSPECÇÃO {data}

PERFIL PÚBLICO
- Cargo: {cargo}
- Empresa: {empresa} ({segmento})
- LinkedIn: {url}
- Site: {url}
- Resumo: {2-3 frases}

DOR INFERIDA (confiança {nível})
{dor}

ÂNGULO DE ABORDAGEM
{ângulo + por que desse gancho}
```

### Passo 10 — Retornar resultado pro orquestrador

```json
{
  "ok": true,
  "deal_id": 12345,
  "deal_url": "https://expertintegrado.pipedrive.com/deal/12345",
  "person_id": 67890,
  "stage_movido": "Lead Mapeado -> Tentando contato",
  "campos_preenchidos": ["Origem da Oportunidade", "Informações gerais", "Segmento", "..."],
  "campos_ja_preenchidos_sem_overwrite": ["..."],
  "identidade": {
    "confianca": "alta|media|nao-confirmada",
    "sinais_batidos": ["nome+empresa", "nome+email-dominio"],
    "sinal_faltando": "qual",
    "discrepancias": ["nenhuma OU ex: LinkedIn diz CEO mas CSV diz Diretor"]
  },
  "perfil": { "...": "JSON coletado no Passo 2" },
  "mensagem_rascunhada": "...",
  "tempo_execucao_s": 60,
  "atencao_manual": ["se for cliente: ajustar mensagem", "se 3+ deals lost: ver motivo"]
}
```

- `tempo_execucao_s`: inteiro = `EPOCH_FIM - EPOCH_INICIO`, onde `EPOCH_FIM` vem de rodar AGORA `TZ='BRT3' date +%s` (Bash) e `EPOCH_INICIO` vem do Passo 0. SE Bash indisponivel → `null` (nunca estimar).

## EXECUCAO PARALELA (orquestrador chama esta skill)

Esta skill processa 1 lead por execucao. Pra lista (ex: 30 leads), o agente que recebeu a lista atua como orquestrador:
1. Disparar wave de 5 chamadas paralelas, 1 lead por chamada (via `Task`).
2. Aguardar todas concluirem.
3. Disparar proxima wave de 5. Repetir ate esgotar a lista.
4. Consolidar os outputs JSON na planilha unica:

| # | Nome | Empresa | Cargo | Person ID | Deal ID | Stage atual | Campos preenchidos | Mensagem rascunhada | Atencao manual |
|---|---|---|---|---|---|---|---|---|---|

## VALIDACAO FINAL (checklist por lead)

- [ ] Identidade classificada (alta/media/nao-confirmada) e refletida no que foi (ou nao foi) preenchido
- [ ] Nenhuma pessoa nem deal duplicado criado
- [ ] Pessoa nova tem `Origem do Contato` + `Detalhes da origem do contato`; pessoa existente NAO teve origem sobrescrita
- [ ] Deal tem `Origem da Oportunidade` + `Detalhes da origem da oportunidade`
- [ ] Deal no pipeline 7, stage 65 (Tentando contato)
- [ ] Atividade `whatsapp` futura criada (`done: false`), `due_time` valido ou omitido
- [ ] Nota de prospeccao criada no deal (template do Passo 9, com acentos)
- [ ] Mensagem passou `check_message` com `ok=true` (ou falso positivo logado no output)
- [ ] Nenhum campo de discovery/SPICED/pausado preenchido
- [ ] JSON do Passo 10 retornado completo (com bloco `identidade`)
- [ ] Nenhum valor inventado: data/hora do Passo 0 (ou omitido/null); `Segmento` via "Mapeamento Segmento"; `Nível de decisão` via regra mecanica de cargo; cada campo com fonte explicita ("Regra de fonte")

## ERROS COMUNS E RECOVERY

| Sintoma | Recovery |
|---|---|
| Tool retorna `This tool has been disabled in your connector settings.` (hook do Claude Desktop bloqueia `create_*`) | Usar `mcp__pipedrive__pipedrive_write({action, params})` — mesma logica, nome neutro. Actions suportadas: `create_activity`, `create_deal`, `create_person`, `create_organization`, `add_product_to_deal`, `update_deal_fields`, `create_note`. (`update_person`/`update_deal` nao tem prefixo `create_*` e nao sao bloqueadas.) |
| Campo personalizado da erro / key nao resolve | Rodar `mcp__pipedrive__sync_all` UMA vez e repetir a chamada UMA vez. Persiste → registrar em `atencao_manual` e seguir |
| `Campo "X" não existe` | Grafia sem acento/errada — conferir nome EXATO nas tabelas desta skill (ex: `Informações gerais`, `Nível de decisão`) |
| Valor de enum invalido | Conferir literal EXATO (ex: `❌ INFORMAÇÃO PENDENTE` com emoji; `20 a 50`, nao `21 a 50`) |
| `create_activity` retorna `⚠ ATIVIDADE PENDENTE EXISTENTE` (guardrail: o deal ja tem atividade em aberto — comum no caminho de deal reutilizado) | NAO usar `force=true`. A pendente existente ja cumpre a regra "todo deal tem proxima atividade". Garantir a mensagem rascunhada na nota do Passo 9 e registrar a atividade pendente (subject + ID) em `atencao_manual` |
| Pessoa ja existe | NAO recadastrar. Criar deal novo SO se nao houver aberto pra mesma origem |
| Deal aberto ja existe pra mesma origem | NAO duplicar. Adicionar nota + atividade nele |
| Deal aberto em OUTRO pipeline (Super SDR 2, SaaS 1) | Usar o deal existente, nao criar novo no Prospeccao 7 |
| `update_deal_fields` retorna conflitos (campo com valor) | NAO usar `force=true`. Registrar em `campos_ja_preenchidos_sem_overwrite` |
| LinkedIn bloqueia WebFetch | Usar so o snippet do Google |
| Sem empresa identificada | Cadastrar pessoa sem `org_id`. Mensagem usa "sua operação" como fallback |
| Telefone invalido (<10 digitos) | Cadastrar pessoa sem `phone`, registrar em `atencao_manual` |
| Faixa de colaboradores nao bate com o enum | Opcao mais proxima ou `❌ INFORMAÇÃO PENDENTE` |
| `check_message` acusa violacao | Reescrever e revalidar. Nunca gravar com violacao `high` sem log de falso positivo |

## VERSIONAMENTO

- **v3.1** (03/07/2026): eliminadas as 9 ambiguidades do teste de executabilidade Sonnet, SEM mudanca de comportamento: (1) procedimento deterministico "Mapeamento Segmento" com tabela de equivalencias (Odontologia → `Clínica Médica` e exemplo literal da Diretriz 1.3); (2) `Nível de decisão` explicitado como mapeamento MECANICO por string de cargo (proxy da operacao, sem verificacao de poder real; fora da tabela → vazio + atencao_manual); (3) Passo 0 novo captura relogio via Bash `date` (America/Sao_Paulo) — fonte unica de `due_date`/`due_time`/`tempo_execucao_s`, fallback omitir/null; (4) "Regra de fonte" objetiva (1 fonte explicita basta; 0 fontes = vazio/pendente; confianca vem SO dos sinais A/B, nunca de volume; prefixo `(a confirmar)` so em campo texto); (5) Passo 1 explicita que `search_deals` NAO retorna custom fields e exige `get_deal` por deal aberto pra ler `Origem da Oportunidade` + definicao literal de "mesma origem" + caso origem-diferente-no-pipeline-7 (usar existente, registrar); (6) `allowed-tools` ganhou `Bash`, `mcp__pipedrive__get_deal`, `mcp__pipedrive__get_person` (tools que os passos ja exigiam implicitamente); (7) default do SDR explicitado (sempre Eric 17987703 salvo input; skill nunca distribui); (8) criterio verificavel de "site oficial" no Passo 2c (dominio com nome normalizado + confirmacao WebFetch; amarrado ao sinal B); (9) `tempo_execucao_s` medido por epoch do Passo 0. Verificado contra `mcps/pipedrive/index.js` (shapes de search/get) e `Diretriz_Preenchimento_CRM.md`.
- **v3.0** (02/07/2026): reescrita pro padrao Sonnet-executavel (NUNCA/SEMPRE, arvores de decisao, checklist, enums verificados no config.js). Correcoes de fato: `create_deal` no lugar de `create_deal_full(person_id)` (param inexistente); nomes de campo com acento exato; lista real do enum Segmento; faixa `20 a 50`; users canonicos; `done: false` booleano; `update_person(person_id=...)`; acentuacao nos textos que entram no Pipedrive. Recovery novo: guardrail `⚠ ATIVIDADE PENDENTE EXISTENTE` do `create_activity` (nao forcar; registrar). Comportamento de negocio preservado integralmente da v2.4.
- **v2.x** (05-06/2026): Regra Zero de identidade 1-de-2; integracao Voice Guide (get_voice_guide + check_message); stage destino 65; enums literais com emoji/acento; dedupe como default (~95% dos leads G4Tools ja existem); fallback pipedrive_write + sync_all. Historico completo na v2.4 (git).
- **v1** (03/05/2026): versao inicial.
