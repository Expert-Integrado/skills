# Cortes: achar os takes bons e emendar limpo

## Como ler o `segmentos.txt`
Cada linha: `[idx] início-fim (dur) texto`. Eventos de áudio viram `<<(pigarro)>>`. Procure:
- **Retakes:** a mesma frase aparece 2-3x (a pessoa erra e refaz). Fica o ÚLTIMO/melhor take. Pistas: "deixa eu voltar",
  "de novo", a frase recomeçando.
- **Comentários de produção:** "João, acho que...", "tu se vira aí", "e aí cê muda a animação" → fora.
- **Flubs no fim:** "...agentes de A--", "com trabalho fa--", "diagnóstica não existe" → corte antes do flub.
- **Silêncios/pigarros/notificação inicial** → fora.

## Montar a KEEP-LIST (pieces.json)
Lista de `["rótulo", início, fim]` na ORDEM NARRATIVA FINAL (pode reordenar trechos da gravação). Ex.:
```json
[["intro",505.95,515.13],["hook",82.42,96.20],["eco",99.05,116.52],
 ["ment1",121.90,132.78],["ment2",248.24,275.05],["lab1",284.28,304.79],
 ["lab2",334.50,362.05],["lab3",362.30,377.55],["lab4",384.65,405.85],["cta",454.27,477.20]]
```
Os rótulos viram as "seções" do vídeo (e ajudam a nomear os overlays).

## Achar os tempos exatos de corte
Para cada fronteira, olhe os `end` das palavras no transcript (não chute):
```python
python -c "import json;[print(f\"{w['start']:.2f}-{w['end']:.2f} {w['text']}\") for w in json.load(open('transcript.json'))['words'] if w['type']=='word' and 513<=w['start']<=515.4]"
```
- **Início do trecho:** ~0.08-0.12s antes do `start` da primeira palavra.
- **Fim do trecho:** o `end` da última palavra boa + ~0.10-0.15s. Sem respiro depois.
- **Cortar palavra duplicada:** se o fim tem "...negócio.[end X] Um[X+0.02]", corte em X+0.01 (deixa "negócio.", tira "Um").

## Verificar
Depois de gerar o `base.mp4`/`mp3`, transcreva trechos das emendas pra confirmar que ficou limpo:
```bash
ffmpeg -y -ss <t1> -to <t2> -i base.mp4 s.mp3 -q:a 2
python <skill>/scripts/transcribe.py s.mp3 r.json   # leia r.json: a emenda flui? sem palavra repetida?
```

## Versão MP3 da narração (entregável separado)
`cut_base.py ... --out narracao-limpa.mp3 --audio` gera a fala limpa com 0.15s de silêncio entre os trechos
(soa natural pra fala avulsa). O `base.mp4` (vídeo) é concatenado DURO, sem gaps, pra preservar o lip-sync.
