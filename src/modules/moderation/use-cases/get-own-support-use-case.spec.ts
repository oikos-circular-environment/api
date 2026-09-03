import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemorySupportsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-supports-repository.js";
import { GetOwnSupportUseCase } from "./get-own-support-use-case.js";

describe("get-own-support-use-case", () => {
	it("returns the support when the user is the owner", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "My support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			supportId: created.id,
		});

		expect(result.id).toBe(created.id);
		expect(result.title).toBe("My support");
	});

	it("throws 404 when the support belongs to another user", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Other user support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "other@example.com",
			user_id: "user-2",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				supportId: created.id,
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

	it("throws 404 when the support does not exist", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportUseCase(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				supportId: "non-existent-id",
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
});
