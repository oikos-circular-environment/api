import { compare, hash } from "bcryptjs";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import type { RefreshTokenRepository } from "@/modules/auth/repositories/refresh-token-repository.js";
import { SamePasswordError } from "@/modules/users/errors/same-password-error.js";
import { UserNotFoundError } from "@/modules/users/errors/user-not-found-error.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

type ChangePasswordUseCaseRequest = {
	userId: string;
	currentPassword: string;
	newPassword: string;
};

export type ChangePasswordResult = {
	id: string;
	email: string;
};

export class ChangePasswordUseCase {
	constructor(
		private readonly usersRepository: UsersRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
	) {}

	async execute({
		userId,
		currentPassword,
		newPassword,
	}: ChangePasswordUseCaseRequest): Promise<ChangePasswordResult> {
		const user = await this.usersRepository.findByIdWithPassword(userId);

		if (!user) {
			throw new UserNotFoundError();
		}

		const currentPasswordMatches = await compare(
			currentPassword,
			user.password,
		);

		if (!currentPasswordMatches) {
			throw new InvalidCredentialsError();
		}

		const newPasswordIsSame = await compare(newPassword, user.password);

		if (newPasswordIsSame) {
			throw new SamePasswordError();
		}

		const newPasswordHash = await hash(newPassword, 6);
		await this.usersRepository.updatePassword(userId, newPasswordHash);

		// Drop every other session; the caller mints a fresh pair for this device.
		await this.refreshTokenRepository.revokeAllForUser(userId);

		return { id: user.id, email: user.email };
	}
}
