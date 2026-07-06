# Golden run — marketing:tweet-print (side-effect: nenhum)

## INVOCAÇÃO (colar numa sessão limpa)

```
/marketing:tweet-print gera um print de tweet com o texto: "Automatizar não é demitir gente. É parar de pagar salário pra tarefa que um robô faz de graça." — destaca "robô" e "de graça"
```

## VALIDAÇÃO

- [ ] NÃO travou pedindo confirmação de autor/tema/formato (defaults assumidos e reportados na entrega)
- [ ] Autor usado = Eric Luciano / @ericluciano (default — o pedido não nomeia outra pessoa)
- [ ] Checagem de Playwright rodou ANTES do pip install (pulou o install se já instalado)
- [ ] PNG gerado, copiado pro $HOME/Downloads, e o caminho reportado é o de Downloads (não o temp)
- [ ] Negritos aplicados nas palavras pedidas ("robô", "de graça")
- [ ] Zero pergunta desnecessária durante a execução

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
