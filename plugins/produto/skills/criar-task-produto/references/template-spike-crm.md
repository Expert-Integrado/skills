# Template — Spike de Validação de CRM

Subtipo de spike específico para avaliar se um novo CRM pode ser integrado ao SuperSDR. Usado sempre que chegar um pedido de integração com um CRM ainda não suportado.

---

## Informações necessárias (coletar se ausentes)
- Nome do CRM
- Link da documentação da API (tente acessar com `web_fetch` para pré-preencher o mapeamento)
- Link do site do CRM (se houver)

> **Dica:** Se um link de API docs for fornecido, use `web_fetch` para extrair as rotas disponíveis e pré-preenche o mapeamento com o que já for visível. Isso agiliza bastante o trabalho do responsável.

---

## Campos ClickUp (fixos para esse tipo)

- **Nome da task:** `[Spike] Avaliar viabilidade de integração com [Nome do CRM]`
- **Categoria:** `Spike` (ID: `539629bb-0492-4bcb-aeba-a33dba8c3666`)
- **Módulo:** `CRM` + `Integrações`
- **Story Points:** `2`

---

## Template

```markdown
## 📋 História de Usuário
Como time de produto da Expert Integrado, queremos avaliar a viabilidade técnica de integrar o SuperSDR com o [Nome do CRM], para determinar se é possível oferecer essa integração aos clientes que utilizam o [Nome do CRM] como CRM de vendas.

---

## 🎯 Objetivo
Analisar a API do [Nome do CRM] e mapear quais operações essenciais para a integração com o SuperSDR estão disponíveis, produzindo uma recomendação clara de viabilidade antes de qualquer desenvolvimento.

---

## 📝 Descrição & Contexto
[Breve descrição do CRM: segmento, público-alvo, destaque principal. Ex: "CRM de vendas para PMEs com API REST pública, autenticada via API Key."]

**Nomenclatura no [Nome do CRM] (a confirmar na pesquisa):**
- A entidade equivalente a "Contato" parece ser [X]
- A entidade equivalente a "Negócio/Oportunidade" parece ser [Y]

---

## 🔍 O que precisa ser mapeado

Para cada item, registrar: ✅ disponível | ⚠️ disponível com limitações | ❌ não disponível

**Entidade: Contato / Lead**
- [ ] Criar contato
- [ ] Atualizar contato
- [ ] Buscar/listar contatos

**Entidade: Negócio / Oportunidade**
- [ ] Criar negócio
- [ ] Atualizar negócio
- [ ] Buscar/listar negócios
- [ ] Atualizar etapa (stage) do negócio
- [ ] Atualizar campos personalizados do negócio
- [ ] Atualizar proprietário (responsável) do negócio
- [ ] Atualizar status do negócio (aberto / ganho / perdido)

**Atividades**
- [ ] Criar atividade vinculada a um contato ou negócio

**Outros**
- [ ] Suporte a webhooks (eventos em tempo real)
- [ ] Obter lista de estágios configurados na conta
- [ ] Autenticação: tipo e fluxo (API Key, OAuth, JWT?)
- [ ] Rate limit relevante para o volume do SuperSDR

---

## ✅ Critérios de Aceitação
- [ ] Todos os itens do mapeamento foram avaliados com ✅ / ⚠️ / ❌
- [ ] A nomenclatura real das entidades na API foi confirmada
- [ ] O mecanismo de autenticação foi documentado
- [ ] Parecer de viabilidade registrado na task: viável / viável com ressalvas / inviável
- [ ] Se viável: estimativa de esforço de desenvolvimento registrada
- [ ] Se inviável ou com ressalvas: bloqueios documentados claramente

---

## 🚫 Fora do Escopo
- Desenvolvimento da integração — essa task é só pesquisa
- Avaliação de outras ferramentas além do [Nome do CRM]

---

## 🔗 Dependências
- Documentação oficial da API: [link]
- Pode ser necessário criar conta trial para testar endpoints na prática

---

## 🔍 Resultado Esperado da Pesquisa
O time deve concluir esta task sabendo:
1. Se a API do [Nome do CRM] cobre todas as operações necessárias para integração com o SuperSDR
2. Qual o mecanismo de autenticação e se há alguma limitação relevante
3. Se há suporte a webhooks (essencial para sincronização em tempo real)
4. Uma recomendação clara: **viável**, **viável com ressalvas** ou **inviável**, com justificativa

---

## 🎯 Story Points sugeridos
**2 pontos** — pesquisa e documentação de viabilidade, sem desenvolvimento
```
