import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("get-profile-address", () => {
	const createdUserIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
		const user = await createTestUser(email ? { email } : undefined);
		createdUserIds.push(user.id);
		return { id: user.id, email: user.email };
	}

	async function bearerToken(userId: string, _email?: string): Promise<string> {
		const { token } = await loginTestUser(userId);
		return token;
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — returns address: null when profile has no address", async () => {
		const user = await createUser();

		await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "Sem Endereço",
				display_name: `noaddr-${randomUUID().slice(0, 8)}`,
				phone: "11999990000",
			},
		});

		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles/addresses",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.address).toBeNull();
	});

	it("200 — returns address after PUT /profiles with address", async () => {
		const user = await createUser();

		await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "Com Endereço",
				display_name: `withaddr-${randomUUID().slice(0, 8)}`,
				phone: "11999990000",
				address: {
					zip_code: "01310100",
					street: "Av. Paulista",
					number: "1000",
					complement: null,
					district: "Bela Vista",
					city: "São Paulo",
					city_ibge_id: 3550308,
					state: "São Paulo",
					state_ibge_id: 35,
					state_code: "SP",
					latitude: -23.5635,
					longitude: -46.6544,
				},
			},
		});

		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles/addresses",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.address).not.toBeNull();
		expect(body.address.city).toBe("São Paulo");
		expect(body.address.street).toBe("Av. Paulista");
	});

	it("404 — user has no profile (PROFILE_NOT_FOUND)", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles/addresses",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles/addresses",
		});

		expect(res.statusCode).toBe(401);
	});
});
