#!/usr/bin/env bash
# slug.sh — gera slug kebab-case a partir do nome do curso
# uso: ./slug.sh "Como Construir uma Empresa do Zero com IA" → construir-empresa-com-ia

set -euo pipefail

NOME="$1"

# Remove "como", "uma", "do", "com", "o", "a", "de" e similares no início/middle se repetir muito
# Lowercase, remove acentos, troca não-alfanumérico por hífen, colapsa hífens repetidos
# Transliteração SEM iconv (não existe no Git Bash do Windows): s/// literal por
# sequência UTF-8 é byte-safe em qualquer locale.
SLUG=$(echo "$NOME" \
  | sed -e 's/á/a/g;s/à/a/g;s/â/a/g;s/ã/a/g;s/ä/a/g;s/Á/a/g;s/À/a/g;s/Â/a/g;s/Ã/a/g;s/Ä/a/g' \
        -e 's/é/e/g;s/è/e/g;s/ê/e/g;s/ë/e/g;s/É/e/g;s/È/e/g;s/Ê/e/g;s/Ë/e/g' \
        -e 's/í/i/g;s/ì/i/g;s/î/i/g;s/ï/i/g;s/Í/i/g;s/Ì/i/g;s/Î/i/g;s/Ï/i/g' \
        -e 's/ó/o/g;s/ò/o/g;s/ô/o/g;s/õ/o/g;s/ö/o/g;s/Ó/o/g;s/Ò/o/g;s/Ô/o/g;s/Õ/o/g;s/Ö/o/g' \
        -e 's/ú/u/g;s/ù/u/g;s/û/u/g;s/ü/u/g;s/Ú/u/g;s/Ù/u/g;s/Û/u/g;s/Ü/u/g' \
        -e 's/ç/c/g;s/Ç/c/g;s/ñ/n/g;s/Ñ/n/g' \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/[^a-z0-9]/-/g' \
  | sed 's/--*/-/g' \
  | sed 's/^-//; s/-$//')

# Se começar com "como-" ou "uma-", remove
SLUG=$(echo "$SLUG" | sed -E 's/^(como|uma|um|o|a|de|do|da|com|para|pra)-//g')

echo "$SLUG"
