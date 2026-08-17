import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("change-password", () => {
	const createdUserIds: string[] = [];

	async function createUser(password = "current-password-123") {
		const id = randomUUID();
		const email = `e2e-${id}@test.local`;
		const hash = await bcryptjs.hash(password, 6);
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, $3, NOW())`,
			id,
			email,
			hash,
		);
		createdUserIds.push(id);
		return { id, email, password };
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

	// ─── PATCH /v1/users/me/change-password ──────────────────────────────────

	describe("PATCH /v1/users/me/change-password", () => {
		it("200 — changes the password, returns a new pair and revokes other sessions", async () => {
			const user = await createUser();
			// Two devices: one whose session we keep, one that must be dropped.
			const current = await login(user.email, user.password);
			const other = await login(user.email, user.password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${current.token}` },
				payload: {
					current_password: user.password,
					new_password: "brand-new-password-456",
				},
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(typeof body.token).toBe("string");
			expect(typeof body.refreshToken).toBe("string");

			// The other device's refresh token no longer works.
			const otherRefresh = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken: other.refreshToken },
			});
			expect(otherRefresh.statusCode).toBe(401);

			// The freshly issued refresh token works.
			const newRefresh = await app.inject({
				method: "PATCH",
				url: "/v1/auth/refresh",
				payload: { refreshToken: body.refreshToken },
			});
			expect(newRefresh.statusCode).toBe(200);

			// The new password authenticates; the old one does not.
			const relogin = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email: user.email, password: "brand-new-password-456" },
			});
			expect(relogin.statusCode).toBe(200);

			const oldLogin = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email: user.email, password: user.password },
			});
			expect(oldLogin.statusCode).toBe(401);
		});

		it("401 — wrong current password", async () => {
			const user = await createUser();
			const { token } = await login(user.email, user.password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${token}` },
				payload: {
					current_password: "wrong-password-999",
					new_password: "brand-new-password-456",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("422 — new password equals the current one", async () => {
			const user = await createUser();
			const { token } = await login(user.email, user.password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${token}` },
				payload: {
					current_password: user.password,
					new_password: user.password,
				},
			});

			expect(res.statusCode).toBe(422);
		});

		it("401 — without an access token", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				payload: {
					current_password: "current-password-123",
					new_password: "brand-new-password-456",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("400 — new password shorter than 6 chars rejected by schema", async () => {
			const user = await createUser();
			const { token } = await login(user.email, user.password);

			const res = await app.inject({
				method: "PATCH",
				url: "/v1/users/me/change-password",
				headers: { authorization: `Bearer ${token}` },
				payload: { current_password: user.password, new_password: "123" },
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
