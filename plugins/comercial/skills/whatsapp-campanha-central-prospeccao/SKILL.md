---
name: whatsapp-campanha-central-prospeccao
description: Executa campanha de prospeccao em massa via aparelho da Central de Atendimento do ChatGuru (chip de numero convencional, NAO API oficial). Para cada lead: reatribui ao SDR responsavel, conclui atividade vencida do evento, dispara mensagem multipart (3 partes com delay humano via send_date), executa dialogo do bot da SDR, cria atividade WhatsApp concluida e Call de follow-up no Pipedrive, preenche CRM__Link_pessoa e CRM__Link_negocio no chat e adiciona anotacao com link do deal. Chip convencional exige delay entre leads (anti-banimento). TRIGGER quando usuario pedir "campanha de prospeccao", "disparar campanha pela Central", "rodar massa de leads", "campanha de ativacao", "ativar leads do webinar/aula/evento" pelo aparelho da Central, ou fornecer lista de deal_ids para processar com WhatsApp multipart + atividades + dialog. NAO usar para follow-up via API Oficial/template aprovado (usar whatsapp-campanha-api-fup), mensagem individual, "link de WhatsApp"/wa.me, nem disparo pelo WhatsApp pessoal do Eric (whatsapp-agent).
allowed-tools: Bash, Read, Write, mcp__pipedrive__list_deals, mcp__chatguru-mcp__chatguru_get_chat_link
---

# Campanha Central de Prospeccao — Pipedrive + ChatGuru (chip Central)

Campanha em massa disparada pelo aparelho da **Central de Atendimento** do ChatGuru (chip de numero convencional). Toda a logica de execucao vive numa engine Python reutilizavel (`whatsapp-central-prospeccao-batch.py`) que o agente IMPORTA e configura — nunca reescreve. Diferencas pra `whatsapp-campanha-api-fup`: aparelho diferente (chip vs API oficial), mensagem multipart (vs template unico), delay obrigatorio entre leads (anti-banimento), fallback 12<->13 chars no phone, reatribui SDR (vs Expert Integrado fixo), cria 2 atividades por lead (registro WhatsApp + Call follow-up).

## COMO A ENGINE EXECUTA — leia antes de tudo (nao e ambiguidade do allowed-tools)

Esta skill roda a engine por **Bash executando um interpretador Python** (`python3 runner.py` ou `python runner.py`, ver passo 4 pra invocacao literal). A tool `Bash` do `allowed-tools` cobre isso.

O `allowed-tools` lista SO 4 coisas alem de `Bash/Read/Write`: `mcp__pipedrive__list_deals` (montar a lista de leads no passo 2) e `mcp__chatguru-mcp__chatguru_get_chat_link` (captura opcional pos-campanha do chat_id real). **NAO ha inconsistencia:** todas as escritas de campanha (PUT deal, POST atividade Pipedrive, chat_add / dialog_execute / message_send / chat_update_custom_fields / note_add no ChatGuru) NAO passam por tool MCP — a engine Python roda dentro do processo iniciado pelo `Bash` e faz suas proprias chamadas HTTP REST via `urllib.request` (fora do MCP). Por isso NENHUMA tool de escrita Pipedrive/ChatGuru (`create_activity`, `update_deal`, `add_label`, `chatguru_send_message`, etc.) aparece — nem deve aparecer — no `allowed-tools`: o agente nunca as chama; quem chama a API e o codigo Python. Isso e intencional e correto (a tool `mcp__pipedrive__create_activity` inclusive esta bloqueada por hook no Claude Code — ver Erros comuns #2 — e por isso a engine usa REST direta).

Regra pratica: se voce (agente) se pegar querendo chamar uma tool MCP de escrita no Pipedrive/ChatGuru, PARE — isso e trabalho da engine, nao seu. Seu papel e so montar `LEADS`+`config` e chamar `eng.run_batch(...)` via Bash.

## CONTRATO DA ENGINE (assinaturas exatas — nao adivinhar, nao reescrever)

Estas assinaturas vem do arquivo canonico `whatsapp-central-prospeccao-batch.py`. Voce IMPORTA a engine (passo 4) e chama estas funcoes — nunca reimplementa. Se o texto abaixo divergir do arquivo, o ARQUIVO manda: abra-o com Read e confira as assinaturas antes de rodar (nao edite; e proibido reescrever a engine).

**Funcao principal (a unica que voce chama pra disparar):**
```python
run_batch(LEADS, config, log_path, dedupe=True, dry_run=False) -> list[dict]
```
- `LEADS`: `list[dict]`, cada item `{'deal_id': int, 'sdr': str}`. `sdr` DEVE ser uma chave existente em `config['sdr_ids']` E em `config['sdr_dialogs']` (senao a engine lanca `KeyError` no lead — ela faz `config["sdr_ids"][sdr]` e `config["sdr_dialogs"][sdr]` sem `.get`).
- `config`: `dict` (schema completo em "SCHEMA DO CONFIG" abaixo).
- `log_path`: `str`, caminho do `results.jsonl` (a engine cria a pasta pai sozinha via `mkdir(parents=True)` e grava tambem um `results.log` lateral, mesmo nome com sufixo `.log`).
- `dedupe=True`: pula deal_ids que ja aparecem com `ok=true` no `results.jsonl`.
- `dry_run=False`: quando `True`, **retorna `[]` (lista vazia)** e so imprime `-> deal <id> <sdr>` por lead. NAO chama nenhuma API. Nunca use o retorno do dry-run como se fossem resultados reais.
- Retorno (quando `dry_run=False`): `list[dict]`, um por lead processado, com as chaves: `deal_id, sdr, ok (bool), errs (list[str]), name, phone, person_id, company, phone_used` e, quando aplicavel, `chat_add_id, msg2_id, msg2_send_date, msg3_id, msg3_send_date, wa_activity_id, call_activity_id, vencida_id, moved_to_lead_mapeado`. `ok=true` significa `errs` vazio.

**Funcoes auxiliares que voce pode chamar na reconciliacao (passo 8):**
```python
_load_creds() -> dict   # sem argumentos; retorna {'PD_TOKEN','CG_KEY','CG_ACCT','CG_PHONE'}
pd_put(creds, path, body) -> dict   # creds = retorno de _load_creds(); path relativo a PD_BASE (ex '/activities/123'); body = dict. Retorna o JSON da resposta Pipedrive.
```
Exemplo de uso real na engine: `eng.pd_put(creds, f"/activities/{id}", {"due_time": "14:30"})` (due_time em UTC — ver Erros #12). NAO existe `eng.run_batch` que aceite "logica customizada" alem do `config` — toda customizacao passa pelo `config`.

**IMPORTANTE — de onde `_load_creds()` le (fato do codigo, atualizado 07/07/2026):** a constante `SYNC` no topo da engine se resolve na ordem: (1) env var `CLAUDE_SYNC_DIR`; (2) autodeteccao — `G:/Meu Drive/claude-workspace/Workspace/claude-sync` primeiro, depois o legado `C:/Users/Eric Luciano/OneDrive/Workspace/claude-sync` (ganha o primeiro path que tiver `claude_desktop_config.json`). `_load_creds()` continua **NAO** respeitando `WORKSPACE_DIR` — essa env var so afeta onde o SEU runner localiza o `.py` pra importar (passo 4). Em maquina onde a `claude-sync` mora fora dos 2 paths conhecidos (notebook com outro usuario, VPS Linux): exportar `CLAUDE_SYNC_DIR` apontando pra pasta certa ANTES de rodar o runner — nao editar a engine. SE a engine em producao for copia antiga (grep por `CLAUDE_SYNC_DIR` nao acha nada no arquivo) → restaurar a partir do espelho do repo antes de rodar.

## CONTRATO DAS 3 FUNCOES DE MENSAGEM (assinatura FIXA e obrigatoria)

A engine chama as tres lambdas com posicoes FIXAS (linhas do codigo: `m1 = config["msg_1_func"](first_name, sdr)`, `m2 = config["msg_2_func"](company)`, `m3 = config["msg_3_func"]()`). NAO e assinatura livre — se voce trocar a ordem ou a aridade, quebra em runtime com `TypeError`. As tres tem assinaturas DIFERENTES entre si de proposito (cada uma recebe so o que usa):

| Funcao | Assinatura obrigatoria | Recebe | Tipo/valor do argumento |
|--------|------------------------|--------|--------------------------|
| `msg_1_func` | `lambda nome, sdr: str` | primeiro nome ja limpo + string do SDR | `nome` = saida de `_clean_first_name` (nunca vazio: cai em `amigo(a)`); `sdr` = a string da chave (ex `'Niverton'`) |
| `msg_2_func` | `lambda empresa: str` | nome da empresa OU `None` | `empresa` e `None` quando o deal nao tem org — trate com fallback (ex `('a ' + empresa) if empresa else 'sua operação'`) |
| `msg_3_func` | `lambda: str` | nada | sem argumentos |

Regras do contrato:
- As 3 DEVEM retornar `str`. Podem conter `\n` (quebras viram paragrafos no WhatsApp).
- `msg_2_func` DEVE aceitar `None` sem crashar (empresa ausente e o caso comum). Nao presuma `empresa` sempre preenchida.
- `nome` em `msg_1_func` ja vem tratado pela engine (`_clean_first_name`) — nao re-sanitize.
- No exemplo do passo 4 as tres tem formas diferentes (`nome+sdr` / `empresa` / sem args) exatamente porque o contrato exige essas tres assinaturas — copie o formato, adapte so o texto.

## NUNCA

- NUNCA usar o MCP pessoal `whatsapp-agent` nem montar link `wa.me` aqui — esta skill e canal CORPORATIVO ChatGuru. Cruzar modos e quebra de confianca grave.
- NUNCA usar o phone_id da API Oficial — o disparo sai pelo `CHATGURU_PHONE_ID` da Central (chip convencional).
- NUNCA hardcodar PD_TOKEN, CG_KEY, CG_ACCT ou CG_PHONE em arquivo versionado (skill, script, README, log de exemplo). A skill esta em repo GitHub publico.
- NUNCA reescrever a engine inline numa sessao — importar a copia canonica de `claude-sync/scripts/` (passo 4). NUNCA importar em runtime a copia-espelho da pasta da skill.
- NUNCA usar `api_key` como parametro na API REST do ChatGuru — o parametro e `key` (senao HTTP 400 `key ou account_id não informado(s)`).
- NUNCA passar `dialog_id` no `chat_add` — se o chat ja existe, o dialog nao executa. A engine chama `dialog_execute` separado.
- NUNCA criar atividades Pipedrive quando o `chat_add` falhou — vira atividade-fantasma "enviada" sem disparo real. A engine ja bloqueia isso.
- NUNCA rodar o batch principal sem piloto validado pelo usuario (passo 6).
- NUNCA usar `chat_add_id` como link do chat — e hash interno do registro async, nao o chat_id real.
- NUNCA remover ou zerar o `sleep_between_leads` — chip convencional e passivel de banimento.
- NUNCA rodar batch sem dedup ativo (`results.jsonl`) — risco de mensagem duplicada pro mesmo lead.

## SEMPRE

- SEMPRE acentuacao correta do portugues nas mensagens (texto externo pro lead).
- SEMPRE passar horarios do config em BRT — a engine converte pra UTC (`brt_to_utc_hhmm`) nas chamadas REST do Pipedrive.
- SEMPRE rodar `dry_run=True` antes do piloto.
- SEMPRE pedir ao usuario o `dialog_id` de cada SDR a cada campanha — NAO sao constantes (cada SDR pode ter dialog proprio por contexto). De onde vem: e o ID do dialogo/fluxo configurado no PAINEL do ChatGuru (Central, `https://s13.expertintegrado.app`), aba de Dialogos/Fluxos — so quem administra o ChatGuru (o Eric ou a operacao) o conhece. NAO ha tool MCP nesta skill que liste dialogs, entao o valor vem do usuario. Se ele nao souber de cabeca: pedir que ele abra o painel ChatGuru > Dialogos, copie o ID do fluxo daquela SDR e cole. Formato: string alfanumerica (ex `'661f...'`). Sem os dialog_ids validos NAO rodar (o passo 6/`dialog_execute` falharia silenciosamente por lead).
- SEMPRE reportar ao usuario no final: total OK, total WARN, pendentes (template no passo 9).

## CONSTANTES DA OPERACAO

| Item | Valor |
|------|-------|
| Phone ID Central (ChatGuru) | ler de `CHATGURU_PHONE_ID` no JSON local (NAO o oficial) |
| User ID — Expert Integrado (automacao) | `22805147` |
| User ID — Niverton Menezes | `23506911` |
| User ID — Kesia Nandi | `23969736` |
| User ID — Eric Luciano | `17987703` |
| Pipeline ID — Prospeccao | `7` |
| Atividade registro — subject | `Mensagem de ativação` |
| Atividade registro — type | `whatsapp` (done=1, dono = Expert Integrado) |
| Atividade follow-up — type | `call` (dono = SDR) |
| Em caso de erro — stage destino | `Lead Mapeado` (id 64, pipeline Prospeccao) |
| Em caso de erro — label adicional | `ERRO DE DISPARO` (id 390, preserva labels existentes) |
| Sleep default entre leads | `30s` (anti-banimento) |
| Offset msg 2 / msg 3 | `+1min` / `+2min` apos chat_add |
| Endpoints | `https://expertintegrado.pipedrive.com/api/v1` + `https://s13.expertintegrado.app/api/v1` |

**Dialog IDs por SDR** — NAO sao constantes. Pedir ao usuario a cada campanha.

## PRE-REQUISITOS

1. **Python 3.9+** (precisa de `zoneinfo`): detectar com `command -v python3 || command -v python`. Guardar o que existir como `PYBIN` (ex `python3`); e ele que vai no comando Bash do passo 4. Se nenhum existir → reportar ao usuario e parar.
2. **Onde voce esta rodando (confirmar o ambiente antes de assumir o path):** esta skill roda nos **PCs do Eric (Windows)** — a engine acha as credenciais sozinha nos 2 paths conhecidos de `claude-sync` (ver "IMPORTANTE" no CONTRATO DA ENGINE). Como confirmar, sem adivinhar: rodar `ls "G:/Meu Drive/claude-workspace/Workspace/claude-sync/scripts/whatsapp-central-prospeccao-batch.py"` (path canonico desde 05/07/2026; fallback legado: trocar o prefixo por `$HOME/OneDrive/Workspace` ou `$USERPROFILE/OneDrive/Workspace`).
   - SE algum dos paths achar o arquivo → ambiente OK, seguir (usar ESSE path como `{WORKSPACE_DIR}/claude-sync` daqui em diante).
   - SE NENHUM achar → voce NAO esta num PC do Eric (pode ser notebook com outro usuario/VPS). Em maquina com claude-sync em path proprio: exportar `CLAUDE_SYNC_DIR` (engine) + `WORKSPACE_DIR` (runner) e seguir. Sem claude-sync nenhum → PARAR e reportar ao usuario. NAO tentar workaround de path.
3. **WORKSPACE_DIR — pra que serve exatamente (nao confundir):** `WORKSPACE_DIR` (default PC: `G:/Meu Drive/claude-workspace/Workspace`; em Python `os.environ.get('WORKSPACE_DIR', 'G:/Meu Drive/claude-workspace/Workspace')`) serve SO pra o SEU runner localizar e importar o arquivo `.py` da engine. De onde a engine le credenciais e outra variavel: `CLAUDE_SYNC_DIR` + autodeteccao (ver CONTRATO). ATENCAO: `~/OneDrive/Workspace` e ARQUIVO MORTO desde 05/07/2026 — vale so como fallback de leitura, nunca escrever la.
4. **Engine canonica** (single source of truth de runtime): `{WORKSPACE_DIR}/claude-sync/scripts/whatsapp-central-prospeccao-batch.py`. A copia ao lado deste SKILL.md e apenas espelho versionado pra distribuicao/leitura. Ao corrigir logica: editar a canonica e DEPOIS copiar por cima do espelho. Se a canonica nao existir → verificar `WORKSPACE_DIR` e o passo 2; se realmente sumiu, reportar ao usuario (o espelho pode ser usado pra RESTAURAR a canonica via copia, nunca importado direto).
5. **Credenciais** — a engine le sozinha (`_load_creds`, sem argumentos) dos JSONs locais do claude-sync que ela resolve via `SYNC` (env `CLAUDE_SYNC_DIR` → autodeteccao G:/OneDrive); validar que existem ANTES de rodar (Read/ls nesses dois arquivos):
   - `{claude-sync}/claude_desktop_config.json` → `mcpServers.pipedrive.env.PIPEDRIVE_API_KEY`
   - `{claude-sync}/claude_desktop_config-ERICLUCIANO-PC.json` → `mcpServers.chatguru-mcp.env.{CHATGURU_API_KEY, CHATGURU_ACCOUNT_ID, CHATGURU_PHONE_ID}`
   - **ATENCAO (rotacao de token — procedimento mudou):** o `setup-secrets.ps1` atual (v2, repo `secrets-bootstrap`) grava em `~/.claude.json` e NAO propaga mais os `claude_desktop_config*.json` do claude-sync que a engine le. Apos rotacionar no 1P: atualizar o valor tambem no JSON do claude-sync (edicao manual do campo, sem colar o secret em chat/log). Se algum JSON faltar de vez → reportar ao usuario e parar. Fonte canonica dos secrets e o 1Password (vault "Agentes Eric", via `op read "op://Agentes Eric/<TOKEN>/credential"`); os JSONs sao cache legado que a engine ainda le — migrar a engine pro `op` e pendencia do script, fora desta skill.
   - Se um secret vazar pra esta skill ou pro repo `expertintegrado/skills` → ROTACIONAR no 1Password + painel ChatGuru/Pipedrive antes de qualquer outra coisa.
6. **Diretorio de log da campanha** (persiste entre sessoes — e a base do dedup):
   ```python
   import os
   LOG_BASE = os.environ.get('DISPARO_LOG_DIR',
       'C:/tmp' if os.name == 'nt'
       else os.path.join(os.environ.get('XDG_DATA_HOME', os.path.expanduser('~/.local/share')), 'disparos'))
   log_path = f'{LOG_BASE}/disparo-<nome-campanha>/results.jsonl'
   ```
   No PC o default preserva o historico existente em `C:/tmp/disparo-<nome>/`. NAO usar `mktemp` pro log — dedup precisa sobreviver a sessao.
7. **(Opcional, pos-campanha)** MCP `chatguru-mcp` com sessao Playwright ativa (`node login.js`) — so se for capturar o chat_id real via `mcp__chatguru-mcp__chatguru_get_chat_link`.

## PASSOS

### 1. Coletar decisoes com o usuario

Perguntar (em UMA mensagem, nao pingue-pongue) tudo que ainda nao estiver definido:

1. **Lista de leads** — filtro Pipedrive (pipeline/etapa/dono/campo personalizado), CSV/xlsx exportado, ou deal_ids diretos.
2. **Distribuicao** — quem fica com quantos: 1 SDR pega tudo, split entre N, ou regra customizada (por DDD, por porte, etc.). SE o usuario pedir regra customizada → NAO inventar a logica: pedir a ele a regra em formato concreto (ex `'DDD 11 → Niverton; resto → Kesia'`), montar o split conforme essa regra, MOSTRAR a distribuicao resultante (quantos leads por SDR, e o mapeamento deal→sdr) e AGUARDAR confirmacao do usuario antes de seguir. So depois de confirmado usar essa distribuicao pra montar `LEADS`.
3. **Mensagem template (3 partes)** — abertura/check-in, pitch personalizado, CTA. Variaveis tipicas: nome, empresa (com fallback "sua operação").
4. **dialog_id por SDR** — obrigatorio, um por SDR. Onde achar: painel ChatGuru Central (`https://s13.expertintegrado.app`) > aba Dialogos/Fluxos > copiar o ID do fluxo daquela SDR. Nao ha tool nesta skill que liste dialogs — o valor SO vem do usuario. Se ele nao souber, pedir que abra o painel e copie. Nao inventar nem reaproveitar de campanha anterior sem confirmacao (pode ter mudado).
5. **Atividade Call follow-up** — titulo, data, horario (BRT), duracao.
6. **Exclusoes** — testes, internos da equipe, leads com numero invalido conhecido.
7. **`vencida_subject_match`** — SE a campanha e follow-up de evento (webinar, calendly) → pedir substring do subject da atividade vencida a concluir (ex: `"Imposto Invisível"`); SENAO → deixar vazio (`''` = nao busca vencida).
8. **Piloto** — confirmar 1-2 leads pro piloto: preferir 1 com empresa preenchida e 1 sem. Mais robusto ainda: testar primeiro no numero pessoal do usuario. **Como isso funciona na pratica (a engine so aceita `{deal_id, sdr}` — nao recebe telefone avulso):** pra testar no numero pessoal, perguntar ao usuario qual deal de TESTE do Pipedrive usar — precisa ser um deal cujo telefone cadastrado E o numero pessoal dele (a engine dispara pro phone que le do deal). Monta-se `LEADS = [{'deal_id': <deal de teste>, 'sdr': '<algum SDR>'}]` com esse deal. SE nao existir um deal de teste com o numero pessoal → NAO tentar injetar o telefone de outro jeito; usar a opcao alternativa do piloto (os 2-3 leads reais, 1 com empresa e 1 sem).

Validacao: so avancar quando itens 1-5 estiverem respondidos. Item 7 vazio e valido.

### 2. Montar a lista LEADS

- SE o usuario deu deal_ids → montar direto `[{'deal_id': N, 'sdr': 'Nome'}, ...]`.
- SE deu filtro Pipedrive → `mcp__pipedrive__list_deals` com `pipeline_id`/`stage_id`/`user_id` e `buscar_todos: true`; filtro por campo personalizado e aplicado localmente sobre o retorno.
- SE deu CSV/xlsx → ler o arquivo (Read/Bash+python) e extrair deal_ids.
- Aplicar as exclusoes do passo 1.6.
- Validacao: todo item tem `deal_id` (int) e `sdr` presente nas chaves de `sdr_ids`/`sdr_dialogs` do config. SE algum sdr nao bater → corrigir antes de seguir (senao a engine lanca KeyError no lead).

### 3. Pre-flight — deduplicacao obrigatoria

A engine ja deduplica automaticamente (le `results.jsonl` e pula deals com `ok=true`). Mesmo assim conferir antes:

```python
import json, os
if os.path.exists(log_path):
    done = set()
    for l in open(log_path, encoding='utf-8'):
        r = json.loads(l)
        if r.get('ok'):
            done.add(r['deal_id'])
    print(f"Ja feitos: {len(done)}")
```

SE houve pilotos manuais executados FORA da engine (sem entrada no jsonl) → incluir esses deal_ids num set hardcoded e remover de LEADS manualmente.

### 4. Importar a engine e montar o config

**Mecanica de execucao (literal — e assim que voce roda a engine):**
1. Com a tool `Write`, gravar o runner num arquivo `.py` (ex `C:/tmp/disparo-<nome>/runner.py` — mesma pasta do log). Usar Write, nao heredoc, evita problema de acento/escape no Bash do Windows.
2. Com a tool `Bash`, executar: `"$PYBIN" -X utf8 "C:/tmp/disparo-<nome>/runner.py"` (onde `$PYBIN` e o `python3`/`python` detectado no pre-requisito 1; a flag `-X utf8` evita crash de encoding no Windows — ver Erros #5). No batch principal (passo 7) esse mesmo comando roda com `run_in_background`.
3. O runner faz o import da engine e chama `eng.run_batch(...)`. NAO chame `run_batch` "direto" de outro jeito — sempre via este runner rodado pelo Bash.

Runner-esqueleto — a engine ja trata: parametro `key`, fallback 12<->13 chars, conversao BRT->UTC, dedup, log incremental, retry automatico de rede:

```python
import os
from importlib.util import spec_from_file_location, module_from_spec

WORKSPACE = os.environ.get('WORKSPACE_DIR', 'G:/Meu Drive/claude-workspace/Workspace')
spec = spec_from_file_location('eng',
    f'{WORKSPACE}/claude-sync/scripts/whatsapp-central-prospeccao-batch.py')
eng = module_from_spec(spec); spec.loader.exec_module(eng)

# log_path: mesmo caminho do pre-requisito 6 (persistente, base do dedup)
log_path = r'C:/tmp/disparo-<nome-campanha>/results.jsonl'

LEADS = [
    {'deal_id': 10458, 'sdr': 'Niverton'},
    {'deal_id': 10516, 'sdr': 'Kesia'},
    # ...
]

config = {
    # Exemplo real (campanha Webinar Imposto Invisível) — adaptar textos com o usuario:
    'msg_1_func': lambda nome, sdr: (
        f"Oi {nome}, aqui é {'o' if sdr=='Niverton' else 'a'} {sdr} da Expert Integrado.\n\n"
        f"E aí, conseguiu participar da aula ontem? Os feedbacks foram muito bons "
        f"e o Eric mostrou umas coisas muito legais — espero que você tenha assistido."
    ),
    'msg_2_func': lambda empresa: (
        f"Não sei se você viu, mas a gente abriu a possibilidade de agendar um diagnóstico "
        f"gratuito pra entender como {('a ' + empresa) if empresa else 'sua operação'} "
        f"está em uso de IA e criar um mapa de como você pode implementar IA no seu negócio.\n\n"
        f"O diagnóstico é totalmente gratuito e percebi que você ainda não agendou o seu."
    ),
    'msg_3_func': lambda: (
        "Lembrando que tem uma condição especial pra quem agendar ainda esta semana: "
        "ingresso cortesia da Imersão de IA.\n\nVamos agendar?"
    ),
    'sdr_ids':     {'Niverton': 23506911, 'Kesia': 23969736},
    'sdr_dialogs': {'Niverton': '<dialog_id_niverton>', 'Kesia': '<dialog_id_kesia>'},
    'expert_id':   22805147,
    'wa_subject':  'Mensagem de ativação',
    'wa_due_time_brt':  '09:25',
    'call_subject':     'Ligar - Follow-up Webinar Imposto Invisível',
    'call_due_date':    '2026-04-29',
    'call_due_time_brt':'11:30',
    'call_duration':    '00:30',
    'vencida_subject_match': 'Imposto Invisível',  # vazio = nao buscar vencida
    'sleep_between_leads': 30,
    'msg2_offset_min': 1,
    'msg3_offset_min': 2,
    'post_chat_add_sleep': 5,
}

results = eng.run_batch(LEADS, config, log_path=log_path)
```

`results` e lista de dicts: `{deal_id, sdr, name, phone, person_id, company, ok, errs, wa_activity_id, call_activity_id, chat_add_id, msg2_id, msg3_id, vencida_id, phone_used, ...}` (schema completo em CONTRATO DA ENGINE).

**SCHEMA DO CONFIG (cada chave — origem do valor e obrigatoriedade):**

| Chave | Obrig.? | Tipo | De onde vem o valor |
|-------|---------|------|----------------------|
| `msg_1_func` | sim | `lambda nome, sdr: str` | texto definido com o usuario no passo 1.3 (assinatura fixa — ver CONTRATO DAS 3 FUNCOES) |
| `msg_2_func` | sim | `lambda empresa: str` | idem; DEVE aceitar `empresa=None` |
| `msg_3_func` | sim | `lambda: str` | idem; sem argumentos |
| `sdr_ids` | sim | `dict[str,int]` | User IDs da tabela CONSTANTES DA OPERACAO (Niverton 23506911, Kesia 23969736, etc.). Chaves = nomes usados em `LEADS[].sdr` |
| `sdr_dialogs` | sim | `dict[str,str]` | dialog_id de cada SDR, pedido ao usuario no passo 1.4 (painel ChatGuru). MESMAS chaves de `sdr_ids` |
| `expert_id` | sim | `int` | `22805147` (Expert Integrado, dono da atividade WhatsApp e da task de erro) |
| `wa_subject` | nao (default `'Mensagem de ativação'`) | `str` | tabela CONSTANTES |
| `wa_due_time_brt` | nao (default `'09:25'`) | `str HH:MM` BRT | horario retroativo do registro; passo 1 |
| `call_subject` | nao (default `'Ligar - Follow-up'`) | `str` | passo 1.5 |
| `call_due_date` | nao (default hoje) | `str YYYY-MM-DD` | passo 1.5 |
| `call_due_time_brt` | nao (default `'11:30'`) | `str HH:MM` BRT | passo 1.5 |
| `call_duration` | nao (default `'00:30'`) | `str HH:MM` | passo 1.5 |
| `vencida_subject_match` | nao (default `''` = nao busca vencida) | `str` (substring) | passo 1.7 |
| `sleep_between_leads` | nao (default `30`) | `int` seg | tabela CONSTANTES — NUNCA zerar (anti-banimento) |
| `msg2_offset_min` | nao (default `1`) | `int` min | offset da msg 2 apos chat_add |
| `msg3_offset_min` | nao (default `2`) | `int` min | offset da msg 3 |
| `post_chat_add_sleep` | nao (default `5`) | `int` seg | espera do registro async; aumentar se msgs chegarem fora de ordem (Erros #6) |

Horarios `*_brt` vao SEMPRE em BRT — a engine converte pra UTC internamente (`brt_to_utc_hhmm`). Nao passar UTC no config.

**Dry-run obrigatorio antes do piloto** (rodar o runner com `dry_run=True` — no runner troque a ultima linha por `eng.run_batch(LEADS, config, log_path=log_path, dry_run=True)` e execute via Bash como no passo 4):

```python
eng.run_batch(LEADS, config, log_path=log_path, dry_run=True)
```

Validacao: a lista impressa (`-> deal <id> <sdr>`, um por lead) bate com o combinado no passo 1. Lembre: dry-run **retorna `[]`** — a conferencia e visual pelo stdout, nao pelo valor de retorno. SE nao bater → corrigir LEADS/config e repetir o dry-run.

SE precisar de logica nova → editar a engine canonica em `claude-sync/scripts/` (e depois sincronizar o espelho da skill), nunca bifurcar inline em script ad-hoc.

### 5. Piloto (1-2 leads)

Editar o runner pra `LEADS` conter SO os leads do piloto (passo 1.8), remover a flag `dry_run`, e executar via Bash (`"$PYBIN" -X utf8 runner.py`) como no passo 4 — o piloto e uma execucao REAL, so que com poucos leads.

Validacao (verificavel por voce, sem depender do usuario): abrir o `results.jsonl` (Read) e conferir `ok:true` em cada lead do piloto. SE algum `ok:false` → ler o campo `errs` daquele lead, casar com "Erros comuns e recovery" pelo prefixo (`chat_add:`, `dialog_execute:`, `msg_2:`, `create_wa:`, etc.), corrigir e re-rodar o piloto (o dedup pula os que ja deram `ok:true`). NAO avancar pro batch com piloto falho.

### 6. Validar o piloto — parte automatica (voce) + parte humana (usuario)

**6a. O que VOCE verifica sozinho no `results.jsonl` (nao precisa do usuario) — criterio objetivo por item:**

| Item | Como conferir no `results.jsonl` do lead-piloto |
|------|--------------------------------------------------|
| Disparo saiu (chat_add) | campo `chat_add_id` presente E nao ha `chat_add:` em `errs` |
| Dialogo da SDR foi chamado | NAO ha `dialog_execute:` em `errs` (a engine chamou `dialog_execute` com sucesso) |
| Msg 2 e 3 agendadas | `msg2_id` e `msg3_id` presentes; `msg2_send_date` < `msg3_send_date` (ordem correta) E sem `msg_2:`/`msg_3:` em `errs` |
| Atividade WhatsApp concluida criada | `wa_activity_id` presente E sem `create_wa:` em `errs` |
| Atividade Call criada | `call_activity_id` presente E sem `create_call:` em `errs` |
| Reatribuicao SDR | sem `update_owner:` em `errs` (o PUT do user_id passou) |

SE qualquer coluna acima falhar → e falha objetiva, tratar como piloto reprovado (voltar ao passo 5 apos corrigir). NAO pedir opiniao humana sobre o que ja da pra medir aqui.

**6b. O que SO o usuario consegue confirmar (visual/humano — a engine nao "ve" o aparelho):** o `results.jsonl` prova que as chamadas de API tiveram sucesso, mas nao prova como a mensagem CHEGOU no aparelho do lead. Pedir ao usuario que olhe o WhatsApp/aparelho da Central e confirme os 3 itens que exigem julgamento humano:

- [ ] Encoding legivel — acentos aparecem certos no aparelho (nao `Ol??` / `aula ontem?` quebrado)
- [ ] Ordem/tempo percebidos — as 3 mensagens chegaram na ordem 1→2→3 com o respiro esperado (a API pode aceitar o agendamento e ainda assim a fila entregar fora de ordem — Erros #6)
- [ ] Dialogo da SDR realmente disparou no aparelho (o bot da SDR respondeu/entrou na conversa) — `dialog_execute` sem erro (6a) so garante a chamada, nao a entrega visivel

Enviar UMA mensagem consolidada pedindo esses 3 (nao pingue-pongue). Enquanto o usuario nao responder, aguardar em silencio (perfil do usuario — nao spamar). SE ele reprovar algum → corrigir (config/engine/dados) e repetir piloto. SE aprovar os 3 E o 6a passou → passo 7.

### 7. Batch principal

Restaurar `LEADS` no runner com a lista COMPLETA (sem `dry_run`) e executar o mesmo comando do passo 4 — `"$PYBIN" -X utf8 "C:/tmp/disparo-<nome>/runner.py"` — desta vez com `run_in_background` da tool Bash (o batch e longo). Com sleep 30s/lead, 50 leads levam ~25-40 min. O dedup pula automaticamente os leads do piloto (`ok=true` no jsonl), entao pode manter a lista inteira.

Monitorar periodicamente (Read no arquivo `.log` lateral, mesmo caminho do `results.jsonl` com sufixo `.log` — ex `C:/tmp/disparo-<nome>/results.log`): a engine grava linhas `[i/total] OK|WARN|FAIL`. `=== FIM BATCH | OK: X | WARN/ERR: Y ===` marca o termino. Falha em step individual NAO para o batch — vira entrada em `errs` e o lead segue.

### 8. Reconciliar pendentes

Ao fim do batch, varrer `results.jsonl` por `ok=false`:

- **`chat_add` falhou** (numero invalido/sem WhatsApp): a engine ja criou task "Erro de disparo" (dono Expert Integrado, done=0), moveu o deal pra stage `Lead Mapeado` (64) e adicionou label `ERRO DE DISPARO` (390). Acao: pedir ao Eric corrigir o telefone no Pipedrive → re-rodar a engine (dedup pula os ok=true).
  - **Criterio exato de "numero invalido" (nao ha regex proprio — e o veredito da API):** a engine NAO valida o telefone por regex/contagem de digitos antes de disparar. O unico criterio e comportamental: a engine tenta `chat_add` com o phone como veio do Pipedrive (apos `normalize_br`) e, se falhar, com a variante 12↔13. "Numero invalido" = AMBOS os formatos voltaram SEM `chat_add_id` (tipicamente HTTP 400 "Chat nao existe" do ChatGuru). Nao existe um outro teste numerico que voce deva aplicar por conta propria.
  - **O que comunicar ao usuario** (nao so o erro cru): informe o phone que foi tentado (`phone` no `results.jsonl`, que ja e o normalizado) e as duas variantes 12/13, mais a causa provavel (numero sem WhatsApp, faltando DDI `55`, com digitos a mais, ou prefixo invalido). Formato sugerido por lead: `deal {deal_id} — {nome} — telefone {phone} invalido (testado 12 e 13 chars, ChatGuru: "{errs do chat_add}") — corrigir telefone no Pipedrive e re-rodar`. NAO tente "consertar" o numero voce mesmo — a correcao e humana no Pipedrive.
- **Falha residual em msg_2/msg_3**: re-rodar retry com phone alternativo (fallback ja esta na engine).
- **Call atrasada** (hora `call_due_time_brt` ja passou no disparo): decisao com o usuario — aceitar (sinaliza urgencia) ou reagendar. Reagendar em batch — como o batch rodou em background, NAO confie na variavel `results` em memoria (a sessao pode ter compactado); reconstrua a partir do `results.jsonl` e chame `eng.pd_put` (assinatura em CONTRATO DA ENGINE). `due_time` vai em **UTC** (Erros #12), nao BRT. Runner de reagendamento (rodar via Bash como no passo 4):
  ```python
  import json
  creds = eng._load_creds()                     # sem args; le do path hardcoded
  for line in open(log_path, encoding='utf-8'):
      r = json.loads(line)
      if r.get('call_activity_id'):
          eng.pd_put(creds, f"/activities/{r['call_activity_id']}", {"due_time": "14:30"})  # UTC (= 11:30 BRT)
  ```

### 9. Reportar ao usuario

Template literal:

```
Campanha {nome} — resultado final
- Total de leads: {total}
- OK: {ok}
- WARN (erros parciais, disparo feito): {warn}
- Falha de disparo (chat_add): {fail} — movidos pra Lead Mapeado + label ERRO DE DISPARO
- Pendências: {deal_id — nome — erro — ação necessária, um por linha; ou "nenhuma"}
- Log: {log_path}
```

## O QUE A ENGINE FAZ POR LEAD (referencia — nao reimplementar)

1. GET deal → person_id, phone, name, company. Aplica `_clean_first_name` (filtra emails, titulos profissionais, bot greetings tipo "Opa"/"Hola"/"Quero Automatizar" — fallback `amigo(a)`)
2. GET activities pendentes → conclui a vencida cujo subject contem `vencida_subject_match`
3. PUT deal `user_id` = SDR (reatribuir)
4. `chat_add` ChatGuru (msg 1 + nome; fallback 12<->13 via `chat_add_with_fallback`; SEM `dialog_id`)
5. Sleep 5s (`post_chat_add_sleep` — registro async do ChatGuru)
6. `dialog_execute` (com fallback 12<->13)
7. `message_send` msg 2 com `send_date = +1min` (BRT, `YYYY-MM-DD HH:MM`)
8. `message_send` msg 3 com `send_date = +2min`
9. POST atividade WhatsApp concluida — SO se chat_add ok (dono Expert Integrado, due_date hoje, due_time 09:25 BRT retroativo, note = msg 1+2+3, done=1)
10. POST atividade Call follow-up — SO se chat_add ok (dono SDR, data/hora do config)
11. `chat_update_custom_fields` → `CRM__Link_pessoa` + `CRM__Link_negocio` (so se chat_add ok)
12. `note_add` com link do deal (so se chat_add ok)
13. Sleep 30s antes do proximo lead

Por que essa ordem: `chat_add` e a primeira chamada critica. Se falha, as atividades Pipedrive NAO sao criadas (antes ficavam fantasma como "Mensagem enviada" sem disparo real) e o lead vai pro log com `errs=["chat_add: ..."]` pra correcao manual + retry.

## VALIDACAO FINAL (checklist)

```
[ ] Lista de leads confirmada (origem + filtros + exclusoes)
[ ] Distribuicao SDR + dialog_id de cada um confirmados
[ ] Mensagem template (3 partes) validada com o usuario
[ ] Atividade Call confirmada (titulo, data, horario BRT, duracao)
[ ] vencida_subject_match confirmado (ou vazio)
[ ] Dry-run conferido
[ ] Piloto rodado, verificado por voce no results.jsonl (6a) e aprovado pelo usuario nos 3 itens visuais (6b)
[ ] Batch principal rodado em background e monitorado
[ ] Pendentes reconciliados (numeros invalidos, msg_2/msg_3, Calls atrasadas)
[ ] Relatorio final enviado (template do passo 9)
```

## ERROS COMUNS E RECOVERY

1. **Formato 12 vs 13 chars no numero** — Central armazena com 9 prefix (13 chars) pra alguns DDDs e sem (12) pra outros. A engine ja faz fallback automatico em `chat_add`, `dialog_execute`, `message_send`, `chat_update_custom_fields`, `note_add`: tenta o que veio do Pipedrive (apos `normalize_br`), depois o oposto. Nao tratar manualmente.
2. **`mcp__pipedrive__create_activity` bloqueado** por hook "Callback hook blocking error" no Claude Code; restart nao resolve. A engine usa REST direta (`POST /v1/activities` via `urllib.request`) — nao tentar pela tool MCP.
3. **due_time UTC vs BRT** — REST direta do Pipedrive exige UTC; a engine converte BRT→UTC (`brt_to_utc_hhmm`). Passar horarios SEMPRE em BRT no config.
4. **Encoding curl/Bash Windows** — cp1252 quebra acentos em `--data-urlencode`. A engine usa `urllib.parse.urlencode` (UTF-8 nativo) — nao disparar via curl.
5. **Print Python crasha com emoji/setas no Windows** — `→` (U+2192) e o pior. A engine ja faz `sys.stdout.reconfigure(encoding="utf-8", errors="replace")`. Em script ad-hoc: rodar com `python -X utf8`.
6. **`chat_add` e assincrono** (1-30s). `message_send` agendado pode chegar ANTES da msg 1 se a fila estiver lenta. Mitigacao: sleep 5s + `dialog_execute` separado. SE observar ordem invertida em varios leads → aumentar `post_chat_add_sleep` no config.
7. **`chat_add` com `dialog_id` nao executa o dialog se o chat ja existe** (so atualiza contato). Por isso a engine NAO passa `dialog_id` no chat_add e chama `dialog_execute` separado.
8. **`dialog_execute` pode falhar na primeira chamada** com `Diálogo não foi executado pois o contexto não foi validado`. A engine tenta phone original, depois variante; se ainda falhar, registra em `errs` e segue.
9. **HTTP 400 `key ou account_id não informado(s)`** — alguem usou `api_key` em vez de `key`. A engine ja usa `key`; se aparecer, tem codigo reescrito fora da engine — voltar pra engine.
10. **Numero invalido no Pipedrive** (sem DDI 55, prefixo estranho tipo `90347`, digitos a mais) — ChatGuru retorna 400 "Chat nao existe" mesmo apos fallback 12<->13. A engine: loga em `errs`, cria task "Erro de disparo" (dono Expert Integrado, done=0), move o deal pra `Lead Mapeado` (64) e adiciona label `ERRO DE DISPARO` (390) preservando labels existentes. Lead sai do funil ativo e fica facil de triar.
11. **Nome mal preenchido no Pipedrive** (email como nome, `Psicóloga Fátima Cruz`, `Opa`, `Mister Massas`) — `_clean_first_name` filtra: extrai segundo nome quando o primeiro e titulo (Psicóloga → Fátima), descarta emails com digitos, cai em `amigo(a)` se nao extrair nome decente. Nao tratar manualmente.
12. **Atividade Call atrasada** — ver passo 8 (reagendar com `eng._load_creds()` + `eng.pd_put`, due_time em UTC).
13. **`chat_add_id != chat_id real`** — nao usar chat_add_id pra preencher "Link do Chat" na pessoa. Pra capturar o chat_id real: `mcp__chatguru-mcp__chatguru_get_chat_link` (Playwright web scrape, requer sessao ativa via `node login.js`; latencia 10-30s). A engine NAO preenche "Link do Chat" — processo posterior, so se o usuario pedir.

## HISTORICO DE CAMPANHAS

| Data | Campanha | Leads | OK | Pendentes | Notas |
|------|----------|-------|----|-----------|-------|
| 2026-04-29 | Webinar "O Imposto Invisível do Empresário" (28/04) | 57 | 55 | 2 (numeros invalidos: Cristóvão 10524, Inês 10534) | Primeira execucao da skill — script ad-hoc em `C:/tmp/disparo-imposto/`. Engine criada apos campanha. |
