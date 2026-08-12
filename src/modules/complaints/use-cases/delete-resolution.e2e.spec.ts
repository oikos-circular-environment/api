import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { createTestSession } from "@/test/create-test-session.js";

describe("delete-resolution", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
		const userId = randomUUID();
		const userEmail = email ?? `e2e-${userId}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, created_at) VALUES ($1, $2, NOW())`,
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

	async function createResolution(
		resolverId: string,
		complaintId: string,
		description = "Resolution description",
	): Promise<string> {
		const resolution = await prisma.complaintResolution.create({
			data: {
				complaint_id: complaintId,
				resolver_user_id: resolverId,
				description,
			},
		});
		return resolution.id;
	}

	async function bearerToken(userId: string, _email: string): Promise<string> {
		return createTestSession(userId);
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

	it("204 — deletes own resolution and removes from DB", async () => {
		const resolver = await createUser();
		const complaintId = await createComplaint(resolver.id);
		const resolutionId = await createResolution(resolver.id, complaintId);

		const res = await app.inject({
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: {
				authorization: `Bearer ${await bearerToken(resolver.id, resolver.email)}`,
			},
		});

		expect(res.statusCode).toBe(204);

		const inDb = await prisma.complaintResolution.findUnique({
			where: { id: resolutionId },
		});
		expect(inDb).toBeNull();
	});

	it("404 — user has no resolution (RESOLUTION_NOT_FOUND)", async () => {
		const owner = await createUser();
		const resolver = await createUser();
		const complaintId = await createComplaint(owner.id);
		await createResolution(resolver.id, complaintId);

		const res = await app.inject({
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: {
				authorization: `Bearer ${await bearerToken(owner.id, owner.email)}`,
			},
		});

		expect(res.statusCode).toBe(404);
		expect(res.json().code).toBe("RESOLUTION_NOT_FOUND");
	});

	it("422 — COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const resolver = await createUser();
		const complaintId = await createComplaint(resolver.id);
		await createResolution(resolver.id, complaintId);
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { status: "RESOLVED" },
		});

		const res = await app.inject({
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: {
				authorization: `Bearer ${await bearerToken(resolver.id, resolver.email)}`,
			},
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("COMPLAINT_CLOSED");
	});

	it("401 — missing authorization token", async () => {
		const resolver = await createUser();
		const complaintId = await createComplaint(resolver.id);
		await createResolution(resolver.id, complaintId);

		const res = await app.inject({
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/resolutions`,
		});

		expect(res.statusCode).toBe(401);
	});
});
