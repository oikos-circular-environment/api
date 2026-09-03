import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { PrismaSupportRequestsRepository } from "./support-requests-repository-prisma.js";

describe("support-requests-repository-prisma", () => {
	const createdSupportRequestIds: string[] = [];

	afterEach(async () => {
		if (createdSupportRequestIds.length > 0) {
			await prisma.supportRequest.deleteMany({
				where: { id: { in: createdSupportRequestIds } },
			});
			createdSupportRequestIds.length = 0;
		}
	});

	it("creates a support request with status PENDING", async () => {
		const sut = new PrismaSupportRequestsRepository();

		const created = await sut.create({
			title: "App crashes on login",
			description: "It crashes every time I try to log in.",
		});
		createdSupportRequestIds.push(created.id);

		expect(created.title).toBe("App crashes on login");
		expect(created.status).toBe("PENDING");
		expect(created.attachments).toHaveLength(0);
	});

	it("attaches a file to an existing support request", async () => {
		const sut = new PrismaSupportRequestsRepository();

		const created = await sut.create({
			title: "Broken checkout",
			description: "Checkout button does nothing.",
		});
		createdSupportRequestIds.push(created.id);

		const updated = await sut.attach(created.id, {
			url: "https://storage.test/moderation/support/1.png",
			file_name: "screenshot.png",
			path: "moderation/support/1.png",
		});

		expect(updated?.attachments).toHaveLength(1);
		expect(updated?.attachments[0]?.file_name).toBe("screenshot.png");
	});

	it("returns null when attaching to a non-existent support request", async () => {
		const sut = new PrismaSupportRequestsRepository();

		const result = await sut.attach("00000000-0000-0000-0000-000000000000", {
			url: "https://storage.test/x.png",
			file_name: "x.png",
			path: "x.png",
		});

		expect(result).toBeNull();
	});

	it("finds a support request by id", async () => {
		const sut = new PrismaSupportRequestsRepository();

		const created = await sut.create({
			title: "Findable request",
			description: "Some description.",
		});
		createdSupportRequestIds.push(created.id);

		const found = await sut.findById(created.id);
		expect(found?.id).toBe(created.id);
		expect(found?.title).toBe("Findable request");
	});

	it("returns null when finding a non-existent support request", async () => {
		const sut = new PrismaSupportRequestsRepository();

		const found = await sut.findById("00000000-0000-0000-0000-000000000000");
		expect(found).toBeNull();
	});
});
