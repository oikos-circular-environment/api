import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("get-company-business-hours", () => {
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
				business_name: "BH Get Co",
				corporate_name: "BH Get LTDA",
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

	it("200 — returns 7 days after upsert", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"18018018018",
		);

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
				],
			},
		});

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.business_hours).toHaveLength(7);
		const monday = body.business_hours.find(
			(h: { day_of_week: string }) => h.day_of_week === "MONDAY",
		);
		expect(monday.is_open).toBe(true);
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(
			owner.id,
			owner.email,
			"19019019019",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: {
				authorization: `Bearer ${bearerToken(other.id, other.email)}`,
			},
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"20120120120",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/business-hours`,
		});

		expect(res.statusCode).toBe(401);
	});
});
