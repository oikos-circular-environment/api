import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { SamePasswordError } from "@/modules/accounts/errors/same-password-error.js";
import { UserNotFoundError } from "@/modules/accounts/errors/user-not-found-error.js";
import { InMemoryUsersRepository } from "@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InMemoryRefreshTokenRepository } from "@/modules/auth/repositories/in-memory/in-memory-refresh-token-repository.js";
import { ChangePasswordUseCase } from "./change-password-use-case.js";

const ONE_HOUR = 60 * 60 * 1000;
const CURRENT_PASSWORD = "current-password-123";

describe("change-password-use-case", () => {
	let usersRepository: InMemoryUsersRepository;
	let refreshTokenRepository: InMemoryRefreshTokenRepository;
	let sut: ChangePasswordUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		refreshTokenRepository = new InMemoryRefreshTokenRepository();
		sut = new ChangePasswordUseCase(usersRepository, refreshTokenRepository);
	});

	async function createUser() {
		const passwordHash = await hash(CURRENT_PASSWORD, 6);
		const user = await usersRepository.create({
			email: `user-${randomUUID()}@test.local`,
			password: passwordHash,
		});
		return user;
	}

	it("changes the password and returns the user", async () => {
		const user = await createUser();

		const result = await sut.execute({
			userId: user.id,
			currentPassword: CURRENT_PASSWORD,
			newPassword: "brand-new-password-456",
		});

		expect(result).toStrictEqual({ id: user.id, email: user.email });

		const stored = await usersRepository.findByIdWithPassword(user.id);
		const matches = stored?.password
			? await compare("brand-new-password-456", stored.password)
			: false;
		expect(matches).toBe(true);
	});

	it("revokes every active refresh token of the user", async () => {
		const user = await createUser();
		await refreshTokenRepository.create({
			jti: randomUUID(),
			userId: user.id,
			expiresAt: new Date(Date.now() + ONE_HOUR),
		});
		await refreshTokenRepository.create({
			jti: randomUUID(),
			userId: user.id,
			expiresAt: new Date(Date.now() + ONE_HOUR),
		});

		await sut.execute({
			userId: user.id,
			currentPassword: CURRENT_PASSWORD,
			newPassword: "brand-new-password-456",
		});

		const active = refreshTokenRepository.items.filter(
			(token) => token.userId === user.id && token.revokedAt === null,
		);
		expect(active).toHaveLength(0);
	});

	it("throws UserNotFoundError when the user does not exist", async () => {
		await expect(
			sut.execute({
				userId: randomUUID(),
				currentPassword: CURRENT_PASSWORD,
				newPassword: "brand-new-password-456",
			}),
		).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it("throws InvalidCredentialsError when the current password is wrong", async () => {
		const user = await createUser();

		await expect(
			sut.execute({
				userId: user.id,
				currentPassword: "wrong-password-999",
				newPassword: "brand-new-password-456",
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws SamePasswordError when the new password equals the current one", async () => {
		const user = await createUser();

		await expect(
			sut.execute({
				userId: user.id,
				currentPassword: CURRENT_PASSWORD,
				newPassword: CURRENT_PASSWORD,
			}),
		).rejects.toBeInstanceOf(SamePasswordError);
	});
});
