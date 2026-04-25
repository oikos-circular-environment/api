import type { ComplaintResume } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type GetComplaintsDashboardUseCaseRequest = {
	userId: string;
};

export class GetComplaintsDashboardUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
	}: GetComplaintsDashboardUseCaseRequest): Promise<ComplaintResume> {
		return this.complaintsRepository.getDashboardByUserId(userId);
	}
}
