import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("get-complaints-dashboard", () => {
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

	it("200 — returns counts by status", async () => {
		const user = await createUser();
		await createComplaint(user.id, "OPEN");
		await createComplaint(user.id, "OPEN");
		await createComplaint(user.id, "RESOLVED");

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/dashboard",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.dashboard).toBeDefined();
		expect(typeof body.dashboard.total).toBe("number");
		expect(typeof body.dashboard.open).toBe("number");
		expect(typeof body.dashboard.resolved).toBe("number");
		expect(typeof body.dashboard.canceled).toBe("number");
		expect(body.dashboard.open).toBe(2);
		expect(body.dashboard.resolved).toBe(1);
		expect(body.dashboard.canceled).toBe(0);
		expect(body.dashboard.total).toBe(3);
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/dashboard",
		});

		expect(res.statusCode).toBe(401);
	});
});
