# Golden run — marketing:criar-script (sem side-effect externo, sem custo)

## INVOCAÇÃO (colar numa sessão limpa)

```
/marketing:criar-script roteiriza a PAUTA 1 da pauta da semana pra eu gravar — meu voice guide está em <arquivo>
```

Cenário canônico: emenda da /pauta-semanal (Passo 5.4 de lá oferece exatamente isso). Briefing inicial já completo: objetivo (conteúdo orgânico, vem da pauta), plataforma (Reel/Instagram), voice guide (apontado), assunto com dados reais (da pauta). Skill NÃO deve repetir perguntas já respondidas.

## VALIDAÇÃO

- [ ] Referência `reference/boas-praticas-roteiro.md` lida ANTES de decidir framework/hook/formato (resolvida da pasta da skill, não do cwd)
- [ ] Briefing: não repetiu pergunta já respondida no pedido; duração não travou (default da plataforma sinalizado)
- [ ] Roteiro na voz do voice guide (não genérico, não "cara de IA")
- [ ] Formato literal do bloco de roteiro (HOOK/CORPO/CTA + texto-na-tela + direção)
- [ ] Conteúdo orgânico → 2-3 opções de hook; CTA ÚNICO de plataforma (nunca "clica no link")
- [ ] Nenhum número inventado: só os da pauta/pesquisa; o que faltar vira `[preencher: ...]`
- [ ] Entrega: roteiros na conversa + salvar oferecido/salvo em `scripts/<AAAA-MM-DD>_<produto>_<plataforma>.md` (path relativo)
- [ ] Densidade ~60 palavras/20s respeitada; acentuação correta

## HISTÓRICO DE RUNS

| data | máquina | versão plugin | resultado |
|---|---|---|---|
| 06/07/2026 | PC (executor Fable) | marketing 2.13.0 | APROVADO 8/8. Zero defeito na skill: referência resolveu da pasta da skill, briefing não repetiu pergunta respondida, default de duração sinalizado, 3 hooks, CTA único, nenhum número inventado, salvo em scripts/. 1 achado LATERAL (fora da skill): CLAUDE.md global apontava voice guide pra memory eric-voice.md inexistente — corrigido pra get_voice_guide (~/.claude/voice-guide.md). Run real: roteiro da PAUTA 1 (Meta Glasses) entregue |
