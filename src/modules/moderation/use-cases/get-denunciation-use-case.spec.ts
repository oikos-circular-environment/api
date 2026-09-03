import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryDenunciationsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-denunciations-repository.js";
import { GetDenunciationUseCase } from "./get-denunciation-use-case.js";

describe("get-denunciation-use-case", () => {
	it("returns a denunciation by id", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetDenunciationUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Findable",
			description: "desc",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({ denunciationId: created.id });
		expect(result.denunciation.id).toBe(created.id);
		expect(result.denunciation.title).toBe("Findable");
	});

	it("throws DENUNCIATION_NOT_FOUND for non-existent id", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetDenunciationUseCase(denunciationsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({ denunciationId: "non-existent-id" });
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
