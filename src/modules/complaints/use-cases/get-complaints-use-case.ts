import type {
	GetComplaintsFilters,
	PaginatedComplaints,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type GetComplaintsUseCaseRequest = {
	userId: string;
	filters?: GetComplaintsFilters;
	cursor?: Date;
	limit: number;
};

export class GetComplaintsUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		filters,
		cursor,
		limit,
	}: GetComplaintsUseCaseRequest): Promise<PaginatedComplaints> {
		const rows = await this.complaintsRepository.findManyByUserId(userId, {
			filters,
			cursor,
			limit,
		});

		const hasNextPage = rows.length > limit;
		const complaints = hasNextPage ? rows.slice(0, limit) : rows;
		const next_cursor = hasNextPage
			? (complaints[complaints.length - 1]?.created_at.toISOString() ?? null)
			: null;

		return { complaints, next_cursor };
	}
}
