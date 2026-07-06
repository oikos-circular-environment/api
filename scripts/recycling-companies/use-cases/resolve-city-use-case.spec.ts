import { describe, expect, it } from "vitest";
import type { IbgeMunicipio } from "../entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../providers/geocoding-provider.js";
import type { MunicipioProvider } from "../providers/municipio-provider.js";
import { ResolveCityUseCase } from "./resolve-city-use-case.js";

function makeMunicipio(nome: string, id: number): IbgeMunicipio {
	return {
		id,
		nome,
		microrregiao: {
			mesorregiao: { UF: { id: 51, sigla: "MT", nome: "Mato Grosso" } },
		},
	};
}

class FakeMunicipioProvider implements MunicipioProvider {
	constructor(private readonly municipios: IbgeMunicipio[]) {}

	async fetchByUf(): Promise<IbgeMunicipio[]> {
		return this.municipios;
	}
}

class FakeGeocodingProvider implements GeocodingProvider {
	constructor(private readonly result: GeocodeResult) {}

	async geocodeCity(): Promise<GeocodeResult> {
		return this.result;
	}
}

describe("resolve-city-use-case", () => {
	it("composes IBGE municipio data with Google geocoding into a CityContext", async () => {
		const municipios = [
			makeMunicipio("Rondonópolis", 5107602),
			makeMunicipio("Cuiabá", 5103403),
		];
		const geo: GeocodeResult = {
			center: { latitude: -16.47, longitude: -54.63 },
			bounds: {
				low: { latitude: -16.72, longitude: -54.78 },
				high: { latitude: -16.22, longitude: -54.35 },
			},
		};

		const useCase = new ResolveCityUseCase(
			new FakeMunicipioProvider(municipios),
			new FakeGeocodingProvider(geo),
		);

		const ctx = await useCase.execute("Rondonópolis", "MT");

		expect(ctx.city).toBe("Rondonópolis");
		expect(ctx.cityIbgeId).toBe(5107602);
		expect(ctx.state).toBe("Mato Grosso");
		expect(ctx.stateIbgeId).toBe(51);
		expect(ctx.stateCode).toBe("MT");
		expect(ctx.bounds).toStrictEqual(geo.bounds);
		expect(ctx.center).toStrictEqual(geo.center);
	});

	it("matches the city name ignoring accents and case", async () => {
		const municipios = [makeMunicipio("Poconé", 5106505)];
		const geo: GeocodeResult = {
			center: { latitude: -16.26, longitude: -56.62 },
			bounds: {
				low: { latitude: -16.28, longitude: -57.03 },
				high: { latitude: -15.93, longitude: -56.61 },
			},
		};

		const useCase = new ResolveCityUseCase(
			new FakeMunicipioProvider(municipios),
			new FakeGeocodingProvider(geo),
		);

		const ctx = await useCase.execute("pocone", "MT");

		expect(ctx.cityIbgeId).toBe(5106505);
	});

	it("throws when the city cannot be resolved against the UF's municipio list", async () => {
		const useCase = new ResolveCityUseCase(
			new FakeMunicipioProvider([makeMunicipio("Cuiabá", 5103403)]),
			new FakeGeocodingProvider({
				center: { latitude: 0, longitude: 0 },
				bounds: {
					low: { latitude: 0, longitude: 0 },
					high: { latitude: 0, longitude: 0 },
				},
			}),
		);

		await expect(useCase.execute("Cidade Inexistente", "MT")).rejects.toThrow();
	});
});
