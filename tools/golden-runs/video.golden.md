# Golden run — marketing:video

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** pedido roteirizado SEM script pronto ("faz um vídeo vertical curto com meu avatar explicando por que responder lead rápido importa") — exercita Passo 0 (redigir rascunho sem inventar número/preço), humanização FORTE (eric-casual default: cê/tá/pra + drop do R em falá), gate de confirmação (resposta roteirizada "Confirma" documentada) e Passos 2-6 reais: ElevenLabs turbo_v2_5 → validação de MP3 por bytes → asset upload HeyGen (Opção A) → generate v2 (avatar eric-escritorio, voice type audio + input_text) → polling → URL.
- **Classificação: B-custo, custo mínimo consciente:** vídeo de 11s ≈ R$3,60 (HeyGen ~R$3,30 + ElevenLabs ~R$0,30, régua do run criar-reel).
- **Resultado: APROVADO.** Vídeo real completed: 11,04s, 720x1280, áudio presente (mean_volume -20,7 dB), frame conferido com Read (avatar do Eric falando no escritório), `video_url` retornada no template do Passo 6. MP3 validado pelos primeiros bytes como manda o Passo 2. Artefato salvo em `Downloads/video-lead-sem-resposta.mp4` (a URL S3 expira ~24h).

## Achados e fixes (marketing 2.13.14)

1. **Passo 3 Opção A quebrado: upload multipart `-F` rejeitado pela API (DEFEITO, reproduzido 2x).** O endpoint `upload.heygen.com/v1/asset` espera o arquivo como CORPO BINÁRIO CRU com `Content-Type: audio/mpeg`; com `-F` responde `{"code":40001,"message":"asset data must be provided"}` (HTTP 400). Agravante no PC: antes disso o curl nem lia o arquivo (exit 26) — o path POSIX do `mktemp` embutido em `-F "file=@/tmp/...;type=..."` não passa pela conversão de path do Git Bash (argumentos `@/caminho` soltos são convertidos; strings com `@` embutido não). O executor literal parava aqui e caía pro fallback Supabase sem necessidade. Fix: Opção A reescrita com `--data-binary @"$WORK/heygen-audio.mp3"` + header `Content-Type: audio/mpeg` (mesmo formato do uploader validado do `criar-reel`); o parse `data.url` original estava correto. Verificado: upload retornou `code:100` com URL do asset.
2. **Régua do drop de R contradizia os próprios exemplos (DEFEITO de doc).** A skill dizia "infinitivos longos (>3 sílabas)" e exemplificava com `falar/dizer/fazer` — todos de 2 sílabas: executor literal seguindo a régua NÃO dropava exatamente os exemplos dados. A fonte canônica (skill `/voz`, validada 2x) usa "5+ letras terminados em ar/er/ir". Fix: régua alinhada com a `/voz` + ponteiro pra lista `NAO_DROPAR` completa do `humanizar.py`.
3. **Mojibake cp1252 nos snippets que imprimem acento (DEFEITO transversal, reproduzido).** A validação do MP3 ecoou `MP3 v�lido` no PC (mesmo padrão corrigido em 2.13.11 pros scripts do editar-video-motion). Fix: `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` nos 2 snippets com acento no print (validação MP3 e Passo 6).

## Observações (não-defeito)

- `PY` resolveu pro python3 da Store (3.14) e FUNCIONOU — esta skill só usa stdlib (json/os/sys); a premissa de resolução é a mesma caducada do criar-reel, mas aqui não quebra nada. Não mexido de propósito (mudança mínima).
- `background.value #0A0E1A` não aparece no vídeo: o avatar `eric-escritorio` é de cena completa (escritório real) — o background só vale pra avatares com fundo removível. Comportamento do HeyGen, não da skill.
- Polling do Passo 5 rodou em background (foreground sleep é bloqueado no harness) — mesmo comando da skill, sem desvio semântico. Completed em ~2 min pra 11s de vídeo.
- Draft "[OC] Lead sem resposta esfria" e o asset de áudio ficam na conta HeyGen — artefato de produção normal (não é registro TESTE em CRM); o vídeo é utilizável de verdade.
