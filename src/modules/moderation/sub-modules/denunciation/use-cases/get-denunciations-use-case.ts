import type {
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
} from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { ModerationDenunciationsRepository } from "../repositories/moderation-denunciations-repository.js";

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
		private readonly denunciationsRepository: ModerationDenunciationsRepository,
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
