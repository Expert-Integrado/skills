# PADRAO-MATERIAIS — Regras canônicas dos prompts copiáveis

Documento de referência embutido na skill `criar-aula`. Define como os prompts viram materiais de apoio interativos em `/materiais`.

---

## 1. Categorização: Direto vs Meta

Todo prompt copiável é classificado em uma das 2 categorias:

### Direto (tag verde)
Cola em qualquer sessão LLM (Claude, ChatGPT, Gemini) sem dependência de contexto prévio.

Exemplos:
- "IA, me entreviste" (Aula 3) — funciona em qualquer sessão nova
- Briefing inicial da empresa (Aula 4) — inicia a sessão principal

### Meta (tag dourada)
Cola na **sessão principal da empresa** (Claude/ChatGPT onde aluno já discutiu briefing, marca, ICP). A IA contextualizada gera o prompt da ferramenta-alvo OU exporta contexto pra outra sessão.

Exemplos:
- Meta-prompt pra gerar 5 prompts de imagens (Aula 9)
- Meta-prompt pra gerar prompt do Gemini Omni (Aula 10)
- Meta-prompt pra gerar letra + prompt Suno (Aula 11)
- META combinado contexto + entrevista do app (Aula 12)

**Razão da divisão:** aluno empresário tem UMA sessão principal onde conversa sobre a empresa. Prompts meta aproveitam esse contexto pra gerar prompts mais ricos pras ferramentas-alvo, sem aluno precisar repetir info da empresa.

---

## 2. Estrutura do HTML `/materiais/index.html`

Slides na mesma paleta Midnight da apresentação principal, mas com layout diferente:

1. **Slide 1 — Capa** — nome do material, contagem de prompts, instrutor
2. **Slide 2 — Índice** — lista todos os prompts com:
   - Número, título, tag (Direto/Meta), referência da aula
   - Linha destacada (border-left dourada) pros prompts do fluxo da última aula prática (ex: PRD do Curso 01)
3. **Slides 3+ — 1 slide por prompt** — kicker (aula + tag), título, descrição em 1 parágrafo, code block com botão Copiar dourado

---

## 3. Botão Copiar — implementação

```html
<button class="copy-btn" data-prompt="pX">
  <svg viewBox="0 0 24 24"><!-- ícone clipboard --></svg>
  <span class="btn-text">Copiar</span>
</button>
```

```javascript
btn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const pre = document.getElementById('prompt-' + btn.dataset.prompt);
  await navigator.clipboard.writeText(pre.textContent);
  btn.classList.add('copied');
  btn.querySelector('.btn-text').textContent = 'Copiado!';
  setTimeout(() => { ... reset ... }, 1800);
});
```

Feedback visual: botão dourado vira verde por 1.8s com texto "Copiado!".

---

## 4. Badge 📋 na apresentação principal — clicável

Na `apresentacao.html` principal, bullets com prompt levam badge clicável:

```html
<li class="reveal prompt">
  <span class="prompt-tag" data-prompt="p1" title="Clique pra copiar">📋 Prompt</span>
  Texto do bullet
</li>
```

Mesmo handler do botão Copiar — clica → copia → vira verde "✓ Copiado!".

Objeto `PROMPTS = { p1: "...", p2: "...", ... }` embutido no `<script>` da apresentacao.html.

---

## 5. Fluxo da Aula de PRD (canônico do Curso 01)

Aula do PRD do app SEMPRE tem 3 prompts em sequência:

1. **META combinado** (Meta tag dourada) — gera bloco com contexto da empresa + instrução de entrevista. Cola na sessão principal, recebe bloco compacto.
2. **Faseamento** (Direto tag verde) — MVP / Expansão / Futuro
3. **PRD + prompt fundacional Lovable** (Direto tag verde) — saída em 2 documentos

Esses 3 prompts ganham `border-left` dourada no índice pra sinalizar que são fluxo sequencial.

---

## 6. Anti-padrões (NÃO fazer)

- ❌ Prompt sem tag (todo prompt é Direto ou Meta)
- ❌ Botão Copiar que não dá feedback visual (sempre vira verde com "Copiado!")
- ❌ Prompt direto colado em sessão principal (gera ruído na conversa) — sempre indica em qual sessão usar
- ❌ Meta-prompt sem instrução de "me devolve em caixa de código" (LLM precisa formatar pro aluno copiar)
- ❌ Prompts genéricos copy-paste de outros cursos — cada curso tem seus próprios
