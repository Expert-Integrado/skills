# Higgsfield CLI — referência de uso (TITULAR dos B-rolls)

Geração de B-roll por **image-to-video** via CLI oficial do Higgsfield. O script
`scripts/higgsfield_i2v.py` cuida do upload do frame, do submit, do polling e do download.

Titular desde **28/07/2026** (antes era o Kling — ver seção "Por que trocou").

## Instalação (Windows) — NÃO use npm

`npm i -g @higgsfield/cli` **quebra** no Windows quando o caminho do usuário tem espaço: o
postinstall roda `tar -xzf C:\Users\<usuario>\...` e o tar do Git Bash interpreta `C:` como
host remoto (`Cannot connect to ... resolve failed`), o npm faz rollback e apaga o pacote.

Caminho que funciona — baixar o binário e extrair com caminho **relativo**:

```bash
cd /c/tmp
curl -sSL --ssl-no-revoke -o hf.tar.gz "https://github.com/higgsfield-ai/cli/releases/download/v1.1.20/hf_1.1.20_windows_amd64.tar.gz"
tar -xzf hf.tar.gz          # relativo: sem "C:" no argumento
mv hf.exe /c/MCPs/hf.exe    # local canônico (default do script; override: env HF_EXE)
```

Binário de 19 MB, tarball de 6,7 MB. `hf.exe --version` deve dizer `higgsfield 1.1.20`.

## Autenticação e workspace (os dois são obrigatórios)

1. **Login** — `hf.exe auth login`: OAuth via Clerk (`clerk.higgsfield.ai/oauth/authorize`)
   com PKCE gerado em runtime e callback em loopback (127.0.0.1). Abre aba no navegador
   default e **exige clique humano em Authorize** — a URL não é reconstruível de fora, então
   um agente não consegue completar sozinho: peça ao Eric. Confirmar com `hf.exe auth token`.
2. **Workspace** — `hf.exe workspace set <workspace_id>`. **Sem isso TODO comando morre com
   "No workspace selected"**, inclusive `account status`. Listar com `hf.exe workspace list`.
   Workspace do Eric (conta `operacoes@expertintegrado.com.br`, plano Starter):
   `d91a7bf6-e682-47a2-9c61-4a2a6cd6649b`. O `higgsfield_i2v.py` seta sozinho quando a env
   `HF_WORKSPACE` existe ou quando a conta tem só 1 workspace.

Token e workspace ficam no config do usuário, não junto do binário — mover o `hf.exe`
não desloga.

## De qual saldo sai (a pegadinha)

São **duas contas com o mesmo login**:

| | Onde | Saldo | Usado pelo CLI? |
|---|---|---|---|
| Assinatura do site | `higgsfield.ai` | 200 créditos/mês (Starter), renova dia 10 | **SIM** |
| Higgsfield Cloud (API com chave) | `cloud.higgsfield.ai` | separado, hoje zerado | não |

O CLI debita a **franquia da assinatura**. Logo, B-roll novo é R$ 0 de caixa enquanto
couber nos 200 créditos/mês — mesma regra das imagens feitas na assinatura
(`references/custos.md`). **O saldo é compartilhado entre o PC e o notebook** (mesma conta):
não rodar lote nas duas máquinas sem combinar.

Consultar: `hf.exe account status` · extrato: `hf.exe account transactions --size 10`

⚠️ Modelos "unlimited"/free generations do plano (FLUX.2 Pro, Seedream 5.0 Lite) **não
funcionam via CLI/MCP** — só no site. Não conte com eles na automação.

## Modelo e custo (medido 28/07/2026)

Canônico: **`seedance1_5`** (Seedance 1.5 Pro) em **480p / 4s / sem áudio** =
**~1,2 crédito por clipe** → ~166 clipes/mês na franquia. 720p custa ~2x (4,8 estimado).

Params do modelo (`hf.exe model get seedance1_5`): `duration` aceita **4, 8 ou 12**
(não 5), `resolution` 480p/720p/1080p, `start_image`/`end_image`, `generate_audio`
(default `true` — o script desliga), `aspect_ratio`.

Sempre conferir antes de lote: `hf.exe generate cost seedance1_5 --prompt "x" --resolution 480p --duration 4 --generate-audio=false`.
A estimativa é **teto**, não valor exato: estimou 2,4 e debitou 1,2.

Outros modelos e preços por 5s (referência da página de planos): Kling 2.5 Turbo 720p
4 créditos · Kling 2.1 720p 5 · Kling 3.0 720p 7 · Seedance 1.5 720p 3 · Veo 3.1 Fast 720p
11/4s. Trocar de modelo = editar `"model"` no manifesto. Listar: `hf.exe model list --video`.

## Flags de mídia — a armadilha que custou um clipe

`--image` é **alias de `--image-references`**, NÃO de `--start-image`. O `seedance1_5`
só aceita `start_image`, então usar `--image` manda o frame pro lugar errado. **Use sempre
`--start-image`.** (Corrigido no script em 29/07/2026; `generate cost` não valida flag de
mídia, aceita as duas e devolve o mesmo número — o erro só aparece no resultado.)

## Bug do result_url (corrigido — não reintroduzir)

O JSON do `generate wait --json` traz a URL do **PNG de entrada** em
`params.medias[].data.url`, que vem **antes** de `result_url` na ordem das chaves.
Varredura genérica por chave "url" devolve a imagem, e o script salvava o PNG como
`clip-NN.mp4` — o `compose_reel.py` quebra no concat. O `find_url()` agora lê
`result_url`/`min_result_url` explicitamente, ignora `params`/`thumbnail_url`, e o
download valida o header `ftyp` antes de aceitar o arquivo.

Campos do resultado: `result_url` (mp4), `thumbnail_url` (webp), `status`, `params`, `seed`.

## Manifesto (mesmo formato do runner antigo)

```json
{
  "frames_dir": "C:/Users/.../reel-slug/frames",
  "output_dir": "C:/Users/.../reel-slug",
  "model": "seedance1_5",
  "hf_flags": ["--resolution", "480p", "--duration", "4", "--generate-audio=false"],
  "clips": [
    { "n": 3, "frame": "frame-03.png", "prompt": "slow cinematic push-in, dark amber" }
  ]
}
```

`model` e `hf_flags` são **opcionais**: sem eles o script usa `seedance1_5` + as flags
de economia acima. `n` = número do clipe na sequência da fala (preenche os buracos que
o banco não cobriu). Saída: `clip-NN.mp4` em `output_dir`.

Rodar: `python scripts/higgsfield_i2v.py manifest.json 1` (validar 1 antes) e depois
`... manifest.json 2 3 5` (lote / re-disparo seletivo).

## Troubleshooting

| Sintoma | Causa | Recovery |
|---|---|---|
| `hf.exe nao encontrado` | binário ausente | instalar (seção acima) ou apontar `HF_EXE` |
| `Not authenticated` | token ausente/expirado | `hf.exe auth login` + clique do Eric no Authorize |
| `No workspace selected` | workspace não setado | `hf.exe workspace set <id>` ou env `HF_WORKSPACE` |
| clipe salvo é imagem | `find_url` pegando `params.medias` | já corrigido; se voltar, ler `result_url` |
| job cobrado mas arquivo descartado | download não era MP4 | re-disparar só aquele clipe |
| franquia no fim do mês | 200 créditos/mês | cobrir mais trechos pelo banco ou `Top Up` no site |

## Por que trocou (Kling → Higgsfield)

Em 28/07/2026 a auditoria do Kling achou 2 resource packs comprados e **0 em vigor**: o de
1.000 units (US$98) expirou em 25/07 com consumo **0%**, e o de 100 units foi 100% consumido.
API retornava `1102 Account balance not enough`. Como o Higgsfield já era pago e estava sem
uso (231 créditos parados, zero geração em 2 meses), o Eric decidiu rodar B-roll na franquia
em vez de recomprar pacote pré-pago com prazo de validade. Kling volta a fazer sentido
acima de ~160 clipes/mês. Notas no Brain: `pegkctsb9dmf` e `1bu1s8qryqlk`.
