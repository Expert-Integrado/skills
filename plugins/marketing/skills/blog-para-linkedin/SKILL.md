---
name: blog-para-linkedin
description: Deriva de um post do blog Expert Integrado um post NATIVO de LinkedIn na voz do Eric (perfil pessoal), com hook na primeira linha, corpo curto e link do blog no primeiro comentário com UTM. Publicação sempre manual/aprovada, nunca automática. TRIGGER quando Eric pedir "post de LinkedIn do artigo X", "deriva pro LinkedIn", "fila do LinkedIn da semana", "linkedin do blog". NÃO usar para post de Instagram (criar-reel/carrossel-studio) nem para escrever post novo do blog (agente-draft-blog).
allowed-tools: Read, Grep, Glob, Bash, mcp__whatsapp-agent__get_voice_guide, mcp__whatsapp-agent__check_message
---

# blog-para-linkedin — derivação nativa pro perfil do Eric

Canal decidido em 05/07/2026: **perfil pessoal do Eric** (é onde mora a entidade, a autoridade e o G4). Cadência alvo: 2-3 posts/semana. Fila priorizada pelo índice comercial (`plugins/comercial/skills/blog-comercial/data/indice.json`: posts de maior força primeiro) + posts novos do lote.

## NUNCA

- NUNCA publicar automaticamente — o output é DRAFT; quem posta é o Eric (copia-cola) ou o Chrome com aprovação 1 a 1.
- NUNCA link no corpo do post — link do blog vai no PRIMEIRO COMENTÁRIO (o feed pune link externo no corpo). O draft entrega corpo + comentário separados.
- NUNCA em-dash (—), `tu/teu/tua`, emoji, hype ("revolucionário", "game changer", "disruptivo", "mindset"), abertura "Olá"/"Bom dia, tudo bem?".
- NUNCA republicar o texto do blog — o post de LinkedIn é NATIVO: mesma tese, escrita nova, formato de feed.
- NUNCA dado interno da Expert (número de faturamento, cliente sem consentimento) — as regras do protocolo do blog valem aqui (Camada 0).
- NUNCA mais de 1 CTA por post.

## SEMPRE

- SEMPRE rodar `get_voice_guide` + `check_message` no texto final ANTES de fixar o draft (regra hard da voz do Eric; se o MCP não estiver disponível na máquina, ler `eric-voice.md` da memória e marcar o draft como "pendente check_message").
- SEMPRE UTM no link do comentário: `https://blog.expertintegrado.com.br/blog/<slug>?utm_source=linkedin&utm_medium=social&utm_campaign=blog-derivado`.
- SEMPRE acentuação correta (texto externo).
- SEMPRE variar o formato entre posts da semana (história pessoal / dado + leitura / posição contrária / bastidor) — 3 posts iguais seguidos viram papel de parede.

## Anatomia do post

1. **Hook (1ª linha, antes do "ver mais")**: a afirmação mais forte do post do blog, em 1 frase seca. Sem "Você sabia?".
2. **Corpo (600-1300 caracteres)**: 3-6 parágrafos de 1-2 linhas. A tese do post com UM exemplo concreto (número, caso, bastidor). Quebra de linha generosa.
3. **Fechamento**: 1 pergunta genuína pro leitor OU 1 posição seca. Nada de "concorda? comenta aí" genérico.
4. **1º comentário (entregue junto)**: "Escrevi a versão completa disso aqui: <link com UTM>".

## Fluxo

1. Input: slug do post (ou "fila da semana" — aí escolher os próximos da fila por força do índice, pulando já-derivados).
2. Ler o MDX do post no repo do blog (`C:\repos\expertintegrado-blog\src\content\blog\<slug>.mdx`).
3. Escrever o draft nativo (anatomia acima) na voz do Eric.
4. `check_message` no texto; corrigir violações antes de apresentar.
5. Entregar: corpo do post em code block + comentário em code block separado + horário sugerido (ter-qui 8h-9h30 BRT prioriza alcance B2B).
6. Registrar a derivação em `G:\Meu Drive\claude-workspace\Workspace\Marketing\linkedin-fila.md` (criar se não existir: tabela slug | data draft | data publicado | link do post no LinkedIn).
