#!/usr/bin/env python3
"""
Imprime as palavras de cada trecho JA na timeline limpa (pra sincronizar os overlays na fala).
Uso:  python word_times.py transcript.json pieces.json

clean_time = orig_word_start - piece_orig_start + piece_clean_start
(piece_clean_start = soma das duracoes dos trechos anteriores; modo VIDEO, sem gaps)
"""
import json, sys

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    pieces = json.load(open(sys.argv[2]))
    words = [w for w in d['words'] if w['type'] == 'word']
    cstart = 0.0
    for lbl, s, e in pieces:
        s, e = float(s), float(e)
        print(f"\n=== {lbl}  (clean {cstart:.2f} -> {cstart+(e-s):.2f}) ===")
        out = []
        for w in words:
            if s - 0.05 <= w['start'] <= e + 0.05:
                out.append(f"[{w['start']-s+cstart:.1f}]{w['text']}")
        print(' '.join(out))
        cstart += (e - s)

if __name__ == "__main__":
    main()
