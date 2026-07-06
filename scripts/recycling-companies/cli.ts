import { parseArgs } from "node:util";
import { intro, outro } from "@clack/prompts";
import { Listr } from "listr2";
import {
	promptAddAnotherCity,
	promptCity,
	promptOutputDir,
	promptOverwrite,
	promptState,
	promptTarget,
} from "./cli/prompts.js";
import type { CityContext } from "./entities/city-context.js";
import type { CompanySeed } from "./entities/company-seed.js";
import { env } from "./env.js";
import { GoogleGeocodingProvider } from "./providers/google-geocoding-provider.js";
import { GooglePlacesProvider } from "./providers/google-places-provider.js";
import { IbgeMunicipioProvider } from "./providers/ibge-municipio-provider.js";
import { GoogleAddressParser } from "./services/address-parser.js";
import { CompanyGapFiller } from "./services/company-gap-filler.js";
import { CompanySeedMapper } from "./services/company-seed-mapper.js";
import { CompanyTypeClassifier } from "./services/company-type-classifier.js";
import { BrazilianIdentityGenerator } from "./services/identity-generator.js";
import { SyntheticCompanyGenerator } from "./services/synthetic-company-generator.js";
import { WasteServiceGenerator } from "./services/waste-service-generator.js";
import { FetchCityCompaniesUseCase } from "./use-cases/fetch-city-companies-use-case.js";
import { GenerateCitySeedUseCase } from "./use-cases/generate-city-seed-use-case.js";
import { ResolveCityUseCase } from "./use-cases/resolve-city-use-case.js";
import {
	DEFAULT_SEEDS_DIR,
	JsonSeedFileWriter,
} from "./writers/json-seed-file-writer.js";

interface CityInput {
	city: string;
	stateCode: string;
}

function parseCliArgs(argv: string[]): {
	cliCities: CityInput[];
	target?: number;
	force?: boolean;
	outputDir?: string;
} {
	const { values } = parseArgs({
		args: argv,
		options: {
			city: { type: "string", multiple: true },
			state: { type: "string", multiple: true },
			target: { type: "string" },
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

	let target: number | undefined;
	if (values.target !== undefined) {
		target = Number(values.target);
		if (!Number.isInteger(target) || target <= 0) {
			throw new Error("--target deve ser um número inteiro positivo");
		}
	}

	return {
		cliCities,
		target,
		force: values.force,
		outputDir: values["output-dir"],
	};
}

async function resolveCitiesInteractively(
	municipioProvider: IbgeMunicipioProvider,
): Promise<CityInput[]> {
	const ufs = await municipioProvider.fetchUfs();
	const cities: CityInput[] = [];

	do {
		const uf = await promptState(ufs);
		const municipios = await municipioProvider.fetchByUf(uf.sigla);
		const municipio = await promptCity(municipios);
		cities.push({ city: municipio.nome, stateCode: uf.sigla });
	} while (await promptAddAnotherCity());

	return cities;
}

interface CityPipelineCtx {
	city: string;
	stateCode: string;
	target?: number;
	force: boolean;
	isInteractive: boolean;
	skipCity?: boolean;
	cityContext?: CityContext;
	realCompanies?: CompanySeed[];
	syntheticCompanies?: CompanySeed[];
}

function buildCityTasks(
	generateCitySeed: GenerateCitySeedUseCase,
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
			title: "Verificando se já existe",
			task: async (ctx, task) => {
				if (ctx.force) return;

				const cityContext = ctx.cityContext as CityContext;
				const { exists, path } = generateCitySeed.checkExisting(cityContext);
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

				ctx.skipCity = true;
				task.skip(
					ctx.isInteractive
						? `já existe em ${path}`
						: `já existe em ${path} — use --force para regenerar`,
				);
			},
		},
		{
			title: "Buscando empresas reais no Google Places",
			enabled: (ctx) => !ctx.skipCity,
			task: async (ctx, task) => {
				const cityContext = ctx.cityContext as CityContext;
				ctx.realCompanies =
					await generateCitySeed.fetchRealCompanies(cityContext);
				task.title = `Empresas reais encontradas: ${ctx.realCompanies.length}`;
			},
		},
		{
			title: "Gerando empresas sintéticas",
			enabled: (ctx) =>
				!ctx.skipCity && (ctx.target ?? 0) > (ctx.realCompanies?.length ?? 0),
			task: (ctx, task) => {
				const cityContext = ctx.cityContext as CityContext;
				const realCompanies = ctx.realCompanies as CompanySeed[];
				ctx.syntheticCompanies = generateCitySeed.generateSynthetic(
					cityContext,
					realCompanies.length,
					ctx.target,
				);
				task.title = `Empresas sintéticas geradas: ${ctx.syntheticCompanies.length}`;
			},
		},
		{
			title: "Escrevendo arquivo de seed",
			enabled: (ctx) => !ctx.skipCity,
			task: (ctx, task) => {
				const cityContext = ctx.cityContext as CityContext;
				const companies = [
					...(ctx.realCompanies as CompanySeed[]),
					...(ctx.syntheticCompanies ?? []),
				];
				const result = generateCitySeed.writeSeed(cityContext, companies, {
					force: ctx.force,
				});

				task.title = `Salvo em ${result.path}`;
			},
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
		target: flagTarget,
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
	const fetchCompanies = new FetchCityCompaniesUseCase(placesProvider, mapper);
	const syntheticGenerator = new SyntheticCompanyGenerator(
		wasteServiceGenerator,
		identityGenerator,
	);

	// Só entra em prompt quando algo estiver faltando E houver um terminal real
	// — evita travar automação/CI sem TTY quando uma flag é omitida.
	const isInteractive = process.stdin.isTTY === true;

	intro("Gerador de empresas de reciclagem");

	let cities = cliCities;
	if (cities.length === 0) {
		if (!isInteractive) {
			throw new Error(
				"Informe --city=<cidade> --state=<uf> (terminal não-interativo, sem TTY para prompts)",
			);
		}
		cities = await resolveCitiesInteractively(municipioProvider);
	}

	const target =
		flagTarget ?? (isInteractive ? await promptTarget() : undefined);
	const outputDir =
		flagOutputDir ??
		(isInteractive ? await promptOutputDir(DEFAULT_SEEDS_DIR) : undefined);

	const writer = new JsonSeedFileWriter(outputDir);
	const generateCitySeed = new GenerateCitySeedUseCase(
		resolveCity,
		fetchCompanies,
		syntheticGenerator,
		writer,
	);

	let hasFailure = false;

	for (const { city, stateCode } of cities) {
		const tasks = buildCityTasks(generateCitySeed);
		try {
			await tasks.run({
				city,
				stateCode,
				target,
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
