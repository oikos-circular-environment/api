import { AppError } from "@/modules/common/errors/app-error.js";
import type { Support } from "@/modules/support/dtos/support-dto.js";
import type { ModerationSupportsRepository } from "../repositories/moderation-supports-repository.js";

type GetSupportUseCaseRequest = {
	supportId: string;
};

type GetSupportUseCaseResponse = {
	support: Support;
};

export class GetSupportUseCase {
	constructor(
		private readonly supportsRepository: ModerationSupportsRepository,
	) {}

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
