import { AppError } from "@/modules/common/errors/app-error.js";
import type { SubmitResolution } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = {
	userId: string;
	complaintId: string;
	data: SubmitResolution;
};

export class SubmitResolutionUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ userId, complaintId, data }: Request): Promise<void> {
		const complaint = await this.complaintsRepository.findPublicComplaintById(complaintId);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (["RESOLVED", "CANCELED"].includes(complaint.status)) {
			throw new AppError("Complaint is closed", "COMPLAINT_CLOSED", 422);
		}

		const existing = await this.complaintsRepository.findResolutionByUserAndComplaint(
			userId,
			complaintId,
		);

		if (existing) {
			await this.complaintsRepository.updateResolution(userId, complaintId, data);
		} else {
			await this.complaintsRepository.submitResolution(userId, complaintId, data);
		}
	}
}
