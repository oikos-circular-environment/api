import { parseArgs } from "node:util";
import { intro, outro } from "@clack/prompts";
import { Listr } from "listr2";
import {
	promptAddAnotherState,
	promptCities,
	promptConfirmSelection,
	promptOutputDir,
	promptState,
	promptTarget,
} from "./cli/prompts.js";
import type { CompanySeed } from "./companies/entities/company-seed.js";
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
import type { ComplaintSeed } from "./complaints/entities/complaint-seed.js";
import { ComplaintAttachmentPicker } from "./complaints/services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./complaints/services/complaint-category-picker.js";
import { ComplaintGenerator } from "./complaints/services/complaint-generator.js";
import { ComplaintStatusPicker } from "./complaints/services/complaint-status-picker.js";
import { ResolutionGenerator } from "./complaints/services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./complaints/services/synthetic-geospatial-generator.js";
import { VoteGenerator } from "./complaints/services/vote-generator.js";
import { GenerateCityComplaintsUseCase } from "./complaints/use-cases/generate-city-complaints-use-case.js";
import type { CityContext } from "./shared/entities/city-context.js";
import type { UserSeed } from "./shared/entities/user-seed.js";
import { env } from "./shared/env.js";
import { GoogleGeocodingProvider } from "./shared/providers/google-geocoding-provider.js";
import { IbgeMunicipioProvider } from "./shared/providers/ibge-municipio-provider.js";
import { RunLogger } from "./shared/services/run-logger.js";
import { UserGenerator } from "./shared/services/user-generator.js";
import { ResolveCityUseCase } from "./shared/use-cases/resolve-city-use-case.js";
import { ResolveCityUsersUseCase } from "./shared/use-cases/resolve-city-users-use-case.js";
import {
	DEFAULT_CITY_DATA_DIR,
	JsonCityDataWriter,
} from "./shared/writers/json-city-data-writer.js";

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
	outputDir?: string;
}

function parsePositiveIntFlag(
	value: string | undefined,
	flagName: string,
): number | undefined {
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
	usersFloor?: number;
	companiesTarget: number;
	complaintsTarget: number;
	cityContext?: CityContext;
	users?: UserSeed[];
	realCompanies?: CompanySeed[];
	syntheticCompanies?: CompanySeed[];
	validatedCompanies?: CompanySeed[];
	ownedCompaniesByUser?: Map<number, CompanySeed[]>;
	usersWithCompany?: Set<number>;
	complaintsByUser?: Map<number, ComplaintSeed[]>;
}

/** Loga início/fim/erro de uma etapa no arquivo da execução, sem mudar o que aparece na tela (isso continua por conta do Listr2). */
async function withStep<T>(
	logger: RunLogger,
	city: string,
	title: string,
	fn: () => T | Promise<T>,
): Promise<T> {
	logger.step(city, title, "start");
	try {
		const result = await fn();
		logger.step(city, title, "done");
		return result;
	} catch (err) {
		logger.step(
			city,
			title,
			"error",
			err instanceof Error ? err.message : String(err),
		);
		throw err;
	}
}

function buildCityTasks(
	logger: RunLogger,
	generateCitySeed: GenerateCitySeedUseCase,
	resolveCityUsers: ResolveCityUsersUseCase,
	generateCityComplaints: GenerateCityComplaintsUseCase,
	cityDataWriter: JsonCityDataWriter,
): Listr<CityPipelineCtx> {
	return new Listr<CityPipelineCtx>([
		{
			title: "Resolvendo cidade",
			task: (ctx) =>
				withStep(logger, ctx.city, "Resolvendo cidade", async () => {
					ctx.cityContext = await generateCitySeed.resolveCity(
						ctx.city,
						ctx.stateCode,
					);
				}),
		},
		{
			title: "Gerando moradores da cidade",
			task: (ctx) =>
				withStep(logger, ctx.city, "Gerando moradores da cidade", () => {
					const cityContext = ctx.cityContext as CityContext;
					ctx.users = resolveCityUsers.execute(cityContext, {
						companiesTarget: ctx.companiesTarget,
						complaintsTarget: ctx.complaintsTarget,
						usersFloor: ctx.usersFloor,
					});
				}),
		},
		{
			title: "Empresas de reciclagem",
			enabled: (ctx) => ctx.companiesTarget > 0,
			task: (_ctx, task) =>
				task.newListr([
					{
						title: "Buscando empresas reais no Google Places",
						task: (ctx, subtask) =>
							withStep(
								logger,
								ctx.city,
								"Buscando empresas reais no Google Places",
								async () => {
									const cityContext = ctx.cityContext as CityContext;
									ctx.realCompanies = await generateCitySeed.fetchRealCompanies(
										cityContext,
										ctx.companiesTarget,
									);
									subtask.title = `Empresas reais encontradas: ${ctx.realCompanies.length}`;
								},
							),
					},
					{
						title: "Gerando empresas sintéticas",
						enabled: (ctx) =>
							ctx.companiesTarget > (ctx.realCompanies?.length ?? 0),
						task: (ctx, subtask) =>
							withStep(logger, ctx.city, "Gerando empresas sintéticas", () => {
								const cityContext = ctx.cityContext as CityContext;
								const realCompanies = ctx.realCompanies as CompanySeed[];
								ctx.syntheticCompanies = generateCitySeed.generateSynthetic(
									cityContext,
									realCompanies.length,
									ctx.companiesTarget,
								);
								subtask.title = `Empresas sintéticas geradas: ${ctx.syntheticCompanies.length}`;
							}),
					},
					{
						title: "Validando e corrigindo dados gerados",
						task: (ctx, subtask) =>
							withStep(
								logger,
								ctx.city,
								"Validando e corrigindo dados gerados",
								() => {
									const combined = [
										...(ctx.realCompanies as CompanySeed[]),
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
							),
					},
					{
						title: "Atribuindo donos de empresa",
						task: (ctx) =>
							withStep(logger, ctx.city, "Atribuindo donos de empresa", () => {
								const validatedCompanies =
									ctx.validatedCompanies as CompanySeed[];
								const users = ctx.users as UserSeed[];
								ctx.ownedCompaniesByUser = generateCitySeed.assignOwners(
									validatedCompanies,
									users,
								);
							}),
					},
				]),
		},
		{
			title: "Denúncias",
			enabled: (ctx) => ctx.complaintsTarget > 0,
			task: (_ctx, task) =>
				task.newListr([
					{
						title: "Calculando moradores donos de empresa",
						task: (ctx) =>
							withStep(
								logger,
								ctx.city,
								"Calculando moradores donos de empresa",
								() => {
									ctx.usersWithCompany =
										generateCityComplaints.computeUsersWithCompany(
											ctx.ownedCompaniesByUser ?? new Map(),
										);
								},
							),
					},
					{
						title: "Gerando denúncias",
						task: (ctx, subtask) =>
							withStep(logger, ctx.city, "Gerando denúncias", () => {
								const cityContext = ctx.cityContext as CityContext;
								const users = ctx.users as UserSeed[];
								const usersWithCompany = ctx.usersWithCompany as Set<number>;
								ctx.complaintsByUser =
									generateCityComplaints.generateComplaints(
										cityContext,
										users,
										usersWithCompany,
										ctx.complaintsTarget,
									);
								const totalGenerated = Array.from(
									ctx.complaintsByUser.values(),
								).reduce((sum, complaints) => sum + complaints.length, 0);
								subtask.title = `Denúncias geradas: ${totalGenerated}`;
							}),
					},
				]),
		},
		{
			title: "Escrevendo arquivo de seed da cidade",
			task: (ctx, task) =>
				withStep(
					logger,
					ctx.city,
					"Escrevendo arquivo de seed da cidade",
					() => {
						const cityContext = ctx.cityContext as CityContext;
						const users = ctx.users as UserSeed[];
						const ownedCompaniesByUser = ctx.ownedCompaniesByUser ?? new Map();
						const complaintsByUser = ctx.complaintsByUser ?? new Map();

						const finalUsers: UserSeed[] = users.map((user, i) => ({
							...user,
							companies: ownedCompaniesByUser.get(i) ?? [],
							complaints: complaintsByUser.get(i) ?? [],
						}));

						const result = cityDataWriter.write(
							cityContext,
							{ users: finalUsers },
							{ generated_at: new Date().toISOString() },
						);
						task.title = `Salvo em ${result.path}`;
					},
				),
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
	const resolveCityUsers = new ResolveCityUsersUseCase(new UserGenerator());
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

	const logger = new RunLogger();

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

	const usersFloor =
		flagResidents ??
		(isInteractive ? await promptTarget("moradores") : undefined);
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

	// Um único arquivo por cidade (usuários + empresas + denúncias aninhadas) —
	// o diretório de saída controla onde esse arquivo combinado é gravado.
	const outputDir =
		flagOutputDir ??
		(isInteractive ? await promptOutputDir(DEFAULT_CITY_DATA_DIR) : undefined);

	const cityDataWriter = new JsonCityDataWriter(outputDir);
	const generateCitySeed = new GenerateCitySeedUseCase(
		resolveCity,
		fetchCompanies,
		syntheticGenerator,
		repairer,
		ownerAssigner,
	);

	const generateCityComplaints = new GenerateCityComplaintsUseCase(
		complaintGenerator,
	);

	let hasFailure = false;

	for (const { city, stateCode } of cities) {
		const tasks = buildCityTasks(
			logger,
			generateCitySeed,
			resolveCityUsers,
			generateCityComplaints,
			cityDataWriter,
		);
		try {
			await tasks.run({
				city,
				stateCode,
				usersFloor,
				companiesTarget,
				complaintsTarget,
			});
		} catch (err) {
			// Erro já foi mostrado inline pela task que falhou (ver buildCityTasks);
			// aqui só isolamos a falha desta cidade das demais no mesmo run.
			logger.error(city, err);
			hasFailure = true;
		}
	}

	outro(hasFailure ? "Concluído com falhas." : "Concluído.");
	console.log(`Log da execução: ${logger.filePath}`);

	if (hasFailure) {
		process.exitCode = 1;
	}
}
