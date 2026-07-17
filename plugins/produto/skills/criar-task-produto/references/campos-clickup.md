# Campos Personalizados do ClickUp — SuperSDR

Lista ID padrão: `901318182530`

> ⚠️ As opções podem mudar com o tempo. Se precisar dos valores mais atualizados, busque com `clickup_get_custom_fields` usando `list_id: 901318182530`.

---

## Categoria
**Field ID:** `32026351-43b9-46c4-8da0-2f1427431732` | Tipo: labels

| Label | Option ID |
|---|---|
| Correção/Bug | `5fa196f3-7dc3-430b-ac47-34c43d5c4569` |
| Atualização/Melhoria | `ca283300-a85f-4a7b-83f1-0e6290ca63ae` |
| Feature | `fd61a3c6-eee6-46f7-b3ce-a4ed0f6b4ae7` |
| Refatoração | `94317159-c9d3-4f9f-8e81-6088e0bf22a3` |
| Integração | `cd477759-5674-40ae-9a99-c251f2819c71` |
| Spike | `539629bb-0492-4bcb-aeba-a33dba8c3666` |
| Documentação | `9fd1afa9-d057-48cb-89cf-a9df7084c4f5` |
| Estratégico | `cab1e985-23bb-49ba-b4a7-573eabd99b72` |
| Interno | `d1225c3e-880c-4196-9114-cd51d0069562` |

**Como inferir:** bug → "Correção/Bug" | nova funcionalidade → "Feature" | ajuste em algo existente → "Atualização/Melhoria" | pesquisa/prova de conceito → "Spike" | nova integração com sistema externo → "Integração"

---

## Módulo
**Field ID:** `df67da4e-8b74-4241-a6ed-e2f3f08add97` | Tipo: labels (múltipla seleção)

| Label | Option ID |
|---|---|
| Recebimento de mensagem | `e7d6bdcf-c85d-4295-bf39-1abc2f0d7ef4` |
| Processamento de mensagem | `5e12e70e-00f6-42fa-9ade-88922c5b091a` |
| Cérebro | `18c9c539-a6aa-4cc3-a357-fddf0d35a90e` |
| Base de conhecimento | `7e6c6050-8696-454b-988e-11ccaa8cd91e` |
| Envio de mensagens | `d7b3b69f-100c-4ed2-b8d2-5d881f476fec` |
| Disparador | `d08ba00d-76eb-43bb-9863-67254ccfae27` |
| Agendamento | `22181b94-b062-4ff4-b04c-ae108d871bee` |
| CRM | `5215f433-e0db-4154-b7ac-083afddcad5b` |
| Plataforma de atendimento | `ae712d38-0eb5-4444-aa0f-9691624f0980` |
| Tools Extras | `872e1f96-5632-4e3d-85da-d0d5add74054` |
| Backup e Versionamento | `3bbfbc4a-5b0d-4b84-845a-64eeedc066c4` |
| Telefonia | `d9487751-0e24-4017-bd13-dd594108d270` |
| Métricas/Relatórios | `c45942a3-ab09-4360-bf0e-37247e4f1508` |
| Gerenciamento de Sessão | `501e08f9-a8a1-4a2c-8559-e321490ab54b` |
| Gestão de usuários | `bdbd147c-0bc6-4ac3-ab4f-4d6f5945640d` |
| Qualificação | `6fdf9dc4-72ae-403d-8569-6f7ff1f12567` |
| Ações agendadas | `3d36161e-c26f-4ed0-bf92-5e473cf9d7db` |
| Gestão de FUP | `00850eaf-3cc9-4878-80a8-3d9a871bee27` |
| Monitoramento de logs | `a226060c-39c0-41e6-ac4f-dc78f80cf3fb` |
| Gestão de credenciais | `3ca0e548-7164-411d-b469-9225728789b7` |
| Dashboard | `83976095-5c2a-4d67-b74a-e0a870dc73da` |
| Integrações | `85d12d3a-eb64-4f7a-960a-3ca2dbbe34d3` |
| Regras de comunicação | `1d606f1d-58c4-41d0-9c29-f619da52f300` |
| Banco de Dados | `576b426d-73d9-4b43-9140-66716666f410` |
| Campanha | `c0093643-ce5e-4831-88b5-75bfc5946d86` |
| Chat | `95687cce-2463-4490-b1f3-7b80086cdbdf` |
| Front-end | `b6ed23a5-f9d2-4ea3-aea7-9c51cdd26a8e` |
| Acionamento | `93f2e8e8-ce83-46f2-aec2-7ce01f662889` |
| Intenções | `9b2eaf03-bf45-4432-bdc1-78d1e7704265` |
| Prompts | `a66d797d-1490-45a3-986c-6b19859e2687` |
| Gestão de clientes | `a2c2a65d-961d-4d75-9a36-3b2685bf3bfa` |
| Trackeamento | `1dd3bfcc-9ed2-4a9b-963a-6d1dd5775862` |
| Notificações | `7e18ce59-5562-4f14-9fbb-459e07463d23` |
| Banco de mídia | `c6fcbd91-5903-4fba-9832-6a0f98c51a60` |
| Análise de conversa | `0a4b63f7-a58a-41c9-8e57-ba14c5dd4d63` |
| Infraestrutura | `25645b2f-9d5b-432f-bfe2-799430fb9184` |

**Como inferir:** identifique a área funcional do SuperSDR que a task impacta. Uma task pode ter múltiplos módulos. Se não estiver claro, pergunte ao usuário.

---

## Criticidade do Bug
**Field ID:** `b66bc3fe-df9f-4fdb-a7a0-0c231d22a482` | Tipo: dropdown
⚠️ Preencher **somente** quando a Categoria for "Correção/Bug"

| Criticidade | Option ID | Quando usar |
|---|---|---|
| Crítico | `fa136bc7-95a8-4211-ac1a-a57b6ca0ff6c` | Sistema inoperante, perda de dados, impacto em todos os clientes |
| Alta | `c2ec9c13-118b-4add-8e6c-11c081f7a534` | Funcionalidade principal quebrada, afeta muitos usuários, sem workaround |
| Média | `5d40c6b1-a275-4236-bdba-bab1542be1f4` | Funcionalidade comprometida mas com workaround possível |
| Baixa | `bc63a89e-799e-471e-ab2e-5978ebd82e56` | Problema cosmético ou edge case raro, baixo impacto |
