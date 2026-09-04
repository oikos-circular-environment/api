import type {
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
} from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

type GetDenunciationsUseCaseRequest = {
	status?: ModerationStatus;
	severity?: ModerationSeverity;
	cursor?: Date;
	limit: number;
};

type GetDenunciationsUseCaseResponse = {
	denunciations: Denunciation[];
};

export class GetDenunciationsUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
	) {}

	async execute({
		status,
		severity,
		cursor,
		limit,
	}: GetDenunciationsUseCaseRequest): Promise<GetDenunciationsUseCaseResponse> {
		const denunciations = await this.denunciationsRepository.findMany({
			status,
			severity,
			cursor,
			limit,
		});

		return { denunciations };
	}
}
