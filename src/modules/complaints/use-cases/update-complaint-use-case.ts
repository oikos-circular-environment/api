import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Complaint,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type UpdateComplaintUseCaseRequest = {
	userId: string;
	complaintId: string;
	data: UpdateComplaint;
};

export class UpdateComplaintUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		complaintId,
		data,
	}: UpdateComplaintUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		const totalVotes =
			complaint.vote_counts.resolved + complaint.vote_counts.not_resolved;

		if (totalVotes > 0) {
			throw new AppError(
				"Complaint with votes cannot be updated",
				"COMPLAINT_HAS_VOTES",
				422,
			);
		}

		if (complaint.resolution_count > 0) {
			throw new AppError(
				"Complaint with resolutions cannot be updated",
				"COMPLAINT_HAS_RESOLUTIONS",
				422,
			);
		}

		const updated = await this.complaintsRepository.updateByUserAndComplaintId(
			userId,
			complaintId,
			data,
		);

		if (!updated) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return updated;
	}
}
