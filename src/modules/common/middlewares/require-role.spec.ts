import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/modules/auth/providers/auth-provider.js";
import { AppError } from "../errors/app-error.js";
import { requireRole } from "./require-role.js";

function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
	return {
		id: "user-1",
		email: "user@example.com",
		name: "User",
		emailVerified: true,
		image: null,
		role: "user",
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeRequest(user?: AuthUser): FastifyRequest {
	return { authV2User: user } as unknown as FastifyRequest;
}

describe("require-role", () => {
	it("passes when user has the required role", async () => {
		const requireAdmin = requireRole("admin");
		const request = makeRequest(makeAuthUser({ role: "admin" }));

		await expect(requireAdmin(request)).resolves.toBeUndefined();
	});

	it("throws 403 when user has a different role", async () => {
		const requireAdmin = requireRole("admin");
		const request = makeRequest(makeAuthUser({ role: "user" }));

		await expect(requireAdmin(request)).rejects.toThrow(AppError);
		await expect(requireAdmin(request)).rejects.toMatchObject({
			code: "FORBIDDEN",
			statusCode: 403,
		});
	});

	it("throws 403 when authV2User is missing", async () => {
		const requireAdmin = requireRole("admin");
		const request = makeRequest();

		await expect(requireAdmin(request)).rejects.toThrow(AppError);
		await expect(requireAdmin(request)).rejects.toMatchObject({
			code: "FORBIDDEN",
			statusCode: 403,
		});
	});
});
