import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestSession } from "@/test/create-test-session.js";

describe("update-company", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];

	async function createUser(): Promise<{ id: string; email: string }> {
		const id = randomUUID();
		const email = `e2e-${id}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, created_at) VALUES ($1, $2, NOW())`,
			id,
			email,
		);
		createdUserIds.push(id);
		return { id, email };
	}

	async function bearerToken(userId: string, _email: string): Promise<string> {
		return createTestSession(userId);
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
				business_name: "Original Name",
				corporate_name: "Original LTDA",
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

	it("200 — updates company fields", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"22222222202",
		);

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: { business_name: "Updated Name" },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.company.business_name).toBe("Updated Name");
		expect(body.company.id).toBe(company.id);
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(
			owner.id,
			owner.email,
			"33333333303",
		);

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}`,
			headers: {
				authorization: `Bearer ${await bearerToken(other.id, other.email)}`,
			},
			payload: { business_name: "Hacked Name" },
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"44444444404",
		);

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}`,
			payload: { business_name: "No Auth" },
		});

		expect(res.statusCode).toBe(401);
	});
});
