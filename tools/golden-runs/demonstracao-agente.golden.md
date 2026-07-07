# Golden run — marketing:demonstracao-agente

- **Data:** 07/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** demo REAL ponta a ponta do zero — empresa fictícia "Oficina Torque" (diagnóstico automotivo transparente), slug `oficina-torque`, tudo inventado no passo 1 como manda a skill (números: 12.400 diagnósticos, 27 min, 38% economia, 4,9/5; preço R$ 149 inline). Vídeo disparado PRIMEIRO em background (segundo 0), 4 imagens gpt-image-2 em paralelo, landing com as 10 seções na ordem (nav→hero→números→como funciona→fundador→carrossel→vídeo→jogo→formulário→footer), deploy Vercel + domínio próprio.
- **Classificação: B-custo:** 1 hero HIGH + 3 medium gpt-image-2 (~US$0,70) + TTS ElevenLabs 94 palavras + HeyGen 720p ~40s ≈ **R$8-10**.
- **Resultado: APROVADO.** NO AR e validado por conteúdo: `https://oficina-torque.vercel.app` (200, grep "Torque"=7, hero.png image/png, video-eric.mp4 4,5MB video/mp4, SSO off) e domínio próprio `https://oficina-torque.ericluciano.com.br` (200+grep em 5 tentativas ≈ 75s; CNAME criado, domínio `verified:true` direto — a zona já era conhecida do team). Pipeline de vídeo funcionou de primeira: TTS→upload binário→generate→poll, video.done em ~3 min. Print de QA visual aprovado (hero com overlay, headline acentuada, preço inline, CTA).

## Achados e fixes (marketing 2.13.17)

1. **`-F "image[]=@$WORK/eric.jpg"` falha no Windows/Git Bash (DEFEITO CRÍTICO, reproduzido 4/4).** Path POSIX (`/tmp/...`) embutido no `@` de um `-F` NÃO é convertido pelo MSYS — curl exit 26 com stdout VAZIO, e as 4 imagens saíram 0 bytes (o node quebrava com "Unexpected end of JSON input"). Mesmo gotcha do upload HeyGen já conhecido. Fix: `FOTO=$(cygpath -m ...)` antes do `-F` + linha nova na recovery (exit 26).
2. **Scope/teamId da Vercel HARDCODED e defasado (DEFEITO CRÍTICO, reproduzido).** A skill cravava `--scope expert-integrados-projects` e `teamId=team_UAgnWON7...` — o token `Token_Vercel_Produto_Claude_Eric` hoje só acessa `contato-5574s-projects` (team_EbyYwLAGVLLIYYc9YeFJBlc0): deploy morria com "The specified scope does not exist"; e SEM `--scope` a CLI não-interativa retorna `action_required: missing_scope` sem deployar nada. Fix: passo 6 resolve team em runtime (`GET /v2/teams` com o token) e usa `$TEAM_SLUG`/`$TEAM_ID` em deploy, SSO PATCH e domains (passo 7); 2 linhas novas na recovery.
3. **`npm i --prefix "$WORK/cli" vercel` + `.bin/vercel` deu exit 127 (DEFEITO, reproduzido).** O shim local não executou no Git Bash. Fix: `npx --yes vercel@latest` (rota validada 2x em produção hoje, também no publisher do blog).

## Observações (não-defeito)

- **TTS lê "vc" como "você" corretamente** — transcrição faster-whisper do fala.mp3 confirmou ("Se você já levou o carro..."); o checklist de voz da skill funciona pra fala TTS sem precisar expandir a abreviação. Todos os números sobreviveram no áudio (27 minutos, 12 mil, 38%).
- Recovery de avatar embutida no video.sh não precisou disparar (avatar_id principal válido); poll v1 funcionou sem cair pro v2.
- Playwright do node não instalado no PC → print da skill pulado (rota documentada); QA visual feito com Python Playwright fora da skill.
- `rm -rf "$WORK"` do passo 8 foi NEGADO pelo permission handler (política anti rm -rf). O workdir era `mktemp -d` no Temp do Windows — fica pro GC do SO. Possível ajuste futuro: limpeza por `find -delete` ou aceitar o Temp como descartável.
- Domínio verificou `verified:true` sem o fluxo TXT do passo 7c (zona já validada no team) — o fluxo TXT permanece correto pra 1ª vez de um team novo.
- Mensagens 1/2 da entrega: pedido não veio por Telegram → entregues no chat (relatório do run).
