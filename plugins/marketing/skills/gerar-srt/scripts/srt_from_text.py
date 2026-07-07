#!/usr/bin/env python3
"""
Gera um .srt a partir de TEXTO (sem áudio) — para quando só há o print do Ray Jam
e não o vídeo. O tempo é ESTIMADO pela quantidade de caracteres de cada segmento,
distribuído proporcionalmente ao longo da duração total. Aproximado: ajustar no editor.

Usage:
    python srt_from_text.py segmentos.txt --duration 65 [--out saida.srt] [--start 0]

segmentos.txt: um segmento de legenda por linha (linhas em branco são ignoradas).
--duration: duração total da fala em segundos (ex: 65 para 1:05).
"""
import sys, os

# Console/pipe do Windows usa cp1252 — sem isto os acentos do que o script imprime viram mojibake.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def fmt(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    if len(sys.argv) < 2 or "--duration" not in sys.argv:
        sys.exit("usage: python srt_from_text.py segmentos.txt --duration <seg> [--out f.srt] [--start S]")
    txt = sys.argv[1]
    args = sys.argv[2:]
    dur = None; out = os.path.splitext(txt)[0] + ".srt"; start = 0.0
    for i, a in enumerate(args):
        if a == "--duration" and i + 1 < len(args): dur = float(args[i + 1])
        if a == "--out" and i + 1 < len(args): out = args[i + 1]
        if a == "--start" and i + 1 < len(args): start = float(args[i + 1])

    lines = [ln.strip() for ln in open(txt, encoding="utf-8") if ln.strip()]
    if not lines:
        sys.exit("ERRO: arquivo de segmentos vazio.")
    total_chars = sum(max(len(ln), 1) for ln in lines)
    span = dur - start

    blocks, t = [], start
    for i, ln in enumerate(lines, 1):
        slice_s = span * (max(len(ln), 1) / total_chars)
        t0, t1 = t, t + slice_s
        blocks.append(f"{i}\n{fmt(t0)} --> {fmt(t1)}\n{ln}\n")
        t = t1
    open(out, "w", encoding="utf-8").write("\n".join(blocks) + "\n")
    print(f"SRT (tempo ESTIMADO) gerado: {out}")
    print("Atenção: o tempo é aproximado (sem áudio). Ajustar no CapCut se ficar fora de sincronia.")


if __name__ == "__main__":
    main()
