# -*- coding: utf-8 -*-
"""
Gera hero(s) do blog Expert via OpenAI gpt-image-2 (NUNCA image-1), converte
pra WebP e atualiza heroImage+heroAlt no frontmatter MDX.

Uso:
  python gerar-hero.py --slug pilar-ia-rotina-ceo-1h-dia --concept "a CEO's day compressed into one glowing hour with AI orbs"
  python gerar-hero.py --all-missing            # gera pra todos os posts sem hero (idempotente)
  python gerar-hero.py --slug X --concept "..." --alt "Texto alt acentuado"

Requer: OPENAI_API_KEY no env, Pillow (pip install pillow).
"""
import os, re, sys, json, glob, base64, time, argparse, urllib.request, urllib.error

MODEL = "gpt-image-2"  # PROIBIDO image-1 (regra Eric 26/06/2026)
SIZE = "1536x1024"
QUALITY = "high"

STYLE = ("Editorial hero illustration for a premium business blog about applied AI for companies. "
 "Modern flat-vector style with subtle paper grain and soft depth, generous negative space, "
 "clean and sophisticated, slightly isometric. Strict color palette: warm off-white background "
 "(#FBFAF7), electric royal blue (#2742E8) as the dominant accent, periwinkle (#5B73FF) and soft "
 "sky tints for secondary shapes, deep charcoal (#17171B) for fine linework. Absolutely no text, "
 "no words, no letters, no numbers, no logos, no UI mockups. Single centered conceptual subject "
 "with breathing room. Subject: ")


def gen_image(concept):
    """Gera 1 imagem via gpt-image-2. Retorna bytes PNG. Sem fallback pra image-1."""
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("ERRO: OPENAI_API_KEY ausente no env (op read 'op://Agentes Eric/OPENAI_API_KEY/credential').")
    body = json.dumps({"model": MODEL, "prompt": STYLE + concept,
                       "size": SIZE, "quality": QUALITY, "n": 1}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request("https://api.openai.com/v1/images/generations",
                data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as r:
                out = json.load(r)
            return base64.b64decode(out["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            if e.code in (429, 500, 502, 503):
                time.sleep(5 * (attempt + 1)); continue
            sys.exit(f"ERRO {MODEL}: {e.code} {msg}")
        except Exception as e:
            time.sleep(4 * (attempt + 1))
            if attempt == 3:
                sys.exit(f"ERRO {MODEL}: {str(e)[:200]}")


def to_webp(png_bytes, dest):
    from PIL import Image
    import io
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    im.save(dest, "WEBP", quality=82, method=6)
    return os.path.getsize(dest)


def title_of(mdx_path):
    txt = open(mdx_path, encoding="utf-8").read()
    m = re.search(r'(?m)^title:\s*"?(.*?)"?\s*$', txt.split("---", 2)[1] if "---" in txt else txt)
    return (m.group(1).replace('"', '').strip() if m else "")


def set_frontmatter(mdx_path, slug, alt):
    txt = open(mdx_path, encoding="utf-8", newline="").read()
    eol = "\r\n" if "\r\n" in txt else "\n"
    txt = re.sub(r'(?m)^hero(Image|Alt):[^\r\n]*(\r?\n)', '', txt)  # remove existentes
    ins = eol + f'heroImage: "/images/{slug}-hero.webp"' + eol + f'heroAlt: "{alt}"'
    anchor = re.search(r'(?m)^tipo:[^\r\n]*', txt) or re.search(r'(?m)^pillar:[^\r\n]*', txt) \
        or re.search(r'(?m)^pubDate:[^\r\n]*', txt)
    if not anchor:
        sys.exit(f"ERRO: nao achei ancora (tipo/pillar/pubDate) no frontmatter de {slug}")
    txt = txt[:anchor.end()] + ins + txt[anchor.end():]
    open(mdx_path, "w", encoding="utf-8", newline="").write(txt)


def one(blog_dir, slug, concept, alt=None):
    mdx = os.path.join(blog_dir, "src", "content", "blog", slug + ".mdx")
    if not os.path.exists(mdx):
        sys.exit(f"ERRO: post nao existe: {mdx}")
    imgs = os.path.join(blog_dir, "public", "images")
    os.makedirs(imgs, exist_ok=True)
    dest = os.path.join(imgs, f"{slug}-hero.webp")
    if os.path.exists(dest) and os.path.getsize(dest) > 8000:
        print(f"[skip] {slug} (hero ja existe)");
    else:
        if not concept:
            sys.exit(f"ERRO: --concept obrigatorio pra gerar {slug}")
        t = time.time()
        png = gen_image(concept)
        kb = to_webp(png, dest) / 1024
        print(f"[ok] {slug}-hero.webp ({kb:.0f}KB) em {time.time()-t:.0f}s")
    if not alt:
        alt = f"Ilustração editorial em tons de azul representando o artigo: {title_of(mdx)}"
    set_frontmatter(mdx, slug, alt)
    print(f"[frontmatter] {slug}: heroImage + heroAlt aplicados")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--concept")
    ap.add_argument("--alt")
    ap.add_argument("--all-missing", action="store_true")
    ap.add_argument("--blog-dir", default=r"C:\repos\expertintegrado-blog")
    a = ap.parse_args()
    if a.all_missing:
        blogdir = os.path.join(a.blog_dir, "src", "content", "blog")
        faltam = []
        for f in sorted(glob.glob(os.path.join(blogdir, "*.mdx"))):
            slug = os.path.basename(f)[:-4]
            webp = os.path.join(a.blog_dir, "public", "images", f"{slug}-hero.webp")
            if not (os.path.exists(webp) and os.path.getsize(webp) > 8000):
                faltam.append(slug)
        if not faltam:
            print("Todos os posts ja tem hero."); return
        print(f"{len(faltam)} posts sem hero. Para cada, gere o conceito visual e rode --slug/--concept.")
        for s in faltam:
            print("  -", s, "|", title_of(os.path.join(blogdir, s + ".mdx")))
        return
    if not a.slug:
        sys.exit("Use --slug <slug> --concept \"...\" ou --all-missing")
    one(a.blog_dir, a.slug, a.concept, a.alt)


if __name__ == "__main__":
    main()
