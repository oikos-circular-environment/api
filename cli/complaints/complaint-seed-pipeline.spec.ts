import { describe, expect, it } from "vitest";
import { geospatialSchema } from "../../src/modules/complaints/entities/complaint-entity.js";
import { CATEGORIES } from "../../src/modules/wastes/data/waste-categories-base.js";
import type {
	IbgeMunicipio,
	IbgeUf,
} from "../shared/entities/ibge-municipio.js";
import type {
	GeocodeResult,
	GeocodingProvider,
} from "../shared/providers/geocoding-provider.js";
import type { MunicipioProvider } from "../shared/providers/municipio-provider.js";
import { ResolveCityUseCase } from "../shared/use-cases/resolve-city-use-case.js";
import { ResolveCityUsersUseCase } from "../shared/use-cases/resolve-city-users-use-case.js";
import { ComplaintAttachmentPicker } from "./services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./services/complaint-category-picker.js";
import { ComplaintGenerator } from "./services/complaint-generator.js";
import { ComplaintStatusPicker } from "./services/complaint-status-picker.js";
import { ResolutionGenerator } from "./services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./services/synthetic-geospatial-generator.js";
import { calculateWeights, VoteGenerator } from "./services/vote-generator.js";
import { GenerateCityComplaintsUseCase } from "./use-cases/generate-city-complaints-use-case.js";

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

describe("complaint-seed-pipeline", () => {
	it("composes the full pipeline (fakes only, no network/disk) into valid, coherent ComplaintSeeds", async () => {
		const resolveCity = new ResolveCityUseCase(
			new FakeMunicipioProvider(),
			new FakeGeocodingProvider(),
		);
		const resolveCityUsers = new ResolveCityUsersUseCase();
		const complaintGenerator = new ComplaintGenerator(
			new ComplaintCategoryPicker(),
			new ComplaintAttachmentPicker(["a.jpg", "b.jpg", "c.jpg"]),
			new SyntheticGeospatialGenerator(),
			new ComplaintStatusPicker(),
			new VoteGenerator(),
			new ResolutionGenerator(),
		);

		const useCase = new GenerateCityComplaintsUseCase(complaintGenerator);

		const ctx = await resolveCity.execute("Rondonópolis", "MT");
		const users = resolveCityUsers.execute(ctx, { complaintsTarget: 60 });

		const complaintsByUser = useCase.generateComplaints(
			ctx,
			users,
			new Set(),
			60,
		);

		const totalComplaints = Array.from(complaintsByUser.values()).reduce(
			(sum, complaints) => sum + complaints.length,
			0,
		);
		expect(totalComplaints).toBe(60);

		const canonicalNames = new Set(CATEGORIES.map((c) => c.name));

		for (const [authorIndex, complaints] of complaintsByUser) {
			const authorEmail = users[authorIndex].email;

			for (const complaint of complaints) {
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
				const voterEmails = complaint.votes.map((v) => v.voter_email);
				expect(new Set(voterEmails).size).toBe(voterEmails.length);
				expect(voterEmails.includes(authorEmail)).toBe(false);

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

				// resoluções: nunca duplica resolver_email na mesma denúncia; sem
				// usuários donos de empresa nesta execução, nunca há PREFER_COMPANY
				const resolverEmails = complaint.resolutions.map(
					(r) => r.resolver_email,
				);
				expect(new Set(resolverEmails).size).toBe(resolverEmails.length);
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
		}
	});
});
