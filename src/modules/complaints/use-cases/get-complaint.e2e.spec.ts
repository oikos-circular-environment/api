import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("get-complaint", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(email?: string): Promise<{ id: string; email: string }> {
		const userId = randomUUID();
		const userEmail = email ?? `e2e-${userId}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			userEmail,
		);
		createdUserIds.push(userId);
		return { id: userId, email: userEmail };
	}

	async function createComplaint(ownerId: string): Promise<string> {
		const c = await prisma.complaint.create({
			data: {
				id: randomUUID(),
				user_id: ownerId,
				status: "OPEN",
				date: new Date(),
				geospatial: makeGeospatial(),
			},
		});
		createdComplaintIds.push(c.id);
		return c.id;
	}

	function bearerToken(userId: string, email: string): string {
		return app.jwt.sign({ sub: userId, user: { id: userId, email } });
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdComplaintIds.length > 0) {
			await prisma.complaint.deleteMany({
				where: { id: { in: createdComplaintIds } },
			});
			createdComplaintIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — returns complaint with all fields", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaint).toBeDefined();
		expect(body.complaint.id).toBe(complaintId);
		expect(body.complaint.status).toBe("OPEN");
		expect(body.complaint.attachments).toBeInstanceOf(Array);
		expect(body.complaint.categories).toBeInstanceOf(Array);
		expect(body.complaint.vote_counts).toBeDefined();
		expect(typeof body.complaint.resolution_count).toBe("number");
	});

	it("404 — complaint does not exist", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${randomUUID()}`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}`,
		});

		expect(res.statusCode).toBe(401);
	});
});
