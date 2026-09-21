import { describe, expect, it } from "vitest";
import { InMemoryModerationDenunciationsRepository } from "../repositories/in-memory/in-memory-moderation-denunciations-repository.js";
import { GetDenunciationsUseCase } from "./get-denunciations-use-case.js";

describe("get-denunciations-use-case", () => {
	it("returns denunciations with default limit", async () => {
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const sut = new GetDenunciationsUseCase(denunciationsRepository);

		await denunciationsRepository.create({
			title: "First",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.create({
			title: "Second",
			description: "desc",
			reporter_email: "b@test.com",
		});

		const result = await sut.execute({ limit: 20 });
		expect(result.denunciations).toHaveLength(2);
	});

	it("filters by status", async () => {
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const sut = new GetDenunciationsUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Open one",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.updateStatus(created.id, {
			status: "CLOSED",
			reason: "Resolved",
			moderatedBy: "mod-1",
		});

		const open = await sut.execute({ status: "OPEN", limit: 20 });
		expect(open.denunciations).toHaveLength(0);

		const closed = await sut.execute({ status: "CLOSED", limit: 20 });
		expect(closed.denunciations).toHaveLength(1);
	});

	it("filters by severity", async () => {
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const sut = new GetDenunciationsUseCase(denunciationsRepository);

		const created = await denunciationsRepository.create({
			title: "Critical",
			description: "desc",
			reporter_email: "a@test.com",
		});
		await denunciationsRepository.updateStatus(created.id, {
			status: "OPEN",
			severity: "CRITICAL",
		});

		const critical = await sut.execute({ severity: "CRITICAL", limit: 20 });
		expect(critical.denunciations).toHaveLength(1);

		const low = await sut.execute({ severity: "LOW", limit: 20 });
		expect(low.denunciations).toHaveLength(0);
	});

	it("paginates with cursor", async () => {
		const denunciationsRepository =
			new InMemoryModerationDenunciationsRepository();
		const sut = new GetDenunciationsUseCase(denunciationsRepository);

		await denunciationsRepository.create({
			title: "Old",
			description: "desc",
			reporter_email: "a@test.com",
		});
		const second = await denunciationsRepository.create({
			title: "New",
			description: "desc",
			reporter_email: "b@test.com",
		});

		denunciationsRepository.denunciations[0]!.created_at = new Date(
			second.created_at.getTime() - 1000,
		);

		const result = await sut.execute({
			limit: 20,
			cursor: second.created_at,
		});
		expect(result.denunciations).toHaveLength(1);
		expect(result.denunciations[0]?.title).toBe("Old");
	});
});
