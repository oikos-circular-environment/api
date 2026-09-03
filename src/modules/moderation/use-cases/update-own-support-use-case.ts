import { AppError } from "@/modules/common/errors/app-error.js";
import type { Support } from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportsRepository } from "@/modules/moderation/repositories/supports-repository.js";

type UpdateOwnSupportUseCaseRequest = {
	userId: string;
	supportId: string;
	title?: string;
	description?: string;
};

export class UpdateOwnSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		userId,
		supportId,
		title,
		description,
	}: UpdateOwnSupportUseCaseRequest): Promise<Support> {
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

		const updated = await this.supportsRepository.update(supportId, {
			title,
			description,
		});

		if (!updated) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return updated;
	}
}
