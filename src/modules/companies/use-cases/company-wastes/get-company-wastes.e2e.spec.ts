import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("get-company-wastes", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];
	const createdWasteCategoryIds: string[] = [];

	async function createUser(): Promise<{ id: string; email: string }> {
		const user = await createTestUser();
		createdUserIds.push(user.id);
		return { id: user.id, email: user.email };
	}

	async function bearerToken(userId: string, _email?: string): Promise<string> {
		const { token } = await loginTestUser(userId);
		return token;
	}

	async function createCompanyViaHttp(
		userId: string,
		email: string,
		identity: string,
	) {
		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${await bearerToken(userId, email)}` },
			payload: {
				identity,
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Waste Get Co",
				corporate_name: "Waste Get LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
	}

	async function createWasteCategory(name = "Papel") {
		const cat = await prisma.wasteCategory.create({
			data: { name, description: null, observations: null, hazard_levels: [] },
		});
		createdWasteCategoryIds.push(cat.id);
		return cat;
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdCompanyIds.length > 0) {
			await prisma.company.deleteMany({
				where: { id: { in: createdCompanyIds } },
			});
			createdCompanyIds.length = 0;
		}
		if (createdWasteCategoryIds.length > 0) {
			await prisma.wasteCategory.deleteMany({
				where: { id: { in: createdWasteCategoryIds } },
			});
			createdWasteCategoryIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — returns { wastes: [] } when no wastes set", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"27027027027",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/wastes`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ wastes: [] });
	});

	it("200 — returns wastes with waste_category embedded after PUT", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"28028028028",
		);
		const category = await createWasteCategory("Papel reciclável");

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				wastes: [
					{
						name: "Papel branco",
						description: null,
						price: 8,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 50,
					},
				],
			},
		});

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/wastes`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.wastes).toHaveLength(1);
		expect(body.wastes[0].name).toBe("Papel branco");
		expect(body.wastes[0].waste_category).toBeDefined();
		expect(body.wastes[0].waste_category.name).toBe("Papel reciclável");
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(
			owner.id,
			owner.email,
			"29029029029",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/wastes`,
			headers: {
				authorization: `Bearer ${await bearerToken(other.id, other.email)}`,
			},
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"30030030030",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/wastes`,
		});

		expect(res.statusCode).toBe(401);
	});
});
