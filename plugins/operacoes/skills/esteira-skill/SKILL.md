---
name: esteira-skill
description: "Esteira completa de criação, validação e publicação de skills próprias (marketplaces ericluciano e expertintegrado). Use SEMPRE que o usuário pedir pra: criar uma skill nova, transformar um fluxo validado da sessão em skill, editar/otimizar uma skill própria existente, publicar/distribuir skill (bump, catálogo, instâncias), ou auditar a paridade do parque de skills (\"as skills estão sincronizadas?\", \"tá tudo publicado?\"). NÃO usar pra: executar uma skill existente, criar automação n8n/script avulso, editar CLAUDE.md/memory/docs que não são skill, nem mexer em skills de marketplaces de terceiros (superpowers, claude-plugins-official)."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Skill
---

# Esteira de skill — da ideia à publicação verificada

Criar a skill NÃO encerra o trabalho. Uma skill só está PRONTA quando passou pela esteira inteira: design com as rubricas da casa, golden run registrado, versão sincronizada, push auditado, instalada nas instâncias com prova e refletida no catálogo. Este é o protocolo canônico — extraído das 57 rodadas de validação (144 defeitos corrigidos, jul/2026) e das auditorias de paridade que acharam o MESMO padrão de furo três semanas seguidas.

## NUNCA

- NUNCA escrever SKILL.md sem antes ler a `writing-skills` (design genérico: estrutura, description trigger-only, progressive disclosure, economia de token) E um exemplar do padrão próprio (canônico: `plugins/comercial/skills/pipe-review/SKILL.md`).
- NUNCA description que resume o workflow — description é SÓ gatilho: frases de disparo do Eric + casos de NÃO-disparo (anti-gatilho separando skills irmãs). Máx 1024 chars.
- NUNCA path hardcoded de usuário/SO dentro da skill — derivar de `CLAUDE_PLUGIN_ROOT` via `find`, ou apontar pra memory/runbook.
- NUNCA bump de `plugin.json` sem o MESMO bump na entry do `marketplace.json` (e vice-versa) — dessincronia já fez instância instalar versão errada 2x.
- NUNCA push pra repo PÚBLICO (`Expert-Integrado/skills` é público) sem auditoria PII passar limpa: grep de secret, nomes de equipe, telefones 55*, project IDs, IP de servidor, paths `C:\Users\<nome>` — no staged E no histórico quando arquivo novo.
- NUNCA declarar "publicada/distribuída" sem prova: versão instalada conferida com `claude plugin list` em pelo menos a instância local; containers conferidos pós-restart.
- NUNCA deployar o catálogo sem OK textual do Eric (produção); NUNCA editar a lista no HTML (fonte única = `skills-data.json`).
- NUNCA usar emoji nem revelar segredo em texto literal (consumir via `op read` inline).

## SEMPRE

- SEMPRE classificar a skill por side-effect ANTES do golden run: A1 (local puro), A2 (read-only externo/custo baixo), B (side-effect reversível — roda com alvo de teste), C (irreversível/massa/prod — run PARCIAL até o gate de envio). Regra completa: `tools/golden-runs/README.md`.
- SEMPRE registrar o golden run em `tools/golden-runs/<skill>.golden.md` + linha na `tools/golden-runs/FILA.md` NO MESMO ciclo da criação — skill fora da FILA é skill invisível pra validação.
- SEMPRE que a skill roda comando: embutir as regras de ambiente no corpo (Git Bash POSIX, python por path absoluto/capacidade, `curl --ssl-no-revoke`, temp fora do sync de nuvem).
- SEMPRE blocos `## NUNCA` e `## SEMPRE` logo após o resumo (o pre-commit hook avisa; tratar o aviso como bloqueio).
- SEMPRE repo default = `ericlucianoferreira/skills` (lab); `Expert-Integrado/skills` só com pedido explícito do Eric.
- SEMPRE que citar tool MCP: conferir nome e parâmetros contra o código-fonte do MCP (tool alucinada é defeito de alta frequência) e manter `allowed-tools` em sincronia com o corpo.

## Pré-requisitos

| Item | Onde | Se faltar |
|---|---|---|
| writing-skills (design) | `~/.claude/skills/writing-skills/SKILL.md` + `anthropic-best-practices.md` | seguir só o exemplar pipe-review e avisar no report |
| Exemplar canônico | `plugins/comercial/skills/pipe-review/SKILL.md` (neste repo) | qualquer skill recente com golden run APROVADO na FILA |
| Protocolo de golden run | `tools/golden-runs/README.md` + `FILA.md` (neste repo) | parar e avisar — validação sem protocolo não conta |
| Pipeline do catálogo | memory `catalogo-skills-deploy.md` (repo claude-stack) | localizar `atualizar-catalogo.cjs` citado nela |
| Runbook das instâncias VPS | memories `ssh-vps-hostinger-do-pc` + `vps-claude-plugins-nao-compartilhado` | pular containers e deixar pendência explícita no report |

## Modo A — criar/editar skill (fluxo completo)

1. **Triagem.** Novo ou edição? Repo/plugin alvo? Checar duplicata: grep do nome/função no catálogo (`skills-data.json`) e nos `plugins/*/skills/` dos 2 repos. Se o fluxo nasceu na conversa, extrair da própria sessão os passos, tools usadas e correções que o Eric fez (elas viram regras NUNCA/SEMPRE).
2. **Design.** Ler os pré-requisitos de design (writing-skills + exemplar). Produzir SKILL.md com: frontmatter `name` + `description` trigger-only com NÃO-trigger; `allowed-tools`; blocos NUNCA/SEMPRE; tabela de pré-requisitos com fallback; contrato de cada script (entrada/saída/efeitos/validação — o executor não deve precisar ler o fonte); passos numerados sem inferência (critério verificável em toda decisão, origem declarada de todo valor); `reference/` só quando o corpo passar de ~150 linhas.
3. **Validação.** Classificar A1/A2/B/C. Golden run seguindo SÓ o texto da skill (desvio do executor = achado; defeito = fix + re-run no mesmo ciclo). Classe B/C: parar no gate de side-effect e pedir OK. Registrar `<skill>.golden.md` + linha na FILA.
4. **Versão.** Bump SINCRONIZADO: `plugin.json` do plugin E entry no `marketplace.json` (mesma versão), descrição do plugin no marketplace citando a skill nova. Conferir com diff antes do commit.
5. **Publicação.** Repo público → auditoria PII (bloco NUNCA) antes do push. Commit atômico (stage por path, nunca `add -A`) + push conforme regra de push do repo.
6. **Distribuição com prova.** Local: `claude plugin marketplace update <mkt>` + `claude plugin update <plugin>@<mkt>` + conferir versão no `claude plugin list`. Containers VPS: atualizar em CADA um (plugins não compartilhados) via runbook, reiniciar com o script seguro do runbook e conferir versão PÓS-restart. Notebook: deixar task/mailbox pra instância de lá (não é alcançável daqui).
7. **Catálogo.** Adicionar/atualizar a entrada no `skills-data.json` (fonte única: desc leiga, trigger, contexts, contadores) e rodar o script do catálogo em modo render. O DEPLOY das 2 páginas é produção: preparar e pedir OK.
8. **Report.** Uma mensagem: versão final, classe, resultado do golden run, prova de instalação por instância, status do catálogo, pendências gated. Se a entrega tem task no Brain, fechar com outcome.

## Modo B — auditoria de paridade do parque

Quando o pedido for "tá tudo sincronizado/publicado?", rodar as 5 checagens e reportar só os desvios:

1. **Versões internas:** pra cada plugin dos 2 repos, `plugin.json.version` == entry no `marketplace.json`? (pull antes).
2. **Drift de instâncias:** versão instalada (`claude plugin list` local + containers via runbook) == `marketplace.json`? Plugin novo do repo não instalado? Plugin removido ainda instalado (failed to load)?
3. **Catálogo:** diff dos nomes em `plugins/*/skills/` dos 2 repos contra `skills-data.json` — faltantes E órfãs.
4. **FILA:** todo SKILL.md criado desde o último fechamento (`git log --diff-filter=A --name-only`) tem linha na FILA?
5. **Sujeira:** `git status` + commits não pushados nos 2 repos.

Achou desvio → corrigir pelo Modo A (passos 4-7) no mesmo ciclo; deploy do catálogo continua gated.
