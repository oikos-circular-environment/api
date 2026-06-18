import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("create-complaint", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];
	const createdCategoryIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
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

	async function createWasteCategory(): Promise<string> {
		const category = await prisma.wasteCategory.create({
			data: {
				id: randomUUID(),
				name: `e2e-category-${randomUUID()}`,
				hazard_levels: ["LOW"],
			},
		});
		createdCategoryIds.push(category.id);
		return category.id;
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
		if (createdCategoryIds.length > 0) {
			await prisma.wasteCategory.deleteMany({
				where: { id: { in: createdCategoryIds } },
			});
			createdCategoryIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — creates complaint and returns complaint with status OPEN", async () => {
		const user = await createUser();
		const categoryId = await createWasteCategory();

		const res = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				date: new Date().toISOString(),
				geospatial: makeGeospatial(),
				waste_category_ids: [categoryId],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaint).toBeDefined();
		expect(body.complaint.id).toBeDefined();
		expect(body.complaint.status).toBe("OPEN");
		createdComplaintIds.push(body.complaint.id);
	});

	it("401 — missing authorization token", async () => {
		const categoryId = await createWasteCategory();

		const res = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			payload: {
				date: new Date().toISOString(),
				geospatial: makeGeospatial(),
				waste_category_ids: [categoryId],
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
