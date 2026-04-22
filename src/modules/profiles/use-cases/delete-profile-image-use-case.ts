import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Profile } from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type DeleteProfileImageUseCaseRequest = {
	userId: string;
};

export class DeleteProfileImageUseCase {
	constructor(
		private readonly profilesRepository: ProfilesRepository,
		private readonly storageProvider: StorageProvider,
	) {}

	async execute({ userId }: DeleteProfileImageUseCaseRequest): Promise<void> {
		const profile = await this.profilesRepository.findByUserId(userId);

		if (!profile) {
			throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
		}

		if (!profile.profile_image) {
			throw new AppError(
				"Profile does not have an image to delete",
				"PROFILE_IMAGE_NOT_FOUND",
				404,
			);
		}

		await this.storageProvider.deleteFile(profile.profile_image.path);

		await this.profilesRepository.deleteProfileImage(profile.id);
	}
}
