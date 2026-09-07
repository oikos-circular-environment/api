import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("get-company-address", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];

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
				business_name: "Address Get Co",
				corporate_name: "Address Get LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
	}

	function addressPayload() {
		return {
			zip_code: "01310100",
			street: "Avenida Paulista",
			number: "1000",
			complement: null,
			district: "Bela Vista",
			city: "São Paulo",
			state: "São Paulo",
			state_code: "SP",
			city_ibge_id: 3550308,
			state_ibge_id: 35,
			latitude: -23.5613,
			longitude: -46.6565,
		};
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

	it("200 — returns { address: null } when no address set", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"90909090909",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/addresses`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ address: null });
	});

	it("200 — returns address after PUT /addresses", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(
			user.id,
			user.email,
			"91919191919",
		);

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/addresses`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: addressPayload(),
		});

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/addresses`,
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.address).toBeDefined();
		expect(body.address.street).toBe("Avenida Paulista");
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(
			owner.id,
			owner.email,
			"92929292929",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/addresses`,
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
			"93939393939",
		);

		const res = await app.inject({
			method: "GET",
			url: `/v1/companies/${company.id}/addresses`,
		});

		expect(res.statusCode).toBe(401);
	});
});
