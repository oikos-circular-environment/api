import type { WasteCategory } from '@/modules/wastes/dtos/wastes-dto.js'
import type { WasteCategoriesRepository } from '../waste-categories-repository.js'

export class InMemoryWasteCategoriesRepository implements WasteCategoriesRepository {
	public items: WasteCategory[] = []

	async findAll(): Promise<WasteCategory[]> {
		return [...this.items].sort((a, b) => a.name.localeCompare(b.name))
	}

	async findById(id: string): Promise<WasteCategory | null> {
		return this.items.find((c) => c.id === id) ?? null
	}
}
