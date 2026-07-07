import { describe, expect, it } from "vitest";
import { geospatialSchema } from "../../../src/modules/complaints/entities/complaint-entity.js";
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import { ComplaintAttachmentPicker } from "./complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "./complaint-category-picker.js";
import { ComplaintGenerator } from "./complaint-generator.js";
import { ComplaintStatusPicker } from "./complaint-status-picker.js";
import { calculateWeights, VoteGenerator } from "./vote-generator.js";
import { ResolutionGenerator } from "./resolution-generator.js";
import { SyntheticGeospatialGenerator } from "./synthetic-geospatial-generator.js";

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
		const canonicalNames = new Set(CATEGORIES.map((c) => c.name));

		for (let i = 0; i < 30; i++) {
			const seed = generator.generate(makeCtx(), 20, new Set());

			expect(geospatialSchema.safeParse(seed.geospatial).success).toBe(true);
			expect(seed.waste_category_names.length).toBeGreaterThanOrEqual(1);
			for (const name of seed.waste_category_names) {
				expect(canonicalNames.has(name)).toBe(true);
			}
		}
	});

	it("keeps author_resident_index within the resident pool and out of the vote list", () => {
		const generator = makeGenerator();

		for (let i = 0; i < 30; i++) {
			const seed = generator.generate(makeCtx(), 20, new Set());

			expect(seed.author_resident_index).toBeGreaterThanOrEqual(0);
			expect(seed.author_resident_index).toBeLessThan(20);
			expect(
				seed.votes.some((v) => v.resident_index === seed.author_resident_index),
			).toBe(false);
		}
	});

	it("keeps votes coherent with the generated status (real quorum formula)", () => {
		const generator = makeGenerator();

		for (let i = 0; i < 50; i++) {
			const seed = generator.generate(makeCtx(), 20, new Set());
			const { positive, negative } = calculateWeights(seed.votes);

			if (seed.status === "RESOLVED") {
				expect(positive).toBeGreaterThanOrEqual(5 + negative);
				expect(seed.resolutions.length).toBeGreaterThanOrEqual(1);
			}
			if (seed.status === "OPEN") {
				expect(positive).toBeLessThan(5 + negative);
				expect(seed.resolutions).toEqual([]);
			}
			if (seed.status === "CANCELED") {
				expect(seed.resolutions).toEqual([]);
			}
		}
	});
});
