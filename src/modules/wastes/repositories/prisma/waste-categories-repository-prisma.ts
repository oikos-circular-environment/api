import { prisma } from '@/lib/prisma.js'
import type { WasteCategory } from '@/modules/wastes/dtos/wastes-dto.js'
import type { WasteCategoriesRepository } from '../waste-categories-repository.js'

function mapCategory(raw: {
	id: string
	name: string
	description: string | null
	observations: string | null
	hazard_levels: string[]
	created_at: Date
	updated_at: Date
	subcategories: {
		id: string
		name: string
		description: string | null
		observations: string | null
		hazard_level: string
		type: string
		created_at: Date
		category_id: string
	}[]
}): WasteCategory {
	return {
		id: raw.id,
		name: raw.name,
		description: raw.description,
		observations: raw.observations,
		hazard_levels: raw.hazard_levels as WasteCategory['hazard_levels'],
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		subcategories: raw.subcategories.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			observations: s.observations,
			hazard_level: s.hazard_level as WasteCategory['subcategories'][number]['hazard_level'],
			type: s.type as WasteCategory['subcategories'][number]['type'],
			created_at: s.created_at,
			category_id: s.category_id,
		})),
	}
}

const include = {
	subcategories: {
		orderBy: { created_at: 'asc' as const },
	},
}

export class PrismaWasteCategoriesRepository implements WasteCategoriesRepository {
	async findAll(): Promise<WasteCategory[]> {
		const categories = await prisma.wasteCategory.findMany({
			include,
			orderBy: { name: 'asc' },
		})

		return categories.map(mapCategory)
	}

	async findById(id: string): Promise<WasteCategory | null> {
		const category = await prisma.wasteCategory.findUnique({
			where: { id },
			include,
		})

		if (!category) return null

		return mapCategory(category)
	}
}
