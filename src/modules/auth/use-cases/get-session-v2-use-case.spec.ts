import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { GetSessionV2UseCase } from "./get-session-v2-use-case.js";

describe("get-session-v2-use-case", () => {
	it("returns the authenticated user with role", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new GetSessionV2UseCase(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		const result = await sut.execute(
			new Headers({ authorization: `Bearer ${token}` }),
		);

		expect(result.user.email).toBe("ada@example.com");
		expect(result.user.role).toBe("user");
	});

	it("throws invalid-credentials-error when session is missing", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new GetSessionV2UseCase(provider);

		await expect(sut.execute(new Headers())).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});
});
