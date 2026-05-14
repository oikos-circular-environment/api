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
		const complaint =
			await this.complaintsRepository.updateByUserAndComplaintId(
				userId,
				complaintId,
				data,
			);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return complaint;
	}
}
