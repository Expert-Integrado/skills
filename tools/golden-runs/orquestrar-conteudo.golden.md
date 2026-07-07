# Golden run — marketing:orquestrar-conteudo

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** pipeline `instagram` completo via Workflow gate — carrossel de TEXTO (5 slides, fundos CSS, sem fotos) pro @ericluciano, tema "leads fora do horário comercial" (derivado do post #101 do blog). Fase 0 real: brand-kit `ericluciano.md` carregado, briefing.json validado em `C:/tmp/conteudo/leads-fora-do-horario/`. Pedido roteirizado do diretor; perfil @ericluciano escolhido porque o gate é hardcoded pra ele (PENDENTE-SCRIPT).
- **Classificação: B-custo mínimo:** carrossel de texto = zero imagem gerada, zero Vercel; só subagentes (assinatura).
- **Resultado: APROVADO.** Gate retornou `{status:"aprovado", score:8, tries:2, exported:5}` — o loop de retry FUNCIONOU em produção (1ª copy reprovada pelo Revisor, re-gerada com feedback, aprovada na 2ª). 5 PNGs 1080×1080 com tamanhos variados (443-587KB, dentro da régua 300KB-1MB), 0 tokens `{{` no carrossel-final.html, capa validada visualmente (navy #0B1220 + ciano, acentuação correta, @ericluciano + n/5 discretos, sem emoji). Entrega em `G:/Meu Drive/claude-workspace/Workspace/temp/leads-fora-do-horario/` (5 PNGs + legenda.md 781 chars + index.html da galeria).

## Achados e fixes (marketing 2.13.17)

1. **Snippet de resolução do `$GATE` pegava a versão MAIS VELHA do cache (DEFEITO, reproduzido).** `ls -1 ... | head -1` com múltiplas versões no cache (2.11.0 e 2.13.0 presentes) devolveu 2.11.0 — cujo export interno usa `python` cru (inexistente no PATH deste PC) e o path morto do OneDrive; o export teria falhado. Fix: `sort -V | tail -1` (maior versão ganha; em máquina de dev com `C:/repos`, o repo ordena por último e ganha) + comentário explicando.
2. **`WORKSPACE_DIR` default apontava pro OneDrive MORTO (DEFEITO).** A skill mandava PNGs pra `~/OneDrive/Workspace/temp` — arquivo morto desde a migração de 05/07/2026 pro Google Drive (escrever lá viola a regra do workspace). Fix: default `G:/Meu Drive/claude-workspace/Workspace` na linha de Pré-requisitos E no snippet Python do protocolo de export.
3. **Workflow tool rejeita o `scriptPath` do cache com CRLF (DEFEITO de ambiente, reproduzido).** O `.mjs` no cache vem com CRLF (checkout Windows) e o handler de permissão rejeita ("script contains control characters"). Fix documentado na recovery: `tr -d '\r'` pra cópia em `C:/tmp` e usar a cópia no scriptPath.
4. **PENDENTE-SCRIPT desatualizado (DEFEITO documental).** Itens 2 (python cru) e 3 (OneDrive hardcode) do PENDENTE-SCRIPT JÁ estavam corrigidos no script 2.13.0 (detecção `$PY`, outBase no G:, args extras `conteudoDir`/`outDir`/`port`); só o item 1 (marca @ericluciano hardcoded nos prompts) permanece. Fix: seção reescrita refletindo o estado real.

## Observações (não-defeito)

- **Falha intermitente de subagente em produção:** 1ª execução do gate morreu com "organization has disabled Claude subscription access" no Designer (Copywriter completou) — o limite de sessão conhecido (task Brain 578lpaduvibi). O resume via `resumeFromRunId` reaproveitou o Copywriter do cache e só re-rodou o resto: recuperação limpa, sem custo duplicado. Padrão recomendável quando o gate morrer no meio.
- **O gate de qualidade fez o trabalho:** score <7 na 1ª copy → re-geração automática com o feedback do Revisor → aprovado com 8 na 2ª. Nenhuma intervenção manual.
- `preview_start` não existe nesta sessão (VSCode) → rota headless da skill seguida (galeria copiada como index.html + path apontado; sem server).
- Curadoria antes de postar: o Copywriter do gate escreveu storytelling em 1ª pessoa ("meu funil trabalhava 8 horas por dia, descobri isso olhando...") — plausível mas não verificado como fato do Eric; a entrega é PNG+legenda pro Eric revisar antes de postar (gate humano final), mas vale atenção na revisão.
- Os 3 hardcodes de identidade do gate (marca @ericluciano) continuam — pra outro perfil, fallback manual (já documentado).
