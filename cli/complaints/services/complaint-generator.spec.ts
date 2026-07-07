import { describe, expect, it } from "vitest";
import { geospatialSchema } from "../../../src/modules/complaints/entities/complaint-entity.js";
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import { ComplaintAttachmentPicker } from "./complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./complaint-category-picker.js";
import { ComplaintGenerator } from "./complaint-generator.js";
import { ComplaintStatusPicker } from "./complaint-status-picker.js";
import { ResolutionGenerator } from "./resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./synthetic-geospatial-generator.js";
import { calculateWeights, VoteGenerator } from "./vote-generator.js";

function makeCtx(): CityContext {
	return {
		city: "Sinop",
		cityIbgeId: 5107909,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -11.95, longitude: -55.6 },
			high: { latitude: -11.75, longitude: -55.4 },
		},
		center: { latitude: -11.86, longitude: -55.5 },
	};
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
			city: "Sinop",
			city_ibge_id: 5107909,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: 0,
			longitude: 0,
		},
		companies: [],
		complaints: [],
	}));
}

function makeGenerator(): ComplaintGenerator {
	return new ComplaintGenerator(
		new ComplaintCategoryPicker(),
		new ComplaintAttachmentPicker(["a.jpg", "b.jpg"]),
		new SyntheticGeospatialGenerator(),
		new ComplaintStatusPicker(),
		new VoteGenerator(),
		new ResolutionGenerator(),
	);
}

describe("complaint-generator", () => {
	it("produces a ComplaintSeed with a valid geospatial and canonical categories", () => {
		const generator = makeGenerator();
		const users = makeUsers(20);
		const canonicalNames = new Set(CATEGORIES.map((c) => c.name));

		for (let i = 0; i < 30; i++) {
			const { complaint } = generator.generate(makeCtx(), users, new Set());

			expect(geospatialSchema.safeParse(complaint.geospatial).success).toBe(
				true,
			);
			expect(complaint.waste_category_names.length).toBeGreaterThanOrEqual(1);
			for (const name of complaint.waste_category_names) {
				expect(canonicalNames.has(name)).toBe(true);
			}
		}
	});

	it("keeps authorIndex within the user pool and out of the vote list", () => {
		const generator = makeGenerator();
		const users = makeUsers(20);

		for (let i = 0; i < 30; i++) {
			const { authorIndex, complaint } = generator.generate(
				makeCtx(),
				users,
				new Set(),
			);

			expect(authorIndex).toBeGreaterThanOrEqual(0);
			expect(authorIndex).toBeLessThan(20);
			expect(
				complaint.votes.some((v) => v.voter_email === users[authorIndex].email),
			).toBe(false);
		}
	});

	it("keeps votes coherent with the generated status (real quorum formula)", () => {
		const generator = makeGenerator();
		const users = makeUsers(20);

		for (let i = 0; i < 50; i++) {
			const { complaint } = generator.generate(makeCtx(), users, new Set());
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
		}
	});
});
