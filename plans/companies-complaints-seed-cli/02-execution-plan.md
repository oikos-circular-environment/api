# CLI de Seed Multi-Domínio — Plano de Execução

---

## Ordem de Execução

### Lote 1 — Rename e reorganização mecânica do pacote existente

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T1 | Rename `scripts/recycling-companies/` → `cli/`, split `shared/`/`companies/` | Move todo o conteúdo atual para `cli/companies/` e extrai o que é genérico de cidade (`city-context.ts`, `ibge-municipio.ts`, providers de geocoding/IBGE, `resolve-city-use-case.ts`, `env.ts`) para `cli/shared/`. Ajusta profundidade de todos os imports relativos internos e os que cruzam para `src/` | `api/cli/shared/**`, `api/cli/companies/**` | ⬜ Pendente |
| T2 | Relocar `AddressSeed` e `fake-phone.ts` para `shared/` | `AddressSeed` sai de `companies/entities/company-seed.ts` para `shared/entities/address-seed.ts` (usado por `Company` E pelo novo `CityResidentSeed`); `fake-phone.ts` sai de `companies/services/` para `shared/services/` (reaproveitado pelo gerador de moradores) | `cli/shared/entities/address-seed.ts`<br>`cli/shared/services/fake-phone.ts`<br>ajuste de imports em `company-gap-filler.ts`, `company-seed-repairer.ts`, `synthetic-company-generator.ts`, `company-seed-mapper.ts` | ⬜ Pendente |
| T3 | `package.json`, `vitest.config.ts`, symlink, assets | `"cli"` aponta para `cli/index.ts`; `vitest.config.ts` troca `scripts/**/*.spec.ts` por `cli/**/*.spec.ts`; symlink `requests/.env` ajustado de `../../../.env` para `../../.env`; `git mv api/src/assets/*` para `api/cli/assets/`, renomeando cada arquivo para o padrão `complaint-sample-01.jpg`…`complaint-sample-07.jpg` (mapeamento exato em `01-technical-plan.md` §2) | `api/package.json`<br>`api/vitest.config.ts`<br>`api/cli/requests/.env` (symlink)<br>`api/cli/assets/*` | ⬜ Pendente |
| T4 | Rename/atualização inicial de `docs/recycling-seed-cli.md` → `docs/seed-cli.md` | Paths atualizados para `cli/`; seções de flags/fluxo específicas de denúncias ficam como placeholder — conteúdo completo só no Lote 8 (T29), depois que o comportamento existir de fato | `api/docs/seed-cli.md` (renomeado) | ⬜ Pendente |

### Lote 2 — Fundação compartilhada: pool de moradores da cidade (depende de T1, T2)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T5 | Entidades do pool de moradores | `CityResidentSeed`, `CityResidentsFileMeta`, `CityResidentsFile` | `cli/shared/entities/city-resident.ts` | ⬜ Pendente |
| T6 | Gerador de moradores + spec | `CityResidentGenerator.generate(ctx, count)` — nome/telefone/email/endereço fabricados dentro do bounds; `computeResidentPoolSize({ companiesTarget, complaintsTarget })` (função pura, `MIN_RESIDENTS_PER_CITY = 10`, teto de 2 empresas/morador considerado no cálculo) | `cli/shared/services/city-resident-generator.ts` (+spec) | ⬜ Pendente |
| T7 | Writer do pool de moradores + spec | Interface com `exists`/`write`/**`read`** (novo em relação aos writers existentes — precisa reler o pool já gravado, não só checar existência); grava/lê `prisma/seeds/city-residents/<slug>-<uf>.json` | `cli/shared/writers/city-residents-file-writer.ts` (+spec) | ⬜ Pendente |
| T8 | Use-case de resolução de moradores + spec | `ResolveCityResidentsUseCase.execute(ctx, opts)` — carrega o arquivo se já existe (sem redimensionar), senão gera com `computeResidentPoolSize` e grava | `cli/shared/use-cases/resolve-city-residents-use-case.ts` (+spec) | ⬜ Pendente |

### Lote 3 — Ajustes em Companies para moradores compartilhados (depende do Lote 2)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T9 | `CompanySeed` ganha `owner_resident_index` | Ajuste de tipo; `AddressSeed` passa a ser importado de `shared/` (já feito em T2, aqui só a referência no tipo `CompanySeed.address`) | `cli/companies/entities/company-seed.ts` | ⬜ Pendente |
| T10 | Atribuidor de donos + spec | `CompanyOwnerAssigner.assign(companies, residents)` — round-robin, teto de `MAX_COMPANIES_PER_RESIDENT = 2`; lança erro se `companies.length > residents.length * 2` (sinal de pool mal dimensionado) | `cli/companies/services/company-owner-assigner.ts` (+spec) | ⬜ Pendente |
| T11 | Integra atribuição de donos ao pipeline de empresas | `GenerateCitySeedUseCase` ganha uma fase final (`assignOwners`) chamada depois de `validateAndRepair`, antes de `writeSeed`; `recycling-seed-pipeline.spec.ts` passa a injetar um pool de moradores fake e assertar `owner_resident_index` presente e respeitando o teto de 2 | `cli/companies/use-cases/generate-city-seed-use-case.ts` (+spec)<br>`cli/companies/recycling-seed-pipeline.spec.ts` | ⬜ Pendente |

### Lote 4 — Fundação Complaints: entidades e services puros (depende do Lote 2, paralelo ao Lote 3)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T12 | Entidades de denúncia | `ComplaintSeed`, `ComplaintSeedFile`, `VoteSeed`, `ResolutionSeed`/`ResolutionHint`, `ComplaintAttachmentSeed` — import de tipo `Geospatial` de `src/modules/complaints/entities/complaint-entity.ts` | `cli/complaints/entities/complaint-seed.ts` | ⬜ Pendente |
| T13 | Seletor de categorias + spec | `ComplaintCategoryPicker.pick()` — 1-3 nomes de `CATEGORIES` (`src/modules/wastes/data/waste-categories-base.ts`, import relativo), nunca inventa categoria fora do catálogo | `cli/complaints/services/complaint-category-picker.ts` (+spec) | ⬜ Pendente |
| T14 | Seletor de anexos + spec | `ComplaintAttachmentPicker.pick()` — lista fixa dos 7 arquivos em `cli/assets/`, distribuição ponderada (0:10%, 1:60%, 2:25%, 3:5%), sem repetição de arquivo na mesma denúncia | `cli/complaints/services/complaint-attachment-picker.ts` (+spec) | ⬜ Pendente |
| T15 | Gerador de geospatial sintético + spec | `SyntheticGeospatialGenerator.generate(ctx)` — coordenadas dentro de `ctx.bounds`, `addresses.*` fabricado mantendo city/region/country/timezone consistentes; spec valida contra `geospatialSchema` real | `cli/complaints/services/synthetic-geospatial-generator.ts` (+spec) | ⬜ Pendente |
| T16 | Seletor de status + spec | `ComplaintStatusPicker.pick()` — distribuição ponderada `OPEN 55% / RESOLVED 35% / CANCELED 10%` | `cli/complaints/services/complaint-status-picker.ts` (+spec) | ⬜ Pendente |
| T17 | Gerador de votos + spec | `VoteGenerator.generate(status, residentPoolSize, authorIndex)` — fórmula de quórum duplicada de `quorum-logic.ts` (comentário apontando a fonte), coerência status↔votos (ver `01-technical-plan.md` §3.11), exclui `authorIndex` do pool de votantes, sem repetição de votante na mesma denúncia | `cli/complaints/services/vote-generator.ts` (+spec) | ⬜ Pendente |
| T18 | Gerador de resoluções + spec | `ResolutionGenerator.generate(status, residentsWithCompany, authorIndex)` — 0 resoluções se não `RESOLVED`; 1-2 se `RESOLVED`; `resolution_hint: "PREFER_COMPANY"` só se o morador sorteado estiver em `residentsWithCompany`; autor pode se resolver a própria denúncia (diferente da regra de votos) | `cli/complaints/services/resolution-generator.ts` (+spec) | ⬜ Pendente |

### Lote 5 — Composição Complaints (depende do Lote 4)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T19 | Compositor de denúncia + spec | `ComplaintGenerator.generate(ctx, residents, residentsWithCompany)` — injeção de construtor dos services do Lote 4, produz um `ComplaintSeed` completo | `cli/complaints/services/complaint-generator.ts` (+spec) | ⬜ Pendente |
| T20 | Writer de denúncias + spec | `ComplaintSeedFileWriter` — `exists`/`write`, grava `prisma/seeds/complaints/<slug>-<uf>.json`, mesmo padrão de cache/`--force` dos demais writers | `cli/complaints/writers/complaint-seed-file-writer.ts` (+spec) | ⬜ Pendente |
| T21 | Use-case orquestrador de denúncias + spec | `GenerateCityComplaintsUseCase` — reaproveita `ResolveCityUseCase`/`ResolveCityResidentsUseCase` (shared), calcula `residentsWithCompany` a partir do `CompanySeedFile` da mesma cidade SE existir, gera N `ComplaintSeed` via `ComplaintGenerator`, escreve o arquivo. Fases expostas como métodos públicos (mesmo padrão de `GenerateCitySeedUseCase`), para alimentar o Listr2 do CLI | `cli/complaints/use-cases/generate-city-complaints-use-case.ts` (+spec) | ⬜ Pendente |

### Lote 6 — CLI: orquestração e flags de quantidade (depende dos Lotes 3 e 5)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T22 | Prompts novos | `promptTarget(label: string, defaultValue?: number)` — generaliza o prompt existente para aceitar rótulo e default sugerido; reaproveitado para "moradores", "empresas" (default `DEFAULT_COMPANIES_TARGET`) e "denúncias" (default `DEFAULT_COMPLAINTS_TARGET`). Sem `promptDatasets` — não existe mais seletor de dataset | `cli/cli/prompts.ts` | ⬜ Pendente |
| T23 | `cli.ts` reestruturado — composition root único | Novas flags numéricas (`--residents`, `--companies`, `--complaints`, substituindo `--target`/`--complaints-target`); sem seletor de dataset — instancia `ResolveCityUseCase`/`ResolveCityResidentsUseCase` uma vez por cidade (com `computeResidentPoolSize` considerando `--residents` como piso); monta uma única `Listr` por cidade com a resolução de cidade+moradores no topo e os dois ramos (empresas/denúncias) com `enabled` condicionado a `companiesTarget > 0` / `complaintsTarget > 0`; isolamento de falha por cidade mantido (try/catch no loop externo, como hoje) | `cli/cli.ts` | ⬜ Pendente |

### Lote 7 — Consumidores Prisma (depende de T5 — pode rodar em paralelo aos Lotes 3-6)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T24 | Helper compartilhado de upsert de morador | `upsertCityResident(prisma, resident, passwordHash)` — busca por email antes de criar (idempotente), cria `Address` (+raw SQL de location) e `User`+`Profile` numa única chamada; usado por AMBOS os consumidores abaixo, garantindo que o mesmo morador nunca gera duas linhas de `User` | `prisma/seeds/shared/upsert-city-resident.ts` | ⬜ Pendente |
| T25 | Reescrita de `recycling-companies.ts` | Lê `city-residents/<slug>.json` correspondente; resolve `owner_resident_index` → `upsertCityResident` → usa o `userId` retornado como `company.user_id` (em vez de criar um user descartável por empresa); fallback explícito e comentado para JSONs antigos sem `owner_resident_index` (cria user descartável como hoje, comportamento legado) | `prisma/seeds/recycling-companies.ts` | ⬜ Pendente |
| T26 | Novo `prisma/seeds/complaints.ts` | Lê arquivos de `prisma/seeds/complaints/`, resolve `city-residents` correspondente, materializa moradores referenciados via `upsertCityResident` (lazy, com cache em `Map` durante o loop do arquivo), cria `Complaint`+raw SQL location+`ComplaintWasteCategory`+anexos (upload real via `makeStorageProvider()`, lendo de `cli/assets/`)+`ComplaintVote`+`ComplaintResolution` (resolvendo `PREFER_COMPANY` via `company.findFirst({ where: { user_id } })`), tudo em `$transaction` por denúncia; contadores de resumo e `SEED_DRY_RUN` no mesmo padrão de `recycling-companies.ts` | `prisma/seeds/complaints.ts` | ⬜ Pendente |
| T27 | Registro em `prisma/seeds/index.ts` | Adiciona `await seedComplaints(prisma)` após `seedRecyclingCompanies` (ordem importa: empresas precisam existir no banco para `PREFER_COMPANY` resolver de verdade) | `prisma/seeds/index.ts` | ⬜ Pendente |

### Lote 8 — Teste ponta a ponta e documentação (depende de todos os anteriores)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T28 | Teste de pipeline ponta a ponta (denúncias) | `complaint-seed-pipeline.spec.ts` — compõe `GenerateCityComplaintsUseCase` com fakes (writer em memória, sem disco/rede), assertando: todo `geospatial` valida contra `geospatialSchema` real; toda categoria existe em `CATEGORIES`; votantes distintos e nunca incluem o autor; nenhuma denúncia `OPEN` atinge quórum e nenhuma `RESOLVED` deixa de atingi-lo; `resolution_hint: PREFER_COMPANY` só aparece quando o morador está em `residentsWithCompany`; nenhum `resident_index` duplicado dentro de `resolutions[]` da mesma denúncia | `cli/complaints/complaint-seed-pipeline.spec.ts` | ⬜ Pendente |
| T29 | Documentação completa do CLI | Reescreve `docs/seed-cli.md` (placeholder do T4) com: nova estrutura de pastas, tabela completa de flags (`--residents`/`--companies`/`--complaints`), fluxo interativo (três prompts de quantidade, sem seletor de dataset), exemplos de execução completa e parcial, nota destacada sobre a dependência de `docker compose up minio createbuckets` para `npm run seed` completar quando há denúncias com anexo | `api/docs/seed-cli.md` | ⬜ Pendente |

---

## Grafo de Dependências

```
T1, T2 ──→ T5 ──┬──→ T6 ──→ T7 ──→ T8 ──┬──→ T9, T10 ──→ T11        (Lote 3, empresas)
                │                        └──→ T12..T18 ──→ T19,T20 ──→ T21   (Lotes 4-5, denúncias)
T11, T21 ──────────────────────────────────────────────────────────→ T22, T23  (Lote 6, CLI)
T5 ──────────────────────────────────────────────────────────────→ T24 ──→ T25, T26 ──→ T27  (Lote 7, consumidores)
T23, T27 ──────────────────────────────────────────────────────────→ T28 ──→ T29
```

T3 e T4 (Lote 1) não bloqueiam nada além de si mesmos — são mecânicos e podem ser feitos em paralelo a T5-T8 assim que T1/T2 fecharem.

---

## Notas de Implementação

- **T1 (rename)**: nenhum arquivo fora de `cli/` referencia caminhos internos do pacote por import — só `package.json`, `vitest.config.ts` e `docs/recycling-seed-cli.md` referenciam por *string de caminho* (não import TS), então o rename em si é mecânico; o cuidado real é reajustar a profundidade dos imports relativos internos (`../../src/...` vs `../../../src/...`) conforme o arquivo desce um nível a mais (`cli/companies/services/x.ts` está mais fundo que o antigo `scripts/recycling-companies/services/x.ts`).
- **T2**: mover `fake-phone.ts` para `shared/` é seguro — hoje só depende de `@faker-js/faker`, sem estado nem dependência de `CompanySeed`.
- **T5-T8**: o `read()` novo na interface do writer de moradores é a única API nova em relação ao padrão de `SeedFileWriter`/`ComplaintSeedFileWriter` (que só têm `exists`/`write`) — necessário porque o pool de moradores precisa ser *carregado de volta* quando já existe, não só pulado.
- **T6 (`computeResidentPoolSize`)**: função pura, sem I/O — deve ter spec cobrindo os três casos (só companies, só complaints, ambos) e o piso `MIN_RESIDENTS_PER_CITY`.
- **T10 (teto de 2 por morador)**: `CompanyOwnerAssigner` deve lançar erro claro (não silenciar) se o pool de moradores for pequeno demais para o número de empresas geradas — isso só aconteceria se `computeResidentPoolSize` (T6) e a atribuição real (T10) ficarem dessincronizadas; o erro é a rede de segurança.
- **T11**: a fase de atribuição de donos é a ÚLTIMA do pipeline de empresas (depois de `validateAndRepair`) — a lista de empresas só está "fechada" (reais + sintéticas + reparadas) nesse ponto; atribuir antes seria atribuir donos a empresas que ainda podem ser descartadas pelo reparo.
- **T12-T18**: todos são services puros, sem I/O, cada um com spec isolado — mesma convenção já usada no pacote de empresas (CLAUDE.md: specs co-localizados, sem mocks, fakes reais).
- **T17 (fórmula de quórum duplicada)**: comentário obrigatório no código apontando `src/modules/complaints/workers/quorum-logic.ts` como fonte da verdade — se a fórmula real mudar (ex.: o peso do dono ou o limiar `5`), este arquivo precisa ser atualizado manualmente; **não importar** o arquivo de `workers/` (acoplaria um script de seed a um worker de produção).
- **T18 (resoluções e autor)**: diferente de votos, o autor NÃO é excluído do pool de candidatos a resolver a própria denúncia — reflete o fluxo real de `PATCH /complaints/:id/resolved` (o dono pode encerrar a própria denúncia).
- **T21 (`residentsWithCompany`)**: calculado a partir do `CompanySeedFile` da MESMA cidade, se o arquivo existir no momento da geração (`prisma/seeds/recycling-companies/<slug>.json`) — cobre tanto "gerar ambos numa execução" quanto "gerar empresas antes, denúncias depois, em execuções separadas". Se o arquivo não existir, o Set fica vazio e toda resolução sai `CITIZEN_ONLY` (comportamento correto, não é erro).
- **T23 (Listr2 condicionado por quantidade)**: a resolução de cidade e de moradores fica em tasks únicas no topo da árvore; os ramos usam `enabled: (ctx) => ctx.companiesTarget > 0` / `ctx.complaintsTarget > 0` — não há mais um array de "datasets selecionados", só as quantidades numéricas já resolvidas (flag, prompt ou default) antes de montar a árvore.
- **T25 (compatibilidade com JSONs antigos)**: a branch de fallback (sem `owner_resident_index`) deve ter um comentário explícito marcando que é suporte a dado legado, não uma feature permanente — se algum dia os JSONs antigos forem regenerados, essa branch pode ser removida.
- **T26 (upload real de anexos)**: exige `docker compose up minio createbuckets` rodando antes de `npm run seed` — documentado explicitamente em T29, e vale confirmar manualmente (teste ponta a ponta local) antes de considerar o lote concluído.
- **T28**: é um teste automatizado (spec), não uma validação manual — mesma filosofia de `recycling-seed-pipeline.spec.ts` (fakes, sem rede/disco), mas cobrindo também as garantias novas de coerência status↔votos e do vínculo `PREFER_COMPANY`.
- **T29**: só deve ser escrito depois que o comportamento estiver implementado e testado manualmente pelo menos uma vez de ponta a ponta (CLI → `npm run seed` → conferir no banco/MinIO) — documentação escrita antes do comportamento existir tende a ficar desatualizada rápido.
