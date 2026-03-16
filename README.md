# Expert MCPs

Ferramentas de IA (MCPs) da Expert Integrado para uso com Claude Code.

## Ferramentas incluidas

| Ferramenta | Descricao |
|------------|-----------|
| **Pipedrive** | Deals, contatos, atividades e notas no CRM |
| **ClickUp** | Tarefas, documentos e time tracking |
| **Zoom** | Mensagens, canais e contatos no Zoom Team Chat |
| **Outlook** | E-mails, calendario e contatos via Microsoft 365 |
| **ChatGuru** | Consulta de conversas do WhatsApp empresarial |
| **WhatsApp** | WhatsApp pessoal via extensao do navegador |

## Pre-requisitos

- [Node.js 18+](https://nodejs.org/) — instale e reinicie o computador
- [Claude Code](https://claude.ai/download) instalado

## Instalacao

Abra o Claude Code e envie o seguinte prompt:

> Clona https://github.com/expertintegrado/skills.git em C:\MCPs\expert-mcps e roda `node setup.js` pra instalar os MCPs

O Claude Code faz tudo automaticamente:
1. Clona o repositorio
2. Executa o setup interativo em portugues
3. Voce escolhe quais ferramentas instalar
4. O setup guia a obtencao de credenciais passo a passo
5. Autenticacao via navegador quando necessario (Outlook, Zoom, ChatGuru)
6. Configura o Claude Code automaticamente — sem editar nenhum arquivo

## Credenciais

### Credenciais pessoais (cada pessoa obtem a sua)

| Ferramenta | O que obter | Onde encontrar |
|------------|-------------|----------------|
| **Pipedrive** | API Key pessoal | Pipedrive > Configuracoes > Preferencias pessoais > API |
| **ClickUp** | API Token pessoal | ClickUp > Settings > Apps > API Token |

### Autenticacao via navegador (nao precisa de credencial)

| Ferramenta | Como funciona |
|------------|---------------|
| **Outlook** | O setup abre o navegador — faca login com sua conta @expertintegrado.com.br |
| **Zoom** | O setup abre o navegador — faca login com sua conta Zoom da empresa |
| **ChatGuru** | O setup abre o navegador — digite seu usuario e senha do ChatGuru |
| **WhatsApp** | Instale a extensao do navegador e mantenha o WhatsApp Web aberto |

## Atualizacao

Quando houver atualizacao, abra o Claude Code e peca:

> Atualiza o repositorio em C:\MCPs\expert-mcps com git pull e roda node setup.js

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

Peca ao Claude Code:
> Verifica se meus MCPs estao configurados corretamente

Ou consulte a documentacao no ClickUp (Ferramentas de IA > Resolucao de Problemas).

## Licenca

MIT - Expert Integrado
