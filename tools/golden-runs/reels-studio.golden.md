# Golden run — marketing:reels-studio

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** ONBOARDING COMPLETO do zero (nenhum dos 3 config existia) + pipeline inteiro, na máquina do Eric. Respostas roteirizadas do diretor: avatar `eric-escritorio`, voz clonada ElevenLabs `eric-casual` (branch opcional), fundo default `#0A0E1A`, elenco 3D dark+âmbar com mascote robô, CTA (0.4) = NÃO, gancho/cold open (etapa 7) = NÃO, sem música. Roteiro real de 266 chars ("Seu vendedor odeia preencher CRM...", gancho polêmico na 1ª frase), confirmado antes da etapa 3.
- **Classificação: B-custo, custo mínimo consciente:** 3 imagens gpt-image-2 (~US$0,48) + HeyGen 15s (~R$4,50) ≈ **R$7,50**.
- **Resultado: APROVADO.** `final.mp4` real: 15,1s, 1080x1920 (9:16), apresentador INTEIRO em cima e b-roll na faixa de baixo com os 3 takes distribuídos (frames ini/meio/fim conferidos com Read), áudio na voz clonada (-21,9 dB mean), legenda do post na voz da marca. Onboarding gravou `chaves.env` via 1Password sem valor passar pelo chat (gitignore conferido: NADA de config/saída entrou no git). Artefatos: `Downloads/reels-studio-crm.mp4` + `reels-studio-crm-legenda.md`.

## Achados e fixes (marketing 2.13.15)

1. **B-roll com texto renderizado e typos, sem orientação na skill (DEFEITO, reproduzido nas 3 cenas).** O gpt-image-2 renderizou texto PT espontâneo em TODAS as cenas (UI de chat, kanban CRM, funil) com typos visíveis: "CONQUISTO" (por Conquistado), "Qual o prazo pará envio". A skill irmã (`criar-reel`/`visual-broll-thumb.md`) manda `no text, no words, no logos` nos frames; a reels-studio não tinha regra nenhuma — o executor literal aprova cena bonita sem procurar typo. Fix: etapa 2 agora manda `no readable text, no words` na `acao`/`extra` por padrão (texto só com pedido explícito, com conferência letra a letra) + checklist de aprovação da etapa 4 ganhou "conferir typo em texto renderizado + consistência do mascote".

## Observações (não-defeito)

- **Estimativa de duração da etapa 2 cravou:** 266 chars ÷ 17,8 = 14,9s estimados vs 15,08s reais do avatar. A régua emprestada do `simular_custo.py` do criar-reel é confiável.
- **Edge coberto pelo design:** 3 takes × 5s = 15,0s < avatar 15,08s — o `4_montar.py` estende a faixa clonando o último frame (`tpad`), avatar é o mestre da duração. Sem corte de fala.
- **Retry do `2_broll_imagens.py` funcionou em produção:** c02 levou 502 da OpenAI e passou na 2ª tentativa (3 tentativas, 15s de espera). As 3 cenas geram em paralelo (4 workers).
- Voz ElevenLabs no `1_avatar_heygen.py` (branch opcional) funcionou de primeira — o script já manda `input_text` junto (o gotcha "word time metadata" está tratado).
- `PY` resolveu pro python3 da Store (3.14) e funcionou — scripts são stdlib+ffmpeg (Pillow presente pro gancho.py, que não rodou). Mesma premissa de resolução caducada das irmãs; aqui inofensiva.
- Higiene: `cenas.json` e `roteiro.txt` (working files não-ignorados) removidos ao fechar; `config/*.json` + `chaves.env` ficam como config legítima da máquina (gitignorados); `saida/` gitignorada.
