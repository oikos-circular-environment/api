import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { GetOwnDenunciationUseCase } from "./get-own-denunciation-use-case.js";

describe("get-own-denunciation-use-case", () => {
	it("returns the denunciation when the user is the owner", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "My denunciation",
			description: "Description",
			reporter_email: "user@example.com",
			reporter_user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			denunciationId: created.id,
		});

		expect(result.id).toBe(created.id);
		expect(result.title).toBe("My denunciation");
	});

	it("throws 404 when the denunciation belongs to another user", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Other user denunciation",
			description: "Description",
			reporter_email: "other@example.com",
			reporter_user_id: "user-2",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				denunciationId: created.id,
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

	it("throws 404 when the denunciation does not exist", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationUseCase(denunciationsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				denunciationId: "non-existent-id",
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
});
