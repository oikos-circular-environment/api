import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { makeAuthUser } from "@/modules/auth/factories/make-auth-user.js";
import { InMemoryAuthRepository } from "@/modules/auth/repositories/in-memory/in-memory-auth-repository.js";
import { InMemoryRefreshTokenRepository } from "@/modules/auth/repositories/in-memory/in-memory-refresh-token-repository.js";
import { RefreshTokenUseCase } from "./refresh-token-use-case.js";

const ONE_HOUR = 60 * 60 * 1000;

describe("refresh-token-use-case", () => {
	let authRepository: InMemoryAuthRepository;
	let refreshTokenRepository: InMemoryRefreshTokenRepository;
	let sut: RefreshTokenUseCase;

	beforeEach(() => {
		authRepository = new InMemoryAuthRepository();
		refreshTokenRepository = new InMemoryRefreshTokenRepository();
		sut = new RefreshTokenUseCase(authRepository, refreshTokenRepository);
	});

	async function createUserWithToken() {
		const credentials = makeAuthUser();
		const user = await authRepository.create({
			email: credentials.email,
			password: "hashed-password",
		});
		const currentJti = randomUUID();
		await refreshTokenRepository.create({
			jti: currentJti,
			userId: user.id,
			expiresAt: new Date(Date.now() + ONE_HOUR),
		});
		return { user, currentJti };
	}

	it("rotates the token and returns the user", async () => {
		const { user, currentJti } = await createUserWithToken();
		const newJti = randomUUID();

		const result = await sut.execute({
			userId: user.id,
			currentJti,
			newJti,
			newExpiresAt: new Date(Date.now() + ONE_HOUR),
		});

		expect(result).toStrictEqual({ id: user.id, email: user.email });

		const oldToken = await refreshTokenRepository.findByJti(currentJti);
		expect(oldToken?.revokedAt).toBeInstanceOf(Date);

		const newToken = await refreshTokenRepository.findByJti(newJti);
		expect(newToken?.revokedAt).toBeNull();
		expect(newToken?.userId).toBe(user.id);
	});

	it("throws InvalidCredentialsError when user does not exist", async () => {
		await expect(
			sut.execute({
				userId: randomUUID(),
				currentJti: randomUUID(),
				newJti: randomUUID(),
				newExpiresAt: new Date(Date.now() + ONE_HOUR),
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws InvalidCredentialsError when the refresh token is unknown", async () => {
		const { user } = await createUserWithToken();

		await expect(
			sut.execute({
				userId: user.id,
				currentJti: randomUUID(),
				newJti: randomUUID(),
				newExpiresAt: new Date(Date.now() + ONE_HOUR),
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws InvalidCredentialsError when the refresh token was already revoked", async () => {
		const { user, currentJti } = await createUserWithToken();
		await refreshTokenRepository.revoke(currentJti);

		await expect(
			sut.execute({
				userId: user.id,
				currentJti,
				newJti: randomUUID(),
				newExpiresAt: new Date(Date.now() + ONE_HOUR),
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws InvalidCredentialsError when the refresh token is expired", async () => {
		const credentials = makeAuthUser();
		const user = await authRepository.create({
			email: credentials.email,
			password: "hashed-password",
		});
		const currentJti = randomUUID();
		await refreshTokenRepository.create({
			jti: currentJti,
			userId: user.id,
			expiresAt: new Date(Date.now() - ONE_HOUR),
		});

		await expect(
			sut.execute({
				userId: user.id,
				currentJti,
				newJti: randomUUID(),
				newExpiresAt: new Date(Date.now() + ONE_HOUR),
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws InvalidCredentialsError when the token belongs to another user", async () => {
		const { currentJti } = await createUserWithToken();
		const other = await authRepository.create({
			email: makeAuthUser().email,
			password: "hashed-password",
		});

		await expect(
			sut.execute({
				userId: other.id,
				currentJti,
				newJti: randomUUID(),
				newExpiresAt: new Date(Date.now() + ONE_HOUR),
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});
