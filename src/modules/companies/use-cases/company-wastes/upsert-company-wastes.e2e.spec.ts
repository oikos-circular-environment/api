import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("upsert-company-wastes", () => {
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
				business_name: "Waste Upsert Co",
				corporate_name: "Waste Upsert LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
	}

	async function createWasteCategory(name = "Papel / Papelão") {
		const cat = await prisma.wasteCategory.create({
			data: {
				name,
				description: null,
				observations: null,
				hazard_levels: [],
			},
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

	it("200 — replaces wastes and returns list with waste_category embedded", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"21021021021",
		);
		const category = await createWasteCategory("Papel");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				wastes: [
					{
						name: "Papel reciclável",
						description: "Papel branco",
						price: 10.5,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 100,
					},
				],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.wastes).toHaveLength(1);
		expect(body.wastes[0].name).toBe("Papel reciclável");
		expect(body.wastes[0].waste_category).toBeDefined();
		expect(body.wastes[0].waste_category.id).toBe(category.id);
	});

	it("200 — empties wastes with empty array", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"22022022022",
		);
		const category = await createWasteCategory("Plástico");

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				wastes: [
					{
						name: "Plástico PET",
						description: null,
						price: 5,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 50,
					},
				],
			},
		});

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: { wastes: [] },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ wastes: [] });
	});

	it("400 — duplicate names in payload (DUPLICATED_ITEM_NAME)", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"23023023023",
		);
		const category = await createWasteCategory("Vidro");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				wastes: [
					{
						name: "Vidro",
						description: null,
						price: 3,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 10,
					},
					{
						name: "Vidro",
						description: "duplicado",
						price: 3,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 10,
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
			"24024024024",
		);

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				wastes: [
					{
						name: "Unknown Waste",
						description: null,
						price: 5,
						unit: "KG",
						waste_category_id: randomUUID(),
						quantity: 10,
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
			"25025025025",
		);
		const category = await createWasteCategory("Metal");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			headers: {
				authorization: `Bearer ${bearerToken(other.id, other.email)}`,
			},
			payload: {
				wastes: [
					{
						name: "Ferro",
						description: null,
						price: 2,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 20,
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
			"26026026026",
		);
		const category = await createWasteCategory("Eletrônico");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/wastes`,
			payload: {
				wastes: [
					{
						name: "Celular",
						description: null,
						price: 50,
						unit: "KG",
						waste_category_id: category.id,
						quantity: 5,
					},
				],
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
