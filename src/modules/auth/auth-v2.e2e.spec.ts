import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";

describe("auth-v2", () => {
	const createdEmails: string[] = [];

	function makeEmail() {
		const email = `auth-v2-${randomUUID()}@test.local`;
		createdEmails.push(email);
		return email;
	}

	const clientKeyHeader = { "X-Client-Key": env.CLIENT_KEY_MOBILE ?? "" };

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdEmails.length > 0) {
			await prisma.user.deleteMany({
				where: { email: { in: createdEmails } },
			});
			createdEmails.length = 0;
		}
	});

	it("signs up, signs in, reads session and signs out", async () => {
		const email = makeEmail();
		const password = "Test@123456";

		const signUpRes = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-up",
			headers: clientKeyHeader,
			payload: { name: "Ada Lovelace", email, password },
		});

		expect(signUpRes.statusCode).toBe(201);

		const signInRes = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-in",
			headers: clientKeyHeader,
			payload: { email, password },
		});

		expect(signInRes.statusCode).toBe(200);
		const { token, user } = signInRes.json();
		expect(typeof token).toBe("string");
		expect(user.email).toBe(email);
		expect(user.role).toBe("user");

		const sessionRes = await app.inject({
			method: "GET",
			url: "/v2/auth/session",
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
			},
		});

		expect(sessionRes.statusCode).toBe(200);
		const sessionBody = sessionRes.json();
		expect(sessionBody.user.email).toBe(email);
		expect(sessionBody.user.role).toBe("user");

		const signOutRes = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-out",
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
			},
		});

		expect(signOutRes.statusCode).toBe(204);

		const sessionAfterSignOutRes = await app.inject({
			method: "GET",
			url: "/v2/auth/session",
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
			},
		});

		expect(sessionAfterSignOutRes.statusCode).toBe(401);
	});
});
