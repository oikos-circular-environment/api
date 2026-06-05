import type {
	CreateAddress,
	CreateProfile,
	Profile,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { AddressesRepository } from "@/modules/profiles/repositories/address-repository.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type UpsertProfileUseCaseRequest = {
	userId: string;
	data: Omit<CreateProfile, "user_id"> & {
		address?: Omit<CreateAddress, "profile_id"> | null;
	};
};

export class UpsertProfileUseCase {
	constructor(
		private readonly profilesRepository: ProfilesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
		data,
	}: UpsertProfileUseCaseRequest): Promise<Profile> {
		const { address: addressData, ...profileData } = data;

		const profile = await this.profilesRepository.upsert({
			...profileData,
			user_id: userId,
		});

		if (addressData) {
			const existingAddress = await this.addressesRepository.findByProfileId(
				profile.id,
			);

			if (existingAddress) {
				profile.address = await this.addressesRepository.update(
					existingAddress.id,
					addressData,
				);
			} else {
				profile.address = await this.addressesRepository.create({
					...addressData,
					profile_id: profile.id,
				});
			}
		}

		return profile;
	}
}
