import { AppError } from "@/modules/common/errors/app-error.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";
import type { StorageProvider } from "@/shared/providers/storage/storage.js";

type Request = {
	userId: string;
	complaintId: string;
	attachmentId: string;
};

export class DeleteComplaintAttachmentUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({ userId, complaintId, attachmentId }: Request): Promise<void> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		const attachment = complaint.attachments.find((a) => a.id === attachmentId);

		if (!attachment) {
			throw new AppError(
				"Attachment not found",
				"COMPLAINT_ATTACHMENT_NOT_FOUND",
				404,
			);
		}

		await this.storageProvider.deleteFile(attachment.path);

		await this.complaintsRepository.deleteComplaintAttachment(
			userId,
			complaintId,
			attachmentId,
		);
	}
}
