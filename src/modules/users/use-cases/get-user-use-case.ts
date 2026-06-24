import type { User } from "@/modules/users/dtos/users-dto.js";
import { UserNotFoundError } from "@/modules/users/errors/user-not-found-error.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

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
