import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { AppError } from "../errors/app-error.js";
import { createVerifySession } from "./verify-session.js";

function makeRequest(headers: Record<string, string> = {}): FastifyRequest {
	return {
		headers,
		log: { warn: vi.fn() },
	} as unknown as FastifyRequest;
}

describe("verify-session", () => {
	it("attaches request.authV2User when session is valid", async () => {
		const provider = new InMemoryAuthProvider();
		const verifySession = createVerifySession(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		const request = makeRequest({ authorization: `Bearer ${token}` });

		await verifySession(request);

		expect(request.authV2User).toBe(provider.users[0]);
		expect(request.authV2User?.role).toBe("user");
	});

	it("throws 401 when authorization header is missing", async () => {
		const provider = new InMemoryAuthProvider();
		const verifySession = createVerifySession(provider);
		const request = makeRequest();

		await expect(verifySession(request)).rejects.toThrow(AppError);
		await expect(verifySession(request)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
			statusCode: 401,
		});
	});

	it("throws 401 when bearer token is invalid", async () => {
		const provider = new InMemoryAuthProvider();
		const verifySession = createVerifySession(provider);
		const request = makeRequest({ authorization: "Bearer invalid-token" });

		await expect(verifySession(request)).rejects.toThrow(AppError);
		await expect(verifySession(request)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
			statusCode: 401,
		});
	});

	it("throws 401 when session is expired", async () => {
		const provider = new InMemoryAuthProvider();
		const verifySession = createVerifySession(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		const session = provider.sessions.get(token);
		if (session) {
			session.expiresAt = new Date(Date.now() - 1000);
		}
		const request = makeRequest({ authorization: `Bearer ${token}` });

		await expect(verifySession(request)).rejects.toThrow(AppError);
		await expect(verifySession(request)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
			statusCode: 401,
		});
	});
});
