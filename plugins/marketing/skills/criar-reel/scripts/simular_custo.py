#!/usr/bin/env python3
"""Simulador de custo do reel (criar-reel) -- roda ANTES de gastar credito.

Estima o custo do video com os precos REAIS (HeyGen lip-sync + ElevenLabs + imagens).
Os B-rolls vem PRIMEIRO do banco remoto (gratis) e, nos gaps, do HIGGSFIELD, que
consome a FRANQUIA MENSAL da assinatura (200 creditos/mes) -- por isso B-roll novo
sai a R$ 0 de caixa, igual imagem feita na assinatura. O simulador mostra o consumo
de creditos separado pra vigiar a franquia, e avisa se o reel estourar o que resta.

Diferenca pra v2: a v3 gera a FALA no ElevenLabs (barato) e usa o HeyGen so pro
lip-sync (Avatar V). Kling saiu do fluxo em 28/07/2026 (resource pack expirado sem
uso; decisao do Eric = rodar B-roll no Higgsfield) -- ver references/custos.md.

Regra de caixa (definida pelo Eric): entram HeyGen, ElevenLabs e imagens(se API).
Claude (tokens), assinatura Higgsfield e banco de B-roll = fora do total.

Uso:
  python simular_custo.py --cenas-file <reel>/cenas.txt --clips 10 --clips-hf 2
  python simular_custo.py --segundos 53 --chars 938 --clips 10 --clips-hf 0

Flags:
  --clips N         total de B-rolls (default: ceil(duracao / 5))
  --clips-hf N      quantos B-rolls saem no Higgsfield (franquia). Default: 0 (tudo do banco)
  --clips-kling N   DEPRECIADO -- alias de --clips-hf (Kling fora do fluxo desde 28/07/2026)
  --creditos-restantes N  quanto sobrou da franquia do mes (default: 200, o teto do plano)
  --engine          avatar_iv (default, lip-sync Avatar V) | avatar_video (~4x mais barato)
  --modo            api (default) | plano
  --imagens         api (paga, default) | assinatura (gratis, feita na UI)
  --cambio          R$/US$ (default 5.10)
"""
import argparse
import math
import os
import sys

# taxas REAIS conhecidas (ver references/custos.md; fonte: CSV de uso HeyGen do Eric 14/06/2026)
HEYGEN = {
    ("avatar_iv", "api"):      {"cr_s": 0.062, "usd_cr": 1.00},
    ("avatar_iv", "plano"):    {"cr_s": 0.022, "usd_cr": 0.145},
    ("avatar_video", "api"):   {"cr_s": 0.017, "usd_cr": 1.00},
    ("avatar_video", "plano"): {"cr_s": 0.006, "usd_cr": 0.145},  # extrapolado
}
CHARS_POR_SEG = 17.8   # ritmo de fala medido (938 chars / 52.8s)
EL_USD_POR_1K = 0.22   # ElevenLabs Creator/Pro (US$/1000 chars)
IMG_USD = 0.21         # gpt-image-2 alta qualidade (por IMAGEM, via API)
CLIP_DUR = 5           # ~5s por trecho de B-roll (regra ceil(duracao / 5))
# Higgsfield: medido 28/07/2026 (seedance1_5, 480p, 4s, sem audio). 720p custa ~2x.
HF_CRED_POR_CLIPE = 1.2
HF_FRANQUIA_MES = 200  # creditos/mes do plano Starter (renova dia 10)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cenas-file")
    ap.add_argument("--chars", type=int)
    ap.add_argument("--segundos", type=float)
    ap.add_argument("--clips", type=int)
    ap.add_argument("--clips-hf", type=int, default=0)
    # alias historico: Kling saiu do fluxo em 28/07/2026, mas chamadas antigas nao quebram
    ap.add_argument("--clips-kling", type=int, default=0)
    ap.add_argument("--creditos-restantes", type=float, default=float(HF_FRANQUIA_MES))
    ap.add_argument("--engine", default="avatar_iv", choices=["avatar_iv", "avatar_video"])
    ap.add_argument("--modo", default="api", choices=["api", "plano"])
    ap.add_argument("--imagens", default="api", choices=["api", "assinatura"])
    ap.add_argument("--cambio", type=float, default=5.10)
    ap.add_argument("--img-usd", type=float, default=IMG_USD)
    args = ap.parse_args()

    # caracteres
    chars = args.chars
    if chars is None and args.cenas_file and os.path.exists(args.cenas_file):
        txt = open(args.cenas_file, encoding="utf-8").read()
        chars = sum(1 for c in txt if c not in "\r\n")
    chars = chars or 0

    # duracao
    seg = args.segundos
    if seg is None:
        if chars:
            seg = chars / CHARS_POR_SEG
        else:
            sys.exit("passe --segundos OU --chars OU --cenas-file")

    # clipes: total, banco (gratis) e Higgsfield (franquia da assinatura)
    clips = args.clips if args.clips is not None else math.ceil(seg / CLIP_DUR)
    pedido_hf = args.clips_hf or args.clips_kling  # alias depreciado ainda funciona
    clips_hf = max(0, min(pedido_hf, clips))
    clips_banco = max(0, clips - clips_hf)
    n_imgs = clips_hf + 1  # 1 frame por gap + 1 thumb; clip do banco nao gera frame
    hf_creditos = clips_hf * HF_CRED_POR_CLIPE
    cambio = args.cambio
    rate = HEYGEN[(args.engine, args.modo)]

    def brl(u):
        return u * cambio

    # componentes de custo CONHECIDO
    hg_usd = seg * rate["cr_s"] * rate["usd_cr"]
    el_usd = chars / 1000 * EL_USD_POR_1K
    img_paga = args.imagens == "api"
    img_usd = (n_imgs * args.img_usd) if img_paga else 0.0
    conhecido_usd = hg_usd + el_usd + img_usd
    conhecido_brl = brl(conhecido_usd)
    minutos = seg / 60 if seg else 0

    L = "=" * 66
    print(L)
    print("SIMULACAO DE CUSTO  --  criar-reel")
    print(L)
    print(f"Roteiro: {chars} caracteres   duracao estimada: {seg:.1f}s ({minutos:.2f} min)")
    print(f"HeyGen: {args.engine}/{args.modo} (lip-sync)  |  Imagens: {args.imagens}  |  cambio R${cambio:.2f}/US$")
    print(f"B-rolls: {clips} total = {clips_banco} do BANCO (gratis) + {clips_hf} no HIGGSFIELD")
    print("-" * 66)
    print(f"{'Componente':<26}{'detalhe':<15}{'US$':>9}{'R$':>11}")
    print(f"{'HeyGen (lip-sync)':<26}{f'{seg:.0f}s':<15}{hg_usd:>9.2f}{brl(hg_usd):>11.2f}")
    print(f"{'ElevenLabs (fala)':<26}{f'{chars} ch':<15}{el_usd:>9.2f}{brl(el_usd):>11.2f}")
    img_det = f"{n_imgs} imgs" if img_paga else "assinatura"
    print(f"{'Imagens (frames+thumb)':<26}{img_det:<15}{img_usd:>9.2f}{brl(img_usd):>11.2f}")
    print(f"{'B-roll banco':<26}{f'{clips_banco} clips':<15}{0:>9.2f}{0:>11.2f}")
    hf_det = f"{clips_hf} clips" if clips_hf else "0 clips"
    print(f"{'B-roll Higgsfield':<26}{hf_det:<15}{0:>9.2f}{0:>11.2f}")
    print("-" * 66)
    if minutos:
        print(f"(custo conhecido por minuto: US${conhecido_usd/minutos:.2f} / R${conhecido_brl/minutos:.2f})")
    fora = "Claude (tokens) + B-roll Higgsfield (franquia da assinatura)"
    if not img_paga:
        fora += " + imagens (assinatura)"
    print(f"Coberto pela assinatura, fora do total: {fora}")
    print(L)
    print(f"CUSTO CONHECIDO: US$ {conhecido_usd:.2f}  /  R$ {conhecido_brl:.2f}")
    if clips_hf:
        resta = args.creditos_restantes - hf_creditos
        print(f"+ HIGGSFIELD: {clips_hf} clipe(s) = {hf_creditos:.1f} creditos da franquia "
              f"({HF_FRANQUIA_MES}/mes) -- R$ 0 de caixa")
        if resta < 0:
            print(f"  !! ESTOURA A FRANQUIA: faltam {abs(resta):.1f} creditos "
                  f"(informado como restante: {args.creditos_restantes:.1f}). "
                  "Cobrir mais trechos com o banco, ou comprar top-up antes de rodar.")
        elif resta < HF_FRANQUIA_MES * 0.15:
            print(f"  ! franquia baixa: sobrariam {resta:.1f} creditos ate o dia 10.")
        else:
            print(f"  franquia depois deste reel: {resta:.1f} creditos")
    else:
        print("+ HIGGSFIELD: 0 clipes (tudo coberto pelo banco gratis)")
    print(L)
    extra = f"  (+ {hf_creditos:.1f} creditos da franquia Higgsfield)" if clips_hf else ""
    print(f"==> ESSE VIDEO VAI CUSTAR ~R$ {conhecido_brl:.2f}{extra}.  Prosseguir? (s/n)")
    print(L)


if __name__ == "__main__":
    main()
