#!/usr/bin/env python3
"""
to_pdf.py — Converte DOCX ou PPTX em PDF usando LibreOffice headless.

Uso:
    python to_pdf.py --in caminho/arquivo.docx --outdir caminho/saida/

Saída: <outdir>/<nome_base>.pdf

Dependências: LibreOffice instalado e disponível no PATH como `libreoffice`
(ou `soffice`). Em ambientes Cowork / sandbox Linux, geralmente já está
disponível.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def _which_office() -> str | None:
    for cand in ('libreoffice', 'soffice'):
        path = shutil.which(cand)
        if path:
            return path
    return None


def convert(input_path: Path, outdir: Path) -> Path:
    soffice = _which_office()
    if not soffice:
        raise RuntimeError(
            'LibreOffice não encontrado no PATH. Instale o libreoffice ou execute o conversor em ambiente com soffice disponível.'
        )

    outdir.mkdir(parents=True, exist_ok=True)
    cmd = [
        soffice,
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', str(outdir),
        str(input_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f'Falha na conversão: {result.stderr}')

    expected = outdir / (input_path.stem + '.pdf')
    if not expected.exists():
        raise RuntimeError(f'PDF esperado não foi criado: {expected}')
    return expected


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--in', dest='input', required=True, type=Path)
    parser.add_argument('--outdir', required=True, type=Path)
    args = parser.parse_args(argv)

    pdf = convert(args.input, args.outdir)
    print(f'OK: {pdf}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
