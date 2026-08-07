#!/usr/bin/env python3
"""Gate automatico do video final do Reel (Expert Integrado / criar-reel).

POR QUE EXISTE (incidente 07/08/2026, reel roupa-infantil): a validacao da
skill era "conferir 3 frames (inicio/meio/fim) com Read". O video saiu com 20
de 64 segundos corrompidos (trechos congelados e SEM o avatar) e os 3 frames
amostrados cairam justamente em trechos bons — o defeito passou batido e so
foi visto pelo Eric depois de entregue. Tres amostras nao detectam defeito
distribuido; esta checagem varre o video inteiro.

O que detecta:
  1. FRAME CONGELADO — frames consecutivos identicos (hash), sintoma de PTS
     quebrado no concat de B-rolls heterogeneos.
  2. AVATAR AUSENTE — o Eric sumiu do quadro (procura o microfone, que esta
     sempre nas maos dele, na regiao inferior central).

Uso:
  python validar_composicao.py <video-final.mp4> [--fps-amostra 2] [--json]

Saida: relatorio + exit code 0 (aprovado) / 1 (reprovado).
NAO substitui olhar o video — substitui a amostragem de 3 frames.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("faltam dependencias: pip install numpy pillow")


def extrair(video, workdir, fps):
    subprocess.check_call([
        "ffmpeg", "-y", "-v", "error", "-i", video,
        "-vf", f"fps={fps},scale=270:-1",
        os.path.join(workdir, "f%04d.png"),
    ])
    return sorted(glob.glob(os.path.join(workdir, "f*.png")))


def tem_avatar(img):
    """Procura o microfone (roxo/violeta) na regiao inferior central."""
    h, w, _ = img.shape
    reg = img[int(h * 0.55):, int(w * 0.20):int(w * 0.80)]
    r, g, b = reg[:, :, 0], reg[:, :, 1], reg[:, :, 2]
    roxo = (b > 90) & (b > g * 1.25) & (r > g * 1.05) & (r < b * 1.1)
    return roxo.mean() * 100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--fps-amostra", type=float, default=2.0,
                    help="frames por segundo analisados (default 2)")
    ap.add_argument("--min-roxo", type=float, default=0.15,
                    help="%% minimo de pixels do microfone pra considerar o avatar presente")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.video):
        sys.exit(f"nao encontrei {args.video}")

    work = tempfile.mkdtemp(prefix="validcomp-")
    try:
        files = extrair(args.video, work, args.fps_amostra)
        congelados, sem_avatar = [], []
        prev_hash = None
        for f in files:
            idx = int(re.search(r"f(\d+)\.png$", os.path.basename(f)).group(1))
            t = (idx - 1) / args.fps_amostra
            data = open(f, "rb").read()
            h = hashlib.md5(data).hexdigest()
            if prev_hash is not None and h == prev_hash:
                congelados.append(round(t, 1))
            prev_hash = h
            img = np.asarray(Image.open(f).convert("RGB")).astype(int)
            if tem_avatar(img) < args.min_roxo:
                sem_avatar.append(round(t, 1))
        total = len(files)
    finally:
        shutil.rmtree(work, ignore_errors=True)

    ok = not congelados and not sem_avatar
    if args.json:
        print(json.dumps({
            "aprovado": ok, "frames": total,
            "congelados": congelados, "sem_avatar": sem_avatar,
        }, ensure_ascii=False))
    else:
        print(f"=== validacao: {os.path.basename(args.video)} ===")
        print(f"frames analisados: {total} ({args.fps_amostra}/s)")
        print(f"frames congelados: {len(congelados)}" + (f" -> t={congelados[:12]}" if congelados else ""))
        print(f"sem avatar       : {len(sem_avatar)}" + (f" -> t={sem_avatar[:12]}" if sem_avatar else ""))
        print()
        if ok:
            print("APROVADO: nenhum frame congelado, avatar presente do inicio ao fim.")
        else:
            print("REPROVADO: NAO entregar. Causa provavel = B-rolls heterogeneos no concat")
            print("(conferir fps/resolucao dos clip-*.mp4; o compose_reel.py normaliza sozinho")
            print("desde 07/08/2026 — se reprovou mesmo assim, investigar antes de publicar).")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
