import { AppError } from "@/modules/common/errors/app-error.js";
import type { Denunciation } from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";
import type { BanUserUseCase } from "../../users/use-cases/ban-user-use-case.js";
import type { RevokeUserSessionsUseCase } from "../../users/use-cases/revoke-user-sessions-use-case.js";

const FINAL_STATUSES = ["CLOSED", "RESOLVED", "CANCELLED"] as const;

type ModerateDenunciationBanUseCaseRequest = {
	denunciationId: string;
	moderatorId: string;
	banReason: string;
	banExpiresIn?: number;
	headers: Headers;
};

type ModerateDenunciationBanUseCaseResponse = {
	denunciation: Denunciation;
	user: { id: string; banned: boolean };
};

export class ModerateDenunciationBanUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
		private readonly banUserUseCase: BanUserUseCase,
		private readonly revokeUserSessionsUseCase: RevokeUserSessionsUseCase,
	) {}

	async execute({
		denunciationId,
		moderatorId,
		banReason,
		banExpiresIn,
		headers,
	}: ModerateDenunciationBanUseCaseRequest): Promise<ModerateDenunciationBanUseCaseResponse> {
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

		if (!denunciation.reported_user_id) {
			throw new AppError(
				"Denunciation has no target user",
				"DENUNCIATION_HAS_NO_TARGET_USER",
				422,
			);
		}

		const user = await this.banUserUseCase.execute(
			{
				userId: denunciation.reported_user_id,
				banReason,
				banExpiresIn,
			},
			headers,
		);

		await this.revokeUserSessionsUseCase.execute(
			denunciation.reported_user_id,
			headers,
		);

		const updated = await this.denunciationsRepository.updateStatus(
			denunciationId,
			{
				status: "RESOLVED",
				reason: banReason,
				moderatedBy: moderatorId,
			},
		);

		if (!updated) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return { denunciation: updated, user };
	}
}
