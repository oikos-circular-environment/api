import type {
	CreateSupport,
	Support,
} from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

export class CreateSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute(data: CreateSupport): Promise<Support> {
		return this.supportsRepository.create(data);
	}
}
