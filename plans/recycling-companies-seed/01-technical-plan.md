# Gerador de Empresas de Reciclagem Multi-Cidade — Plano Técnico

---

## 1. Abordagem Arquitetural

**Padrão:** pacote de scripts CLI standalone (Node/tsx), sem dependência do runtime da API (`src/env/index.ts` não é usado — scripts sempre leram env vars diretamente via `process.env` + `dotenv/config`, mantendo o padrão já usado em `fetch-recycling-places.ts` e `seed-prod.ts`). Compartilha tsconfig/Biome/Vitest/package.json do `api` — sem tooling próprio.

**Decisões-chave:**

1. **Arquitetura em camadas com SOLID/DI, espelhando `src/modules/`**: `entities/` (tipos de domínio), `providers/` (interface + implementação para cada API externa — Dependency Inversion), `services/` (lógica de domínio pura, uma responsabilidade por classe), `use-cases/` (orquestração via injeção de construtor, sem container de IoC — mesmo padrão de `CreateCompanyUseCase` recebendo repositórios), `writers/` (saída do arquivo de seed). Nenhum módulo de camada superior depende de implementação concreta — só de interfaces, permitindo trocar implementação (ex.: `GooglePlacesProvider` → outra fonte) sem tocar em use-cases. Deixa o código pronto para uma eventual extração para serviço isolado, sem ser essa a entrega desta etapa.
2. **Sem persistência nova por enquanto**: avaliamos cache de dados brutos em SQLite (`node:sqlite`, nativo do Node 24), mas foi descartado — decisão explícita do usuário: quando houver persistência de dados brutos, ela deve usar **Prisma** (consistência com o resto do stack), não outra ferramenta, e isso é uma fase futura, só depois de validar o fluxo via JSON. Por ora, todo componente é stateless entre execuções (exceto o `Set` em memória do gerador de identidade, escopado a uma única execução do processo).
3. **Dependências novas mínimas, escolhidas por API**: parsing de CLI args via `node:util` `parseArgs` (nativo, Node 24, sem lib nova). `@faker-js/faker` já é devDependency (`^10.4.0`). Para Geocoding, adotamos o SDK oficial `@googlemaps/google-maps-services-js` (nova devDependency, `^3.4.2`, já instalada) — mas **não** para Places: esse SDK só cobre a API legada de Places, não a "Places API (New)" (`places.googleapis.com/v1`) da qual já dependemos (dados estruturados de `regularOpeningHours`, `businessStatus`, `internationalPhoneNumber`). O único SDK oficial para a New Places API (`@googlemaps/places`) está em status **preview** e pressupõe autenticação via ADC/service account, incompatível com a chave simples `GOOGLE_PLACES_API_KEY` já usada via `.env` — por isso o provider de Places continua com `fetch()` cru. Para IBGE (API pública sem SDK), `fetch()` cru também é a única opção.
4. **Um arquivo JSON por cidade** em `prisma/seeds/recycling-companies/<slug>-<uf>.json`, em vez do arquivo único atual — permite cache/idempotência por cidade (reexecutar para uma cidade não afeta as demais).
5. **Faker preenche lacunas, nunca substitui dado real do Google** — regra de composição no mapper: todo campo com valor do Google vence; Faker só age quando o campo é `null`/ausente/vazio.
6. **Geração 100% dinâmica de contexto geográfico por cidade** (Google Geocoding + IBGE) em vez de config estática.
7. **Restrição de negócio herdada**: toda empresa gerada deve satisfazer os schemas Zod já existentes em `src/modules/companies/dtos/companies-dto.ts` — o script não redefine regras de validade, só precisa produzir dados que passem nelas.
8. **Testável sem rede**: toda interface de `providers/` tem uma implementação real (fetch/SDK) e pode receber um fake/stub em teste — `services/` e `use-cases/` são testados com `.spec.ts` co-localizados, sem mocks, seguindo a convenção do repo (`CLAUDE.md`: "Compose the system under test from real constructors").

---

## 2. Modelo de Dados

Nenhuma mudança em `prisma/schema.prisma` — este trabalho é 100% geração de seed data para os modelos já existentes (`Company`, `Address`, `CompanyBusinessHour`, `BusinessHourTimeSlot`, `CompanyWaste`, `CompanyService`, `CompanyValidation`). Nenhuma persistência nova é introduzida nesta etapa (ver decisão-chave #2).

### Contrato do arquivo de seed por cidade (`entities/`)

```typescript
// entities/city-context.ts
interface CityContext {
  city: string;
  cityIbgeId: number;
  state: string;
  stateIbgeId: number;
  stateCode: string;              // 2 letras, ex. "MT"
  bounds: { low: LatLng; high: LatLng };
  center: LatLng;
}

// entities/company-seed.ts
interface CompanySeed {
  _source: {
    google_place_id: string | null;
    rating: number | null;
    types: string[];
    is_ecoponto: boolean;
    synthetic: boolean;
  };
  corporate_name: string;
  business_name: string | null;
  identity: string;               // CPF/CNPJ com dígito verificador válido
  identity_type: "CPF" | "CNPJ";
  company_type: "COMPANY" | "ONG" | "GOVERNMENT" | "COLLECTOR";
  status: boolean;
  email: string | null;
  phones: string[];
  website: string | null;
  started_activity_in: string;    // ISO date
  address: AddressSeed;
  business_hours: BusinessHourSeed[];
  wastes: WasteSeed[];
  services: ServiceSeed[];
}

interface SeedFile {
  _meta: {
    generated_at: string;
    total: number;
    city: string;
    state_code: string;
    queries_used: string[];
  };
  companies: CompanySeed[];
}

// entities/google-place.ts — shape bruto retornado pelo provider de Places (portado de fetch-recycling-places.ts)
interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  regularOpeningHours?: GoogleOpeningHours;
  businessStatus?: string;
  types?: string[];
}
```

`AddressSeed`, `BusinessHourSeed`, `WasteSeed`, `ServiceSeed` seguem exatamente os campos já consumidos hoje por `prisma/seeds/recycling-companies.ts` (`zip_code, street, number, complement, district, city, city_ibge_id, state, state_ibge_id, state_code, latitude, longitude` / `day_of_week, is_open, time_slots[{start_time,end_time}]` / `name, description, price, unit, waste_category_name, quantity`).

### Localização dos arquivos gerados

```
prisma/seeds/recycling-companies/
  rondonopolis-mt.json     # migrado do arquivo legado
  <slug-cidade>-<uf>.json  # um por cidade gerada
```

---

## 3. Arquitetura de Componentes

```
api/scripts/recycling-companies/
  entities/
    city-context.ts               # CityContext, LatLng, LatLngBounds
    company-seed.ts                # CompanySeed, SeedFile, AddressSeed, BusinessHourSeed, WasteSeed, ServiceSeed
    google-place.ts                # GooglePlace, GoogleOpeningHours (shape bruto do provider)

  providers/                       # interface + implementação por API externa (Dependency Inversion)
    places-provider.ts              # interface PlacesProvider
    google-places-provider.ts       # implements PlacesProvider — fetch() cru (Places API New)
    geocoding-provider.ts           # interface GeocodingProvider
    google-geocoding-provider.ts    # implements GeocodingProvider — SDK @googlemaps/google-maps-services-js
    municipio-provider.ts           # interface MunicipioProvider
    ibge-municipio-provider.ts      # implements MunicipioProvider — fetch() cru + match client-side por nome

  services/                        # lógica de domínio pura, uma responsabilidade por classe, sem I/O
    address-parser.ts               # class GoogleAddressParser
    business-hours-parser.ts        # class GoogleBusinessHoursParser
    company-type-classifier.ts      # class CompanyTypeClassifier
    identity-generator.ts           # class BrazilianIdentityGenerator (dígito verificador módulo 11 + Set de unicidade por execução)
    waste-service-generator.ts      # class WasteServiceGenerator
    company-gap-filler.ts           # class CompanyGapFiller
    company-seed-mapper.ts          # class CompanySeedMapper (compõe os anteriores via construtor)
    synthetic-company-generator.ts  # class SyntheticCompanyGenerator

  use-cases/                       # orquestração, injeção via construtor (sem IoC container)
    resolve-city-use-case.ts        # class ResolveCityUseCase(municipioProvider, geocodingProvider)
    fetch-city-companies-use-case.ts # class FetchCityCompaniesUseCase(placesProvider, mapper)
    generate-city-seed-use-case.ts   # class GenerateCitySeedUseCase(resolveCity, fetchCompanies, syntheticGenerator, writer)

  writers/
    seed-file-writer.ts             # interface SeedFileWriter
    json-seed-file-writer.ts        # implements SeedFileWriter — grava prisma/seeds/recycling-companies/<slug>.json

  cli.ts                            # composition root: parseArgs + instancia implementações concretas + injeta nos use-cases
  index.ts                          # entry point (dotenv/config + cli)
  migrate-legacy-seed.ts            # transformação pontual do JSON antigo de Rondonópolis

  requests/                         # .http para inspeção manual (REST Client) — não integra o fluxo do script
    google-places-text-search.http
    google-places-details.http
    google-geocoding.http
    ibge-municipios.http
```

### Interfaces-chave (contratos, sem lógica de negócio)

```typescript
// providers/places-provider.ts
interface PlacesProvider {
  textSearch(query: string, bounds: LatLngBounds, pageToken?: string):
    Promise<{ places: GooglePlace[]; nextPageToken?: string }>;
  placeDetails(placeId: string): Promise<GooglePlace>;
}

// providers/geocoding-provider.ts
interface GeocodingProvider {
  geocodeCity(city: string, stateCode: string):
    Promise<{ center: LatLng; bounds: LatLngBounds }>;
}

// providers/municipio-provider.ts
interface MunicipioProvider {
  fetchByUf(stateCode: string): Promise<IbgeMunicipio[]>;
}

// writers/seed-file-writer.ts
interface SeedFileWriter {
  write(ctx: CityContext, companies: CompanySeed[], meta: SeedFile["_meta"], opts?: { force?: boolean }): void;
}
```

```typescript
// use-cases — classes com injeção via construtor (mesmo padrão de CreateCompanyUseCase)
class ResolveCityUseCase {
  constructor(
    private readonly municipioProvider: MunicipioProvider,
    private readonly geocodingProvider: GeocodingProvider,
  ) {}
  execute(city: string, stateCode: string): Promise<CityContext>;
}

class FetchCityCompaniesUseCase {
  constructor(
    private readonly placesProvider: PlacesProvider,
    private readonly mapper: CompanySeedMapper,
  ) {}
  execute(ctx: CityContext, queries: string[]): Promise<CompanySeed[]>;
}

class GenerateCitySeedUseCase {
  constructor(
    private readonly resolveCity: ResolveCityUseCase,
    private readonly fetchCompanies: FetchCityCompaniesUseCase,
    private readonly syntheticGenerator: SyntheticCompanyGenerator,
    private readonly writer: SeedFileWriter,
  ) {}
  execute(city: string, stateCode: string, opts: { target?: number; force?: boolean }): Promise<void>;
}
```

### Composição (quem chama quem)

`cli.ts` (composition root) instancia as implementações concretas (`GooglePlacesProvider`, `GoogleGeocodingProvider`, `IbgeMunicipioProvider`, os `services/*` e o `JsonSeedFileWriter`), monta os três use-cases injetando essas dependências, e para cada `--city`/`--state` do argv chama `GenerateCitySeedUseCase.execute(...)`, que internamente:

1. `ResolveCityUseCase.execute` → `MunicipioProvider.fetchByUf` + match client-side por nome normalizado + `GeocodingProvider.geocodeCity` → `CityContext`.
2. `FetchCityCompaniesUseCase.execute` → para as 4 queries (`"reciclagem"`, `"cooperativa reciclagem"`, `"ferro velho"`, `"sucata"`, sem cap) chama `PlacesProvider.textSearch`, dedupe por `place.id`, `PlacesProvider.placeDetails` por lugar, `CompanySeedMapper.map` (compõe `GoogleAddressParser` + `GoogleBusinessHoursParser` + `CompanyTypeClassifier` + `CompanyGapFiller` + `WasteServiceGenerator` + `BrazilianIdentityGenerator`) → `CompanySeed[]`.
3. Se `opts.target` exceder o total real, `SyntheticCompanyGenerator` completa (usa os mesmos `CompanyTypeClassifier`-distribution/`WasteServiceGenerator`/`BrazilianIdentityGenerator`).
4. `SeedFileWriter.write` grava o JSON, respeitando `opts.force` para pular o cache de arquivo já existente.

**`BrazilianIdentityGenerator`**: uma única instância criada em `cli.ts` e compartilhada por toda a execução (todas as cidades), pois `Company.identity` tem constraint `@unique` global no Prisma — a unicidade não pode ser escopada por cidade. Escopo de unicidade é só a execução do processo (sem persistência — ver decisão-chave #2); o backstop entre execuções é a constraint `@unique` do banco.

**`WasteServiceGenerator`** importa `CATEGORIES` de `src/modules/wastes/data/waste-categories-base.ts` (import relativo, já que `tsconfig.json` não expõe o alias `@/` fora de `src/`). Usa dois pools: `RECYCLER_CATEGORY_POOL` (papel, plástico, metal, vidro, madeira, têxtil, borracha/pneus, REEE, óleo vegetal) para `COMPANY`/`ONG`/`COLLECTOR`, e `ECOPONTO_CATEGORY_POOL` (adiciona RCD, pilhas/baterias, lâmpadas, óleo mineral, orgânicos) para `GOVERNMENT`/ecopontos.

**Fronteira de responsabilidade**: nenhum módulo aqui grava no banco — a saída é sempre um `SeedFile` em JSON. A gravação no banco continua sendo responsabilidade exclusiva de `prisma/seeds/recycling-companies.ts`.

### Fix no consumidor (`prisma/seeds/recycling-companies.ts`)

Ponto de integração entre o novo gerador e o banco. Mudanças:

1. `DATA_PATH` (arquivo único) → `SEEDS_DIR = resolve("prisma/seeds/recycling-companies")`; itera todos os `.json` via `readdirSync`, agregando `companies` de todos os arquivos.
2. Interface local `CompanySeed` passa a declarar `wastes`/`services` (hoje ausentes, apesar de já existirem no JSON).
3. Remove `DEFAULT_WASTES`/`DEFAULT_SERVICES`; os loops passam a iterar `data.wastes`/`data.services` — a resolução `waste_category_name → id` via `categoryByName` já está correta, só nunca recebeu o array certo.
4. `CompanyValidation.wastes`/`.services` passam a refletir `data.wastes.length > 0`/`data.services.length > 0` em vez de `true` fixo, alinhado com `computeIsCompanyValid` (`wastes || services`) em `src/modules/companies/utils/company-validation-utils.ts`.
5. Preservado sem mudança: bcrypt, `$transaction` por empresa, agrupamento de `business_hours` por dia, raw SQL do PostGIS, idempotência via `company.findUnique({ where: { identity } })`.

### Migração do dataset legado (`migrate-legacy-seed.ts`)

Transformação local, zero chamadas de rede:
- Preserva: `_source`, `corporate_name`, `business_name`, `identity`, `identity_type`, `company_type`, `status`, `email`, `phones`, `website`, `started_activity_in`, `address`, `business_hours`.
- Remove: `is_headquarters`, `accept_appointments` (não existem no Prisma).
- Resíduos: mapeia `name` legado → `waste_category_name` real (`"Papel e Papelão"→"Papel / Papelão"`, `"Plástico"→"Plástico"`, `"Metal"→"Metal / Alumínio"`, `"Vidro"→"Vidro"`), remove `sub_items`/`observations`/`waste_type`, converte `price` string→number, substitui `quantity: "0.00"` pelos valores positivos padrão (500/300/200/300).
- `services` permanece `[]` (válido — regra é OR com `wastes`).
- Saída: `prisma/seeds/recycling-companies/rondonopolis-mt.json`; remove o arquivo legado `prisma/seeds/recycling-companies.json`.

### CLI

```bash
GOOGLE_PLACES_API_KEY=... npx tsx scripts/recycling-companies/index.ts --city="Rondonópolis" --state=MT
npx tsx scripts/recycling-companies/index.ts --city="Cuiabá" --state=MT --city="Campinas" --state=SP
npx tsx scripts/recycling-companies/index.ts --city="Sinop" --state=MT --target=40
npx tsx scripts/recycling-companies/index.ts --city="Rondonópolis" --state=MT --force
```

`package.json`: `"cli": "tsx scripts/recycling-companies/index.ts"` (mesmo nome, novo caminho).

### Arquivos `.http` (REST Client)

Não integram o fluxo de execução — ferramenta de inspeção manual. Usam `{{$dotenv GOOGLE_PLACES_API_KEY}}`, mas essa extensão só lê um `.env` que exista no **mesmo diretório** do arquivo `.http` (confirmado na doc oficial) — como `requests/` não é o diretório do `.env` real (`api/.env`), a solução é um **symlink** `requests/.env -> ../../../.env` (ambiente Linux/Docker, sem preocupação de portabilidade Windows). O symlink é automaticamente ignorado pelo git — a regra `.env` já existente em `.gitignore` cobre qualquer profundidade de diretório, confirmado via `git check-ignore`. Nenhuma chave real é colada em nenhum arquivo `.http`:

- `google-places-text-search.http` — `POST places:searchText`, mesmo field mask de `google-places-provider.ts`.
- `google-places-details.http` — `GET places/{{placeId}}`.
- `google-geocoding.http` — `GET maps/api/geocode/json?address={{city}},{{stateCode}},Brasil` (o provider em código usa o SDK oficial, mas o `.http` continua útil pra inspecionar o payload bruto antes de confiar no `viewport`/`geometry.location` tipado pelo SDK).
- `ibge-municipios.http` — `GET localidades/estados/{{uf}}/municipios` e `GET localidades/municipios/{{municipioId}}` (sem chave).
