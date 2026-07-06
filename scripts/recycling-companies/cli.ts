import { parseArgs } from "node:util";
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
import { JsonSeedFileWriter } from "./writers/json-seed-file-writer.js";

interface CliArgs {
	cities: string[];
	states: string[];
	target?: number;
	force: boolean;
}

function parseCliArgs(argv: string[]): CliArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			city: { type: "string", multiple: true },
			state: { type: "string", multiple: true },
			target: { type: "string" },
			force: { type: "boolean", default: false },
		},
	});

	const cities = values.city ?? [];
	const states = values.state ?? [];

	if (cities.length === 0) {
		throw new Error(
			"Informe ao menos uma cidade com --city=<nome> --state=<uf>",
		);
	}
	if (cities.length !== states.length) {
		throw new Error(
			"Cada --city deve ter um --state correspondente, na mesma ordem",
		);
	}

	return {
		cities,
		states,
		target: values.target ? Number(values.target) : undefined,
		force: values.force ?? false,
	};
}

/** Composition root: instancia implementações concretas e injeta nos use-cases. */
export async function runCli(argv: string[]): Promise<void> {
	const { cities, states, target, force } = parseCliArgs(argv);
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
	const writer = new JsonSeedFileWriter();

	const generateCitySeed = new GenerateCitySeedUseCase(
		resolveCity,
		fetchCompanies,
		syntheticGenerator,
		writer,
	);

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		const state = states[i];

		console.log(`\n→ ${city}-${state}`);
		const result = await generateCitySeed.execute(city, state, {
			target,
			force,
		});

		if (!result.written) {
			console.log(
				`  ↷ já existe (${result.path}) — use --force para regenerar`,
			);
			continue;
		}

		console.log(
			`  ✓ ${result.realCount} reais + ${result.syntheticCount} sintéticas = ${
				result.realCount + result.syntheticCount
			} empresas`,
		);
		console.log(`  salvo em: ${result.path}`);
	}
}
