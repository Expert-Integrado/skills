# Golden run — comercial:blog-comercial

- **Data:** 06/07/2026 · máquina: PC (Windows, Git Bash) · executor literal
- **Cenário:** MODO CONSULTAR (o padrão), persona canônica: lead de escritório de advocacia travou com "no nosso ramo isso de IA não funciona" → objeção `meu-setor-e-diferente`, setor `advocacia`, SEM deal identificado (exercita o ramo `utm_content=sem-deal` e evita write no CRM real — a nota do passo 5 só existe com deal).
- **Resultado: APROVADO.** Índice íntegro (205 entradas), filtro objeção+setor devolveu os 2 casos de advocacia com força 5 na frente; links recomendados verificados EM PROD (200); ressalvas apresentadas (inclusive o erro de conta no FAQ do caso jurídico, que a ressalva do índice pega corretamente); UTM montada conforme o template com `sem-deal` + aviso de atribuição cega. MODO CRIAR não disparou (força 5 existe) — correto.

## Recomendação produzida no run (entregável)

1. `caso-cliente-juridico-automacao` (força 5) — link: `https://blog.expertintegrado.com.br/blog/caso-cliente-juridico-automacao?utm_source=whatsapp&utm_medium=comercial&utm_campaign=objecao&utm_content=sem-deal` · Ressalva: FAQ diz "16 contratos a mais" mas o corpo mostra 8→16 totais (ganho real = 8) — vendedor não pode prometer o número do FAQ.
2. `caso-escritorio-advocacia-8k-leads` (força 5) — ressalva: sem taxa de conversão final (case de volume, não de precisão).
3. Mensagem curta sugerida (gancho na fala do lead, link no fim):
   > Lembrei de vc numa conversa aqui. Outro escritório de advocacia me disse exatamente isso, que no ramo de vcs não funcionava. Publicamos como foi a implantação por lá e o que mudou na conversão em 60 dias: <link>

## Achados e fixes (comercial 2.5.9)

1. **22 slugs de objeção do índice fora da taxonomia da skill (DEFEITO, medido).** A taxonomia canônica tem 14 slugs; o índice usa mais 22 slugs finos em 24 posts (`esta-caro`, `roi`, `quero-prova`, `garantia`, `socio`...). Executor que filtra "exatamente estes slugs" nunca acha esses posts — ex.: a calculadora de ROI (força 4, feita PRA objeção de preço) invisível pra `preco`. Fix duplo: (a) aliases canônicos (`preco`, `roi-incerto`) adicionados na entrada da calculadora (sinônimos puros); (b) SKILL.md agora manda listar os slugs reais do índice antes de concluir "sem post" e só então oferecer o MODO CRIAR.

## Observações (não-defeito)

- FALSO POSITIVO evitado: `calculadora-roi-comercial` parecia fantasma (não está em `src/content/blog/`), mas é página Astro em `src/pages/blog/` e responde 200 em prod. Cruzamento índice×disco precisa considerar as duas fontes.
- Cross-check índice×disco dos 204 MDX: zero post do disco fora do índice.
- A referência "modelos no playbook `blog-playbook-follow-up.md` do Processo Comercial" não aponta caminho resolvível na máquina — mensagem curta sai bem sem os modelos; se o playbook for canônico, empacotar na skill numa iteração futura.
- Passo 5 (nota no Pipedrive) não exercitado por design do cenário (sem deal); o fallback `pipedrive_write` documentado é o mesmo padrão já validado em outros runs comerciais.
