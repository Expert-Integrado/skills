# SESSAO — {{NOME_CURSO}}

Estado dinâmico atualizado a cada execução da skill `criar-aula`. Usar pra continuar trabalho em outra máquina.

**Slug:** `{{SLUG}}`
**URL pública:** https://{{SLUG}}.ericluciano.com.br
**URL Vercel backup:** {{URL_VERCEL_BACKUP}}
**Pasta:** `{{PASTA_CURSO}}`

---

## Sessões

### {{TIMESTAMP_ATUAL}} — {{MAQUINA}}

- Skill rodou: {{O_QUE_FEZ}}
- Estado da ementa: {{STATUS_EMENTA}}
- Deploy: {{STATUS_DEPLOY}}
- Próximas pendências:
{{#PENDENCIAS}}
  - {{PENDENCIA}}
{{/PENDENCIAS}}

---

## Histórico (sessões anteriores)

{{#HISTORICO}}
### {{TIMESTAMP}} — {{MAQUINA}}
- {{RESUMO_SESSAO}}
{{/HISTORICO}}

---

## Como retomar em outra máquina

Cola no Claude Code:

```
Lê na ordem:
1. {{CAMINHO_HANDOFF}}
2. {{CAMINHO_SESSAO}}
3. Roda recall no Brain: "{{NOME_CURSO}}"

Depois me devolve status compacto e aguarda meu input.
```

Em ~30s o Claude tá com o mesmo contexto.

---

## Brain notes relacionadas

{{#BRAIN_NOTES}}
- `{{BRAIN_ID}}` — {{BRAIN_TITULO}}
{{/BRAIN_NOTES}}

---

## URLs ativas

| URL | Função |
|---|---|
| https://{{SLUG}}.ericluciano.com.br | Apresentação principal (cola gravação) |
| https://{{SLUG}}.ericluciano.com.br/materiais | Prompts copiáveis |

DNS: registro A no Cloudflare (zone `ericluciano.com.br`, id `48ff0f4bd2bf17da3f66e4d739b98e2f`).
Vercel: projeto `{{SLUG}}` no scope `contato-5574s-projects`.
