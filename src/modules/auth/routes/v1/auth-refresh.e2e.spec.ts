import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("auth-refresh", () => {
	const createdUserIds: string[] = [];

	async function createUser(email?: string, password = "test-password-123") {
		const id = randomUUID();
		const mail = email ?? `e2e-${id}@test.local`;
		const hash = await bcryptjs.hash(password, 10);
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, $3, NOW())`,
			id,
			mail,
			hash,
		);
		createdUserIds.push(id);
		return { id, email: mail, password };
	}

	async function login(
		email: string,
		password: string,
	): Promise<{ token: string; refreshToken: string }> {
		const res = await app.inject({
			method: "POST",
			url: "/v1/auth/login",
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
		if (createdUserIds.length > 0) {
			const placeholders = createdUserIds.map((_, i) => `$${i + 1}`).join(", ");
			await prisma.$executeRawUnsafe(
				`DELETE FROM refresh_tokens WHERE user_id IN (${placeholders})`,
				...createdUserIds,
			);
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${placeholders})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	// ─── PATCH /v1/auth/refresh ──────────────────────────────────────────────

	describe("PATCH /v1/auth/refresh", () => {
		it("200 — valid refreshToken in body returns new token and refreshToken", async () => {
			const user = await createUser();
			const { refreshToken } = await login(user.email, user.password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(typeof body.token).toBe("string");
			expect(typeof body.refreshToken).toBe("string");
			expect(body.refreshToken).not.toBe(refreshToken);
		});

		it("200 — rotation revokes the previous refresh token", async () => {
			const user = await createUser();
			const { refreshToken } = await login(user.email, user.password);

			const first = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken },
			});
			expect(first.statusCode).toBe(200);

			// Reusing the rotated-out token must fail.
			const reused = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken },
			});
			expect(reused.statusCode).toBe(401);

			// The freshly issued token still works.
			const next = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken: first.json().refreshToken },
			});
			expect(next.statusCode).toBe(200);
		});

		it("401 — invalid refreshToken", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken: "this.is.not.a.valid.token" },
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — no refreshToken in body and no cookie", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: {},
			});

			expect(res.statusCode).toBe(401);
		});
	});

	// ─── POST /v1/auth/logout ────────────────────────────────────────────────

	describe("POST /v1/auth/logout", () => {
		it("200 — revokes the refresh token so it can no longer be rotated", async () => {
			const user = await createUser();
			const { token, refreshToken } = await login(user.email, user.password);

			const logout = await app.inject({
				method: "POST",
				url: "/v1/auth/logout",
				headers: { authorization: `Bearer ${token}` },
				payload: { refreshToken },
			});
			expect(logout.statusCode).toBe(200);

			const reused = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken },
			});
			expect(reused.statusCode).toBe(401);
		});

		it("401 — without an access token", async () => {
			const user = await createUser();
			const { refreshToken } = await login(user.email, user.password);

			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/logout",
				payload: { refreshToken },
			});

			expect(res.statusCode).toBe(401);
		});
	});
});
