import { describe, expect, it } from "vitest";
import type { IbgeMunicipio } from "../../shared/entities/ibge-municipio.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../../shared/providers/geocoding-provider.js";
import type { MunicipioProvider } from "../../shared/providers/municipio-provider.js";
import { ResolveCityUseCase } from "../../shared/use-cases/resolve-city-use-case.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "../providers/places-provider.js";
import { GoogleAddressParser } from "../services/address-parser.js";
import { CompanyGapFiller } from "../services/company-gap-filler.js";
import { CompanyOwnerAssigner } from "../services/company-owner-assigner.js";
import { CompanySeedMapper } from "../services/company-seed-mapper.js";
import { CompanySeedRepairer } from "../services/company-seed-repairer.js";
import { CompanyTypeClassifier } from "../services/company-type-classifier.js";
import { BrazilianIdentityGenerator } from "../services/identity-generator.js";
import { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import { WasteServiceGenerator } from "../services/waste-service-generator.js";
import { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";
import { GenerateCitySeedUseCase } from "./generate-city-seed-use-case.js";

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
	constructor(private readonly placeIds: string[]) {}

	async textSearch(query: string): Promise<PlacesTextSearchResult> {
		if (query !== "reciclagem") return { places: [] };
		return {
			places: this.placeIds.map((id) => ({ id, displayName: { text: id } })),
		};
	}

	async placeDetails(placeId: string) {
		return { id: placeId, displayName: { text: placeId } };
	}
}

function makeUseCase(placeIds: string[]) {
	const mapper = new CompanySeedMapper(
		new GoogleAddressParser(),
		new CompanyTypeClassifier(),
		new CompanyGapFiller(),
		new WasteServiceGenerator(),
		new BrazilianIdentityGenerator(),
	);

	const resolveCity = new ResolveCityUseCase(
		new FakeMunicipioProvider(),
		new FakeGeocodingProvider(),
	);
	const fetchCompanies = new FetchCityCompaniesUseCase(
		new FakePlacesProvider(placeIds),
		mapper,
	);
	const syntheticGenerator = new SyntheticCompanyGenerator(
		new WasteServiceGenerator(),
		new BrazilianIdentityGenerator(),
	);

	return new GenerateCitySeedUseCase(
		resolveCity,
		fetchCompanies,
		syntheticGenerator,
		new CompanySeedRepairer(),
		new CompanyOwnerAssigner(),
	);
}

function makeUsers(count: number): UserSeed[] {
	return Array.from({ length: count }, (_, i) => ({
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
}

function flattenOwnedCompanies(ownedByUser: Map<number, unknown[]>): number {
	let total = 0;
	for (const companies of ownedByUser.values()) total += companies.length;
	return total;
}

describe("generate-city-seed-use-case", () => {
	it("returns only real companies when no target is given", async () => {
		const useCase = makeUseCase(["p1", "p2"]);

		const result = await useCase.execute("Rondonópolis", "MT", makeUsers(10));

		expect(result.realCount).toBe(2);
		expect(result.syntheticCount).toBe(0);
		expect(flattenOwnedCompanies(result.ownedCompaniesByUser)).toBe(2);
	});

	it("pads with synthetic companies up to the target when real count is lower", async () => {
		const useCase = makeUseCase(["p1"]);

		const result = await useCase.execute("Rondonópolis", "MT", makeUsers(10), {
			target: 5,
		});

		expect(result.realCount).toBe(1);
		expect(result.syntheticCount).toBe(4);
		expect(flattenOwnedCompanies(result.ownedCompaniesByUser)).toBe(5);
	});

	it("caps real companies to the target when Google Places finds more than requested", async () => {
		const useCase = makeUseCase(["p1", "p2", "p3"]);

		const result = await useCase.execute("Rondonópolis", "MT", makeUsers(10), {
			target: 2,
		});

		expect(result.realCount).toBe(2);
		expect(result.syntheticCount).toBe(0);
		expect(flattenOwnedCompanies(result.ownedCompaniesByUser)).toBe(2);
	});

	describe("granular phase methods", () => {
		it("resolveCity returns the CityContext for the given city/state", async () => {
			const useCase = makeUseCase([]);

			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			expect(ctx.city).toBe("Rondonópolis");
			expect(ctx.stateCode).toBe("MT");
			expect(ctx.center).toStrictEqual(GEO.center);
		});

		it("fetchRealCompanies returns companies mapped from the places provider", async () => {
			const useCase = makeUseCase(["p1", "p2"]);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const real = await useCase.fetchRealCompanies(ctx);

			expect(real).toHaveLength(2);
			expect(real.every((c) => !c._source.synthetic)).toBe(true);
		});

		it("fetchRealCompanies caps the result to the given target", async () => {
			const useCase = makeUseCase(["p1", "p2", "p3"]);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const real = await useCase.fetchRealCompanies(ctx, 2);

			expect(real).toHaveLength(2);
		});

		it("fetchRealCompanies does not cap when target is undefined or not exceeded", async () => {
			const useCase = makeUseCase(["p1", "p2", "p3"]);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			expect(await useCase.fetchRealCompanies(ctx)).toHaveLength(3);
			expect(await useCase.fetchRealCompanies(ctx, 5)).toHaveLength(3);
		});

		it("generateSynthetic returns exactly target minus realCount companies", async () => {
			const useCase = makeUseCase([]);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			expect(useCase.generateSynthetic(ctx, 2, 5)).toHaveLength(3);
			expect(useCase.generateSynthetic(ctx, 5, 2)).toHaveLength(0);
			expect(useCase.generateSynthetic(ctx, 0, undefined)).toHaveLength(0);
		});

		it("assignOwners distributes companies respecting the 2-per-user cap", async () => {
			const useCase = makeUseCase(["p1", "p2", "p3"]);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");
			const real = await useCase.fetchRealCompanies(ctx);
			const users = makeUsers(2);

			const ownedByUser = useCase.assignOwners(real, users);

			expect(flattenOwnedCompanies(ownedByUser)).toBe(3);
			for (const companies of ownedByUser.values()) {
				expect(companies.length).toBeLessThanOrEqual(2);
			}
		});
	});
});
