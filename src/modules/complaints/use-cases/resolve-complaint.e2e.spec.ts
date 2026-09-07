import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("resolve-complaint", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
		const user = await createTestUser(email ? { email } : undefined);
		createdUserIds.push(user.id);
		return { id: user.id, email: user.email };
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

	async function bearerToken(userId: string, _email?: string): Promise<string> {
		const { token } = await loginTestUser(userId);
		return token;
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
			await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
			createdUserIds.length = 0;
		}
	});

	it("200 — resolves own complaint and returns complaint object", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);

		const res = await app.inject({
			method: "PATCH",
			url: `/v1/complaints/${complaintId}/resolved`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: { description: "Problem is fully resolved." },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaint).toBeDefined();
		expect(body.complaint.id).toBe(complaintId);
	});

	it("404 — complaint does not exist", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "PATCH",
			url: `/v1/complaints/${randomUUID()}/resolved`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: { description: "Should not work." },
		});

		expect(res.statusCode).toBe(404);
	});

	it("422 — COMPLAINT_CLOSED when already RESOLVED", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { status: "RESOLVED" },
		});

		const res = await app.inject({
			method: "PATCH",
			url: `/v1/complaints/${complaintId}/resolved`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: { description: "Should not work." },
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("COMPLAINT_CLOSED");
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);

		const res = await app.inject({
			method: "PATCH",
			url: `/v1/complaints/${complaintId}/resolved`,
			payload: { description: "Unauthorized attempt." },
		});

		expect(res.statusCode).toBe(401);
	});
});
