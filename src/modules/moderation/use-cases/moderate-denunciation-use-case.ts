import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Denunciation,
	ModerationSeverity,
} from "@/modules/moderation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/moderation/repositories/denunciations-repository.js";

const FINAL_STATUSES = ["CLOSED", "RESOLVED", "CANCELLED"] as const;

type ModerateDenunciationUseCaseRequest = {
	denunciationId: string;
	status: "CLOSED" | "RESOLVED";
	severity?: ModerationSeverity;
	reason?: string;
	moderatedBy: string;
};

type ModerateDenunciationUseCaseResponse = {
	denunciation: Denunciation;
};

export class ModerateDenunciationUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		denunciationId,
		status,
		severity,
		reason,
		moderatedBy,
	}: ModerateDenunciationUseCaseRequest): Promise<ModerateDenunciationUseCaseResponse> {
		const denunciation =
			await this.denunciationsRepository.findById(denunciationId);

		if (!denunciation) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		if (
			FINAL_STATUSES.includes(
				denunciation.status as (typeof FINAL_STATUSES)[number],
			)
		) {
			throw new AppError(
				"Denunciation is already finalized",
				"DENUNCIATION_ALREADY_FINALIZED",
				422,
			);
		}

		const updated = await this.denunciationsRepository.updateStatus(
			denunciationId,
			{
				status,
				severity,
				reason,
				moderatedBy,
			},
		);

		if (!updated) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return { denunciation: updated };
	}
}
