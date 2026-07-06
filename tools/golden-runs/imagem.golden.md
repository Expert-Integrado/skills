# Golden run — marketing:imagem (side-effect: 1 chamada gpt-image-2, ~US$0,02)

## INVOCAÇÃO (colar numa sessão limpa)

```
/marketing:imagem gera uma imagem minha de terno num palco de evento corporativo, formato quadrado, paleta Expert
```

## VALIDAÇÃO

- [ ] Formato quadrado resolvido pra --size 1024x1024 SEM perguntar (pedido é inequívoco)
- [ ] Catálogo baixado via gh api (repos/ericlucianoferreira/agent-assets/.../catalogo.json) — não inventou foto
- [ ] Pedido ativa 2 categorias (terno=formal, palco=palestra): aplicou a precedência do guia; SE ficou ambíguo entre 2 candidatas, mostrou as 2 e perguntou (parada legítima)
- [ ] Foto de referência baixada RAW antes da edição (nunca from-scratch com o Eric na imagem)
- [ ] Paleta Expert aplicada (hex do guia, não cores inventadas)
- [ ] Entrega: Read no arquivo + resposta na MESMA sessão, arquivo em pasta temporária
- [ ] Pré-requisitos: SE gh/op ausentes, parou com o comando winget correto (não prosseguiu)

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable, seguindo só o texto) | marketing 2.13.0 (repo) | APROVADO 7/7 + 1 ACHADO corrigido: glob do IMG_SCRIPT pegava a versão mais ANTIGA do cache (2.11.0) — trocado por sort -V. Imagem gerada em 1024x1024, rosto preservado, paleta Expert no telão, escolha de foto determinística sem pergunta |
