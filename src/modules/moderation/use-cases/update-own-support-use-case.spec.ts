import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemorySupportsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-supports-repository.js";
import { UpdateOwnSupportUseCase } from "./update-own-support-use-case.js";

describe("update-own-support-use-case", () => {
	it("updates title and description when status is OPEN", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new UpdateOwnSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Original title",
			description: "Original description",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			supportId: created.id,
			title: "Updated title",
			description: "Updated description",
		});

		expect(result.title).toBe("Updated title");
		expect(result.description).toBe("Updated description");
	});

	it("throws 404 when the support belongs to another user", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new UpdateOwnSupportUseCase(supportsRepository);

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
				title: "Hacked title",
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

	it("throws 422 when status is not OPEN", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new UpdateOwnSupportUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "My support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		await supportsRepository.updateStatus(created.id, {
			status: "CLOSED",
		});

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: "user-1",
				supportId: created.id,
				title: "Updated title",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ALREADY_MODERATED");
			expect(thrownError.statusCode).toBe(422);
		}
	});
});
