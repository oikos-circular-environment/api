import { fileTypeFromBuffer } from "file-type";
import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CreateSupportRequestBody,
	SupportRequest,
} from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportRequestsRepository } from "@/modules/moderation/repositories/support-requests-repository.js";
import type { StorageProvider } from "@/shared/providers/storage/storage.js";

export const SUPPORT_REQUEST_ATTACHMENT_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_SUPPORT_REQUEST_FILES = 5;

const SUPPORT_REQUEST_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedSupportRequestAttachmentMimeType =
	keyof typeof SUPPORT_REQUEST_ATTACHMENT_MIME_TYPES;

type CreateSupportRequestUseCaseRequest = CreateSupportRequestBody & {
	userId?: string | null;
	files: Array<{
		fileName: string;
		mimeType: string;
		content: Buffer;
	}>;
};

export class CreateSupportRequestUseCase {
	constructor(
		private readonly supportRequestsRepository: SupportRequestsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		title,
		description,
		files,
	}: CreateSupportRequestUseCaseRequest): Promise<SupportRequest> {
		if (files.length > MAX_SUPPORT_REQUEST_FILES) {
			throw new AppError(
				`Support request accepts at most ${MAX_SUPPORT_REQUEST_FILES} images`,
				"SUPPORT_REQUEST_TOO_MANY_FILES",
				400,
			);
		}

		for (const file of files) {
			if (!(file.mimeType in SUPPORT_REQUEST_ATTACHMENT_MIME_TYPES)) {
				throw new AppError(
					"Support request attachment type is invalid. Allowed types: jpeg, png",
					"SUPPORT_REQUEST_ATTACHMENT_TYPE_INVALID",
					400,
				);
			}

			if (file.content.length > SUPPORT_REQUEST_ATTACHMENT_MAX_SIZE_IN_BYTES) {
				throw new AppError(
					"Support request attachment exceeds the maximum size of 10MB",
					"SUPPORT_REQUEST_ATTACHMENT_TOO_LARGE",
					400,
				);
			}

			const detected = await fileTypeFromBuffer(file.content);
			if (
				!detected ||
				!(detected.mime in SUPPORT_REQUEST_ATTACHMENT_MIME_TYPES)
			) {
				throw new AppError(
					"Support request attachment content does not match a valid image",
					"SUPPORT_REQUEST_ATTACHMENT_CONTENT_INVALID",
					400,
				);
			}
		}

		let supportRequest = await this.supportRequestsRepository.create({
			title,
			description,
			user_id: userId ?? null,
		});

		for (const [index, file] of files.entries()) {
			const ext =
				SUPPORT_REQUEST_ATTACHMENT_MIME_TYPES[
					file.mimeType as SupportedSupportRequestAttachmentMimeType
				];

			const filePath = `moderation/support/${supportRequest.id}/${index}-${Date.now()}.${ext}`;

			const uploadResult = await this.storageProvider.uploadFile(
				filePath,
				file.content,
			);

			if (!uploadResult) {
				throw new AppError(
					"Failed to upload support request attachment",
					"SUPPORT_REQUEST_ATTACHMENT_UPLOAD_FAILED",
					500,
				);
			}

			const { url } = await this.storageProvider.getFileUrl(filePath);

			const updated = await this.supportRequestsRepository.attach(
				supportRequest.id,
				{
					url,
					file_name: file.fileName,
					path: filePath,
				},
			);

			if (!updated) {
				throw new AppError(
					"Support request not found",
					"SUPPORT_REQUEST_NOT_FOUND",
					404,
				);
			}

			supportRequest = updated;
		}

		return supportRequest;
	}
}
