import type { Support } from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

type GetOwnSupportsUseCaseRequest = {
	userId: string;
	cursor?: Date;
	limit: number;
};

type GetOwnSupportsUseCaseResponse = {
	supports: Support[];
	nextCursor: Date | null;
};

export class GetOwnSupportsUseCase {
	constructor(private readonly supportsRepository: SupportsRepository) {}

	async execute({
		userId,
		cursor,
		limit,
	}: GetOwnSupportsUseCaseRequest): Promise<GetOwnSupportsUseCaseResponse> {
		const limitPlusOne = limit + 1;

		const supports = await this.supportsRepository.findManyByOwner(userId, {
			cursor,
			limit: limitPlusOne,
		});

		const hasMore = supports.length > limit;
		const sliced = hasMore ? supports.slice(0, limit) : supports;
		const nextCursor =
			hasMore && sliced.length > 0
				? sliced[sliced.length - 1]!.created_at
				: null;

		return { supports: sliced, nextCursor };
	}
}
