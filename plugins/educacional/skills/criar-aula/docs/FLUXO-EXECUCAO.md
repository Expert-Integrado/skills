# FLUXO-EXECUCAO — Ordem das operações + tratamento de erro

Documento embutido na skill `criar-aula`. Define a sequência de passos da skill, condições de aborto, e como recuperar de falhas.

---

## Fluxo principal

### 1. Validação de pré-requisitos
- `op signin` testado — se falhar, aborta com "1Password CLI não logado, rode `op signin` primeiro"
- `VERCEL_TOKEN` carregado do 1P — aborta se falhar
- `CLOUDFLARE_API_TOKEN` carregado do 1P — aborta se falhar
- `pandoc` localizado — aborta se faltar
- `npx vercel --version` funcionando — aborta se faltar

### 2. Resolver nome + slug
- Recebe nome do curso (parâmetro ou interativo)
- Gera slug: kebab-case, sem acentos, sem chars especiais
- Verifica se `<slug>.ericluciano.com.br` está disponível (ou se já existe e Eric quer atualizar)
- Verifica se `Educacional/01_Aulas_e_Palestras/<slug>/` existe (decide criar vs atualizar)

### 3. Criar pasta + reorganizar (se necessário)
- `mkdir -p` da estrutura canônica
- Se pasta existia e tinha arquivos fora do padrão: move pra `_arquivo/<timestamp>/`
- Cria `_versoes-historicas/` em `01_Ementa/`

### 4. Processar insumos de `00_Inputs/`
- Lista arquivos em `audio-transcricoes/`, `video-analises/`, `palestras-fonte/`
- Lê transcrições (.txt, .md, .vtt) e extrai:
  - Temas recorrentes
  - Expressões verbatim do Eric
  - Ferramentas mencionadas (cross-check com stack canônica)
  - Erros/dúvidas que aluno costuma ter
- Lê análises de vídeo (.md) e extrai padrões visuais/timing

### 5. Construir rascunho de ementa
A partir dos insumos:
- Sugere número de aulas (~10-16)
- Agrupa em 4-6 módulos
- Cada aula com 3-7 bullets
- Marca 📋 nos bullets que vão virar prompts copiáveis (cross-check com PADRAO-MATERIAIS.md)

### 6. Refinar interativamente
- Apresenta rascunho ao Eric
- Eric ajusta: "tira aula 7", "muda título da 3", "adiciona bullet em 9"
- Cada ajuste atualiza `Ementa.md` (versão anterior vai pra `_versoes-historicas/`)
- Loop até Eric aprovar

### 7. Gerar arquivos
- `Ementa.md` (já consolidado)
- `Ementa.docx` via pandoc
- `apresentacao.html` (16:9 paleta Midnight) — usa template + dados da ementa
- `materiais/index.html` (prompts copiáveis) — 1 slide por prompt
- `index.html` (cópia da apresentacao pra Vercel root)
- `vercel.json` (cleanUrls)
- `Kit_Gravacao.md` (rascunho — Eric completa depois)
- `setup-preparatorio.md` (checklist)
- `HANDOFF.md` + `SESSAO.md`
- `README.md` (raiz + slides-html/)
- `CLAUDE.md` (regras locais)

### 8. Validar HTML (anti-patterns)
Antes de deploy, skill checa:
- Sem `position: relative` em `.slide.*`
- Sem `<strong style="color: var(--cyan-deep)">` em `.dark`/`.darker`
- Footer com texto único
- `viewport-bg` presente
- Todos os prompts têm tag Direto/Meta

Se algum check falhar: aborta deploy e mostra qual arquivo + linha tem o problema.

### 9. Deploy Vercel
```bash
cd 03_Assets/slides-html
cp apresentacao.html index.html  # sync
npx vercel deploy --prod --yes \
  --scope contato-5574s-projects \
  --token=$VERCEL_TOKEN \
  --name <slug>
```

Captura URL do deploy.

### 10. Adicionar domain ao projeto Vercel
```bash
npx vercel domains add <slug>.ericluciano.com.br <slug> \
  --scope contato-5574s-projects \
  --token=$VERCEL_TOKEN
```

### 11. Criar registro DNS Cloudflare
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/48ff0f4bd2bf17da3f66e4d739b98e2f/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"<slug>","content":"76.76.21.21","ttl":1,"proxied":false}'
```

Captura `record_id` retornado.

### 12. Emitir SSL
```bash
npx vercel certs issue <slug>.ericluciano.com.br \
  --scope contato-5574s-projects \
  --token=$VERCEL_TOKEN
```

### 13. Validar deploy
```bash
sleep 15
curl -s -o /dev/null -w "%{http_code}" "https://<slug>.ericluciano.com.br"
```

Espera HTTP 200. Se 502/503/404 → reporta erro e aguarda.

### 14. Atualizar SESSAO.md
Adiciona entry:
```markdown
## Sessão 2026-MM-DD HH:MM (PC Eric)

- Skill rodou completa
- URL deployed: https://<slug>.ericluciano.com.br
- Vercel deploy id: dpl_xxx
- Cloudflare DNS id: yyy
- Próximas pendências:
  - Eric: gerar suprassumos da empresa-exemplo
  - Eric: testar fluxo dos prompts
  - Eric: gravar dia DD/MM
```

### 15. Salvar nota Brain
```javascript
mcp__expert-brain__save_note({
  title: "Curso <nome> criado via skill criar-aula em <data>",
  tldr: "Pacote completo criado: Ementa, slides HTML, materiais, deploy <url>. <X> aulas em <Y> módulos.",
  body: "...detalhes da execução...",
  domains: ["education"],
  kind: "decision"
});
```

### 16. Edges com notas relacionadas
Se houver curso anterior do mesmo tema: criar edge `same_mechanism_as` ou `refines`.

---

## Recuperação de erro

### Se step 9 (Vercel deploy) falhar
- Causa comum: token expirado → rotaciona via 1P + retry
- Conteúdo malformado: skill reverte estado e mostra erro
- Quota excedida: aborta, avisa Eric

### Se step 11 (Cloudflare DNS) falhar
- Token sem permissão Zone:DNS:Edit: aborta, instrui Eric a rotacionar token
- Subdomain já existe: skill pergunta se sobrescreve
- Zona errada: aborta com mensagem

### Se step 12 (SSL) falhar
- DNS ainda não propagou: skill aguarda 30s e retry (até 3x)
- Vercel não reconhece domain: chama step 10 de novo

### Se step 13 (validação) retornar não-200
- 502/503 (gateway/timeout): aguarda 30s e retry
- 404: deploy não copiou arquivos — verifica `index.html` na raiz, refaz step 9
- Erro de DNS resolução: confirma registro Cloudflare ativo

Skill loga tudo em `<pasta>/SESSAO.md` mesmo em erro — Eric retoma sabendo o que falhou.

---

## Idempotência

Rodar a skill 2x na mesma pasta:
- Não duplica arquivos — sobrescreve com versões mais novas
- Backup do anterior vai pra `_versoes-historicas/<timestamp>/`
- Deploy substitui versão Vercel (mesmo project name)
- DNS: skill detecta se já existe registro e atualiza em vez de criar duplicata

---

## Modo "continuar curso existente"

Eric: "continua aula <slug>"
- Skill lê HANDOFF.md + SESSAO.md
- Recupera contexto (URLs, IDs Brain, decisões anteriores)
- Adiciona nova entry em SESSAO.md ("continuando em <máquina>")
- Pergunta ao Eric o que ele quer fazer agora
- Não regera arquivos sem comando explícito
