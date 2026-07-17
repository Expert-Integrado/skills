# Referência técnica — Formatação WhatsApp

Detalhes que NÃO precisam estar carregados pro uso comum. Leia quando o usuário lidar com templates da Business API, disparos em massa, ou pedir limites/nuances técnicas.

## Tabela completa de sintaxe

| Formato        | Sintaxe          | Entrada de exemplo            | Funciona em template? |
| -------------- | ---------------- | ----------------------------- | --------------------- |
| Negrito        | `*texto*`        | `*Pedido confirmado*`         | Sim                   |
| Itálico        | `_texto_`        | `_processando seu pedido_`    | Sim                   |
| Tachado        | `~texto~`        | `~R$1.499~ R$999`             | Sim                   |
| Monoespaçado   | ` ```texto``` `  | ` ```ARN-88291``` `           | Sim                   |
| Código inline  | `` `texto` ``    | `` `SAVE50` ``                | Sim                   |
| Lista marcador | `- item`         | `- RG  - CPF`                 | Sim                   |
| Lista numerada | `1. item`        | `1. Agende  2. Chegue 10min antes` | Sim              |
| Citação        | `> texto`        | `> Isto é uma citação`        | Sim (Cloud API v18+)  |

Notas de comportamento:
- Listas e citações foram adicionadas no início de 2024; em apps muito desatualizados podem não renderizar.
- Em listas, `Shift+Enter` cria novo item. Em citação, `Shift+Enter` NÃO continua a citação na linha nova.
- Não há reordenação/reinício automático de numeração — qualquer número de 1-2 dígitos inicia a lista.
- Monoespaçado tem prioridade sobre os demais: ` ```*texto*``` ` mostra os asteriscos literais.

## Limites de caracteres (WhatsApp Business API)

| Elemento                                   | Limite        | Observação                                                        |
| ------------------------------------------ | ------------- | ----------------------------------------------------------------- |
| Corpo do template                          | 1.024 chars   | Inclui variáveis. Mire em < 300 pra melhor engajamento.           |
| Cabeçalho de template (texto)              | 60 chars      | 5-8 palavras. Headline em negrito acima do corpo.                 |
| Rodapé de template                         | 60 chars      | Texto cinza pequeno. Bom pra avisos / "Responda SAIR".            |
| Rótulo de botão                            | 25 chars      | Por botão. Meta valida com rigor; estoura = submissão falha.      |
| Nome do template                           | 512 chars     | Uso interno. snake_case descritivo: `pedido_confirma_v2`.         |
| Mensagem livre (dentro da janela de 24h)   | 4.096 chars   | Não precisa de template dentro da janela de atendimento.          |

## Comprimento ótimo por tipo de mensagem

- **Utility / transacional** (confirmação, status): 80-160 caracteres. Cabe numa tela, só o essencial.
- **Marketing** (oferta + CTA): 100-250 caracteres.
- Acima de ~300 caracteres há queda mensurável na taxa de leitura completa. Corte.

## Emojis cross-platform

Renderizam com desenhos diferentes em Android vs iOS (fontes de emoji distintas). O significado se mantém, mas pra campanhas em massa vale testar os 20-30 emojis mais usados nas duas plataformas antes de fechar o template.

## Erros comuns a blindar (resumo do anti-Markdown)

- `**negrito**` → vira `**negrito**` literal. Use `*negrito*`.
- `*itálico*` esperando itálico → vira **negrito**. Itálico é `_assim_`.
- `# Título`, `## Subtítulo` → aparecem com a cerquilha. Não existe header; simule com `*Título*` + quebra de linha.
- `[clique aqui](https://...)` → aparece o colchete e o parêntese literais. Cole a URL crua.
- `<b>`, `<i>`, `<br>` e qualquer HTML → texto literal.
- Tabelas em Markdown (`| col | col |`) → viram lixo visual. Reescreva como lista ou linhas com emoji-âncora.
