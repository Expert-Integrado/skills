# Biblioteca de componentes de motion (copia-e-cola)

Todos na identidade **dark-azul Expert**. Troque as `--vars` pra outra marca. Fonte: Space Grotesk
(embutir via `@font-face`, ver gotchas). Cada componente = CSS + HTML + entrada GSAP.

## Base (cole no `<style>` de toda composição)
```css
@font-face{font-family:"Space Grotesk";font-weight:300;font-display:block;src:url("assets/fonts/space-grotesk-300.woff2") format("woff2");}
@font-face{font-family:"Space Grotesk";font-weight:400;font-display:block;src:url("assets/fonts/space-grotesk-400.woff2") format("woff2");}
@font-face{font-family:"Space Grotesk";font-weight:500;font-display:block;src:url("assets/fonts/space-grotesk-500.woff2") format("woff2");}
@font-face{font-family:"Space Grotesk";font-weight:700;font-display:block;src:url("assets/fonts/space-grotesk-700.woff2") format("woff2");}
*{margin:0;padding:0;box-sizing:border-box;}
:root{--bg:#070F26;--panel:#0C1733;--accent:#2C6BFF;--accent2:#7FA8FF;--fg:#F2F6FF;--muted:#93A1C4;--amber:#ECC14E;--teal:#23C277;}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);font-family:"Space Grotesk",sans-serif;color:var(--fg);}
/* decorativos ESTATICOS (nunca anime degrade — ver gotchas) */
.glow{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(44,107,255,.30) 0%,rgba(44,107,255,0) 70%);filter:blur(28px);}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.07;background-size:200px 200px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
```

## VÍDEO-BASE + PiP (#stage envolve o vídeo, animável)
```html
<div id="stage" style="position:absolute;top:0;left:0;width:1920px;height:1080px;overflow:hidden;z-index:5;">
  <video id="a-roll" class="clip" src="base.mp4" muted playsinline data-start="0" data-duration="185.6" data-track-index="0"
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>
</div>
<audio id="a-roll-audio" src="base.mp4" data-start="0" data-duration="185.6" data-track-index="2" data-volume="1"></audio>
```
```js
const PiP={top:716,left:1300,width:556,height:312}, FULL={top:0,left:0,width:1920,height:1080};
tl.to("#stage",{...PiP,borderRadius:18,duration:0.9,ease:"power3.inOut"},T);     // encolhe
tl.set("#stage",{boxShadow:"0 18px 50px rgba(0,0,0,.55)",border:"2px solid rgba(127,168,255,.5)"},T+0.9);
// voltar: tl.set("#stage",{...FULL,borderRadius:0,boxShadow:"none",border:"none"},T2);
```
Regra: anime o WRAPPER (#stage), nunca o `<video>`. `object-fit:cover` reenquadra sozinho.

## BRAND MARK (fixo, canto sup. dir.)
```html
<div id="brand" style="position:absolute;top:52px;right:64px;z-index:40;display:flex;align-items:center;gap:14px;font-size:24px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;text-shadow:0 2px 12px rgba(0,0,0,.6);">
  <span style="color:var(--accent2);font-weight:500;letter-spacing:.2em;">Expert Integrado</span><span style="width:9px;height:9px;border-radius:50%;background:var(--accent);"></span></div>
```
`tl.from("#brand",{y:-20,opacity:0,duration:0.6,ease:"power2.out"},0.3);`

## SECTION TAG (rótulo da seção, canto sup. esq.)
```html
<div class="sectag" id="tagX" style="position:absolute;top:54px;left:90px;z-index:30;font-size:22px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent2);display:flex;align-items:center;gap:14px;opacity:0;text-shadow:0 2px 12px rgba(0,0,0,.7);">Mentoria Automações Inteligentes</div>
/* ::before barra: */ .sectag::before{content:"";width:40px;height:2px;background:var(--accent);}
```
`tl.fromTo("#tagX",{opacity:0,x:-20},{opacity:1,x:0,duration:0.5,ease:"power2.out"},T); ... tl.to("#tagX",{opacity:0,duration:0.3},Tout);`

## LOWER-THIRD (nome/cargo na intro)
```html
<div id="lt" style="position:absolute;left:96px;bottom:120px;z-index:30;display:flex;align-items:stretch;gap:22px;">
  <div class="bar" style="width:7px;border-radius:4px;background:var(--accent);"></div>
  <div style="display:flex;flex-direction:column;justify-content:center;">
    <div class="name" style="font-size:62px;font-weight:700;letter-spacing:-.02em;line-height:1;text-shadow:0 3px 16px rgba(0,0,0,.7);">Eric Luciano</div>
    <div class="role" style="font-size:30px;color:var(--accent2);margin-top:12px;text-shadow:0 2px 12px rgba(0,0,0,.7);">Diretor · Expert Integrado</div></div></div>
```
```js
tl.from("#lt .bar",{scaleY:0,transformOrigin:"top",duration:0.5,ease:"power3.out"},0.7);
tl.from("#lt .name",{x:-30,opacity:0,duration:0.6,ease:"power3.out"},0.85);
tl.from("#lt .role",{x:-24,opacity:0,duration:0.5,ease:"power2.out"},1.05);
tl.to("#lt",{opacity:0,y:20,duration:0.5,ease:"power2.in"},Tout);
```

## LISTA LATERAL (dores OU benefícios/checklist — entram um a um)
```html
<div class="rstack" id="dor" style="position:absolute;right:90px;top:300px;z-index:30;display:flex;flex-direction:column;gap:20px;width:600px;">
  <div class="item" id="d1"><span class="dot"></span><span class="tx">Centenas de horas perdidas por mês</span></div>
  <div class="item" id="d2"><span class="dot"></span><span class="tx">Tarefas repetitivas e manuais</span></div>
  <div class="item" id="d3"><span class="dot"></span><span class="tx">Equipe travada na operação</span></div></div>
```
```css
.rstack .item{display:flex;align-items:center;gap:20px;background:rgba(7,15,38,.80);border:1px solid rgba(127,168,255,.20);border-radius:16px;padding:22px 26px;box-shadow:0 10px 30px rgba(0,0,0,.35);}
.rstack .dot{width:18px;height:18px;border-radius:50%;flex:0 0 auto;background:var(--amber);box-shadow:0 0 14px rgba(236,193,78,.6);} /* teal pra positivo */
.rstack .tx{font-size:32px;font-weight:500;letter-spacing:-.01em;}
```
`tl.from("#d1",{x:50,opacity:0,duration:0.55,ease:"power3.out"},T1); ...d2 T2 ...d3 T3; tl.to("#dor",{opacity:0,x:30,duration:0.45,ease:"power2.in"},Tout);`
(Sincronize T1/T2/T3 com as palavras-chave. Dor=amber, benefício/checklist=teal.)

## CARD DE SEÇÃO / STING FULL (cobre a pessoa, mascara o corte)
```html
<div class="full" id="sting2" style="position:absolute;inset:0;z-index:60;background:var(--bg);opacity:0;overflow:hidden;">
  <div class="glow" style="width:1000px;height:1000px;top:-320px;left:-220px;"></div><div class="grain"></div>
  <div class="pad"><div class="kick">Programa · Educação</div><div class="big">Mentoria<br/><em>Automações Inteligentes</em></div></div></div>
```
```css
.full .pad{position:relative;z-index:3;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 150px;}
.kick{font-size:30px;letter-spacing:.3em;text-transform:uppercase;color:var(--accent2);display:flex;align-items:center;gap:18px;}
.kick::before{content:"";width:54px;height:2px;background:var(--accent);}
.big{font-size:120px;font-weight:700;letter-spacing:-.04em;line-height:.98;margin-top:22px;} .big em{color:var(--accent);font-style:normal;}
.sub{font-size:42px;color:var(--muted);margin-top:24px;}
```
```js
tl.to("#sting2",{opacity:1,duration:0.4,ease:"power2.inOut"},T);
tl.from("#sting2 .kick",{y:20,opacity:0,duration:0.5,ease:"power2.out"},T+0.45);
tl.from("#sting2 .big",{y:44,opacity:0,duration:0.6,ease:"expo.out"},T+0.65);
tl.to("#sting2",{opacity:0,duration:0.5,ease:"power2.inOut"},Tout);
```

## CONTADOR (count-up de número)
```html
<div class="full" id="statcard" ...><div class="pad">
  <div class="statnum" style="font-size:240px;font-weight:700;letter-spacing:-.05em;line-height:.9;color:var(--accent);"><span id="statnum">0</span><span style="color:var(--accent2);">+</span></div>
  <div class="sub">aulas gravadas na área de membros</div></div></div>
```
```js
const ctr={v:0};
tl.to(ctr,{v:300,duration:1.5,ease:"power2.out",onUpdate:()=>{document.getElementById("statnum").textContent=Math.round(ctr.v);}},T);
```
(Determinístico e seek-safe. Comece o texto em "0".)

## PILARES / GRID DE CARDS (full motion enquanto a pessoa fica em PiP)
```html
<div id="pillars" style="position:absolute;top:300px;left:104px;display:flex;gap:36px;">
  <div class="pcard" id="p1"><div class="ic">{SVG}</div><div class="ct">Softwares</div><div class="cd">Ferramentas próprias...</div></div> ...</div>
```
```css
.pcard{width:452px;background:var(--panel);border:1px solid rgba(127,168,255,.18);border-radius:22px;padding:42px 40px;}
.pcard .ic{width:64px;height:64px;border-radius:16px;background:rgba(44,107,255,.16);border:1px solid rgba(44,107,255,.5);display:flex;align-items:center;justify-content:center;margin-bottom:26px;}
.pcard .ic svg{width:34px;height:34px;stroke:var(--accent2);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.pcard .ct{font-size:46px;font-weight:700;letter-spacing:-.02em;} .pcard .cd{font-size:24px;color:var(--muted);margin-top:12px;line-height:1.35;}
```
`tl.from("#p1",{y:50,opacity:0,duration:0.55,ease:"expo.out"},T1); ...` (um por palavra). **Ícones = SVG de linha, NUNCA emoji** (emoji fica cartoon).
SVGs prontos: code `<polyline points="8 7 4 12 8 17"/><polyline points="16 7 20 12 16 17"/>` · cap `<path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11v5c0 1 2 2 5 2s5-1 5-2v-5"/>` · bússola `<circle cx="12" cy="12" r="9"/><polygon points="16 8 13.5 13.5 8 16 10.5 10.5 16 8"/>`

## CHIP CALLOUT (uma frase de destaque)
```html
<div class="chip-cta" id="c" style="position:absolute;left:96px;bottom:130px;z-index:30;opacity:0;display:inline-flex;align-items:center;gap:16px;background:rgba(44,107,255,.16);border:1px solid rgba(44,107,255,.5);border-radius:999px;padding:18px 32px;font-size:34px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.4);"><span class="c" style="width:14px;height:14px;border-radius:50%;background:var(--accent2);"></span>Agentes de IA sob medida</div>
```
`tl.fromTo("#c",{opacity:0,y:20},{opacity:1,y:0,duration:0.5,ease:"back.out(1.4)"},T); tl.to("#c",{opacity:0,y:16,duration:0.4,ease:"power2.in"},Tout);`

## CHIPS DE ÁREA (acendem em sequência sobre o vídeo)
```html
<div id="areas" style="position:absolute;left:104px;bottom:110px;z-index:30;display:flex;gap:20px;">
  <div class="achip" id="a1">Marketing</div><div class="achip" id="a2">Operações</div> ...</div>
```
```css
.achip{font-size:30px;font-weight:600;padding:18px 30px;border-radius:14px;background:rgba(7,15,38,.82);border:1px solid rgba(127,168,255,.22);color:var(--muted);box-shadow:0 8px 24px rgba(0,0,0,.4);}
```
```js
tl.from("#a1",{y:20,opacity:0,duration:0.4,ease:"back.out(1.6)"},T1);
tl.to("#a1",{color:"#F2F6FF",borderColor:"rgba(44,107,255,.7)",backgroundColor:"rgba(44,107,255,.18)",duration:0.3},T1+0.1); // acende
```

## END CARD (CTA final)
```html
<div class="full" id="endcard" ...><div class="pad">
  <div class="kick">Expert Integrado</div>
  <div class="big">Agende sua <em>sessão diagnóstica</em></div>
  <div class="sub" style="color:var(--teal)">Gratuita — o primeiro passo da sua transformação.</div>
  <div style="margin-top:54px;display:flex;align-items:center;gap:20px;font-size:26px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)"><b style="color:var(--fg)">Mentoria</b><span>•</span><b style="color:var(--fg)">AI Innovation Lab</b><span>•</span>@expertintegrado</div>
</div></div>
```
Entrada igual ao sting. Estenda a composição ~2-3s além do fim da fala pro end card respirar (o vídeo acaba antes, o card cobre).
