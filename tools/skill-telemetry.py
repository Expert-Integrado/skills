# skill-telemetry.py v0.1 — varre logs de sessao do Claude Code (~/.claude/projects/**/*.jsonl)
# e reporta: invocacoes de skill (tool Skill + <command-name>), erros de tool logo apos, por skill.
# Uso:  python tools/skill-telemetry.py [--dias 7]
# Heuristico (v0.1): o pareamento invocacao->erro e por proximidade no mesmo arquivo; calibrar
# na primeira rodada real. Rotina sugerida: rodar 1x/semana e abrir correcao pontual pra skill
# com erro recorrente (mesma mecanica da mentoria-equipe-seg-16h).

import glob, json, os, re, sys, time
from collections import defaultdict

dias = 7
if '--dias' in sys.argv:
    dias = int(sys.argv[sys.argv.index('--dias') + 1])
cutoff = time.time() - dias * 86400

root = os.path.expanduser('~/.claude/projects')
inv = defaultdict(int)
errs = defaultdict(int)
files_scanned = 0
# comandos built-in do CLI (nao sao skills) — fora do relatorio
BUILTIN = {'model', 'compact', 'goal', 'loop', 'clear', 'help', 'login', 'logout', 'status',
           'artifact-design', 'agent-browser', '__remote-workflow', 'workflows', 'tasks',
           'plugin', 'mcp', 'memory', 'config', 'cost', 'doctor', 'fast', 'telegram:access'}

SKILL_TOOL = re.compile(r'"name"\s*:\s*"Skill"')
SKILL_NAME = re.compile(r'"skill"\s*:\s*"([^"]+)"')
CMD_NAME = re.compile(r'<command-name>/?([\w:-]+)</command-name>')
IS_ERROR = re.compile(r'"is_error"\s*:\s*true')

for f in glob.glob(os.path.join(root, '*', '*.jsonl')):
    try:
        if os.path.getmtime(f) < cutoff or os.path.getsize(f) > 200 * 1024 * 1024:
            continue
    except OSError:
        continue
    files_scanned += 1
    last_skill = None
    try:
        with open(f, encoding='utf-8', errors='replace') as fh:
            for line in fh:
                m = CMD_NAME.search(line)
                if m:
                    if m.group(1) in BUILTIN:
                        last_skill = None
                        continue
                    last_skill = m.group(1)
                    inv[last_skill] += 1
                    continue
                if SKILL_TOOL.search(line):
                    m2 = SKILL_NAME.search(line)
                    if m2:
                        last_skill = m2.group(1)
                        inv[last_skill] += 1
                    continue
                if last_skill and IS_ERROR.search(line):
                    errs[last_skill] += 1
                    last_skill = None  # 1 erro por invocacao no v0.1
    except OSError:
        continue

print(f'skill-telemetry v0.1 — ultimos {dias} dias, {files_scanned} sessoes varridas')
if not inv:
    print('nenhuma invocacao de skill encontrada na janela (ou schema de log mudou — calibrar parser)')
    sys.exit(0)
print(f'{"skill":40} {"invocacoes":>10} {"erros":>6}')
for s in sorted(inv, key=inv.get, reverse=True):
    print(f'{s:40} {inv[s]:>10} {errs.get(s, 0):>6}')
if errs:
    print('\nskills com erro (candidatas a correcao pontual):')
    for s in sorted(errs, key=errs.get, reverse=True):
        print(f'  {s}: {errs[s]} erro(s) em {inv.get(s, 0)} invocacao(oes)')
