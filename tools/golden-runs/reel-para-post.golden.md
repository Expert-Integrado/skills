# Golden run — marketing:reel-para-post

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** clipe local de 45s com fala real do Eric no lugar do reel (ramo "pedir o arquivo ao Eric" do passo 1; presença do yt-dlp validada — 2026.03.03 no PATH). Passos distintivos executados de verdade; expansão (passo 4) delega ao padrão do agente-draft-blog, validado em golden run próprio no mesmo dia.
- **Resultado: APROVADO.** Caminho primário de transcrição (faster-whisper GPU, large-v3) rodou de verdade: modelo carregado em 19s, 45s de vídeo transcritos em 6,7s com o fix do cublas DLL. Tese extraída, outline derivado (5 H2s-pergunta), bloco VideoEmbed montado (componente `VideoEmbed.astro` confirmado no repo do blog) e UTM de fechamento de ciclo gerada. Artefato: `C:/tmp/golden-reel-para-post-outline.md`.

## Achados e fixes (marketing 2.13.6)

1. **Referência de memória inacessível (DEFEITO, binding máquina).** A skill mandava "ver memória `faster-whisper-gpu.md`", que só existia no memory do workspace ANTIGO (OneDrive, arquivo morto) — sessão em `C:\repos` (onde o trabalho de blog/skills vive) não a carrega; headless/VPS nunca teve. Fix duplo: memória copiada pro memory do projeto atual (`c--repos` + linha no MEMORY.md) E o gotcha make-or-break inline na skill (prepender bin dirs do pacote `nvidia` no PATH ANTES do import, senão `cublas64_12.dll` não carrega; parâmetros de transcrição anti-alucinação).

## Observações (não-defeito)

- Pré-requisitos distintivos todos confirmados: yt-dlp no PATH, `VideoEmbed.astro` no repo, faster-whisper 1.2.1 instalado no 3.12, modelo large-v3 em cache.
- Performance medida neste PC (RTX 3070): ~6,7x realtime no clipe (com VAD), consistente com a memória (~12x em lote).
- Passo 4 (expansão em MDX completo) não foi re-redigido: o contrato é "chamar o padrão do agente-draft-blog", cujo golden run APROVADO é do mesmo dia — validar 2x a mesma redação não acrescenta cobertura. O outline derivado (o que ESTA skill produz) está no artefato.
