import { AppError } from "@/modules/common/errors/app-error.js";
import type { Support } from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportsRepository } from "@/modules/moderation/repositories/supports-repository.js";

type GetSupportUseCaseRequest = {
	supportId: string;
};

type GetSupportUseCaseResponse = {
	support: Support;
};

export class GetSupportUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		supportId,
	}: GetSupportUseCaseRequest): Promise<GetSupportUseCaseResponse> {
		const support = await this.supportsRepository.findById(supportId);

		if (!support) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return { support };
	}
}
