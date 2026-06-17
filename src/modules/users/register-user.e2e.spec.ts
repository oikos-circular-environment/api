import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("register-user", () => {
	const createdEmails: string[] = [];

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdEmails.length > 0) {
			for (const email of createdEmails) {
				await prisma.$executeRawUnsafe(`DELETE FROM users WHERE email = $1`, email);
			}
			createdEmails.length = 0;
		}
	});

	// ─── POST /v1/users/register ─────────────────────────────────────────────

	describe("POST /v1/users/register", () => {
		it("204 — new user created successfully", async () => {
			const email = `e2e-register-${Date.now()}@test.local`;
			createdEmails.push(email);

			const res = await app.inject({
				method: "POST",
				url: "/v1/users/register",
				payload: { email, password: "test-password-123" },
			});

			expect(res.statusCode).toBe(204);
		});

		it("409 — email already registered", async () => {
			const email = `e2e-duplicate-${Date.now()}@test.local`;
			createdEmails.push(email);

			await app.inject({
				method: "POST",
				url: "/v1/users/register",
				payload: { email, password: "test-password-123" },
			});

			const res = await app.inject({
				method: "POST",
				url: "/v1/users/register",
				payload: { email, password: "another-password-456" },
			});

			expect(res.statusCode).toBe(409);
		});

		it("400 — invalid email rejected by schema validation", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/v1/users/register",
				payload: { email: "not-an-email", password: "test-password-123" },
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
