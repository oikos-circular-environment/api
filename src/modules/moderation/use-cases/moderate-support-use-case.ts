import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	ModerationSeverity,
	Support,
} from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportsRepository } from "@/modules/moderation/repositories/supports-repository.js";

const FINAL_STATUSES = ["CLOSED", "RESOLVED", "CANCELLED"] as const;

type ModerateSupportUseCaseRequest = {
	supportId: string;
	status: "CLOSED" | "RESOLVED";
	severity?: ModerationSeverity;
	reason?: string;
	moderatedBy: string;
};

type ModerateSupportUseCaseResponse = {
	support: Support;
};

export class ModerateSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		supportId,
		status,
		severity,
		reason,
		moderatedBy,
	}: ModerateSupportUseCaseRequest): Promise<ModerateSupportUseCaseResponse> {
		const support = await this.supportsRepository.findById(supportId);

		if (!support) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		if (
			FINAL_STATUSES.includes(support.status as (typeof FINAL_STATUSES)[number])
		) {
			throw new AppError(
				"Support is already finalized",
				"SUPPORT_ALREADY_FINALIZED",
				422,
			);
		}

		const updated = await this.supportsRepository.updateStatus(supportId, {
			status,
			severity,
			reason,
			moderatedBy,
		});

		if (!updated) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return { support: updated };
	}
}
