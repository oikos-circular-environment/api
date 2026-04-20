import type { Profile } from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type GetProfileUseCaseRequest = {
  userId: string;
};

export class GetProfileUseCase {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async execute({ userId }: GetProfileUseCaseRequest): Promise<Profile | null> {
    return this.profilesRepository.findByUserId(userId);
  }
}
