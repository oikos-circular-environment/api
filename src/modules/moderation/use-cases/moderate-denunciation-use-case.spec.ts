import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryDenunciationsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-denunciations-repository.js";
import { ModerateDenunciationUseCase } from "./moderate-denunciation-use-case.js";

describe("moderate-denunciation-use-case", () => {
	it("closes a denunciation with audit fields", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Harassment report",
			description: "desc",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
			status: "CLOSED",
			severity: "HIGH",
			reason: "User warned",
			moderatedBy: "mod-1",
		});

		expect(result.denunciation.status).toBe("CLOSED");
		expect(result.denunciation.severity).toBe("HIGH");
		expect(result.denunciation.reason).toBe("User warned");
		expect(result.denunciation.moderated_by).toBe("mod-1");
		expect(result.denunciation.moderated_at).toBeInstanceOf(Date);
	});

	it("resolves a denunciation", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Spam report",
			description: "desc",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
			status: "RESOLVED",
			reason: "Content removed",
			moderatedBy: "mod-1",
		});

		expect(result.denunciation.status).toBe("RESOLVED");
	});

	it("throws DENUNCIATION_NOT_FOUND for non-existent id", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				denunciationId: "non-existent",
				status: "CLOSED",
				moderatedBy: "mod-1",
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
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

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
				status: "RESOLVED",
				moderatedBy: "mod-2",
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
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

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
				status: "CLOSED",
				moderatedBy: "mod-2",
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
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new ModerateDenunciationUseCase(denunciationsRepository);

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
				status: "CLOSED",
				moderatedBy: "mod-1",
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
});
