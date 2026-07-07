import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IbgeMunicipio, IbgeUf } from "../../shared/entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../../shared/providers/geocoding-provider.js";
import type { MunicipioProvider } from "../../shared/providers/municipio-provider.js";
import { CityResidentGenerator } from "../../shared/services/city-resident-generator.js";
import { citySlug } from "../../shared/services/city-slug.js";
import { ResolveCityResidentsUseCase } from "../../shared/use-cases/resolve-city-residents-use-case.js";
import { ResolveCityUseCase } from "../../shared/use-cases/resolve-city-use-case.js";
import type {
	CityResidentsFile,
	CityResidentSeed,
	CityResidentsFileMeta,
} from "../../shared/entities/city-resident.js";
import type {
	CityResidentsFileWriter,
	ExistsResult as ResidentsExistsResult,
	WriteResult as ResidentsWriteResult,
} from "../../shared/writers/city-residents-file-writer.js";
import { ComplaintAttachmentPicker } from "../services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "../services/complaint-category-picker.js";
import { ComplaintGenerator } from "../services/complaint-generator.js";
import { ComplaintStatusPicker } from "../services/complaint-status-picker.js";
import { ResolutionGenerator } from "../services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "../services/synthetic-geospatial-generator.js";
import { VoteGenerator } from "../services/vote-generator.js";
import type {
	ComplaintSeed,
	ComplaintSeedFileMeta,
} from "../entities/complaint-seed.js";
import type {
	ComplaintSeedFileWriter,
	ExistsResult,
	WriteResult,
} from "../writers/complaint-seed-file-writer.js";
import { GenerateCityComplaintsUseCase } from "./generate-city-complaints-use-case.js";

function makeMunicipio(nome: string, id: number): IbgeMunicipio {
	return {
		id,
		nome,
		microrregiao: {
			mesorregiao: { UF: { id: 51, sigla: "MT", nome: "Mato Grosso" } },
		},
	};
}

const GEO: GeocodeResult = {
	center: { latitude: -16.47, longitude: -54.63 },
	bounds: {
		low: { latitude: -16.72, longitude: -54.78 },
		high: { latitude: -16.22, longitude: -54.35 },
	},
};

class FakeMunicipioProvider implements MunicipioProvider {
	async fetchUfs(): Promise<IbgeUf[]> {
		return [];
	}
	async fetchByUf(): Promise<IbgeMunicipio[]> {
		return [makeMunicipio("Rondonópolis", 5107602)];
	}
}

class FakeGeocodingProvider implements GeocodingProvider {
	async geocodeCity(): Promise<GeocodeResult> {
		return GEO;
	}
}

class InMemoryCityResidentsFileWriter implements CityResidentsFileWriter {
	private stored: CityResidentsFile | null = null;

	exists(): ResidentsExistsResult {
		return { exists: this.stored !== null, path: "/fake/residents.json" };
	}

	write(
		_ctx: unknown,
		residents: CityResidentSeed[],
		meta: Omit<CityResidentsFileMeta, "total">,
	): ResidentsWriteResult {
		this.stored = { _meta: { ...meta, total: residents.length }, residents };
		return { written: true, path: "/fake/residents.json" };
	}

	read(): CityResidentSeed[] {
		if (!this.stored) throw new Error("nothing stored");
		return this.stored.residents;
	}
}

class InMemoryComplaintSeedFileWriter implements ComplaintSeedFileWriter {
	public lastWrite?: { complaints: ComplaintSeed[]; meta: unknown };
	public existsResult = { exists: false, path: "/fake/complaints.json" };

	exists(): ExistsResult {
		return this.existsResult;
	}

	write(
		_ctx: unknown,
		complaints: ComplaintSeed[],
		meta: Omit<ComplaintSeedFileMeta, "total">,
	): WriteResult {
		this.lastWrite = { complaints, meta };
		return { written: true, path: "/fake/complaints.json" };
	}
}

function makeUseCase(
	writer: InMemoryComplaintSeedFileWriter,
): GenerateCityComplaintsUseCase {
	const resolveCity = new ResolveCityUseCase(
		new FakeMunicipioProvider(),
		new FakeGeocodingProvider(),
	);
	const resolveCityResidents = new ResolveCityResidentsUseCase(
		new InMemoryCityResidentsFileWriter(),
		new CityResidentGenerator(),
	);
	const complaintGenerator = new ComplaintGenerator(
		new ComplaintCategoryPicker(),
		new ComplaintAttachmentPicker(["a.jpg"]),
		new SyntheticGeospatialGenerator(),
		new ComplaintStatusPicker(),
		new VoteGenerator(),
		new ResolutionGenerator(),
	);

	return new GenerateCityComplaintsUseCase(
		resolveCity,
		resolveCityResidents,
		complaintGenerator,
		writer,
	);
}

describe("generate-city-complaints-use-case", () => {
	it("generates exactly `target` complaints and writes them", async () => {
		const writer = new InMemoryComplaintSeedFileWriter();
		const useCase = makeUseCase(writer);

		const ctx = await useCase.resolveCity("Rondonópolis", "MT");
		const residents = await useCase.resolveResidents(ctx, {
			complaintsTarget: 15,
		});

		const result = await useCase.execute("Rondonópolis", "MT", residents, {
			target: 15,
		});

		expect(result.total).toBe(15);
		expect(writer.lastWrite?.complaints).toHaveLength(15);
	});

	describe("computeResidentsWithCompany", () => {
		let tempDir: string;

		beforeEach(() => {
			tempDir = mkdtempSync(join(tmpdir(), "complaints-usecase-"));
		});

		afterEach(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

		it("returns an empty set when no CompanySeedFile exists for the city", async () => {
			const writer = new InMemoryComplaintSeedFileWriter();
			const useCase = makeUseCase(writer);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			const result = useCase.computeResidentsWithCompany(ctx, tempDir);

			expect(result.size).toBe(0);
		});

		it("returns the owner_resident_index set when a CompanySeedFile exists", async () => {
			const writer = new InMemoryComplaintSeedFileWriter();
			const useCase = makeUseCase(writer);
			const ctx = await useCase.resolveCity("Rondonópolis", "MT");

			mkdirSync(tempDir, { recursive: true });
			writeFileSync(
				join(tempDir, `${citySlug(ctx)}.json`),
				JSON.stringify({
					_meta: {},
					companies: [
						{ owner_resident_index: 2 },
						{ owner_resident_index: 5 },
						{ owner_resident_index: 2 },
					],
				}),
			);

			const result = useCase.computeResidentsWithCompany(ctx, tempDir);

			expect(result).toStrictEqual(new Set([2, 5]));
		});
	});
});
