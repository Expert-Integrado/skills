# Golden run — marketing:blog-para-linkedin

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** "fila da semana" — escolher o próximo post por força do índice comercial pulando já-derivados, derivar post nativo, validar voz, registrar na fila.
- **Resultado: APROVADO ponta a ponta com entregável real.** Fila lida (32 derivações anteriores em `linkedin-fila.md`), próximo por força = `caso-cliente-juridico-automacao` (força 5, fundo, case). MDX lido no repo do blog, draft nativo escrito (anatomia: hook seco de dado, corpo ~1.250 chars em parágrafos de 1-2 linhas, fechamento de posição, link só no 1º comentário com UTM correto), `check_message` = score 9/10 com ZERO violação hard, registrado como Post 7 na fila (seção + linha na tabela).

## Achados e fixes (marketing 2.13.3)

1. **Fallback de voz apontava pra memória inexistente (DEFEITO, SKILL.md).** A linha do SEMPRE mandava, sem MCP, "ler `eric-voice.md` da memória" — essa memory não existe (era seed legado; o CLAUDE.md global já foi corrigido nisso em run anterior). Fix: fallback agora aponta pra fonte canônica `~/.claude/voice-guide.md`.
2. **Instrução de voz sem aviso operacional (doc).** `get_voice_guide` retorna ~90KB e estoura o limite de retorno da tool (vira arquivo persistido); e os soft warnings do `check_message` são régua de chat (mediana 24 chars) que um post de feed sempre viola. Fix na mesma linha: ler só as seções relevantes do guide e tratar como trava apenas violação hard / score < 7.

## Observações (não-defeito)

- Pré-requisitos reais todos presentes e nos paths documentados: repo do blog (`C:\repos\expertintegrado-blog`), índice comercial (205 posts, campo `forca`), `linkedin-fila.md` no Workspace.
- A regra "pular já-derivados" exigiu parsear a tabela de registro da fila — funcionou, mas o registro é a única fonte desse estado (se alguém publicar sem registrar, a skill re-deriva). Comportamento aceito; a fila é o contrato.
- Publicação manual por design (draft na fila, quem posta é o Eric) — nenhum gate cruzado.
