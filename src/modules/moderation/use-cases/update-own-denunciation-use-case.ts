import { AppError } from "@/modules/common/errors/app-error.js";
import type { Denunciation } from "@/modules/moderation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/moderation/repositories/denunciations-repository.js";

type UpdateOwnDenunciationUseCaseRequest = {
	userId: string;
	denunciationId: string;
	title?: string;
	description?: string;
};

export class UpdateOwnDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		userId,
		denunciationId,
		title,
		description,
	}: UpdateOwnDenunciationUseCaseRequest): Promise<Denunciation> {
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

		if (denunciation.status !== "OPEN") {
			throw new AppError(
				"Denunciation has already been moderated",
				"DENUNCIATION_ALREADY_MODERATED",
				422,
			);
		}

		const updated = await this.denunciationsRepository.update(denunciationId, {
			title,
			description,
		});

		if (!updated) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return updated;
	}
}
