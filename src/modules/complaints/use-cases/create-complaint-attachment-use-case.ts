import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Complaint,
	CreateComplaintAttachment,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type CreateComplaintAttachmentUseCaseRequest = {
	userId: string;
	data: CreateComplaintAttachment;
};

export class CreateComplaintAttachmentUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		data,
	}: CreateComplaintAttachmentUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			data.complaint_id,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (complaint.attachment) {
			throw new AppError(
				"Complaint attachment already exists",
				"COMPLAINT_ATTACHMENT_ALREADY_EXISTS",
				409,
			);
		}

		const updatedComplaint =
			await this.complaintsRepository.attachByUserAndComplaintId(
				userId,
				data.complaint_id,
				{
					url: data.url,
					file_name: data.file_name,
					path: data.path,
					base64: data.base64,
					type: data.type,
				},
			);

		if (!updatedComplaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return updatedComplaint;
	}
}
