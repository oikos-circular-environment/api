import { AppError } from "@/modules/common/errors/app-error.js";
import type { Support } from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

type CancelOwnSupportUseCaseRequest = {
	userId: string;
	supportId: string;
};

export class CancelOwnSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		userId,
		supportId,
	}: CancelOwnSupportUseCaseRequest): Promise<Support> {
		const support = await this.supportsRepository.findByIdAndOwner(
			supportId,
			userId,
		);

		if (!support) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		if (support.status !== "OPEN") {
			throw new AppError(
				"Support has already been moderated",
				"SUPPORT_ALREADY_MODERATED",
				422,
			);
		}

		const updated = await this.supportsRepository.updateStatus(supportId, {
			status: "CANCELLED",
		});

		if (!updated) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return updated;
	}
}
