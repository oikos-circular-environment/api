import type { Resolution } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = { complaintId: string };

export class GetResolutionsUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ complaintId }: Request): Promise<Resolution[]> {
		return this.complaintsRepository.findResolutionsByComplaintId(complaintId);
	}
}
