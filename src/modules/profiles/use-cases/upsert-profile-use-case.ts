import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CreateProfile,
	Profile,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "@/modules/profiles/repositories/profiles-repository.js";

type UpsertProfileUseCaseRequest = {
	userId: string;
	data: Omit<CreateProfile, "user_id">;
};

export class UpsertProfileUseCase {
	constructor(private readonly profilesRepository: ProfilesRepository) {}

	async execute({
		userId,
		data,
	}: UpsertProfileUseCaseRequest): Promise<Profile> {
		const profileWithCpf = await this.profilesRepository.findByCpf(data.cpf);

		if (profileWithCpf && profileWithCpf.user_id !== userId) {
			throw new AppError("CPF already in use", "CPF_ALREADY_IN_USE", 409);
		}

		return this.profilesRepository.upsert({ ...data, user_id: userId });
	}
}
