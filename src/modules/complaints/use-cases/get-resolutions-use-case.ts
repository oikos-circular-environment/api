import type { Resolution } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = { complaintId: string; userId: string };

export class GetResolutionsUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ complaintId, userId }: Request): Promise<Resolution[]> {
		return this.complaintsRepository.findResolutionsByComplaintId(complaintId, userId);
	}
}
