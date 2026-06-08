import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = {
	userId: string;
	complaintId: string;
	attachmentId: string;
};

export class DeleteResolutionAttachmentUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({ userId, complaintId, attachmentId }: Request): Promise<void> {
		const resolution =
			await this.complaintsRepository.findResolutionByUserAndComplaint(
				userId,
				complaintId,
			);

		if (!resolution) {
			throw new AppError("Resolution not found", "RESOLUTION_NOT_FOUND", 404);
		}

		const resolutions =
			await this.complaintsRepository.findResolutionsByComplaintId(complaintId);
		const userResolution = resolutions.find((r) => r.id === resolution.id);
		const attachment = userResolution?.attachments.find(
			(a) => a.id === attachmentId,
		);

		if (!attachment) {
			throw new AppError(
				"Attachment not found",
				"RESOLUTION_ATTACHMENT_NOT_FOUND",
				404,
			);
		}

		await this.storageProvider.deleteFile(
			`complaint-resolutions/${resolution.id}/${attachmentId}`,
		);

		await this.complaintsRepository.deleteResolutionAttachment(
			userId,
			resolution.id,
			attachmentId,
		);
	}
}
