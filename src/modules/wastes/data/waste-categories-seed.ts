import { randomUUID } from "node:crypto";
import {
	CATEGORIES,
	type WasteCategoryInput,
} from "@/modules/wastes/data/waste-categories-base.js";
import type { WasteCategory } from "@/modules/wastes/dtos/wastes-dto.js";

function mapToWasteCategory(input: WasteCategoryInput): WasteCategory {
	const categoryId = randomUUID();
	return {
		id: categoryId,
		name: input.name,
		description: input.description,
		observations: input.observations,
		hazard_levels: input.hazard_levels,
		created_at: new Date("2025-01-01T00:00:00Z"),
		updated_at: new Date("2025-01-01T00:00:00Z"),
		subcategories: input.subcategories.map((sub) => ({
			id: randomUUID(),
			name: sub.name,
			description: sub.description ?? null,
			observations: sub.observations ?? null,
			hazard_level: sub.hazard_level,
			type: sub.type,
			created_at: new Date("2025-01-01T00:00:00Z"),
			category_id: categoryId,
		})),
	};
}

export const WASTE_CATEGORIES_SEED: WasteCategory[] =
	CATEGORIES.map(mapToWasteCategory);
