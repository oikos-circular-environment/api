import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("get-company-services", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];
	const createdWasteCategoryIds: string[] = [];

	async function createUser(): Promise<{ id: string; email: string }> {
		const id = randomUUID();
		const email = `e2e-${id}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			id,
			email,
		);
		createdUserIds.push(id);
		return { id, email };
	}

	function bearerToken(userId: string, email: string): string {
		return app.jwt.sign({ sub: userId, user: { id: userId, email } });
	}

	async function createCompanyViaHttp(userId: string, email: string, identity: string) {
		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(userId, email)}` },
			payload: {
				identity,
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Service Get Co",
				corporate_name: "Service Get LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
	}

	async function createWasteCategory(name = "Coleta") {
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
			await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
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

	it("200 — returns { services: [] } when no services set", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "37037037037");

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ services: [] });
	});

	it("200 — returns services after PUT", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "38038038038");
		const category = await createWasteCategory("Coleta especial");

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				services: [
					{
						name: "Coleta hospitalar",
						description: "Coleta de resíduos hospitalares",
						price: 500,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
				],
			},
		});

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.services).toHaveLength(1);
		expect(body.services[0].name).toBe("Coleta hospitalar");
		expect(body.services[0].waste_category).toBeDefined();
		expect(body.services[0].waste_category.name).toBe("Coleta especial");
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(owner.id, owner.email, "39039039039");

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(other.id, other.email)}` },
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "40040040040");

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/services`,
		});

		expect(res.statusCode).toBe(401);
	});
});
