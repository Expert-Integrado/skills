#!/usr/bin/env python3
"""
Quebra a transcricao em frases com timestamps, pra voce achar os takes bons/ruins.
Uso:  python segment_map.py transcript.json [segmentos.txt]
Saida: linhas [idx] inicio-fim (dur) texto   (eventos de audio marcados com <<...>>)
"""
import json, sys

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2] if len(sys.argv) > 2 else "segmentos.txt"
    segs, cur, prev_end = [], [], None
    def flush():
        nonlocal cur
        if cur:
            txt = ' '.join(x['text'] for x in cur).strip()
            segs.append((cur[0]['start'], cur[-1]['end'], txt)); cur = []
    for w in d['words']:
        if w['type'] == 'spacing':
            continue
        if w['type'] == 'audio_event':
            flush(); segs.append((w['start'], w['end'], '<<' + w['text'] + '>>')); prev_end = w['end']; continue
        if prev_end is not None and w['start'] - prev_end > 0.45:
            flush()
        cur.append(w)
        if w['text'].strip().endswith(('.', '?', '!', '…', '...')):
            flush()
        prev_end = w['end']
    flush()
    lines = [f"[{i:03d}] {s:7.2f}-{e:7.2f} ({e-s:4.1f}s) {t}" for i, (s, e, t) in enumerate(segs)]
    open(out, "w", encoding="utf-8").write(f"DURACAO {round(d.get('audio_duration_secs',0),1)}s\n" + "\n".join(lines))
    print(f"{len(segs)} segmentos -> {out}")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
