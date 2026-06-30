# Pixel & tracking do webinário (a lição cara — ler antes de configurar)

## O erro que aconteceu na 1ª edição
A campanha otimizava e reportava o evento **`Lead` genérico** do Pixel "EXPERT INTEGRADO"
(`1535333454552021`). Mas esse MESMO evento `Lead` disparava em **dois sites diferentes** que
compartilhavam o pixel:
- `biblioteca.ericluciano.com.br` (outro funil, orgânico, alto volume) — 40 a 84 Leads/hora.
- `webinario.expertintegrado.com.br` (a inscrição do evento) — 2 a 4 Leads/hora.

Resultado: o Meta mostrava 49 leads, mas só existiam ~37 inscritos reais. **A biblioteca vazava pra
dentro dos números do webinário** porque os dois usavam o evento `Lead` genérico, e o Meta não tinha
como separar.

## A regra de ouro
**Cada funil tem o SEU evento.** Nunca dois sites/funis diferentes disparando o mesmo evento genérico
no mesmo pixel.
- Webinário → evento próprio (ex: `InscricaoWebinar`), disparado **só na página de confirmação**.
- Biblioteca (ou qualquer outro funil) → evento próprio (ex: `BibliotecaUnlock`).

## Setup correto (passo a passo)
1. Pixel na landing page: `PageView` no load (denominador do A/B) + `ViewContent` se quiser.
2. Evento de registro **só na página de confirmação/obrigado**, com nome exclusivo do funil.
3. **Conversão Personalizada por URL** no Gerenciador de Eventos: evento de registro AND
   `URL contém webinario.expertintegrado.com.br`. Otimizar E reportar a campanha nessa conversão.
4. **Conjunto novo a cada edição** — só assim dá pra escolher a conversão personalizada como evento de
   otimização (Meta não deixa trocar o evento de um conjunto que já está rodando).
5. Se tiver CAPI server-side: casar o `event_id` entre pixel (browser) e server pra deduplicar. Sem
   isso, dobra a contagem. (Na biblioteca não havia CAPI — confirmar caso a caso.)

## Como auditar (achar vazamento)
- `ads_get_dataset_stats` com `aggregation: url` no evento de registro → mostra em QUAL página o evento
  dispara. Se aparecer URL que não é a do webinário, tem vazamento.
- Comparar `WEB_ONLY` vs `SERVER_ONLY`: se vierem quase idênticos, ou é CAPI espelhado (ok se
  deduplicado) ou o filtro não separou. Investigar.
- Picos súbitos de volume num evento = quase sempre disparo errado (página de tráfego ganhou o evento).

## Lovable (onde os sites rodam hoje)
Os sites são no Lovable. Pra mexer no pixel: instruir o Lovable a editar `src/lib/pixel.ts`. Confirmar
se há envio server-side (CAPI) antes — se não houver, não há o que deduplicar.
