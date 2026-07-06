# Gerador de Empresas de Reciclagem Multi-Cidade — Plano de Execução

---

## Ordem de Execução

### Lote 1 — Fundação: entidades e providers (paralelo, sem dependências entre si)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T1 | Entidades e tipos de domínio | `CityContext`, `LatLng`/`LatLngBounds`, `CompanySeed`/`SeedFile`/`AddressSeed`/`BusinessHourSeed`/`WasteSeed`/`ServiceSeed`, `GooglePlace`/`GoogleOpeningHours`, `IbgeMunicipio`/`IbgeUf` | `scripts/recycling-companies/entities/city-context.ts`<br>`scripts/recycling-companies/entities/company-seed.ts`<br>`scripts/recycling-companies/entities/google-place.ts`<br>`scripts/recycling-companies/entities/ibge-municipio.ts` | ✅ Concluído |
| T2 | Providers de dados externos (interface + implementação) | `PlacesProvider`/`GooglePlacesProvider` (fetch cru, Places API New, city-agnostic — bounds por parâmetro); `GeocodingProvider`/`GoogleGeocodingProvider` (SDK `@googlemaps/google-maps-services-js`); `MunicipioProvider`/`IbgeMunicipioProvider` (fetch cru, `estados/{UF}/municipios`, match client-side por nome normalizado, `getUf` isola o aninhamento real da API) | `scripts/recycling-companies/providers/places-provider.ts`<br>`scripts/recycling-companies/providers/google-places-provider.ts`<br>`scripts/recycling-companies/providers/geocoding-provider.ts`<br>`scripts/recycling-companies/providers/google-geocoding-provider.ts`<br>`scripts/recycling-companies/providers/municipio-provider.ts`<br>`scripts/recycling-companies/providers/ibge-municipio-provider.ts` | ✅ Concluído |
| T3 | Arquivos `.http` de inspeção manual (REST Client) | Requests prontos para Google Places (Text Search + Details), Google Geocoding e IBGE municípios, com `@apiKey` placeholder (nunca commitado com valor real) | `scripts/recycling-companies/requests/*.http` | ✅ Concluído |

### Lote 2 — Serviços de domínio (puros, depende de T1)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T4 | Parsers de endereço e horário + specs | `GoogleAddressParser.parse(place, ctx)`, `GoogleBusinessHoursParser.parse(hours)` — portados de `fetch-recycling-places.ts`, parametrizados por `CityContext` | `scripts/recycling-companies/services/address-parser.ts` (+spec)<br>`scripts/recycling-companies/services/business-hours-parser.ts` (+spec) | ✅ Concluído |
| T5 | Classificador de tipo de empresa + spec | `CompanyTypeClassifier.classify(place)` — heurística sobre nome/endereço normalizado: `GOVERNMENT`/ecoponto, `ONG`, `COLLECTOR`/CPF, default `COMPANY`/CNPJ | `scripts/recycling-companies/services/company-type-classifier.ts` (+spec) | ✅ Concluído |
| T6 | Gerador de identidade válida (CPF/CNPJ) + spec | `BrazilianIdentityGenerator` — dígito verificador módulo 11, `nextCpf()`/`nextCnpj()`, `Set` de unicidade por instância/execução; spec testa contra CPFs/CNPJs válidos conhecidos | `scripts/recycling-companies/services/identity-generator.ts` (+spec) | ✅ Concluído |
| T7 | Gerador de resíduos/serviços variados + spec | `WasteServiceGenerator.generateWastes/generateServices` — pools `RECYCLER_CATEGORY_POOL`/`ECOPONTO_CATEGORY_POOL` a partir de `CATEGORIES` (`waste-categories-base.ts`), 2-6 itens distintos por empresa | `scripts/recycling-companies/services/waste-service-generator.ts` (+spec) | ✅ Concluído |
| T8 | Preenchimento de lacunas (gap-filler) + spec | `CompanyGapFiller.fill(place, classification)` — telefone/email/horário sintéticos só quando o Google não retorna | `scripts/recycling-companies/services/company-gap-filler.ts` (+spec) | ✅ Concluído |

### Lote 3 — Composição de domínio (depende do Lote 2)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T9 | Mapper de empresa real → seed + spec | `CompanySeedMapper.map(place, index, ctx)` — compõe T4/T5/T6/T7/T8 via injeção de construtor | `scripts/recycling-companies/services/company-seed-mapper.ts` (+spec) | ✅ Concluído |
| T10 | Gerador de empresa sintética (padding) + spec | `SyntheticCompanyGenerator.generate(index, ctx)` — usado só quando `--target` excede o total real; distribuição plausível de `company_type`/`identity_type` | `scripts/recycling-companies/services/synthetic-company-generator.ts` (+spec) | ✅ Concluído |
| T11 | Writer de seed (interface + JSON) | `SeedFileWriter` (interface), `JsonSeedFileWriter` — `citySlug(ctx)` (inclui UF), grava `prisma/seeds/recycling-companies/<slug>.json`, cache "pula se já existe" | `scripts/recycling-companies/writers/seed-file-writer.ts`<br>`scripts/recycling-companies/writers/json-seed-file-writer.ts` | ✅ Concluído |

### Lote 4 — Orquestração e CLI (depende dos Lotes 1 e 3)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T12 | Use-cases de resolução de cidade e busca de empresas + specs | `ResolveCityUseCase(municipioProvider, geocodingProvider)`; `FetchCityCompaniesUseCase(placesProvider, mapper)` — dedupe por `place.id` | `scripts/recycling-companies/use-cases/resolve-city-use-case.ts` (+spec)<br>`scripts/recycling-companies/use-cases/fetch-city-companies-use-case.ts` (+spec) | ✅ Concluído |
| T13 | Use-case orquestrador + CLI/entry point (composition root) | `GenerateCitySeedUseCase(resolveCity, fetchCompanies, syntheticGenerator, writer)`; `cli.ts` (`node:util` `parseArgs`: `--city`, `--state`, `--target`, `--force`, repetível) instancia implementações concretas e injeta nos use-cases; `index.ts` entry point | `scripts/recycling-companies/use-cases/generate-city-seed-use-case.ts` (+spec)<br>`scripts/recycling-companies/cli.ts`<br>`scripts/recycling-companies/index.ts` | ✅ Concluído |
| T14 | Substituição do script antigo + `package.json` | Remove `scripts/fetch-recycling-places.ts`; atualiza `"seed:fetch"` para o novo `index.ts` | `scripts/fetch-recycling-places.ts` (removido)<br>`package.json` | ✅ Concluído |

### Lote 5 — Consumidor e migração (depende só de T1 — pode rodar em paralelo aos Lotes 2-4)

| # | Ticket | Escopo | Arquivos | Status |
|---|---|---|---|---|
| T15 | Fix do bug no consumidor de seed | Lê `wastes`/`services` reais do JSON em vez de `DEFAULT_WASTES`/`DEFAULT_SERVICES`; itera todos os arquivos de `prisma/seeds/recycling-companies/`; `CompanyValidation.wastes`/`.services` refletem os dados reais | `prisma/seeds/recycling-companies.ts` | ✅ Concluído |
| T16 | Migração do dataset legado de Rondonópolis | Transforma o JSON antigo (shape + `quantity: "0.00"` inválido) para o novo contrato; escreve em `recycling-companies/rondonopolis-mt.json`; remove o arquivo legado; atualiza referências de path em docs de plano existentes | `scripts/recycling-companies/migrate-legacy-seed.ts`<br>`prisma/seeds/recycling-companies.json` (removido)<br>`prisma/seeds/recycling-companies/rondonopolis-mt.json` (novo)<br>`plans/market/03-tdd.md`<br>`plans/market/04-execution-plan.md` | ✅ Concluído |

### Lote 6 — Teste unitário de ponta a ponta (depende de todos os anteriores)

| # | Ticket | Escopo | Status |
|---|---|---|---|
| T17 | Teste unitário de ponta a ponta (pipeline completo) | `recycling-seed-pipeline.spec.ts` — compõe `GenerateCitySeedUseCase` com fakes de todos os providers e um `SeedFileWriter` fake (sem rede, sem disco); assert que todo `CompanySeed` gerado (real e sintético) passa nos schemas Zod de `companies-dto.ts`, que `company_type`/`identity_type` variam, e que nenhuma `identity` se repete. Nome sem sufixo `.e2e.` — não é e2e real (sem rede/banco), é um spec comum descoberto pelo `npm run test` normal | ✅ Concluído |

---

## Grafo de Dependências

```
T1 ──┬──→ T4 ──┐
     ├──→ T5 ──┼──→ T9 ──→ T12 ──→ T13 ──→ T14 ──→ T17
     ├──→ T6 ──┤        │
     └──→ T7 ──┘        │
T4,T5,T6,T7 ──→ T8 ──→ T9
T5,T6,T7 ──────────────┴──→ T10 ──→ T13
T2 ─────────────────────────────→ T12
T11 ─────────────────────────────────→ T13
T3 ───────────────────────────────────────────────────→ T17 (independente, só inspeção manual)
T1 ──→ T15 ──→ T16 ──→ T17
```

---

## Notas de Implementação

- **Pré-requisito para T4+ (specs)**: `vitest.config.ts` tinha `include: ["src/**/*.spec.ts"]` — não descobriria specs em `scripts/`. Ajustado para `include: ["src/**/*.spec.ts", "scripts/**/*.spec.ts"]` antes do primeiro spec ser escrito.
- **T1**: nenhuma persistência nova nesta etapa — entidades são só tipos/interfaces TypeScript, sem tabela/schema associado. Se surgir necessidade futura de persistir dados brutos, será via Prisma, não SQLite/`node:sqlite` (avaliado e descartado para este trabalho).
- **T2 (parsers/providers)**: a heurística de endereço (regex sobre `formattedAddress`) é frágil para formatos fora do padrão BR comum — manter fallback (`"S/N"`, `"Centro"`) já existente no script atual.
- **T2 (IBGE)**: usar `estados/{UF}/municipios`, nunca `?nome=` (confirmado que é ignorado pela API). Sem cache — cada execução busca de novo (decisão consciente, já que não há persistência nesta etapa).
- **T2 (Geocoding SDK)**: `@googlemaps/google-maps-services-js` (devDependency já instalada) é usado só para Geocoding — o mesmo SDK só cobre a API legada de Places; o único SDK oficial da New Places API está em preview e pressupõe ADC/service account, por isso `GooglePlacesProvider` (T2) continua com `fetch()` cru.
- **T6 (identidade)**: unicidade garantida apenas dentro de uma execução do processo (`Set` em memória, sem persistência); entre execuções separadas o backstop é a constraint `@unique` de `Company.identity` no banco — limitação aceita, documentada, não regressão.
- **T5 (classificador)**: `place.types` do Google tende a ser genérico (`point_of_interest`, `establishment`) mesmo para sites geridos por prefeitura — tratar como sinal fraco; o sinal forte é o texto de nome/endereço normalizado (sem acentos, minúsculo).
- **T7 (categorias)**: usar exclusivamente os nomes de `CATEGORIES` em `src/modules/wastes/data/waste-categories-base.ts` — nunca inventar categoria nova, senão `waste_category_name` não resolve para nenhum `WasteCategory.id` em T15.
- **T9 (mapper)**: regra de composição não-negociável — todo campo com valor real do Google vence; Faker só age quando o campo é `null`/ausente/vazio (nome, endereço e geolocalização nunca são fabricados quando há dado real).
- **T12/T13 (use-cases)**: injeção via construtor, sem container de IoC — mesmo padrão de `CreateCompanyUseCase` recebendo repositórios. `cli.ts` é o composition root (equivalente a onde as rotas instanciam repositórios Prisma concretos na app principal).
- **T14**: remover o script antigo só depois que T13 estiver funcionando ponta a ponta — evita período sem `seed:fetch` operante.
- **T15 (fix do consumidor)**: pode e deve ser implementado e testado independentemente do restante do pipeline (só depende do contrato de `CompanySeed` definido em T1) — não bloquear em T9-T14.
- **T16 (migração)**: transformação é local, sem chamadas de rede — não repetir a busca no Google Places para Rondonópolis.
- **T17**: é um teste automatizado (spec), não uma validação manual — usa fakes para todos os providers e para o writer, sem rede real e sem gravar arquivo em disco; a checagem contra os schemas Zod de `companies-dto.ts` é a mesma usada em T9/T10, mas aplicada ao pipeline composto inteiro.
