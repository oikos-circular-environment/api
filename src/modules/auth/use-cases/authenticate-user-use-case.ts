import { compare } from "bcryptjs";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import type { AuthRepository } from "@/modules/auth/repositories/auth-repository.js";

type AuthenticateUserUseCaseRequest = {
	email: string;
	password: string;
};

export type AuthenticatedUser = {
	id: string;
	email: string;
};

export class AuthenticateUserUseCase {
	constructor(private readonly authRepository: AuthRepository) {}

	async execute({
		email,
		password,
	}: AuthenticateUserUseCaseRequest): Promise<AuthenticatedUser> {
		const user = await this.authRepository.findByEmail(email);

		if (!user) {
			throw new InvalidCredentialsError();
		}

		const doesPasswordMatch = await compare(password, user.password);

		if (!doesPasswordMatch) {
			throw new InvalidCredentialsError();
		}

		return {
			id: user.id,
			email: user.email,
		};
	}
}
