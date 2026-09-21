import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Support } from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

export const SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB

export const MAX_SUPPORT_ATTACHMENT_FILES = 1;

export const MAX_SUPPORT_ATTACHMENTS_TOTAL = 5;

const SUPPORT_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedSupportAttachmentMimeType =
	keyof typeof SUPPORT_ATTACHMENT_MIME_TYPES;

type CreateSupportAttachmentUseCaseRequest = {
	supportId: string;
	file: {
		fileName: string;
		mimeType: string;
		content: Buffer;
	};
};

export class CreateSupportAttachmentUseCase {
	constructor(
		private readonly supportsRepository: SupportsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		supportId,
		file,
	}: CreateSupportAttachmentUseCaseRequest): Promise<Support> {
		const support = await this.supportsRepository.findById(supportId);

		if (!support) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		if (support.status !== "OPEN") {
			throw new AppError(
				"Support has already been moderated",
				"SUPPORT_ALREADY_MODERATED",
				422,
			);
		}

		if (!(file.mimeType in SUPPORT_ATTACHMENT_MIME_TYPES)) {
			throw new AppError(
				"Support attachment type is invalid. Allowed types: jpeg, png",
				"SUPPORT_ATTACHMENT_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Support attachment exceeds the maximum size of 10MB",
				"SUPPORT_ATTACHMENT_TOO_LARGE",
				400,
			);
		}

		if (support.attachments.length >= MAX_SUPPORT_ATTACHMENTS_TOTAL) {
			throw new AppError(
				`Support accepts at most ${MAX_SUPPORT_ATTACHMENTS_TOTAL} attachments`,
				"SUPPORT_TOO_MANY_ATTACHMENTS",
				400,
			);
		}

		const ext =
			SUPPORT_ATTACHMENT_MIME_TYPES[
				file.mimeType as SupportedSupportAttachmentMimeType
			];

		const filePath = `moderation/support/${supportId}/${Date.now()}.${ext}`;

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload support attachment",
				"SUPPORT_ATTACHMENT_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);

		const updated = await this.supportsRepository.attach(supportId, {
			url,
			file_name: file.fileName,
			path: filePath,
		});

		if (!updated) {
			throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
		}

		return updated;
	}
}
