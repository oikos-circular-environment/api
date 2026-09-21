import { describe, expect, it } from "vitest";
import { InMemorySupportsRepository } from "@/modules/support/repositories/in-memory/in-memory-supports-repository.js";
import { CreateSupportUseCase } from "./create-support-use-case.js";

describe("create-support-use-case", () => {
	it("creates a support and returns it", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new CreateSupportUseCase(supportsRepository);

		const result = await sut.execute({
			title: "App crashes on login",
			description: "It crashes every time I try to log in.",
			type: "ERROR",
			reporter_email: "user@example.com",
		});

		expect(result.title).toBe("App crashes on login");
		expect(result.description).toBe("It crashes every time I try to log in.");
		expect(result.type).toBe("ERROR");
		expect(result.status).toBe("OPEN");
		expect(result.reporter_email).toBe("user@example.com");
		expect(result.attachments).toStrictEqual([]);
	});

	it("associates the support with the authenticated user", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new CreateSupportUseCase(supportsRepository);

		const result = await sut.execute({
			title: "Logged-in report",
			description: "Reporting while logged in.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			user_id: "user-1",
		});

		expect(supportsRepository.supports[0]?.user_id).toBe("user-1");
		expect(result.id).toBe(supportsRepository.supports[0]?.id);
	});

	it("sets user_id to null when created without a session", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new CreateSupportUseCase(supportsRepository);

		await sut.execute({
			title: "Anonymous report",
			description: "Reporting without a session.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
		});

		expect(supportsRepository.supports[0]?.user_id).toBeNull();
	});

	it("stores environment when provided", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new CreateSupportUseCase(supportsRepository);

		const result = await sut.execute({
			title: "Crash on submit",
			description: "App crashes when I tap submit.",
			type: "ERROR",
			reporter_email: "user@example.com",
			environment: {
				platform: "android",
				app_version: "1.2.3",
			},
		});

		expect(result.environment?.platform).toBe("android");
	});

	it("stores null environment when not provided", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const sut = new CreateSupportUseCase(supportsRepository);

		const result = await sut.execute({
			title: "General feedback",
			description: "Just some feedback.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
		});

		expect(result.environment).toBeNull();
	});
});
