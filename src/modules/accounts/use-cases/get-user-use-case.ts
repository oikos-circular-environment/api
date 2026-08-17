import type { User } from "@/modules/accounts/dtos/accounts-dto.js";
import { UserNotFoundError } from "@/modules/accounts/errors/user-not-found-error.js";
import type { UsersRepository } from "@/modules/accounts/repositories/users-repository.js";

type GetUserUseCaseRequest = {
	userId: string;
};

export class GetUserUseCase {
	constructor(private readonly usersRepository: UsersRepository) {}

	async execute({ userId }: GetUserUseCaseRequest): Promise<User> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			throw new UserNotFoundError();
		}

		return user;
	}
}
