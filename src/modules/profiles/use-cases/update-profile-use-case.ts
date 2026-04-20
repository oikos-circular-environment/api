import { AppError } from "@/modules/common/errors/app-error.js";
import type { Profile, UpdateProfile } from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type UpdateProfileUseCaseRequest = {
  userId: string;
  data: UpdateProfile;
};

export class UpdateProfileUseCase {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async execute({ userId, data }: UpdateProfileUseCaseRequest): Promise<Profile | null> {
    const profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
    }

    return this.profilesRepository.update(profile.id, data);
  }
}
