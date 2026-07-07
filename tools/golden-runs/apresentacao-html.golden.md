# Golden run — lab:apresentacao-html

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal · plugin instalado: lab 3.10.0 (cache) / repo 3.10.3
- **Cenário:** "cria apresentação pra evento Teste Golden, tema Agentes de IA no Comercial", outline de 3 tópicos fornecido no pedido, paleta default (scale), path de output custom `C:/tmp/golden-apresentacao` (input opcional documentado — pra não poluir o Drive com pasta de teste). Deploy Vercel PULADO no gate (onda 4). Aprovações de echo simuladas pelo roteiro do cenário.
- **Resultado: APROVADO no escopo.** Comando de resolução do `$SKILL_DIR` funcionou (cache 3.10.0); bundle completo (5 templates + 3 paletas + anti-patterns.md); recall do Brain trouxe a base de padrões; Outlook sem match → recovery correto (pedir data ao Eric); deck de 7 slides montado do base + 3 templates Read + 2 inline adaptados do deck de referência REAL (acessível no Drive); 6 placeholders substituídos sem órfãos; `apresentacao.html` == `index.html`; QA visual EXECUTADO via Playwright headless (não só grep): position absolute computado, rect == viewport, letterbox ESCURO em 16:10 (1280x800 → slide 1280x720), body-bg muda por slide, reveals funcionam, assets 200, screenshots como prova. README com checklist literal dos 10 itens. save_note pulado legitimamente (nenhum padrão de design novo).

## Entregável real

`C:/tmp/golden-apresentacao/` — apresentacao.html (7 slides: capa, quem-sou, contrato-3cards, conceito "Agente", intro-center, integracoes-grid3, dúvidas), index.html, vercel.json, img/eric-foto.png, README.md + screenshots de QA (qa-capa-169/1610, qa-quem-169, qa-contrato-revealed, qa-final-169).

## Achados e fixes (lab 3.10.4)

1. **Path default de output NÃO existe no Drive (DEFEITO de fato, medido).** A skill mandava criar `Educacional/01_Palestras/Eventos/<nome-kebab>` — essa subpasta não existe; a convenção REAL do Drive é `Educacional/01_Aulas_e_Palestras/YYYY-MM-DD - <Evento> - <Tema>/` (15 eventos medidos, incluindo o deck de referência da própria skill). O `mkdir -p` do Passo 2 criaria uma terceira convenção silenciosamente. Fix: default corrigido pra convenção real (`<pasta-evento>` com data), em 5 pontos do SKILL.md.
2. **Foto do quem-sou sem fonte operacional (DEFEITO de binding).** O template diz só "extrair do PPTX do G4" e referencia `img/eric-foto.png`; não existe `eric.jpg` na pasta canônica de fotos. Fix: pré-requisito novo — copiar foto retrato de `$HOME/OneDrive/Imagens/Perfil profissional/` (listar e escolher; na dúvida perguntar).

## Observações (não-defeito)

- **Cache do plugin (3.10.0) atrás do repo (3.10.3)** — executor via marketplace roda skill de 3 versões atrás; `/plugin update` pendente nas instâncias (pendência já registrada da fase 2).
- **Google Fonts externo no base.html**: o deck "self-contained" depende de `fonts.googleapis.com` (Inter/JetBrains Mono); offline cai em fallback de fonte — o checklist pré-aula promete cópia offline. Melhoria futura: embutir os woff2 como data URI (mudança de template, não feita sem OK).
- O heredoc Bash com o script Python inline quebrou no parse (aspas do CSS) — recovery: escrever o script em arquivo com Write e rodar; padrão que já vale como prática nos runs (script >30 linhas = arquivo, não heredoc).
- syncBodyBg reporta cores em transição CSS (rgb intermediário) se medido <300ms após show() — irrelevante pro uso real, relevante pra QA automatizado.
