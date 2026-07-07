# CLI de Seed (Empresas + Denúncias)

Gera um pacote coeso de dados de teste para qualquer cidade brasileira: **moradores** fictícios (usuário + profile), **empresas de reciclagem** (misturando dados reais do Google Places com dados sintéticos via Faker) e **denúncias** (100% sintéticas, com anexos, votações e resoluções) — tudo vinculado ao mesmo pool de pessoas da cidade. Ver `cli/` e `plans/companies-complaints-seed-cli/`.

## O conceito central: moradores compartilhados

Escolher uma cidade sempre gera um único pool de **moradores fictícios** (`CityResidentSeed` — nome, telefone, email, endereço dentro dos limites da cidade), persistido em `prisma/seeds/city-residents/<cidade>-<uf>.json`. Esse mesmo pool é reaproveitado por dois papéis, nunca populações isoladas:

- **Dono de empresa** — cada morador pode ser dono de no máximo **2** empresas (`CompanyOwnerAssigner`, teto fixo). Se a quantidade de empresas pedida exigir mais moradores do que o pool tem, o pool é aumentado automaticamente.
- **Participante de denúncia** — autor, votante e/ou resolvedor. Uma resolução só referencia uma empresa de verdade (`company_id`) se o morador resolvedor for, de fato, o dono real daquela empresa — nunca um morador "emprestando" a empresa de outro.

Rodar o CLI de novo para a mesma cidade reaproveita o pool de moradores já gravado (não gera um novo, nem duplica pessoas) — a menos que `--force` seja usado.

## Pré-requisitos

- `GOOGLE_PLACES_API_KEY` no `.env` da raiz do `api` (validado via Zod em `cli/shared/env.ts` — o processo falha cedo, com mensagem clara, se estiver ausente). Usado tanto para buscar empresas reais quanto para o Geocoding da cidade (necessário mesmo se `--companies=0`).
- Para `npm run seed` completar com sucesso quando há denúncias com anexo, o **MinIO precisa estar rodando** (`docker compose up minio createbuckets`) — o consumidor de denúncias faz upload real das imagens de exemplo via `StorageProvider`, não apenas grava metadados fake.

## Uso

```bash
npm run cli -- [--city=<cidade> --state=<uf>]... [--residents=<n>] [--companies=<n>] [--complaints=<n>] [--force] [--output-dir=<path>]
```

Cada flag omitida vira um prompt interativo — **desde que rodando num terminal real (TTY)**. Em ambiente sem TTY (scripts, CI), flags omitidas usam defaults seguros (ver tabela abaixo); se **nenhuma** cidade for informada e não houver TTY, o comando falha com erro claro em vez de tentar prompt.

### Sem seletor de dataset — só quantidade

Não existe uma flag para "gerar só empresas" ou "só denúncias" no sentido de ligar/desligar um modo — escolher a cidade sempre dispara os dois pipelines. O controle é só de **quantidade**, por tipo:

- `--companies=0` ou `--complaints=0` são a forma de "desligar" aquele tipo para a cidade naquela execução (ex.: uma cidade que já tem empresas de uma execução anterior, rodando só `--complaints=50 --companies=0` para adicionar mais denúncias sem tocar nas empresas existentes).
- Omitir a flag usa um default sensato (ver tabela) — rodar o CLI sem nenhuma flag numérica ainda produz um cenário completo e útil.

### Flags

| Flag | Repetível | Descrição |
|---|---|---|
| `--city=<nome>` | sim | Nome da cidade (deve casar com o nome oficial do IBGE — acentos/caixa são normalizados no match). Sempre em par com `--state`, na mesma ordem. |
| `--state=<uf>` | sim | Sigla da UF (ex.: `MT`). |
| `--residents=<n>` | não | Piso do pool de moradores da cidade. Opcional — se omitido, o tamanho é calculado automaticamente a partir de `--companies`/`--complaints` (mínimo de 10, ou o necessário para respeitar o teto de 2 empresas por morador, ou ~60% do total de denúncias, o que for maior). Se o valor informado for menor que o mínimo exigido, o pool é aumentado mesmo assim (nunca gera menos empresas do que pedido). |
| `--companies=<n>` | não | Quantidade-alvo de empresas para aquela cidade — se o Google retornar menos que `n`, completa com empresas sintéticas até atingir o total; se retornar mais, todas as reais são mantidas. `0` desliga a geração de empresas. Default se omitido: `20`. |
| `--complaints=<n>` | não | Quantidade de denúncias sintéticas a gerar. `0` desliga a geração de denúncias. Default se omitido: `30`. |
| `--force` | não | Sobrescreve os arquivos de seed da cidade mesmo se já existirem, sem perguntar (empresas e denúncias, cada um com sua própria checagem). Sem essa flag, um arquivo já gerado é pulado (silenciosamente em modo não-interativo; com prompt de confirmação em modo interativo — ver "Cache e reexecução" abaixo). |
| `--output-dir=<path>` | não | Diretório onde os arquivos de seed de **empresas** são salvos. Default: `prisma/seeds/recycling-companies`. Não afeta denúncias (sempre `prisma/seeds/complaints`) nem o pool de moradores (sempre `prisma/seeds/city-residents`) — aplicar o mesmo diretório às duas geraria colisão de nome de arquivo (mesmo slug de cidade, conteúdos diferentes). |

### Modo 100% por flag (não-interativo — CI, scripts)

```bash
npm run cli -- --city="Rondonópolis" --state=MT --companies=40 --complaints=60 --force
```

Múltiplas cidades numa mesma execução (pares `--city`/`--state` na mesma ordem):

```bash
npm run cli -- --city="Cuiabá" --state=MT --city="Campinas" --state=SP --companies=30 --complaints=50
```

Gerar só mais denúncias para uma cidade que já tem empresas seedadas:

```bash
npm run cli -- --city="Rondonópolis" --state=MT --companies=0 --complaints=50
```

### Modo interativo (nenhuma flag de cidade informada, rodando num terminal)

```bash
npm run cli
```

Fluxo de prompts:

1. **Selecionar estado** — lista com as 27 UFs (busca em `GET /localidades/estados` do IBGE).
2. **Marcar cidades** — busca com filtro e seleção múltipla (`autocompleteMultiselect`) sobre a lista de municípios da UF escolhida (`GET /localidades/estados/{UF}/municipios`) — digite para filtrar, espaço para marcar quantas cidades quiser daquele estado, enter para confirmar. **Confirmar sem marcar nenhuma cidade volta para o passo 1** (escolher outro estado).
3. **Adicionar cidades de outro estado?** — confirmação; se sim, repete os passos 1–2 para outro estado; se não, segue.
4. **Confirmar seleção** — mostra a lista completa de cidades escolhidas e pede confirmação. Se recusada, a seleção inteira é descartada e o fluxo recomeça do passo 1.
5. **Quantidade de moradores** — texto opcional (Enter = automático).
6. **Quantidade de empresas** — texto opcional (Enter = `20`).
7. **Quantidade de denúncias** — texto opcional (Enter = `30`).
8. **Diretório de saída** (só empresas) — texto opcional (Enter usa o default).

Depois dos prompts, cada cidade roda como uma árvore de tarefas com indicador de progresso (Listr2):

```
Resolvendo cidade
Resolvendo moradores da cidade
Empresas de reciclagem (pulado se --companies=0)
  Verificando se já existe → Buscando no Google Places → Gerando sintéticas → Validando/corrigindo → Atribuindo donos → Escrevendo
Denúncias (pulado se --complaints=0)
  Verificando se já existe → Calculando moradores donos de empresa → Gerando denúncias → Escrevendo
```

### Validação e correção automática (empresas)

Antes de escrever o arquivo, cada empresa gerada (real ou sintética) passa por uma segunda checagem contra os mesmos schemas Zod usados pelo consumidor de seed. Telefone/horário faltantes são preenchidos automaticamente; se a empresa continuar inválida mesmo assim, é descartada do arquivo em vez de gravar dado inválido.

### Modo híbrido (flags parciais)

Qualquer flag omitida vira prompt — cada uma é resolvida de forma independente:

```bash
# cidade/estado por flag, mas pergunta o resto interativamente
npm run cli -- --city="Sinop" --state=MT
```

## Cache e reexecução

Rodar o comando de novo para uma cidade que já tem seed gerado **não** refaz o trabalho caro (busca no Google Places, geração de denúncias):

- **Sem `--force`, em modo interativo**: pergunta `Seed de <cidade>-<uf> já existe em <path>. Sobrescrever?` — se sim, regenera; se não, pula o resto das etapas daquele tipo para aquela cidade.
- **Sem `--force`, em modo não-interativo (CI/scripts)**: pula silenciosamente, sem perguntar.
- **Com `--force`**: sempre regenera, sem checar nem perguntar.

Isso vale por cidade e por tipo (empresas/denúncias são checadas separadamente) — numa execução com várias cidades, algumas podem já existir enquanto outras são geradas pela primeira vez. O pool de moradores tem sua própria checagem (não redimensiona se já existir, a menos que `--force`).

## Erros e estados de falha

- Erros de uma cidade (ex.: nome não encontrado no IBGE, falha na API do Google) aparecem inline na etapa que falhou, sem stack trace — e não impedem as demais cidades da mesma execução de rodar.
- Se qualquer cidade falhar, o processo termina com exit code `1` (para sinalizar falha em scripts/CI), mesmo que outras cidades tenham sido geradas com sucesso.

## Saída

Três arquivos JSON por cidade, cada um no seu próprio diretório:

| Dado | Caminho |
|---|---|
| Moradores | `prisma/seeds/city-residents/<cidade>-<uf>.json` |
| Empresas | `<output-dir>/<cidade>-<uf>.json` (default: `prisma/seeds/recycling-companies/<cidade>-<uf>.json`) |
| Denúncias | `prisma/seeds/complaints/<cidade>-<uf>.json` |

Consumidos por `npm run seed`, nesta ordem obrigatória (`prisma/seeds/index.ts`): categorias de resíduo → empresas → denúncias. Empresas precisam existir no banco antes de denúncias rodarem para que resoluções `PREFER_COMPANY` encontrem a empresa real do morador resolvedor — sem isso, toda resolução cai para `CITIZEN_ONLY` (comportamento correto, não é erro).
