import { describe, expect, it } from "vitest";
import { InMemoryDenunciationsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-denunciations-repository.js";
import { CreateDenunciationUseCase } from "./create-denunciation-use-case.js";

describe("create-denunciation-use-case", () => {
	it("creates a denunciation with status OPEN and no severity", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Fake company profile",
			description: "This company profile looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		expect(result.title).toBe("Fake company profile");
		expect(result.status).toBe("OPEN");
		expect(result.severity).toBeNull();
		expect(result.reporter_email).toBe("reporter@example.com");
		expect(result.attachments).toHaveLength(0);
	});

	it("associates the reporter user when logged in", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Suspicious content",
			description: "Reporting while logged in.",
			reporter_email: "reporter@example.com",
			reporter_user_id: "reporter-1",
		});

		expect(result.reporter_user_id).toBe("reporter-1");
	});

	it("sets reporter_user_id to null when reported anonymously", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Anonymous report",
			description: "Reporting without a session.",
			reporter_email: "reporter@example.com",
		});

		expect(result.reporter_user_id).toBeNull();
	});

	it("stores the reported user id when a target is identified", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Reporting a user",
			description: "This user's profile is a scam.",
			reporter_email: "reporter@example.com",
			reported_user_id: "target-1",
		});

		expect(result.reported_user_id).toBe("target-1");
	});

	it("sets reported_user_id to null when no target is identified", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Generic scam report",
			description: "Reporting a generic scam, no specific target.",
			reporter_email: "reporter@example.com",
		});

		expect(result.reported_user_id).toBeNull();
	});

	it("stores latitude and longitude when provided", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const sut = new CreateDenunciationUseCase(denunciationsRepository);

		const result = await sut.execute({
			title: "Report with location",
			description: "This happened at a specific location.",
			reporter_email: "reporter@example.com",
			latitude: -23.55,
			longitude: -46.63,
		});

		expect(result.latitude).toBe(-23.55);
		expect(result.longitude).toBe(-46.63);
	});
});
