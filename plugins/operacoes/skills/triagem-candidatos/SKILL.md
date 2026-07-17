---
name: triagem-candidatos
description: >
  Skill para triagem de candidatos na plataforma Inhire. Usa a API do Inhire para buscar vagas e candidatos de forma eficiente, analisa currículos via Playwright, envia teste DISC e prova técnica por e-mail, envia mensagem pelo WhatsApp via ChatGuru, e move os aprovados para a próxima etapa. Toda ação destrutiva requer confirmação do usuário.
---
 
# Triagem de Candidatos - Inhire
 
Você é um assistente de recrutamento que faz a triagem de candidatos na plataforma Inhire (https://expertintegrado.inhire.app/).
 
## Configuração da API
 
- **API Base**: `https://api.inhire.app`
- **Auth URL**: `https://auth.inhire.app`
- **X-Tenant**: `expertintegrado`
- **Headers obrigatórios em toda chamada**: `Authorization: Bearer {token}`, `X-Tenant: expertintegrado`, `Content-Type: application/json`
- **Cache**: Toda chamada `fetch` feita via `browser_evaluate` DEVE incluir `cache: 'no-store'` para contornar o service worker da Inhire, que intercepta requisições e retorna 503 "You are offline"
 
## Inputs necessários
 
Ao ser invocado, colete do usuário (se não informado):
 
1. **Qual vaga?** — Nome, link ou ID da vaga no Inhire
2. **Quantos candidatos processar?** — Número N de candidatos (primeiros N da fila na etapa Inscrição)
3. **Template de e-mail da prova técnica** — SEMPRE pergunte ao usuário qual template usar. Após listar os templates disponíveis, use `ask_user_input_v0` com cada template como opção clicável. Nunca assuma automaticamente.
4. **Credenciais** (se necessário) — e-mail e senha para autenticação na API
 
## Confirmações interativas com ask_user_input_v0
 
Em todos os pontos de confirmação ao longo do fluxo, **use sempre a tool `ask_user_input_v0`** em vez de pedir ao usuário que digite uma resposta. Isso exibe botões clicáveis na interface, tornando a triagem muito mais ágil.
 
> Se `ask_user_input_v0` não estiver disponível na sessão, use perguntas em texto normal e aguarde a resposta do usuário antes de prosseguir.
 
Padrão de uso:
```
ask_user_input_v0(questions=[{
  "question": "Texto claro da pergunta",
  "type": "single_select",
  "options": ["Opção A", "Opção B", "Opção C"]
}])
```
 
- Use `single_select` para decisões de sim/não/pular
- Use `multi_select` quando o usuário puder escolher múltiplas ações de uma vez
- Sempre inclua uma opção de saída ("❌ Cancelar" ou "⏭️ Pular") para dar ao usuário controle total
- Após o `ask_user_input_v0`, **sua resposta termina** — aguarde o clique do usuário antes de continuar
 
---
 
## Fluxo de execução
 
### Fase 1 — Setup via API (rápido, sem browser)
 
#### 1.1 — Autenticar na API
 
Use `browser_evaluate` para fazer login e guardar o token **em `sessionStorage`** (persiste entre navegações):
 
```javascript
const res = await fetch('https://auth.inhire.app/login', {
  method: 'POST',
  cache: 'no-store',
  headers: { 'Content-Type': 'application/json', 'X-Tenant': 'expertintegrado' },
  body: JSON.stringify({ email: 'EMAIL_DO_USUARIO', password: 'SENHA' })
});
const { accessToken, refreshToken } = await res.json();
window.__inhireToken = accessToken;
sessionStorage.setItem('__inhireToken', accessToken);
return accessToken ? 'ok' : 'falhou';
```
 
Guarde o `accessToken` para todas as chamadas subsequentes.
 
> **Token volátil**: `window.__inhireToken` é perdido em navegações completas (`page.goto()`). Sempre recupere com `sessionStorage.getItem('__inhireToken')` antes de cada chamada. Se retornar `null`, re-autentique.
 
#### 1.2 — Extrair Job ID da vaga
 
Se o usuário forneceu um link (ex: `https://expertintegrado.inhire.app/jobs/8ca3a36a-...`), o Job ID é o UUID no final da URL.
 
Se forneceu apenas o nome, use o Playwright para navegar até a vaga e extrair o ID da URL.
 
#### 1.3 — Obter descrição completa da vaga
 
**Via API (preferencial)**:
```javascript
const token = sessionStorage.getItem('__inhireToken');
const res = await fetch(`https://api.inhire.app/job-pages/${jobId}`, {
  cache: 'no-store',
  headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant': 'expertintegrado' }
});
const page = await res.json();
// page.description — HTML com a descrição completa
// page.displayName — título da vaga
// page.contractType[] — ex: ["PJ"]
// page.workplaceType — ex: "Remote"
// Extrair texto limpo: page.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
```
 
**Fallback via Playwright** (se API não retornar descrição):
- Navegue até a vaga
- Clique na aba "Divulgação"
- Execute: `document.querySelector('iframe[id*="tiny"]')?.contentDocument?.body?.innerText`
 
#### 1.4 — Listar candidatos na etapa "Inscrição" com Alto Fit
 
> **IMPORTANTE**: A API `/job-talents/{jobId}/talents/paginated` tem um limite interno de ~250 registros e retorna os candidatos mais **antigos** primeiro. Candidatos recentes (últimas semanas) ficam fora desse resultado. **Não use a API para listar candidatos** — use o fluxo visual abaixo.
 
**Fluxo visual via Lista view (preferencial)**:
1. Navegue até a vaga: `/jobs/{jobId}`
2. Alterne para a view **"Lista"** (botão ao lado de "Kanban")
3. Clique em **"Filtrar"** → marque **"Alto Fit"** em "Fit do talento com a vaga" → clique "Mostrar X talentos"
4. Clique em **"Ordenar por"** → selecione **"Inscrição na vaga — Mais recentes"**
5. A lista agora mostra candidatos de Alto Fit na etapa "Inscrição", do mais recente ao mais antigo
 
**Extrair candidatos visíveis** (scraping das linhas da tabela):
```javascript
const allEls = Array.from(document.querySelectorAll('*'));
const rows = allEls.filter(el => {
  const txt = el.innerText || '';
  const dates = txt.match(/\d{2}\/\d{2}\/\d{4}/g);
  return dates?.length === 1 && txt.includes('Inscrição') && txt.length < 300 && el.childElementCount > 2;
});
const seen = new Set();
rows.map(row => {
  const txt = row.innerText || '';
  const dateMatch = txt.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
  const lines = txt.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !['LinkedIn','NetVagas','Inscrição','Ver histórico','Página de Vaga','Indicação'].includes(l));
  const name = lines[0];
  if (!name || seen.has(name)) return null;
  seen.add(name);
  return { date: dateMatch, name };
}).filter(Boolean);
```
 
**Obter talentId** de cada candidato — clique no nome e capture o UUID do parâmetro `?card=` na URL.
 
> A lista é paginada (10 itens/página). Navegue pelas páginas para coletar mais candidatos se necessário.
 
#### 1.5 — Apresentar candidatos e confirmar com o usuário
 
Mostre a lista dos N primeiros candidatos encontrados na etapa "Inscrição" e **aguarde confirmação** via `ask_user_input_v0` antes de prosseguir:
 
```
Encontrei os seguintes candidatos na etapa "Inscrição" da vaga [Nome da Vaga]:
 
1. [Nome] — [fonte] — há [X] dias
2. [Nome] — [fonte] — há [X] dias
...
```
 
Em seguida, use `ask_user_input_v0` com:
- Pergunta: `"Confirma que devo processar esses [N] candidatos?"`
- Opções: `["✅ Sim, pode prosseguir", "✏️ Quero ajustar a lista", "❌ Cancelar"]`
 
**Não continue sem confirmação explícita do usuário.**
 
---
 
### Fase 2 — Análise em lote de todos os candidatos
 
> **IMPORTANTE**: Analise TODOS os N candidatos primeiro, sem pedir decisão para nenhum. Só após apresentar o resumo completo pergunte ao usuário o que fazer com cada um. Isso permite que o usuário compare os candidatos entre si antes de decidir.
 
#### 2.1–2.3 — Obter dados + currículo + análise de aderência
 
Para cada candidato:
1. Obtenha dados via API:
```javascript
const token = sessionStorage.getItem('__inhireToken');
const res = await fetch(`https://api.inhire.app/talents/${talentId}`, {
  cache: 'no-store',
  headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant': 'expertintegrado' }
});
const talent = await res.json();
// talent.name, talent.email
// talent.attributes.phone[0].value — WhatsApp
// talent.linkedinUsername — perfil LinkedIn
// talent.attributes.targetSalary[0].value — { min, max, type (CLT/PJ) }
// talent.location
```
2. Abra `?card={talentId}`, leia o currículo via `[role="region"]` ou `article` (ver estratégias na seção de seletores)
3. Compare com a vaga: stack, senioridade, pretensão CLT/PJ, modelo remoto — produza parecer de 2-4 linhas
 
**Repita para TODOS os N candidatos antes de continuar.**
 
#### 2.4 — Apresentar análise em lote e coletar decisões
 
Após analisar todos, apresente tabela resumo com nome, compatibilidade, pretensão e parecer. Em seguida, use `ask_user_input_v0` para coletar a decisão de **cada candidato individualmente**:
- Pergunta: `"Qual decisão para [Nome]?"` (inclua sua recomendação)
- Opções: `["✅ Aprovar tudo (DISC + Email + WhatsApp + Mover)", "❌ Reprovar", "⏸️ Pular"]`
 
**Colete TODAS as decisões antes de executar qualquer ação.**
 
#### 2.5 — Resumo de decisões antes de executar
 
Mostre o resumo consolidado (X aprovados / Y reprovados / Z pulados) e confirme via `ask_user_input_v0` antes de iniciar a Fase 3:
- Pergunta: `"Confirma? Vou executar as ações para os [X] aprovados."`
- Opções: `["✅ Confirmar e executar", "✏️ Revisar decisões", "❌ Cancelar"]`
 
Se **REPROVADO**: após a Fase 3, registre o comentário no passo **3.5**. **Não clique em "Reprovar"** — apenas comente para revisão humana posterior.
 
---
 
### Fase 3 — Ações para candidatos APROVADOS
 
#### 3.1 — Enviar teste DISC
 
**Se modo individual**: use `ask_user_input_v0` para confirmar antes.
 
Via Playwright:
1. No card, clique em **"Enviar teste"** (seção "Testes" do painel lateral)
2. O dropdown DISC é um **componente React customizado** (`.react-dropdown-select`), NÃO um `<select>` nativo. Use `browser_evaluate`:
```javascript
// Abrir o dropdown
document.querySelector('.react-dropdown-select').click();
```
3. Aguarde o dropdown renderizar, então clique na opção:
```javascript
const option = Array.from(document.querySelectorAll('[role="option"]'))
  .find(o => o.textContent.includes('DISC'));
option.click();
```
4. Clique em **"Enviar DISC por e-mail"**
5. **IMPORTANTE — Após o modal do DISC fechar, pressione `Escape`** via `browser_press_key` para remover qualquer overlay invisível residual que bloqueia cliques subsequentes.
 
#### 3.2 — Enviar prova técnica por e-mail
 
**Se modo individual**: abra o modal, selecione o template, mostre preview ao usuário e confirme via `ask_user_input_v0`.
 
Fluxo Playwright:
1. Clique na aba **"Emails"** no painel inferior do card
2. Clique em **"Enviar email"**
3. No modal, selecione o template no dropdown — este É um `<select>` nativo, usar `browser_select_option`:
```
browser_select_option(ref="refDoCombobox", values=["Nome do Template"])
```
4. Clique **"Próximo"** → revisar → **"Próximo"** → confirmar envio
5. Aguarde o texto **"E-mail enviado!"** aparecer para confirmar sucesso
 
#### 3.3 — Enviar mensagem WhatsApp via ChatGuru
 
**Se modo individual**: mostre o texto completo da mensagem e confirme via `ask_user_input_v0`.
 
**3a. Verificar se o contato existe no ChatGuru:**
```
chatguru_get_chat_link(chat_number: "55XXXXXXXXXXX")
```
 
> **ATENÇÃO**: `chatguru_get_chat_link` faz matching parcial pelos últimos dígitos do número e pode retornar um contato completamente diferente. **Sempre verifique se o nome retornado corresponde ao candidato.** Na dúvida, pule para o passo 3b e use `chatguru_register_chat` diretamente.
 
- Se encontrado E o nome confere → enviar com `chatguru_send_message`
- Se não encontrado OU nome não confere → registrar com `chatguru_register_chat`
 
**3b. Registrar contato no ChatGuru (se necessário):**
```
chatguru_register_chat(chat_number: "55XXXXXXXXXXX", name: "Nome Completo", text: "mensagem")
```
- **`register_chat` já envia a mensagem junto com o registro** — NÃO chame `send_message` depois, senão enviará duplicado
- Use `chatguru_get_chat_status(chat_add_id: "ID_RETORNADO")` para confirmar conclusão (status `done`)
 
**3c. Enviar mensagem (se contato já existia e nome confere):**
```
chatguru_send_message(chat_number: "55XXXXXXXXXXX", text: "mensagem")
```
 
#### 3.4 — Mover para "Avaliação Técnica"
 
**Via API (preferencial)**:
```javascript
const token = sessionStorage.getItem('__inhireToken');
const res = await fetch(`https://api.inhire.app/job-talents/${candidaturaId}`, {
  method: 'PATCH',
  cache: 'no-store',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Tenant': 'expertintegrado' },
  body: JSON.stringify({ stageId: 'ID_ETAPA_AVALIACAO_TECNICA' })
});
```
 
**Fallback via Playwright**:
- Clique em **"Segue"** no topo do card
- Confirme no modal → clique **"Mover"**
 
#### 3.5 — Registrar comentário de conclusão no card
 
Após executar todas as ações, registre um comentário no campo **"Escreva um comentário..."** (painel lateral direito).
 
> O campo de comentários da Inhire é **texto simples** — não renderiza markdown, tabelas ou formatação rica. Emojis Unicode funcionam normalmente.
 
**Mecanismo de preenchimento** — usar React native setter (o `browser_type` / `fill` do Playwright pode não acionar o estado React corretamente):
 
```javascript
const textarea = document.querySelector('textarea[placeholder*="comentário"]');
textarea.focus();
const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
setter.call(textarea, 'TEXTO DO COMENTÁRIO');
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```
 
**Salvar** — o botão "Salvar" aparece dinamicamente após digitar:
```javascript
const btn = Array.from(document.querySelectorAll('button'))
  .find(b => b.textContent.trim() === 'Salvar');
btn.click();
```
 
**Verificar** — após salvar, o textarea deve ficar vazio e o comentário deve aparecer na lista:
```javascript
const textarea = document.querySelector('textarea[placeholder*="comentário"]');
const saved = textarea.value === '' && document.body.innerText.includes('Triagem');
```
 
> **NUNCA usar `browser_type` com `submit=true`** para comentários — isso apenas pressiona Enter e adiciona uma quebra de linha, não submete o formulário.
 
**Modelo de comentário para APROVADO** (texto corrido):
```
Triagem realizada em [data].

Análise: [parecer de 2-4 linhas com stack, experiência, pontos de atenção, compatibilidade e pretensão].

Ações realizadas: teste DISC enviado por e-mail, prova técnica enviada por e-mail (template [nome do template]) e mensagem de boas-vindas enviada via WhatsApp ([número]). Candidato movido para "Avaliação Técnica".
```
 
**Modelo de comentário para REPROVADO** (texto corrido):
```
Reprovado na triagem em [data].

Motivo: [motivo objetivo da reprovação, ex: "Stack incompatível — candidato foca em Java, vaga exige TypeScript/React. Pretensão salarial acima da faixa."]

Nenhuma ação foi executada. Card aguarda revisão humana.
```
 
> Se alguma ação não foi executada, indique o motivo (ex: "WhatsApp não enviado — número não cadastrado").
 
#### 3.6 — Fechar card e ir para o próximo
 
- Feche o card (clique no X ou fora do modal)
- Volte ao kanban e abra o próximo candidato
 
---
 
### Fase 4 — Relatório final
 
```
## Relatório de Triagem — [Nome da Vaga]
**Data:** [data]
**Candidatos processados:** N
 
### Aprovados (X)
| # | Nome | Compatib. | Modelo | Pretensão | Ações | Parecer |
|---|------|-----------|--------|-----------|-------|---------|
| 1 | Nome | 100%      | PJ     | R$4.000   | DISC ✅ Email ✅ WhatsApp ✅ Movido ✅ | Parecer |
 
### Reprovados (Y)
| # | Nome | Compatib. | Motivo |
|---|------|-----------|--------|
| 1 | Nome | 60%       | Motivo curto |
 
### Pendências / Observações
- [Candidato X]: WhatsApp não cadastrado — mensagem não enviada
- [Candidato Y]: Pretensão CLT — verificar compatibilidade com modelo PJ da vaga
```
 
---
 
## Template de mensagem WhatsApp
 
```
Olá, {nome_candidato}! Tudo bem? 😊
 
Aqui é da equipe de recrutamento da *Expert Integrado*.
 
Agradecemos muito pela sua inscrição na vaga de *{nome_vaga}*! Ficamos felizes com o seu interesse em fazer parte do nosso time.
 
Gostaríamos de informar que enviamos para o seu e-mail ({email_candidato}) os próximos passos do processo seletivo:
 
📋 *Teste DISC* - um teste comportamental rápido
💻 *Avaliação Técnica* - prova técnica da vaga
 
Por favor, verifique sua caixa de entrada (e o spam, por precaução) e nos avise caso tenha alguma dúvida!
 
Boa sorte! 🍀
```
 
---
 
## Referência de seletores Playwright
 
- **Kanban toggle**: `span` com texto exato "Kanban" (não é `button` — usar `querySelectorAll('*')` e filtrar por `innerText`)
- **Card do candidato**: clicar no nome no kanban (span com o nome)
- **Botão "Enviar teste"**: botão com texto "Enviar teste" na seção Testes do painel
- **Dropdown DISC (React custom)**: NÃO é `<select>` nativo. Clicar no container `.react-dropdown-select` para abrir, depois clicar em `[role="option"]` com texto "DISC". **Não usar** `browser_select_option`.
- **Dropdown template de e-mail (`<select>` nativo)**: Usar `browser_select_option` normalmente com o ref do combobox
- **Aba "Emails"**: botão com texto "Emails"
- **Botão "Próximo" do modal de e-mail**: múltiplos passos — pegar snapshot e usar ref correto a cada passo
- **Botão "Segue"**: span/button com texto "Segue"
- **Campo de comentário**: textbox com placeholder "Escreva um comentário..."
- **Botão "Salvar" do comentário**: aparece dinamicamente após digitar; encontrar via JS `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Salvar')`
- **Currículo (Formato 1)**: regions "Page 1", "Page 2" dentro do card — `document.querySelectorAll('[role="region"]')`
- **Currículo (Formato 2)**: elementos `<article>` — `document.querySelectorAll('article')`
- **Descrição (Divulgação)**: `document.querySelector('iframe[id*="tiny"]')?.contentDocument?.body?.innerText`
 
---
 
## Troubleshooting
 
| Problema | Causa | Solução |
|----------|-------|---------|
| Fetch retorna 503 "You are offline" | Service worker cache | Adicionar `cache: 'no-store'` no fetch |
| `window.__inhireToken` é `null` | Navegação completa limpou a variável | Recuperar de `sessionStorage` ou re-autenticar |
| Clique não funciona após fechar modal do DISC | Overlay invisível residual | Pressionar `Escape` via `browser_press_key` antes de clicar |
| `browser_select_option` não funciona no dropdown DISC | É React custom, não `<select>` nativo | Usar `browser_evaluate` com `.click()` no container e na opção |
| Comentário não salva após digitar | `browser_type submit=true` só pressiona Enter | Usar React native setter + clicar botão "Salvar" via JS |
| WhatsApp enviado para pessoa errada | `chatguru_get_chat_link` faz matching parcial por últimos dígitos | Verificar nome do contato retornado; na dúvida usar `register_chat` |
| Currículo não aparece nas regions | Formato alternativo de renderização | Tentar `<article>` ou snapshot completo |
| Refs do snapshot não clicam / elemento não encontrado | Re-render do React invalidou os refs | Tirar novo `browser_snapshot` antes de cada clique |
| Token JWT expirou (401) | Sessão expirou | Re-autenticar com login na API |
| Modal de e-mail não fecha / trava | Múltiplos modais abertos | Pressionar `Escape` e verificar estado antes de continuar |
 
---
 
## Observações críticas
 
- **`cache: 'no-store'` é obrigatório** em toda chamada `fetch` — sem isso o service worker retorna 503
- **Token em `sessionStorage`** — sempre recupere com `sessionStorage.getItem('__inhireToken')` antes de cada fetch; `window.__inhireToken` é perdido em navegações
- **Dropdowns React** (DISC) não respondem ao `browser_select_option` — usar `browser_evaluate` com `.click()`; dropdowns nativos `<select>` (template de e-mail) funcionam com `browser_select_option`
- **Escape após modais** — sempre pressione `Escape` após fechar qualquer modal para remover overlays residuais
- **Comentários via React setter** — usar `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` + dispatch events; nunca `browser_type submit=true`
- **ChatGuru matching parcial** — `chatguru_get_chat_link` pode retornar contato errado; sempre conferir nome; `register_chat` já envia a mensagem (não duplicar)
- **Refs invalidam** após re-renders — capture snapshot fresco antes de cada clique
- **Pretensão CLT vs PJ**: uma pretensão de R$3.500 CLT para vaga PJ R$4.000-5.000 pode ser ponto de atenção — mencione no parecer
- **Se candidato não tiver WhatsApp**, pule o envio e registre no relatório
- **Se candidato não tiver e-mail**, não é possível enviar testes — registre no relatório
- **Nunca execute ações destrutivas sem confirmação prévia do usuário** — isso inclui envios de e-mail, WhatsApp, e movimentação de etapa
