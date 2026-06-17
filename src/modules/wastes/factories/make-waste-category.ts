import { faker } from "@faker-js/faker";
import type {
	HazardLevel,
	WasteCategory,
} from "@/modules/wastes/dtos/wastes-dto.js";

export function makeWasteCategory(
	overrides?: Partial<WasteCategory>,
): WasteCategory {
	return {
		id: faker.string.uuid(),
		name: faker.word.words(2),
		description: faker.lorem.sentence(),
		observations: null,
		hazard_levels: ["LOW" as HazardLevel],
		created_at: faker.date.past(),
		updated_at: faker.date.past(),
		subcategories: [],
		...overrides,
	};
}
