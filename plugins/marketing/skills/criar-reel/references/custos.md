# Custos de produção do Reel v3 — taxas reais

Tabela pra estimar o custo de um reel **antes** de gastar crédito (etapa 2.5 do fluxo,
via `scripts/simular_custo.py`). A v3 é mais barata que a v2: a fala sai do **ElevenLabs**
(barato) com o HeyGen só no **lip-sync**, e os B-rolls vêm **primeiro do banco remoto
(grátis)** — o **Higgsfield** cobre os gaps pela franquia da assinatura.

## O que entra no caixa (regra do Eric)
- **Entra:** HeyGen (lip-sync), ElevenLabs (fala), imagens (se via API).
- **NÃO entra:** Claude (tokens, assinatura). Banco de B-roll (grátis). Imagens feitas na
  assinatura (ChatGPT/Gemini na mão). **B-roll no Higgsfield** (sai da franquia mensal da
  assinatura, igual imagem feita na assinatura) — mas o simulador mostra os créditos
  consumidos à parte, pra vigiar a franquia.
- **No gate, o Eric quer só:** o custo total do vídeo + "prosseguir?".

## HeyGen — lip-sync (créditos por segundo de avatar; CSV do Eric 14/06/2026)
| Engine | Modo | créditos/seg | US$/crédito |
|---|---|---|---|
| `avatar_iv` (Avatar V, **default**) | API | 0,062 | ~1,00 |
| `avatar_iv` | plano | 0,022 | ~0,145 |
| `avatar_video` (padrão, ~4x + barato) | API | 0,017 | ~1,00 |
| `avatar_video` | plano | ~0,006 *(extrapolado)* | ~0,145 |
- A v3 manda `audio_asset_id` pro Avatar V (lip-sync) → o HeyGen contabiliza como `avatar_iv`.
- `avatar_video` é a alavanca de custo se a qualidade do lip-sync permitir.
- Plano Creator US$29/200 créditos ≈ 143 min de `avatar_iv` — vira a favor do plano a partir
  de ~8 min de avatar/mês.

## ElevenLabs (fala) — a economia que justifica a v3
- Creator/Pro: **US$ 0,22 / 1.000 caracteres**. Roteiro ~940 chars ≈ US$ 0,21 ≈ R$ 1.
- Substitui o TTS interno do HeyGen (que custava ~US$ 10-11/min cena-a-cena). É o motivo da v3.

## B-roll — banco grátis primeiro, Higgsfield nos gaps
- **Banco remoto** (~219 clips reutilizáveis, GitHub Release): **R$ 0**. A v3 tenta o banco
  primeiro (etapa 6) → na maioria dos reels não sobra gap nenhum.
- **Higgsfield** (titular desde 28/07/2026, só pros trechos que o banco não cobre): consome a
  **franquia da assinatura** — plano Starter, **200 créditos/mês**, renova dia 10.
  - Medido 28/07/2026: `seedance1_5` em **480p / 4s / sem áudio = 1,2 crédito por clipe**
    → **~166 clipes/mês** dentro da franquia. 720p custa ~2x.
  - **R$ 0 de caixa** enquanto couber na franquia (mesma regra da imagem feita na assinatura).
    O simulador imprime os créditos consumidos e avisa se o reel estourar o que resta
    (`--creditos-restantes N`; conferir o saldo real com `hf.exe account status`).
  - **Franquia compartilhada entre PC e notebook** (mesma conta) — não rodar lote nas duas
    máquinas sem combinar. Detalhes: `references/higgsfield-cli.md`.
- **Kling: FORA do fluxo desde 28/07/2026.** Os 2 resource packs pré-pagos venceram (o de
  1.000 units expirou com consumo 0%) e a API responde `1102 Account balance not enough`.
  Volta a fazer sentido só acima de ~160 clipes/mês, quando a franquia não cobre — aí o pacote
  de 1.000 units (US$98, US$0,098/unit, 1 unit = 1 clipe de 5s em kling-v1 720p) entra como
  reforço. Preços e histórico: `references/kling-api.md`.

## Imagens (frames + thumb) — só pros gaps do banco
- Quantidade: **nº de clips do Higgsfield + 1** (1 frame por gap + 1 thumb). Clips do banco
  NÃO geram frame (já são vídeo pronto).
- **API (paga):** `openai_image.py` (gpt-image-2) ≈ **US$ 0,21/imagem**. Caminho default.
- **Assinatura (grátis):** imagem feita na UI do ChatGPT/Gemini e jogada na pasta na mão
  (`--imagens assinatura`).

## Estimativa de duração e câmbio
- Ritmo de fala medido: **~17,8 caracteres/segundo** → `duração_s ≈ chars ÷ 17,8`.
- Câmbio default **R$ 5,10/US$** (jun/2026). Atualizar com `--cambio`.

## Nível de confiança
- HeyGen / ElevenLabs / imagens: **alto** (taxas reais do uso do Eric).
- **Higgsfield: alto** — medição real em 28-29/07/2026 (dois clipes, 1,2 crédito cada,
  conferidos no extrato `hf.exe account transactions`). O antigo "Kling a confirmar" foi
  fechado pelo outro lado: o Kling saiu do fluxo em vez de ter a taxa confirmada.
- O que **não** está fechado: custo em 720p (estimativa do `generate cost` deu 4,8 créditos,
  sem medição real de débito) e o valor unitário do crédito em R$ (depende de qual plano/ciclo
  está ativo — hoje irrelevante, porque a franquia não entra no caixa do vídeo).
