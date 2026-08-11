import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { ResolutionAttachment } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = {
	"image/jpeg": { ext: "jpeg", type: "PHOTO" as const },
	"image/png": { ext: "png", type: "PHOTO" as const },
	"video/mp4": { ext: "mp4", type: "VIDEO" as const },
	"video/quicktime": { ext: "mov", type: "VIDEO" as const },
	"video/webm": { ext: "webm", type: "VIDEO" as const },
} as const;

type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES;

type Request = {
	userId: string;
	complaintId: string;
	file: { fileName: string; mimeType: string; content: Buffer };
};

export class AddResolutionAttachmentUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		complaintId,
		file,
	}: Request): Promise<ResolutionAttachment> {
		const resolution =
			await this.complaintsRepository.findResolutionByUserAndComplaint(
				userId,
				complaintId,
			);

		if (!resolution) {
			throw new AppError("Resolution not found", "RESOLUTION_NOT_FOUND", 404);
		}

		if (!(file.mimeType in ALLOWED_MIME_TYPES)) {
			throw new AppError(
				"Attachment type is invalid. Allowed types: jpeg, png, mp4, mov, webm",
				"RESOLUTION_ATTACHMENT_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > MAX_SIZE_BYTES) {
			throw new AppError(
				"Attachment exceeds the maximum size of 10MB",
				"RESOLUTION_ATTACHMENT_TOO_LARGE",
				400,
			);
		}

		const { ext } = ALLOWED_MIME_TYPES[file.mimeType as AllowedMimeType];
		const filePath = `complaint-resolutions/${resolution.id}/${Date.now()}.${ext}`;

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload resolution attachment",
				"RESOLUTION_ATTACHMENT_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);

		return this.complaintsRepository.addResolutionAttachment(
			userId,
			resolution.id,
			{
				url,
				file_name: file.fileName,
				path: filePath,
				base64: file.content.toString("base64"),
			},
		);
	}
}
