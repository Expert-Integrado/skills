# criar-aula

Skill que cria estrutura completa de aula/curso gravado: pasta organizada, Ementa.md+docx, apresentação HTML 16:9, materiais HTML com prompts copiáveis, docs de continuidade entre máquinas, deploy Vercel + DNS Cloudflare automáticos.

## Estrutura da skill

```
criar-aula/
├── SKILL.md                       # descrição (carregada pelo Claude Code)
├── README.md                      # este arquivo
├── docs/
│   ├── PADRAO-EMENTA.md           # regras canônicas da ementa (12 princípios Maria + decisões Curso 01)
│   ├── PADRAO-MATERIAIS.md        # regras dos prompts copiáveis (Direto vs Meta)
│   ├── ANTI-PATTERNS.md           # bugs aprendidos em prod (NUNCA fazer)
│   └── FLUXO-EXECUCAO.md          # ordem das operações + tratamento de erro
├── templates/
│   ├── ementa.template.md         # esqueleto com placeholders
│   ├── handoff.template.md        # doc estático de continuidade
│   ├── sessao.template.md         # doc dinâmico atualizado a cada execução
│   ├── claude-md.template.md      # regras locais da pasta
│   └── vercel.json                # config Vercel cleanUrls
└── scripts/
    ├── slug.sh                    # gera slug kebab-case
    ├── pandoc-docx.sh             # md → docx
    └── deploy.sh                  # Vercel + Cloudflare + SSL
```

## Base de evidência

Esta skill foi extraída do **Curso 01 G4 — Como Construir uma Empresa do Zero com IA** (27/05/2026, 16 aulas, 21 decisões salvas no Brain). Os arquivos canônicos que serviram de referência viva:

- `OneDrive/Workspace/Educacional/04_Cursos_G4_Gravados/01_Como_Construir_Empresa_com_IA/03_Assets/slides-html/apresentacao.html`
- `OneDrive/Workspace/Educacional/04_Cursos_G4_Gravados/01_Como_Construir_Empresa_com_IA/03_Assets/slides-html/materiais/index.html`
- `OneDrive/Workspace/Educacional/04_Cursos_G4_Gravados/01_Como_Construir_Empresa_com_IA/01_Ementa/Ementa.md`

Deploy ativo: https://g4-construir-empresa-com-ia.ericluciano.com.br

## Pré-requisitos

- `op` (1Password CLI) logado em `team-expertintegrado.1password.com`
- Tokens no 1Password vault `Agentes Eric`: `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`
- `pandoc` instalado (geralmente em `C:/Users/.../WinGet/Packages/JohnMacFarlane.Pandoc_*`)
- `npx` + Node.js
- Acesso a `ericluciano.com.br` na Cloudflare (zone id `48ff0f4bd2bf17da3f66e4d739b98e2f`)
- Acesso a scope Vercel `contato-5574s-projects`

## Como invocar

```
"cria aula sobre <tema>"
"novo curso pra <evento>"
"transforma esses insumos em curso (joguei na pasta 00_Inputs)"
"continua aula <slug>"  (continua aula já criada)
```

## Como atualizar a skill

Skill mora em `github.com/Expert-Integrado/skills/plugins/educacional/skills/criar-aula/`.

Pra atualizar:
1. `git pull` no clone local
2. Edita arquivos
3. Commit + push
4. Em qualquer máquina: `/plugin update lab@ericluciano`

## Status

- **Nasceu:** 27/05/2026
- **Versão:** 0.1.0 (sandbox)
- **Pronto pra graduar:** após 3 cursos criados pela skill + 0 bugs reportados
