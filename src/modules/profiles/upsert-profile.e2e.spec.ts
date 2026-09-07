import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("upsert-profile", () => {
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
			// profiles are deleted by cascade when user is deleted
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — creates profile with address and returns profile", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "Maria Silva",
				display_name: `maria-${randomUUID().slice(0, 8)}`,
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

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.profile).toBeDefined();
		expect(body.profile.full_name).toBe("Maria Silva");
		expect(body.profile.address).not.toBeNull();
		expect(body.profile.address.city).toBe("São Paulo");
	});

	it("200 — updates existing profile", async () => {
		const user = await createUser();
		const displayName = `user-${randomUUID().slice(0, 8)}`;

		await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "Original Name",
				display_name: displayName,
				phone: "11999990000",
			},
		});

		const res = await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "Updated Name",
				display_name: displayName,
				phone: "11999990001",
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.profile.full_name).toBe("Updated Name");
		expect(body.profile.phone).toBe("11999990001");
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			payload: {
				full_name: "Anonymous",
				display_name: "anon",
				phone: "11999990000",
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
