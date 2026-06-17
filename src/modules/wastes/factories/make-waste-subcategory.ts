import { faker } from "@faker-js/faker";
import type {
	HazardLevel,
	SubcategoryType,
	WasteSubcategory,
} from "@/modules/wastes/dtos/wastes-dto.js";

export function makeWasteSubcategory(
	overrides?: Partial<WasteSubcategory>,
): WasteSubcategory {
	const categoryId = overrides?.category_id ?? faker.string.uuid();
	return {
		id: faker.string.uuid(),
		name: faker.word.words(2),
		description: null,
		observations: null,
		hazard_level: "LOW" as HazardLevel,
		type: "INCLUDE" as SubcategoryType,
		created_at: faker.date.past(),
		category_id: categoryId,
		...overrides,
	};
}
