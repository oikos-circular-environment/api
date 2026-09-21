import { AppError } from "@/modules/common/errors/app-error.js";
import type { Denunciation } from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

type CancelOwnDenunciationUseCaseRequest = {
	userId: string;
	denunciationId: string;
};

export class CancelOwnDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		userId,
		denunciationId,
	}: CancelOwnDenunciationUseCaseRequest): Promise<Denunciation> {
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

		const updated = await this.denunciationsRepository.updateStatus(
			denunciationId,
			{ status: "CANCELLED" },
		);

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
