import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "../providers/places-provider.js";
import type { PlaceMapper } from "./fetch-city-companies-use-case.js";
import { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";

function makeCtx(): CityContext {
	return {
		city: "Rondonópolis",
		cityIbgeId: 5107602,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -16.72, longitude: -54.78 },
			high: { latitude: -16.22, longitude: -54.35 },
		},
		center: { latitude: -16.47, longitude: -54.63 },
	};
}

class FakePlacesProvider implements PlacesProvider {
	public detailsCalls: string[] = [];

	constructor(private readonly resultsByQuery: Record<string, GooglePlace[]>) {}

	async textSearch(query: string): Promise<PlacesTextSearchResult> {
		return { places: this.resultsByQuery[query] ?? [] };
	}

	async placeDetails(placeId: string): Promise<GooglePlace> {
		this.detailsCalls.push(placeId);
		return { id: placeId, rating: 5 };
	}
}

class FakeMapper implements PlaceMapper {
	map(place: GooglePlace, ctx: CityContext): CompanySeed {
		return {
			_source: {
				google_place_id: place.id,
				rating: place.rating ?? null,
				types: [],
				is_ecoponto: false,
				synthetic: false,
			},
			corporate_name: `mapped-${place.id}`,
			business_name: null,
			identity: `id-${place.id}`,
			identity_type: "CNPJ",
			company_type: "COMPANY",
			status: true,
			email: null,
			phones: [],
			website: null,
			started_activity_in: new Date().toISOString(),
			address: {
				zip_code: "00000-000",
				street: "",
				number: "",
				complement: null,
				district: "",
				city: ctx.city,
				city_ibge_id: ctx.cityIbgeId,
				state: ctx.state,
				state_ibge_id: ctx.stateIbgeId,
				state_code: ctx.stateCode,
				latitude: ctx.center.latitude,
				longitude: ctx.center.longitude,
			},
			business_hours: [],
			wastes: [],
			services: [],
		};
	}
}

describe("fetch-city-companies-use-case", () => {
	it("dedupes places returned by multiple queries before mapping", async () => {
		const provider = new FakePlacesProvider({
			reciclagem: [{ id: "p1" }, { id: "p2" }],
			sucata: [{ id: "p2" }, { id: "p3" }],
		});

		const useCase = new FetchCityCompaniesUseCase(provider, new FakeMapper());
		const result = await useCase.execute(makeCtx(), ["reciclagem", "sucata"]);

		expect(result.map((c) => c._source.google_place_id)).toStrictEqual([
			"p1",
			"p2",
			"p3",
		]);
		expect(provider.detailsCalls).toStrictEqual(["p1", "p2", "p3"]);
	});

	it("returns an empty array when no query yields results", async () => {
		const provider = new FakePlacesProvider({});
		const useCase = new FetchCityCompaniesUseCase(provider, new FakeMapper());

		const result = await useCase.execute(makeCtx(), ["reciclagem"]);

		expect(result).toStrictEqual([]);
	});
});
