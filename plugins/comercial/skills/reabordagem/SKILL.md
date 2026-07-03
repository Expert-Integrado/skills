---
name: reabordagem
description: Use quando o usuario pedir para reabordar leads, reativar leads frios/perdidos, criar campanha de reativacao/reengajamento, processar uma lista de deals do Pipedrive para reabordagem, ou mencionar reabordagem/reativacao/recuperacao de leads. Tambem ativa em "rodar campanha de reabordagem", "reaquecer base", "voltar a falar com leads antigos". NAO usar para: follow-up de deals ativos em negociacao (fup-inteligente), prospeccao de leads novos (prospecta-lead), disparo direto de mensagens por WhatsApp/ChatGuru (whatsapp-campanha-*) — esta skill NAO envia mensagem, ela cria ATIVIDADE no Pipedrive com mensagem pronta pro vendedor enviar.
allowed-tools: Read, Bash, Write, Task, mcp__pipedrive__list_deals, mcp__pipedrive__search_deals, mcp__pipedrive__get_deal_summary, mcp__pipedrive__create_activity, mcp__pipedrive__pipedrive_write, mcp__pipedrive__sync_all
---

# Reabordagem de Leads — Pipedrive

Campanha de reabordagem/reativação de leads no Pipedrive: recebe uma lista de leads (CSV, deal IDs ou filtro), investiga cada um via `mcp__pipedrive__get_deal_summary`, classifica temperatura, gera mensagem personalizada e cria UMA atividade tipo `whatsapp` por lead com a mensagem pronta + estratégia pro vendedor. A skill não dispara nenhuma mensagem — o envio é do vendedor.

## NUNCA

- NUNCA passar `due_time` no `create_activity` — nem `""`, nem `"00:00"`. Pipedrive interpreta como meia-noite e marca a atividade como vencida. Atividade sem horário = campo OMITIDO.
- NUNCA enviar a mensagem ao lead diretamente (WhatsApp, ChatGuru ou qualquer canal). A skill SÓ cria a atividade no Pipedrive.
- NUNCA criar nota separada (`create_note`) — todo o conteúdo vai na `note` da atividade.
- NUNCA usar emoji no corpo da mensagem que o vendedor copia e envia ao lead (emojis são permitidos SÓ nos rótulos internos do template HTML).
- NUNCA citar nome de SDR que já saiu da empresa na mensagem — usar "a gente conversou". Nome próprio só de figura AINDA ativa (Niverton, Kesia, Eric).
- NUNCA incluir `deal_id` na atividade se o usuário não pediu vínculo ao deal no Passo 0 (default: só pessoa + org).
- NUNCA escrever a `note` em texto puro — HTML obrigatório (`<br>`, `<b>`, `<h3>`, `<hr>`).
- NUNCA criar a atividade em duas chamadas (criar com `call` e atualizar depois) — `type: "whatsapp"` e `user_id` funcionam direto no `create_activity`, em uma chamada só.

## SEMPRE

- SEMPRE acentuação correta do português na mensagem ao lead (cedilha, til, acentos) — é texto externo.
- SEMPRE mensagem NO TOPO da nota da atividade — o vendedor abre e já vê o que enviar.
- SEMPRE validar o PRIMEIRO lead com o usuário antes de processar o resto do lote.
- SEMPRE classificar como DESCARTAR lead sem telefone E sem email (sem canal de contato) — não criar atividade, listar no resumo com motivo.
- SEMPRE gerar o resumo final da campanha (template no Passo 8).

## Pré-requisitos

**Caminho normal (99% dos casos): o MCP `pipedrive` está carregado.** Todos os passos usam as tools `mcp__pipedrive__*` e o próprio MCP já carrega o token PIPEDRIVE_API_KEY dele — você NÃO precisa de env var, `op` nem script Python. O bloco de token abaixo e o fallback REST do Passo 7 SÓ entram em cena se uma chamada MCP falhar com erro de "tool disabled" / "hook blocking" (ver Passo 7). Em execução normal, ignore o token e o REST.

- **MCP `pipedrive` carregado?** Verifique se a tool `mcp__pipedrive__get_deal_summary` está disponível. SE sim → seguir normalmente. SE não → tentar a REST direta (que exige o token abaixo); SE o token também não puder ser obtido (ver próximo item) → PARAR e reportar ao usuário: "Não consigo acessar o Pipedrive (MCP ausente e sem token PIPEDRIVE_API_KEY). Preciso que você habilite o MCP pipedrive ou forneça o token." Não inventar dados de deal.
- **Token (SÓ pro fallback REST):** obter nesta ordem, parando no primeiro que funcionar:
  1. Env var `PIPEDRIVE_API_KEY` — SE definida e não-vazia → usar.
  2. SENÃO, SE `command -v op` retornar um caminho (CLI 1Password existe) → `op read "op://Agentes Eric/PIPEDRIVE_API_KEY/credential"`; usar o valor retornado.
  3. SENÃO (sem env var E sem `op`) → o fallback REST é IMPOSSÍVEL. PARAR e reportar ao usuário exatamente: "Preciso do token PIPEDRIVE_API_KEY para o fallback REST, mas não há env var nem 1Password CLI (`op`) nesta máquina. Cole o token aqui ou rode em uma máquina com o MCP pipedrive." NÃO tentar adivinhar o token nem prosseguir sem ele.
  - Lembre: você só chega neste bloco se o MCP falhou. Com o MCP funcionando, o token é irrelevante.
- Lista de leads fornecida pelo usuário (CSV, lista de deal IDs ou filtro do Pipedrive).
- Arquivos temporários (scripts de fallback, parsing): `WORK=$(mktemp -d)` — nunca path fixo de SO.
- Regras Pipedrive canônicas completas (enums, pipelines, tipos de atividade): `C:/MCPs/expert-mcps/CLAUDE.md` no PC do Eric. **Você NÃO precisa abrir esse arquivo** — todos os valores usados por esta skill (IDs de vendedor, nomes de etapa por pipeline, tipos de atividade, motivos de perda) estão inline nos passos abaixo. O ponteiro fica só como referência de auditoria.

## Passos

### Passo 0 — Coletar parâmetros da campanha

Para cada item: SE já está no pedido/contexto do usuário → usar sem perguntar; SENÃO → perguntar. Fazer TODAS as perguntas pendentes numa ÚNICA mensagem.

1. **Lista de leads** — CSV (path do arquivo), lista de deal IDs, ou filtro do Pipedrive (pipeline/etapa/status/responsável).
2. **Contexto da campanha** — objetivo e oferta (ex: "mentoria sobe de R$18K para R$24K em 01/04", "convidar para evento", "retomar leads frios").
3. **Vendedor responsável** — nome do vendedor no Pipedrive (o usuário informa; não inferir). Guarde o nome exatamente como o usuário escreveu (ex: "Kesia", "Niverton", "João Silva") e passe-o direto no campo `user_id` do `create_activity` no Passo 7 — **o próprio tool resolve nome → ID** (faz match exato e depois parcial contra os usuários ativos). Você NÃO precisa de nenhuma outra tool para descobrir o ID do vendedor.
   - **IDs conhecidos** (atalho — se o vendedor for um destes, pode passar o número direto; ambos funcionam):
     - Kesia Nandi: `23969736`
     - Niverton Menezes: `23506911`
     - Eric Luciano: `17987703`
   - **SE o vendedor NÃO estiver nessa lista** (qualquer outro nome): passe o nome mesmo assim no `user_id`. Dois desfechos possíveis no Passo 7:
     - O tool resolve o nome sozinho (match exato ou parcial) → atividade criada normalmente. Nada a fazer.
     - O tool retorna erro `Usuário "<nome>" não encontrado.` seguido da LISTA de usuários ativos (nome + ID de cada um). Nesse caso: escolher dessa lista o usuário cujo nome bate com o que o usuário pediu, e refazer a chamada com o ID numérico dele. SE nenhum nome da lista bater de forma inequívoca → PARAR e perguntar ao usuário qual vendedor da lista usar (mostrar a lista retornada). NUNCA chutar um ID.
4. **Data da atividade** (`due_date`, formato `YYYY-MM-DD`) — default: próximo dia útil (SE hoje é sexta/sábado/domingo → segunda; SENÃO → amanhã). **Fonte da data "hoje":** NÃO inferir de memória — obter via Bash no fuso America/Sao_Paulo. Comando literal: `TZ=America/Sao_Paulo date +%Y-%m-%d` (dia da semana: `TZ=America/Sao_Paulo date +%u`, onde 5=sexta, 6=sábado, 7=domingo). Nota: feriados NÃO são tratados — se o próximo dia útil calculado cair num feriado, o Eric ajusta a `due_date` manualmente.
5. **Vincular ao deal?** — perguntar. Default (sem resposta explícita): somente pessoa + organização, SEM `deal_id`.
6. **Playbooks de referência** — SE o usuário forneceu documentos de objeções, scripts ou estratégia comercial → ler com `Read` e usar como base nos Passos 4-5. SE o usuário MENCIONOU que tem um playbook/material/script mas NÃO anexou (nenhum path/arquivo no contexto) → pedir o path ou arquivo ANTES de redigir os ângulos e mensagens (não improvisar contra um playbook que existe mas você ainda não leu).

### Passo 1 — Ler e parsear a lista de leads

- SE CSV → `Read` no arquivo; extrair colunas: título, pessoa, org, etapa, motivo de perda, data de criação, deal ID.
  - SE o CSV não tem coluna de deal ID → resolver cada linha via `mcp__pipedrive__search_deals` (term: nome da pessoa ou título do deal). SE não encontrar → classificar o lead como DESCARTAR com motivo "deal não encontrado no Pipedrive".
- SE lista de deal IDs → usar diretamente.
- SE filtro → `mcp__pipedrive__list_deals` com os parâmetros informados (`status`, `pipeline_id`, `stage_id`, `user_id`; para listas grandes usar `buscar_todos: true`).

Validação: informar ao usuário o total de leads carregados antes de seguir.

### Passo 2 — Investigar cada lead

Para cada deal ID: `mcp__pipedrive__get_deal_summary(deal_id: <ID>)`. Extrair:

- Data de cadastro
- Etapa atual/última
- Status (open/lost/won)
- Motivo de perda
- Campos personalizados (segmento, dores, objetivos, colaboradores, ferramentas)
- Anotações existentes (histórico de conversas)
- Atividades (quantidade, data da última)
- Pessoa vinculada: **telefone COMPLETO com DDI** (o número inteiro, ex: `5511999999999` ou `+34611223344` — guarde os dígitos iniciais, é o que decide idioma no Passo 5), email, empresa

Sobre o retorno do `get_deal_summary`: é um texto em seções. A etapa aparece como NOME na linha `Pipeline: <pipeline> | Etapa: <nome da etapa>` (ex: `Etapa: Proposta enviada`) — use esse NOME direto no Passo 3, não há ID pra converter. O telefone aparece na seção `PESSOA:` na linha `Telefone: <número(s)>`. **Não existe campo "país" garantido** no retorno — a nacionalidade do lead é inferida no Passo 5 a partir do DDI do telefone (ver lá).

SE retornar "Deal X não encontrado" → DESCARTAR com motivo "deal não encontrado"; seguir pro próximo.
SE a pessoa vinculada não tem telefone NEM email → DESCARTAR com motivo "sem dados de contato".

**Paralelização (opcional — só acelera; o fluxo sequencial dá o MESMO resultado):**

- SE a lista tem **10 leads ou menos** → NÃO paralelizar. Processar os Passos 2-5 sequencialmente, um lead por vez, você mesmo. Pular o resto deste bloco.
- SE a lista tem **mais de 10 leads** → pode dividir em lotes de **10 leads cada** (último lote com o resto) e despachar um subagent por lote via tool `Task`, em paralelo (todas as chamadas `Task` numa única leva). Cada subagent executa Passos 2-5 SÓ para os leads do lote dele e devolve os dados estruturados — ele NÃO cria atividade (Passo 7 é seu, depois da validação do Passo 6).

**Prompt EXATO a passar em cada `Task`** (substitua `<LISTA DE DEAL IDs DO LOTE>` e `<CONTEXTO DA CAMPANHA — Passo 0.2>`):

```
Você é um subagente de uma campanha de reabordagem. Para CADA deal ID desta lista: <LISTA DE DEAL IDs DO LOTE>

1. Chame mcp__pipedrive__get_deal_summary(deal_id) e extraia: nome da pessoa, person_id, org_id (se houver), empresa, telefone completo com DDI, email, etapa atual (nome), status (open/lost/won), motivo de perda, nº de atividades, data da última atividade, campos personalizados (segmento, dores, objetivos, ferramentas), resumo do histórico de notas.
2. Classifique a temperatura (QUENTE/MORNO/FRIO/DESCARTAR) usando ESTES critérios: [cole aqui a tabela do Passo 3 + o mapa de etapas por pipeline do Passo 3].
3. Defina ação recomendada (oferta + ângulo + 3 objeções com resposta) para o contexto: <CONTEXTO DA CAMPANHA — Passo 0.2>.
4. Gere a mensagem personalizada seguindo as regras do Passo 5 [cole as regras do Passo 5, incluindo a regra de idioma por DDI].

NÃO crie atividade no Pipedrive. NÃO envie mensagem a ninguém.
Devolva um bloco por lead neste formato exato:
DEAL <id> | <Nome> | person_id=<id> | org_id=<id ou vazio> | telefone=<num> | TEMPERATURA=<X> | idioma=<pt/es/en>
AÇÃO: <oferta/ângulo>
OBJEÇÕES: 1)"..."→... 2)"..."→... 3)"..."→...
MENSAGEM: <texto completo da mensagem>
RESUMO_LEAD: <2-3 linhas>
---
Se um deal cair em DESCARTAR, devolva: DEAL <id> | DESCARTAR | motivo=<motivo>
```

**Consolidação:** quando TODOS os subagents retornarem, junte os blocos de todos os lotes numa única lista ordenada pela ordem original dos deal IDs. Só então siga pro Passo 6 (validar o PRIMEIRO lead dessa lista consolidada). A criação de atividades (Passo 7) só começa depois dessa validação. SE algum `Task` falhar ou não retornar → reprocessar os deals daquele lote você mesmo, sequencialmente (não pular leads).

### Passo 3 — Classificar temperatura

Você tem, do Passo 2: o **nome da etapa** (string `Etapa: <nome>` que o `get_deal_summary` devolveu), o nº de interações (atividades), o status e o motivo de perda. Classifique aplicando a regra na ordem abaixo (o PRIMEIRO critério que bater define a temperatura):

| Temperatura | Critérios (basta UM) |
|-------------|-----------|
| **DESCARTAR** | Sem telefone E sem email; OU status/etapa de desqualificado; OU motivo de perda = "Não é o que buscava" ou "Ferramenta incompatível" |
| **QUENTE** | Etapa alcançada é de proposta/negociação/formalização (ver mapa abaixo); OU há registro de SIM verbal nas notas; OU motivo reversível com perda há < 6 meses |
| **MORNO** | Etapa alcançada é de apresentação/demo (ver mapa abaixo); OU 5 ou mais atividades no histórico; OU motivo reversível com perda há > 6 meses |
| **FRIO** | Etapa alcançada é de contato inicial ou "sem contato" (ver mapa abaixo); OU menos de 3 atividades; OU motivo definitivo (que não caiu em DESCARTAR) |

**Como decidir "a etapa alcançada":** use a etapa MAIS AVANÇADA por que o deal passou. O `get_deal_summary` mostra a etapa atual na linha `Etapa:` e o caminho na seção `HISTÓRICO` (linhas `Etapa X -> Y`). Se o histórico mostra que chegou a uma etapa mais adiantada do que a atual (ex: voltou de "Proposta enviada" para "Contato realizado"), conte a mais avançada.

**Como escolher a COLUNA do pipeline (normalizar o nome):** o `get_deal_summary` devolve o pipeline na linha `Pipeline: <pipeline> | Etapa: <nome>`, e o nome pode vir com número ou espaços extras (ex: `Educacional 6`, `Super SDR`, `SaaS 1`). Para casar com uma das 5 colunas abaixo (Educacional, SaaS, Super SDR, Prospecção, Parceria): comparar por PREFIXO, case-insensitive, ignorando dígitos e espaços extras (ex.: `Educacional 6` casa com a coluna `Educacional`; `saas 1` casa com `SaaS`). SE o pipeline normalizado NÃO casar com NENHUMA das 5 colunas → NÃO adivinhar a coluna: perguntar ao usuário a qual das 5 faixas aquele pipeline corresponde (ou classificar pelos OUTROS critérios da tabela — nº de interações, motivo de perda — conforme a regra logo abaixo do mapa).

**Mapa de etapas → faixa de temperatura** (nomes exatos que aparecem em `Etapa:`, por pipeline — o `get_deal_summary` sempre devolve o NOME, não o número):

| Faixa | Educacional | SaaS | Super SDR | Prospecção | Parceria |
|-------|-------------|------|-----------|------------|----------|
| **QUENTE** (proposta/negociação/formalização) | Proposta enviada, Em negociacao, Formalizacao | Proposta enviada, Em negociacao, Formalizacao | Proposta enviada, Em negociacao, Formalizacao | Qualificado, Reuniao agendada | Negociacoes Iniciadas, Formalizacao |
| **MORNO** (apresentação/demo) | Apresentacao Agendada, Apresentacao realizada | Apresentacao agendada, Apresentacao realizada | Demo agendada, Demo realizada | Pre-Qualificado | Reuniao de Alinhamento, Interesse Confirmado |
| **FRIO** (contato inicial / sem contato) | Sem contato, Contato Realizado, Aguardando agendamento | Sem contato, Contato realizado | Sem contato, Contato realizado, Aguardando agendamento | Lead Mapeado, Tentando contato, Conexao iniciada/Em qualificacao | Sem contato, Contato Inicial |

SE a etapa retornada não bater com nenhum nome do mapa (grafia diferente, pipeline não listado) → NÃO travar: classifique pelos OUTROS critérios da tabela (nº de interações, motivo de perda). O nome da etapa é só um dos gatilhos, não o único.

**Motivos de perda por categoria** (canônico Pipedrive — texto exato do campo motivo de perda):
- **Reversíveis:** Parou de responder, Fora do orçamento, Adiou contratação.
- **Difícil (tratar como reversível antigo → tende a MORNO/FRIO):** Mudança de prioridade, Contratou outra, Internalizou.
- **Definitivo:** Não é o que buscava, Ferramenta incompatível → estes dois levam a DESCARTAR (ver primeira linha da tabela).

### Passo 4 — Definir ação recomendada

Entradas: temperatura (Passo 3) + contexto da campanha (Passo 0.2) + perfil do lead (Passo 2) + playbooks (Passo 0.6, SE fornecidos). Saídas obrigatórias, por lead:

- Qual oferta fazer (ex: vender produto, convidar para evento, dar cortesia)
- Qual ângulo usar (ex: urgência de preço, exclusividade, economia de tempo)
- Quais objeções antecipar (exatamente 3), cada uma com resposta

**De onde tirar oferta/ângulo/objeções:**

- **SE o usuário forneceu playbooks no Passo 0.6** → esses documentos são a fonte de verdade. Extrair as objeções e respostas de lá; usar o ângulo/oferta que eles indicarem. Não improvisar contra o que o playbook diz.
- **SE NÃO forneceu playbook** (caso comum) → derivar assim, sem inventar do zero:
  - **Oferta** = o que o contexto da campanha do Passo 0.2 já define (ex: "mentoria sobe de R$18K para R$24K em 01/04" → a oferta é fechar a mentoria antes do reajuste). A oferta NÃO é criação livre: sai do Passo 0.2. SE o Passo 0.2 não deixar a oferta clara → voltar e perguntar ao usuário qual é a oferta antes de gerar mensagem.
  - **Ângulo** = escolher UM entre estes (o que melhor casa com a temperatura + o motivo de perda): urgência de preço/prazo · exclusividade/vaga limitada · economia de tempo/custo · retomar de onde parou (para quem chegou longe no funil) · prova social/caso recente.
  - **Objeções** = derivar as 3 mais prováveis a partir do MOTIVO DE PERDA do lead (Passo 2), usando este banco:
    | Motivo de perda | Objeção provável | Direção da resposta |
    |---|---|---|
    | Fora do orçamento | "Continua caro pra mim" | Ancorar em ROI / condição da campanha / parcelamento |
    | Adiou contratação | "Ainda não é o momento" | Custo de continuar adiando + gatilho temporal da campanha |
    | Parou de responder | "Sumi porque perdi o interesse" | Reabrir com novidade concreta (o que mudou desde então) |
    | Mudança de prioridade | "Estou focado em outra coisa agora" | Mostrar como a oferta destrava a prioridade atual dele |
    | Contratou outra / Internalizou | "Já resolvi isso de outro jeito" | Diferencial específico + oferta de comparação sem compromisso |
    - SE o lead não tem motivo de perda registrado (ex: status open) → derivar as objeções da dor/segmento mapeados no Passo 2 (ex: dor "no-shows" → objeção "já tentei ferramenta e não funcionou").
- **Critério de qualidade verificável:** cada objeção deve citar algo concreto do lead (motivo de perda, dor, ferramenta, segmento) — objeção genérica que serviria pra qualquer lead ("preciso pensar") NÃO conta; substituir por uma ancorada no perfil.

### Passo 5 — Gerar mensagem personalizada

Regras da mensagem (é o texto que o vendedor envia ao lead):

- **Idioma da mensagem — decidir pelo DDI do telefone (Passo 2), nesta ordem:**
  1. Pegar o telefone completo com DDI coletado no Passo 2 e olhar SÓ os dígitos iniciais (o DDI, o código de país). Remover antes qualquer `+`, espaço, parêntese ou traço.
  2. SE começa com `55` (Brasil) OU o lead não tem telefone (só email) → **português** com acentuação correta (cedilha, til, acentos). Este é o default — na dúvida, português.
  3. SE começa com DDI de país hispanofalante — `54` Argentina, `56` Chile, `57` Colômbia, `51` Peru, `58` Venezuela, `52` México, `598` Uruguai, `595` Paraguai, `591` Bolívia, `593` Equador, `34` Espanha, `506` Costa Rica, `502` Guatemala → **espanhol**.
  4. SE começa com qualquer outro DDI (ex: `1` EUA/Canadá, `44` Reino Unido, `351` Portugal usa português, `39` Itália, etc.) → **inglês** (língua franca), EXCETO `351` Portugal → português.
  5. O "país" citado na regra vem do DDI acima — NÃO há campo "país" no `get_deal_summary`. Nome da empresa NÃO decide idioma (empresa "Global X" pode ser brasileira). Só o DDI decide. SE o telefone for ambíguo/malformado (sem DDI reconhecível) → usar português e anotar no CONTEXTO ADICIONAL da nota "idioma assumido: PT (DDI não identificado — confirmar)".
- Assinada/contextualizada com o nome do vendedor responsável. Nome próprio de pessoa citada no histórico SÓ se ainda ativa (Niverton, Kesia, Eric); SE a conversa antiga foi com SDR que já saiu → "a gente conversou".
- Referenciar o histórico do lead ("você conversou com o Eric", "você demonstrou interesse").
- Incluir a oferta da campanha com urgência.
- Curta e direta: 3-5 parágrafos no máximo. Zero emoji.
- Terminar com pergunta aberta.

### Passo 6 — Validar o primeiro lead com o usuário

Montar a nota HTML completa (template abaixo) do PRIMEIRO lead e mostrar ao usuário ANTES de criar qualquer atividade.

- SE o usuário aprovar → seguir pro Passo 7 com todos os leads.
- SE pedir ajustes → aplicar o ajuste ao template/abordagem, mostrar o primeiro lead corrigido e revalidar.

### Passo 7 — Criar atividade no Pipedrive (uma por lead)

`mcp__pipedrive__create_activity` — UMA chamada por lead:

```
subject:   "Reabordagem {nome da campanha} — {Nome Lead} | {Empresa}"
type:      "whatsapp"
user_id:   {nome ou ID do vendedor — o tool resolve nome}
person_id: {ID da pessoa}
org_id:    {ID da org, se existir}
deal_id:   {ID do deal — SOMENTE se o usuário pediu vínculo ao deal no Passo 0.5}
due_date:  {data do Passo 0.4, YYYY-MM-DD}
note:      {HTML do template abaixo}
```

NÃO passar `due_time` (ver NUNCA). NÃO passar `done`.

**Validação do sucesso (MCP):** a chamada deu certo se o texto de retorno CONTÉM a substring `Atividade criada` E `ID:` (o formato literal do MCP é `Atividade criada! ID: <n> — "<subject>"`, às vezes com o link do deal na linha seguinte). Trate como sucesso qualquer resposta que contenha essas duas marcas e extraia o número que vem depois de `ID:` — esse é o ID da atividade, guarde-o pro resumo final. NÃO exija correspondência exata da string inteira nem se preocupe com pontuação/sufixos; basta conter `Atividade criada` + `ID: <número>`. Qualquer OUTRO retorno (que não contenha essas marcas) é falha → ir pra cadeia de erro abaixo.

SE falhar, na ordem:
1. Resposta `⚠ ATIVIDADE PENDENTE EXISTENTE` → o guardrail do MCP detectou atividade aberta pro contato/deal. Campanha de reabordagem cria atividade nova por design: repetir a MESMA chamada com `force: true` e registrar no resumo final que o lead tinha pendência.
2. Resposta `This tool has been disabled in your connector settings.` → usar `mcp__pipedrive__pipedrive_write({ action: "create_activity", params: { ...mesmos campos acima } })`.
3. `pipedrive_write` também bloqueado (ex: "Callback hook blocking error" em Claude Code com hook) → REST direta via `python3` + `urllib.request`. **Use o script abaixo, colando os valores** — ele é autocontido (não importa engine externo; a engine das skills `whatsapp-campanha-*` faz disparo de WhatsApp e lê credencial de JSON específico de máquina, NÃO serve aqui). Salvar em `WORK=$(mktemp -d)/criar_atividade.py` e rodar `python3 "$WORK/criar_atividade.py"`.

   Antes de rodar: obter o token conforme "Pré-requisitos" (env `PIPEDRIVE_API_KEY` ou `op read`) e exportá-lo no ambiente do processo — o script lê de `os.environ`, nunca hardcode o token no arquivo.

   ```python
   import os, sys, io, json, urllib.request, urllib.error
   if hasattr(sys.stdout, "reconfigure"):
       sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows: evita crash cp1252 com acento/emoji

   TOKEN = os.environ.get("PIPEDRIVE_API_KEY")
   if not TOKEN:
       print("ERRO: PIPEDRIVE_API_KEY ausente no ambiente. Ver Pré-requisitos."); sys.exit(1)

   # Domínio da conta do Eric é 'expertintegrado'. api.pipedrive.com também funciona; use o domínio da empresa.
   BASE = "https://expertintegrado.pipedrive.com/api/v1"

   # ── PREENCHER 1 dict por lead que caiu no fallback ────────────────────────
   ATIVIDADES = [
       {
           "subject":   "Reabordagem <campanha> — <Nome> | <Empresa>",
           "type":      "whatsapp",          # key EXATA (não o nome visível "WhatsApp")
           "user_id":   17987703,            # ID NUMÉRICO do vendedor (a REST NÃO resolve nome — usar tabela do Passo 0.3)
           "person_id": 0,                    # ID da pessoa
           "org_id":    0,                    # ID da org (remover a chave se não houver)
           # "deal_id": 0,                    # incluir SOMENTE se o usuário pediu vínculo no Passo 0.5
           "due_date":  "2026-07-03",         # YYYY-MM-DD do Passo 0.4
           "note":      "<HTML do template — quebras de linha como <br> literais; a API ignora \\n>",
           # NÃO incluir due_time. NÃO incluir done.
       },
       # ... um dict por lead
   ]

   def criar(a):
       body = dict(a)
       # remover chaves opcionais vazias que não devem ir (org_id/deal_id só se preenchidos)
       for k in ("org_id", "deal_id"):
           if k in body and not body[k]:
               del body[k]
       data = json.dumps(body).encode("utf-8")
       req = urllib.request.Request(f"{BASE}/activities?api_token={TOKEN}", data=data,
                                    method="POST", headers={"Content-Type": "application/json"})
       try:
           with urllib.request.urlopen(req, timeout=30) as r:
               resp = json.loads(r.read())
           aid = (resp.get("data") or {}).get("id")
           if aid:
               print(f'Atividade criada! ID: {aid} — "{body["subject"]}"')   # mesmo formato do MCP
               return aid
           print(f"FALHA (sem ID): {resp}"); return None
       except urllib.error.HTTPError as e:
           print(f"FALHA HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}"); return None

   ids = [criar(a) for a in ATIVIDADES]
   print("IDS_CRIADOS:", [i for i in ids if i])
   ```

   Regras da REST direta (por que o script faz assim):
   - (a) `user_id` DEVE ser o ID NUMÉRICO — a API v1 não resolve nome (só o MCP resolve). Usar os IDs do Passo 0.3; se o vendedor não estiver lá, obter o ID como descrito no Passo 0.3 antes de rodar.
   - (b) `type` é a key exata `whatsapp` (não o rótulo visível "WhatsApp").
   - (c) na `note`, quebras de linha devem ser `<br>` literais — a API ignora `\n`.
   - (d) NUNCA usar `curl` no Git Bash do Windows (cp1252 quebra acentos); sempre este Python com `reconfigure(utf-8)`.
   - **Validação:** cada `criar()` imprime `Atividade criada! ID: <n>` no sucesso (mesma marca do Passo 7 do MCP) e `FALHA ...` no erro. Coletar os IDs da linha `IDS_CRIADOS:` pro resumo final.

### Passo 8 — Resumo final

Após processar todos os leads, entregar:

```
CAMPANHA: {nome/contexto}
Total processados: {N}
QUENTE: {n} | MORNO: {n} | FRIO: {n} | DESCARTADOS: {n}
Atividades por vendedor: {vendedor}: {n} (...)
Atividades criadas: {lista de IDs}
Leads com pendência pré-existente (criados com force): {lista ou "nenhum"}
Descartados:
- {Nome | Empresa} — {motivo}
```

## Template HTML da atividade

A `note` DEVE usar HTML e seguir esta estrutura (mensagem NO TOPO). Os emojis abaixo são rótulos internos pro vendedor escanear rápido — o CORPO da mensagem que ele copia e envia ao lead NÃO leva emoji e tem acentuação correta do português.

```html
<b>📩 MENSAGEM PARA ENVIAR (WhatsApp):</b><br><br>

{mensagem personalizada aqui, com <br><br> entre parágrafos}<br><br>

<hr>

<h3>🎯 ESTRATÉGIA DE REABORDAGEM — {Nome da Campanha}</h3>

<b>📊 RESUMO DO LEAD</b><br>
{resumo em 2-3 linhas: nome, empresa, segmento, como chegou, o que aconteceu, motivo da perda}<br><br>

<b>🌡️ TEMPERATURA: {QUENTE/MORNO/FRIO}</b><br>
{justificativa em 1 linha}<br><br>

<b>✅ AÇÃO RECOMENDADA: {ação}</b><br>
• {prioridade 1}<br>
• {prioridade 2 / fallback}<br>
• {observações especiais}<br><br>

<b>⚠️ OBJEÇÕES PROVÁVEIS:</b><br>
1. <b>"{objeção 1}"</b> → {resposta}<br>
2. <b>"{objeção 2}"</b> → {resposta}<br>
3. <b>"{objeção 3}"</b> → {resposta}<br><br>

<b>📌 CONTEXTO ADICIONAL:</b><br>
• {dores mapeadas}<br>
• {ferramentas que usa}<br>
• {observações especiais: idioma, fuso, sócio, etc}<br>
• {links relevantes: proposta, chat, etc}
```

## Validação final (checklist)

- [ ] Primeiro lead foi validado pelo usuário antes do lote
- [ ] Toda atividade: `type: "whatsapp"`, vendedor correto, `due_date` preenchido, SEM `due_time`
- [ ] Vínculo conforme Passo 0.5 (default: pessoa + org, sem `deal_id`)
- [ ] Mensagem no topo da nota, em HTML, acentuação correta, zero emoji no corpo da mensagem
- [ ] Leads internacionais receberam mensagem no idioma certo
- [ ] Nenhuma nota separada criada; nenhuma mensagem disparada ao lead
- [ ] Leads sem contato/deal descartados e listados com motivo
- [ ] Resumo final entregue no formato do Passo 8

## Erros comuns e recovery

| Sintoma | Causa | Recovery |
|---------|-------|----------|
| `⚠ ATIVIDADE PENDENTE EXISTENTE` | Guardrail do MCP: contato/deal já tem atividade aberta | Repetir a mesma chamada com `force: true`; registrar no resumo |
| `This tool has been disabled in your connector settings.` | Hook do Claude Desktop bloqueia `create_*` | `mcp__pipedrive__pipedrive_write({ action: "create_activity", params: {...} })` |
| "Callback hook blocking error" (bloqueia até o proxy) | Hook do Claude Code | REST direta `POST /v1/activities` via `python3` + `urllib` — usar o SCRIPT INLINE do Passo 7 (item 3), que já é autocontido |
| Atividade aparece VENCIDA logo após criar | `due_time` foi passado (`""` ou `"00:00"`) | Nunca passar `due_time`; corrigir a atividade removendo o horário |
| Vendedor não resolve (erro com lista de usuários) | Nome não bate com usuário ativo | Usar o ID numérico da tabela do Passo 0.3 ou um nome da lista retornada no erro |
| Erro em campo personalizado | Cache de campos desatualizado | Rodar `mcp__pipedrive__sync_all` e repetir |
| Acentos quebrados na nota | curl/Bash Windows em cp1252 | Usar as tools MCP ou Python UTF-8; nunca curl no Git Bash pra texto acentuado |

## Exemplo (mínimo)

Pedido: "Roda reabordagem nesses 3 deals (IDs 111, 222, 333) — mentoria sobe de R$18K pra R$24K em 01/04, vendedor Kesia, atividades pra amanhã."

1. Passo 0: tudo extraído do pedido, exceto vínculo ao deal → perguntar só isso (default pessoa+org).
2. `get_deal_summary` em 111, 222, 333.
3. Classificar: 111 QUENTE (proposta enviada, perdeu por "Adiou contratação" há 3 meses), 222 MORNO, 333 DESCARTAR (sem telefone/email).
4. Gerar mensagens (ângulo: urgência do aumento de preço em 01/04).
5. Mostrar nota completa do deal 111 → usuário aprova.
6. `create_activity` para 111 e 222 (`type: "whatsapp"`, `user_id: "Kesia Nandi"`, `person_id`/`org_id`, `due_date` de amanhã, sem `deal_id`, sem `due_time`).
7. Resumo: 3 processados, 1 quente, 1 morno, 1 descartado (sem dados de contato), 2 atividades pra Kesia.
