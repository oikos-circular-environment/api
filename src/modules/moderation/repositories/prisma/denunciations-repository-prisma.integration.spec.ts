import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { PrismaDenunciationsRepository } from "./denunciations-repository-prisma.js";

describe("denunciations-repository-prisma", () => {
	const createdDenunciationIds: string[] = [];
	const createdUserIds: string[] = [];

	async function insertUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`test-${userId}@integration.test`,
		);
		createdUserIds.push(userId);
		return userId;
	}

	afterEach(async () => {
		if (createdDenunciationIds.length > 0) {
			await prisma.denunciation.deleteMany({
				where: { id: { in: createdDenunciationIds } },
			});
			createdDenunciationIds.length = 0;
		}

		if (createdUserIds.length > 0) {
			await prisma.user.deleteMany({
				where: { id: { in: createdUserIds } },
			});
			createdUserIds.length = 0;
		}
	});

	it("creates a denunciation with status OPEN", async () => {
		const sut = new PrismaDenunciationsRepository();

		const created = await sut.create({
			title: "Fake company profile",
			description: "This company profile looks like a scam.",
			reporter_email: "reporter@example.com",
		});
		createdDenunciationIds.push(created.id);

		expect(created.title).toBe("Fake company profile");
		expect(created.status).toBe("OPEN");
		expect(created.severity).toBeNull();
		expect(created.reporter_email).toBe("reporter@example.com");
		expect(created.attachments).toHaveLength(0);
	});

	it("finds a denunciation by id", async () => {
		const sut = new PrismaDenunciationsRepository();

		const created = await sut.create({
			title: "Findable denunciation",
			description: "Some description.",
			reporter_email: "reporter@example.com",
		});
		createdDenunciationIds.push(created.id);

		const found = await sut.findById(created.id);
		expect(found?.id).toBe(created.id);
		expect(found?.title).toBe("Findable denunciation");
	});

	it("returns null when finding a non-existent denunciation", async () => {
		const sut = new PrismaDenunciationsRepository();

		const found = await sut.findById("00000000-0000-0000-0000-000000000000");
		expect(found).toBeNull();
	});

	it("lists denunciations filtered by status", async () => {
		const sut = new PrismaDenunciationsRepository();

		const open = await sut.create({
			title: "Open denunciation",
			description: "Still open.",
			reporter_email: "reporter@example.com",
		});
		createdDenunciationIds.push(open.id);

		const result = await sut.findMany({ status: "OPEN", limit: 50 });

		expect(result.some((d) => d.id === open.id)).toBe(true);
		expect(result.every((d) => d.status === "OPEN")).toBe(true);
	});

	it("lists denunciations by reporter", async () => {
		const sut = new PrismaDenunciationsRepository();
		const reporterUserId = await insertUser();

		const created = await sut.create({
			title: "Reported by user",
			description: "Reporting while logged in.",
			reporter_email: "reporter@example.com",
			reporter_user_id: reporterUserId,
		});
		createdDenunciationIds.push(created.id);

		const result = await sut.findManyByReporter(reporterUserId, {
			limit: 50,
		});

		expect(result.some((d) => d.id === created.id)).toBe(true);
	});

	it("attaches a file to an existing denunciation", async () => {
		const sut = new PrismaDenunciationsRepository();

		const created = await sut.create({
			title: "Denunciation with attachment",
			description: "Has a proof image.",
			reporter_email: "reporter@example.com",
		});
		createdDenunciationIds.push(created.id);

		const updated = await sut.attach(created.id, {
			url: "https://storage.test/denunciations/1.png",
			file_name: "screenshot.png",
			path: "denunciations/1.png",
			base64: Buffer.from("image-content").toString("base64"),
			type: "PHOTO",
			metadata: null,
		});

		expect(updated?.attachments).toHaveLength(1);
		expect(updated?.attachments[0]?.file_name).toBe("screenshot.png");
		expect(updated?.attachments[0]?.type).toBe("PHOTO");
	});

	it("returns null when attaching to a non-existent denunciation", async () => {
		const sut = new PrismaDenunciationsRepository();

		const result = await sut.attach("00000000-0000-0000-0000-000000000000", {
			url: "https://storage.test/x.png",
			file_name: "x.png",
			path: "x.png",
			base64: "x",
			type: "PHOTO",
			metadata: null,
		});

		expect(result).toBeNull();
	});

	it("deletes an attachment", async () => {
		const sut = new PrismaDenunciationsRepository();

		const created = await sut.create({
			title: "Denunciation to clean attachment",
			description: "Has a proof image to be removed.",
			reporter_email: "reporter@example.com",
		});
		createdDenunciationIds.push(created.id);

		const withAttachment = await sut.attach(created.id, {
			url: "https://storage.test/denunciations/2.png",
			file_name: "screenshot-2.png",
			path: "denunciations/2.png",
			base64: Buffer.from("image-content").toString("base64"),
			type: "PHOTO",
			metadata: null,
		});

		const attachmentId = withAttachment?.attachments[0]?.id as string;

		await sut.deleteAttachment(created.id, attachmentId);

		const result = await sut.findById(created.id);
		expect(result?.attachments).toHaveLength(0);
	});
});
