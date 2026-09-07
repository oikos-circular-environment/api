import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/modules/auth/providers/auth/auth-provider.js";
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
		banned: false,
		banReason: null,
		banExpires: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeRequest(user?: AuthUser): FastifyRequest {
	return { authUser: user } as unknown as FastifyRequest;
}

describe("require-role", () => {
	it("passes when user has the required role", async () => {
		const requireModerator = requireRole("moderator");
		const request = makeRequest(makeAuthUser({ role: "moderator" }));

		await expect(requireModerator(request)).resolves.toBeUndefined();
	});

	it("throws 403 when user has a different role", async () => {
		const requireModerator = requireRole("moderator");
		const request = makeRequest(makeAuthUser({ role: "user" }));

		await expect(requireModerator(request)).rejects.toThrow(AppError);
		await expect(requireModerator(request)).rejects.toMatchObject({
			code: "FORBIDDEN",
			statusCode: 403,
		});
	});

	it("throws 403 when authUser is missing", async () => {
		const requireModerator = requireRole("moderator");
		const request = makeRequest();

		await expect(requireModerator(request)).rejects.toThrow(AppError);
		await expect(requireModerator(request)).rejects.toMatchObject({
			code: "FORBIDDEN",
			statusCode: 403,
		});
	});
});
