# Paleta Visual — Plano de Ação Expert Integrado

Extraído do `Plano_Acao_Marcelo_Coelho.pptx`. Use exatamente estas cores, fontes e medidas. A identidade visual é da Mentoria de Automações Inteligentes — não improvise.

## Dimensões do slide

- Aspecto: 16:9
- Largura: 12 191 675 EMU (13,33 polegadas)
- Altura: 6 858 000 EMU (7,50 polegadas)

## Cores oficiais

| Função | Hex | Onde aparece |
|---|---|---|
| Texto principal claro | `#FAFAFA` | Títulos grandes (Play), bullets de corpo |
| Microcopy / descrição | `#A1A1AA` | Subtítulos, descrições de cards, captions |
| Cinza escuro discreto | `#3F3F46` | Label "EXPERT INTEGRADO" da capa, slide de fechamento |
| Cor de marca (ciano) | `#06B6D4` | Linhas decorativas, marcadores de bullet, número dos cards, label superior "PLANO DE AÇÃO", botão "Catálogo de Plugins" |
| Verde de ação | `#10B981` | Texto "abrir" (link de aula), estatística verde de destaque, botão "Catálogo Lovable", pergunta-chave |
| Roxo de estatística | `#8B5CF6` | Estatística numérica de destaque (sempre na 1ª coluna do bloco de stats) |

O fundo escuro do slide é fornecido pelo próprio template/master — não foi extraído como hex direto, mas é quase preto/grafite. Não mexa no master.

## Tipografia

| Uso | Família | Tamanho típico | Peso |
|---|---|---|---|
| Títulos grandes (capa, fechamento) | `Play` | 36-41pt | Bold |
| Títulos de slide | `Play` | 25pt | Bold |
| Frases-âncora dentro do slide | `Play` | 18-21pt | Bold |
| Mini-títulos de cards numerados | `Play` | 15-17pt | Bold |
| Estatísticas numéricas grandes | `Play` | 28pt | Bold |
| Corpo / bullets | `Arial` | 13-17pt | Regular |
| Descrição de cards / microcopy | `Arial` | 11.5-14.5pt | Regular |
| Label superior dos slides | `Arial` | 8.5pt | Bold |

A fonte Play vem do Google Fonts. Quando renderizar em ambiente que não tenha Play instalado, o LibreOffice usará fallback — para o PPTX original ficar correto na máquina do usuário, mantemos o template existente como base e apenas substituímos texto. Não trocamos a família declarada.

## Layout — anatomia de um slide de conteúdo

1. **Margem esquerda dos elementos textuais**: aprox. 660 000 EMU (~0,72 in).
2. **Label "PLANO DE AÇÃO"**: alto e à esquerda. Arial 8.5pt bold, cor ciano `#06B6D4`.
3. **Título do slide**: Play 25pt branco logo abaixo.
4. **Linha decorativa**: linha horizontal fina ciano, posicionada em aprox. `top=1 444 752 EMU` (~1,58 in), entre o título e o conteúdo.
5. **Conteúdo**: bullets, cards numerados, tabelas, blocos de stats.
6. **Slide number "‹#›"** no canto inferior direito (já está no master, não precisa tocar).

## Padrões visuais reutilizados

### Bullet com marcador ciano

Cada bullet é uma linha com:
- Um caractere `•` em cor ciano `#06B6D4` (Arial, mesmo tamanho do texto)
- Espaço
- Texto em branco `#FAFAFA` (Arial)

### Card numerado

Bloco com:
- Número grande em ciano (Arial 13pt bold) — "1", "2", "3", "4" ou "01", "02", "08"…
- Mini-título em Play bold branco
- Descrição curta em cinza Arial

### Bloco de estatística

Coluna com:
- Número grande (Play 28pt bold) em cor de destaque (roxo, ciano ou verde)
- Label/descrição em Arial 13.5pt cinza `#A1A1AA`

### Linha de aula da trilha

Linha com (da esquerda para a direita):
- Número da aula (Arial 12pt bold ciano)
- Nome da aula (Arial 11.5pt bold branco)
- Descrição curta (Arial 11.5pt cinza)
- Texto "abrir" (Arial 11.5pt bold verde `#10B981`, hyperlink)

## Capa e slide de fechamento (especial)

Diferentes dos slides de conteúdo:

- Não exibem o label superior `PLANO DE AÇÃO` ciano. Em vez disso, exibem `EXPERT INTEGRADO` em cinza escuro `#3F3F46` (capa) ou `Expert Integrado` (fechamento).
- Título principal em Play 36-41pt bold branco, ocupando o terço superior-esquerdo.
- Linha decorativa horizontal ciano abaixo do título.
- Subtítulos em cinza `#A1A1AA`.
- Capa exibe ainda uma "tag de prioridade" em ciano (Play 17pt bold) — frase curta que adianta a tese da apresentação.

## Como o script preserva tudo isso

O script `build_plano_acao_pptx.py` não recria layouts — ele **clona** o `assets/plano_acao_template.pptx` e substitui apenas o texto de cada `text_frame`, preservando run-level formatting (fonte, tamanho, cor, bold). Isso garante que toda a identidade visual seja mantida automaticamente.

Quando precisar adicionar conteúdo extra (slide com mais bullets que o template, número diferente de cards), duplique um slide existente do template antes de editar — não tente construir do zero, porque o master não está documentado em código.
