import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

type Request = {
	denunciationId: string;
	userId: string;
	attachmentId: string;
};

export class DeleteDenunciationAttachmentUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		denunciationId,
		userId,
		attachmentId,
	}: Request): Promise<void> {
		const denunciation = await this.denunciationsRepository.findByIdAndOwner(
			denunciationId,
			userId,
		);

		if (!denunciation) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		if (denunciation.status !== "OPEN") {
			throw new AppError(
				"Denunciation has already been moderated",
				"DENUNCIATION_ALREADY_MODERATED",
				422,
			);
		}

		const attachment = denunciation.attachments.find(
			(a) => a.id === attachmentId,
		);

		if (!attachment) {
			throw new AppError(
				"Attachment not found",
				"DENUNCIATION_ATTACHMENT_NOT_FOUND",
				404,
			);
		}

		await this.storageProvider.deleteFile(attachment.path);

		await this.denunciationsRepository.deleteAttachment(
			denunciationId,
			attachmentId,
		);
	}
}
