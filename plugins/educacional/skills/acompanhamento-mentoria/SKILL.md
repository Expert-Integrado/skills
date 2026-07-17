---
name: acompanhamento-mentoria
description: "Gera o resumo de calls de acompanhamento (não onboarding) dos alunos/mentorados da Expert Integrado a partir de uma transcrição ou resumo de plataforma. Use esta skill SEMPRE que o usuário mencionar: resumo de call de acompanhamento, acompanhamento mensal de aluno/mentorado, resumir reunião com aluno da mentoria, transcrição de reunião de acompanhamento, próximos passos da call com o aluno, 'gera o resumo dessa call', 'resume essa reunião com o aluno', ou colar/anexar uma transcrição (.vtt, .txt) ou um resumo de plataforma de uma reunião de acompanhamento. Também ative quando o usuário pedir pra complementar/ajustar um resumo automático de reunião gerado por Zoom/Fathom/etc. NÃO use para calls de ONBOARDING inicial — para essas, use a skill `diagnostico-mentoria`."
---

# Resumo de Acompanhamento — Mentoria Expert Integrado

## Contexto

As calls de acompanhamento são encontros **mensais e individuais** que o CS/mentor faz com cada aluno da mentoria para entender o avanço, destravar o que for preciso e combinar próximos passos. Esta skill transforma a **transcrição** (ou um **resumo de plataforma**) dessa call em um resumo curto, escaneável e acionável.

- **Saída padrão:** Panorama + Tópicos discutidos + Próximos passos. Nada mais.
- **Tom:** direto, português brasileiro, sem enrolação.
- **Não é** a call de onboarding (essa tem formulário diagnóstico e gera pacote completo → skill `diagnostico-mentoria`).

---

## Fluxo da Skill

### Passo 1 — Identificar o modo de entrada

- **Modo A — Transcrição:** o usuário anexou/colou uma transcrição (`.vtt`, `.txt`, dump de áudio). É a fonte primária. Vá pro Passo 2.
- **Modo B — Complementar resumo de plataforma:** o usuário trouxe um resumo já gerado (Zoom/Fathom/etc.), com ou sem a transcrição, e quer revisar/complementar. Trate o resumo da plataforma como rascunho: confira contra a transcrição (se houver), adicione o que faltou e corrija o que estiver errado. Veja a seção "Modo complementar".
- **Modo C — Os dois:** transcrição + resumo da plataforma juntos. Use a transcrição como verdade e o resumo só como apoio.

Se só vier a transcrição, gere o resumo padrão (Passo 3) direto.

### Passo 2 — Ler e extrair

**Lendo `.vtt` grande:** não leia o arquivo bruto inteiro. Extraia só as falas:
```bash
grep -E "^[A-Za-zÀ-ÿ].*:" ARQUIVO.vtt | sed 's/\r//'
```

Ao ler, identifique e separe:

1. **Quem é quem.** O CS/mentor da Expert (normalmente o Asafe) conduz; os demais participantes são o(s) aluno(s)/equipe. Use os nomes reais. Se houver empresa mencionada, registre.
2. **Estado geral do aluno** — está fluindo? travado? em qual frente?
3. **Tópicos substantivos** — o que de fato foi discutido. Capte especialmente:
   - **Limitações e restrições técnicas** que condicionam o caminho (ex.: "sistema sem API", dependência de exportação manual). Isso importa pro roadmap — não corte.
   - **O que já existe rodando** (protótipos, automações, scripts) e o estado de validação.
   - **Decisões e direcionamentos** dados na call.
   - **Pendências de transição/handoff** (material a recuperar, acessos, NF, etc.).
4. **Próximos passos** — cada combinado, com **responsável** (CS/você, aluno, time) e **prazo/data** quando houver.

> Não invente. Se um ponto ficou ambíguo na transcrição, registre como está e sinalize a incerteza com "(a confirmar)".

### Passo 3 — Gerar o resumo

Gere **exatamente** neste formato (markdown, pra colar em card/ClickUp/WhatsApp):

```
## Acompanhamento — [Aluno(s)] · [Empresa, se houver]

**Panorama**
[2 a 4 frases: o que foi essa call, qual o foco do trabalho do aluno, e o estado geral — o que flui e o que precisa destravar. Sem rodeios.]

**Tópicos discutidos**
- **[Rótulo do tópico]:** [resumo em 1–2 linhas, com números/datas se houver]
- **[Rótulo do tópico]:** [...]
(quantos tópicos a call tiver — normalmente 4 a 7)

**Próximos passos**
1. **[Responsável]** — [ação concreta] [+ prazo/data se houver]
2. **[Responsável]** — [...]
```

Regras do formato:
- **Tópicos = bullets com rótulo em negrito.** O rótulo é a "etiqueta" do assunto (ex.: "Dor central (PCP)", "Limitação técnica", "Protótipo em planilha", "Direcionamento"). Facilita a varredura.
- **Próximos passos = lista numerada, sempre com responsável em negrito.** Separe claramente quem faz o quê (você/CS vs. aluno vs. time).
- Preserve **números, prazos e datas** exatamente como surgiram (ex.: "~500 ordens/mês", "terça, dia 7, 14h").
- Sem introdução nem conclusão fora do bloco. Começa no `## Acompanhamento` e termina no último passo.

### Passo 4 — Após gerar

Apresente o resumo e ofereça os próximos movimentos de CS, sem forçar:

> *"Pronto. Quer que eu registre isso no card de acompanhamento do aluno (ClickUp) ou que eu rascunhe a mensagem de follow-up pra ele no WhatsApp?"*

Só execute essas ações se o usuário pedir. Ajuste apenas o que ele apontar — não reescreva tudo por padrão.

---

## Modo complementar (resumo de plataforma)

Quando o usuário trouxer um resumo já pronto da plataforma e pedir pra complementar/ajustar:

1. **Valide o panorama** do resumo contra a transcrição. Em geral o panorama e a lista de etapas vêm corretos.
2. **Adicione o que a plataforma suaviza ou omite** — quase sempre é a parte técnica que mais importa pro roadmap:
   - restrições estruturais (ex.: ERP sem API);
   - automações/scripts já em produção;
   - métricas/insights operacionais concretos (ex.: peso do setup, capacidade real vs. nominal).
3. **Corrija nomes e typos.** Transcrições erram nomes próprios (ex.: "Wanderson"/"Wandston" → **Vanderson**) e às vezes deixam palavras em inglês ("remain operacionais" → "permaneçam operacionais"). Acerte.
4. Pergunte se o usuário quer **um resumo único consolidado** (panorama da plataforma + complementos + correções) no formato padrão do Passo 3, pronto pra colar.

---

## Regras de qualidade

- **Curto e escaneável.** Cada bullet de tópico: 1–2 linhas. Panorama: no máximo 4 frases.
- **Acionável.** Todo próximo passo tem dono e, quando existir, prazo. Passo sem dono é passo perdido.
- **Fiel à fonte.** Não inflar, não inventar combinados que não foram ditos. Na dúvida, "(a confirmar)".
- **Foco no que move.** Priorize dor central, decisões, restrições e combinados. Corte small talk, problemas de áudio/conexão e logística irrelevante.
- **Nomes corretos.** Sempre confira nomes próprios; transcrição automática erra muito.
- **Português brasileiro, direto.** Sem jargão desnecessário, sem textão.

---

## Diferença para `diagnostico-mentoria`

| | acompanhamento-mentoria | diagnostico-mentoria |
|---|---|---|
| Quando | Call mensal recorrente de acompanhamento | Call de onboarding inicial |
| Entrada | Transcrição / resumo de plataforma | Transcript + formulário diagnóstico + chat |
| Saída | Resumo (panorama + tópicos + próximos passos) | Pacote completo: diagnóstico interno + cliente + plano de ação + mensagem |

Se o usuário descrever uma call de **onboarding** (primeiro contato, formulário diagnóstico, plano de ação inicial), redirecione para `diagnostico-mentoria`.
