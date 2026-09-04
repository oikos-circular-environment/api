import { AppError } from "@/modules/common/errors/app-error.js";
import type { Denunciation } from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

type GetOwnDenunciationUseCaseRequest = {
	userId: string;
	denunciationId: string;
};

export class GetOwnDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		userId,
		denunciationId,
	}: GetOwnDenunciationUseCaseRequest): Promise<Denunciation> {
		const denunciation = await this.denunciationsRepository.findByIdAndOwner(
			denunciationId,
			userId,
		);

		if (!denunciation) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return denunciation;
	}
}
