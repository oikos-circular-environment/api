import { AppError } from "@/modules/common/errors/app-error.js";
import type { Address, UpdateAddress } from "@/modules/profiles/dtos/profiles-dto.js";
import type { AddressesRepository } from "@/modules/profiles/repositories/address-repository.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type UpdateProfileAddressUseCaseRequest = {
  userId: string;
  data: UpdateAddress;
};

export class UpdateProfileAddressUseCase {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly addressesRepository: AddressesRepository,
  ) {}

  async execute({ userId, data }: UpdateProfileAddressUseCaseRequest): Promise<Address | null> {
    const profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
    }

    const address = await this.addressesRepository.findByProfileId(profile.id);

    if (!address) {
      throw new AppError("Address not found", "ADDRESS_NOT_FOUND", 404);
    }

    return this.addressesRepository.update(address.id, data);
  }
}
