import { describe, expect, it } from "vitest";
import { geospatialSchema } from "../../src/modules/complaints/entities/complaint-entity.js";
import { CATEGORIES } from "../../src/modules/wastes/data/waste-categories-base.js";
import type {
	CityResidentsFile,
	CityResidentSeed,
	CityResidentsFileMeta,
} from "../shared/entities/city-resident.js";
import type { IbgeMunicipio, IbgeUf } from "../shared/entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../shared/providers/geocoding-provider.js";
import type { MunicipioProvider } from "../shared/providers/municipio-provider.js";
import { CityResidentGenerator } from "../shared/services/city-resident-generator.js";
import { ResolveCityResidentsUseCase } from "../shared/use-cases/resolve-city-residents-use-case.js";
import { ResolveCityUseCase } from "../shared/use-cases/resolve-city-use-case.js";
import type {
	CityResidentsFileWriter,
	ExistsResult as ResidentsExistsResult,
	WriteResult as ResidentsWriteResult,
} from "../shared/writers/city-residents-file-writer.js";
import type { ComplaintSeed } from "./entities/complaint-seed.js";
import { ComplaintAttachmentPicker } from "./services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./services/complaint-category-picker.js";
import { ComplaintGenerator } from "./services/complaint-generator.js";
import { ComplaintStatusPicker } from "./services/complaint-status-picker.js";
import { ResolutionGenerator } from "./services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./services/synthetic-geospatial-generator.js";
import { calculateWeights, VoteGenerator } from "./services/vote-generator.js";
import { GenerateCityComplaintsUseCase } from "./use-cases/generate-city-complaints-use-case.js";
import type {
	ComplaintSeedFileWriter,
	ExistsResult,
	WriteResult,
} from "./writers/complaint-seed-file-writer.js";

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
	public complaints: ComplaintSeed[] = [];
	public existsResult = { exists: false, path: "/fake/complaints.json" };

	exists(): ExistsResult {
		return this.existsResult;
	}

	write(_ctx: unknown, complaints: ComplaintSeed[]): WriteResult {
		this.complaints = complaints;
		return { written: true, path: "/fake/complaints.json" };
	}
}

describe("complaint-seed-pipeline", () => {
	it("composes the full pipeline (fakes only, no network/disk) into valid, coherent ComplaintSeeds", async () => {
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
			new ComplaintAttachmentPicker(["a.jpg", "b.jpg", "c.jpg"]),
			new SyntheticGeospatialGenerator(),
			new ComplaintStatusPicker(),
			new VoteGenerator(),
			new ResolutionGenerator(),
		);
		const writer = new InMemoryComplaintSeedFileWriter();

		const useCase = new GenerateCityComplaintsUseCase(
			resolveCity,
			resolveCityResidents,
			complaintGenerator,
			writer,
		);

		const ctx = await useCase.resolveCity("Rondonópolis", "MT");
		const residents = await useCase.resolveResidents(ctx, {
			complaintsTarget: 60,
		});

		const result = await useCase.execute("Rondonópolis", "MT", residents, {
			target: 60,
		});

		expect(result.total).toBe(60);
		expect(writer.complaints).toHaveLength(60);

		const canonicalNames = new Set(CATEGORIES.map((c) => c.name));

		for (const complaint of writer.complaints) {
			// geospatial válido contra o schema Zod real
			expect(geospatialSchema.safeParse(complaint.geospatial).success).toBe(
				true,
			);

			// categorias sempre do catálogo canônico
			expect(complaint.waste_category_names.length).toBeGreaterThanOrEqual(1);
			for (const name of complaint.waste_category_names) {
				expect(canonicalNames.has(name)).toBe(true);
			}

			// votantes distintos entre si e nunca o autor
			const voterIndexes = complaint.votes.map((v) => v.resident_index);
			expect(new Set(voterIndexes).size).toBe(voterIndexes.length);
			expect(voterIndexes.includes(complaint.author_resident_index)).toBe(
				false,
			);

			// coerência status <-> quórum real
			const { positive, negative } = calculateWeights(complaint.votes);
			if (complaint.status === "RESOLVED") {
				expect(positive).toBeGreaterThanOrEqual(5 + negative);
				expect(complaint.resolutions.length).toBeGreaterThanOrEqual(1);
			}
			if (complaint.status === "OPEN") {
				expect(positive).toBeLessThan(5 + negative);
				expect(complaint.resolutions).toEqual([]);
			}
			if (complaint.status === "CANCELED") {
				expect(complaint.resolutions).toEqual([]);
			}

			// resoluções: nunca duplica resident_index na mesma denúncia; sem
			// moradores donos de empresa nesta execução, nunca há PREFER_COMPANY
			const resolutionIndexes = complaint.resolutions.map(
				(r) => r.resident_index,
			);
			expect(new Set(resolutionIndexes).size).toBe(resolutionIndexes.length);
			for (const resolution of complaint.resolutions) {
				expect(resolution.resolution_hint).toBe("CITIZEN_ONLY");
			}

			// anexos sempre referenciam um dos arquivos injetados, sem repetição
			const attachmentFiles = complaint.attachments.map((a) => a.asset_file);
			expect(new Set(attachmentFiles).size).toBe(attachmentFiles.length);
			for (const file of attachmentFiles) {
				expect(["a.jpg", "b.jpg", "c.jpg"]).toContain(file);
			}
		}
	});
});
