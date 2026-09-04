import { fileTypeFromBuffer } from "file-type";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type {
	CreateSupport,
	Support,
} from "@/modules/support/dtos/support-dto.js";
import type { SupportsRepository } from "@/modules/support/repositories/supports-repository.js";

export const SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_SUPPORT_FILES = 5;

const SUPPORT_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedSupportAttachmentMimeType =
	keyof typeof SUPPORT_ATTACHMENT_MIME_TYPES;

type CreateSupportUseCaseRequest = CreateSupport & {
	userId?: string | null;
	files: Array<{
		fileName: string;
		mimeType: string;
		content: Buffer;
	}>;
};

export class CreateSupportUseCase {
	constructor(
		private readonly supportsRepository: SupportsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		title,
		description,
		type,
		environment,
		reporter_email,
		files,
	}: CreateSupportUseCaseRequest): Promise<Support> {
		if (files.length > MAX_SUPPORT_FILES) {
			throw new AppError(
				`Support accepts at most ${MAX_SUPPORT_FILES} images`,
				"SUPPORT_TOO_MANY_FILES",
				400,
			);
		}

		for (const file of files) {
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

			const detected = await fileTypeFromBuffer(file.content);
			if (!detected || detected.mime !== file.mimeType) {
				throw new AppError(
					"Support attachment content does not match a valid image",
					"SUPPORT_ATTACHMENT_CONTENT_INVALID",
					400,
				);
			}
		}

		let support = await this.supportsRepository.create({
			title,
			description,
			type,
			environment: environment ?? null,
			reporter_email,
			user_id: userId ?? null,
		});

		for (const [index, file] of files.entries()) {
			const ext =
				SUPPORT_ATTACHMENT_MIME_TYPES[
					file.mimeType as SupportedSupportAttachmentMimeType
				];

			const filePath = `moderation/support/${support.id}/${index}-${Date.now()}.${ext}`;

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

			const updated = await this.supportsRepository.attach(support.id, {
				url,
				file_name: file.fileName,
				path: filePath,
			});

			if (!updated) {
				throw new AppError("Support not found", "SUPPORT_NOT_FOUND", 404);
			}

			support = updated;
		}

		return support;
	}
}
