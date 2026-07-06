# CLI de Seed de Empresas de Reciclagem

Gera dados de teste de empresas de reciclagem para qualquer cidade brasileira, misturando dados reais do Google Places com dados sintéticos (Faker) — ver `scripts/recycling-companies/` e `plans/recycling-companies-seed/`.

## Pré-requisitos

- `GOOGLE_PLACES_API_KEY` no `.env` da raiz do `api` (validado via Zod em `scripts/recycling-companies/env.ts` — o processo falha cedo, com mensagem clara, se estiver ausente).

## Uso

```bash
npm run cli -- [--city=<cidade> --state=<uf>]... [--target=<n>] [--force] [--output-dir=<path>]
```

Cada flag omitida vira um prompt interativo — **desde que rodando num terminal real (TTY)**. Em ambiente sem TTY (scripts, CI), flags omitidas usam defaults seguros (`target`: sem padding sintético; `force`: `false`; `output-dir`: `prisma/seeds/recycling-companies`) em vez de travar esperando input; se **nenhuma** cidade for informada e não houver TTY, o comando falha com erro claro em vez de tentar prompt.

### Flags

| Flag | Repetível | Descrição |
|---|---|---|
| `--city=<nome>` | sim | Nome da cidade (deve casar com o nome oficial do IBGE — acentos/caixa são normalizados no match). Sempre em par com `--state`, na mesma ordem. |
| `--state=<uf>` | sim | Sigla da UF (ex.: `MT`). |
| `--target=<n>` | não | Meta de empresas para aquela cidade — se o Google retornar menos que `n`, completa com empresas sintéticas até atingir o total. Omitido = usa só o que o Google retornar (sem padding). |
| `--force` | não | Sobrescreve o arquivo de seed da cidade mesmo se ele já existir, sem perguntar. Sem essa flag, uma cidade já gerada é pulada (silenciosamente em modo não-interativo; com prompt de confirmação em modo interativo — ver "Cache e reexecução" abaixo). |
| `--output-dir=<path>` | não | Diretório onde os arquivos de seed são salvos. Default: `prisma/seeds/recycling-companies`. |

### Modo 100% por flag (não-interativo — CI, scripts)

```bash
npm run cli -- --city="Rondonópolis" --state=MT --target=40 --force
```

Múltiplas cidades numa mesma execução (pares `--city`/`--state` na mesma ordem):

```bash
npm run cli -- --city="Cuiabá" --state=MT --city="Campinas" --state=SP --target=30
```

### Modo interativo (nenhuma flag de cidade informada, rodando num terminal)

```bash
npm run cli
```

Fluxo de prompts:

1. **Selecionar estado** — lista com as 27 UFs (busca em `GET /localidades/estados` do IBGE).
2. **Marcar cidades** — busca com filtro e seleção múltipla (`autocompleteMultiselect`) sobre a lista de municípios da UF escolhida (`GET /localidades/estados/{UF}/municipios`) — digite para filtrar, espaço para marcar quantas cidades quiser daquele estado, enter para confirmar. Elimina erro de digitação, já que só é possível marcar uma cidade que exista de verdade na lista. A primeira opção da lista é **"← Voltar (escolher outro estado)"** — se marcada, descarta a seleção e volta pro passo 1 (não há navegação "para trás" nativa nos prompts, então isso funciona como um item especial da lista).
3. **Adicionar cidades de outro estado?** — confirmação; se sim, repete os passos 1–2 pra outro estado; se não, segue.
4. **Meta de empresas** — texto opcional (Enter pula, sem padding sintético). Vale para todas as cidades selecionadas.
5. **Diretório de saída** — texto opcional (Enter usa o default).

Depois dos prompts, cada cidade roda como uma lista de etapas com indicador de progresso (Listr2): *Resolvendo cidade* → *Verificando se já existe* → *Buscando empresas reais no Google Places* → *Gerando empresas sintéticas* (só aparece se `target` pedir mais do que o real encontrado) → *Validando e corrigindo dados gerados* → *Escrevendo arquivo de seed*.

### Validação e correção automática (segunda onda)

Antes de escrever o arquivo, cada empresa gerada (real ou sintética) passa por uma segunda checagem contra os mesmos schemas Zod usados pelo consumidor de seed (`companyGeneralRegistrationValidationSchema`, `upsertCompanyAddressSchema`, `upsertCompanyBusinessHoursSchema`). Em condições normais isso não encontra nada — o mapeamento de empresas reais (`CompanyGapFiller`) e o gerador de sintéticas já garantem telefone e horário de funcionamento preenchidos. Essa etapa existe como rede de segurança: se telefone ou horário vierem vazios por algum motivo, são preenchidos automaticamente (mesma lógica de geração sintética já usada no resto do pipeline); se a empresa continuar inválida mesmo assim (ex.: endereço malformado), ela é descartada do arquivo em vez de gravar dado inválido, e isso aparece no relatório da etapa.

### Modo híbrido (flags parciais)

Qualquer flag omitida vira prompt — cada uma é resolvida de forma independente:

```bash
# cidade/estado por flag, mas pergunta target e output-dir interativamente
npm run cli -- --city="Sinop" --state=MT
```

## Cache e reexecução

Rodar o comando de novo para uma cidade que já tem seed gerado **não** refaz a busca cara no Google Places — a checagem de existência acontece logo depois de resolver a cidade (Geocoding + IBGE), antes da busca de empresas:

- **Sem `--force`, em modo interativo**: pergunta `Seed de <cidade>-<uf> já existe em <path>. Sobrescrever?` — se sim, regenera (busca no Google de novo); se não, pula o resto das etapas para aquela cidade sem gastar a busca.
- **Sem `--force`, em modo não-interativo (CI/scripts)**: pula silenciosamente, sem perguntar (mesmo efeito de responder "não").
- **Com `--force`**: sempre regenera, sem checar nem perguntar.

Isso vale por cidade — numa execução com várias cidades, algumas podem já existir (e serem puladas ou não, conforme a resposta) enquanto outras são geradas pela primeira vez.

## Erros e estados de falha

- Erros de uma cidade (ex.: nome não encontrado no IBGE, falha na API do Google) aparecem inline na etapa que falhou, sem stack trace — e não impedem as demais cidades da mesma execução de rodar.
- Se qualquer cidade falhar, o processo termina com exit code `1` (para sinalizar falha em scripts/CI), mesmo que outras cidades tenham sido geradas com sucesso.

## Saída

Um arquivo JSON por cidade em `<output-dir>/<cidade>-<uf>.json` (default: `prisma/seeds/recycling-companies/<cidade>-<uf>.json`), consumido por `npm run seed` (via `prisma/seeds/recycling-companies.ts`).
