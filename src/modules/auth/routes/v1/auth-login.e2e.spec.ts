import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("auth-login", () => {
	const createdEmails: string[] = [];

	function makeEmail() {
		const email = `auth-login-${randomUUID()}@test.local`;
		createdEmails.push(email);
		return email;
	}

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

	describe("POST /v1/auth/login", () => {
		it("200 — valid credentials return token and user", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				payload: { name: "Test User", email, password },
			});

			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email, password },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(typeof body.token).toBe("string");
			expect(body.user.email).toBe(email);
			expect(body.user.role).toBe("user");
		});

		it("401 — wrong password", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				payload: { name: "Test User", email, password },
			});

			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email, password: "WrongPass@999" },
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — non-existent email", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: {
					email: `nonexistent-${randomUUID()}@test.local`,
					password: "Test@123456",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("400 — missing email rejected by schema validation", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { password: "Test@123456" },
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
