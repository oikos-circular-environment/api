import { hash } from "bcryptjs";
import type { User } from "@/modules/accounts/dtos/accounts-dto.js";
import type { UsersRepository } from "@/modules/accounts/repositories/users-repository.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";

type RegisterUserUseCaseRequest = {
	email: string;
	password: string;
};

export class RegisterUserUseCase {
	constructor(private readonly usersRepository: UsersRepository) {}

	async execute({
		email,
		password,
	}: RegisterUserUseCaseRequest): Promise<User> {
		const userWithSameEmail = await this.usersRepository.findByEmail(email);

		if (userWithSameEmail) {
			throw new UserAlreadyExistsError();
		}

		const passwordHash = await hash(password, 6);

		return this.usersRepository.create({
			email,
			password: passwordHash,
		});
	}
}
