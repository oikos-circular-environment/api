import type { UsersRepository } from "@/modules/accounts/repositories/users-repository.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { TransactionManager } from "@/modules/common/providers/transaction/transaction-manager.js";
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
		private readonly usersRepository: UsersRepository,
		private readonly transactionManager: TransactionManager,
	) {}

	async execute({
		userId,
		data,
	}: UpsertProfileUseCaseRequest): Promise<Profile> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			throw new AppError("User not found", "USER_NOT_FOUND", 404);
		}

		const { address: addressData, ...profileData } = data;

		const profile = await this.transactionManager.run(async (tx) => {
			const upserted = await this.profilesRepository.upsert(
				{ ...profileData, user_id: userId },
				tx,
			);
			await this.usersRepository.updateName(userId, profileData.full_name, tx);
			return upserted;
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
