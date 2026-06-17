import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import type { AuthRepository } from "@/modules/auth/repositories/auth-repository.js";

type RefreshTokenUseCaseRequest = {
	userId: string;
};

export type RefreshedUser = {
	id: string;
	email: string;
};

export class RefreshTokenUseCase {
	constructor(private readonly authRepository: AuthRepository) {}

	async execute({
		userId,
	}: RefreshTokenUseCaseRequest): Promise<RefreshedUser> {
		const user = await this.authRepository.findById(userId);

		if (!user) {
			throw new InvalidCredentialsError();
		}

		return {
			id: user.id,
			email: user.email,
		};
	}
}
