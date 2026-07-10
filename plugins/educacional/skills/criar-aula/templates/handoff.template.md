# HANDOFF — {{NOME_CURSO}}

Doc-ponte estático com paths/URLs/IDs pra retomar entre máquinas. **Atualizado quando a estrutura muda** (poucos updates — pra estado dinâmico, ver `SESSAO.md`).

---

## Como retomar (cola no Claude Code)

```
Estou continuando o curso {{NOME_CURSO}}. Lê na ordem:
1. {{CAMINHO_HANDOFF}}
2. {{CAMINHO_SESSAO}}
3. {{CAMINHO_EMENTA}}

Roda recall no Brain: "{{NOME_CURSO}}".

Depois me devolve status compacto.
```

---

## Estado atual

- **Ementa fechada:** {{NUM_AULAS}} aulas em {{NUM_MODULOS}} módulos
- **Apresentação HTML:** publicada em https://{{SLUG}}.ericluciano.com.br
- **Materiais (prompts):** https://{{SLUG}}.ericluciano.com.br/materiais
- **Status gravação:** {{STATUS_GRAVACAO}}

---

## Arquivos canônicos

| Arquivo | Função |
|---|---|
| `HANDOFF.md` | Este doc — ponte estática |
| `SESSAO.md` | Estado dinâmico (atualiza a cada execução) |
| `VALIDACAO-PRE-GRAVACAO.md` | Checklist OK/AJUSTE |
| `01_Ementa/Ementa.md` | Ementa canônica markdown |
| `04_Entregaveis/Ementa.docx` | Ementa final em Word |
| `02_Roteiros/Kit_Gravacao.md` | Cola interna Eric |
| `02_Roteiros/setup-preparatorio.md` | Setup pré-pronto |
| `03_Assets/slides-html/apresentacao.html` | HTML principal (cola visual) |
| `03_Assets/slides-html/materiais/index.html` | HTML dos prompts copiáveis |

---

## URLs ativas

- **Apresentação:** https://{{SLUG}}.ericluciano.com.br
- **Materiais:** https://{{SLUG}}.ericluciano.com.br/materiais
- **Vercel backup:** {{URL_VERCEL_BACKUP}}

---

## Notas Brain de referência

{{#BRAIN_NOTES}}
- `{{BRAIN_ID}}` — {{BRAIN_TITULO}}
{{/BRAIN_NOTES}}

Pra recall amplo: `mcp__expert-brain__recall("{{NOME_CURSO}}")`.

---

## Setup por máquina

### PC Eric
Google Drive (Drive for Desktop) sincroniza o Workspace, 1Password ativo, Claude Code com plugins. Tudo pronto.

### Notebook Eric
- Google Drive (Drive for Desktop) instalado e sincronizando
- 1Password com sessão (`op signin` se preciso)
- Claude Code com plugins do marketplace expertintegrado

### VPS Hostinger
Sem Drive for Desktop — acesso ao Drive corp sob demanda via rclone (pasta claude-workspace).

---

## Próximo movimento

Ver `SESSAO.md` pra estado mais recente e pendências.
