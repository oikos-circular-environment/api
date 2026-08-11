import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { CreateUserAdminUseCase } from "./create-user-admin-use-case.js";

describe("create-user-admin-use-case", () => {
	it("creates a user through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new CreateUserAdminUseCase(provider);

		const admin = await provider.createUser(
			{
				name: "Admin",
				email: "admin@example.com",
				password: "Test@123456",
				role: "admin",
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
				role: "admin",
			},
			headers,
		);

		expect(result.email).toBe("new@example.com");
		expect(result.role).toBe("admin");
	});
});
