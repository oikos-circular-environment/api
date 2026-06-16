import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Company } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

const COMPANY_AVATAR_MAX_SIZE_IN_BYTES = 5 * 1024 * 1024; // 5MB

const COMPANY_AVATAR_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedCompanyAvatarMimeType = keyof typeof COMPANY_AVATAR_MIME_TYPES;

type UploadCompanyAvatarUseCaseRequest = {
	userId: string;
	companyId: string;
	file: {
		fileName: string;
		mimeType: string;
		content: Buffer;
	};
};

export class UploadCompanyAvatarUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		companyId,
		file,
	}: UploadCompanyAvatarUseCaseRequest): Promise<Company> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		if (!(file.mimeType in COMPANY_AVATAR_MIME_TYPES)) {
			throw new AppError(
				"Company avatar type is invalid. Allowed types: jpeg and png",
				"COMPANY_AVATAR_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > COMPANY_AVATAR_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Company avatar exceeds the maximum size of 5MB",
				"COMPANY_AVATAR_TOO_LARGE",
				400,
			);
		}

		const extension =
			COMPANY_AVATAR_MIME_TYPES[
				file.mimeType as SupportedCompanyAvatarMimeType
			];

		const filePath = `companies/${companyId}.${extension}`;
		const oldAvatarPath = company.avatar?.path ?? null;

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload company avatar",
				"COMPANY_AVATAR_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);

		const updatedCompany = await this.companiesRepository.uploadAvatar(
			companyId,
			{
				url,
				file_name: file.fileName,
				path: filePath,
			},
		);

		if (!updatedCompany) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		// Delete old storage file after the DB is successfully updated.
		// Skip deletion when path is identical (same extension re-upload overwrites in place).
		if (oldAvatarPath && oldAvatarPath !== filePath) {
			await this.storageProvider.deleteFile(oldAvatarPath).catch(() => {});
		}

		return updatedCompany;
	}
}
