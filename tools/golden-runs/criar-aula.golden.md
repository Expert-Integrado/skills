# Golden run — lab:criar-aula (ramo TESTE sem side-effect; ramo DEPLOY é classe C)

## INVOCAÇÃO (colar numa sessão limpa)

```
/criar-aula cria um curso de teste sobre <tema>, destino teste/rascunho, gravação <data>, paleta scale, multi-aula com 4 aulas
```

Ramo DEPLOY (classe C — deploy Vercel + DNS): validar só com pedido real do Eric de curso novo; o ramo teste cobre todo o resto do pipeline.

## VALIDAÇÃO

- [ ] Pré-requisitos checados (op, npx, pandoc, ffmpeg, pasta EDU no Google Drive)
- [ ] Briefing pré-respondido no pedido NÃO dispara AskUserQuestion (eco em 1 linha)
- [ ] scripts/slug.sh roda e translitera acentos corretamente (sem iconv)
- [ ] 5 docs da skill lidos antes de gerar; estrutura de pastas canônica criada
- [ ] Ementa no padrão (aulas ~10min, 1 micro-conceito, entregável por aula, fio condutor único, 📋 nos prompts)
- [ ] apresentacao.html + materiais/index.html com a MESMA paleta, CSS/JS do template
- [ ] 5 checks anti-pattern rodados de verdade e verdes (greps literais da skill)
- [ ] Ementa.docx gerado via scripts/pandoc-docx.sh
- [ ] Destino teste: deploy/DNS PULADOS + nota Brain PULADA
- [ ] SESSAO.md com entry da execução

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | lab 3.10.1 | APROVADO (ramo TESTE ponta-a-ponta) com 7 ACHADOS corrigidos: (1) slug.sh morria com exit 127 em TODA execução — iconv não existe no Git Bash (provável causa do erro da telemetria); (2) fix inicial com bracket expression corrompia multibyte — refeito com sed literal; (3) deploy.sh sem --ssl-no-revoke nos 3 curl; (4) pandoc-docx.sh com path chumbado de usuário + tmp desnecessário; (5) sessao.template.md com path OneDrive morto e diretório errado; (6) handoff.template.md instruía OneDrive (migrado pra Google Drive 05/07); (7) skill mandava salvar nota Brain mesmo em curso de teste (poluiria o vault) — agora pula. Artefato de inspeção: pasta _golden-run-agentes-de-ia-no-whatsapp em 04_Cursos_G4_Gravados (29 arquivos, descartável). Ramo DEPLOY não exercitado (classe C) |
