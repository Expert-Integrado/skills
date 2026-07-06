# Golden run — lab:aula-mentoria (classe B/C: mexe em gravações reais, Smart Player dos alunos e ClickUp do time)

## INVOCAÇÃO

Run COMPLETO só no cenário real (Eric acabou de gravar a mentoria):

```
/aula-mentoria acabei de gravar a mentoria
```

Run PARCIAL (sem side-effect — pode sempre): pré-requisitos + padrão PowerShell + IDs ClickUp.

## VALIDAÇÃO

Parcial:
- [ ] Pasta OBS existe; G: montado (Drive Desktop)
- [ ] Padrão PS1 UTF-8 BOM roda; OUTPUT com acento íntegro ([Console]::OutputEncoding UTF8)
- [ ] Claude_in_Chrome na sessão (sem ele a skill PARA no pré-req 1 — parada legítima)
- [ ] IDs ClickUp cacheados válidos: cartão referência 86ahq9uq2 acessível, list Roadmap + 3 custom fields existem

Completo (aula real):
- [ ] Rename + .mkv pra LIXEIRA só após OK do Bloco 4; Test-Path valida
- [ ] Drive: pasta criada no browser + cópia via G: (nunca upload por diálogo)
- [ ] Smart Player: entradas via XHR na aba + PUT curl nas URLs pré-assinadas (HTTP 200; expiram em 1h)
- [ ] Cartão ClickUp com Vanderson + 3 custom fields + links das 2 pastas

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | lab 3.10.2 | PARCIAL APROVADO com 1 ACHADO corrigido: snippet de listagem do Passo 3 devolvia acentos corrompidos no output ("Automa??es") — e esses nomes alimentam o Rename do Passo 5; adicionado [Console]::OutputEncoding UTF8 + regra geral no padrão PS1. Pré-reqs OK (OBS, G:), IDs ClickUp validados live (cartão referência acessível, 3 custom fields presentes). Chrome MCP ausente na sessão = parada legítima do pré-req 1 validada. Run completo fica pro próximo uso real (próxima gravação da mentoria) |
