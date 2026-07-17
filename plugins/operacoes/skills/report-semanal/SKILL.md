---
name: report-semanal
description: "Gera o Report Semanal dos Coordenadores para o CEO Eric da Expert Integrado. Use esta skill SEMPRE que o usuário mencionar: report semanal, relatório semanal, report do Eric, relatório da semana, preencher report, report do coordenador, L10, reunião de segunda, ou qualquer variação de 'me ajuda a escrever o que aconteceu essa semana'. A skill aceita qualquer formato de entrada — dump de texto livre, transcrição de áudio, ou responde pergunta a pergunta — e gera o relatório formatado pronto para copiar e colar."
---

# Report Semanal dos Coordenadores — Expert Integrado

## Contexto

O report é enviado **toda semana até domingo à noite**. Eric (CEO) lê na segunda-feira antes do L10.

- **Formato:** curto, 5–7 bullets por seção
- **Tom:** direto, sem enrolação, sem textão
- **Acesso:** time estratégico pode ler

---

## Fluxo da Skill

### Passo 1 — Identificar o modo de entrada

Ao receber a solicitação, identifique como o usuário quer fornecer as informações:

- **Modo A — Dump livre:** o usuário escreveu tudo de uma vez (texto corrido ou transcrição de áudio). Extraia as informações e pule para o Passo 3.
- **Modo B — Interativo:** o usuário não trouxe informações ainda, ou disse "me faz as perguntas". Siga o Passo 2.
- **Modo C — Parcial:** o usuário trouxe algumas informações mas não todas. Extraia o que tiver e pergunte apenas o que falta (Passo 2, só para as seções vazias).

Se não estiver claro qual o modo, pergunte: *"Você quer me contar tudo de uma vez ou prefere que eu te faça as perguntas uma a uma?"*

---

### Passo 2 — Coleta interativa (quando necessário)

Faça as perguntas **uma de cada vez**, em ordem. Espere a resposta antes de continuar.

Use linguagem natural e informal — o coordenador é colega de time.

**Perguntas guia (adapte conforme o contexto):**

1. *"Qual foi o período da semana? (ex: 07/04 a 13/04)"*
2. Tente inferir nome e área a partir do contexto da conversa. Se não conseguir: *"Qual é o seu nome e área?"*
3. *"O que o time entregou essa semana que move as prioridades do trimestre? Se tiver números, melhor ainda."*
4. *"Teve alguma coisa que não foi entregue? Por quê?"*
5. *"Como foi a performance individual do time? Alguém se destacou? Alguém abaixo do esperado? O que você fez a respeito?"*
6. *"Como o time usou IA essa semana? Tem algum exemplo concreto?"*
7. *"Alguém resolveu algo de forma proativa, mesmo que imperfeita? Quem foi?"*
8. *"Quais são as 3 prioridades para a próxima semana?"*
9. *"Precisa de ajuda do seu gestor pra resolver alguma coisa? Se sim, é pro Eric ou pro Asafe?"*

> Se o usuário pular uma pergunta ou disser "não tem nada", registre como vazio e pergunte antes de gerar: *"A seção X ficou vazia — confirma que não tem nada pra colocar?"*

---

### Passo 3 — Geração do Report

Com todas as informações coletadas, gere o relatório **exatamente neste formato**:

```
---
📋 REPORT SEMANAL
Semana de: [dd/mm] a [dd/mm]
Coordenador: [nome]
Área: [área]
---

1. RESULTADOS
• [bullet]
• [bullet]

2. NÃO ENTREGUE + CAUSA RAIZ
• [bullet ou "Nada a registrar esta semana."]

3. PERFORMANCE INDIVIDUAL
• [bullet sobre destaque]
• [bullet sobre quem está abaixo + ação tomada]

4. USO DE IA
• [exemplo concreto]
• [exemplo concreto]

5. QUEM TIROU DO PAPEL
• [nome + o que fez]

6. PLANO PRÓXIMA SEMANA
1. [prioridade]
2. [prioridade]
3. [prioridade]

7. ESCALAÇÕES
• [ex: "Preciso de suporte do Eric para aprovar X." ou "Sem escalações esta semana."]
---
```

---

## Regras de qualidade

- **Cada bullet: máximo 1–2 linhas.** Texto longo = não será lido. Resuma sempre.
- **Números sempre que existirem.** Ex: "migração de 3 clientes" em vez de "migramos alguns clientes". Se o usuário mencionou um número, preserve.
- **Direto ao ponto.** Sem introduções, sem contexto redundante, sem textão. O Eric lê rápido na segunda de manhã.
- **Sem introduções ou conclusões.** O report começa no cabeçalho e termina na linha final `---`.
- **Seções vazias:** jamais deixe em branco silenciosamente. Confirme com o usuário antes de usar "Nada a registrar" ou "Sem escalações".
- **Escalações:** quando houver, especificar se é para Eric ou Asafe.
- **Linguagem:** clara, direta, português brasileiro. Sem jargões desnecessários.
- **Tom neutro-profissional:** nem muito formal, nem muito informal.

---

## Após gerar

Apresente o relatório e diga: *"Pronto! Confere se ficou bom. Se quiser ajustar alguma seção, é só falar — quando estiver ok, gero o link HTML pra você enviar pro Eric."*

Não ofereça reescrever tudo de novo por padrão — só ajuste o que o usuário pedir.

Quando o usuário confirmar que está tudo certo (ex: "pode gerar", "ficou ótimo", "ok", "gera o link"), execute o **Passo 4**.

---

### Passo 4 — Geração do HTML para compartilhamento

Gere um arquivo HTML standalone com o conteúdo do report, salve em `/mnt/user-data/outputs/report-semanal-[semana].html` (use o período da semana no nome, ex: `report-semanal-14-20abr.html`), e apresente com `present_files`.

**Template HTML a seguir:**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Report Semanal — [COORDENADOR] — [PERÍODO]</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0d0d0f;
    --surface: #141416;
    --border: rgba(255,255,255,0.07);
    --text: #e8e8ea;
    --muted: #6b6b72;
    --accent: #c8f135;
    --accent-dim: rgba(200,241,53,0.12);
    --red: #ff5c5c;
    --red-dim: rgba(255,92,92,0.10);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
    min-height: 100vh;
    padding: 48px 20px 80px;
  }
  .wrap { max-width: 700px; margin: 0 auto; }
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 48px; padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .logo-mark {
    width: 28px; height: 28px; background: var(--accent);
    border-radius: 6px; display: flex; align-items: center; justify-content: center;
  }
  .logo-mark span { font-size: 13px; font-weight: 700; color: #0d0d0f; letter-spacing: -0.5px; }
  .company-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .badge {
    font-size: 11px; font-weight: 500; color: var(--muted);
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    border-radius: 20px; padding: 4px 12px;
  }
  .hero { margin-bottom: 52px; }
  .hero-tag { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
  .hero h1 {
    font-family: 'DM Serif Display', serif; font-size: clamp(32px, 6vw, 48px);
    font-weight: 400; line-height: 1.15; color: var(--text); margin-bottom: 16px;
  }
  .hero-meta { display: flex; flex-wrap: wrap; gap: 20px; }
  .meta-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
  .meta-item svg { opacity: 0.5; flex-shrink: 0; }
  .divider { height: 1px; background: var(--border); margin: 0 0 44px; }
  .section {
    margin-bottom: 44px;
    animation: fadeUp 0.4s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .section:nth-child(1){animation-delay:0.05s} .section:nth-child(2){animation-delay:0.10s}
  .section:nth-child(3){animation-delay:0.15s} .section:nth-child(4){animation-delay:0.20s}
  .section:nth-child(5){animation-delay:0.25s} .section:nth-child(6){animation-delay:0.30s}
  .section:nth-child(7){animation-delay:0.35s}
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .section-num { font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 1px; width: 20px; }
  .section-title { font-size: 11px; font-weight: 600; letter-spacing: 1.8px; text-transform: uppercase; color: var(--muted); }
  .section-line { flex: 1; height: 1px; background: var(--border); }
  .items { display: flex; flex-direction: column; gap: 2px; }
  .item { display: grid; grid-template-columns: 16px 1fr; gap: 10px; padding: 9px 14px 9px 0; border-radius: 8px; transition: background 0.15s; }
  .item:hover { background: rgba(255,255,255,0.03); }
  .item-dot { margin-top: 9px; width: 4px; height: 4px; border-radius: 50%; background: var(--muted); justify-self: center; }
  .item-text { font-size: 14px; line-height: 1.65; color: #c8c8cc; font-weight: 300; }
  .item-text strong { font-weight: 600; color: var(--text); }
  .priorities { display: flex; flex-direction: column; gap: 6px; }
  .priority {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 16px; background: rgba(255,255,255,0.03);
    border: 1px solid var(--border); border-radius: 10px;
    transition: border-color 0.15s, background 0.15s;
  }
  .priority:hover { border-color: rgba(200,241,53,0.2); background: var(--accent-dim); }
  .priority-num { font-size: 12px; font-weight: 700; color: var(--accent); min-width: 18px; margin-top: 1px; }
  .priority-text { font-size: 14px; line-height: 1.55; color: #c8c8cc; font-weight: 300; }
  .escalation-card {
    padding: 14px 18px; background: var(--red-dim);
    border: 1px solid rgba(255,92,92,0.18); border-radius: 10px;
    display: flex; align-items: flex-start; gap: 12px;
  }
  .esc-icon { font-size: 16px; margin-top: 1px; }
  .esc-text { font-size: 14px; line-height: 1.6; color: #c8c8cc; font-weight: 300; }
  .esc-text strong { font-weight: 600; color: var(--text); }
  .none-tag { font-size: 13px; color: var(--muted); font-style: italic; padding: 4px 0; }
  .footer {
    margin-top: 60px; padding-top: 24px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  }
  .footer span { font-size: 12px; color: var(--muted); }
  .footer strong { color: rgba(255,255,255,0.3); font-weight: 500; }
  @media (max-width: 480px) {
    body { padding: 28px 16px 60px; }
    .topbar { margin-bottom: 32px; }
    .hero { margin-bottom: 36px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <div class="topbar-left">
      <div class="logo-mark"><span>EI</span></div>
      <span class="company-name">Expert Integrado</span>
    </div>
    <span class="badge">Report Semanal</span>
  </div>

  <div class="hero">
    <div class="hero-tag">[ÁREA] · [COORDENADOR]</div>
    <h1>Semana de<br>[PERÍODO]</h1>
    <div class="hero-meta">
      <div class="meta-item">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Entregue [DATA_ENTREGA]
      </div>
      <div class="meta-item">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Lido na segunda · L10
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">01</span>
      <span class="section-title">Resultados</span>
      <div class="section-line"></div>
    </div>
    <div class="items">
      [ITEMS_RESULTADOS]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">02</span>
      <span class="section-title">Não entregue + causa raiz</span>
      <div class="section-line"></div>
    </div>
    <div class="items">
      [ITEMS_NAO_ENTREGUE]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">03</span>
      <span class="section-title">Performance individual</span>
      <div class="section-line"></div>
    </div>
    <div class="items">
      [ITEMS_PERFORMANCE]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">04</span>
      <span class="section-title">Uso de IA</span>
      <div class="section-line"></div>
    </div>
    <div class="items">
      [ITEMS_IA]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">05</span>
      <span class="section-title">Quem tirou do papel</span>
      <div class="section-line"></div>
    </div>
    <div class="items">
      [ITEMS_TIROU_PAPEL]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">06</span>
      <span class="section-title">Plano próxima semana</span>
      <div class="section-line"></div>
    </div>
    <div class="priorities">
      [PRIORIDADES]
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-num">07</span>
      <span class="section-title">Escalações</span>
      <div class="section-line"></div>
    </div>
    [ESCALACOES]
  </div>

  <div class="footer">
    <span>Expert Integrado · <strong>[ÁREA]</strong></span>
    <span>Gerado automaticamente · [DATA_ENTREGA]</span>
  </div>
</div>
</body>
</html>
```

**Instruções de preenchimento do HTML:**

- `[COORDENADOR]`, `[ÁREA]`, `[PERÍODO]` → dados do report (ex: "Asafe Silva", "Operações", "14 a 20 de abril")
- `[DATA_ENTREGA]` → data de geração (ex: "20/04/2025")
- Para seções de bullets (`[ITEMS_*]`), cada bullet vira:
  ```html
  <div class="item"><div class="item-dot"></div><div class="item-text">texto aqui, com <strong>destaque</strong> se relevante</div></div>
  ```
- Para prioridades (`[PRIORIDADES]`), cada item vira:
  ```html
  <div class="priority"><span class="priority-num">1</span><span class="priority-text">texto da prioridade</span></div>
  ```
- Para escalações (`[ESCALACOES]`): se houver, use um card por escalação:
  ```html
  <div class="escalation-card"><span class="esc-icon">↑</span><span class="esc-text"><strong>Eric</strong> — descrição da escalação.</span></div>
  ```
  Se não houver escalações: `<p class="none-tag">Sem escalações esta semana.</p>`
- Se qualquer outra seção estiver vazia: `<div class="item"><div class="item-dot"></div><div class="item-text none-tag">Nada a registrar esta semana.</div></div>`
- Use `<strong>` dentro de `.item-text` para destacar nomes de pessoas, métricas ou termos-chave

Após salvar e apresentar o arquivo, diga: *"Aqui está o HTML do report — você pode baixar e compartilhar o link com o Eric. 🎉"*
