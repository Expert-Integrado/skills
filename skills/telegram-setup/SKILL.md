---
name: telegram-setup
description: Guia de instalacao e configuracao do Telegram conectado ao Claude Code com suporte a audio via Whisper local. TRIGGER quando o usuario pedir para configurar Telegram, conectar bot ao Claude Code, instalar suporte a voz, ou seguir o guia de setup do Telegram.
version: 0.1.0
---

# Configuracao do Telegram no Claude Code

Guia para conectar seu bot do Telegram ao Claude Code e habilitar transcricao de audio usando o Whisper ja instalado pelo Voice AI.

## Pre-requisitos

Antes de comecar, verificar:

- [ ] Claude Code instalado e funcionando
- [ ] Voice AI instalado no computador (fornece o Whisper local)
- [ ] VS Code com terminal integrado (Ctrl + ')
- [ ] Telegram instalado no celular ou desktop
- [ ] Acesso ao @BotFather no Telegram

## Etapa 1: Criar o bot no Telegram

1. Abra o Telegram e busque por **@BotFather**
2. Envie `/newbot`
3. Escolha um nome para o bot (ex: `Joao Claude Bot`)
4. Escolha um username (deve terminar em `bot`, ex: `joao_claude_bot`)
5. Copie o token gerado — formato: `1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Etapa 2: Configurar o token no Claude Code

Abra o Claude Code e rode:

```bash
/telegram:configure SEU_TOKEN_AQUI
```

Substituir `SEU_TOKEN_AQUI` pelo token copiado do BotFather.

## Etapa 3: Iniciar o Claude Code com o canal Telegram

Feche o terminal e reabra. No terminal integrado do VS Code, rode:

```bash
claude --channels plugin:telegram@claude-plugins-official
```

**Importante:** nao basta abrir o Claude Code normalmente — precisa passar o parametro `--channels` para ativar o canal do Telegram.

## Etapa 4: Parear sua conta do Telegram

1. No Telegram, abra o chat com o bot que voce criou
2. Envie qualquer mensagem (ex: `oi`)
3. O bot vai responder com um codigo de 6 caracteres
4. No Claude Code, rode:

```bash
/telegram:access pair CODIGO_AQUI
```

5. O bot confirma: **"Paired! Say hi to Claude."**

## Etapa 5: Autorizar o primeiro acesso

Na primeira mensagem recebida via Telegram, o Claude Code vai pedir permissao para responder.

- Selecionar **"Yes, and don't ask again"**

Se nao fizer isso, o bot vai travar em todas as mensagens subsequentes.

## Etapa 6: Habilitar transcricao de audio

Por padrao, o Claude Code nao sabe transcrever audios. Para habilitar, e preciso apontar para o Whisper que ja esta instalado pelo Voice AI.

### Localizar o Whisper

O Whisper instalado pelo Voice AI fica em:

```plaintext
C:\Users\SEU_USUARIO\AppData\Local\Python\pythoncore-3.14-64\Scripts\whisper.exe
```

Substituir `SEU_USUARIO` pelo nome do seu usuario do Windows.

Para confirmar, abra o terminal do Claude Code e rode:

```bash
!"C:\Users\SEU_USUARIO\AppData\Local\Python\pythoncore-3.14-64\Scripts\whisper.exe" --help
```

Se aparecer a lista de opcoes, esta funcionando.

**Atencao:** o Whisper nao esta no PATH do sistema — sempre use o caminho completo.

### Como o Claude transcreve o audio

Quando um audio chega pelo Telegram, o Claude Code recebe o arquivo (formato `.oga`) e roda o Whisper automaticamente. Nao e necessaria nenhuma configuracao adicional — o Claude ja sabe usar o executavel pelo caminho completo.

Modelo recomendado: `base` com `--language pt` para portugues.

## Troubleshooting

### Bot nao responde apos a primeira mensagem

- **Sintoma:** primeira mensagem funciona, as seguintes ficam sem resposta ou aparece "typing" e para
- **Causa:** Claude Code cria processos duplicados do plugin Telegram que se conflitam
- **Fix:** antes de iniciar, rodar dentro do Claude Code:

```powershell
!powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force"
```

O prefixo `!` executa comandos shell direto do Claude Code, sem precisar abrir outro terminal.
Depois reiniciar com `claude --channels plugin:telegram@claude-plugins-official`.

### Permissao de reply trava toda vez

- **Sintoma:** Claude Code pede permissao a cada mensagem
- **Causa:** selecionou "Yes" em vez de "Yes, and don't ask again"
- **Fix:** fechar e reabrir o Claude Code com `--channels`. Na proxima mensagem, selecionar a opcao 2.

### Whisper nao encontrado ("comando nao reconhecido")

- **Sintoma:** audio chega mas nao transcreve
- **Causa:** Whisper nao esta no PATH do sistema
- **Fix:** sempre usar o caminho completo:

```plaintext
C:\Users\SEU_USUARIO\AppData\Local\Python\pythoncore-3.14-64\Scripts\whisper.exe
```

### Bot parou de responder do nada

- **Sintoma:** bot funcionava e parou
- **Causa:** o terminal do Claude Code foi fechado ou a sessao expirou
- **Fix:** reabrir o terminal e rodar novamente:

```bash
claude --channels plugin:telegram@claude-plugins-official
```

## Referencia rapida

| Acao | Comando | Notas |
|------|---------|-------|
| Configurar token | `/telegram:configure TOKEN` | Rodar dentro do Claude Code. Token vem do BotFather. |
| Iniciar com Telegram | `claude --channels plugin:telegram@claude-plugins-official` | Obrigatorio toda vez que abrir o Claude Code. |
| Parear conta | `/telegram:access pair CODIGO` | Codigo de 6 chars aparece no chat do bot. |
| Matar processos duplicados | `!powershell -Command "Get-Process bun -ErrorAction SilentlyContinue \| Stop-Process -Force"` | Usar se o bot parar de responder. |
| Testar Whisper | `!"C:\...\whisper.exe" --help` | Verificar se o caminho esta correto. |
| Resetar tudo | `/telegram:configure TOKEN` + reiniciar | Limpa config e reconfigura. |

## Limitacoes

- Suporte a **1 bot por instalacao** — nao e possivel conectar dois bots simultaneamente
- A sessao do Claude Code **precisa ficar aberta** — fechou o terminal, o bot para
- Funciona apenas no **Claude Code (CLI)**, nao no Claude Desktop
- Bug conhecido no Windows (marco 2026): processos duplicados do Bun. PRs de correcao em andamento no repositorio oficial.

## Proximos passos

Apos configurar:

1. **Controle de acesso:** usar `/telegram:access` para gerenciar quem pode usar o bot
2. **Testar audio:** envie um audio de voz pelo Telegram e verifique se a transcricao funciona
3. **Troubleshooting avancado:** logs de erro ficam em `~/.claude/logs/`

## REGRAS

1. **Todos os textos em portugues brasileiro** com acentuacao correta
2. **Sem emojis** a menos que o usuario peca
3. **Tom acolhedor mas direto** — lembrar que podem ser pessoas nao tecnicas
4. **Tudo pelo VS Code** — evitar pedir que o usuario abra prompt de comando separado
5. **Caminhos Windows** — usar formato Windows com `\` nos exemplos
6. **Nao incluir tokens reais** nos exemplos — sempre usar placeholders
