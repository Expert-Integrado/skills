# skill-gate.py — gate mecanico de qualidade pra SKILL.md (pre-commit + uso manual)
# Uso:
#   python tools/skill-gate.py <arquivo1> [arquivo2 ...]   # valida working tree
#   python tools/skill-gate.py --staged                    # valida arquivos SKILL.md staged (pre-commit)
# Escape hatch (justificar no commit): SKIP_SKILL_GATE=1 git commit ...
# Saida: [skill] ERRO/AVISO por check; exit 1 se houver ERRO.
#
# Checks estaticos: mojibake, secret literal, frontmatter minimo, blocos NUNCA/SEMPRE,
#   allowed-tools vs tools mcp__ citadas no corpo, fence de codigo nao fechado.
# Checks diff vs HEAD (pulados em arquivo novo): desacentuacao de linha existente,
#   perda de valor critico (hex, ID longo, URL, R$, nome de tool mcp__).

import os, re, subprocess, sys, unicodedata

MOJIBAKE = re.compile(r'Ã[£§©µ¡ª³º]|â€œ|â€\x9d|â€"|Ã©|Ã­|Ãµ')
SECRETS = re.compile(r'vcp_[A-Za-z0-9]{8,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{10,}|xox[bp]-[A-Za-z0-9]|cfut_[A-Za-z0-9]{8,}|eyJhbGciOi')
TOOL = re.compile(r'mcp__[A-Za-z0-9_-]+__[a-z0-9_]+')
# valores criticos: perda vira ERRO; numeros simples nao entram (falso positivo comum)
CRITICAL_VALUE = re.compile(r'#[0-9A-Fa-f]{6}\b|\b[0-9a-f]{24,}\b|\b[0-9]{10,}\b|R\$ ?[\d.][\d.,]*|https?://[^\s\)\]"\'`]+')

def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def git(args):
    return subprocess.run(['git'] + args, capture_output=True).stdout.decode('utf-8', errors='replace')

def staged_files():
    out = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
    return [f for f in out.splitlines() if f.endswith('SKILL.md')]

def content_of(f, staged):
    if staged:
        return git(['show', ':0:' + f])
    return open(f, encoding='utf-8', errors='replace').read()

def head_of(f):
    r = subprocess.run(['git', 'show', 'HEAD:' + f], capture_output=True)
    return r.stdout.decode('utf-8', errors='replace') if r.returncode == 0 else None

def frontmatter(body):
    m = re.match(r'^---\n(.*?)\n---\n', body, re.S)
    return m.group(1) if m else None

def check(f, staged):
    errs, warns = [], []
    skill = f.replace(chr(92), '/').rstrip('/').split('/')[-2]
    new = content_of(f, staged)

    # --- estaticos ---
    for i, line in enumerate(new.splitlines(), 1):
        if MOJIBAKE.search(line):
            errs.append(f'mojibake na linha {i}: {line.strip()[:80]}')
        if SECRETS.search(line):
            errs.append(f'padrao de secret literal na linha {i}')
    fm = frontmatter(new)
    if fm is None:
        errs.append('sem frontmatter ---')
    else:
        if not re.search(r'^name:', fm, re.M):
            errs.append('frontmatter sem name:')
        if not re.search(r'^description:', fm, re.M):
            errs.append('frontmatter sem description:')
    if len(re.findall(r'^\s*```', new, re.M)) % 2 != 0:
        errs.append('numero impar de fences ``` em inicio de linha (arquivo truncado?)')
    if not re.search(r'^## NUNCA', new, re.M):
        warns.append('sem bloco ## NUNCA (rubric R4)')
    if not re.search(r'^## SEMPRE', new, re.M):
        warns.append('sem bloco ## SEMPRE (rubric R4)')
    if fm and 'allowed-tools' in fm:
        allowed = set(TOOL.findall(fm))
        cited = set(TOOL.findall(new[len(fm):]))
        missing = cited - allowed
        if missing:
            warns.append('tools mcp__ citadas no corpo fora do allowed-tools (ok se for mencao em prosa): ' + ', '.join(sorted(missing)[:5]))

    # --- diff vs HEAD ---
    old = head_of(f)
    if old:
        for line in old.splitlines():
            t = line.strip()
            if len(t) < 20 or t == deacc(t):
                continue
            if t in new:
                continue
            if deacc(t) in new:
                errs.append('linha DESACENTUADA vs HEAD: ' + t[:90])
        lost = sorted(set(CRITICAL_VALUE.findall(old)) - set(CRITICAL_VALUE.findall(new)))
        if lost:
            warns.append(f'{len(lost)} valor(es) critico(s) do HEAD ausentes no novo (conferir se a perda e deliberada): ' + ' | '.join(lost[:6]))

    for e in errs:
        print(f'[{skill}] ERRO: {e}')
    for w in warns:
        print(f'[{skill}] AVISO: {w}')
    if not errs and not warns:
        print(f'[{skill}] ok')
    return len(errs)

def main():
    if os.environ.get('SKIP_SKILL_GATE') == '1':
        print('skill-gate: pulado via SKIP_SKILL_GATE=1')
        return 0
    args = sys.argv[1:]
    staged = '--staged' in args
    files = staged_files() if staged else [a for a in args if a != '--staged']
    if not files:
        return 0
    total_errs = sum(check(f, staged) for f in files)
    if total_errs:
        print(f'\nskill-gate: {total_errs} erro(s). Commit bloqueado. (SKIP_SKILL_GATE=1 pra forcar, justificando no commit.)')
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
