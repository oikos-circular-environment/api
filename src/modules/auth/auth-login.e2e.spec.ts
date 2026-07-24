import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("auth-login", () => {
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

	// ─── POST /v1/auth/login ─────────────────────────────────────────────────

	describe("POST /v1/auth/login", () => {
		it("200 — valid credentials return token and refreshToken", async () => {
			const user = await createUser();

			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email: user.email, password: user.password },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(typeof body.token).toBe("string");
			expect(typeof body.refreshToken).toBe("string");
		});

		it("200 — login persists an active refresh token", async () => {
			const user = await createUser();

			await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email: user.email, password: user.password },
			});

			const tokens = await prisma.refreshToken.findMany({
				where: { user_id: user.id },
			});
			expect(tokens).toHaveLength(1);
			expect(tokens[0].revoked_at).toBeNull();
		});

		it("401 — wrong password", async () => {
			const user = await createUser();

			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { email: user.email, password: "wrong-password-999" },
			});

			expect(res.statusCode).toBe(401);
		});

		it("401 — email not registered", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: {
					email: "nonexistent@test.local",
					password: "test-password-123",
				},
			});

			expect(res.statusCode).toBe(401);
		});

		it("400 — missing email rejected by schema validation", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/v1/auth/login",
				payload: { password: "test-password-123" },
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
