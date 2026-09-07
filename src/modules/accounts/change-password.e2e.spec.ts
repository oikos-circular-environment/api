import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("change-password", () => {
	const createdEmails: string[] = [];

	function makeEmail() {
		const email = `change-password-${randomUUID()}@test.local`;
		createdEmails.push(email);
		return email;
	}

	async function signUp(email: string, password: string) {
		return app.inject({
			method: "POST",
			url: "/v2/auth/sign-up",
			payload: { name: "Test User", email, password },
		});
	}

	async function signIn(email: string, password: string) {
		const res = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-in",
			payload: { email, password },
		});
		return res.json();
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

	describe("PATCH /v1/users/me/change-password", () => {
		it("204 — changes the password and keeps other sessions valid", async () => {
			const email = makeEmail();
			const password = "Test@123456";
			const newPassword = "NewPass@123456";

			await signUp(email, password);
			const current = await signIn(email, password);
			const other = await signIn(email, password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${current.token}` },
				payload: {
					current_password: password,
					new_password: newPassword,
				},
			});

			expect(res.statusCode).toBe(204);
			expect(res.payload).toBe("");

			const otherSessionRes = await app.inject({
				method: "GET",
				url: "/v2/auth/session",
				headers: { authorization: `Bearer ${other.token}` },
			});
			expect(otherSessionRes.statusCode).toBe(200);

			const newLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				payload: { email, password: newPassword },
			});
			expect(newLoginRes.statusCode).toBe(200);

			const oldLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				payload: { email, password },
			});
			expect(oldLoginRes.statusCode).toBe(401);
		});

		it("401 — wrong current password", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await signUp(email, password);
			const { token } = await signIn(email, password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${token}` },
				payload: {
					current_password: "WrongPass@123456",
					new_password: "NewPass@123456",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — without a session token", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				payload: {
					current_password: "Test@123456",
					new_password: "NewPass@123456",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("400 — new password shorter than 6 chars rejected by schema", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await signUp(email, password);
			const { token } = await signIn(email, password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${token}` },
				payload: {
					current_password: password,
					new_password: "123",
				},
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
