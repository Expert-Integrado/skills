# Expert MCPs

Ferramentas de IA (MCPs) da Expert Integrado para uso com Claude Code.

## Ferramentas incluídas

| Ferramenta | Descrição |
|------------|-----------|
| **Pipedrive** | Deals, contatos, atividades e notas no CRM |
| **ClickUp** | Tarefas, documentos e time tracking |
| **Zoom** | Mensagens, canais e contatos no Zoom Team Chat |
| **Outlook** | E-mails, calendário e contatos via Microsoft 365 |
| **ChatGuru** | Consulta de conversas do WhatsApp empresarial |
| **WhatsApp** | WhatsApp pessoal via extensão do navegador |

## Pré-requisitos

- [Node.js 18+](https://nodejs.org/) — instale e reinicie o computador
- [Claude Code](https://claude.ai/download) instalado

## Instalação

### Opção 1 — Setup interativo (recomendado)

```bash
git clone https://github.com/expertintegrado/skills.git C:\MCPs\expert-mcps
cd C:\MCPs\expert-mcps
node setup.js
```

O setup:
- Verifica automaticamente se o Node.js está instalado
- Mostra as ferramentas disponíveis e você escolhe quais instalar
- Guia passo a passo para obter suas credenciais pessoais
- Executa a autenticação automaticamente (Outlook, Zoom, ChatGuru)
- Configura o Claude Code sem precisar editar nenhum arquivo

### Opção 2 — Via Claude Code

Abra o Claude Code e peça:

> "Clona https://github.com/expertintegrado/skills.git em C:\MCPs\expert-mcps e instala os MCPs que eu precisar"

O Claude Code faz tudo: npm install, credenciais, configuração.

## Credenciais

### Credenciais pessoais (cada pessoa obtém a sua)

| Ferramenta | O que obter | Onde encontrar |
|------------|-------------|----------------|
| **Pipedrive** | API Key pessoal | Pipedrive > Configurações > Preferências pessoais > API |
| **ClickUp** | API Token pessoal | ClickUp > Settings > Apps > API Token |

### Autenticação via navegador (não precisa de credencial)

| Ferramenta | Como funciona |
|------------|---------------|
| **Outlook** | O setup abre o navegador — faça login com sua conta @expertintegrado.com.br |
| **Zoom** | O setup abre o navegador — faça login com sua conta Zoom da empresa |
| **ChatGuru** | O setup abre o navegador — digite seu usuário e senha do ChatGuru |
| **WhatsApp** | Instale a extensão do navegador e mantenha o WhatsApp Web aberto |

## Atualização

Quando houver atualização:

```bash
cd C:\MCPs\expert-mcps
git pull
node setup.js
```

Ou peça ao Claude Code:
> "Atualiza o repositório em C:\MCPs\expert-mcps com git pull e roda npm install"

## Estrutura

```
expert-mcps/
  mcps/
    pipedrive/    — Pipedrive CRM
    clickup/      — ClickUp
    zoom/         — Zoom Team Chat
    outlook/      — Microsoft 365 (Outlook)
    chatguru/     — ChatGuru (modo readonly)
    whatsapp/     — WhatsApp Web
  setup.js        — Setup interativo
  package.json
  README.md
```

## Problemas?

Peça ao Claude Code:
> "Verifica se meus MCPs estão configurados corretamente"

Ou consulte a documentação no ClickUp (Ferramentas de IA > Resolução de Problemas).

## Licença

MIT - Expert Integrado
