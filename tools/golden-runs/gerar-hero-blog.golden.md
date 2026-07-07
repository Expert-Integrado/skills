# Golden run — marketing:gerar-hero-blog

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** todos os 204 posts do blog já têm hero (`--all-missing` limpo), então a geração rodou num post de TESTE descartável (`_golden-run-hero-teste.mdx`, prefixo underscore fica fora da collection do Astro). Geração mínima: 1 imagem (~R$0,85).
- **Resultado: APROVADO.** Ciclo completo real: `--all-missing` (batch, read-only) -> conceito validado no checklist do Passo 1 -> gpt-image-2 HIGH gerou em 144s -> WebP 45KB salvo em `public/images/` -> `heroImage`+`heroAlt` (acentuado) aplicados no frontmatter -> re-run deu `[skip]` (idempotência confirmada) -> imagem conferida visualmente na direção de arte (flat-vector, paleta azul/off-white, sem texto/logo, 1 sujeito central) -> `npm run build` verde (214 páginas, exit 0, arquivo underscore fora do build). Chave consumida inline via `op read` (nunca literal). Passo 4 (deploy) NÃO executado — gate correto, Eric não pediu. Artefatos de teste removidos; working tree do blog voltou ao estado pré-existente.

## Achados e fixes (marketing 2.13.8)

1. **Geração excede o timeout default da tool Bash (DEFEITO, medido).** A skill não avisava sobre duração: HIGH levou 144s no PC (o exemplo sugeria "31s"), acima dos 120s default — a execução literal mataria o script NO MEIO da chamada paga (custo perdido + estado parcial). Fix: nota no Passo 2 mandando `timeout: 300000` explícito (ou background com log + sentinela pra lotes).
2. **Premissa de ambiente caducada na resolução do Python (DEFEITO, drift).** "O PC do Eric NÃO tem python/python3 no PATH" — falso desde que o 3.14 da Store entrou no PATH; a resolução literal caía no 3.14, que só funcionou porque Pillow por acaso está instalado nele (12.1.1). Fix: resolução por CAPACIDADE (`import PIL`), mesmo padrão aplicado em cortar-respiros, com instrução de instalar Pillow no candidato quando nenhum passa.

## Observações (não-defeito)

- `op read` + export inline funcionou como documentado; script aborta sem a chave (não testado o abort — caminho feliz coberto).
- O comportamento `[skip]` de hero >8KB pré-existente também cobre o ramo "fonte real fornecida" (fonte 1/2), que usa exatamente esse mecanismo — não repetido separadamente.
- heroAlt default gerado pelo script veio com acentuação correta ("Ilustração editorial em tons de azul...").
- Custo real do run: 1 geração HIGH 1536x1024 (~US$0,165).
- Log do run: `C:/tmp/golden-hero-run.log`.
