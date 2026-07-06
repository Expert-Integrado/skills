#!/bin/sh
# Instala o pre-commit hook do skill-gate neste clone. Rodar da raiz do repo:
#   sh tools/install-hooks.sh
# Repetir em cada maquina/clone (hooks nao viajam pelo git).
ROOT="$(git rev-parse --show-toplevel)" || exit 1
HOOK="$ROOT/.git/hooks/pre-commit"
cat > "$HOOK" <<'EOF'
#!/bin/sh
# skill-gate: valida SKILL.md staged antes do commit (mojibake, secrets, frontmatter,
# desacentuacao vs HEAD, perda de valores criticos). SKIP_SKILL_GATE=1 pra forcar.
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep 'SKILL\.md$')
[ -z "$STAGED" ] && exit 0
PY="$(command -v python3 || command -v python || echo "C:/Users/Eric Luciano/AppData/Local/Programs/Python/Python312/python.exe")"
PYTHONIOENCODING=utf-8 "$PY" "$(git rev-parse --show-toplevel)/tools/skill-gate.py" --staged
EOF
chmod +x "$HOOK"
echo "pre-commit hook instalado em $HOOK"
