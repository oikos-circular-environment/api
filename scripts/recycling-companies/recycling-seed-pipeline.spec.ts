import { describe, expect, it } from "vitest";
import {
	companyGeneralRegistrationValidationSchema,
	measurementSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../src/modules/companies/dtos/companies-dto.js";
import type { CityContext } from "./entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "./entities/company-seed.js";
import type { IbgeMunicipio } from "./entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "./providers/geocoding-provider.js";
import type { MunicipioProvider } from "./providers/municipio-provider.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "./providers/places-provider.js";
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
import type {
	SeedFileWriter,
	WriteResult,
} from "./writers/seed-file-writer.js";

const MUNICIPIO: IbgeMunicipio = {
	id: 5107602,
	nome: "Rondonópolis",
	microrregiao: {
		mesorregiao: { UF: { id: 51, sigla: "MT", nome: "Mato Grosso" } },
	},
};

const GEO: GeocodeResult = {
	center: { latitude: -16.47, longitude: -54.63 },
	bounds: {
		low: { latitude: -16.72, longitude: -54.78 },
		high: { latitude: -16.22, longitude: -54.35 },
	},
};

// Cobre os 4 casos de classificação: GOVERNMENT/ecoponto, ONG, COLLECTOR, COMPANY.
const REAL_PLACES = [
	{
		id: "place-ecoponto",
		displayName: { text: "Ecoponto Municipal Bairro Norte" },
		formattedAddress: "Av. Principal, 500 - Bairro Norte, Rondonópolis - MT",
	},
	{
		id: "place-ong",
		displayName: { text: "Cooperativa de Catadores Nova Esperança" },
		formattedAddress: "Rua das Palmeiras, 10 - Centro, Rondonópolis - MT",
	},
	{
		id: "place-collector",
		displayName: { text: "Ferro Velho do Zé" },
	},
	{
		id: "place-company",
		displayName: { text: "Recicla Fácil Comércio de Recicláveis LTDA" },
		formattedAddress:
			"Rua das Flores, 123 - Centro, Rondonópolis - MT, 78700-000, Brasil",
		nationalPhoneNumber: "(66) 3411-0000",
		regularOpeningHours: {
			periods: [
				{
					open: { day: 1, hour: 8, minute: 0 },
					close: { day: 1, hour: 18, minute: 0 },
				},
			],
		},
	},
];

class FakeMunicipioProvider implements MunicipioProvider {
	async fetchUfs() {
		return [];
	}

	async fetchByUf(): Promise<IbgeMunicipio[]> {
		return [MUNICIPIO];
	}
}

class FakeGeocodingProvider implements GeocodingProvider {
	async geocodeCity(): Promise<GeocodeResult> {
		return GEO;
	}
}

class FakePlacesProvider implements PlacesProvider {
	async textSearch(query: string): Promise<PlacesTextSearchResult> {
		if (query !== "reciclagem") return { places: [] };
		return { places: REAL_PLACES };
	}

	async placeDetails(placeId: string) {
		const place = REAL_PLACES.find((p) => p.id === placeId);
		if (!place) throw new Error(`place not found: ${placeId}`);
		return place;
	}
}

class InMemorySeedFileWriter implements SeedFileWriter {
	public companies: CompanySeed[] = [];
	public meta?: Omit<SeedFileMeta, "total">;

	exists() {
		return { exists: false, path: "/in-memory/seed.json" };
	}

	write(
		_ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
	): WriteResult {
		this.companies = companies;
		this.meta = meta;
		return { written: true, path: "/in-memory/seed.json" };
	}
}

function assertBusinessRulesFor(items: CompanySeed["wastes"]): void {
	for (const item of items) {
		expect(measurementSchema.safeParse(item.unit).success).toBe(true);
		expect(item.price).toBeGreaterThanOrEqual(0);
		expect(item.quantity).toBeGreaterThan(0);
		expect(item.waste_category_name.length).toBeGreaterThan(0);
	}
}

function assertValidCompanySeed(seed: CompanySeed): void {
	expect(
		companyGeneralRegistrationValidationSchema.safeParse(seed).success,
	).toBe(true);
	expect(upsertCompanyAddressSchema.safeParse(seed.address).success).toBe(true);
	expect(
		upsertCompanyBusinessHoursSchema.safeParse({
			business_hours: seed.business_hours,
		}).success,
	).toBe(true);

	assertBusinessRulesFor(seed.wastes);
	assertBusinessRulesFor(seed.services);

	const wasteNames = seed.wastes.map((w) => w.name);
	expect(new Set(wasteNames).size).toBe(wasteNames.length);
	const serviceNames = seed.services.map((s) => s.name);
	expect(new Set(serviceNames).size).toBe(serviceNames.length);
}

describe("recycling-seed-pipeline", () => {
	it("composes the full pipeline (fakes only, no network/disk) into valid, varied, unique CompanySeeds", async () => {
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
			new FakeMunicipioProvider(),
			new FakeGeocodingProvider(),
		);
		const fetchCompanies = new FetchCityCompaniesUseCase(
			new FakePlacesProvider(),
			mapper,
		);
		const syntheticGenerator = new SyntheticCompanyGenerator(
			wasteServiceGenerator,
			identityGenerator,
		);
		const writer = new InMemorySeedFileWriter();

		const generateCitySeed = new GenerateCitySeedUseCase(
			resolveCity,
			fetchCompanies,
			syntheticGenerator,
			writer,
		);

		const result = await generateCitySeed.execute("Rondonópolis", "MT", {
			target: 12,
		});

		// 4 reais (place-ecoponto, place-ong, place-collector, place-company) + 8 sintéticas
		expect(result.realCount).toBe(4);
		expect(result.syntheticCount).toBe(8);
		expect(writer.companies).toHaveLength(12);

		for (const seed of writer.companies) {
			assertValidCompanySeed(seed);
		}

		const companyTypes = new Set(writer.companies.map((c) => c.company_type));
		expect(companyTypes.size).toBeGreaterThan(1);

		const realTypes = writer.companies
			.filter((c) => !c._source.synthetic)
			.map((c) => c.company_type);
		expect(realTypes).toStrictEqual([
			"GOVERNMENT",
			"ONG",
			"COLLECTOR",
			"COMPANY",
		]);

		const ecoponto = writer.companies.find(
			(c) => c._source.google_place_id === "place-ecoponto",
		);
		expect(ecoponto?._source.is_ecoponto).toBe(true);

		const collector = writer.companies.find(
			(c) => c._source.google_place_id === "place-collector",
		);
		expect(collector?.identity_type).toBe("CPF");

		const identities = writer.companies.map((c) => c.identity);
		expect(new Set(identities).size).toBe(identities.length);
	});
});
