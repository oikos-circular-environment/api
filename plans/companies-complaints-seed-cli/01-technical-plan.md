# CLI de Seed Multi-Domínio — Plano Técnico

---

## 1. Abordagem Arquitetural

Continua sendo um pacote de scripts CLI standalone (Node/tsx), fora do runtime da API principal (não usa `src/env/index.ts`), compartilhando tsconfig/Biome/Vitest/package.json do `api`. A mudança é de **local** (`scripts/recycling-companies/` → `cli/`, raiz de `api/`) e de **escopo** (dois domínios em vez de um, com um pool de moradores compartilhado).

**Decisões-chave:**

1. **Três sub-pacotes por domínio de reaproveitamento, não por "feature"**: `shared/` (o que os dois domínios usam: geografia da cidade, pool de moradores, endereço, telefone fake), `companies/` (específico de empresa), `complaints/` (específico de denúncia). Nenhum módulo de `companies/`/`complaints/` depende de implementação concreta do outro — só de `shared/`. Mantém a arquitetura em camadas já usada (`entities/`, `providers/`, `services/`, `use-cases/`, `writers/`) dentro de cada sub-pacote.
2. **Pool de moradores (`CityResidentSeed`) como a peça central da coesão de dados**: gerado uma vez por cidade, persistido no próprio arquivo (`prisma/seeds/city-residents/<slug>.json`), reaproveitado por ambos os domínios. Isso é o que torna os dados "condizentes para teste" — o mesmo morador pode aparecer como dono de empresa e como autor/votante/resolvedor de denúncia.
3. **Vínculo empresa↔resolvedor garantido por identidade, não por lookup solto**: uma resolução só referencia uma empresa se o morador resolvedor daquele índice for, de fato, dono daquela empresa no mesmo arquivo de moradores/empresas da cidade. Nunca há "escolha aleatória de qualquer empresa da cidade" — isso violaria a regra real de negócio (`SubmitResolutionUseCase`/`CompanyOwnershipChecker`).
4. **Sem persistência nova além de JSON no CLI** — toda a lógica de geração continua produzindo arquivos; quem grava no banco são os consumidores em `prisma/seeds/*.ts`, como já é hoje.
5. **Dependências novas mínimas**: nenhuma lib nova however for `complaints/` — reaproveita `@faker-js/faker` (já devDependency) e os mesmos padrões de `node:util parseArgs`/`@clack/prompts`/`listr2` já usados.
6. **Testável sem rede e sem disco**: todo service novo é puro (sem I/O), testado isoladamente; o pipeline de denúncias ganha um spec de ponta a ponta com fakes, no mesmo espírito de `recycling-seed-pipeline.spec.ts`.
7. **Anexos com upload real**: o consumidor de denúncias usa `makeStorageProvider()` (já existe em `src/modules/common/providers/storage/`) para upload real das imagens movidas para `cli/assets/` — decisão explícita do usuário, mesmo que isso passe a exigir MinIO rodando para `npm run seed` completar com sucesso quando há denúncias com anexo.

---

## 2. Estrutura de Diretórios Final

```
api/cli/
  shared/
    entities/
      city-context.ts                 # LatLng, LatLngBounds, CityContext (movido, inalterado)
      ibge-municipio.ts                # IbgeUf, IbgeMunicipio (movido, inalterado)
      address-seed.ts                  # AddressSeed (RELOCADO de companies/entities/company-seed.ts — agora usado por Company E por CityResidentSeed)
      city-resident.ts                 # CityResidentSeed, CityResidentsFileMeta, CityResidentsFile (NOVO)
    providers/
      geocoding-provider.ts (+google-geocoding-provider.ts)     # movido, inalterado
      municipio-provider.ts (+ibge-municipio-provider.ts)       # movido, inalterado
    services/
      fake-phone.ts                    # movido de companies/services/ — reaproveitado por moradores E empresas
      city-resident-generator.ts (+spec)  # NOVO — gera N moradores com endereço dentro do bounds
    use-cases/
      resolve-city-use-case.ts (+spec)         # movido, inalterado
      resolve-city-residents-use-case.ts (+spec) # NOVO — carrega o arquivo de moradores se existir, senão gera+grava
    writers/
      city-residents-file-writer.ts (+spec)   # NOVO — interface + impl JSON, grava/checa prisma/seeds/city-residents/<slug>.json
    env.ts                             # GOOGLE_PLACES_API_KEY (movido, inalterado — usado por geocoding E places)

  companies/
    entities/
      company-seed.ts                  # CompanySeed ganha owner_resident_index; AddressSeed removido daqui (agora em shared/)
      google-place.ts                  # movido, inalterado
    providers/
      places-provider.ts (+google-places-provider.ts)   # movido, inalterado
    services/
      address-parser.ts (+spec)                # movido, inalterado
      business-hours-parser.ts (+spec)         # movido, inalterado
      company-gap-filler.ts (+spec)            # movido, ajuste de import de generateFakePhone (agora em shared/)
      company-seed-mapper.ts (+spec)           # movido, ganha atribuição de owner_resident_index
      company-seed-repairer.ts (+spec)         # movido, inalterado
      company-type-classifier.ts (+spec)       # movido, inalterado
      identity-generator.ts (+spec)             # movido, inalterado
      synthetic-company-generator.ts (+spec)   # movido, ganha atribuição de owner_resident_index
      waste-service-generator.ts (+spec)       # movido, inalterado
      company-owner-assigner.ts (+spec)        # NOVO — distribui empresas entre moradores, teto de 2 por morador
    use-cases/
      fetch-city-companies-use-case.ts (+spec)     # movido, inalterado
      generate-city-seed-use-case.ts (+spec)       # movido, ganha fase de atribuição de donos
    writers/
      seed-file-writer.ts                      # movido, inalterado
      json-seed-file-writer.ts (+spec)         # movido, inalterado
    migrate-legacy-seed.ts                      # movido, inalterado
    recycling-seed-pipeline.spec.ts             # movido, ajustado para injetar moradores fake

  complaints/
    entities/
      complaint-seed.ts                # NOVO — ComplaintSeed, ComplaintSeedFile, VoteSeed, ResolutionSeed etc. (sem citizens[] embutido — referencia CityResidentsFile)
    services/
      complaint-category-picker.ts (+spec)       # NOVO
      complaint-attachment-picker.ts (+spec)     # NOVO
      synthetic-geospatial-generator.ts (+spec)  # NOVO
      complaint-status-picker.ts (+spec)         # NOVO
      vote-generator.ts (+spec)                  # NOVO — fórmula de quórum duplicada, exclui autor
      resolution-generator.ts (+spec)            # NOVO — só aponta PREFER_COMPANY se o morador já é dono
      complaint-generator.ts (+spec)              # NOVO — compõe os services acima num ComplaintSeed
    use-cases/
      generate-city-complaints-use-case.ts (+spec) # NOVO
    writers/
      complaint-seed-file-writer.ts (+spec)        # NOVO — grava prisma/seeds/complaints/<slug>.json
    complaint-seed-pipeline.spec.ts                # NOVO — ponta a ponta com fakes

  assets/                              # movido de api/src/assets/ (git mv, preserva histórico) e renomeado para um padrão único
    complaint-sample-01.jpg   # era image-test.jpg
    complaint-sample-02.jpg   # era images.jpeg
    complaint-sample-03.jpg   # era "images (1).jpeg"
    complaint-sample-04.jpg   # era landfill.jpg
    complaint-sample-05.jpg   # era plastic-waste-3692513_640.jpg
    complaint-sample-06.jpg   # era plasticbottles_0.jpg
    complaint-sample-07.jpg   # era waste.jpg

  cli/
    prompts.ts                         # movido + promptTarget generalizado (moradores/empresas/denúncias)

  requests/                            # movido — symlink .env ajustado de ../../../.env para ../../.env
    *.http

  cli.ts                                # composition root único — orquestra shared → companies/complaints
  index.ts                              # movido, inalterado
```

Fora de `api/cli/`, arquivos afetados:

```
api/prisma/seeds/
  shared/
    upsert-city-resident.ts             # NOVO — cria/reaproveita User+Profile+Address por morador (idempotente por email), usado por AMBOS os consumidores abaixo
  recycling-companies.ts                # reescrito — lê city-residents, atribui company.user_id via owner_resident_index
  complaints.ts                         # NOVO — lê city-residents + complaints, cria denúncias/anexos/votos/resoluções
  index.ts                              # ganha chamada a seedComplaints, após seedRecyclingCompanies

api/package.json                        # script "cli" aponta para cli/index.ts
api/vitest.config.ts                    # include troca scripts/**/*.spec.ts por cli/**/*.spec.ts
api/docs/recycling-seed-cli.md          # reescrito/renomeado para docs/seed-cli.md
```

---

## 3. Contratos de Dados

### 3.1 `shared/entities/address-seed.ts` (relocado, sem mudança de shape)

```typescript
export interface AddressSeed {
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	city_ibge_id: number;
	state: string;
	state_ibge_id: number;
	state_code: string;
	latitude: number;
	longitude: number;
}
```

### 3.2 `shared/entities/city-resident.ts` (novo)

```typescript
import type { AddressSeed } from "./address-seed.js";

export interface CityResidentSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;                // único dentro do arquivo — padrão <slug-nome>.<index>.<city-slug>@oikos.seed
	address: AddressSeed;         // endereço fabricado dentro do bounds da cidade — "morador de verdade"
}

export interface CityResidentsFileMeta {
	generated_at: string;
	total: number;
	city: string;
	state_code: string;
}

export interface CityResidentsFile {
	_meta: CityResidentsFileMeta;
	residents: CityResidentSeed[];
}
```

### 3.3 `shared/services/city-resident-generator.ts` (novo)

```typescript
export class CityResidentGenerator {
	constructor(private readonly fakePhone: () => string) {}

	generate(ctx: CityContext, count: number): CityResidentSeed[] {
		return Array.from({ length: count }, () => this.generateOne(ctx));
	}

	private generateOne(ctx: CityContext): CityResidentSeed { /* faker.person.*, endereço dentro de ctx.bounds */ }
}
```

Tamanho do pool (função pura, testável, exposta junto ao service ou no use-case): `computeResidentPoolSize({ companiesTarget, complaintsTarget, residentsFloor })` — `residentsFloor` é o valor explícito de `--residents` quando informado pelo usuário (ver §4.4); atua como um PISO adicional, nunca reduz o mínimo necessário para acomodar `companiesTarget`:

```typescript
const MIN_RESIDENTS_PER_CITY = 10;
const MAX_COMPANIES_PER_RESIDENT = 2; // mesma constante de company-owner-assigner.ts — mantidas em sincronia

function computeResidentPoolSize(opts: { companiesTarget?: number; complaintsTarget?: number; residentsFloor?: number }): number {
	const forCompanies = opts.companiesTarget ? Math.ceil(opts.companiesTarget / MAX_COMPANIES_PER_RESIDENT) : 0;
	const forComplaints = opts.complaintsTarget ? Math.ceil(opts.complaintsTarget * 0.6) : 0; // pool de votantes/autores com reuso
	return Math.max(MIN_RESIDENTS_PER_CITY, forCompanies, forComplaints, opts.residentsFloor ?? 0);
}
```

Só entra em jogo quando o arquivo de moradores **ainda não existe** para aquela cidade — se já existe, é carregado como está (ver `resolve-city-residents-use-case.ts`), sem redimensionar. Se `--residents` for explicitamente menor do que `forCompanies` para a mesma execução, o piso de `forCompanies` prevalece (o CLI deve logar uma nota explicando que o pool foi ajustado para cima, nunca falhar silenciosamente nem gerar menos empresas do que pedido).

### 3.4 `shared/use-cases/resolve-city-residents-use-case.ts` (novo)

```typescript
export class ResolveCityResidentsUseCase {
	constructor(
		private readonly writer: CityResidentsFileWriter,
		private readonly generator: CityResidentGenerator,
	) {}

	async execute(ctx: CityContext, opts: { companiesTarget?: number; complaintsTarget?: number; residentsFloor?: number; force?: boolean }): Promise<CityResidentSeed[]> {
		const { exists, path } = this.writer.exists(ctx);
		if (exists && !opts.force) {
			return this.writer.read(ctx); // novo método na interface — lê e retorna o array já existente
		}
		const count = computeResidentPoolSize(opts);
		const residents = this.generator.generate(ctx, count);
		this.writer.write(ctx, residents, { generated_at: new Date().toISOString(), city: ctx.city, state_code: ctx.stateCode });
		return residents;
	}
}
```

`CityResidentsFileWriter` precisa de um método a mais que os writers existentes (`SeedFileWriter`/`ComplaintSeedFileWriter` só têm `exists`/`write`): **`read(ctx): CityResidentSeed[]`**, porque o pool precisa ser carregado de volta para a memória quando já existe (diferente de `Company`/`Complaint`, cujo "já existe" só implica pular a geração — aqui o dado tem que ser reutilizado pelos dois pipelines).

### 3.5 `companies/entities/company-seed.ts` (ajustado)

```typescript
export interface CompanySeed {
	_source: CompanySeedSource;
	corporate_name: string;
	business_name: string | null;
	identity: string;
	identity_type: IdentityType;
	company_type: CompanyType;
	status: boolean;
	email: string | null;
	phones: string[];
	website: string | null;
	started_activity_in: string;
	address: AddressSeed;              // import de shared/entities/address-seed.js
	business_hours: BusinessHourSeed[];
	wastes: WasteSeed[];
	services: ServiceSeed[];
	owner_resident_index: number;      // NOVO — índice em CityResidentsFile.residents; nunca mais de 2 empresas apontam pro mesmo índice
}
```

`email`/`phones`/`website` continuam sendo dados da EMPRESA (contato comercial), distintos do `email`/`phone` do morador dono (contato pessoal) — não há redundância a remover, são conceitos diferentes que hoje coincidem só porque o consumidor antigo inventava tudo junto.

### 3.6 `companies/services/company-owner-assigner.ts` (novo)

```typescript
const MAX_COMPANIES_PER_RESIDENT = 2;

export class CompanyOwnerAssigner {
	/** Distribui round-robin, nunca excede MAX_COMPANIES_PER_RESIDENT por índice.
	 *  Lança erro se companies.length > residents.length * MAX_COMPANIES_PER_RESIDENT
	 *  (sinal de que o pool foi dimensionado errado — ver 3.3). */
	assign(companies: CompanySeed[], residents: CityResidentSeed[]): CompanySeed[] { ... }
}
```

Chamado pelo `GenerateCitySeedUseCase` depois que a lista final de empresas (reais + sintéticas, já reparada) está fechada — atribuição acontece uma vez, no fim do pipeline de empresas, não espalhada em `CompanySeedMapper`/`SyntheticCompanyGenerator` (que continuam desconhecendo moradores; só produzem `CompanySeed` sem o índice, que é preenchido depois).

### 3.7 `complaints/entities/complaint-seed.ts` (novo)

```typescript
import type { Geospatial } from "../../../src/modules/complaints/entities/complaint-entity.js"; // import de tipo, cruzando para src/ — mesmo padrão já usado por waste-service-generator.ts

export type ComplaintStatusSeed = "OPEN" | "RESOLVED" | "CANCELED";
export type ComplaintCaptureModeSeed = "PHOTO"; // os 7 assets são todos imagem — VIDEO fora de escopo
export type ComplaintVoteTypeSeed = "RESOLVED" | "NOT_RESOLVED";
export type ResolutionHint = "PREFER_COMPANY" | "CITIZEN_ONLY";

export interface ComplaintAttachmentSeed {
	asset_file: string;              // nome do arquivo em cli/assets/, ex. "landfill.jpg"
	type: ComplaintCaptureModeSeed;
}

export interface VoteSeed {
	resident_index: number;          // índice em CityResidentsFile.residents — distinto do author_resident_index e dos demais votos da mesma denúncia
	vote_type: ComplaintVoteTypeSeed;
}

export interface ResolutionSeed {
	resident_index: number;          // autor da resolução
	description: string;
	resolution_hint: ResolutionHint; // PREFER_COMPANY só é gerado se este morador já tiver ≥1 empresa no MESMO arquivo de empresas da cidade (quando existir)
}

export interface ComplaintSeed {
	author_resident_index: number;
	date: string;                    // ISO
	observations: string | null;
	geospatial: Geospatial;
	waste_category_names: string[];  // 1-3, nomes canônicos de CATEGORIES
	attachments: ComplaintAttachmentSeed[]; // 0-3
	status: ComplaintStatusSeed;
	votes: VoteSeed[];
	resolutions: ResolutionSeed[];   // vazio se status === "OPEN"; 1-2 se RESOLVED; 0 se CANCELED
}

export interface ComplaintSeedFileMeta {
	generated_at: string;
	total: number;
	city: string;
	state_code: string;
}

export interface ComplaintSeedFile {
	_meta: ComplaintSeedFileMeta;
	complaints: ComplaintSeed[];     // SEM citizens[] embutido — referencia o CityResidentsFile da mesma cidade/slug
}
```

### 3.8 Geração do `geospatial` fabricado (`complaints/services/synthetic-geospatial-generator.ts`)

```typescript
export class SyntheticGeospatialGenerator {
	generate(ctx: CityContext): Geospatial {
		const latitude = faker.number.float({ min: ctx.bounds.low.latitude, max: ctx.bounds.high.latitude, fractionDigits: 6 });
		const longitude = faker.number.float({ min: ctx.bounds.low.longitude, max: ctx.bounds.high.longitude, fractionDigits: 6 });
		return {
			heading: null,
			location: {
				coords: { latitude, longitude, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
				timestamp: faker.date.recent().getTime(),
			},
			addresses: {
				city: ctx.city, district: faker.location.county(), streetNumber: faker.location.buildingNumber(),
				street: faker.location.street(), region: ctx.stateCode, subregion: null, country: "Brasil",
				postalCode: faker.string.numeric(8), name: null, isoCountryCode: "BR", timezone: "America/Sao_Paulo",
				formattedAddress: `${faker.location.street()}, ${ctx.city} - ${ctx.stateCode}`,
			},
		};
	}
}
```

Validado no spec de pipeline contra o `geospatialSchema` REAL (import relativo de `src/modules/complaints/entities/complaint-entity.js`), mesma prática de reaproveitar os schemas Zod reais já usada pelo pipeline de empresas.

### 3.9 `complaints/services/complaint-category-picker.ts` (novo, não reaproveita `WasteServiceGenerator`)

`ComplaintWasteCategory` é só uma tabela de junção M2M (sem preço/quantidade/unidade) — reaproveitar `WasteServiceGenerator` (que gera `WasteSeed`/`ServiceSeed` com esses atributos) não faz sentido semântico. Service novo, minúsculo:

```typescript
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js"; // mesmo import relativo já usado por waste-service-generator.ts

const ALL_CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export class ComplaintCategoryPicker {
	pick(): string[] {
		return faker.helpers.arrayElements(ALL_CATEGORY_NAMES, { min: 1, max: 3 });
	}
}
```

### 3.10 `complaints/services/complaint-status-picker.ts`

Distribuição default (sem requisito explícito do usuário — documentado para fácil ajuste): `OPEN: 55%`, `RESOLVED: 35%`, `CANCELED: 10%`, via `faker.helpers.weightedArrayElement`, mesmo padrão de `TYPE_DISTRIBUTION` em `synthetic-company-generator.ts`.

### 3.11 `complaints/services/vote-generator.ts` — coerência status↔votos

Duplica a fórmula de `src/modules/complaints/workers/quorum-logic.ts` (comentário apontando a fonte da verdade — NÃO importar de `workers/`, isso acoplaria o CLI a um worker de produção):

```typescript
// Mesma fórmula de src/modules/complaints/workers/quorum-logic.ts (duplicada
// deliberadamente — um script de seed não deveria depender de um worker de
// produção). Se a fórmula real mudar, atualizar aqui também.
function calculateWeights(votes: { residentIndex: number; voteType: ComplaintVoteTypeSeed }[], authorIndex: number) {
	let positive = 0, negative = 0;
	for (const vote of votes) {
		const weight = vote.residentIndex === authorIndex ? 2 : 1;
		if (vote.voteType === "RESOLVED") positive += weight; else negative += weight;
	}
	return { positive, negative };
}
```

Regras por status:
- `RESOLVED`: sorteia votantes distintos (excluindo o autor do pool de candidatos — decisão de design, ver riscos) até que `positive >= 5 + negative`, com algum ruído de votos negativos para não gerar sempre o mínimo exato.
- `OPEN`: 0-4 votos, garantindo que a fórmula NÃO atinja quórum.
- `CANCELED`: votos livres (0-3) — cancelamento é ação direta do dono, não depende de quórum.

### 3.12 `complaints/services/resolution-generator.ts` — `PREFER_COMPANY` só quando o morador já é dono

```typescript
export class ResolutionGenerator {
	generate(status: ComplaintStatusSeed, residents: CityResidentSeed[], residentsWithCompany: Set<number>, excludeIndex: number): ResolutionSeed[] {
		if (status !== "RESOLVED") return [];
		const count = faker.number.int({ min: 1, max: 2 });
		// sorteia `count` residentIndex distintos (podendo incluir o autor — a
		// pessoa que denunciou pode também ser quem resolveu, ao contrário dos
		// votos, onde o autor é excluído por design)
		return residentIndexes.map((idx) => ({
			resident_index: idx,
			description: faker.lorem.sentence(),
			resolution_hint: residentsWithCompany.has(idx) && faker.datatype.boolean({ probability: 0.7 })
				? "PREFER_COMPANY" : "CITIZEN_ONLY",
		}));
	}
}
```

`residentsWithCompany` (`Set<number>`) é calculado pelo use-case orquestrador (`GenerateCityComplaintsUseCase`), cruzando o pool de moradores com o `CompanySeedFile` da mesma cidade **se ele existir** (mesma execução do CLI com `--companies --complaints`, ou uma execução anterior que já gerou empresas para essa cidade). Se não existir nenhum arquivo de empresas para a cidade, o Set fica vazio e toda resolução sai `CITIZEN_ONLY` — comportamento correto, não é um erro.

### 3.13 `complaints/services/complaint-attachment-picker.ts`

Lista fixa dos 7 arquivos movidos para `cli/assets/`; distribuição de quantidade por denúncia (não uniforme — a maioria tem pelo menos 1 foto): `0 anexos: 10%`, `1: 60%`, `2: 25%`, `3: 5%`, via `faker.helpers.weightedArrayElement` + `faker.helpers.arrayElements` sem repetição dentro da mesma denúncia.

### 3.14 `complaints/services/complaint-generator.ts` (compositor)

Injeção de construtor dos services 3.8-3.13, compõe um `ComplaintSeed` completo — mesmo papel que `CompanySeedMapper` tem para empresas.

---

## 4. Pipeline de Orquestração

### 4.1 Sem seletor de dataset — quantidade é o único controle

Ajuste feito depois da primeira versão deste plano (feedback do usuário): não existe mais um toggle "gerar Empresas/Denúncias/Ambos". Escolher uma cidade sempre gera o pacote completo e vinculado — moradores, empresas e denúncias — e o que se controla são só as **quantidades**, via três flags numéricas independentes, cada uma com default sensato:

```typescript
const DEFAULT_COMPANIES_TARGET = 20;
const DEFAULT_COMPLAINTS_TARGET = 30;
// não há DEFAULT_RESIDENTS_TARGET fixo — residents é sempre computeResidentPoolSize(...),
// que já considera companiesTarget/complaintsTarget; --residents só ENTRA como um PISO
// adicional sobre esse cálculo, nunca reduz abaixo do que é necessário.
```

`--companies=0` ou `--complaints=0` são a forma explícita de "não gerar esse tipo para esta execução" (ex.: numa cidade que já tem empresas de uma execução anterior, rodar só `--complaints=50 --companies=0` para adicionar mais denúncias sem tocar nas empresas existentes).

### 4.2 Ordem por cidade

```
1. ResolveCityUseCase.execute(city, stateCode)                    → CityContext        [uma vez]
2. ResolveCityResidentsUseCase.execute(ctx, { companiesTarget, complaintsTarget, residentsFloor }) → CityResidentSeed[] [uma vez — carrega se já existe (bloco 3.4), senão gera; nunca gera menos do que o piso necessário para acomodar companiesTarget respeitando o teto de 2/morador]
3. Empresas (se companiesTarget > 0):
   a. checkExisting → pula se já existe e sem --force
   b. FetchCityCompaniesUseCase (Google Places, como hoje)
   c. SyntheticCompanyGenerator (completa até companiesTarget, como hoje)
   d. CompanySeedRepairer (valida/corrige, como hoje)
   e. CompanyOwnerAssigner.assign(companies, residents)      → CompanySeed[] com owner_resident_index preenchido
   f. JsonSeedFileWriter.write
4. Denúncias (se complaintsTarget > 0):
   a. checkExisting → pula se já existe e sem --force
   b. residentsWithCompany: lê o `CompanySeedFile` da mesma cidade em disco (`prisma/seeds/recycling-companies/<slug>.json`) SE existir — tanto faz se foi escrito pelo passo 3 desta mesma execução (roda antes, sequencialmente) ou por uma execução anterior; se nenhum arquivo existir (nunca gerou empresas para essa cidade), Set vazio
   c. ComplaintGenerator gera N ComplaintSeed (complaintsTarget), usando o MESMO pool de residents da etapa 2
   d. ComplaintSeedFileWriter.write
```

Uma única resolução de cidade e de moradores por cidade, independente de quais quantidades forem pedidas — evita chamar Geocoding duas vezes e garante que empresas sintéticas e denúncias fabricadas compartilhem exatamente o mesmo bounds e o mesmo pool de pessoas.

### 4.3 Listr2 — uma árvore por cidade, passos condicionados à quantidade pedida

```
Resolvendo cidade
Resolvendo moradores da cidade
├─ [companiesTarget > 0] Verificando se já existe → Buscando no Google Places → Sintéticas → Validando → Atribuindo donos → Escrevendo
└─ [complaintsTarget > 0] Verificando se já existe → Gerando denúncias → Escrevendo
```

Implementação: uma única `Listr<CityPipelineCtx>` por cidade; tasks usam `enabled: (ctx) => ctx.companiesTarget > 0` / `ctx.complaintsTarget > 0` — mesma ideia de antes, só que a condição agora é numérica, não um array de "datasets" selecionados.

### 4.4 CLI — flags (`cli.ts` / `cli/prompts.ts`)

```typescript
parseArgs({
	options: {
		city: { type: "string", multiple: true },
		state: { type: "string", multiple: true },
		residents: { type: "string" },        // NOVO — piso de moradores; opcional, auto-computado se omitido
		companies: { type: "string" },        // RENOMEADO de --target — quantidade de empresas (era boolean numa versão anterior deste plano; agora é numérico, substituindo --target)
		complaints: { type: "string" },        // RENOMEADO de --complaints-target — quantidade de denúncias
		force: { type: "boolean" },
		"output-dir": { type: "string" },
	},
});
```

`--target`/`--complaints-target` (nomes usados numa versão anterior deste plano) NÃO existem mais — `--companies`/`--complaints` os substituem com o mesmo papel (quantidade-alvo), agora simétricos entre si e com `--residents`.

Modo interativo (sem as respectivas flags, com TTY): três prompts numéricos em sequência, reaproveitando `promptTarget(label, defaultValue?)` (generalização do prompt já existente) — `promptTarget("moradores")`, `promptTarget("empresas", DEFAULT_COMPANIES_TARGET)`, `promptTarget("denúncias", DEFAULT_COMPLAINTS_TARGET)`. Enter aceita o default sugerido; `0` desliga aquele tipo para a cidade atual. Modo não-interativo sem flags usa os defaults diretamente, sem prompt.

Não há mais `promptDatasets()`/`resolveDatasets()`/tipo `Dataset` — removidos desta versão do plano.

---

## 5. Consumidores Prisma

### 5.1 `prisma/seeds/shared/upsert-city-resident.ts` (novo, compartilhado pelos dois consumidores)

Evita duplicar a lógica de "criar ou reaproveitar User+Profile+Address por email" entre `recycling-companies.ts` e `complaints.ts` — crítico para que, quando um morador aparece nos dois arquivos (dono de empresa E autor/votante de denúncia), a MESMA linha de `User` seja reaproveitada (não duas linhas com o mesmo morador fictício):

```typescript
export async function upsertCityResident(
	prisma: PrismaClient,
	resident: CityResidentSeed,
	passwordHash: string,
): Promise<{ userId: string }> {
	const existing = await prisma.user.findUnique({ where: { email: resident.email }, select: { id: true } });
	if (existing) return { userId: existing.id };

	const address = await prisma.address.create({ data: { ...resident.address } });
	await prisma.$executeRaw`UPDATE "addresses" SET "location" = ST_SetSRID(ST_Point(${resident.address.longitude}, ${resident.address.latitude}), 4326) WHERE "id" = ${address.id}`;

	const user = await prisma.user.create({
		data: {
			email: resident.email,
			password: passwordHash,
			profile: {
				create: { full_name: resident.full_name, display_name: resident.display_name, phone: resident.phone, address_id: address.id },
			},
		},
	});
	return { userId: user.id };
}
```

Buscar por email primeiro (em vez de tentar criar e capturar erro de unique constraint) mantém o padrão idempotente já usado em `recycling-companies.ts` (`findUnique` antes de `create`).

`Profile.profile_image_id` fica `null` (campo opcional) — este seed não gera `ProfileImage`; as imagens de `cli/assets/` são usadas exclusivamente como anexo de denúncia (`ComplaintAttachment`), nunca como avatar. Mesma decisão vale para `Company.avatar_id` no consumidor de empresas (§5.2) — nenhuma empresa gerada recebe `CompanyAvatar`.

### 5.2 `prisma/seeds/recycling-companies.ts` — mudanças

Hoje cria um `User` descartável por empresa (`${slug}.${i+1}@oikos.seed`). Passa a:
1. Ler `prisma/seeds/city-residents/<slug>.json` correspondente a cada arquivo de empresas (mesmo slug de cidade).
2. Para cada `CompanySeed`, resolver `residents[company.owner_resident_index]` e chamar `upsertCityResident(...)` — **reaproveitando o mesmo `userId`** se dois `CompanySeed` (até 2, pelo teto do assigner) apontarem para o mesmo morador.
3. Usar esse `userId` como `company.user_id`, no lugar de criar um `user` novo inline.

Resto do fluxo (Address da EMPRESA — que é um endereço comercial diferente do endereço do morador —, `CompanyBusinessHour`, `CompanyWaste`/`CompanyService`, `CompanyValidation`, idempotência por `identity`, `SEED_DRY_RUN`) permanece igual.

**Compatibilidade com arquivos antigos**: JSONs gerados antes desta mudança não têm `owner_resident_index` nem um `city-residents` correspondente. O consumidor deve tratar a ausência de `owner_resident_index` (`undefined`) caindo no comportamento ANTIGO (criar um user descartável inline) só para esse caso — não é vale a pena reprocessar/migrar os JSONs antigos (nenhum incentivo: são poucos e continuam funcionando). Documentar isso como uma branch explícita e temporária no consumidor, não como suporte permanente a dois formatos.

### 5.3 `prisma/seeds/complaints.ts` (novo)

```typescript
const SEEDS_DIR = resolve("prisma/seeds/complaints");
const RESIDENTS_DIR = resolve("prisma/seeds/city-residents");

export async function seedComplaints(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const passwordHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD, 10);
	const storageProvider = makeStorageProvider();

	const wasteCategories = await prisma.wasteCategory.findMany({ select: { id: true, name: true } });
	const categoryByName = new Map(wasteCategories.map((c) => [c.name, c.id]));

	for (const file of allComplaintFiles) {
		const { complaints, _meta } = readComplaintSeedFile(file);
		const residents = readCityResidentsFile(_meta.city, _meta.state_code); // mesmo slug

		// materializa User+Profile+Address de cada morador referenciado (lazy —
		// só quem é de fato citado por author/vote/resolution nesta cidade)
		const residentUserIds = new Map<number, string>();
		async function resolveResidentUserId(index: number): Promise<string> {
			if (!residentUserIds.has(index)) {
				const { userId } = await upsertCityResident(prisma, residents[index], passwordHash);
				residentUserIds.set(index, userId);
			}
			return residentUserIds.get(index)!;
		}

		for (const seed of complaints) {
			await prisma.$transaction(async (tx) => {
				const authorUserId = await resolveResidentUserId(seed.author_resident_index);

				const complaint = await tx.complaint.create({
					data: {
						user_id: authorUserId, status: seed.status, date: new Date(seed.date),
						observations: seed.observations, geospatial: seed.geospatial as Prisma.InputJsonValue,
						waste_categories: { create: seed.waste_category_names.map((name) => categoryByName.get(name)).filter(Boolean).map((waste_category_id) => ({ waste_category_id })) },
					},
				});

				const { latitude, longitude } = seed.geospatial.location.coords;
				await tx.$executeRaw`UPDATE "complaints" SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography WHERE "id" = ${complaint.id}`;

				for (const att of seed.attachments) {
					const fileContent = readFileSync(resolve("cli/assets", att.asset_file));
					const filePath = `complaints/${complaint.id}/${Date.now()}-${att.asset_file}`;
					const uploaded = await storageProvider.uploadFile(filePath, fileContent);
					if (!uploaded) continue;
					const { url } = await storageProvider.getFileUrl(filePath);
					await tx.complaintAttachment.create({ data: { complaint_id: complaint.id, url, file_name: att.asset_file, path: filePath, base64: fileContent.toString("base64"), type: att.type, metadata: null } });
				}

				for (const vote of seed.votes) {
					const voterUserId = await resolveResidentUserId(vote.resident_index);
					await tx.complaintVote.create({ data: { complaint_id: complaint.id, user_id: voterUserId, vote_type: vote.vote_type } });
				}

				for (const res of seed.resolutions) {
					const resolverUserId = await resolveResidentUserId(res.resident_index);
					let companyId: string | null = null;
					if (res.resolution_hint === "PREFER_COMPANY") {
						const owned = await tx.company.findFirst({ where: { user_id: resolverUserId }, select: { id: true } });
						companyId = owned?.id ?? null;
					}
					await tx.complaintResolution.create({ data: { complaint_id: complaint.id, resolver_user_id: resolverUserId, description: res.description, company_id: companyId } });
				}
			});
		}
	}
}
```

Ponto-chave: `resolution_hint === "PREFER_COMPANY"` dispara uma busca por `company.user_id === resolverUserId` (a própria empresa do morador, se existir no banco NESTE MOMENTO — pode não existir se o pipeline de empresas nunca rodou para essa cidade, mesmo que o gerador tenha marcado a intenção). Isso é o único ponto em que o consumidor precisa tocar o banco para confirmar algo que o gerador só sugeriu — e é seguro por construção, porque `resolverUserId` só chega aqui como PREFER_COMPANY quando o GERADOR já sabia (na hora de gerar o JSON) que aquele morador era dono de empresa; o `findFirst` é só uma formalidade para pegar o `company.id` de verdade (o gerador não tem esse id, só sabia que "esse morador tem empresa" via `residentsWithCompany`).

### 5.4 `makeStorageProvider()` chamado de dentro de `prisma/seeds/complaints.ts` — sem atrito

`prisma/seeds/index.ts` já importa `../../src/env/index.ts`, cujo schema Zod já exige as env vars de `STORAGE_PROVIDER`/MinIO quando aplicável — ou seja, `npm run seed` já falha sem elas presentes, independente deste trabalho. Chamar `makeStorageProvider()` daqui não introduz exigência nova de variável de ambiente, só a exigência de infraestrutura **rodando de fato** (MinIO respondendo) — que é a decisão já tomada e deve ser documentada em `docs/seed-cli.md`/`CLAUDE.md`.

### 5.5 Ordem em `prisma/seeds/index.ts`

```typescript
await seedWasteCategories(prisma);
await seedRecyclingCompanies(prisma); // cria residents-que-são-donos ANTES de complaints rodar
await seedComplaints(prisma);          // reaproveita esses mesmos residents via upsertCityResident (idempotente por email)
```

---

## 6. Riscos e Gotchas

1. **`@@unique([complaint_id, resolver_user_id, company_id])` com `company_id` nulo.** Postgres trata `NULL` como distinto em constraints únicas — duas resoluções da mesma denúncia pelo mesmo morador com `company_id: null` não violariam a constraint do banco (só a checagem de aplicação, que não roda aqui). O gerador já evita isso por construção (no máximo 1 `ResolutionSeed` por `resident_index` na mesma denúncia) — vale um teste explícito no spec do pipeline confirmando essa garantia.
2. **Autor votando na própria denúncia.** Decisão de design: excluído do pool de votantes elegíveis (não é regra de negócio, é só para não gerar dado estranho por padrão). Já não se aplica a resoluções — o autor PODE resolver a própria denúncia (reflete o fluxo real de "dono encerra a própria denúncia").
3. **Dimensionamento do pool de moradores entre execuções separadas para a mesma cidade.** Se uma execução posterior pedir `--complaints=200` para uma cidade cujo pool de moradores foi dimensionado numa execução anterior só para `--companies=10` (pool pequeno), o pool carregado (§3.4, sem redimensionar) pode ficar pequeno para tantas denúncias — aceito por design; se o usuário quiser um pool maior, `--force` regenera o pool de moradores (mesma flag genérica já usada pelos demais writers — regenerar moradores nesse caso também invalida a atribuição de donos já gravada nas empresas existentes, então `--force` aqui é uma operação deliberada, não o padrão).
4. **Volume de upload real ao rodar `npm run seed`.** Muitas denúncias × até 3 anexos cada = muitos uploads sequenciais ao MinIO. Sem paralelismo nesta entrega (fora de escopo) — registrar como possível follow-up se perceptível na prática.
5. **`seedComplaints` sem `seedRecyclingCompanies` ter rodado antes.** `PREFER_COMPANY` sempre cai para `company_id: null` (nenhuma empresa encontrada) — comportamento correto, não é erro; vale um comentário inline explícito no consumidor.
6. **Compatibilidade com JSONs de empresa já gerados antes desta mudança** (sem `owner_resident_index`). Ver 5.2 — branch explícita e temporária no consumidor, não suporte permanente a dois formatos.
7. **`hazard_level` de categoria de denúncia.** Não precisa de geração adicional — vem via join com `WasteCategory` no momento da leitura; só é preciso confirmar no spec que toda categoria escolhida existe de fato em `CATEGORIES` (mesma prática de `resolvePool` em `waste-service-generator.ts`).
