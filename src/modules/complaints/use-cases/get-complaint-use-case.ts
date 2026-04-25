import { AppError } from "@/modules/common/errors/app-error.js";
import type { Complaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type GetComplaintUseCaseRequest = {
	userId: string;
	complaintId: string;
};

export class GetComplaintUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		complaintId,
	}: GetComplaintUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return complaint;
	}
}
