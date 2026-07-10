#!/usr/bin/env bash
# deploy.sh — Vercel + Cloudflare + SSL pra subdomínio <slug>.ericluciano.com.br
# uso: ./deploy.sh <slug> <pasta-do-curso>

set -euo pipefail

SLUG="$1"
PASTA="$2"
SLIDES_DIR="$PASTA/03_Assets/slides-html"

# Carrega tokens do 1Password
VERCEL_TOKEN=$(op read "op://Agentes Eric/VERCEL_API_TOKEN/credential")  # item no 1P chama-se VERCEL_API_TOKEN (a env var é VERCEL_TOKEN)
CLOUDFLARE_API_TOKEN=$(op read "op://Agentes Eric/CLOUDFLARE_API_TOKEN/credential")
ZONE_ID="48ff0f4bd2bf17da3f66e4d739b98e2f"  # ericluciano.com.br

echo "🚀 Deploy de $SLUG.ericluciano.com.br"

# 1. Sync index.html
cd "$SLIDES_DIR"
cp apresentacao.html index.html
echo "  ✓ index.html sincronizado"

# 2. Deploy Vercel
echo "  ▶ Vercel deploy..."
DEPLOY_OUTPUT=$(npx vercel deploy --prod --yes \
  --scope contato-5574s-projects \
  --token="$VERCEL_TOKEN" \
  --name "$SLUG" 2>&1)
echo "  ✓ Deploy concluído"

# 3. Adicionar domain ao projeto (se ainda não)
echo "  ▶ Adicionando domain..."
npx vercel domains add "$SLUG.ericluciano.com.br" "$SLUG" \
  --scope contato-5574s-projects \
  --token="$VERCEL_TOKEN" 2>&1 | tail -3 || echo "  (já adicionado)"

# 4. Criar DNS A no Cloudflare (se ainda não existe)
echo "  ▶ Criando registro DNS..."
DNS_CHECK=$(curl -s --ssl-no-revoke -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$SLUG.ericluciano.com.br" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const r=JSON.parse(d); console.log(r.result.length)})")

if [ "$DNS_CHECK" = "0" ]; then
  curl -s --ssl-no-revoke -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$SLUG\",\"content\":\"76.76.21.21\",\"ttl\":1,\"proxied\":false,\"comment\":\"Vercel - $SLUG (criado por skill criar-aula)\"}" \
    > /dev/null
  echo "  ✓ DNS criado"
else
  echo "  ✓ DNS já existe"
fi

# 5. Emitir SSL
echo "  ▶ Emitindo SSL..."
npx vercel certs issue "$SLUG.ericluciano.com.br" \
  --scope contato-5574s-projects \
  --token="$VERCEL_TOKEN" 2>&1 | tail -3

# 6. Validar HTTPS
echo "  ▶ Aguardando propagação..."
sleep 15
HTTP_CODE=$(curl -s --ssl-no-revoke -o /dev/null -w "%{http_code}" "https://$SLUG.ericluciano.com.br")
echo "  ✓ HTTPS = $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ Deploy completo!"
  echo "📋 URL: https://$SLUG.ericluciano.com.br"
  echo "📋 Materiais: https://$SLUG.ericluciano.com.br/materiais"
else
  echo "⚠️  HTTP $HTTP_CODE — pode precisar aguardar mais propagação"
fi
