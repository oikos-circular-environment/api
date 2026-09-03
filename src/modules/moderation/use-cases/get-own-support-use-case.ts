import { AppError } from "@/modules/common/errors/app-error.js";
import type { Support } from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportsRepository } from "@/modules/moderation/repositories/supports-repository.js";

type GetOwnSupportUseCaseRequest = {
	userId: string;
	supportId: string;
};

export class GetOwnSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		userId,
		supportId,
	}: GetOwnSupportUseCaseRequest): Promise<Support> {
		const support = await this.supportsRepository.findByIdAndOwner(
			supportId,
			userId,
		);

		if (!support) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return support;
	}
}
