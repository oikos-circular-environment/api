import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("upsert-company-services", () => {
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

	async function createCompanyViaHttp(
		userId: string,
		email: string,
		identity: string,
	) {
		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(userId, email)}` },
			payload: {
				identity,
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Service Upsert Co",
				corporate_name: "Service Upsert LTDA",
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

	it("200 — replaces services and returns list", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"31031031031",
		);
		const category = await createWasteCategory("Coleta de Resíduos");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				services: [
					{
						name: "Coleta domiciliar",
						description: "Coleta regular",
						price: 150,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
				],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.services).toHaveLength(1);
		expect(body.services[0].name).toBe("Coleta domiciliar");
		expect(body.services[0].waste_category).toBeDefined();
		expect(body.services[0].waste_category.id).toBe(category.id);
	});

	it("200 — empties services with empty array", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"32032032032",
		);
		const category = await createWasteCategory("Triagem");

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				services: [
					{
						name: "Triagem manual",
						description: null,
						price: 80,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
				],
			},
		});

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: { services: [] },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ services: [] });
	});

	it("400 — duplicate names in payload (DUPLICATED_ITEM_NAME)", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"33033033033",
		);
		const category = await createWasteCategory("Logística");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				services: [
					{
						name: "Transporte",
						description: null,
						price: 200,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
					{
						name: "Transporte",
						description: "duplicado",
						price: 250,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 2,
					},
				],
			},
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DUPLICATED_ITEM_NAME");
	});

	it("422 — non-existent waste_category_id (WASTE_CATEGORY_NOT_FOUND)", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"34034034034",
		);

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				services: [
					{
						name: "Serviço desconhecido",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_category_id: randomUUID(),
						quantity: 1,
					},
				],
			},
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("WASTE_CATEGORY_NOT_FOUND");
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(
			owner.id,
			owner.email,
			"35035035035",
		);
		const category = await createWasteCategory("Reciclagem");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			headers: {
				authorization: `Bearer ${bearerToken(other.id, other.email)}`,
			},
			payload: {
				services: [
					{
						name: "Reciclagem geral",
						description: null,
						price: 50,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
				],
			},
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"36036036036",
		);
		const category = await createWasteCategory("Destinação");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/services`,
			payload: {
				services: [
					{
						name: "Destinação final",
						description: null,
						price: 300,
						unit: "UNIT",
						waste_category_id: category.id,
						quantity: 1,
					},
				],
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
