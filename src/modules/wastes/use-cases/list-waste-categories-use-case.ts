import type { WasteCategory } from "@/modules/wastes/dtos/wastes-dto.js";
import type { WasteCategoriesRepository } from "@/modules/wastes/repositories/waste-categories-repository.js";

export class ListWasteCategoriesUseCase {
	constructor(
		private readonly wasteCategoriesRepository: WasteCategoriesRepository,
	) {}

	async execute(): Promise<WasteCategory[]> {
		return this.wasteCategoriesRepository.findAll();
	}
}
