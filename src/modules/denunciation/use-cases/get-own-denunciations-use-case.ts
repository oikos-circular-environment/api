import type { Denunciation } from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

type GetOwnDenunciationsUseCaseRequest = {
	userId: string;
	cursor?: Date;
	limit: number;
};

type GetOwnDenunciationsUseCaseResponse = {
	denunciations: Denunciation[];
	nextCursor: Date | null;
};

export class GetOwnDenunciationsUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		userId,
		cursor,
		limit,
	}: GetOwnDenunciationsUseCaseRequest): Promise<GetOwnDenunciationsUseCaseResponse> {
		const limitPlusOne = limit + 1;

		const denunciations = await this.denunciationsRepository.findManyByOwner(
			userId,
			{
				cursor,
				limit: limitPlusOne,
			},
		);

		const hasMore = denunciations.length > limit;
		const sliced = hasMore ? denunciations.slice(0, limit) : denunciations;
		const nextCursor =
			hasMore && sliced.length > 0
				? sliced[sliced.length - 1]!.created_at
				: null;

		return { denunciations: sliced, nextCursor };
	}
}
