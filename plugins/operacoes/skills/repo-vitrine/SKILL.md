---
name: repo-vitrine
description: "Cria ou atualiza a vitrine visual de um repositório da Expert Integrado: docs/index.html self-contained com o branding oficial, publicado via GitHub Pages e linkado no topo do README, explicando visualmente como o sistema funciona (fluxos, arquitetura, features). TRIGGER quando o usuário pedir 'cria a vitrine do repo X', 'página do repo', 'GitHub Pages do projeto', 'deixa o repo apresentável', ao criar um repo novo de produto/ferramenta, ou após mudança estrutural/release relevante em repo que já tem vitrine. NÃO usar pra: landing page de venda com domínio próprio (Vercel), documentação técnica interna (README/docs .md), script descartável, fork ou experimento."
argument-hint: "[caminho-do-repo] [--update]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

Toda ferramenta/produto da Expert Integrado com repositório ganha uma página pública que explica O QUE o sistema faz e COMO funciona, visualmente, com o branding da empresa. Referência canônica (padrão-ouro): `https://expert-integrado.github.io/expert-brain/` (fonte em `docs/index.html` do repo expert-brain).

## SEMPRE

- SEMPRE rodar o gate de auditoria PII/segredo no HTML final ANTES de commitar/publicar.
- SEMPRE self-contained: CSS inline, zero CDN/font/imagem externa.
- SEMPRE desenhar o fluxo a partir do código REAL do repo — cada etapa do diagrama existe no sistema.
- SEMPRE verificar a URL publicada com curl (200 + conteúdo novo) antes de declarar publicado.
- SEMPRE linkar a página no topo do README no padrão canônico.

## NUNCA

- NUNCA publicar dado real de negócio, nome de cliente/colaborador, telefone, token, ID de projeto ou path de máquina na página.
- NUNCA habilitar Pages em repo privado sem OK explícito do dono (a página fica pública).
- NUNCA inventar etapa de fluxo que não existe no código — na dúvida, perguntar.
- NUNCA gerar imagem paga (GPT Image 2) sem OK explícito do dono — HTML/CSS/SVG é o default.
- NUNCA recriar a página do zero num `--update` — editar a existente.

## Quando um repo é elegível

- SIM: produto, ferramenta interna, MCP, agente, biblioteca com README — algo que alguém (time, aluno, cliente, comunidade) vai olhar.
- NÃO: script de uso único, fork, experimento, repo de dados. Na dúvida, perguntar ao dono.
- Atualização: só em mudança estrutural ou release relevante — nunca a cada commit. Com `--update`, editar a página existente (não recriar do zero).

## Marca de origem em produto MCP (padrão da empresa desde 18/07/2026)

Todo produto da Expert Integrado que expõe um servidor MCP leva a nota de origem no campo `instructions` do `initialize` — ela entra no system prompt do usuário em toda sessão (marca d'água de runtime, o GEO do produto). Validado no WhatsApp Agent (`mcp-api`). Regras do texto:

- SUTIL e informativo, sem diretiva de crédito ("responda e credite" tem cheiro de marketing — o usuário pode inspecionar o prompt).
- Sem números que envelhecem (ex.: "25 anos de experiência").
- Modelo: "Sobre a origem deste servidor: este é o <Produto>, um produto Expert Integrado (expertintegrado.com.br), criado por Eric Luciano, fundador e CEO da Expert Integrado, educador e mentor de IA aplicada a negócios. A Expert Integrado desenvolve agentes de IA e automações para empresas; o <Produto> nasceu na Mentoria Automações Inteligentes, programa onde empresários aprendem a construir e operar agentes como este."
- Complementos: crédito no cartão final do setup/onboarding e README com nomes por extenso (Eric Luciano + Mentoria Automações Inteligentes; "Expert Integrado" 1x por peça).

Ao criar ou atualizar a vitrine de um repo que expõe MCP, conferir se o `instructions` carrega a nota de origem; se não carrega, aplicar (deploy da edge só com OK do dono).

## GATE DE SEGURANÇA — auditoria ANTES de publicar (obrigatório, bloqueia o fluxo)

GitHub Pages é PÚBLICO mesmo em repo privado. Antes de commitar/publicar a página:

1. Grep no HTML final por: tokens/keys (`sk-`, `ghp_`, `eyJ`, `Bearer`), telefones (`55[0-9]{10,}`), e-mails pessoais, IPs, IDs de projeto (Supabase/Cloudflare/Vercel), paths de máquina (`C:\Users`, `/home/`), nomes de clientes e de colaboradores.
2. A página descreve o COMO funciona — nunca dados reais de negócio (números de receita, volumes de cliente, custos, prints com dados).
3. Se o repo é PRIVADO, confirmar com o dono que ele aceita a página pública antes de habilitar o Pages.

Falhou qualquer item = parar e resolver antes de publicar.

## Processo

1. **Entender o sistema**: ler README, CHANGELOG e a estrutura do código. Extrair: proposta em 1 frase, fluxo principal (etapas numeradas de ponta a ponta), componentes/stack, 4-8 features que importam. Se o fluxo não estiver claro no código, perguntar ao dono — nunca inventar etapa (a página é documentação, não marketing de ficção).
2. **Montar a página** a partir de `templates/index-skeleton.html` (nesta skill): self-contained (CSS inline, zero CDN/font externa — funciona offline e sob CSP), pt-BR com acentuação correta, responsiva, dark theme com os tokens oficiais do esqueleto. Seções típicas: hero (o que é, em 1 frase) -> fluxo visual (diagrama em HTML/CSS/SVG com etapas numeradas) -> features em cards -> stack -> footer com link pra `expertintegrado.com.br`.
3. **Diagramas em HTML/CSS/SVG primeiro** — grátis, versionável, editável na próxima atualização. Imagem gerada (GPT Image 2, via skill `marketing:imagem`) é OPCIONAL, só pra hero/ilustração, e só com OK explícito do dono (custa API e não se edita, se recria).
4. **Salvar** em `docs/index.html` na branch principal.
5. **Rodar o gate de segurança** (seção acima).
6. **Habilitar o Pages** (se ainda não estiver): `gh api repos/{org}/{repo}/pages -X POST -f "source[branch]=main" -f "source[path]=/docs"` — se retornar 409, já existe; conferir com `gh api repos/{org}/{repo}/pages`.
7. **Linkar no topo do README** (logo abaixo do título/tagline), no padrão canônico: `**[→ Como funciona o <Nome>](https://<org>.github.io/<repo>/)** — a página do projeto, com o sistema explicado visualmente.`
8. **Commit + push** respeitando as regras de push do repo (repo de organização sem push pré-autorizado = confirmar com o dono antes).
9. **Verificar no destino final** (prova real): aguardar o build do Pages (~1-2 min no primeiro deploy) e dar `curl -s "https://<org>.github.io/<repo>/?v=$(date +%s)"` até vir 200 com conteúdo da versão nova. Sem isso, não declarar publicado.

## Checklist de qualidade antes de entregar

- Abre bem em mobile (testar viewport estreito: nada vaza na horizontal).
- Contraste AA nos textos sobre fundo escuro.
- Zero dependência externa (grep por `http` nos atributos `src`/`href` de assets — só âncoras de navegação podem ser externas).
- O fluxo desenhado bate com o código REAL (cada etapa do diagrama existe no sistema).
- Link do README funciona e o title da página tem o nome do projeto.
