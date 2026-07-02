import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Complaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

const COMPLAINT_ATTACHMENT_MAX_SIZE_IN_BYTES = 50 * 1024 * 1024; // 50MB

const COMPLAINT_ATTACHMENT_MIME_TYPES = {
	"image/jpeg": { ext: "jpeg", type: "PHOTO" as const },
	"image/png": { ext: "png", type: "PHOTO" as const },
	"video/mp4": { ext: "mp4", type: "VIDEO" as const },
	"video/quicktime": { ext: "mov", type: "VIDEO" as const },
	"video/webm": { ext: "webm", type: "VIDEO" as const },
} as const;

type SupportedComplaintAttachmentMimeType =
	keyof typeof COMPLAINT_ATTACHMENT_MIME_TYPES;

type CreateComplaintAttachmentUseCaseRequest = {
	userId: string;
	complaintId: string;
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
		complaintId,
		file,
	}: CreateComplaintAttachmentUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (!(file.mimeType in COMPLAINT_ATTACHMENT_MIME_TYPES)) {
			throw new AppError(
				"Complaint attachment type is invalid. Allowed types: jpeg, png, mp4, mov, webm",
				"COMPLAINT_ATTACHMENT_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > COMPLAINT_ATTACHMENT_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Complaint attachment exceeds the maximum size of 50MB",
				"COMPLAINT_ATTACHMENT_TOO_LARGE",
				400,
			);
		}

		const { ext, type } =
			COMPLAINT_ATTACHMENT_MIME_TYPES[
				file.mimeType as SupportedComplaintAttachmentMimeType
			];

		const filePath = `complaints/${complaintId}/${Date.now()}.${ext}`;

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
			await this.complaintsRepository.attachByComplaintId(userId, complaintId, {
				url,
				file_name: file.fileName,
				path: filePath,
				base64: file.content.toString("base64"),
				type,
				metadata: null,
			});

		if (!updatedComplaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		return updatedComplaint;
	}
}
