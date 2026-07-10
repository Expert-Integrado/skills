#!/usr/bin/env bash
# pandoc-docx.sh — converte Ementa.md → Ementa.docx
# uso: ./pandoc-docx.sh <pasta-do-curso>

set -euo pipefail

PASTA="$1"
EMENTA_MD="$PASTA/01_Ementa/Ementa.md"
EMENTA_DOCX_FINAL="$PASTA/04_Entregaveis/Ementa.docx"

# Detecção por capacidade (portável): env PANDOC > PATH > fallback WinGet do usuário atual
PANDOC="${PANDOC:-$(command -v pandoc || find "${LOCALAPPDATA:-}/Microsoft/WinGet/Packages" -name pandoc.exe 2>/dev/null | head -1)}"

if [ -z "$PANDOC" ] || ! "$PANDOC" --version >/dev/null 2>&1; then
  echo "❌ Pandoc não encontrado (PATH, env PANDOC e WinGet vazios)"
  exit 1
fi

mkdir -p "$PASTA/04_Entregaveis"

echo "📄 Gerando Ementa.docx..."
"$PANDOC" "$EMENTA_MD" -o "$EMENTA_DOCX_FINAL"
echo "  ✓ $EMENTA_DOCX_FINAL ($(stat -c %s "$EMENTA_DOCX_FINAL" 2>/dev/null || stat -f %z "$EMENTA_DOCX_FINAL") bytes)"
