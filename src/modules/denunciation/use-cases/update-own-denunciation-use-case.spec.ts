import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { UpdateOwnDenunciationUseCase } from "./update-own-denunciation-use-case.js";

describe("update-own-denunciation-use-case", () => {
	it("updates title and description when status is OPEN", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new UpdateOwnDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Original title",
			description: "Original description",
			reporter_email: "user@example.com",
			reporter_user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			denunciationId: created.id,
			title: "Updated title",
			description: "Updated description",
		});

		expect(result.title).toBe("Updated title");
		expect(result.description).toBe("Updated description");
	});

	it("throws 404 when the denunciation belongs to another user", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new UpdateOwnDenunciationUseCase(denunciationsRepository);

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
				title: "Hacked title",
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

	it("throws 422 when status is not OPEN", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new UpdateOwnDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "My denunciation",
			description: "Description",
			reporter_email: "user@example.com",
			reporter_user_id: "user-1",
		});

		await denunciationsRepository.updateStatus(created.id, {
			status: "CLOSED",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				denunciationId: created.id,
				title: "Updated title",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DENUNCIATION_ALREADY_MODERATED");
			expect(thrownError.statusCode).toBe(422);
		}
	});
});
