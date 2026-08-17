import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("get-company", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];

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
				business_name: "Test Company",
				corporate_name: "Test Company LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
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
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — returns companies with address, business_hours, wastes, services", async () => {
		const user = await createUser();
		await createCompanyViaHttp(user.id, user.email, "11111111101");

		const res = await app.inject({
			method: "GET",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.companies).toHaveLength(1);
		expect(body.companies[0].address).toBeNull();
		expect(body.companies[0].business_hours).toStrictEqual([]);
		expect(body.companies[0].wastes).toStrictEqual([]);
		expect(body.companies[0].services).toStrictEqual([]);
	});

	it("200 — returns empty array when user has no companies", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "GET",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ companies: [] });
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/companies",
		});

		expect(res.statusCode).toBe(401);
	});
});
