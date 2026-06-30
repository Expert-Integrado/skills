# Extrair identidade visual (de uma landing page)

Se o usuário passar uma URL (landing do produto/marca), extraia paleta + conteúdo com Playwright (MCP `playwright`)
e use no motion — fica fiel à marca.

## Pegar cores + conteúdo
```js
// mcp playwright: browser_navigate(URL) depois browser_evaluate:
() => {
  const colors = new Set();
  document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor].forEach(c => { if (c && c !== 'rgba(0, 0, 0, 0)') colors.add(c); }); });
  // se for deck/slides, pegue o texto de cada section:
  const slides = [...document.querySelectorAll('section,.slide,[class*="slide"],article')]
    .map(el => el.innerText.trim()).filter(Boolean);
  return { title: document.title, colors: [...colors].slice(0,24), slides };
}
```
Tire um screenshot também (`browser_take_screenshot`) pra ver a vibe (tipografia, imagens, clima).

## Montar a paleta (`--vars`)
Identifique: **bg** (cor mais escura/clara dominante), **accent** (cor de marca, geralmente o azul/roxo dos botões/destaques),
**fg** (texto), **muted** (texto secundário). Mapeie pras vars:
```css
:root{--bg:#070F26;--panel:#0C1733;--accent:#2C6BFF;--accent2:#7FA8FF;--fg:#F2F6FF;--muted:#93A1C4;--amber:#ECC14E;--teal:#23C277;}
```
Exemplos reais já extraídos da Expert:
- Mentoria Automações Inteligentes: bg `#070F26`, accent `#2C6BFF`, accent2 `#7FA8FF`.
- AI Innovation Lab: bg `#060810`, accent `#4F8DFD`, + teal `#00D9A6` e dourado `#FFB800` de apoio.
- **Padrão unificado Expert** (quando o vídeo cobre vários produtos): dark `#070F26` + azul `#2C6BFF`, com teal/dourado como acento pontual.

## Conteúdo
Os slides da landing dão os números e a estrutura reais (quantas aulas, dias, áreas, preços, pilares). Use-os nos
callouts/contadores/cards — não invente números. Confira se batem com o que a PESSOA FALA no vídeo (a fala manda; a
landing complementa).

## Sem landing
Use o **padrão Expert** (dark-azul) e tire os números/estrutura do que a pessoa fala no vídeo (transcript).
