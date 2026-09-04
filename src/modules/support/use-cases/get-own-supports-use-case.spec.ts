import { describe, expect, it } from "vitest";
import { InMemorySupportsRepository } from "@/modules/support/repositories/in-memory/in-memory-supports-repository.js";
import { GetOwnSupportsUseCase } from "./get-own-supports-use-case.js";

describe("get-own-supports-use-case", () => {
	it("returns supports owned by the user", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportsUseCase(supportsRepository);

		await supportsRepository.create({
			title: "My support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.supports).toHaveLength(1);
		expect(result.supports[0]?.title).toBe("My support");
	});

	it("does not return supports from other users", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportsUseCase(supportsRepository);

		await supportsRepository.create({
			title: "Other user support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "other@example.com",
			user_id: "user-2",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.supports).toHaveLength(0);
	});

	it("returns nextCursor when there are more results", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportsUseCase(supportsRepository);

		for (let i = 0; i < 3; i++) {
			await supportsRepository.create({
				title: `Support ${i}`,
				description: "Description",
				type: "SUPPORT",
				reporter_email: "user@example.com",
				user_id: "user-1",
			});
		}

		const result = await sut.execute({
			userId: "user-1",
			limit: 2,
		});

		expect(result.supports).toHaveLength(2);
		expect(result.nextCursor).toBeInstanceOf(Date);
	});

	it("returns null nextCursor when all results fit", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetOwnSupportsUseCase(supportsRepository);

		await supportsRepository.create({
			title: "Support",
			description: "Description",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.nextCursor).toBeNull();
	});
});
