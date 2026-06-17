import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("submit-resolution", () => {
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

	it("204 — creates resolution and persists to DB", async () => {
		const owner = await createUser();
		const resolver = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
			payload: { description: "The problem was fixed by the city hall." },
		});

		expect(res.statusCode).toBe(204);

		const inDb = await prisma.complaintResolution.findFirst({
			where: { complaint_id: complaintId, resolver_user_id: resolver.id },
		});
		expect(inDb).not.toBeNull();
		expect(inDb?.description).toBe("The problem was fixed by the city hall.");
	});

	it("422 — RESOLUTION_ALREADY_EXISTS when same user submits twice", async () => {
		const owner = await createUser();
		const resolver = await createUser();
		const complaintId = await createComplaint(owner.id);
		const token = bearerToken(resolver.id, resolver.email);

		await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: { authorization: `Bearer ${token}` },
			payload: { description: "First submission." },
		});

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: { authorization: `Bearer ${token}` },
			payload: { description: "Second submission." },
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("RESOLUTION_ALREADY_EXISTS");
	});

	it("422 — COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const owner = await createUser();
		const resolver = await createUser();
		const complaintId = await createComplaint(owner.id);
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { status: "RESOLVED" },
		});

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
			payload: { description: "Should not be allowed." },
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("COMPLAINT_CLOSED");
	});

	it("404 — complaint does not exist", async () => {
		const resolver = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${randomUUID()}/resolutions`,
			headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
			payload: { description: "The issue was resolved." },
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/resolutions`,
			payload: { description: "Unauthorized attempt." },
		});

		expect(res.statusCode).toBe(401);
	});
});
