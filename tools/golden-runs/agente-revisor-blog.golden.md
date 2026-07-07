# Golden run — marketing:agente-revisor-blog

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** revisão do draft REAL produzido pelo golden run do agente-draft-blog (`atendimento-whatsapp-fora-horario-comercial`, 1.529 palavras, com 2 `[preencher]` propositais). Encadeamento real do pipeline draft -> revisor.
- **Resultado: APROVADO.** As 4 dimensões pontuadas, a fórmula 7.2, a média ponderada, o gate de segurança (Camadas 1+2) e a ordem de decisão do veredicto rodaram como especificado, e o override de placeholder segurou o draft — exatamente o comportamento desenhado do pipeline.

## Relatório emitido (resumo do template do Passo 8)

| Dimensão | Score | Status |
|---|---|---|
| Voz | 10.0/10 | OK |
| Factualidade | 2.5/10 | FALHA |
| GEO/SEO | 10.0/10 | OK |
| UX Mobile | 10.0/10 | OK |
| Segurança | VERDE | gate |
| Média | 8.1/10 | RETRABALHO MAIOR (override: placeholder) |

Violações: (1) placeholder `[preencher]` na fatia de leads fora do expediente (GRAVE, bloqueadora — humano preenche); (2) placeholder `[preencher]` no custo do plantão humano (GRAVE, bloqueadora); (3) claim "menos de 17% de abandono" sem fonte nomeada inline no FAQ (GRAVE — patch aplicado depois no papel de draft: fonte nomeada no texto). Scanner Camada 1: VERMELHO 0, amarelo 0, exit 0 (arquivo copiado temporariamente pro repo pra exercitar o scanner e removido em seguida).

## Achados e fixes (marketing 2.13.5)

1. **Template de relatório exigia dingbats de status (DEFEITO, SKILL.md).** A tabela do Passo 8 pedia ✓/⚠/✗ — o relatório é resposta de chat pro Eric e o hook Stop de zero-emoji BLOQUEIA a resposta inteira (dingbats de status inclusos). Binding skill-máquina clássico. Fix: status em texto (OK / ALERTA / FALHA) + regra explícita no checklist.
2. **Claim de ambiente desatualizada (doc).** "no PC do Eric não há python no PATH" — o 3.14 da Store entrou no PATH (mesmo drift do run cortar-respiros). Inócuo aqui (o scanner é stdlib), mas a doc agora reflete a realidade.

## Observações (não-defeito)

- O override de placeholder forçando RETRABALHO MAIOR mesmo com média 8.1 é o contrato certo: o publisher só aceita APROVADO/RETRABALHO MENOR, então dado interno pendente nunca publica sozinho.
- O repo do blog tem `docs/log-aprovacoes.md` modificado no working tree (pré-existente, não é deste run — não tocado).
- Adaptação de harness registrada: o MDX estava em C:/tmp (não no repo), caminho "colado" da skill; a cópia temporária pro repo foi só pra exercitar a Camada 1, removida em seguida.
