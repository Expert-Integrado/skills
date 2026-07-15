---
name: reel-para-post
description: Transforma um reel do Instagram que performou em post expandido do blog Expert Integrado, com transcrição (Whisper local), passo a passo acionável e embed do reel via VideoEmbed. O reel é o hook, o post é a profundidade permanente. TRIGGER quando Eric mandar link de reel pedindo "vira post", "expande esse reel", "reel pro blog", ou quando a análise semanal apontar reel acima da mediana. NÃO usar para criar reel (criar-reel), pesquisar concorrentes (ig-competitor-research), nem post sem reel de origem (agente-draft-blog).
allowed-tools: Read, Write, Bash, Grep, Glob, WebFetch
---

# reel-para-post — reel vencedor vira ativo permanente

O reel morre em 48h; o post acumula pra sempre. Todo reel que performar (acima da mediana de views/saves dos últimos 10, ou decisão do Eric) vira post satélite que EXPANDE o conteúdo. Gatilho v1: manual (Eric manda o link).

## NUNCA

- NUNCA publicar direto — o output segue o pipeline normal do blog: draft -> `agente-revisor-blog` (triagem 3 cores) -> aprovação -> `agente-publisher-blog`.
- NUNCA só transcrever — o reel é básico de propósito; o post entrega a profundidade que não coube em 60s (passo a passo, ferramenta, número, armadilha).
- NUNCA violar a Camada 0 do protocolo (`docs/protocolo-conteudo.md` do repo do blog): fontes = o próprio reel + posts publicados + conhecimento público. Nada de Brain/CRM/transcrição interna.
- NUNCA hero com gpt-image-1 — se o frame do reel não servir de hero, gerar com `gerar-hero-blog` (gpt-image-2).

## SEMPRE

- SEMPRE acentuação correta do português em todo texto externo (título, corpo do post, legenda, mensagem).
- SEMPRE seguir o pipeline normal do blog até o fim: draft -> `agente-revisor-blog` (triagem 3 cores) -> aprovação -> `agente-publisher-blog`. Nunca pular etapa mesmo com pressa.
- SEMPRE incluir o embed do reel (`VideoEmbed`) na posição correta: depois da resposta direta, antes do aprofundamento.
- SEMPRE, ao fechar o ciclo, sugerir ao Eric/social a UTM completa na bio/caption do reel (`?utm_source=instagram&utm_medium=reel&utm_campaign=reel-expandido`) — a sugestão é obrigatória mesmo que a execução seja dele.
- SEMPRE respeitar a Camada 0 do protocolo (`docs/protocolo-conteudo.md`): fontes só o próprio reel + posts publicados + conhecimento público, nunca Brain/CRM/transcrição interna.

## Fluxo

1. **Input**: link do reel. Baixar o vídeo (yt-dlp funciona pra Instagram público; se falhar, pedir o arquivo ao Eric).
2. **Transcrever**: Whisper local (faster-whisper GPU; fallback: caminho absoluto do Python 3.12 + whisper CPU). Gotcha make-or-break do faster-whisper no Windows: prepender os bin dirs do pacote `nvidia` no `PATH` ANTES de `from faster_whisper import WhisperModel` (senão `cublas64_12.dll` não carrega e trava/erra no primeiro transcribe); usar `language='pt', vad_filter=True, beam_size=1, condition_on_previous_text=False`. Snippet completo na memória `faster-whisper-gpu.md` (no PC está no memory do projeto `c--repos`). Medido na RTX 3070: ~7-12x realtime.
3. **Extrair a tese**: qual é A afirmação do reel? Ela vira o título do post (orientado a busca) e a resposta direta do primeiro parágrafo (pirâmide invertida GEO).
4. **Expandir**: chamar o padrão do `agente-draft-blog` com outline derivado: H2s = as perguntas que o reel provoca mas não responde; passo a passo acionável; 1 exemplo concreto; FAQ. Tags `objecao:`/`setor:` quando couber.
5. **Embed**: incluir o reel no MDX:
   ```mdx
   import VideoEmbed from '../../components/VideoEmbed.astro';
   <VideoEmbed type="instagram" url="<link do reel>" title="<título curto>" />
   ```
   Posição: depois da resposta direta, antes do aprofundamento (quem veio do reel reconhece; quem veio da busca ganha contexto).
6. **Pipeline normal**: revisor (com triagem) -> aprovação -> publisher. `related`: linkar posts do mesmo pilar.
7. **Fechar o ciclo**: sugerir editar a bio/caption do reel com o link do post (`?utm_source=instagram&utm_medium=reel&utm_campaign=reel-expandido`) — ação do Eric/social.
