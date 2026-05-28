import { AppError } from "@/modules/common/errors/app-error.js";
import type { PublicComplaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

export class GetPublicComplaintUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ complaintId }: { complaintId: string }): Promise<PublicComplaint> {
		const complaint =
			await this.complaintsRepository.findPublicComplaintById(complaintId);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return complaint;
	}
}
