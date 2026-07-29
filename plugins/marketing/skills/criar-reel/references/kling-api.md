# Kling API (oficial) — referência de uso ⚠️ LEGADO

> **FORA DO FLUXO desde 28/07/2026.** O titular dos B-rolls é o Higgsfield
> (`references/higgsfield-cli.md`). Este documento fica para o caso de o Eric recomprar
> pacote — o que só compensa acima de ~160 clipes/mês, quando a franquia mensal do
> Higgsfield não cobre.
>
> **Motivo da saída:** auditoria de 28/07/2026 achou 2 resource packs comprados e **0 em
> vigor** — o de 1.000 units (US$ 98) expirou em 25/07 com consumo **0%** e o de 100 units
> foi 100% consumido. A API responde `1102 Account balance not enough`. Trial pack vence em
> 30 dias e Standard em 180, **sem rollover nem extensão**: só comprar quando o consumo já
> estiver rodando (nota do Brain `1bu1s8qryqlk`).

Geração de B-roll por **image-to-video** na API oficial do Kling (Kuaishou). O script
`scripts/kling_i2v.py` cuida da assinatura JWT, do envio, do polling e do download.

## Credenciais
- Ficam em `C:\MCPs\kling.env`:
  ```
  KLING_ACCESS_KEY=...
  KLING_SECRET_KEY=...
  ```
- **IMPORTANTE:** o saldo de **API é separado da assinatura do site**. É pré-pago (resource pack)
  no console de desenvolvedor do Kling. Se o submit retornar `code 1102 "Account balance not enough"`,
  o saldo de API acabou — hoje esse é o estado normal da conta. (Nenhum crédito é gasto num submit recusado.)

## Preços dos resource packs (levantados em 28/07/2026)

Painel: `kling.ai/dev/pricing` · gestão: `kling.ai/dev/resource-pack-manage` (exige login).
Em `kling-v1` (Kling 1.0) 720p std o custo é **0,2 unit/s**, ou seja **1 unit = 1 clipe de 5s**.

| Pacote | Preço | Units | US$/unit | Validade | Concorrência |
|---|---|---|---|---|---|
| Trial | US$ 9,80 (de 14) | 100 | 0,098 | 30 dias | 5 |
| Trial | US$ 98 (de 140) | 1.000 | 0,098 | 30 dias | 5 |
| Standard 1 | US$ 700 | 5.000 | 0,14 | 180 dias | 20 |
| Standard 2 | US$ 2.100 | 15.000 | 0,14 | 180 dias | 20 |
| Standard 3 | US$ 3.780 (-10%) | 30.000 | 0,126 | 180 dias | 20 |
| Standard 4 | US$ 5.670 (-10%) | 45.000 | 0,126 | 180 dias | 20 |
| Standard 5 | US$ 7.560 (-10%) | 60.000 | 0,126 | 180 dias | 20 |

O Trial é o mais barato por unit (30% off, limite de 5 compras) — cinco compras de US$ 98
dão 5.000 clipes por US$ 490, contra US$ 700 do Standard 1. Mas a validade é de 30 dias:
sem consumo rodando, o dinheiro vira pó (foi o que aconteceu).

## Detalhes técnicos (já implementados no script)
- Host: `https://api.klingai.com` (cai pro `https://api-singapore.klingai.com` se as chaves forem de outra região).
- Auth: JWT HS256, header `{alg:HS256,typ:JWT}`, payload `{iss:ACCESS_KEY, exp:+1800s, nbf:-5s}`, `Authorization: Bearer <jwt>`.
- Endpoint: `POST /v1/videos/image2video` · corpo: `model_name, image(base64), prompt, negative_prompt, cfg_scale, mode, duration`.
- Polling: `GET /v1/videos/image2video/{task_id}` → `data.task_status` (`submitted`→`processing`→`succeed`) → vídeo em `data.task_result.videos[0].url`.
- A imagem vai em **base64 puro** (sem prefixo `data:`). O script faz o encode dos frames locais — não precisa subir em lugar nenhum.
- Cada clipe `std` 5s leva ~2 min. Rodar em **background** (são vários em sequência).

## Modelos
- Default `kling-v1-6` (bom custo/qualidade, amplamente disponível). Trocar no manifesto via `"model"`.
- `mode`: `std` (mais barato/rápido) ou `pro` (mais caro/melhor). `duration`: `"5"` ou `"10"`.

## Manifesto (o que o script lê)
```json
{
  "frames_dir": "C:/Users/Joao/Downloads/<reel>/frames",
  "output_dir": "C:/Users/Joao/Downloads/<reel>",
  "model": "kling-v1-6", "mode": "std", "duration": "5",
  "clips": [
    {"n": 1, "frame": "frame-01.png", "prompt": "descrição do MOVIMENTO a partir do frame ..."}
  ]
}
```
O `prompt` de cada clipe descreve o **movimento** (a imagem já é o quadro inicial): o que se move,
para onde, e o movimento de câmera (ex: "slow push-in", "slow orbit", "side tracking").

## Rodar
```bash
python scripts/kling_i2v.py <manifest.json>        # todos
python scripts/kling_i2v.py <manifest.json> 1 2 3  # só alguns (re-disparo de falhas)
```
Saída: `clip-01.mp4 ... clip-NN.mp4` em `output_dir`. Conferir integridade com ffprobe ao final.
