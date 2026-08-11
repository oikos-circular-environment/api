import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { SetUserRoleAdminUseCase } from "./set-user-role-admin-use-case.js";

describe("set-user-role-admin-use-case", () => {
	it("updates the user role through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SetUserRoleAdminUseCase(provider);

		const { user } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

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
			{ userId: user.id, role: "admin" },
			headers,
		);

		expect(result.role).toBe("admin");
	});
});
