import { parseArgs } from "node:util";
import { intro, outro } from "@clack/prompts";
import { Listr } from "listr2";
import {
	promptAddAnotherState,
	promptCities,
	promptConfirmSelection,
	promptOutputDir,
	promptOverwrite,
	promptState,
	promptTarget,
} from "./cli/prompts.js";
import type {
	CompanySeed,
	UnownedCompanySeed,
} from "./companies/entities/company-seed.js";
import { GooglePlacesProvider } from "./companies/providers/google-places-provider.js";
import { GoogleAddressParser } from "./companies/services/address-parser.js";
import { CompanyGapFiller } from "./companies/services/company-gap-filler.js";
import { CompanyOwnerAssigner } from "./companies/services/company-owner-assigner.js";
import { CompanySeedMapper } from "./companies/services/company-seed-mapper.js";
import { CompanySeedRepairer } from "./companies/services/company-seed-repairer.js";
import { CompanyTypeClassifier } from "./companies/services/company-type-classifier.js";
import { BrazilianIdentityGenerator } from "./companies/services/identity-generator.js";
import { SyntheticCompanyGenerator } from "./companies/services/synthetic-company-generator.js";
import { WasteServiceGenerator } from "./companies/services/waste-service-generator.js";
import { FetchCityCompaniesUseCase } from "./companies/use-cases/fetch-city-companies-use-case.js";
import { GenerateCitySeedUseCase } from "./companies/use-cases/generate-city-seed-use-case.js";
import {
	DEFAULT_SEEDS_DIR,
	JsonSeedFileWriter,
} from "./companies/writers/json-seed-file-writer.js";
import type { ComplaintSeed } from "./complaints/entities/complaint-seed.js";
import { ComplaintAttachmentPicker } from "./complaints/services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./complaints/services/complaint-category-picker.js";
import { ComplaintGenerator } from "./complaints/services/complaint-generator.js";
import { ComplaintStatusPicker } from "./complaints/services/complaint-status-picker.js";
import { ResolutionGenerator } from "./complaints/services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./complaints/services/synthetic-geospatial-generator.js";
import { VoteGenerator } from "./complaints/services/vote-generator.js";
import { GenerateCityComplaintsUseCase } from "./complaints/use-cases/generate-city-complaints-use-case.js";
import { JsonComplaintSeedFileWriter } from "./complaints/writers/json-complaint-seed-file-writer.js";
import type { CityContext } from "./shared/entities/city-context.js";
import type { CityResidentSeed } from "./shared/entities/city-resident.js";
import { env } from "./shared/env.js";
import { GoogleGeocodingProvider } from "./shared/providers/google-geocoding-provider.js";
import { IbgeMunicipioProvider } from "./shared/providers/ibge-municipio-provider.js";
import { CityResidentGenerator } from "./shared/services/city-resident-generator.js";
import { ResolveCityResidentsUseCase } from "./shared/use-cases/resolve-city-residents-use-case.js";
import { ResolveCityUseCase } from "./shared/use-cases/resolve-city-use-case.js";
import { JsonCityResidentsFileWriter } from "./shared/writers/json-city-residents-file-writer.js";

/** Sem essas flags nem prompt (não-interativo), o CLI ainda gera algo útil por padrão. */
const DEFAULT_COMPANIES_TARGET = 20;
const DEFAULT_COMPLAINTS_TARGET = 30;

interface CityInput {
	city: string;
	stateCode: string;
}

interface ParsedCliArgs {
	cliCities: CityInput[];
	residents?: number;
	companies?: number;
	complaints?: number;
	force?: boolean;
	outputDir?: string;
}

function parsePositiveIntFlag(value: string | undefined, flagName: string): number | undefined {
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`--${flagName} deve ser um número inteiro (0 ou mais)`);
	}
	return parsed;
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			city: { type: "string", multiple: true },
			state: { type: "string", multiple: true },
			residents: { type: "string" },
			companies: { type: "string" },
			complaints: { type: "string" },
			force: { type: "boolean" },
			"output-dir": { type: "string" },
		},
	});

	const cityFlags = values.city ?? [];
	const stateFlags = values.state ?? [];

	if (cityFlags.length !== stateFlags.length) {
		throw new Error(
			"Cada --city deve ter um --state correspondente, na mesma ordem",
		);
	}

	const cliCities: CityInput[] = cityFlags.map((city, i) => ({
		city,
		stateCode: stateFlags[i],
	}));

	return {
		cliCities,
		residents: parsePositiveIntFlag(values.residents, "residents"),
		companies: parsePositiveIntFlag(values.companies, "companies"),
		complaints: parsePositiveIntFlag(values.complaints, "complaints"),
		force: values.force,
		outputDir: values["output-dir"],
	};
}

/**
 * Loop: escolhe um estado, marca uma ou mais cidades daquele estado
 * (multiselect com busca), e pergunta se quer cidades de outro estado
 * também. Confirmar a lista de cidades sem marcar nenhuma refaz a escolha
 * de estado. Ao final, mostra a lista completa e pede confirmação — se
 * recusada, recomeça a seleção do zero.
 */
async function resolveCitiesInteractively(
	municipioProvider: IbgeMunicipioProvider,
): Promise<CityInput[]> {
	const ufs = await municipioProvider.fetchUfs();

	while (true) {
		const cities: CityInput[] = [];
		let keepGoing = true;
		while (keepGoing) {
			const uf = await promptState(ufs);
			const municipios = await municipioProvider.fetchByUf(uf.sigla);
			const result = await promptCities(municipios);

			if (result.back) continue;

			for (const municipio of result.municipios) {
				cities.push({ city: municipio.nome, stateCode: uf.sigla });
			}

			keepGoing = await promptAddAnotherState();
		}

		if (await promptConfirmSelection(cities)) {
			return cities;
		}
	}
}

interface CityPipelineCtx {
	city: string;
	stateCode: string;
	residentsFloor?: number;
	companiesTarget: number;
	complaintsTarget: number;
	force: boolean;
	isInteractive: boolean;
	cityContext?: CityContext;
	residents?: CityResidentSeed[];
	skipCompanies?: boolean;
	realCompanies?: UnownedCompanySeed[];
	syntheticCompanies?: UnownedCompanySeed[];
	validatedCompanies?: UnownedCompanySeed[];
	ownedCompanies?: CompanySeed[];
	skipComplaints?: boolean;
	residentsWithCompany?: Set<number>;
	complaints?: ComplaintSeed[];
}

function buildCityTasks(
	generateCitySeed: GenerateCitySeedUseCase,
	resolveCityResidents: ResolveCityResidentsUseCase,
	generateCityComplaints: GenerateCityComplaintsUseCase,
): Listr<CityPipelineCtx> {
	return new Listr<CityPipelineCtx>([
		{
			title: "Resolvendo cidade",
			task: async (ctx) => {
				ctx.cityContext = await generateCitySeed.resolveCity(
					ctx.city,
					ctx.stateCode,
				);
			},
		},
		{
			title: "Resolvendo moradores da cidade",
			task: async (ctx) => {
				const cityContext = ctx.cityContext as CityContext;
				ctx.residents = await resolveCityResidents.execute(cityContext, {
					companiesTarget: ctx.companiesTarget,
					complaintsTarget: ctx.complaintsTarget,
					residentsFloor: ctx.residentsFloor,
				});
			},
		},
		{
			title: "Empresas de reciclagem",
			enabled: (ctx) => ctx.companiesTarget > 0,
			task: (_ctx, task) =>
				task.newListr([
					{
						title: "Verificando se já existe",
						task: async (ctx, subtask) => {
							if (ctx.force) return;

							const cityContext = ctx.cityContext as CityContext;
							const { exists, path } =
								generateCitySeed.checkExisting(cityContext);
							if (!exists) return;

							if (ctx.isInteractive) {
								const overwrite = await promptOverwrite(
									ctx.city,
									ctx.stateCode,
									path,
								);
								if (overwrite) {
									ctx.force = true;
									return;
								}
							}

							ctx.skipCompanies = true;
							subtask.skip(
								ctx.isInteractive
									? `já existe em ${path}`
									: `já existe em ${path} — use --force para regenerar`,
							);
						},
					},
					{
						title: "Buscando empresas reais no Google Places",
						enabled: (ctx) => !ctx.skipCompanies,
						task: async (ctx, subtask) => {
							const cityContext = ctx.cityContext as CityContext;
							ctx.realCompanies =
								await generateCitySeed.fetchRealCompanies(cityContext);
							subtask.title = `Empresas reais encontradas: ${ctx.realCompanies.length}`;
						},
					},
					{
						title: "Gerando empresas sintéticas",
						enabled: (ctx) =>
							!ctx.skipCompanies &&
							ctx.companiesTarget > (ctx.realCompanies?.length ?? 0),
						task: (ctx, subtask) => {
							const cityContext = ctx.cityContext as CityContext;
							const realCompanies = ctx.realCompanies as UnownedCompanySeed[];
							ctx.syntheticCompanies = generateCitySeed.generateSynthetic(
								cityContext,
								realCompanies.length,
								ctx.companiesTarget,
							);
							subtask.title = `Empresas sintéticas geradas: ${ctx.syntheticCompanies.length}`;
						},
					},
					{
						title: "Validando e corrigindo dados gerados",
						enabled: (ctx) => !ctx.skipCompanies,
						task: (ctx, subtask) => {
							const combined = [
								...(ctx.realCompanies as UnownedCompanySeed[]),
								...(ctx.syntheticCompanies ?? []),
							];
							const { companies, report } =
								generateCitySeed.validateAndRepair(combined);
							ctx.validatedCompanies = companies;

							if (report.length === 0) {
								subtask.title =
									"Validando e corrigindo dados gerados: nada a corrigir";
								return;
							}

							subtask.title = `Validando e corrigindo dados gerados: ${report.length} ajuste(s)`;
							subtask.output = report.join("\n");
						},
					},
					{
						title: "Atribuindo donos de empresa",
						enabled: (ctx) => !ctx.skipCompanies,
						task: (ctx) => {
							const validatedCompanies =
								ctx.validatedCompanies as UnownedCompanySeed[];
							const residents = ctx.residents as CityResidentSeed[];
							ctx.ownedCompanies = generateCitySeed.assignOwners(
								validatedCompanies,
								residents,
							);
						},
					},
					{
						title: "Escrevendo arquivo de seed de empresas",
						enabled: (ctx) => !ctx.skipCompanies,
						task: (ctx, subtask) => {
							const cityContext = ctx.cityContext as CityContext;
							const companies = ctx.ownedCompanies as CompanySeed[];
							const result = generateCitySeed.writeSeed(
								cityContext,
								companies,
								{ force: ctx.force },
							);

							subtask.title = `Salvo em ${result.path}`;
						},
					},
				]),
		},
		{
			title: "Denúncias",
			enabled: (ctx) => ctx.complaintsTarget > 0,
			task: (_ctx, task) =>
				task.newListr([
					{
						title: "Verificando se já existe",
						task: async (ctx, subtask) => {
							if (ctx.force) return;

							const cityContext = ctx.cityContext as CityContext;
							const { exists, path } =
								generateCityComplaints.checkExisting(cityContext);
							if (!exists) return;

							if (ctx.isInteractive) {
								const overwrite = await promptOverwrite(
									ctx.city,
									ctx.stateCode,
									path,
								);
								if (overwrite) {
									ctx.force = true;
									return;
								}
							}

							ctx.skipComplaints = true;
							subtask.skip(
								ctx.isInteractive
									? `já existe em ${path}`
									: `já existe em ${path} — use --force para regenerar`,
							);
						},
					},
					{
						title: "Calculando moradores donos de empresa",
						enabled: (ctx) => !ctx.skipComplaints,
						task: (ctx) => {
							const cityContext = ctx.cityContext as CityContext;
							ctx.residentsWithCompany =
								generateCityComplaints.computeResidentsWithCompany(
									cityContext,
								);
						},
					},
					{
						title: "Gerando denúncias",
						enabled: (ctx) => !ctx.skipComplaints,
						task: (ctx, subtask) => {
							const cityContext = ctx.cityContext as CityContext;
							const residents = ctx.residents as CityResidentSeed[];
							const residentsWithCompany =
								ctx.residentsWithCompany as Set<number>;
							ctx.complaints = generateCityComplaints.generateComplaints(
								cityContext,
								residents,
								residentsWithCompany,
								ctx.complaintsTarget,
							);
							subtask.title = `Denúncias geradas: ${ctx.complaints.length}`;
						},
					},
					{
						title: "Escrevendo arquivo de seed de denúncias",
						enabled: (ctx) => !ctx.skipComplaints,
						task: (ctx, subtask) => {
							const cityContext = ctx.cityContext as CityContext;
							const complaints = ctx.complaints as ComplaintSeed[];
							const result = generateCityComplaints.writeSeed(
								cityContext,
								complaints,
								{ force: ctx.force },
							);

							subtask.title = `Salvo em ${result.path}`;
						},
					},
				]),
		},
	]);
	// exitOnError (default true): para as tasks restantes DESTA cidade assim
	// que uma falhar — evita erros em cascata de tasks seguintes tentando
	// usar um ctx que nunca foi preenchido. O isolamento entre CIDADES
	// diferentes (uma falhar não aborta as demais) é feito no try/catch de
	// runCli, não aqui.
}

/** Composition root: instancia implementações concretas e injeta nos use-cases. */
export async function runCli(argv: string[]): Promise<void> {
	const {
		cliCities,
		residents: flagResidents,
		companies: flagCompanies,
		complaints: flagComplaints,
		force: flagForce,
		outputDir: flagOutputDir,
	} = parseCliArgs(argv);

	const apiKey = env.GOOGLE_PLACES_API_KEY;

	const placesProvider = new GooglePlacesProvider(apiKey);
	const geocodingProvider = new GoogleGeocodingProvider(apiKey);
	const municipioProvider = new IbgeMunicipioProvider();

	// Compartilhados entre todas as cidades — Company.identity é único globalmente.
	const identityGenerator = new BrazilianIdentityGenerator();
	const wasteServiceGenerator = new WasteServiceGenerator();

	const mapper = new CompanySeedMapper(
		new GoogleAddressParser(),
		new CompanyTypeClassifier(),
		new CompanyGapFiller(),
		wasteServiceGenerator,
		identityGenerator,
	);

	const resolveCity = new ResolveCityUseCase(
		municipioProvider,
		geocodingProvider,
	);
	const resolveCityResidents = new ResolveCityResidentsUseCase(
		new JsonCityResidentsFileWriter(),
		new CityResidentGenerator(),
	);
	const fetchCompanies = new FetchCityCompaniesUseCase(placesProvider, mapper);
	const syntheticGenerator = new SyntheticCompanyGenerator(
		wasteServiceGenerator,
		identityGenerator,
	);
	const repairer = new CompanySeedRepairer();
	const ownerAssigner = new CompanyOwnerAssigner();

	const complaintGenerator = new ComplaintGenerator(
		new ComplaintCategoryPicker(),
		new ComplaintAttachmentPicker(),
		new SyntheticGeospatialGenerator(),
		new ComplaintStatusPicker(),
		new VoteGenerator(),
		new ResolutionGenerator(),
	);

	// Só entra em prompt quando algo estiver faltando E houver um terminal real
	// — evita travar automação/CI sem TTY quando uma flag é omitida.
	const isInteractive = process.stdin.isTTY === true;

	intro("Gerador de seed — empresas de reciclagem e denúncias");

	let cities = cliCities;
	if (cities.length === 0) {
		if (!isInteractive) {
			throw new Error(
				"Informe --city=<cidade> --state=<uf> (terminal não-interativo, sem TTY para prompts)",
			);
		}
		cities = await resolveCitiesInteractively(municipioProvider);
	}

	const residents =
		flagResidents ?? (isInteractive ? await promptTarget("moradores") : undefined);
	const companiesTarget =
		flagCompanies ??
		(isInteractive
			? await promptTarget("empresas", DEFAULT_COMPANIES_TARGET)
			: DEFAULT_COMPANIES_TARGET) ??
		DEFAULT_COMPANIES_TARGET;
	const complaintsTarget =
		flagComplaints ??
		(isInteractive
			? await promptTarget("denúncias", DEFAULT_COMPLAINTS_TARGET)
			: DEFAULT_COMPLAINTS_TARGET) ??
		DEFAULT_COMPLAINTS_TARGET;

	// --output-dir controla só o diretório de empresas (mantém o significado
	// original da flag) — denúncias sempre usam o próprio default
	// (prisma/seeds/complaints). Aplicar o mesmo diretório às duas geraria
	// colisão de nome de arquivo (mesmo slug de cidade, conteúdos diferentes).
	const outputDir =
		flagOutputDir ??
		(isInteractive ? await promptOutputDir(DEFAULT_SEEDS_DIR) : undefined);

	const writer = new JsonSeedFileWriter(outputDir);
	const generateCitySeed = new GenerateCitySeedUseCase(
		resolveCity,
		fetchCompanies,
		syntheticGenerator,
		repairer,
		ownerAssigner,
		writer,
	);

	const generateCityComplaints = new GenerateCityComplaintsUseCase(
		resolveCity,
		resolveCityResidents,
		complaintGenerator,
		new JsonComplaintSeedFileWriter(),
	);

	let hasFailure = false;

	for (const { city, stateCode } of cities) {
		const tasks = buildCityTasks(
			generateCitySeed,
			resolveCityResidents,
			generateCityComplaints,
		);
		try {
			await tasks.run({
				city,
				stateCode,
				residentsFloor: residents,
				companiesTarget,
				complaintsTarget,
				force: flagForce ?? false,
				isInteractive,
			});
		} catch {
			// Erro já foi mostrado inline pela task que falhou (ver buildCityTasks);
			// aqui só isolamos a falha desta cidade das demais no mesmo run.
			hasFailure = true;
		}
	}

	outro(hasFailure ? "Concluído com falhas." : "Concluído.");

	if (hasFailure) {
		process.exitCode = 1;
	}
}
