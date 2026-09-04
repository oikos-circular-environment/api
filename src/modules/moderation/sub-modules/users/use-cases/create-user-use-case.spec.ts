import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { CreateUserUseCase } from "./create-user-use-case.js";

describe("create-user-use-case", () => {
	it("creates a user through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new CreateUserUseCase(provider);

		const admin = await provider.createUser(
			{
				name: "Admin",
				email: "admin@example.com",
				password: "Test@123456",
				role: "moderator",
			},
			new Headers(),
		);
		const session = await provider.signInWithPassword({
			email: admin.email,
			password: "Test@123456",
		});
		const headers = new Headers({
			authorization: `Bearer ${session.token}`,
		});

		const result = await sut.execute(
			{
				name: "New User",
				email: "new@example.com",
				password: "Test@123456",
				role: "moderator",
			},
			headers,
		);

		expect(result.email).toBe("new@example.com");
		expect(result.role).toBe("moderator");
	});
});
