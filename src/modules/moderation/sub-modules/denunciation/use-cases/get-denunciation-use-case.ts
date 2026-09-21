import { AppError } from "@/modules/common/errors/app-error.js";
import type { Denunciation } from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { ModerationDenunciationsRepository } from "../repositories/moderation-denunciations-repository.js";

type GetDenunciationUseCaseRequest = {
	denunciationId: string;
};

type GetDenunciationUseCaseResponse = {
	denunciation: Denunciation;
};

export class GetDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: ModerationDenunciationsRepository,
	) {}

	async execute({
		denunciationId,
	}: GetDenunciationUseCaseRequest): Promise<GetDenunciationUseCaseResponse> {
		const denunciation =
			await this.denunciationsRepository.findById(denunciationId);

		if (!denunciation) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return { denunciation };
	}
}
