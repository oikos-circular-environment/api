import type { WasteCategory } from '../dtos/wastes-dto.js'

export interface WasteCategoriesRepository {
	findAll(): Promise<WasteCategory[]>
	findById(id: string): Promise<WasteCategory | null>
}
