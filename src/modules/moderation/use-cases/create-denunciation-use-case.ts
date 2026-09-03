import type {
	CreateDenunciation,
	Denunciation,
} from "@/modules/moderation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/moderation/repositories/denunciations-repository.js";

export class CreateDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute(data: CreateDenunciation): Promise<Denunciation> {
		return this.denunciationsRepository.create(data);
	}
}
