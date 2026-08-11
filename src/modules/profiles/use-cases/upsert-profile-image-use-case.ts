import { AppError } from "@/modules/common/errors/app-error.js";
import type { ProfileImage } from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";
import type { StorageProvider } from "@/shared/providers/storage/storage.js";

const PROFILE_IMAGE_MAX_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB

const PROFILE_IMAGE_MIME_TYPES = {
	"image/jpeg": "jpeg",
	"image/png": "png",
} as const;

type SupportedProfileImageMimeType = keyof typeof PROFILE_IMAGE_MIME_TYPES;

type UpsertProfileImageUseCaseRequest = {
	userId: string;
	file: {
		fileName: string;
		mimeType: string;
		content: Buffer;
	};
};

export class UpsertProfileImageUseCase {
	constructor(
		private readonly profilesRepository: ProfilesRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({
		userId,
		file,
	}: UpsertProfileImageUseCaseRequest): Promise<ProfileImage> {
		const profile = await this.profilesRepository.findByUserId(userId);

		if (!profile) {
			throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
		}

		if (!(file.mimeType in PROFILE_IMAGE_MIME_TYPES)) {
			throw new AppError(
				"Profile image type is invalid. Allowed types: jpeg and png",
				"PROFILE_IMAGE_TYPE_INVALID",
				400,
			);
		}

		if (file.content.length > PROFILE_IMAGE_MAX_SIZE_IN_BYTES) {
			throw new AppError(
				"Profile image exceeds the maximum size of 10MB",
				"PROFILE_IMAGE_TOO_LARGE",
				400,
			);
		}

		const extension =
			PROFILE_IMAGE_MIME_TYPES[file.mimeType as SupportedProfileImageMimeType];

		const filePath = `profiles/${userId}.${extension}`;

		if (
			profile.profile_image?.path &&
			profile.profile_image.path !== filePath
		) {
			await this.storageProvider.deleteFile(profile.profile_image.path);
		}

		const uploadResult = await this.storageProvider.uploadFile(
			filePath,
			file.content,
		);

		if (!uploadResult) {
			throw new AppError(
				"Failed to upload profile image",
				"PROFILE_IMAGE_UPLOAD_FAILED",
				500,
			);
		}

		const { url } = await this.storageProvider.getFileUrl(filePath);
		const profileImage = await this.profilesRepository.saveProfileImage(
			profile.id,
			{
				url,
				file_name: file.fileName,
				path: filePath,
			},
		);

		if (!profileImage) {
			throw new AppError(
				"Failed to save profile image",
				"PROFILE_IMAGE_SAVE_FAILED",
				500,
			);
		}

		return profileImage;
	}
}
