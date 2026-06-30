export const meta = {
  name: 'carrossel-ig-gate',
  description: 'Pipeline de carrossel de Instagram com gate de qualidade DURO (score>=7) e retry automatico de copy',
  phases: [
    { title: 'Producao', detail: 'Copywriter ∥ Designer (paralelo)' },
    { title: 'Revisao+Gate', detail: 'Revisor pontua; score<7 re-gera a copy com feedback (max N)' },
    { title: 'Export', detail: 'so executa quando score>=7' },
  ],
}

// args esperado: { slug, briefingPath, nSlides?, maxTries? }
const slug = args.slug
const brief = args.briefingPath
const N = args.nSlides || 5
const MIN_SCORE = 7
const MAX_TRIES = args.maxTries || 3
const ws = `C:/tmp/conteudo/${slug}`

const COPY_SCHEMA = { type:'object', required:['status','caption','hashtags','slides'], properties:{
  status:{type:'string'}, caption:{type:'string'}, hashtags:{type:'string'},
  slides:{type:'array', items:{type:'object', required:['n','title','body'], properties:{
    n:{type:'integer'}, title:{type:'string'}, body:{type:'string'} }}} } }

const DESIGN_SCHEMA = { type:'object', required:['status','html_path'], properties:{
  status:{type:'string'}, html_path:{type:'string'}, tokens_used:{type:'array', items:{type:'string'}} } }

const VERDICT_SCHEMA = { type:'object', required:['score','status','checklist'], properties:{
  score:{type:'integer', minimum:1, maximum:10},
  status:{type:'string'},
  checklist:{type:'object'},
  problemas:{type:'array', items:{type:'string'}},
  observacoes:{type:'string'} } }

function copywriterPrompt(feedback){
  return `Voce e o Copywriter de um carrossel de Instagram do @ericluciano. Leia o briefing em ${brief}.
Escreva a copy de ${N} slides + a legenda, na voz do Eric (1a pessoa, direto, frases curtas). ACENTUACAO CORRETA do portugues obrigatoria em TUDO. ZERO buzzword (revolucionario, game-changer, transformador, disruptivo, mindset, hype). SEM emoji. Titulo de slide curto e forte (nao frase inteira); corpo enxuto, 1 ideia por slide. Slide 1 = capa/gancho, ultimo = CTA.
${feedback ? 'ATENCAO — ajustes do Revisor a corrigir NESTA versao: ' + feedback : ''}
Escreva o arquivo ${ws}/copywriter-output.json (escrita atomica: .tmp -> rename) no schema {status, caption, hashtags, slides:[{n,title,body}]}. Retorne SOMENTE esse JSON.`
}

function designerPrompt(){
  return `Voce e o Designer. Leia ${brief}. Construa ${ws}/carrossel.html: ${N} <section id="slide-1"..."slide-${N}"> de 1080x1080 empilhadas, fundos SOMENTE em CSS (navy #0B1220 -> #10243F + glow ciano #2BB7E0, texto branco, SEM emoji, SEM dourado), headline sans bold caixa alta, layouts variados entre os slides. Use TOKENS literais {{SLIDEn_TITLE}} e {{SLIDEn_BODY}} (cada um em elemento separado) no lugar do texto — NAO escreva a copy final. CSS obrigatorio: html{scrollbar-width:none} html::-webkit-scrollbar{display:none} body{margin:0;padding:0}; slides sem gap. Numeracao n/${N} e @ericluciano discretos em cada slide. Escrita atomica. Retorne SOMENTE {status, html_path, tokens_used}.`
}

function revisorPrompt(){
  return `Voce e o Revisor editorial. Leia ${ws}/carrossel-final.html e ${ws}/copywriter-output.json e rode o checklist.
TOM (bloqueante): acentuacao correta em TUDO; 1a pessoa direto; zero buzzword; sem emoji.
CONTEUDO (bloqueante): todo claim/numero tem fonte ou e experiencia real declarada; sem urgencia manufaturada; CTA unico e especifico; hook da capa para o scroll.
VISUAL: 0 tokens {{ sobrando; brand-kit respeitado (navy + ciano, texto branco, sem dourado).
Qualquer item bloqueante violado => score < 7 (independente do resto). NAO edite o arquivo aqui — se reprovar, o gate re-gera a copy com seus 'problemas'. Liste os ajustes concretos em 'problemas'. Retorne SOMENTE {score (1-10), status, checklist:{tom,conteudo,visual}, problemas:[...], observacoes}.`
}

// ---------- Fase 1: producao paralela ----------
phase('Producao')
let [copy, design] = await parallel([
  () => agent(copywriterPrompt(''), { label:'copywriter', phase:'Producao', schema:COPY_SCHEMA }),
  () => agent(designerPrompt(),     { label:'designer',   phase:'Producao', schema:DESIGN_SCHEMA }),
])
if (!copy || !design) return { status:'erro', message:'Copywriter ou Designer falhou na producao' }

// ---------- Fase 2: revisao + GATE DURO com retry ----------
phase('Revisao+Gate')
let verdict = null, tries = 0
while (tries < MAX_TRIES) {
  tries++
  // montagem deterministica: injeta a copy nos tokens
  await agent(
    `Rode SOMENTE este Python (montagem do carrossel — injeta a copy nos tokens):
\`\`\`bash
cd "${ws}" && python - << 'PY'
import json
copy=json.load(open("copywriter-output.json",encoding="utf-8"))
html=open("carrossel.html",encoding="utf-8").read()
esc=lambda s:s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
for s in copy["slides"]:
    html=html.replace("{{SLIDE%d_TITLE}}"%s["n"],esc(s["title"]))
    b=esc(s["body"]).replace(chr(10)+chr(10),"<br><br>").replace(chr(10),"<br>")
    html=html.replace("{{SLIDE%d_BODY}}"%s["n"],b)
open("carrossel-final.html","w",encoding="utf-8").write(html)
print("LEFT", html.count("{{"))
PY
\`\`\`
Retorne SOMENTE {"left": <numero de {{ restantes>}.`,
    { label:`montagem#${tries}`, phase:'Revisao+Gate', schema:{ type:'object', required:['left'], properties:{ left:{type:'integer'} } } }
  )
  verdict = await agent(revisorPrompt(), { label:`revisor#${tries}`, phase:'Revisao+Gate', schema:VERDICT_SCHEMA, model:'haiku' })
  log(`Tentativa ${tries}/${MAX_TRIES}: Revisor deu score ${verdict?.score} (${verdict?.status})`)
  if (verdict && verdict.score >= MIN_SCORE) break
  if (tries >= MAX_TRIES) break
  const fb = [verdict?.observacoes, ...((verdict?.problemas)||[])].filter(Boolean).join(' | ')
  log(`Reprovado (score ${verdict?.score}) — re-gerando copy com feedback`)
  copy = await agent(copywriterPrompt(fb), { label:`copywriter-retry#${tries}`, phase:'Revisao+Gate', schema:COPY_SCHEMA })
}

// GATE DURO: o export so e alcancado se score>=7. Senao, retorna reprovado SEM exportar.
if (!verdict || verdict.score < MIN_SCORE) {
  return { status:'reprovado', score: verdict?.score ?? null, tries,
           message:`Nao atingiu score ${MIN_SCORE} em ${MAX_TRIES} tentativas — export BLOQUEADO. Revisar briefing/voz.` }
}

// ---------- Fase 3: export (so com score>=7) ----------
phase('Export')
const exp = await agent(
  `Exporte os ${N} slides do carrossel em PNG. Rode no MESMO bash call (servidor http + python playwright, processos nao persistem entre calls):
\`\`\`bash
cd "${ws}" && python -m http.server 8911 --bind 127.0.0.1 &
SRV=$!; sleep 2
python - << 'PY'
import asyncio,os
from playwright.async_api import async_playwright
OUT=os.path.expanduser("~/OneDrive/Workspace/temp/${slug}"); os.makedirs(OUT,exist_ok=True)
async def go():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    c=await b.new_context(viewport={"width":1080,"height":1080},device_scale_factor=1)
    pg=await c.new_page(); await pg.goto("http://127.0.0.1:8911/carrossel-final.html")
    await pg.add_style_tag(content="body{padding:0!important;gap:0!important} html,body{scrollbar-width:none!important;overflow-x:hidden!important} html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}")
    await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(1500)
    for i in range(1,${N}+1):
      await pg.locator(f"#slide-{i}").screenshot(path=f"{OUT}/slide-{i}.png",type="png")
    await b.close()
asyncio.run(go())
PY
kill $SRV 2>/dev/null; ls -la "$HOME/OneDrive/Workspace/temp/${slug}"
\`\`\`
Confira que cada PNG tem tamanho variado (300KB-1MB; iguais = falha de render). Retorne SOMENTE {"exported": <n de PNGs gerados>, "dir": "~/OneDrive/Workspace/temp/${slug}"}.`,
  { label:'export', phase:'Export', schema:{ type:'object', required:['exported'], properties:{ exported:{type:'integer'}, dir:{type:'string'} } } }
)

return { status:'aprovado', score: verdict.score, tries, slides:N,
         exported: exp?.exported ?? null, out_dir:`~/OneDrive/Workspace/temp/${slug}`,
         caption_file:`${ws}/copywriter-output.json` }
