import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Denunciation } from "@/modules/moderation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/moderation/repositories/denunciations-repository.js";

const DENUNCIATION_ATTACHMENT_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB

const DENUNCIATION_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": { ext: "jpeg", type: "PHOTO" as const },
	"image/png": { ext: "png", type: "PHOTO" as const },
	"video/mp4": { ext: "mp4", type: "VIDEO" as const },
	"video/quicktime": { ext: "mov", type: "VIDEO" as const },
	"video/webm": { ext: "webm", type: "VIDEO" as const },
} as const;

type SupportedDenunciationAttachmentMimeType =
	keyof typeof DENUNCIATION_ATTACHMENT_MIME_TYPES;

type CreateDenunciationAttachmentUseCaseRequest = {
	denunciationId: string;
	file: {
		fileName: string;
		mimeType: string;
		content: Buffer;
	};
};

export class CreateDenunciationAttachmentUseCase {
	constructor(
		private readonly denunciationsRepository: DenunciationsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		denunciationId,
		file,
	}: CreateDenunciationAttachmentUseCaseRequest): Promise<Denunciation> {
		const denunciation =
			await this.denunciationsRepository.findById(denunciationId);

		if (!denunciation) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		if (!(file.mimeType in DENUNCIATION_ATTACHMENT_MIME_TYPES)) {
			throw new AppError(
				"Denunciation attachment type is invalid. Allowed types: jpeg, png, mp4, mov, webm",
				"DENUNCIATION_ATTACHMENT_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > DENUNCIATION_ATTACHMENT_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Denunciation attachment exceeds the maximum size of 10MB",
				"DENUNCIATION_ATTACHMENT_TOO_LARGE",
				400,
			);
		}

		const { ext, type } =
			DENUNCIATION_ATTACHMENT_MIME_TYPES[
				file.mimeType as SupportedDenunciationAttachmentMimeType
			];

		const filePath = `denunciations/${denunciationId}/${Date.now()}.${ext}`;

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload denunciation attachment",
				"DENUNCIATION_ATTACHMENT_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);

		const updated = await this.denunciationsRepository.attach(denunciationId, {
			url,
			file_name: file.fileName,
			path: filePath,
			base64: file.content.toString("base64"),
			type,
			metadata: null,
		});

		if (!updated) {
			throw new AppError(
				"Denunciation not found",
				"DENUNCIATION_NOT_FOUND",
				404,
			);
		}

		return updated;
	}
}
