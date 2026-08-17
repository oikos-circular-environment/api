import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import type { AuthRepository } from "@/modules/auth/repositories/auth-repository.js";
import type { RefreshTokenRepository } from "@/modules/auth/repositories/refresh-token-repository.js";

type RefreshTokenUseCaseRequest = {
	userId: string;
	currentJti: string;
	newJti: string;
	newExpiresAt: Date;
};

export type RefreshedUser = {
	id: string;
	email: string;
};

export class RefreshTokenUseCase {
	constructor(
		private readonly authRepository: AuthRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
	) {}

	async execute({
		userId,
		currentJti,
		newJti,
		newExpiresAt,
	}: RefreshTokenUseCaseRequest): Promise<RefreshedUser> {
		const user = await this.authRepository.findById(userId);

		if (!user) {
			throw new InvalidCredentialsError();
		}

		const stored = await this.refreshTokenRepository.findByJti(currentJti);

		const isUsable =
			stored !== null &&
			stored.userId === userId &&
			stored.revokedAt === null &&
			stored.expiresAt.getTime() > Date.now();

		if (!isUsable) {
			throw new InvalidCredentialsError();
		}

		// Rotate: revoke the presented token and persist the replacement.
		await this.refreshTokenRepository.revoke(currentJti);
		await this.refreshTokenRepository.create({
			jti: newJti,
			userId,
			expiresAt: newExpiresAt,
		});

		return {
			id: user.id,
			email: user.email,
		};
	}
}
