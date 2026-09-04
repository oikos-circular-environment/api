import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryModerationSupportsRepository } from "../repositories/in-memory/in-memory-moderation-supports-repository.js";
import { ModerateSupportUseCase } from "./moderate-support-use-case.js";

describe("moderate-support-use-case", () => {
	it("closes a support with audit fields", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Bug report",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({
			supportId: created.id,
			status: "CLOSED",
			severity: "HIGH",
			reason: "Fixed in v2",
			moderatedBy: "mod-1",
		});

		expect(result.support.status).toBe("CLOSED");
		expect(result.support.severity).toBe("HIGH");
		expect(result.support.reason).toBe("Fixed in v2");
		expect(result.support.moderated_by).toBe("mod-1");
		expect(result.support.moderated_at).toBeInstanceOf(Date);
	});

	it("resolves a support", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Question",
			description: "desc",
			type: "SUPPORT",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({
			supportId: created.id,
			status: "RESOLVED",
			reason: "Answered",
			moderatedBy: "mod-1",
		});

		expect(result.support.status).toBe("RESOLVED");
	});

	it("throws SUPPORT_NOT_FOUND for non-existent id", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: "non-existent",
				status: "CLOSED",
				moderatedBy: "mod-1",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws SUPPORT_ALREADY_FINALIZED when status is CLOSED", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Already closed",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.updateStatus(created.id, {
			status: "CLOSED",
			moderatedBy: "mod-1",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: created.id,
				status: "RESOLVED",
				moderatedBy: "mod-2",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws SUPPORT_ALREADY_FINALIZED when status is RESOLVED", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Already resolved",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.updateStatus(created.id, {
			status: "RESOLVED",
			moderatedBy: "mod-1",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: created.id,
				status: "CLOSED",
				moderatedBy: "mod-2",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws SUPPORT_ALREADY_FINALIZED when status is CANCELLED", async () => {
		const supportsRepository = new InMemoryModerationSupportsRepository();
		const sut = new ModerateSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Cancelled",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.updateStatus(created.id, {
			status: "CANCELLED",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: created.id,
				status: "CLOSED",
				moderatedBy: "mod-1",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ALREADY_FINALIZED");
			expect(thrownError.statusCode).toBe(422);
		}
	});
});
