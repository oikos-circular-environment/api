import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("get-complaints-map", () => {
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

	it("200 — public route, no auth required, returns array", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/map?lat=-23.5505&lon=-46.6333",
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toBeInstanceOf(Array);
	});

	it("200 — accepts lat/lon/radius parameters", async () => {
		const user = await createUser();
		await createComplaint(user.id);

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/map?lat=-23.5505&lon=-46.6333&radius=5000",
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toBeInstanceOf(Array);
	});
});
