import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import { BanUserUseCase } from "../../users/use-cases/ban-user-use-case.js";
import { RevokeUserSessionsUseCase } from "../../users/use-cases/revoke-user-sessions-use-case.js";
import { InMemoryModerationDenunciationsRepository } from "../repositories/in-memory/in-memory-moderation-denunciations-repository.js";
import { ModerateDenunciationBanUseCase } from "./moderate-denunciation-ban-use-case.js";

function makeModeratorHeaders() {
	const provider = new InMemoryAuthProvider();

	return {
		provider,
		prepare: async () => {
			const admin = await provider.createUser(
				{
					name: "Admin",
					email: "admin@example.com",
					password: "Test@123456",
					role: "moderator",
				},
				new Headers(),
			);
			const session = await provider.signInWithPassword({
				email: admin.email,
				password: "Test@123456",
			});
			return new Headers({
				authorization: `Bearer ${session.token}`,
			});
		},
	};
}

describe("moderate-denunciation-ban-use-case", () => {
	it("throws DENUNCIATION_NOT_FOUND for non-existent id", async () => {
		const provider = new InMemoryAuthProvider();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: "non-existent",
				moderatorId: "mod-1",
				banReason: "spam",
				headers: new Headers(),
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws DENUNCIATION_ALREADY_FINALIZED when status is CLOSED", async () => {
		const provider = new InMemoryAuthProvider();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		const created = await denunciationsRepository.create({
			title: "Already closed",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.updateStatus(created.id, {
			status: "CLOSED",
			moderatedBy: "mod-1",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: created.id,
				moderatorId: "mod-2",
				banReason: "spam",
				headers: new Headers(),
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws DENUNCIATION_ALREADY_FINALIZED when status is RESOLVED", async () => {
		const provider = new InMemoryAuthProvider();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		const created = await denunciationsRepository.create({
			title: "Already resolved",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.updateStatus(created.id, {
			status: "RESOLVED",
			moderatedBy: "mod-1",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: created.id,
				moderatorId: "mod-2",
				banReason: "spam",
				headers: new Headers(),
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws DENUNCIATION_ALREADY_FINALIZED when status is CANCELLED", async () => {
		const provider = new InMemoryAuthProvider();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		const created = await denunciationsRepository.create({
			title: "Cancelled",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.updateStatus(created.id, {
			status: "CANCELLED",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: created.id,
				moderatorId: "mod-2",
				banReason: "spam",
				headers: new Headers(),
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws DENUNCIATION_HAS_NO_TARGET_USER when reported_user_id is null", async () => {
		const provider = new InMemoryAuthProvider();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		const created = await denunciationsRepository.create({
			title: "No target user",
			description: "desc",
			reporter_email: "a@test.com",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: created.id,
				moderatorId: "mod-1",
				banReason: "spam",
				headers: new Headers(),
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_HAS_NO_TARGET_USER");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("bans user, revokes sessions, and marks denunciation RESOLVED with audit fields", async () => {
		const { provider, prepare } = makeModeratorHeaders();
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const banUserUseCase = new BanUserUseCase(provider);
		const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(provider);
		const sut = new ModerateDenunciationBanUseCase(
			denunciationsRepository,
			banUserUseCase,
			revokeUserSessionsUseCase,
		);

		const { user: targetUser } = await provider.signUpWithPassword({
			name: "Bad User",
			email: "bad@example.com",
			password: "Test@123456",
		});

		const created = await denunciationsRepository.create({
			title: "Spam report",
			description: "desc",
			reporter_email: "a@test.com",
			reported_user_id: targetUser.id,
		});

		const headers = await prepare();

		const result = await sut.execute({
			denunciationId: created.id,
			moderatorId: "mod-1",
			banReason: "repeated spam",
			headers,
		});

		expect(result.user.banned).toBe(true);
		expect(result.denunciation.status).toBe("RESOLVED");
		expect(result.denunciation.moderated_by).toBe("mod-1");
		expect(result.denunciation.moderated_at).toBeInstanceOf(Date);
		expect(result.denunciation.reason).toBe("repeated spam");

		const sessions = await provider.listUserSessions(
			{ userId: targetUser.id },
			new Headers(),
		);
		expect(sessions).toHaveLength(0);
	});
});
