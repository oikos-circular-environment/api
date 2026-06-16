import { AppError } from "@/modules/common/errors/app-error.js";
import type { WasteCategoriesRepository } from "@/modules/wastes/repositories/waste-categories-repository.js";

export function validateDuplicatedNames(items: { name: string }[]): void {
	const uniqueNames = new Set(items.map((item) => item.name));

	if (uniqueNames.size !== items.length) {
		throw new AppError(
			"Duplicated name in payload",
			"DUPLICATED_ITEM_NAME",
			400,
		);
	}
}

export async function validateCategories(
	items: { waste_category_id: string }[],
	repo: WasteCategoriesRepository,
): Promise<void> {
	const uniqueIds = [...new Set(items.map((item) => item.waste_category_id))];

	await Promise.all(
		uniqueIds.map(async (id) => {
			const category = await repo.findById(id);

			if (!category) {
				throw new AppError(
					`Waste category not found: ${id}`,
					"WASTE_CATEGORY_NOT_FOUND",
					422,
				);
			}
		}),
	);
}
