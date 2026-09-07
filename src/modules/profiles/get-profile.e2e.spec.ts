import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("get-profile", () => {
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

	it("200 — returns profile after creating one", async () => {
		const user = await createUser();
		const displayName = `getprofile-${randomUUID().slice(0, 8)}`;

		await app.inject({
			method: "PUT",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
			payload: {
				full_name: "João Santos",
				display_name: displayName,
				phone: "11999990000",
			},
		});

		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.profile).not.toBeNull();
		expect(body.profile.full_name).toBe("João Santos");
		expect(body.profile.display_name).toBe(displayName);
		expect(body.profile.user_id).toBe(user.id);
	});

	it("200 — returns profile: null when user has no profile", async () => {
		const user = await createUser();

		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles",
			headers: {
				authorization: `Bearer ${await bearerToken(user.id, user.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.profile).toBeNull();
	});

	it("401 — missing authorization token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/profiles",
		});

		expect(res.statusCode).toBe(401);
	});
});
