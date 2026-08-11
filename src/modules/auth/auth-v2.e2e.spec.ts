import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";
import { app } from "@/app.js";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";
import type { InMemoryEmailProvider } from "@/shared/providers/email/in-memory/in-memory-email-provider.js";
import { emailProvider } from "./providers/better-auth/better-auth.js";

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

	beforeEach(() => {
		(emailProvider as InMemoryEmailProvider).clear();
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

	describe("POST /v2/auth/change-password", () => {
		it("changes the password and keeps other sessions valid", async () => {
			const email = makeEmail();
			const password = "Test@123456";
			const newPassword = "NewPass@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				headers: clientKeyHeader,
				payload: { name: "Ada Lovelace", email, password },
			});

			const currentSignInRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password },
			});
			const { token: currentToken } = currentSignInRes.json();

			const otherSignInRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password },
			});
			const { token: otherToken } = otherSignInRes.json();

			const changeRes = await app.inject({
				method: "POST",
				url: "/v2/auth/change-password",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${currentToken}`,
				},
				payload: { currentPassword: password, newPassword },
			});
			expect(changeRes.statusCode).toBe(204);

			const currentSessionRes = await app.inject({
				method: "GET",
				url: "/v2/auth/session",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${currentToken}`,
				},
			});
			expect(currentSessionRes.statusCode).toBe(200);

			const otherSessionRes = await app.inject({
				method: "GET",
				url: "/v2/auth/session",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${otherToken}`,
				},
			});
			expect(otherSessionRes.statusCode).toBe(200);

			const newLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password: newPassword },
			});
			expect(newLoginRes.statusCode).toBe(200);

			const oldLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password },
			});
			expect(oldLoginRes.statusCode).toBe(401);
		});

		it("returns 401 when the current password is wrong", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				headers: clientKeyHeader,
				payload: { name: "Ada Lovelace", email, password },
			});

			const signInRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password },
			});
			const { token } = signInRes.json();

			const changeRes = await app.inject({
				method: "POST",
				url: "/v2/auth/change-password",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${token}`,
				},
				payload: {
					currentPassword: "wrong-password",
					newPassword: "NewPass@123456",
				},
			});

			expect(changeRes.statusCode).toBe(401);
		});
	});

	describe("POST /v2/auth/forgot-password", () => {
		it("returns the same generic response for existing and unknown emails", async () => {
			const email = makeEmail();
			const password = "Test@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				headers: clientKeyHeader,
				payload: { name: "Ada Lovelace", email, password },
			});

			const existingRes = await app.inject({
				method: "POST",
				url: "/v2/auth/forgot-password",
				headers: clientKeyHeader,
				payload: { email },
			});

			const unknownRes = await app.inject({
				method: "POST",
				url: "/v2/auth/forgot-password",
				headers: clientKeyHeader,
				payload: { email: `unknown-${randomUUID()}@test.local` },
			});

			expect(existingRes.statusCode).toBe(200);
			expect(unknownRes.statusCode).toBe(200);
			expect(existingRes.json()).toEqual(unknownRes.json());
		});
	});

	describe("POST /v2/auth/reset-password", () => {
		it("resets the password and allows sign-in with the new password", async () => {
			const email = makeEmail();
			const password = "Test@123456";
			const newPassword = "NewPass@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				headers: clientKeyHeader,
				payload: { name: "Ada Lovelace", email, password },
			});

			const forgotRes = await app.inject({
				method: "POST",
				url: "/v2/auth/forgot-password",
				headers: clientKeyHeader,
				payload: { email },
			});
			expect(forgotRes.statusCode).toBe(200);

			const token = (
				emailProvider as InMemoryEmailProvider
			).getResetTokenForEmail(email);
			expect(token).not.toBeNull();

			const resetRes = await app.inject({
				method: "POST",
				url: "/v2/auth/reset-password",
				headers: clientKeyHeader,
				payload: { token, newPassword },
			});
			expect(resetRes.statusCode).toBe(204);

			const oldLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password },
			});
			expect(oldLoginRes.statusCode).toBe(401);

			const newLoginRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password: newPassword },
			});
			expect(newLoginRes.statusCode).toBe(200);
		});

		it("returns 400 for an expired or already used token", async () => {
			const email = makeEmail();
			const password = "Test@123456";
			const newPassword = "NewPass@123456";

			await app.inject({
				method: "POST",
				url: "/v2/auth/sign-up",
				headers: clientKeyHeader,
				payload: { name: "Ada Lovelace", email, password },
			});

			await app.inject({
				method: "POST",
				url: "/v2/auth/forgot-password",
				headers: clientKeyHeader,
				payload: { email },
			});

			const token = (
				emailProvider as InMemoryEmailProvider
			).getResetTokenForEmail(email);
			expect(token).not.toBeNull();

			await app.inject({
				method: "POST",
				url: "/v2/auth/reset-password",
				headers: clientKeyHeader,
				payload: { token, newPassword },
			});

			const reusedRes = await app.inject({
				method: "POST",
				url: "/v2/auth/reset-password",
				headers: clientKeyHeader,
				payload: { token, newPassword },
			});
			expect(reusedRes.statusCode).toBe(400);
		});
	});
});
