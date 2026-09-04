import type {
	ModerationSeverity,
	ModerationStatus,
	Support,
	SupportType,
} from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

type GetSupportsUseCaseRequest = {
	status?: ModerationStatus;
	severity?: ModerationSeverity;
	type?: SupportType;
	cursor?: Date;
	limit: number;
};

type GetSupportsUseCaseResponse = {
	supports: Support[];
};

export class GetSupportsUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		status,
		severity,
		type,
		cursor,
		limit,
	}: GetSupportsUseCaseRequest): Promise<GetSupportsUseCaseResponse> {
		const supports = await this.supportsRepository.findMany({
			status,
			severity,
			type,
			cursor,
			limit,
		});

		return { supports };
	}
}
