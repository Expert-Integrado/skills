# Golden runs — validação REAL das skills (o que a simulação não pega)

A otimização de 07/2026 validou as 52 skills por SIMULAÇÃO (teste de executabilidade: um
modelo lê só a skill e narra a execução). Isso pega lacuna de texto, mas não pega schema
real de tool, prompt de permissão, comportamento de script nem estado de credencial —
o bug do scanner do blog (aprovava sem escanear) só caiu porque um verificador leu o
código-fonte.

**Golden run** = 1 cenário canônico por skill crítica, executado DE VERDADE a cada
versão nova da skill, com side-effects controlados.

## Como rodar um cenário

1. Abrir sessão limpa do Claude Code na máquina alvo.
2. Colar o bloco INVOCAÇÃO do cenário (arquivo `*.golden.md` desta pasta), exatamente como está.
3. Deixar executar até o fim (ou até a parada legítima esperada).
4. Conferir cada item do bloco VALIDAÇÃO. Qualquer desvio = abrir correção na skill
   (fix cirúrgico), nunca "deixar passar".
5. Registrar no rodapé do cenário: data, máquina, versão do plugin, resultado.

## Regras

- Começar pelos cenários de MENOR side-effect (tweet-print é local puro; imagem gasta
  ~1 chamada de API; pauta-semanal gasta ~US$0,10 de Apify).
- Cenário NUNCA dispara side-effect externo irreversível (WhatsApp real, deploy de prod,
  mutação de CRM em deal real). Skills com side-effect usam alvo de teste declarado no
  cenário ou param na confirmação (a parada É o resultado esperado).
- Rodar após qualquer mudança na skill, no script dela ou no MCP que ela usa; e 1x/mês
  nas críticas mesmo sem mudança (pega drift de API externa).

## Cenários (crescer conforme a rotina pegar)

| cenário | skill | side-effect | custo |
|---|---|---|---|
| tweet-print.golden.md | marketing:tweet-print | nenhum (PNG local) | zero |
| imagem.golden.md | marketing:imagem | 1 imagem gpt-image-2 | ~US$0,02 |
| pauta-semanal.golden.md | marketing:pauta-semanal | run Apify | ~US$0,10-0,15 |
