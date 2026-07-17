---
name: formatar-whatsapp
description: Formata ou escreve qualquer texto no padrão NATIVO de formatação do WhatsApp — que é diferente de Markdown (negrito com *um* asterisco, itálico com _underline_, listas, citações, monoespaçado). Use SEMPRE que o usuário disser que o texto vai pro WhatsApp ou usar frases como 'isso vai pro WhatsApp', 'formata pro zap', 'manda no WhatsApp', 'escreve uma mensagem de WhatsApp', 'texto pro grupo', 'mensagem pro cliente no zap', 'deixa no formato do WhatsApp', ou colar um texto pedindo pra adaptar pro WhatsApp. Também ative ao redigir qualquer mensagem cujo destino final seja o WhatsApp, mesmo sem o pedido explícito de 'formatar'. NÃO é para o conteúdo específico da mentoria (use mentoria-whatsapp-conteudo) nem para definir tom de voz (use voice-apply) — esta skill cuida da formatação mecânica e da legibilidade no WhatsApp.
---

# Formatar para WhatsApp

Pega um texto (que o usuário forneça OU que você escreva do zero) e entrega no formato nativo do WhatsApp, pronto pra copiar e colar, otimizado pra leitura em tela de celular.

## A regra de ouro: WhatsApp NÃO é Markdown

Esse é o erro nº 1 e a razão de existir desta skill. Os modelos têm reflexo de cuspir Markdown, mas o WhatsApp tem sua **própria** sintaxe. O que está errado aparece como caractere literal na conversa do usuário — `**texto**` chega no contato como `**texto**` mesmo, com os asteriscos visíveis.

| Quer isto       | WhatsApp (CERTO)     | Markdown (ERRADO no zap) |
| --------------- | -------------------- | ------------------------ |
| **Negrito**     | `*texto*` (1 asterisco) | `**texto**` (2 asteriscos) |
| _Itálico_       | `_texto_` (underline)   | `*texto*` (asterisco)      |
| Título          | *não existe* — use negrito + quebra de linha | `# Título`     |
| Link            | cole a URL crua (vira link sozinho) | `[texto](url)` |
| Lista           | `- item` ou `1. item`   | igual, ok                  |

Checklist mental antes de entregar QUALQUER texto de WhatsApp:
- Negrito está com **um** asterisco de cada lado? (não dois)
- Itálico está com **underline**? (não asterisco)
- Tem algum `#`, `**`, `[](...)`, `<br>`, `<b>` sobrando? Se sim, é Markdown/HTML vazado → corrigir.

## Sintaxe completa do WhatsApp

- *Negrito*: `*texto*`
- _Itálico_: `_texto_`
- ~Tachado~: `~texto~`
- Monoespaçado (fonte fixa, bloco): três crases antes e depois — ` ```texto``` `
- Código inline (fonte fixa, fundo cinza): uma crase — `` `texto` ``
- Lista com marcador: `- item` (hífen + espaço) — também aceita `* item`
- Lista numerada: `1. item` (número + ponto + espaço)
- Citação: `> texto` (maior-que + espaço; vira barra vertical na lateral)

Combinar estilos é possível: `*_texto_*` = negrito + itálico. Exceção: **monoespaçado não combina** com os outros — se misturar, o mono vence e o resto vira texto literal.

Sem suporte a: sublinhado, títulos/headers, tabelas, cor de texto, links com texto-âncora. Renderiza igual em Android, iOS, Web e Mac (só emoji muda de desenho por plataforma).

Para mostrar um asterisco/til **literal** (sem virar formatação), envolva em monoespaçado — o WhatsApp não tem caractere de escape.

## Princípios de legibilidade (a parte que separa mensagem boa de parede de texto)

WhatsApp é lido em tela pequena, no meio de mil notificações. Hierarquia visual importa MAIS que em e-mail. Padrão = **leve e escaneável**:

1. **Negrito só nos 2-3 dados-chave** da mensagem (nome, valor, data, número do pedido). Negritar tudo = não destacar nada.
2. **Quebras de linha separando blocos** de informação. Pulou de assunto, pulou linha. Evite parágrafos longos.
3. **Emojis como âncora visual** no início de linhas/itens, com moderação e propósito (📦 pedido, 💰 valor, 🚚 entrega). Não enfeite por enfeitar.
4. **Abertura calorosa e pessoal**, nunca "Prezado cliente". Use o nome quando souber.
5. **Curto.** Mensagem acima de ~300 caracteres tem queda de leitura. Vá direto.

Exemplo BOM (escaneável, negrito pontual, emoji-âncora):
```
✅ *Pedido confirmado*, Priya!

📦 Pedido: *#ORD-4521*
🛍️ Kurta de linho azul (M)
💰 Total: *R$ 149*
🚚 Entrega até: *9 de abril*

Te aviso aqui quando despachar! 😊
```

Exemplo RUIM (parede de texto, negrito demais, frio):
```
*Prezado cliente* seu pedido ORD-4521 foi *confirmado* e contém o produto Kurta de linho azul M no valor total de R$149. *A entrega está prevista para 9 de abril.* Avisaremos por mensagem quando despachado. *Obrigado pela preferência.*
```

Quando o usuário pedir explicitamente formatação **rica** ou o conteúdo for longo (comunicado, tutorial, post de grupo), aí sim use listas, citações e mais estrutura — mas mantendo os princípios acima.

## Integração com o tom de voz (condicional)

Quando a tarefa for **escrever do zero** (não só formatar um texto pronto):

1. Verifique se a skill `voice-apply` está disponível no ambiente.
2. **Se estiver:** aplique o Voice Guide do usuário ao redigir, e SÓ DEPOIS formate pro WhatsApp. Ordem: conteúdo + tom → formatação.
3. **Se NÃO estiver** (a skill foi compartilhada com alguém sem voice-apply configurado): siga normalmente, escrevendo num tom natural, claro e adequado ao contexto (cliente, time, grupo). Não trave nem avise sobre a ausência — a skill funciona 100% sozinha.

Quando a tarefa for só **formatar** um texto que o usuário já entregou, NÃO reescreva o conteúdo nem mexa no tom — só aplique a formatação e a estrutura de legibilidade, preservando as palavras dele.

## Como entregar a saída

Entregue a mensagem final **dentro de um bloco de código** (três crases, sem linguagem). Isso é essencial: a interface de chat renderiza `*asterisco*` como itálico e o usuário acabaria copiando a versão renderizada, perdendo a sintaxe. No bloco de código, os marcadores ficam literais e o botão de copiar entrega o texto exato pro WhatsApp.

- Entregue o texto pronto primeiro. Sem preâmbulo longo.
- Se houver uma decisão de formatação que valha explicar (ex: "deixei negrito só na data"), comente em 1 linha DEPOIS do bloco.
- Se a mensagem for longa o bastante pra virar várias (acima de ~4096 caracteres ou claramente vários assuntos), sugira quebrar em mensagens separadas e entregue cada uma em seu bloco.

## Fluxo de trabalho

1. Identifique o modo: **formatar** (usuário deu o texto) ou **escrever do zero** (usuário descreveu o que quer dizer).
2. Identifique o contexto/destino: cliente, lead, time interno, grupo, comunicado em massa? Isso calibra tom e intensidade.
3. Se for escrever do zero → aplicar voice-apply se existir (ver seção acima).
4. Redija/adapte o conteúdo com os princípios de legibilidade.
5. Converta TUDO pra sintaxe nativa do WhatsApp e rode o checklist anti-Markdown.
6. Entregue no bloco de código.

## Referência

Para limites de caracteres por tipo de mensagem, nuances de templates da WhatsApp Business API, mais exemplos e casos de borda, leia `references/whatsapp-syntax.md` quando o usuário estiver lidando com templates oficiais, disparos em massa, ou pedir detalhes técnicos da API. Para o uso do dia a dia (formatar/escrever uma mensagem), o conteúdo acima já basta.
