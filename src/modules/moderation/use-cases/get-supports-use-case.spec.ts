import { describe, expect, it } from "vitest";
import { InMemorySupportsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-supports-repository.js";
import { GetSupportsUseCase } from "./get-supports-use-case.js";

describe("get-supports-use-case", () => {
	it("returns supports with default limit", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportsUseCase(supportsRepository);

		await supportsRepository.create({
			title: "First",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.create({
			title: "Second",
			description: "desc",
			type: "SUPPORT",
			reporter_email: "b@test.com",
		});

		const result = await sut.execute({ limit: 20 });

		expect(result.supports).toHaveLength(2);
	});

	it("filters by status", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportsUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Open one",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.updateStatus(created.id, {
			status: "CLOSED",
			reason: "Fixed",
			moderatedBy: "mod-1",
		});

		const result = await sut.execute({ status: "OPEN", limit: 20 });
		expect(result.supports).toHaveLength(0);

		const closed = await sut.execute({ status: "CLOSED", limit: 20 });
		expect(closed.supports).toHaveLength(1);
	});

	it("filters by severity", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportsUseCase(supportsRepository);

		const created = await supportsRepository.create({
			title: "Critical one",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.updateStatus(created.id, {
			status: "OPEN",
			severity: "CRITICAL",
		});

		const result = await sut.execute({ severity: "CRITICAL", limit: 20 });
		expect(result.supports).toHaveLength(1);

		const low = await sut.execute({ severity: "LOW", limit: 20 });
		expect(low.supports).toHaveLength(0);
	});

	it("filters by type", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportsUseCase(supportsRepository);

		await supportsRepository.create({
			title: "Error",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});
		await supportsRepository.create({
			title: "Support",
			description: "desc",
			type: "SUPPORT",
			reporter_email: "b@test.com",
		});

		const errors = await sut.execute({ type: "ERROR", limit: 20 });
		expect(errors.supports).toHaveLength(1);
		expect(errors.supports[0]?.type).toBe("ERROR");
	});

	it("paginates with cursor", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new GetSupportsUseCase(supportsRepository);

		const old = await supportsRepository.create({
			title: "Old",
			description: "desc",
			type: "ERROR",
			reporter_email: "a@test.com",
		});

		const second = await supportsRepository.create({
			title: "New",
			description: "desc",
			type: "ERROR",
			reporter_email: "b@test.com",
		});

		supportsRepository.supports[0]!.created_at = new Date(
			second.created_at.getTime() - 1000,
		);

		const result = await sut.execute({
			limit: 20,
			cursor: second.created_at,
		});
		expect(result.supports).toHaveLength(1);
		expect(result.supports[0]?.title).toBe("Old");
	});
});
