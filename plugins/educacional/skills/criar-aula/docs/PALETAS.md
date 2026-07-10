# PALETAS — os tons salvos da skill

3 paletas validadas. As cores ficam em `css/paleta-{scale|traction|midnight}.css`. Os templates HTML (`apresentacao.template.html`, `materiais.template.html`) são **paleta-agnósticos**: o `:root` é injetado no placeholder `{{PALETA_ROOT}}` e todo o resto (CSS e JS, inclusive `syncBodyBg()`) usa `var(--bg-darker)`/`var(--bg-dark)` e lê as vars. **Trocar de paleta = trocar só o bloco `:root`.**

## Qual usar

| Paleta | Vibe | Fundo (darker / dark) | Accent | Quando usar |
|--------|------|----------------------|--------|-------------|
| **scale** | Azul petróleo + ciano claro, profissional leve | `#074559` / `#0A5F7F` | ciano `#2DD4FF` | **Default** pra aula/imersão/educacional/corporate. Validada na G4 Scale e na Imersão Arquitetos. |
| **traction** | Preto + azul vibrante, SaaS/disruptivo, alto contraste | `#0A0A1A` / `#1A1A2E` | azul `#4F8DFD` | Tema técnico/produto/startup. Validada na G4 Traction. |
| **midnight** | Navy + ice + dourado, board-room/luxo | `#0E1A2E` / `#1B2845` | dourado `#E8C547` | Evento premium/executivo, público C-level. Validada nos 5 Níveis de IA. |

Na dúvida, **scale** (azul claro) é o default do Eric pra aula/imersão. Se o evento tem identidade própria (ex.: "G4 Traction"), casar com ela. Sem clareza → perguntar ao Eric.

## Como aplicar

1. Escolher a paleta na tabela acima.
2. Copiar o bloco `:root { ... }` inteiro de `css/paleta-<nome>.css`.
3. Colar no lugar do `{{PALETA_ROOT}}` na `apresentacao.html` **E** na `materiais/index.html` (a MESMA paleta nos dois).
4. Pronto — `html`, `.viewport-bg`, `syncBodyBg()` e tudo mais já leem as vars. Não há mais nenhum hex de fundo hardcoded pra trocar.

## Regra de contraste (anti-pattern travado)

- Em fundo escuro (`.dark` / `.darker` / `.quem`): `strong`/destaque usa `--cyan` (claro). **NUNCA `--cyan-deep`** (contraste insuficiente).
- Em fundo claro (`.slide` base): destaque usa `--cyan-deep`.
- O CSS dos templates já faz isso (`.dark strong { color: var(--cyan) }`); só não sobrescrever com hex inline.

## Foto na capa / "Quem sou"

O slide "Quem sou" usa `img/eric-foto.png` (card branco sobre fundo escuro). Copiar a foto pra `03_Assets/slides-html/img/eric-foto.png` antes do deploy.
Fonte canônica da foto: `Educacional/01_Aulas_e_Palestras/2026-05-26_G4-Scale_Produtividade-com-IA/img/eric-foto.png`.
