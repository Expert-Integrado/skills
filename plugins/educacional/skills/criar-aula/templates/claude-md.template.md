# CLAUDE.md — {{NOME_CURSO}}

Regras locais dessa aula/curso. Carregam quando Claude opera dentro desta pasta.

## Contexto

- **Nome:** {{NOME_CURSO}}
- **Slug/URL:** `{{SLUG}}` → https://{{SLUG}}.ericluciano.com.br
- **Cliente:** {{CLIENTE}}
- **Duração-alvo:** {{CARGA_HORARIA}} em {{NUM_AULAS}} aulas (~10min cada)
- **Status:** {{STATUS_GRAVACAO}}

## Padrões herdados da skill `criar-aula`

Lê automaticamente:
- `~/.claude/plugins/cache/ericluciano/lab/2.0.0/skills/criar-aula/docs/PADRAO-EMENTA.md`
- `~/.claude/plugins/cache/ericluciano/lab/2.0.0/skills/criar-aula/docs/PADRAO-MATERIAIS.md`
- `~/.claude/plugins/cache/ericluciano/lab/2.0.0/skills/criar-aula/docs/ANTI-PATTERNS.md`

## Regras específicas dessa aula

{{REGRAS_ESPECIFICAS}}

## Onde salvar o quê

- Decisão estratégica sobre o curso → Brain (`save_note` com kind=decision, domain=education)
- Estrutura/ementa em iteração → `01_Ementa/Ementa.md`
- Versão final → `04_Entregaveis/`
- Prompts e exemplos reutilizáveis → `03_Assets/`
- Estado dinâmico → `SESSAO.md`
