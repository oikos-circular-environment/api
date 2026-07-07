import { describe, expect, it } from "vitest";
import {
	companyGeneralRegistrationValidationSchema,
	measurementSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../src/modules/companies/dtos/companies-dto.js";
import type { IbgeMunicipio } from "../shared/entities/ibge-municipio.js";
import type { UserSeed } from "../shared/entities/user-seed.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../shared/providers/geocoding-provider.js";
import type { MunicipioProvider } from "../shared/providers/municipio-provider.js";
import { ResolveCityUseCase } from "../shared/use-cases/resolve-city-use-case.js";
import type { CompanySeed } from "./entities/company-seed.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "./providers/places-provider.js";
import { GoogleAddressParser } from "./services/address-parser.js";
import { CompanyGapFiller } from "./services/company-gap-filler.js";
import { CompanyOwnerAssigner } from "./services/company-owner-assigner.js";
import { CompanySeedMapper } from "./services/company-seed-mapper.js";
import { CompanySeedRepairer } from "./services/company-seed-repairer.js";
import { CompanyTypeClassifier } from "./services/company-type-classifier.js";
import { BrazilianIdentityGenerator } from "./services/identity-generator.js";
import { SyntheticCompanyGenerator } from "./services/synthetic-company-generator.js";
import { WasteServiceGenerator } from "./services/waste-service-generator.js";
import { FetchCityCompaniesUseCase } from "./use-cases/fetch-city-companies-use-case.js";
import { GenerateCitySeedUseCase } from "./use-cases/generate-city-seed-use-case.js";

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

		const generateCitySeed = new GenerateCitySeedUseCase(
			resolveCity,
			fetchCompanies,
			syntheticGenerator,
			new CompanySeedRepairer(),
			new CompanyOwnerAssigner(),
		);

		const users: UserSeed[] = Array.from({ length: 10 }, (_, i) => ({
			full_name: `Usuário ${i}`,
			display_name: `U${i}`,
			phone: "(65) 91234-5678",
			email: `usuario-${i}@oikos.seed`,
			address: {
				zip_code: "78000-000",
				street: "Rua A",
				number: "1",
				complement: null,
				district: "Centro",
				city: "Rondonópolis",
				city_ibge_id: 5107602,
				state: "Mato Grosso",
				state_ibge_id: 51,
				state_code: "MT",
				latitude: -16.47,
				longitude: -54.63,
			},
			companies: [],
			complaints: [],
		}));

		const result = await generateCitySeed.execute("Rondonópolis", "MT", users, {
			target: 12,
		});

		const companies = Array.from(result.ownedCompaniesByUser.values()).flat();

		// 4 reais (place-ecoponto, place-ong, place-collector, place-company) + 8 sintéticas
		expect(result.realCount).toBe(4);
		expect(result.syntheticCount).toBe(8);
		expect(companies).toHaveLength(12);

		for (const seed of companies) {
			assertValidCompanySeed(seed);
		}

		const companyTypes = new Set(companies.map((c) => c.company_type));
		expect(companyTypes.size).toBeGreaterThan(1);

		const realTypes = companies
			.filter((c) => !c._source.synthetic)
			.map((c) => c.company_type);
		expect(realTypes).toStrictEqual([
			"GOVERNMENT",
			"ONG",
			"COLLECTOR",
			"COMPANY",
		]);

		const ecoponto = companies.find(
			(c) => c._source.google_place_id === "place-ecoponto",
		);
		expect(ecoponto?._source.is_ecoponto).toBe(true);

		const collector = companies.find(
			(c) => c._source.google_place_id === "place-collector",
		);
		expect(collector?.identity_type).toBe("CPF");

		const identities = companies.map((c) => c.identity);
		expect(new Set(identities).size).toBe(identities.length);

		for (const [userIndex, companiesForUser] of result.ownedCompaniesByUser) {
			expect(userIndex).toBeGreaterThanOrEqual(0);
			expect(userIndex).toBeLessThan(users.length);
			expect(companiesForUser.length).toBeLessThanOrEqual(2);
		}
	});
});
