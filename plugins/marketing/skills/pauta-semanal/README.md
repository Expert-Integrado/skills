# /pauta-semanal — 5 pautas prontas a partir do que viraliza no nicho

> Toda semana, transforma o que está bombando nos concorrentes em 5 pautas de conteúdo prontas pra produzir.

## O que faz
Roda a pesquisa de concorrentes do Instagram (a skill `ig-competitor-research`) dos **últimos 7 dias** e
transforma os achados em **5 pautas prontas** — cada uma com tema, ângulo, formato sugerido, hook e o
porquê de tender a funcionar. É a camada de "decisão de pauta" em cima da pesquisa: a pesquisa mostra o
que bombou; esta skill decide o que **você** vai postar a partir disso.

## Quando usar
- "monta a pauta da semana"
- "me dá 5 pautas de conteúdo"
- "ideias de conteúdo pra essa semana"
- automaticamente, toda segunda-feira (se você agendar — ver abaixo)

## O que você precisa dar
- Os **@ dos concorrentes** do seu nicho — ou deixe salvos no arquivo `competitors.txt` (1 por linha).
  É isso que personaliza a pauta pra sua marca.
- Nada mais: a skill puxa os dados e monta as pautas.

## O que ela entrega
- **5 pautas**, cada uma com: tema, ângulo, formato sugerido, hook sugerido, por que tende a funcionar,
  CTA sugerido e a referência (qual perfil fez o quê que bombou).
- Um arquivo `pautas/<data>_pauta-semana.md` registrado.
- O relatório de pesquisa (`report.html`) caso você queira se aprofundar.

## Como funciona (passo a passo resumido)
1. Confere a configuração (concorrentes + chave de API).
2. Roda a pesquisa dos últimos 7 dias.
3. Analisa os posts que mais superaram a média (outlier score): temas, formatos e hooks da semana.
4. Monta 5 pautas acionáveis e adaptadas à sua marca.
5. Entrega na conversa, salva o arquivo e oferece já roteirizar com `/criar-script`.

## Integrações e ferramentas
- **`ig-competitor-research`** (a skill que faz a coleta) — precisa estar instalada.
- **Apify** (coleta dos posts do Instagram) e **Whisper local** (transcrição dos Reels).

## Pré-requisitos
- A skill `ig-competitor-research` instalada.
- **Sua própria** chave `APIFY_TOKEN` (crie uma conta grátis em apify.com — o free tier cobre o uso).
- `ffmpeg` no PATH e `openai-whisper` (`pip install -U openai-whisper requests`).
- Um `competitors.txt` com os perfis do seu nicho.
- *Nenhum token/perfil vem embutido — quem assumir configura os próprios dados.*

## Dicas e observações
- Para rodar **sozinha toda segunda**: dá pra criar uma tarefa agendada (cron `0 8 * * 1`) que dispara a
  skill e entrega as pautas no canal que você quiser (WhatsApp/Zoom/Telegram/e-mail). Configure com os
  seus dados quando assumir.
- Custo: ~US$0,10–0,15 por pesquisa (cabe no free tier do Apify); Whisper roda local de graça.
- Não copie o conteúdo viral — **adapte** o tema à sua marca. A skill já foi instruída a fazer isso.
