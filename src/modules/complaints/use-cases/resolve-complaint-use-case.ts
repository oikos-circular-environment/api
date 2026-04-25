import { AppError } from "@/modules/common/errors/app-error.js";
import type { Complaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type ResolveComplaintUseCaseRequest = {
	userId: string;
	complaintId: string;
};

export class ResolveComplaintUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		complaintId,
	}: ResolveComplaintUseCaseRequest): Promise<Complaint> {
		const complaint =
			await this.complaintsRepository.updateStatusByUserAndComplaintId(
				userId,
				complaintId,
				"RESOLVED",
			);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return complaint;
	}
}
