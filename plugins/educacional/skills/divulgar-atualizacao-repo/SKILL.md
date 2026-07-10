---
name: divulgar-atualizacao-repo
description: Divulga uma atualizacao de produto/repo (WhatsApp Agent, Instagram Agent, etc.) no padrao Expert - audita e atualiza o onboarding do repo, atualiza a pagina publica GitHub Pages, publica, e manda no grupo da Mentoria Automacoes Inteligentes o anuncio bonitao com emoji + comentario do Eric na voz dele (voice guide). TRIGGER quando Eric disser "divulga a atualizacao do [repo]", "anuncia na mentoria", "manda o padrao de atualizacao", "avisa a mentoria da atualizacao". NAO disparar sozinho apos commits - so com pedido explicito.
---

# divulgar-atualizacao-repo — Padrao de divulgacao de atualizacao

Fluxo validado em 10/07/2026 com o WhatsApp Agent (commits cf17f32..75123a6 + anuncio
no grupo). A divulgacao tem SEMPRE 3 camadas, nesta ordem: onboarding correto ->
pagina publica atualizada -> anuncio no grupo.

## NUNCA

- Nunca anunciar feature que nao esta pushada e deployada em prod. Anuncio vem DEPOIS
  da entrega verificada, nunca junto.
- Nunca dar push em repo publico sem auditoria de PII no diff (tokens, telefones 55*,
  nomes de familia/equipe, project IDs, voice_id do Eric, paths C:\Users\Eric Luciano).
  Dado pessoal do Eric NUNCA vai pro repo (separacao codigo vs dado).
- Emoji SO na mensagem-anuncio (artefato que o Eric pediu com emoji). O comentario do
  Eric segue o voice guide: zero emoji, sem em-dash, burst curto.
- Nunca enviar o comentario do Eric sem get_voice_guide + check_message no texto final.
  Warning de msg-monolito = quebrar em burst de 2 antes de enviar.
- Nunca mandar em outro grupo: o destino e o grupo da mentoria (abaixo). Conferir o
  nome na resposta do send.

## Destino

- Grupo: "Mentoria Automacoes Inteligentes" — chat_id `120363142835610477-group`,
  instance `pessoal`, via MCP whatsapp-agent (tool `send`, agent_name = maquina).

## Fluxo

### 1. Levantar o delta
`git log` do repo desde o ultimo anuncio (ou o que a sessao acabou de entregar).
Separar o que e VISIVEL pro aluno/usuario (features, velocidade, correcao que ele sentia)
do que e interno (refactor, indice). So o visivel entra no anuncio.

### 2. Onboarding primeiro
O aluno instala pelo onboarding — feature nova com config nova TEM que constar:
- README do repo: pre-requisitos, tabela de tools, secoes de uso.
- Skill `/setup` do repo (`.claude/skills/setup/SKILL.md`): passos, .env, secrets.
- Teste mental: instalacao do zero com o delta novo quebra em algum passo? Se sim,
  corrigir antes de qualquer anuncio (ex: ElevenLabs faltava no setup do whatsapp-agent
  e o send_voice quebraria em instalacao nova).

### 3. Pagina publica (GitHub Pages)
- Repo publico: `docs/index.html` do proprio repo. Repo privado: hub
  `expert-integrado.github.io` (org free nao tem Pages em privado).
- Atualizar as secoes tocadas pelo delta (features/tools/notas). Nao reescrever a
  pagina inteira por release — nota nova > redesign.
- Auditoria PII no diff -> commit -> push na main (Pages redeploya sozinho).

### 4. Anuncio no grupo (mensagem 1 — com emoji)
Estrutura do padrao:
- Titulo: `🚀 *Atualização no [Produto]!*`
- 3 a 5 bullets com emoji tematico, cada um com *titulo em negrito* + 1 frase de
  beneficio na linguagem do aluno (nada de nome de coluna/commit).
- Link da pagina: `📄 Página de como funciona + onboarding atualizados: <URL Pages>`
- Fechamento: como atualizar a instancia (ex: git pull + deploy das functions /
  rodar a skill /setup de novo).

### 5. Comentario do Eric (mensagens 2-3 — voz dele)
- `get_voice_guide` + redigir no registro dele (casual, "vcs", direto, sem hype).
- Conteudo: madrugada/dia produtivo + o que da pra fazer agora em linguagem falada +
  chamada pra atualizar.
- `check_message` no texto final; score < 7 = regenerar; warning de tamanho = burst de 2.
- Enviar logo apos a mensagem 1, mesma instance.

### 6. Report
Reportar ao Eric: commits, URL da pagina, ids das mensagens enviadas. Se algo ficou
de fora do anuncio de proposito (feature interna), dizer o que e por que.
