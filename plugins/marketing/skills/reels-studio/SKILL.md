---
name: reels-studio
description: "Estúdio de reels: monta um reels vertical (9:16) do zero — um avatar HeyGen apresenta o roteiro e o vídeo é coberto por b-roll de imagens OpenAI (gpt-image-2) com movimento de câmera via ffmpeg, música de fundo e export. Use quando pedirem explicitamente o estúdio: 'estúdio de reels', 'estúdio de edição de reels', 'estúdio de vídeo', 'abre o estúdio de reels', 'editor de reels'. (Para 'criar vídeo / criar reels' genérico ou um pacote de conteúdo, use orquestrar-conteudo ou demonstracao-agente, não esta.) Na PRIMEIRA vez roda o ONBOARDING (chaves de API, avatar e elenco do b-roll)."
allowed-tools: Bash, Read, Write, Edit
---

# Reels Studio — reels com avatar + b-roll de IA

Transforma uma ideia (ou roteiro pronto) num reels vertical 9:16 pronto pra postar: um avatar HeyGen apresenta falando o texto (a pessoa não grava) e o vídeo é coberto por b-roll — cenas geradas por IA (gpt-image-2) que ganham movimento de câmera via ffmpeg (Ken Burns, sem modelo de vídeo). Apresentador inteiro em cima, b-roll na faixa de baixo. Montagem, música e export por ffmpeg. Barato porque o movimento do b-roll é ffmpeg, não geração de vídeo por IA.

## NUNCA
- Nunca versionar, commitar ou subir `config/chaves.env` pra lugar nenhum (contém chaves de API em texto puro). Já está no `.gitignore` — não force.
- Nunca gerar "vídeo" do b-roll por modelo de vídeo de IA. B-roll SEMPRE nasce de imagem (gpt-image-2) e ganha movimento por ffmpeg (etapas 4→5).
- Nunca dar movimento (etapa 5) antes de a pessoa aprovar as imagens (etapa 4).
- Nunca pôr o b-roll no meio ou no topo. B-roll SEMPRE na faixa de baixo; apresentador inteiro em cima.
- Nunca trocar o elenco entre vídeos — usar sempre o mesmo `config/elenco.json` pra manter consistência.
- Nunca refazer o onboarding (PASSO 0) se `config/chaves.env` + `config/avatar.json` + `config/elenco.json` já existem.
- Nunca colar valor de chave de API no chat, em log ou em texto — só dentro de `config/chaves.env`.

## SEMPRE
- Sempre acentuação correta do português na legenda e em qualquer texto na tela.
- Sempre roteiro com gancho nos 3 primeiros segundos: a 1ª frase cumpre ≥1 de curiosidade / expectativa / forte-polêmica (critério da etapa 1). Se não cumpre nenhum, reescreva antes de gerar o avatar.
- Sempre confirmar o roteiro com a pessoa antes da etapa 3 (avatar HeyGen = API paga).
- Sempre mostrar as imagens do b-roll pra pessoa aprovar antes da etapa 5 (movimento).
- Sempre passar `sobrepor` como modo no `4_montar.py` — o avatar HeyGen não tem legenda embaixo, e o default do script é `cortar`.

## Pré-requisitos

Ambiente. `SKILL_DIR` = a pasta que contém ESTE `SKILL.md` (a mesma que lista `scripts/` e `config/`). Derive esse caminho absoluto do path REAL de onde este `SKILL.md` foi carregado nesta sessão — nunca adivinhe nem chute. Os dois lugares de onde ele costuma vir: o **cache do marketplace** (`~/.claude/plugins/cache/<marketplace>/<plugin>/<versão>/skills/reels-studio`, ex.: `~/.claude/plugins/cache/expertintegrado/marketing/2.11.0/skills/reels-studio`) ou o **repo local** (`.../expertintegrado-skills/plugins/marketing/skills/reels-studio`); use aquele de onde você abriu o arquivo, não o outro. Confirme com o `ls` abaixo: ele TEM que listar `config.py`; se der "No such file", o `SKILL_DIR` está apontando errado (corrija pra pasta que contém `scripts/` e `config/`).
```bash
SKILL_DIR="/caminho/absoluto/desta/skill/reels-studio"   # o diretório onde está ESTE SKILL.md
ls "$SKILL_DIR/scripts/config.py" || echo "SKILL_DIR errado: aponte pra pasta que contém scripts/ e config/"
cd "$SKILL_DIR"
PY="$(command -v python3 || command -v python)"
# fallback do PC do Eric (não há python no PATH):
[ -z "$PY" ] && PY="/c/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe"
command -v ffmpeg  >/dev/null || echo "FALTA ffmpeg — instale antes de montar/animar"
command -v ffprobe >/dev/null || echo "FALTA ffprobe (vem com ffmpeg)"
"$PY" -m pip show pillow >/dev/null 2>&1 || "$PY" -m pip install pillow   # só o gancho.py usa
```
(Os scripts resolvem `config/` sozinhos a partir da própria localização — o `cd` acima serve só pra os caminhos relativos `scripts/<nome>.py` e `cenas.json` funcionarem, e por isso rode todas as etapas de dentro do `SKILL_DIR`.)

Chaves (ficam em `config/chaves.env`, formato `CHAVE=valor`, uma por linha):
- `OPENAI_API_KEY` — imagens do b-roll (gpt-image-2). **Obrigatória.**
- `HEYGEN_API_KEY` — avatar que apresenta. **Obrigatória.**
- `ELEVENLABS_API_KEY` — só se quiser voz clonada. **Opcional** (padrão = voz nativa do HeyGen).
- `OUTPUT_DIR` — pasta de saída (vazio = `./saida` da skill).

Config (criados no PASSO 0): `config/avatar.json`, `config/elenco.json`. `config.py` carrega os três automaticamente a partir da pasta da skill (independe do cwd).

**Voz da marca** (usada nas etapas 1 e 9). A skill NÃO traz um guia de voz próprio — a voz é a que a PESSOA definir, não uma genérica nem inventada. Se ela ainda não passou referência, pergunte UMA vez e guarde a resposta como referência fixa:
> "Qual o tom da sua marca? Me manda 2-3 legendas/posts que você já publicou e curtiu, ou 3 adjetivos do tom (ex.: direto, didático, sem hype)."

Se a pessoa já trouxe um roteiro pronto, use a voz dele. Aplique a MESMA voz no roteiro (etapa 1) e na legenda (etapa 9).

---

## PASSO 0 — ONBOARDING (só na 1ª vez)

Checar antes de tudo:
```bash
ls config/chaves.env config/avatar.json config/elenco.json 2>/dev/null
```
- SE os 3 arquivos existem → pule direto pro PIPELINE (etapa 1).
- SENÃO → rode só os sub-passos dos arquivos que faltam.

### 0.1 Chaves → `config/chaves.env`
Se faltar `OPENAI_API_KEY` ou `HEYGEN_API_KEY`, peça exatamente assim (não versione o arquivo):
> "Pra montar seus reels eu preciso de 2 chaves: **OpenAI** (platform.openai.com/api-keys) pra gerar as cenas, e **HeyGen** (app.heygen.com → Settings → API) pro avatar. Me passa elas."

Grave com Write no formato `CHAVE=valor`, uma por linha (modelo em `config/chaves.exemplo.env`). `ELEVENLABS_API_KEY` e `OUTPUT_DIR` podem ficar vazios.

**De onde vem a chave depende de quem está rodando a skill:**
- **Terceiro rodando na própria máquina** (fluxo da mensagem acima): a chave é dele — peça no chat com a mensagem acima, grave só no `config/chaves.env` local (gitignorado) e nunca ecoe o valor de volta no chat/log.
- **Na máquina do Eric:** NÃO peça a chave no chat. As chaves vêm do ambiente / 1Password — puxe inline (ex.: `OPENAI_API_KEY="$(op read "op://Agentes Eric/<TOKEN>/credential")"`) e escreva no `config/chaves.env` sem o valor passar pelo chat. Regra global de secret: nunca colar valor de chave em chat/arquivo além do `config/chaves.env` gitignorado já previsto.

### 0.2 Avatar → `config/avatar.json`
Pergunte um campo de cada vez e grave com Write (modelo em `config/avatar.exemplo.json`):

- `avatar_id` — **obrigatório** (o script `1_avatar_heygen.py` lê este campo direto; sem ele a etapa 3 nem roda). Pergunte:
  > "Qual o **ID do seu avatar no HeyGen**? (crie ou escolha em app.heygen.com → Avatars e me manda o ID)."
  - SE a pessoa **ainda não tem avatar** → oriente: "Cria um em app.heygen.com → Avatars (Instant Avatar ou Photo Avatar) e me manda o ID quando tiver." **PAUSE o 0.2 aqui** — sem `avatar_id` não dá pra gerar o apresentador. Você pode seguir configurando chaves (0.1) e elenco (0.3) nesse meio tempo; retome o 0.2 quando ela mandar o ID. Não invente um `avatar_id`.
- `voz` — padrão HeyGen: `{"tipo":"heygen","voice_id":"<ID>","velocidade":1.0}`. O `voice_id` identifica a voz nativa; pegue na biblioteca de vozes em app.heygen.com, ou liste via API com o curl abaixo (rode de dentro do `SKILL_DIR`, com `config/chaves.env` já preenchido no 0.1 — mesmo header `X-Api-Key` que o `1_avatar_heygen.py` usa):
  ```bash
  HG_KEY="$(grep '^HEYGEN_API_KEY=' config/chaves.env | cut -d= -f2-)"
  curl -s --ssl-no-revoke https://api.heygen.com/v2/voices -H "X-Api-Key: $HG_KEY" \
    | "$PY" -c 'import sys,json; vs=json.load(sys.stdin).get("data",{}).get("voices",[]); [print(v.get("voice_id"),"|",v.get("language"),"|",v.get("gender"),"|",v.get("name")) for v in vs]'
  ```
  **Não deixe o placeholder `COLE_AQUI...` nem chute um ID** — sempre confirme a voz com a pessoa:
  > "Que **voz** você quer no avatar? Me diz idioma/estilo (ex.: PT-BR, masculina, firme) que eu listo as vozes do seu HeyGen."
  Opcional ElevenLabs (voz clonada): `{"tipo":"elevenlabs","voice_id":"<ID>","modelo":"eleven_turbo_v2_5","settings":{...}}` — o `voice_id` vem de elevenlabs.io → Voices, e exige `ELEVENLABS_API_KEY` no 0.1.
- `dimensao` — use fixo `{"width":720,"height":1280}` (vertical, padrão pra reels), salvo pedido explícito de mudar.
- `fundo` — cor sólida (hex) da marca. Pergunte:
  > "Qual a **cor de fundo** do avatar? Me passa o hex da marca (ex.: #0A0E1A)."
  SE a pessoa não souber/não tiver → use o default documentado `{"type":"color","value":"#0A0E1A"}` (o mesmo do `avatar.exemplo.json` e o fallback do script). Não invente uma "cor de marca".

### 0.3 Elenco do b-roll → `config/elenco.json`
É o "elenco" fixo que aparece nas cenas, pra manter consistência entre vídeos (modelo em `config/elenco.exemplo.json`). Entreviste um item de cada vez:
- "Qual o **estilo visual** das cenas? (3D cinematográfico, ilustração, foto realista...)"
- "Tem **personagens fixos**? (você, um mascote, um sócio) — descreva cada um em detalhe, em inglês, pro gpt-image-2."
- "Qual o **ambiente/cenário** padrão e a **paleta** da marca?"
- "Quem aparece em **toda** cena?" → `sempre_presentes`.

Descrições de personagem em INGLÊS e detalhadas (o gpt-image-2 entende melhor), sempre iguais entre vídeos, com os "NEVER" de cada um pra travar a geração. Preencha `area_segura` avisando que vira 16:9 (conteúdo no centro 70%, nada importante nas bordas de cima/baixo).

### 0.4 CTA final (opcional)
Pergunte:
> "Quer um **card de encerramento fixo** (CTA) no fim de todo reels? Se sim, me diz a oferta e o texto curto que aparece nele."

SE **não** → pule (o `[config/cta.mp4]` da etapa 8 é opcional).

SE **sim** → o CTA é um card **9:16 de tela cheia**, diferente do b-roll: NÃO passa por `cenas.json` nem pelos scripts `2_`/`3_` (que forçam 16:9). Não há script dedicado — gere avulso com os 2 comandos abaixo, rodando de dentro do `SKILL_DIR`:
```bash
cd "$SKILL_DIR"
# (a) imagem 9:16 da oferta no gpt-image-2 (size 1024x1536) → config/cta.jpg
"$PY" - <<'PY'
import sys, json, base64, urllib.request
sys.path.insert(0, "scripts")
import config as C
C.exigir("OPENAI_API_KEY")
prompt = "Card vertical 9:16 de encerramento. <a oferta e o texto curto que a pessoa passou>. Identidade/paleta da marca, layout limpo, texto legível no centro."
body = json.dumps({"model":"gpt-image-2","prompt":prompt,"size":"1024x1536",
                   "quality":"high","output_format":"jpeg","n":1}).encode()
req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
    headers={"Content-Type":"application/json","Authorization":f"Bearer {C.OPENAI_API_KEY}"}, method="POST")
with urllib.request.urlopen(req, timeout=300) as r: resp = json.load(r)
open("config/cta.jpg","wb").write(base64.b64decode(resp["data"][0]["b64_json"]))
print("OK -> config/cta.jpg")
PY

# (b) movimento suave (Ken Burns) e export 1080x1920 (~4s) → config/cta.mp4
ffmpeg -y -loop 1 -i config/cta.jpg -t 4 \
  -vf "scale=2160:3840:flags=lanczos,zoompan=z='min(zoom+0.0006,1.12)':d=120:s=1080x1920:fps=30,format=yuv420p" \
  -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p config/cta.mp4
```
- Validação: `config/cta.mp4` existe e é 9:16. Mostre a imagem (`config/cta.jpg`) pra pessoa aprovar antes de reusar. Uma vez pronto, reuse o mesmo `config/cta.mp4` em todo reels na etapa 8.

---

## PIPELINE (depois do onboarding)

Cada etapa nomeia o script exato. Rode com `"$PY" scripts/<nome>`. Etapas 3+ são só ffmpeg (custo zero).

**1. Roteiro** — escreva o script na **voz da marca** (definida nos Pré-requisitos): gancho nos primeiros 3s → desenvolvimento → CTA. ~30–60s de fala.
- Critério verificável do gancho (1ª frase, ~2s de fala): tem que cumprir **pelo menos um** de — (a) gera curiosidade, (b) cria expectativa, (c) é forte/polêmica (os mesmos 3 critérios do `gancho.py`). Se a 1ª frase não cumpre nenhum, reescreva antes de seguir.
- **Confirme o roteiro com a pessoa antes da etapa 3** (a etapa 3 é API paga).

**2. Planejar o b-roll** — quebre o roteiro em cenas: nº de cenas ≈ duração ÷ 5s. **Sem texto legível nas cenas por padrão:** o gpt-image-2 renderiza texto em português com typos (validado 07/07/2026: "CONQUISTO", "pará envio") — inclua `no readable text, no words` na `acao`/`extra` de cada cena, salvo pedido explícito da pessoa por texto na cena; nesse caso, confira letra por letra na aprovação da etapa 4. Como o avatar (etapa 3) ainda não existe, **estime a duração a partir do texto do roteiro**: `duração_s ≈ (nº de caracteres do roteiro) ÷ 17,8` — 17,8 caracteres/s é o ritmo de fala medido em `criar-reel/scripts/simular_custo.py`; os scripts desta skill não documentam taxa própria, então trate como estimativa. Depois `nº de cenas ≈ ceil(duração_s ÷ 5)`. Escreva `cenas.json` (uma cena por take) usando os personagens do elenco:
```json
[
  {"id":"c01","personagens":["principal","mascote"],"acao":"...o que acontece...","extra":"...elementos/texto na cena..."}
]
```

**3. Avatar (API HeyGen — paga)**
```bash
"$PY" scripts/1_avatar_heygen.py "roteiro do reels..." [saida.mp4]
# ou:  "$PY" scripts/1_avatar_heygen.py --arquivo roteiro.txt [saida.mp4]
```
- Validação: termina com `OK -> <arquivo>.mp4` e o mp4 existe.
- Se falhar: leia o erro. `Faltam chaves` → volte ao PASSO 0.1. Erro "word time metadata is missing" → é voz ElevenLabs sem `input_text` (o script já manda; se persistir, tente a voz nativa HeyGen). Erro de crédito/plano → avise a pessoa; não há retry útil.

**4. Imagens do b-roll (API OpenAI — paga)**
```bash
"$PY" scripts/2_broll_imagens.py cenas.json <pasta_img>
```
- Validação: cada cena imprime `IMAGEM OK <id>` e a pasta tem os `_16x9.jpg`. **Mostre as imagens pra pessoa aprovar (Read em cada jpg) ANTES de animar.** Na aprovação, confira também: texto renderizado com typo (se escapou algum texto), mascote/personagens consistentes com o elenco entre as cenas.
- Se `IMAGEM FALHOU <id>`: ajuste a `acao`/`extra` daquela cena no `cenas.json` e rode de novo. Não anime sem aprovação.

**5. Movimento (ffmpeg)**
```bash
"$PY" scripts/3_broll_movimento.py <pasta_img> <pasta_takes> [dur_seg]   # dur_seg default 5.0
```
- Validação: imprime `OK <nome>` por take e `TAKES PRONTOS -> <pasta>`.

**6. Montar (ffmpeg)** — apresentador em cima, b-roll na faixa de baixo:
```bash
"$PY" scripts/4_montar.py <avatar.mp4> <pasta_takes> <montado.mp4> sobrepor
```
- Passe `sobrepor` SEMPRE (avatar HeyGen não tem legenda embaixo; o default do script é `cortar`).
- Validação: imprime `OK <montado.mp4>`. Se imprimir `FALHOU` + stderr, leia as últimas linhas do ffmpeg.

**7. Gancho / cold open (opcional, ffmpeg)** — repete a frase mais forte no comecinho, só o avatar, com efeito + faixa de texto, e transição pro corpo:
```bash
"$PY" scripts/gancho.py <avatar.mp4> <ini> <fim> <efeito> "FRASE COMPLETA" <montado.mp4> <com_gancho.mp4>
```
- **Quando incluir:** é opcional. Ofereça UMA vez, na entrevista inicial, como pergunta binária (quer ou não quer o cold open) — só monte esta etapa 7 se a pessoa disser sim. Não decida incluir por conta própria.
- **Qual frase (`"FRASE COMPLETA"`):** a frase do roteiro (etapa 1) que mais gera curiosidade / cria expectativa / é forte-polêmica (mesmos critérios do `gancho.py`). Passe-a inteira, NUNCA cortada no meio.
- **`<ini>` `<fim>` (segundos) — como achar** sem ferramenta extra (você escreveu o roteiro, então sabe onde a frase está nele):
  1. Duração total do avatar: `dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 <avatar.mp4>)`
  2. Conte palavras do roteiro: `A` = palavras ANTES da frase, `B` = palavras da frase, `T` = total do roteiro.
  3. `ini ≈ dur*A/T − 0.3` (mínimo 0) · `fim ≈ dur*(A+B)/T + 0.5`. As folgas (−0,3s / +0,5s) evitam cortar a frase no meio; arredonde a 1 casa.
  - SE você tiver uma transcrição com marcação de tempo por palavra, use os tempos reais dela no lugar da estimativa.
- **`<efeito>`** (`pb | vhs | fantasma | tv_antiga`): default = **`pb`** (é o fallback do próprio script e o mais neutro). Só troque se a pessoa pedir visual específico: `vhs`/`tv_antiga` = retrô/nostálgico; `fantasma` = suspense/mistério. Na dúvida, `pb`.

**8. Finalizar (ffmpeg)** — anexa CTA (opcional), mistura música discreta (opcional, nunca por cima da voz), exporta:
```bash
"$PY" scripts/5_finalizar.py <montado.mp4> <final.mp4> [config/cta.mp4] [musica.mp3] [--4k]
```
- `[config/cta.mp4]` — só se você criou o CTA no 0.4; senão **omita**.
- `[musica.mp3]` — a skill **NÃO gera nem baixa música**. Passe um arquivo que a PESSOA fornecer (biblioteca dela ou banco royalty-free — ex.: biblioteca do Instagram/Facebook, YouTube Audio Library). Se ela não fornecer, **omita o parâmetro**: o vídeo exporta sem música (o requisito "música discreta" só se aplica quando há música). O script já abaixa e achata a música sozinho (`loudnorm` + `volume=0.38`), mantendo a fala cheia — você não ajusta volume manualmente.
- `--4k` — **omita por padrão**. Só passe `--4k` quando a pessoa pedir 4K explicitamente; sem a flag o export sai no padrão (1080×1920), que já basta pra reels.
- `[config/cta.mp4]` e `[musica.mp3]` são **posicionais**. Pra passar `musica.mp3` **sem** CTA, ponha `""` (aspas vazias) na posição do CTA: `"$PY" scripts/5_finalizar.py <montado.mp4> <final.mp4> "" <musica.mp3>` (o script trata caminho inexistente como "sem CTA").
- Validação: imprime `OK <final.mp4>` e o arquivo existe.

**9. Entregar** — o `final.mp4` + a legenda do post, na **mesma voz da marca da etapa 1** (definida nos Pré-requisitos), com acentuação correta do português. Estrutura da legenda: `{gancho curto} + {1-2 frases de valor} + {CTA}`. Não mude o tom em relação ao roteiro.

---

## REGRAS INVIOLÁVEIS
- **Avatar apresenta, b-roll cobre.** Apresentador em cima (inteiro), b-roll sempre na faixa de **baixo** — nunca no meio.
- **Imagem aprovada antes de dar movimento.** Mostre as cenas; só depois rode o Ken Burns.
- **B-roll a partir de imagem** (gpt-image-2). Nunca gere "vídeo" do b-roll por outro caminho.
- **Elenco consistente** entre vídeos (mesmo `config/elenco.json`).
- **Roteiro com gancho nos 3 primeiros segundos.** 1ª frase cumpre ≥1 de curiosidade / expectativa / forte-polêmica (critério da etapa 1); se não, reescreva.
- **Acentuação correta do português** na legenda e em qualquer texto na tela.

## Validação final (checklist antes de entregar)
- [ ] `final.mp4` existe e abre; vertical 9:16.
- [ ] Apresentador inteiro em cima, b-roll na faixa de baixo (nunca no meio).
- [ ] Gancho: a 1ª frase (~2s) cumpre ≥1 de curiosidade / expectativa / forte-polêmica (etapa 1).
- [ ] SE houver música: discreta, nunca por cima da voz (o `5_finalizar.py` já garante). Sem música = item não se aplica.
- [ ] Legenda do post na voz da marca (etapa 1) e com acentuação correta.
- [ ] `config/chaves.env` NÃO foi versionado/commitado.

## CUSTO (referência)
- **Imagens:** ~US$ 0,16 cada no gpt-image-2 → reels de ~6 cenas ≈ US$ 1.
- **Avatar HeyGen:** consome créditos do plano da pessoa (varia por plano/segundos).
- **Movimento, montagem, música, export:** ffmpeg, **custo zero**.
> Bem mais barato que pipelines com modelo de vídeo por IA, porque o movimento do b-roll é ffmpeg, não geração de vídeo.

## Erros comuns e recovery
- `Faltam chaves: [...]` (SystemExit dos scripts) → chave ausente em `config/chaves.env`. Volte ao PASSO 0.1.
- `Sem config/avatar.json` / `Sem config/elenco.json` → rode PASSO 0.2 / 0.3.
- HeyGen "word time metadata is missing" → voz `type:"audio"` (ElevenLabs) precisa de `input_text` junto; o script já envia. Se persistir, use a voz nativa do HeyGen no `config/avatar.json`.
- `4_montar.py` cobrindo a legenda → foi usado modo `cortar`; refaça com `sobrepor`.
- Zoom do Ken Burns tremendo → os scripts já dão upscale 2× antes do `zoompan`; se ainda tremer, reduza `dur_seg` na etapa 5.
- Windows sem `TEMP` setado → `1_avatar_heygen.py` e `gancho.py` gravam temporários em `$TEMP` (fallback `/tmp`). Se der erro de escrita, `export TEMP="$(mktemp -d)"` antes de rodar.
- ffmpeg imprime `FALHOU` + stderr → leia as últimas ~20 linhas do stderr; costuma ser codec/arquivo de entrada faltando.

## Arquivos
- `scripts/1_avatar_heygen.py` · `2_broll_imagens.py` · `3_broll_movimento.py` · `4_montar.py` · `5_finalizar.py` · `gancho.py` (opcional) · `config.py`
- `config/chaves.exemplo.env` · `config/avatar.exemplo.json` · `config/elenco.exemplo.json`
- `references/metodo.md` — detalhamento técnico do pipeline (parâmetros de API, gotchas ffmpeg).

## Requisitos
Claude Code · Python 3 · ffmpeg · Pillow (`pip install pillow`, só o gancho.py usa) · chaves OpenAI + HeyGen.
