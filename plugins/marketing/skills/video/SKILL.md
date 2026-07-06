---
name: video
description: "Gera um vídeo com o avatar do Eric no HeyGen falando um script, com voz clonada do ElevenLabs (mesmos perfis da skill /voz). Fluxo: humaniza o script, gera o áudio no ElevenLabs, hospeda o MP3 numa URL pública (HeyGen Asset API, ou Supabase como fallback), gera o vídeo no HeyGen com voice type:audio, aguarda o processamento e retorna a URL. Credenciais mínimas: HEYGEN_API_KEY + ELEVENLABS_API_KEY. Usar quando o Eric pedir 'gera vídeo', 'cria vídeo com meu avatar', 'HeyGen', 'vídeo vertical/horizontal pra [destino]' ou descrever um vídeo pra um avatar. NÃO usar para: produzir um Reel completo com B-rolls/legenda/thumb (skill criar-reel), só cortar respiros de um vídeo gravado (cortar-respiros), gerar SRT (gerar-srt) ou apenas áudio na voz do Eric sem vídeo (skill /voz)."
allowed-tools: Bash
---

# HeyGen — Vídeo com Avatar do Eric + Voz ElevenLabs

Gera um vídeo com o avatar do Eric no HeyGen falando um script, usando voz clonada do ElevenLabs (mesmos perfis da skill `/voz`). Fluxo: humanizar o script → gerar o áudio no ElevenLabs → hospedar o MP3 numa URL pública (HeyGen Asset API, ou Supabase como fallback) → gerar o vídeo no HeyGen com `voice.type: "audio"` → aguardar o processamento → retornar a URL. Credenciais mínimas: `HEYGEN_API_KEY` + `ELEVENLABS_API_KEY`; Supabase só entra no fallback de hospedagem.

## NUNCA

- `character.type: "talking_photo"` — sempre `"avatar"`.
- `voice.type: "text"` ou `"elevenlabs"` — sempre `"audio"` (áudio ElevenLabs pré-gerado).
- Enviar o payload do HeyGen sem `input_text` junto com `audio_url` → HeyGen retorna `"word time metadata is missing for the script"` e o vídeo falha.
- Usar modelo ElevenLabs diferente de `eleven_turbo_v2_5` (único aprovado; `eleven_multilingual_v2` gera gagueira nos clones do Eric).
- Adicionar `speed` no `voice_settings` do payload ElevenLabs — o payload só leva `stability`, `similarity_boost`, `style`, `use_speaker_boost`.
- Reprocessar automaticamente quando o HeyGen retornar `status: "failed"` — reportar `error.message` e parar.
- Disparar sem confirmação quando o pedido NÃO veio com script pronto + avatar explícito (ver SEMPRE).

## SEMPRE

- Confirmar antes de gerar (bloco de confirmação abaixo). Exceção: Eric já mandou script pronto E avatar explícito → pode disparar direto.
- Se o pedido veio só com uma descrição (sem script pronto) → redigir o texto do script no Passo 0 ANTES de humanizar, sem inventar fato/número/preço/oferta.
- Humanizar o script ANTES de qualquer chamada de API (forte ou leve conforme o perfil).
- Escrever o payload do ElevenLabs num ARQUIVO via heredoc (não inline) — evita bug de encoding UTF-8 com acentos.
- Sanitizar (escapar) o `SCRIPT_HUMANIZADO` antes de colá-lo em qualquer JSON e validar o payload com `json.load` antes de chamar a API (ver Passo 2).
- Default avatar `eric-escritorio`; default voz `eric-casual`.
- Acentuação correta do português no texto do script (é o que o avatar vai falar).
- `curl` HTTPS no PC (Windows/schannel): sempre `--ssl-no-revoke` (senão falha com exit 35 revocation). É no-op nos outros SOs.

---

## Pré-requisitos

**Credenciais** (ler de env var; se ausente, fallback 1Password `op read`):

| Var | Obrigatório | Fonte canônica (1Password) |
|-----|-------------|---------------------------|
| `HEYGEN_API_KEY` | sempre | `op read "op://Agentes Eric/HEYGEN_API_KEY/credential"` |
| `ELEVENLABS_API_KEY` | sempre | `op read "op://Agentes Eric/ELEVENLABS_API_KEY/credential"` |
| `SUPABASE_SERVICE_ROLE_KEY` | só se usar Opção B (fallback) | `op read "op://Agentes Eric/SUPABASE_SERVICE_ROLE_KEY_WHATSAPP/credential"` |

**Ambiente** (rodar no início do fluxo):

```bash
WORK=$(mktemp -d)                       # workdir temporário portável (nunca /tmp fixo)
command -v curl >/dev/null || { echo "curl ausente — abortar"; exit 1; }
PY="$(command -v python3 || command -v python)"   # parser JSON
# PC do Eric não tem python no PATH → fallback documentado:
[ -z "$PY" ] && PY="C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
```

---

## Confirmação antes de gerar

SEMPRE mostrar antes de disparar (exceto script pronto + avatar explícito):

```
Avatar: [nome]
Perfil de voz: [perfil]
Orientação: [vertical 720x1280 | horizontal 1280x720]
Script humanizado: "[texto]"

Confirma?
```

---

## Catálogo de avatares

| Avatar | avatar_id | Orientação | Quando usar |
|--------|-----------|------------|-------------|
| `eric-escritorio` | `2ee17d055d9d429e98d30bf3aa93bdb8` | vertical | DEFAULT — reels, stories, apresentações |
| `eric-podcast` | `f20410707a9a4df391d712921ede3f12` | vertical | Conteúdo conversacional |
| `eric-stand` | `3373f8bee71c43f39e155b7c0f95832b` | vertical | Apresentações formais, palestras |
| `eric-youtube` | `ecc84da168f7497d97d2216f1a7cf11f` | **horizontal** | YouTube (dimension 1280x720) |
| `eric-roqueiro` | `f3b1d81e134b46449e67f1ce9d84cdae` | vertical | Conteúdo descontraído |

**Default:** `eric-escritorio`. Todos são vertical (720x1280) exceto `eric-youtube` (horizontal 1280x720).

## Perfis de voz (idênticos à skill /voz)

| Perfil | voice_id (ElevenLabs) | Settings (stab/sim/style/speed) | Quando usar |
|--------|----------------------|--------------------------------|-------------|
| `eric-casual` | `HSqIMKW3FHpkAcy8JJLM` | 0.45 / 0.75 / 0.30 / 0.95 | DEFAULT — conteúdo dia a dia, tom próximo |
| `eric-casual-animado` | `HSqIMKW3FHpkAcy8JJLM` | 0.25 / 0.75 / 0.55 / 1.0 | Empolgação, lançamento, energia alta |
| `eric-profissional` | `ASKPogZ3ZKeHiPbzqJws` | 0.40 / 0.85 / 0.55 / 1.0 | B2B sério, decisor sênior |
| `eric-prospeccao` | `p8rbNftT5qUb7Gkn7i3S` | 0.40 / 0.80 / 0.40 / 1.0 | Vídeos de prospecção em massa |

**Modelo ElevenLabs:** `eleven_turbo_v2_5` — único aprovado.
**Default:** `eric-casual`.
Nota: o payload do ElevenLabs (Passo 2) leva só `stability`/`similarity_boost`/`style`; o valor de `speed` da tabela NÃO vai no `voice_settings`.

## Humanização do script

Mesmas regras da skill `/voz`. Aplicar **antes** de passar o texto para o ElevenLabs.

**Quando aplicar:**
- `eric-casual` / `eric-casual-animado`: humanização **forte**
- `eric-profissional` / `eric-prospeccao`: humanização **leve** (só R drop em infinitivos longos)

**Regras forte:**
- `para` → `pra`
- `você` → `cê`
- `está` → `tá` / `estou` → `tô`
- Verbos infinitivos longos (>3 sílabas): drop do R (`falar` → `falá`, `dizer` → `dizê`, `fazer` → `fazê`)
- Exceções (não dropar R): `ser, ter, ver, ler, ir, vir, sair`

**Regras leve:**
- `para` → `pra`
- Drop do R só em infinitivos longos
- Manter `você`, `está`, `estou`

---

## Fluxo completo

### Passo 0 — Redigir o script (só se veio uma descrição, sem script pronto)

- Veio o texto/script pronto → pular direto pro Passo 1.
- Veio só uma descrição do vídeo (ex.: "faz um vídeo explicando X", cenário "Eric só descreve o vídeo" da description) → redigir um rascunho curto na voz do Eric (regras da skill `/voz`), sem inventar fato/número/preço/oferta. Mostrar o rascunho no bloco de Confirmação antes de gerar e aguardar o "Confirma?" do Eric — o render no HeyGen consome crédito, não disparar antes do OK.

Defina as variáveis do avatar/perfil escolhidos a partir dos catálogos acima antes de começar:

```bash
AVATAR_ID="2ee17d055d9d429e98d30bf3aa93bdb8"   # da tabela de avatares (default eric-escritorio)
VOICE_ID="HSqIMKW3FHpkAcy8JJLM"                # da tabela de vozes (default eric-casual)
WIDTH=720; HEIGHT=1280                         # vertical; para eric-youtube use WIDTH=1280; HEIGHT=720
# STAB / SIM / STYLE = os 3 primeiros números da linha do perfil (ex. eric-casual: 0.45 / 0.75 / 0.30)
```

### Passo 1 — Humanizar script

Aplicar humanização (forte ou leve conforme o perfil) no texto original antes de qualquer chamada de API. O resultado é o `SCRIPT_HUMANIZADO` usado nos passos seguintes.

### Passo 2 — Gerar áudio no ElevenLabs

Escrever o script humanizado num arquivo com heredoc de aspas (`<< 'EOF'`) preserva os acentos byte a byte. Montar o JSON com `json.dumps` (não colar o script num heredoc cru): aspas, quebras de linha e `\` dentro do `SCRIPT_HUMANIZADO` escapam sozinhos — heredoc cru geraria JSON inválido silenciosamente. `STAB`/`SIM`/`STYLE` = os 3 primeiros números do perfil.

```bash
# 2a. Script humanizado num arquivo (bytes preservados, sem interpolação de shell)
cat > "$WORK/script.txt" << 'EOF'
SCRIPT_HUMANIZADO
EOF

# 2b. Montar o payload com json.dumps (escapa o conteúdo do script com segurança).
#     STAB/SIM/STYLE = os 3 primeiros números do perfil (default eric-casual: 0.45 0.75 0.30).
STAB=0.45 SIM=0.75 STYLE=0.30 "$PY" - "$WORK/script.txt" "$WORK/el-payload.json" << 'PYEOF'
import json, os, sys
text = open(sys.argv[1], encoding="utf-8").read().strip()
payload = {
    "text": text,
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {
        "stability": float(os.environ["STAB"]),
        "similarity_boost": float(os.environ["SIM"]),
        "style": float(os.environ["STYLE"]),
        "use_speaker_boost": True,
    },
}
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(payload, ensure_ascii=False))
PYEOF

curl -s --ssl-no-revoke -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$WORK/el-payload.json" \
  -o "$WORK/heygen-audio.mp3"
```

**Validação (é MP3, não JSON de erro?):** tamanho > 0 não basta — um JSON de erro também tem tamanho. Um MP3 começa com `ID3` (tag ID3v2) ou com o byte `0xFF` (frame sync); um erro da API vem como JSON (`{`). Checar os primeiros bytes:

```bash
"$PY" - "$WORK/heygen-audio.mp3" << 'PYEOF'
import sys
head = open(sys.argv[1], "rb").read(4)
ok = head[:3] == b"ID3" or (len(head) and head[0] == 0xFF)
print("OK: MP3 válido" if ok else "FALHA: não é MP3 (provável JSON de erro) — ver Erros comuns (ElevenLabs 401)")
sys.exit(0 if ok else 1)
PYEOF
```

Se falhar (JSON de erro no lugar do MP3) → cair no recovery de Erros comuns (ElevenLabs 401).

### Passo 3 — Hospedar o áudio numa URL pública

O HeyGen precisa de uma URL pública pra baixar o MP3. Duas opções — usar a disponível no ambiente.

#### Opção A — HeyGen Asset Upload (preferido, só usa HEYGEN_API_KEY)

```bash
AUDIO_URL=$(curl -s --ssl-no-revoke -X POST "https://upload.heygen.com/v1/asset" \
  -H "X-Api-Key: $HEYGEN_API_KEY" \
  -F "file=@$WORK/heygen-audio.mp3;type=audio/mpeg" \
  | "$PY" -c "import sys,json; print(json.load(sys.stdin)['data']['url'])")
echo "Audio URL: $AUDIO_URL"
```

#### Opção B — Supabase Storage (fallback, requer SUPABASE_SERVICE_ROLE_KEY)

```bash
FILENAME="heygen-$(date +%s).mp3"

# Upload
curl -s --ssl-no-revoke -X POST \
  "https://gmpurkzxtvzqlvkqwjkp.supabase.co/storage/v1/object/whatsapp-audio/heygen/$FILENAME" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: audio/mpeg" \
  --data-binary @"$WORK/heygen-audio.mp3"

# Signed URL (1h — suficiente pro HeyGen processar)
SIGNED=$(curl -s --ssl-no-revoke -X POST \
  "https://gmpurkzxtvzqlvkqwjkp.supabase.co/storage/v1/object/sign/whatsapp-audio/heygen/$FILENAME" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}')
AUDIO_URL="https://gmpurkzxtvzqlvkqwjkp.supabase.co$(echo "$SIGNED" | "$PY" -c "import sys,json; print(json.load(sys.stdin)['signedURL'])")"
echo "Audio URL: $AUDIO_URL"
```

**Validação:** `$AUDIO_URL` começa com `https://` e não está vazio. Se vazio → ver Erros comuns.

### Passo 4 — Gerar vídeo no HeyGen

Montar o payload com `json.dumps` (mesmo motivo do Passo 2 — heredoc cru quebraria o JSON): o `input_text` reusa o script do arquivo `$WORK/script.txt` e escapa sozinho. `AVATAR_ID`/`AUDIO_URL`/`WIDTH`/`HEIGHT` vêm das variáveis definidas antes.

O `title` é só metadado interno do HeyGen (não aparece no vídeo). `[OC]` é o prefixo literal que o original sempre usa no título — manter (o original não documenta o que significa). `Título do vídeo` é placeholder: preencher `TITULO_CURTO` com um título curto (3-6 palavras) derivado do assunto do script.

```bash
TITULO_CURTO="..."   # 3-6 palavras resumindo o assunto do script; o prefixo [OC] é mantido literal

AVATAR_ID="$AVATAR_ID" AUDIO_URL="$AUDIO_URL" WIDTH="$WIDTH" HEIGHT="$HEIGHT" TITULO_CURTO="$TITULO_CURTO" \
"$PY" - "$WORK/script.txt" "$WORK/heygen-payload.json" << 'PYEOF'
import json, os, sys
text = open(sys.argv[1], encoding="utf-8").read().strip()
payload = {
    "title": "[OC] " + os.environ["TITULO_CURTO"],
    "video_inputs": [{
        "character": {"type": "avatar", "avatar_id": os.environ["AVATAR_ID"], "avatar_style": "normal"},
        "voice": {"type": "audio", "audio_url": os.environ["AUDIO_URL"], "input_text": text},
        "background": {"type": "color", "value": "#0A0E1A"},
    }],
    "dimension": {"width": int(os.environ["WIDTH"]), "height": int(os.environ["HEIGHT"])},
}
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(payload, ensure_ascii=False))
PYEOF

curl -s --ssl-no-revoke "https://api.heygen.com/v2/video/generate" \
  -H "X-Api-Key: $HEYGEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$WORK/heygen-payload.json" > "$WORK/heygen-resp.json"

# Parse defensivo: se vier "error" em vez de "data", parar com a mensagem (sem KeyError)
VIDEO_ID=$("$PY" - "$WORK/heygen-resp.json" << 'PYEOF'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
if d.get("error"): sys.exit("HeyGen erro: " + str(d["error"]))
print((d.get("data") or {}).get("video_id", ""))
PYEOF
)
echo "Video ID: $VIDEO_ID"
```

**Importante:** `input_text` é obrigatório junto com `audio_url`. Sem ele, o HeyGen retorna `"word time metadata is missing"` e o vídeo falha.
**Validação:** `$VIDEO_ID` não está vazio. Se a resposta tiver `error` → ver Erros comuns.

### Passo 5 — Aguardar processamento

```bash
until [ "$(curl -s --ssl-no-revoke "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
  -H "X-Api-Key: $HEYGEN_API_KEY" | grep -o '"status":"[^"]*"' | grep -v processing)" != "" ]
do sleep 5
done
curl -s --ssl-no-revoke "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
  -H "X-Api-Key: $HEYGEN_API_KEY" > "$WORK/status.json"
cat "$WORK/status.json"
```

Retorna `"status": "completed"` com `video_url` (S3 assinada, ~24h). Se `"status": "failed"` → ver Erros comuns (NÃO reprocessar automático).

### Passo 6 — Retornar ao Eric

`[video_url]` e `[duration]` saem da resposta do Passo 5 — o `video_status.get` traz `data.video_url` e `data.duration` (em segundos):

```bash
"$PY" - "$WORK/status.json" << 'PYEOF'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8")).get("data") or {}
print("URL:", d.get("video_url", ""))
print("Duração: " + str(d.get("duration", "?")) + "s")
PYEOF
```

Preencher o template com esses valores:

```
Vídeo pronto!
URL: [video_url]
Duração: [duration]s
```

---

## Validação final (checklist)

- [ ] `character.type == "avatar"` (nunca `talking_photo`)
- [ ] `voice.type == "audio"` com `audio_url` E `input_text` presentes
- [ ] `model_id == eleven_turbo_v2_5`
- [ ] `avatar_id` e `voice_id` batem com os catálogos
- [ ] `dimension` correta pra orientação (vertical 720x1280 / eric-youtube 1280x720)
- [ ] status final `== "completed"` e `video_url` retornada
- [ ] URL entregue ao Eric no template do Passo 6

## Erros comuns e recovery

| Sintoma | Causa | Ação |
|---------|-------|------|
| ElevenLabs retorna JSON (não MP3) / HTTP 401 | API key rotacionada | Buscar de novo no 1Password (`ELEVENLABS_API_KEY`) e repetir Passo 2 |
| HeyGen Asset Upload (Opção A) falha / `$AUDIO_URL` vazio | Endpoint `upload.heygen.com` indisponível | Usar Opção B (Supabase) |
| Supabase upload falha (Opção B) | Service role key inválida / path errado | Verificar `SUPABASE_SERVICE_ROLE_KEY` ou tentar path diferente |
| HeyGen `"word time metadata is missing"` | Payload sem `input_text` junto com `audio_url` | Incluir `input_text` (Passo 4) e reenviar |
| HeyGen `status: "failed"` | Falha no processamento | Retornar `error.message` ao Eric — NÃO reprocessar automaticamente |
| Processamento > 5 min | Vídeo longo / fila do HeyGen | Avisar o Eric e retornar `$VIDEO_ID` pra checar depois com o Passo 5 |

## Histórico

- **v2.1**: `input_text` obrigatório junto com `audio_url` (sem ele: `"word time metadata is missing"`).
- **v2.2**: HeyGen Asset Upload como Opção A (só HEYGEN_API_KEY); Supabase rebaixado a Opção B (fallback). Credenciais mínimas: HEYGEN_API_KEY + ELEVENLABS_API_KEY.
