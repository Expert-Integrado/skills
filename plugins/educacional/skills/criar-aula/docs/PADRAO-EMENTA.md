# PADRAO-EMENTA — Regras canônicas da Ementa

Documento de referência embutido na skill `criar-aula`. Resume os 12 princípios da Maria Araújo (G4 Educação) + decisões aprendidas no Curso 01 G4 Construir Empresa (27/05/2026).

---

## 1. Os 12 princípios da Maria (G4)

### 1.1 Aulas de ~10 minutos
- Alvo: **10 minutos** por aula
- Tolerância: pode passar pra ~18min se houver flow que não corta naturalmente

### 1.2 Cada aula = 1 micro-conceito ou 1 micro-passo
- 1 aula NÃO cobre múltiplos passos
- Se um passo demora 20min, divide em 2 aulas
- Aula sem entregável claro não é aula — é introdução

### 1.3 Linguagem de não-desenvolvedor
- Curso é pra empresário, gestor, coordenador — não pra dev
- Termos técnicos só com explicação prévia

### 1.4 Não duplicar outros cursos do G4
- G4 já tem curso de N8N, produtividade básica, G4S/setup
- Nosso ângulo: agente executando tarefas POR você, não você aprendendo a usar ferramenta

### 1.5 Fio condutor único
- 1 empresa-exemplo atravessa o curso inteiro
- Aluno acompanha 1 caso do início ao fim

### 1.6 Mapeamento de erros por etapa
- Cada aula com integração/demo deve listar: *"olha, geralmente acontece tal erro, faz tal coisa"*

### 1.7 Setup pré-pronto pras partes lentas
- Coisas que demoram >5min já estão prontas antes da aula
- Mostrar o setup feito + explicar como replicar offline

### 1.8 Pareto 80/20: ao vivo + suprassumo pré-pronto
- Mostrar 1 versão zero-ao-vivo do exercício (passo a passo simples)
- Mostrar 1 versão "suprassumo" pré-pronta (com todo o polimento)

### 1.9 Capítulos > aulas avulsas
- Aulas se agrupam em **macrotemas/capítulos** com lógica narrativa
- Capítulo = 3-5 aulas com tema único

### 1.10 Escada — começar simples, aprofundar
- Aula 1 acessível pra qualquer um
- Cada aula seguinte assume só o que já foi ensinado
- Complexidade cresce em degraus, não saltos

### 1.11 Aplicabilidade ampla
- Todo aluno consegue replicar — sem ferramenta exótica
- Se uma ferramenta é proprietária (ex: Construtor PRD próprio), ou abre vs mostra alternativa pública

### 1.12 Evitar integrações instáveis
- WhatsApp não-oficial: só explicação curta, sem ensinar como exercício

### 1.13 (decisão Eric 27/05) Zero-slide
- Curso não é palestra com deck. A tela do computador É o "slide".
- Conteúdo de referência vai aberto em documentos markdown/Notion
- Demonstrações = ferramenta sendo usada AO VIVO no navegador

---

## 2. Estrutura obrigatória da Ementa final (entrega ao cliente)

Arquivo `04_Entregaveis/Ementa.docx`:

1. **Capa** — nome do curso, instrutor, duração total, público-alvo
2. **Sumário executivo** — em 1 parágrafo, qual a transformação que o curso entrega
3. **Pra quem é** — público-alvo concreto
4. **Pré-requisitos** — o que aluno precisa ter (contas, ferramentas, conhecimento básico)
5. **Ferramentas usadas** — tabela com nome exato + função + custo aproximado
6. **O que você sai construindo** — lista de entregáveis do curso completo
7. **Estrutura** — capítulos/módulos com:
   - Nome + objetivo do módulo
   - Lista de aulas com **título**, **descrição em itálico** (1 frase), **bullets** (3-7 por aula)
8. **Empresa-exemplo (fio condutor)** — quem é, setor, posicionamento
9. **Disclaimers gerais** — limitações do curso, ferramentas que mudam rápido

---

## 3. Formato do bullet de aula

```markdown
**Aula NN — Título da aula**

*Descrição da transformação que essa aula entrega (1 frase em itálico).*

- Bullet 1 — o que o aluno aprende/faz
- Bullet 2 — outro micro-conceito ou passo
- Bullet 3 — etc (3 a 7 bullets por aula)
```

Quando aula tem prompt copiável, marca com **📋 emoji** no bullet correspondente:

```markdown
- 📋 Técnica "IA, me entreviste" — peça pra IA fazer as perguntas que faltam
```

Esse emoji vira badge clicável no HTML — clica e copia o prompt.

---

## 4. Anti-padrões (NÃO fazer)

- ❌ Aula sem entregável tangível
- ❌ Aula que cobre 2-3 ferramentas diferentes
- ❌ Frase "ferramenta de IA" sem nome exato
- ❌ Demo que depende de integração instável (WhatsApp não-oficial, etc)
- ❌ Conteúdo idêntico a outro curso do G4
- ❌ Linguagem de desenvolvedor sem explicar (API, endpoint, JSON, etc)
- ❌ Aula >20min sem split
- ❌ Empresa-exemplo diferente em cada aula
- ❌ Hype ("isso revoluciona tudo", "vai mudar sua vida")
- ❌ Pitch comercial >5min
- ❌ Plano de 30 dias ou "5 erros comuns" no fechamento (Curso 01 removeu — encerra com manifesto motivacional, não checklist)

---

## 5. Padrão de Aula 1 e Aula final (canônico desde Curso 01)

### Aula 1 (Promessa e demonstração)
- Sempre inclui bullet: **"Construção AO VIVO (não pré-feita como é padrão no G4): vai dar erro às vezes — e resolver na hora é parte da experiência real"**
- Mostra os ativos suprassumos pré-prontos pra criar expectativa

### Aula final (Daqui pra onde — sua próxima virada)
- Aula curta, ~5-6min
- Bullets:
  - O que construiu em X horas vs o que valia antes
  - Disclaimer de fluência ("Você não vai ter minha fluência de primeira — vivo isso 12-14h/dia; é questão de prática")
  - Dica "IA pra ensinar IA" ("Quando travar, conversa com ela sobre o problema")
  - Equipe enxuta + super poderosa (capacitar, multiplicar, não substituir)
  - Citação Norbert Wiener (1950): "um homem que sabe usar a máquina sempre será mais inteligente que ela"
  - Frase canônica Eric: "se você não usar IA todos os dias, em um ano seu concorrente vai estar 5 anos na sua frente"
  - **"Bora."** em destaque dourado

---

## 6. Decisões herdadas do Curso 01 (default da skill)

| Decisão | Origem |
|---|---|
| 3 princípios + técnica "IA me entreviste" na aula de prompt (não framework rígido) | s4ptkkxgpw01 |
| Mini-prompt como modelo entrevista (não checklist numerado fixo) | qxdqemyw6fda |
| Princípio anti-FOMO de ferramentas ("não persiga a mais nova, domina as que tem") | lhq7lab62b46 |
| Segurança em IA aparece em 2 camadas: aviso curto cedo + detalhamento no penúltimo | l4tcmtyto318 |
| PRD do app em 3 passos com META combinado (contexto+entrevista no mesmo bloco) | yj96l9cknasv |
| Faseamento MVP/Expansão/Futuro (não "features mínimas" genérico) | 04nbbuoboiy0 |
| Aula penúltima operacional + aula final motivacional pura | alrq7bpiu2ht |
| Gemini Omni substitui Veo 3 em vídeos animados (lançado 19/05/2026) | 2ty988c8k960 |
