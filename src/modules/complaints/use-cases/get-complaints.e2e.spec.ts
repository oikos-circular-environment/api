import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("get-complaints", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];
	const E2E_PASSWORD = "Test@123456";

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
		const userEmail = email ?? `e2e-${randomUUID()}@test.local`;
		await app.inject({
			method: "POST",
			url: "/v2/auth/sign-up",
			payload: { name: "E2E User", email: userEmail, password: E2E_PASSWORD },
		});
		const user = await prisma.user.findUniqueOrThrow({
			where: { email: userEmail },
		});
		createdUserIds.push(user.id);
		return { id: user.id, email: userEmail };
	}

	async function createComplaint(
		ownerId: string,
		status: "OPEN" | "RESOLVED" | "CANCELED" = "OPEN",
	): Promise<string> {
		const c = await prisma.complaint.create({
			data: {
				id: randomUUID(),
				user_id: ownerId,
				status,
				date: new Date(),
				geospatial: makeGeospatial(),
			},
		});
		createdComplaintIds.push(c.id);
		return c.id;
	}

	async function bearerToken(_userId: string, email: string): Promise<string> {
		const res = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-in",
			payload: { email, password: E2E_PASSWORD },
		});
		return res.json().token;
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

	it("200 — returns list of user complaints", async () => {
		const user = await createUser();
		const complaintId = await createComplaint(user.id);

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toBeInstanceOf(Array);
		expect(
			body.complaints.some((c: { id: string }) => c.id === complaintId),
		).toBe(true);
		expect(body).toHaveProperty("next_cursor");
	});

	it("200 — returns empty list when user has no complaints", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toStrictEqual([]);
		expect(body.next_cursor).toBeNull();
	});

	it("200 — filters by status=OPEN", async () => {
		const user = await createUser();
		const openId = await createComplaint(user.id, "OPEN");
		const resolvedId = await createComplaint(user.id, "RESOLVED");

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints?status=OPEN",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(openId);
		expect(ids).not.toContain(resolvedId);
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints",
		});

		expect(res.statusCode).toBe(401);
	});
});
