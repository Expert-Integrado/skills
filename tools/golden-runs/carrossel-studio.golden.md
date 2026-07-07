# Golden run — marketing:carrossel-studio

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** modo Express com o exemplo canônico da própria skill ("carrossel rápido sobre os 3 erros mais comuns ao começar com IA na empresa"); persona documentada respondeu público = "empreendedores e gestores de PMEs" e "fechado" na confirmação consolidada. Segundo ramo distintivo testado tecnicamente: foto do Eric via `gh api` (agent-assets) + embed dataURL pelo `montar.py`.
- **Correção de classe:** a FILA classificava A2 "API imagem (centavos)" — errado. A skill declara e cumpre "nenhuma chave de API, conta paga ou serviço externo": é A1 local puro (o único acesso externo é o `gh api` read-only do banco de fotos, opcional).
- **Resultado: APROVADO.** Entregável real: `C:/Users/Eric Luciano/Downloads/3-erros-ia-empresa-carrossel.html` (5 slides, kit `Tech (Space Grotesk)`, paleta `Scale`, fmt 45, handle `""`). Boot validado em navegador headless: capa renderizada com a copy real, 5 thumbnails, pílula "Arraste →", paginação 1/5, painel de edição preenchido, botão Exportar PNGs presente, sem placeholder `@seuperfil`. Snippet de contraste WCAG (node) rodou como escrito: Scale 11.27:1 e 14.94:1 (OK). `montar.py` é stdlib puro com encoding explícito — roda até no Python 3.14 da Store que o `command -v python3` da skill resolve hoje.

## Achados e fixes (marketing 2.13.7)

1. **Campo `foto` com forma POSIX quebra silenciosamente no Windows (DEFEITO, reproduzido).** A skill mandava `"foto": "<WORK>/eric.jpg"` ("mesma forma usada no projeto.json"). Mas o path do projeto.json funciona porque é ARGUMENTO de linha de comando (o Git Bash converte ao invocar o python.exe); o campo `foto` é DADO dentro do JSON e chega cru: `os.path.exists("/tmp/...")` dá False no Windows → `AVISO: foto nao encontrada`, exit 0, slide sem foto. Reproduzido e confirmado o fix: com a forma Windows (`<WORK_WIN>/eric.jpg`) o dataURL embute (arquivo foi de 33KB pra 645KB, 1 match `data:image/jpeg;base64`). Fix: instrução corrigida pra `<WORK_WIN>` com o porquê + entrada no recovery ("causa nº 1 no Windows"; aviso não derruba o script, conferir output sempre).
2. **Fonte local de fotos derivada de `WORKSPACE_DIR` quebrou com a migração do workspace (DEFEITO, drift).** O caminho alternativo era `${WORKSPACE_DIR:-$HOME/OneDrive/Workspace}/../Imagens/Perfil profissional/`. As fotos NÃO migraram pro Google Drive (05/07): continuam em `$HOME/OneDrive/Imagens/Perfil profissional/` (`Avatar.jpg` confirmado), e `G:/Meu Drive/claude-workspace/Imagens` não existe — com `WORKSPACE_DIR` apontando pro workspace novo, o caminho derivado aponta pro nada. Fix: caminho fixo direto no OneDrive, sem derivar de `WORKSPACE_DIR`, com nota de que a foto no JSON vai na forma Windows.

## Observações (não-defeito)

- `gh api` do banco de fotos funcionou (459KB, JPEG 1680x1680, validação >10KB passou).
- Playwright MCP estava com o perfil ocupado; boot check feito pelo fallback validado do ambiente (script Python 3.12 + Playwright headless) — sem 3ª tentativa idêntica.
- `body.innerText` não enxerga o texto dos slides no DOM do editor (falso negativo do probe); a prova de render foi o screenshot.
- A skill não manda passar a copy pelo `check_message` do voice guide — coerente com o desenho (ferramenta co-criativa pra qualquer marca, não só a voz do Eric; a voz sai da descoberta/defaults do Express).
- Legenda entregue no run (voz Express: direto, prático, sem hype, zero emoji, sem travessão):

  > A maioria das empresas não trava na tecnologia. Trava na ordem das decisões.
  >
  > Os 3 erros que mais vejo em quem está começando com IA:
  >
  > 1. Escolher a ferramenta antes de mapear o processo
  > 2. Tentar automatizar tudo de uma vez
  > 3. Implementar sem definir a métrica de resultado
  >
  > O caminho que funciona: um processo que dói toda semana, uma automação de ponta a ponta, um número de antes e depois.
  >
  > Salva esse post pra consultar antes do próximo projeto de IA. E me segue pra mais conteúdo de IA aplicada a negócio.
  >
  > #inteligenciaartificial #iaparanegocios #automacao #produtividade #gestao

- Resumo visual pra modo Reusar: `kit: "Tech (Space Grotesk)"` · `theme: {"name":"Scale","bg":"#103a4f","bg2":"#0a2433","fg":"#eafaff","accent":"#2dd4ff","grad":true}` · `fmt: "45"` · `handle: ""`.
- Artefatos de teste: `C:/tmp/golden-carrossel-boot.png` (screenshot do boot), `C:/tmp/golden-carrossel-foto-teste.html` (prova do embed dataURL).
