# ANTI-PATTERNS — Bugs aprendidos em produção

Documento embutido na skill `criar-aula`. Lista de erros caros descobertos no Curso 01 G4 e em palestras anteriores. **A skill REJEITA gerar HTML/conteúdo que viole estes padrões.**

---

## 1. Layout do HTML 16:9

### 1.1 NUNCA `position: relative` em `.slide.*`
**Brain:** `60lwck7i8gfx`

Slide herda `position: absolute; inset: 0` do `.slide` base. Override em regras específicas (`.slide.quem`, `.slide.darker`, etc) faz o slide encolher silenciosamente sem erro do browser. Sintoma: "barra branca" embaixo do slide.

Diagnosticar com `getBoundingClientRect`, não só computed style do body.

Decorações via `::before`/`::after` devem ir em containers FILHOS (ex: `.quem-card::before`), não no slide.

### 1.2 NUNCA `<strong style="color: var(--cyan-deep)">` em fundo dark
Em slide com `class="slide dark"` ou `class="slide darker"`, `--cyan-deep` (#0091D5 ou #C9A227 dependendo da paleta) tem contraste insuficiente. Use `--cyan` (claro: #2DD4FF ou #E8C547).

### 1.3 NUNCA footer com 2 textos diferentes
Footer sempre `{{FOOTER_TAG}} · @ericluciano`, nunca `Tema 1 · Tema 2 · @ericluciano`. Skill normaliza pra texto único.

### 1.4 NUNCA kicker da capa com data/hora/duração
Kicker capa é APENAS nome do evento/curso: "G4 Educação". NÃO: "G4 Scale · Aula Ao Vivo · 90 min". Data/hora ficam em outros slides quando relevante.

### 1.5 SEMPRE `viewport-bg` div como layer fundo
`<div class="viewport-bg" id="vbg">` no topo do body com `position: fixed; inset: 0; z-index: -1`. Função `syncBodyBg()` atualiza cor de fundo no body/html/vbg conforme slide ativo. Sem isso, em telas com aspect-ratio diferente de 16:9 aparece letterbox branco.

---

## 2. Conteúdo da Ementa

### 2.1 NUNCA aula sem entregável tangível
Cada aula precisa de "ao final desta aula você terá X". Aula descritiva sem entregável vira introdução genérica.

### 2.2 NUNCA "uma ferramenta de IA" sem nome
Se for Lovable, HeyGen, Suno, ChatGPT, Claude, Gemini Omni — nomear sempre. Skill detecta menções genéricas e força nome.

### 2.3 NUNCA empresa-exemplo trocando entre aulas
Fio condutor único. Se a Aula 1 fala de cafeteria, Aulas 2-N falam da mesma cafeteria.

### 2.4 NUNCA hype
Frases tipo "isso revoluciona tudo", "vai mudar sua vida", "tecnologia disruptiva" — proibidas. Princípio canônico do Eric: "Empoderamento > Hype".

### 2.5 NUNCA pitch comercial >5min
Limite canônico Eric. Pitch curto ou aluno tira o cara da playlist.

### 2.6 NUNCA plano de 30 dias / 5 erros / checklist genérico no fechamento
Aula final motivacional pura. Plano/checklist viram material de apoio em PDF separado, não vídeo.

---

## 3. Materiais (prompts copiáveis)

### 3.1 NUNCA prompt sem categorização Direto/Meta
Todo prompt tem tag verde (Direto) ou dourada (Meta). Sem tag, aluno fica perdido sobre em qual sessão usar.

### 3.2 NUNCA botão Copiar sem feedback visual
Sempre vira verde por 1.8s com texto "Copiado!". Sem feedback, aluno não sabe se copiou.

### 3.3 NUNCA meta-prompt sem instrução de formato de saída
Meta-prompt sempre termina com "me devolve em uma caixa de código" ou "me devolve em markdown estruturado". Sem isso, LLM responde em texto corrido e aluno tem que adivinhar onde começa e termina.

---

## 4. Deploy / Infra

### 4.1 NUNCA expor token Cloudflare/Vercel em conversa
Tokens vão do 1Password direto pra `$VAR_NAME` em comandos. Eric não cola token cru em mensagem.

### 4.2 NUNCA criar registro DNS sem proxy desligado
Cloudflare DNS A pra Vercel sempre `proxied: false` (DNS only). Proxy ligado quebra SSL emit do Vercel.

### 4.3 NUNCA pular o `vercel certs issue` após adicionar domain
Adicionar domain via `vercel domains add` NÃO emite cert automático no curto prazo. `vercel certs issue <dominio>` força emissão imediata.

### 4.4 NUNCA deploy sem `cleanUrls: true` no vercel.json
Se faltar, `/materiais` 404. Sempre incluir `{ "cleanUrls": true, "trailingSlash": false }`.

---

## 5. Estrutura de pasta

### 5.1 NUNCA deletar pasta "bagunçada" — sempre move pra `_arquivo/`
Skill reorganiza pasta movendo arquivos fora do padrão pra `_arquivo/`, nunca deleta. Eric recupera depois se precisar.

### 5.2 NUNCA criar V1/V2/V3 da Ementa
Sobrescreve a única Ementa.md. Versões anteriores vão pra `_versoes-historicas/` com timestamp.

### 5.3 NUNCA misturar arquivos de cursos diferentes na mesma pasta
Cada curso tem `<slug>/` própria sob `Educacional/01_Aulas_e_Palestras/`. Não compartilha pasta.

---

## 6. Brain (memória)

### 6.1 NUNCA salvar nota Brain sem `kind` correto
`kind` obrigatório (concept/decision/insight/fact/pattern/principle/question). Sem kind, save_note rejeita.

### 6.2 NUNCA criar edge sem `why` substantivo
Mín 20 chars explicando o MECANISMO compartilhado. "Related" é rejeitado.

### 6.3 NUNCA salvar nota gigante "tudo sobre o curso"
Notas atômicas — 1 ideia por nota. Decisão da Aula 3 = 1 nota. Decisão da Aula 12 = outra nota. Linkadas via edges.
