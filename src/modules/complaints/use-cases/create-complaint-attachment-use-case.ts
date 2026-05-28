import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Complaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

const COMPLAINT_ATTACHMENT_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB

const COMPLAINT_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedComplaintAttachmentMimeType =
	keyof typeof COMPLAINT_ATTACHMENT_MIME_TYPES;

type CreateComplaintAttachmentUseCaseRequest = {
	userId: string;
	capture_id: string;
	file: {
		fileName: string;
		mimeType: string;
		content: Buffer;
	};
};

export class CreateComplaintAttachmentUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		capture_id,
		file,
	}: CreateComplaintAttachmentUseCaseRequest): Promise<Complaint> {
		const capture =
			await this.complaintsRepository.findCaptureByUserAndCaptureId(
				userId,
				capture_id,
			);

		if (!capture) {
			throw new AppError("Capture not found", "CAPTURE_NOT_FOUND", 404);
		}

		if (!(file.mimeType in COMPLAINT_ATTACHMENT_MIME_TYPES)) {
			throw new AppError(
				"Complaint attachment type is invalid. Allowed types: jpeg and png",
				"COMPLAINT_ATTACHMENT_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > COMPLAINT_ATTACHMENT_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Complaint attachment exceeds the maximum size of 10MB",
				"COMPLAINT_ATTACHMENT_TOO_LARGE",
				400,
			);
		}

		const extension =
			COMPLAINT_ATTACHMENT_MIME_TYPES[
				file.mimeType as SupportedComplaintAttachmentMimeType
			];

		const filePath = `complaints/${capture_id}.${extension}`;

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload complaint attachment",
				"COMPLAINT_ATTACHMENT_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);

		const updatedComplaint =
			await this.complaintsRepository.attachByCaptureId(userId, capture_id, {
				url,
				file_name: file.fileName,
				path: filePath,
				base64: file.content.toString("base64"),
				type: "PHOTO",
				metadata: null,
			});

		if (!updatedComplaint) {
			throw new AppError("Capture not found", "CAPTURE_NOT_FOUND", 404);
		}

		return updatedComplaint;
	}
}
