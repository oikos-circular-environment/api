import { describe, expect, it } from "vitest";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { GetOwnDenunciationsUseCase } from "./get-own-denunciations-use-case.js";

describe("get-own-denunciations-use-case", () => {
	it("returns denunciations owned by the user", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationsUseCase(denunciationsRepository);

		await denunciationsRepository.create({
			title: "My denunciation",
			description: "Description",
			reporter_email: "user@example.com",
			reporter_user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.denunciations).toHaveLength(1);
		expect(result.denunciations[0]?.title).toBe("My denunciation");
	});

	it("does not return denunciations from other users", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationsUseCase(denunciationsRepository);

		await denunciationsRepository.create({
			title: "Other user denunciation",
			description: "Description",
			reporter_email: "other@example.com",
			reporter_user_id: "user-2",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.denunciations).toHaveLength(0);
	});

	it("returns nextCursor when there are more results", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationsUseCase(denunciationsRepository);

		for (let i = 0; i < 3; i++) {
			await denunciationsRepository.create({
				title: `Denunciation ${i}`,
				description: "Description",
				reporter_email: "user@example.com",
				reporter_user_id: "user-1",
			});
		}

		const result = await sut.execute({
			userId: "user-1",
			limit: 2,
		});

		expect(result.denunciations).toHaveLength(2);
		expect(result.nextCursor).toBeInstanceOf(Date);
	});

	it("returns null nextCursor when all results fit", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new GetOwnDenunciationsUseCase(denunciationsRepository);

		await denunciationsRepository.create({
			title: "Denunciation",
			description: "Description",
			reporter_email: "user@example.com",
			reporter_user_id: "user-1",
		});

		const result = await sut.execute({
			userId: "user-1",
			limit: 20,
		});

		expect(result.nextCursor).toBeNull();
	});
});
