import { AppError } from "@/modules/common/errors/app-error.js";
import type { Address, CreateAddress } from "@/modules/profiles/dtos/profiles-dto.js";
import type { AddressesRepository } from "@/modules/profiles/repositories/address-repository.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type CreateProfileAddressUseCaseRequest = {
  userId: string;
  data: Omit<CreateAddress, "profile_id">;
};

export class CreateProfileAddressUseCase {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly addressesRepository: AddressesRepository,
  ) {}

  async execute({ userId, data }: CreateProfileAddressUseCaseRequest): Promise<Address> {
    const profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError("Profile not found", "PROFILE_NOT_FOUND", 404);
    }

    const existingAddress = await this.addressesRepository.findByProfileId(profile.id);

    if (existingAddress) {
      throw new AppError("Address already exists", "ADDRESS_ALREADY_EXISTS", 409);
    }

    return this.addressesRepository.create({
      ...data,
      profile_id: profile.id,
    });
  }
}
