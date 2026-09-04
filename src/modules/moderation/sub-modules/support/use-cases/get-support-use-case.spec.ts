import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemorySupportsRepository } from "@/modules/support/repositories/in-memory/in-memory-supports-repository.js";
import { GetSupportUseCase } from "./get-support-use-case.js";

describe("get-support-use-case", () => {
	it("returns a support by id", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Findable",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});

		const result = await sut.execute({ supportId: created.id });
		expect(result.support.id).toBe(created.id);
		expect(result.support.title).toBe("Findable");
	});

	it("throws SUPPORT_NOT_FOUND for non-existent id", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportUseCase(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({ supportId: "non-existent-id" });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
