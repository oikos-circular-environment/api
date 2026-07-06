import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "../entities/company-seed.js";
import type { IbgeMunicipio } from "../entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../providers/geocoding-provider.js";
import type { MunicipioProvider } from "../providers/municipio-provider.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "../providers/places-provider.js";
import { GoogleAddressParser } from "../services/address-parser.js";
import { CompanyGapFiller } from "../services/company-gap-filler.js";
import { CompanySeedMapper } from "../services/company-seed-mapper.js";
import { CompanySeedRepairer } from "../services/company-seed-repairer.js";
import { CompanyTypeClassifier } from "../services/company-type-classifier.js";
import { BrazilianIdentityGenerator } from "../services/identity-generator.js";
import { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import { WasteServiceGenerator } from "../services/waste-service-generator.js";
import type {
	SeedFileWriter,
	WriteResult,
} from "../writers/seed-file-writer.js";
import { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";
import { GenerateCitySeedUseCase } from "./generate-city-seed-use-case.js";
import { ResolveCityUseCase } from "./resolve-city-use-case.js";

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

class FakeSeedFileWriter implements SeedFileWriter {
	public lastWrite?: {
		companies: CompanySeed[];
		meta: Omit<SeedFileMeta, "total">;
	};
	public existsResult = { exists: false, path: "/fake/path.json" };

	exists() {
		return this.existsResult;
	}

	write(
		_ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
	): WriteResult {
		this.lastWrite = { companies, meta };
		return { written: true, path: "/fake/path.json" };
	}
}

function makeUseCase(placeIds: string[], writer: FakeSeedFileWriter) {
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
		writer,
	);
}

describe("generate-city-seed-use-case", () => {
	it("writes only real companies when no target is given", async () => {
		const writer = new FakeSeedFileWriter();
		const useCase = makeUseCase(["p1", "p2"], writer);

		const result = await useCase.execute("Rondonópolis", "MT");

		expect(result.realCount).toBe(2);
		expect(result.syntheticCount).toBe(0);
		expect(writer.lastWrite?.companies).toHaveLength(2);
	});

	it("pads with synthetic companies up to the target when real count is lower", async () => {
		const writer = new FakeSeedFileWriter();
		const useCase = makeUseCase(["p1"], writer);

		const result = await useCase.execute("Rondonópolis", "MT", { target: 5 });

		expect(result.realCount).toBe(1);
		expect(result.syntheticCount).toBe(4);
		expect(writer.lastWrite?.companies).toHaveLength(5);
		const syntheticFlags = writer.lastWrite?.companies.map(
			(c) => c._source.synthetic,
		);
		expect(syntheticFlags).toStrictEqual([false, true, true, true, true]);
	});

	it("does not pad when target is lower than or equal to the real count", async () => {
		const writer = new FakeSeedFileWriter();
		const useCase = makeUseCase(["p1", "p2", "p3"], writer);

		const result = await useCase.execute("Rondonópolis", "MT", { target: 2 });

		expect(result.realCount).toBe(3);
		expect(result.syntheticCount).toBe(0);
	});

	describe("granular phase methods", () => {
		it("resolveCity returns the CityContext for the given city/state", async () => {
			const useCase = makeUseCase([], new FakeSeedFileWriter());

			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			expect(ctx.city).toBe("Rondonópolis");
			expect(ctx.stateCode).toBe("MT");
			expect(ctx.center).toStrictEqual(GEO.center);
		});

		it("fetchRealCompanies returns companies mapped from the places provider", async () => {
			const useCase = makeUseCase(["p1", "p2"], new FakeSeedFileWriter());
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const real = await useCase.fetchRealCompanies(ctx);

			expect(real).toHaveLength(2);
			expect(real.every((c) => !c._source.synthetic)).toBe(true);
		});

		it("generateSynthetic returns exactly target minus realCount companies", async () => {
			const useCase = makeUseCase([], new FakeSeedFileWriter());
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			expect(useCase.generateSynthetic(ctx, 2, 5)).toHaveLength(3);
			expect(useCase.generateSynthetic(ctx, 5, 2)).toHaveLength(0);
			expect(useCase.generateSynthetic(ctx, 0, undefined)).toHaveLength(0);
		});

		it("writeSeed delegates to the writer with the given companies and force option", async () => {
			const writer = new FakeSeedFileWriter();
			const useCase = makeUseCase([], writer);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const result = useCase.writeSeed(ctx, [], { force: true });

			expect(result.written).toBe(true);
			expect(writer.lastWrite?.companies).toStrictEqual([]);
		});

		it("checkExisting delegates to the writer's exists() without side effects", async () => {
			const writer = new FakeSeedFileWriter();
			writer.existsResult = {
				exists: true,
				path: "/fake/rondonopolis-mt.json",
			};
			const useCase = makeUseCase([], writer);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const result = useCase.checkExisting(ctx);

			expect(result).toStrictEqual(writer.existsResult);
			expect(writer.lastWrite).toBeUndefined();
		});
	});
});
