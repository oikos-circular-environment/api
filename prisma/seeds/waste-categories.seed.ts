import type { PrismaClient } from "@/generated/prisma/client.js";
import { CATEGORIES } from "@/modules/wastes/data/waste-categories-base.js";

export async function seedWasteCategories(prisma: PrismaClient): Promise<void> {
	console.log("Seeding waste categories...");

	for (const category of CATEGORIES) {
		const existing = await prisma.wasteCategory.findFirst({
			where: { name: category.name },
		});

		if (existing) {
			console.log(`  skip: ${category.name} (already exists)`);
			continue;
		}

		await prisma.wasteCategory.create({
			data: {
				name: category.name,
				description: category.description,
				observations: category.observations,
				hazard_levels: category.hazard_levels,
				subcategories: {
					create: category.subcategories.map((sub) => ({
						name: sub.name,
						description: sub.description ?? null,
						observations: sub.observations ?? null,
						hazard_level: sub.hazard_level,
						type: sub.type,
					})),
				},
			},
		});

		console.log(
			`  created: ${category.name} (${category.subcategories.length} subcategories)`,
		);
	}

	console.log("Done seeding waste categories.");
}
