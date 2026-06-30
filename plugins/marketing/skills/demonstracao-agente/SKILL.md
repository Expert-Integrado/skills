---
name: demonstracao-agente
description: Orquestra demo ao vivo de uma empresa do zero: imagem gpt-image-2 + carrossel + video HeyGen + site landing completo + jogo + deploy no dominio do Eric. Tudo em paralelo, ~5min. TRIGGER quando Eric pedir "faz um site", "faz uma demonstracao", "monta uma demo", "cria uma empresa de X".
---

Objetivo: receber um tema (empresa ficticia), inventar tudo que faltar, e gerar uma LANDING de empresa de verdade (imagem + carrossel + video + jogo + formulario) em ~5min, no ar no dominio do Eric.

Credenciais (env, fallback 1Password via op read): OPENAI_API_KEY, HEYGEN_API_KEY, ELEVENLABS_API_KEY, VERCEL_TOKEN, CLOUDFLARE_API_TOKEN.

AMBIENTE (agnostico, roda em Windows e Linux): pasta de trabalho WORK=$(mktemp -d), nunca C:/tmp nem /tmp fixo. Foto ref do Eric: repo ericlucianoferreira/agent-assets fotos/eric/eric_avatar_profissional.jpg. Imagem via OpenAI Images API direto por curl, model=gpt-image-2. Detectar binarios com command -v e instalar se faltar.

FLUXO: (1A) 4 imagens gpt-image-2 em paralelo (hero high + c1/c2/c3 medium), size 1536x1024 (3:2), "Preserve his exact face and identity"; (1B) video HeyGen+ElevenLabs em background: TTS eleven_turbo_v2_5 -> upload HeyGen asset com curl --data-binary -H "Content-Type: audio/mpeg" (NAO multipart) -> /v2/video/generate (avatar + voice type=audio + input_text obrigatorio) -> poll -> mp4; (1C) montar index.html.

ESTRUTURA (landing real, nao vitrine): nav -> hero -> barra de numeros -> como funciona -> quem esta por tras (autoridade real do Eric) -> carrossel -> video -> jogo -> formulario -> footer.

ANTI-CARA-DE-IA (regra dura): 1) foto com overlay/gradiente, nunca retrato cru gigante; 2) paleta de UMA cor so; 3) icones SVG de linha, nunca emoji nos cards; 4) copy especifica (numeros, autoridade), nunca generica.

CARROSSEL: 3 imagens, .slide img{width:100%;aspect-ratio:3/2;height:auto;object-fit:cover} -> proporcao travada 3:2 (= das imagens geradas), nunca corta. Setas + dots + autoplay.

JOGO: alvos em chips estilizados (borda+glow+pop), nao emoji solto. Alvo dourado +5; alvo errado -3 (evitar); combo x2 (3+)/x3 (6+) com barra; animacao de hit; ranking no fim.

DEPLOY: npm i --prefix /tmp vercel se command -v nao achar. Deploy: env -u VERCEL_ORG_ID -u VERCEL_PROJECT_ID vercel deploy --prod --yes --token $VTOK --scope contato-5574s-projects --name <slug>. Token SAML expira na VPS headless (pedir novo pro Eric). Desabilitar SSO: PATCH /v9/projects/<id>?teamId=team_EbyYwLAGVLLIYYc9YeFJBlc0 {"ssoProtection":null}. VERIFICAR CONTEUDO (grep do texto + content-type dos assets), nao so HTTP 200 (o nome limpo .vercel.app pode ser de estranho). Entregar o link .vercel.app PRIMEIRO. Dominio proprio <slug>.ericluciano.com.br: anexar no Vercel (POST /v10/projects/<slug>/domains) + CNAME no Cloudflare (zona ericluciano.com.br id 48ff0f4bd2bf17da3f66e4d739b98e2f, name=<slug>, content=cname.vercel-dns.com, proxied:false). SSL leva minutos: confirmar 200 (direto ou via IP --resolve, IP por DoH dns.google) ANTES de anunciar.

QA: Playwright (node) pra screenshot antes de entregar. EXTRA: QR Code (api.qrserver.com) pro instagram.com/ericluciano quando pedir. ENTREGA: URL + print via Telegram. REGRAS: nunca perguntar, inventar tudo; video sempre em background; limpar WORK no fim.

HISTORICO: v3 (18/06/2026) estrutura de landing real + anti-cara-de-IA + carrossel 3:2 + jogo gold/penalidade/combo + deploy robusto + paths agnosticos. Validado em 5 demos: Cano Mestre, EcoRota, NovaFibra, Codeflow, Sapatto Mania.
