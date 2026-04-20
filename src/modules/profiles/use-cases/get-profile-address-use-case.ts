import { AppError } from "@/modules/common/errors/app-error.js";
import type { Address } from "@/modules/profiles/dtos/profiles-dto.js";
import type { AddressesRepository } from "@/modules/profiles/repositories/address-repository.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type GetProfileAddressUseCaseRequest = {
  userId: string;
};

export class GetProfileAddressUseCase {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly addressesRepository: AddressesRepository,
  ) {}

  async execute({ userId }: GetProfileAddressUseCaseRequest): Promise<Address | null> {
    const profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
    }

    return this.addressesRepository.findByProfileId(profile.id);
  }
}
