import { AppError } from "@/modules/common/errors/app-error.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = { userId: string; complaintId: string; resolutionId: string };

export class DeleteResolutionUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ userId, complaintId, resolutionId }: Request): Promise<void> {
		const complaint =
			await this.complaintsRepository.findPublicComplaintById(complaintId);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (["RESOLVED", "CANCELED"].includes(complaint.status)) {
			throw new AppError("Complaint is closed", "COMPLAINT_CLOSED", 422);
		}

		const resolution =
			await this.complaintsRepository.findResolutionById(resolutionId);

		if (
			!resolution ||
			resolution.complaint_id !== complaintId ||
			resolution.resolver_user_id !== userId
		) {
			throw new AppError("Resolution not found", "RESOLUTION_NOT_FOUND", 404);
		}

		await this.complaintsRepository.deleteResolutionById(resolutionId);
	}
}
