#!/usr/bin/env python3
"""Runner de B-roll via Higgsfield CLI — image-to-video. TITULAR dos B-rolls.

Le o MESMO formato de manifesto do kling_i2v.py (frames_dir, output_dir,
clips[{n, frame, prompt}]) e gera no Higgsfield:
  upload do frame -> generate create <model> --start-image -> wait -> download mp4.

Uso:
  python higgsfield_i2v.py <manifest.json>           # todos os clipes
  python higgsfield_i2v.py <manifest.json> 1         # so o clipe 1 (validacao)
  python higgsfield_i2v.py <manifest.json> 3 5 7     # re-disparo seletivo

Requisitos (checados no preflight, aborta com instrucao se faltar):
  1. C:/MCPs/hf.exe existindo (override: env HF_EXE).
  2. Autenticado: `hf.exe auth login` (1x, OAuth no navegador — precisa de clique humano).
  3. Workspace selecionado: `hf.exe workspace set <id>` — SEM isso todo comando morre
     com "No workspace selected". O script tenta setar sozinho se a env HF_WORKSPACE
     estiver definida ou se a conta tiver exatamente 1 workspace.

Consome os creditos da ASSINATURA do site higgsfield.ai (200/mes no plano Starter),
NAO o saldo do cloud.higgsfield.ai (produto separado). Saldo compartilhado entre as
maquinas do Eric (PC e notebook) — mesma conta.

Manifesto: "model" default = seedance1_5 (mais barato validado: 480p/4s sem audio =
~1,2 credito/clipe). "hf_flags" sobrescreve as flags de economia default.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

HF = os.environ.get("HF_EXE", r"C:\MCPs\hf.exe")
HF_WORKSPACE = os.environ.get("HF_WORKSPACE", "")

MODEL_DEFAULT = "seedance1_5"
# 480p/4s sem audio = ~1,2 credito/clipe (medido 28/07/2026). 720p custa ~2x.
FLAGS_DEFAULT = ["--resolution", "480p", "--duration", "4", "--generate-audio=false"]


def run(args, parse_json=True):
    r = subprocess.run([HF] + args + (["--json"] if parse_json else []),
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        print(f"HF ERRO: {' '.join(args)}\n{r.stdout}\n{r.stderr}", flush=True)
        return None
    if parse_json:
        try:
            return json.loads(r.stdout)
        except json.JSONDecodeError:
            # alguns comandos imprimem texto antes do JSON
            m = re.search(r"\{.*\}", r.stdout, re.S)
            return json.loads(m.group(0)) if m else {"raw": r.stdout}
    return r.stdout


VIDEO_EXT = (".mp4", ".mov", ".webm", ".m4v")


def find_url(obj):
    """URL do VIDEO gerado no JSON do `generate wait`.

    ARMADILHA (custou um clipe em 28/07/2026): varredura generica por chave "url"
    devolve o PNG de ENTRADA, porque `params.medias[].data.url` vem ANTES de
    `result_url` na ordem das chaves — o script salvava a imagem como clip-NN.mp4.
    Por isso: campos explicitos primeiro, e `params`/`thumbnail` ficam de fora.
    """
    if isinstance(obj, dict):
        for k in ("result_url", "min_result_url"):
            v = obj.get(k)
            if isinstance(v, str) and v.startswith("http"):
                return v
        for k, v in obj.items():
            if k in ("params", "thumbnail_url", "input", "inputs"):
                continue  # entrada/thumb: nunca o video gerado
            if isinstance(v, str) and v.startswith("http") and v.split("?")[0].endswith(VIDEO_EXT):
                return v
            r = find_url(v)
            if r:
                return r
    elif isinstance(obj, list):
        for it in obj:
            r = find_url(it)
            if r:
                return r
    return None


UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def find_id(obj, keys=("id", "job_id", "upload_id", "generation_id")):
    # o `generate create --json` devolve um array de strings: ["<job_id>"]
    if isinstance(obj, str) and UUID_RE.match(obj.strip()):
        return obj.strip()
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and isinstance(obj[k], str):
                return obj[k]
        for v in obj.values():
            r = find_id(v, keys)
            if r:
                return r
    elif isinstance(obj, list):
        for it in obj:
            r = find_id(it, keys)
            if r:
                return r
    return None


def preflight():
    """Aborta cedo com instrucao acionavel em vez de falhar clipe por clipe."""
    if not os.path.exists(HF):
        sys.exit(f"hf.exe nao encontrado em {HF}\n"
                 "Instale o binario (NAO use npm — quebra no Windows) conforme "
                 "references/higgsfield-cli.md, ou aponte a env HF_EXE.")

    if run(["auth", "token"], parse_json=False) is None:
        sys.exit("Higgsfield nao autenticado.\n"
                 "Rode `hf.exe auth login` (abre o navegador; precisa de clique humano "
                 "em Authorize) e tente de novo.")

    st = run(["workspace", "status"], parse_json=False)
    if st is None:
        wid = HF_WORKSPACE
        if not wid:
            ws = run(["workspace", "list"], parse_json=True)
            ids = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
                             json.dumps(ws) if ws else "")
            if len(set(ids)) == 1:
                wid = ids[0]
        if not wid:
            sys.exit("Nenhum workspace selecionado no Higgsfield.\n"
                     "Rode `hf.exe workspace list` e depois "
                     "`hf.exe workspace set <workspace_id>` (ou defina a env HF_WORKSPACE).")
        if run(["workspace", "set", wid], parse_json=False) is None:
            sys.exit(f"Falha ao selecionar o workspace {wid}.")
        print(f"[preflight] workspace selecionado: {wid}", flush=True)

    saldo = run(["account", "status"], parse_json=False)
    if saldo:
        print(f"[preflight] {saldo.strip()}", flush=True)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    manifest = json.load(open(sys.argv[1], encoding="utf-8"))
    only = [int(a) for a in sys.argv[2:]] if len(sys.argv) > 2 else None

    preflight()

    frames_dir = manifest["frames_dir"]
    out_dir = manifest["output_dir"]
    model = manifest.get("model") or MODEL_DEFAULT
    # hf_flags sobrescreve as flags de economia; ausente = default barato
    extra = manifest.get("hf_flags", FLAGS_DEFAULT)

    ok = 0
    todo = [c for c in manifest["clips"] if only is None or c["n"] in only]
    print(f"[plano] {len(todo)} clipe(s) | model={model} | flags={' '.join(extra)}", flush=True)
    for clip in todo:
        n, frame, prompt = clip["n"], clip["frame"], clip["prompt"]
        fpath = os.path.join(frames_dir, frame)
        print(f"\n=== CLIP {n}  ({frame}) ===", flush=True)

        up = run(["upload", "create", fpath])
        upload_id = find_id(up) if up else None
        if not upload_id:
            print(f"[clip {n}] ERRO no upload", flush=True)
            continue
        print(f"[clip {n}] upload_id={upload_id}", flush=True)

        # --start-image (param start_image do modelo). NAO usar --image: e alias de
        # --image-references, que o seedance1_5 NAO aceita — o job sairia sem o frame.
        job = run(["generate", "create", model, "--prompt", prompt, "--start-image", upload_id] + extra)
        job_id = find_id(job) if job else None
        if not job_id:
            print(f"[clip {n}] ERRO no create", flush=True)
            continue
        print(f"[clip {n}] job_id={job_id} — aguardando...", flush=True)

        res = run(["generate", "wait", job_id])
        url = find_url(res) if res else None
        if not url:
            print(f"[clip {n}] ERRO: sem URL no resultado: {json.dumps(res)[:400]}", flush=True)
            continue

        if not url.split("?")[0].endswith(VIDEO_EXT):
            print(f"[clip {n}] ERRO: URL nao parece video ({url[:120]}) — nao vou salvar "
                  "imagem com nome de mp4. Confira o JSON com "
                  f"`hf.exe generate wait {job_id} --json`.", flush=True)
            continue

        mp4 = os.path.join(out_dir, f"clip-{n:02d}.mp4")
        urllib.request.urlretrieve(url, mp4)
        # guarda-corpo: PNG/WebP salvo como .mp4 quebra o concat do compose_reel
        with open(mp4, "rb") as fh:
            head = fh.read(12)
        if b"ftyp" not in head:
            os.remove(mp4)
            print(f"[clip {n}] ERRO: baixado NAO e MP4 (header={head[:8]!r}) — arquivo "
                  "descartado. O job foi cobrado; re-disparar so este clipe.", flush=True)
            continue
        print(f"[clip {n}] SAVED -> {mp4}", flush=True)
        ok += 1

    print(f"\nDONE: {ok}/{len(todo)} clips -> {out_dir}", flush=True)


if __name__ == "__main__":
    main()
