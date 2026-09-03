import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { PrismaSupportsRepository } from "./supports-repository-prisma.js";

describe("supports-repository-prisma", () => {
	const createdSupportIds: string[] = [];

	afterEach(async () => {
		if (createdSupportIds.length > 0) {
			await prisma.support.deleteMany({
				where: { id: { in: createdSupportIds } },
			});
			createdSupportIds.length = 0;
		}
	});

	it("creates a support with status OPEN", async () => {
		const sut = new PrismaSupportsRepository();

		const created = await sut.create({
			title: "App crashes on login",
			description: "It crashes every time I try to log in.",
			type: "ERROR",
			reporter_email: "user@example.com",
		});
		createdSupportIds.push(created.id);

		expect(created.title).toBe("App crashes on login");
		expect(created.type).toBe("ERROR");
		expect(created.status).toBe("OPEN");
		expect(created.reporter_email).toBe("user@example.com");
		expect(created.attachments).toHaveLength(0);
	});

	it("stores environment as JSON", async () => {
		const sut = new PrismaSupportsRepository();

		const created = await sut.create({
			title: "Crash on submit",
			description: "App crashes when I tap submit.",
			type: "ERROR",
			reporter_email: "user@example.com",
			environment: {
				platform: "android",
				app_version: "1.2.3",
			},
		});
		createdSupportIds.push(created.id);

		expect(created.environment?.platform).toBe("android");
		expect(created.environment?.app_version).toBe("1.2.3");
	});

	it("attaches a file to an existing support", async () => {
		const sut = new PrismaSupportsRepository();

		const created = await sut.create({
			title: "Broken checkout",
			description: "Checkout button does nothing.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
		});
		createdSupportIds.push(created.id);

		const updated = await sut.attach(created.id, {
			url: "https://storage.test/moderation/support/1.png",
			file_name: "screenshot.png",
			path: "moderation/support/1.png",
		});

		expect(updated?.attachments).toHaveLength(1);
		expect(updated?.attachments[0]?.file_name).toBe("screenshot.png");
	});

	it("returns null when attaching to a non-existent support", async () => {
		const sut = new PrismaSupportsRepository();

		const result = await sut.attach("00000000-0000-0000-0000-000000000000", {
			url: "https://storage.test/x.png",
			file_name: "x.png",
			path: "x.png",
		});

		expect(result).toBeNull();
	});

	it("finds a support by id", async () => {
		const sut = new PrismaSupportsRepository();

		const created = await sut.create({
			title: "Findable request",
			description: "Some description.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
		});
		createdSupportIds.push(created.id);

		const found = await sut.findById(created.id);
		expect(found?.id).toBe(created.id);
		expect(found?.title).toBe("Findable request");
	});

	it("returns null when finding a non-existent support", async () => {
		const sut = new PrismaSupportsRepository();

		const found = await sut.findById("00000000-0000-0000-0000-000000000000");
		expect(found).toBeNull();
	});
});
