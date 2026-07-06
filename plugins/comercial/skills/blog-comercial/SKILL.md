---
name: blog-comercial
description: Transforma objeção de lead em follow-up com conteúdo. MODO CONSULTAR (padrão) busca no índice objeção->setor->post do blog e devolve o link certo com UTM do deal + sugestão de mensagem curta + nota no Pipedrive. MODO CRIAR redige post novo do SETOR quando não existe post forte (nunca sobre o lead), com guardrails LGPD e aprovação antes de publicar. TRIGGER quando o usuário disser "lead travou com objeção X", "tem post sobre Y?", "manda conteúdo pro lead", "cria um post pra essa objeção", "blog comercial", ou citar objeção de lead pedindo material. NÃO usar para follow-up geral de pipe (fup-inteligente), prospecção de lead novo (prospecta-lead), nem pauta editorial de marketing (marketing:criar-post-blog).
allowed-tools: Read, Write, Bash, Grep, Glob, mcp__pipedrive__search_deals, mcp__pipedrive__get_deal, mcp__pipedrive__create_note, mcp__pipedrive__pipedrive_write
---

# blog-comercial — objeção de lead vira conteúdo de follow-up

Regra da casa (decisão Eric 05/07/2026): **apareceu objeção de lead, procura post que responde; não existe post forte, nasce post novo.** O post é sempre sobre o SETOR do lead, nunca sobre o lead.

## NUNCA

- NUNCA citar nome, empresa, números ou qualquer dado do lead dentro de um post — o post fala do SETOR. Violação disso é quebra de LGPD e de confiança.
- NUNCA usar case real nomeado sem consentimento registrado (default: anonimizado). Exemplo hipotético é permitido SE marcado como hipotético no texto.
- NUNCA publicar direto: modo criar termina em draft + aprovação (Eric ou gestor comercial). Vendedor não deploya.
- NUNCA gerar imagem hero com gpt-image-1 — hero é SEMPRE gpt-image-2 (via skill marketing:gerar-hero-blog). Sem a skill/credencial disponível, deixar o post sem hero e sinalizar no handoff.
- NUNCA mandar mais de 1 post por contato no mesmo follow-up.
- NUNCA recomendar post com força 1-2 para follow-up (é material de SEO, não arma comercial).
- NUNCA copiar título do post como mensagem — a mensagem é do vendedor, curta, com gancho no que o lead disse.

## SEMPRE

- SEMPRE montar o link com UTM do deal: `{base_url}{slug}?utm_source=whatsapp&utm_medium=comercial&utm_campaign=objecao&utm_content=deal-{DEAL_ID}`. Sem deal identificado, usar `utm_content=sem-deal` e avisar que a atribuição fica cega.
- SEMPRE registrar nota no deal do Pipedrive após a recomendação: objeção + slug enviado + data. Se `create_note` estiver desabilitada, usar `pipedrive_write({action:"create_note", params})`.
- SEMPRE mostrar as `ressalvas` do post ao vendedor (números sem fonte, dados a confirmar) — ele não pode prometer em call o que o post não sustenta.
- SEMPRE acentuação correta do português em todo texto externo (mensagem, post, nota).
- SEMPRE que criar post novo: tags `objecao:<slug>` e `setor:<slug>` no frontmatter (alimentam o índice) + rodar o scanner `scripts/check-sensivel.py` do repo do blog antes de commitar.

## Dados da skill

`<skill-dir>` = diretório deste SKILL.md (derivar do path real; nunca hardcodar — varia por máquina/instalação).

- `<skill-dir>/data/indice.json` — índice completo: 205 posts com `objecoes`, `setores`, `forca` (1-5), `quando_mandar`, `ressalvas`, mais `base_url` e `utm_padrao`. Fonte canônica para o MODO CONSULTAR.
- `<skill-dir>/templates/post-objecao.md` — template do MODO CRIAR.

Taxonomia de objeções (usar exatamente estes slugs): `preco`, `meu-setor-e-diferente`, `sem-equipe-tecnica`, `ia-erra`, `cliente-odeia-robo`, `sem-tempo`, `ja-tentei-nao-funcionou`, `medo-dados-lgpd`, `equipe-vai-resistir`, `roi-incerto`, `da-pra-fazer-sozinho`, `empresa-pequena-demais`, `perder-controle`, `momento-errado`.

## MODO CONSULTAR (padrão)

Input mínimo: a objeção (nas palavras do lead serve). Ideal: objeção + setor + deal.

1. Mapear a fala do lead para 1 objeção da taxonomia (ex.: "no ramo de farmácia isso não funciona" = `meu-setor-e-diferente`, setor `farmacia`).
2. Ler `data/indice.json`. Filtrar posts que têm a objeção, ordenar por `forca` desc. Se o lead tem setor identificado e existe post do setor com força >=3, ele passa na frente do genérico.
3. Se não há deal_id informado, tentar `search_deals` pelo nome do lead/empresa e confirmar com o usuário.
4. Apresentar ao vendedor: top 1-3 posts com título, força, `quando_mandar`, RESSALVAS, e o link já montado com UTM do deal. Junto, 1 sugestão de mensagem curta (2-3 linhas, gancho no que o lead disse, link no fim — modelos no playbook `blog-playbook-follow-up.md` do Processo Comercial).
5. Após o vendedor confirmar o envio (o envio é dele, no WhatsApp dele ou via fup-inteligente): registrar nota no deal: `Blog comercial: objeção <slug-objeção> -> post <slug> enviado em <data>`.
6. **Nenhum post com força >=3 para a objeção (ou objeção+setor)?** Oferecer o MODO CRIAR.

## MODO CRIAR (quando o índice não resolve)

Pré-condição: aprovador disponível (Eric ou gestor comercial). O output é DRAFT, nunca publicação direta.

1. Coletar: setor do lead, a objeção nas palavras dele, contexto que ajude (porte, canal de venda). NADA disso identifica o lead no texto final.
2. Redigir o post seguindo `templates/post-objecao.md` (estrutura de 6 blocos). Título orientado a busca (ex.: "IA para farmácias: o que muda com a regulação"). Frontmatter completo: `pillar` correto, `tipo: satelite`, `tags: ["objecao:<slug>", "setor:<slug>"]`, `status: draft`.
3. Rodar o scanner do repo do blog: `python scripts/check-sensivel.py <arquivo>` (repo `expertintegrado-blog`). Qualquer flag = corrigir antes de seguir.
4. Hero: rodar a skill `marketing:gerar-hero-blog` (gpt-image-2). Sem credencial na máquina atual: seguir sem hero e registrar no handoff.
5. Entrega conforme a máquina:
   - COM acesso git ao repo do blog: branch `post-objecao/<slug>` + commit + PR para `ericlucianoferreira/expertintegrado-blog` (merge e deploy são do aprovador).
   - SEM acesso git (instância de vendedor): salvar o `.mdx` completo e entregar ao aprovador (Telegram/Zoom) com o pedido de publicação.
6. Depois de publicado, o novo post entra no índice (as tags `objecao:`/`setor:` garantem isso na próxima regeneração) e o vendedor recebe o link com UTM pra enviar.

## Atualização do índice

O índice empacotado é um snapshot (05/07/2026). Quando um lote novo de posts for publicado, regenerar: os posts novos carregam tags `objecao:`/`setor:` no frontmatter; mesclar ao `data/indice.json` e commitar a skill. (Enquanto não houver regeneração, o MODO CRIAR pode duplicar tema de post muito novo — antes de criar, conferir com `Grep` no repo do blog se já existe post com a tag da objeção+setor.)
