import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CreateProfile,
	Profile,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type CreateProfileUseCaseRequest = {
	userId: string;
	data: Omit<CreateProfile, "user_id">;
};

export class CreateProfileUseCase {
	constructor(private readonly profilesRepository: ProfilesRepository) {}

	async execute({
		userId,
		data,
	}: CreateProfileUseCaseRequest): Promise<Profile> {
		const existingProfile = await this.profilesRepository.findByUserId(userId);

		if (existingProfile) {
			throw new AppError(
				"Profile already exists",
				"PROFILE_ALREADY_EXISTS",
				409,
			);
		}

		const cpfInUse = await this.profilesRepository.findByCpf(data.cpf);

		if (cpfInUse) {
			throw new AppError("CPF already in use", "CPF_ALREADY_IN_USE", 409);
		}

		return this.profilesRepository.create({
			...data,
			user_id: userId,
		});
	}
}
