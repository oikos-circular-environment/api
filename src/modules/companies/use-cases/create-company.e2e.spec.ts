import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("create-company", () => {
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
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("201 — creates company and returns it", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				identity: "12345678901",
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Eco Company",
				corporate_name: "Eco Company LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});

		expect(res.statusCode).toBe(201);
		const body = res.json();
		expect(body.company).toBeDefined();
		expect(body.company.business_name).toBe("Eco Company");
		expect(body.company.identity).toBe("12345678901");
		createdCompanyIds.push(body.company.id);
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			payload: {
				identity: "98765432100",
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Eco Company",
				corporate_name: "Eco Company LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
