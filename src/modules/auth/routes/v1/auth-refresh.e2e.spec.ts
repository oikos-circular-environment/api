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

describe("auth-refresh", () => {
	const createdEmails: string[] = [];

	function makeEmail() {
		const email = `auth-refresh-${randomUUID()}@test.local`;
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

	describe("PATCH /v1/auth/refresh", () => {
		it("200 — valid bearer token returns current session", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				payload: { name: "Test User", email, password },
			});

			const loginRes = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email, password },
			});
			const { token } = loginRes.json();

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				headers: { authorization: `Bearer ${token}` },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(body.user.email).toBe(email);
			expect(body.user.role).toBe("user");
		});

		it("401 — missing Authorization header", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — invalid token", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				headers: { authorization: "Bearer this.is.not.a.valid.token" },
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — token from deleted session", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				payload: { name: "Test User", email, password },
			});

			const loginRes = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email, password },
			});
			const { token } = loginRes.json();

			await prisma.user.deleteMany({ where: { email } });

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				headers: { authorization: `Bearer ${token}` },
			});

			expect(res.statusCode).toBe(401);
		});
	});
});
