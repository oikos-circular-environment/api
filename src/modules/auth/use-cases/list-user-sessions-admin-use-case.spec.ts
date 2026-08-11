import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { ListUserSessionsAdminUseCase } from "./list-user-sessions-admin-use-case.js";

describe("list-user-sessions-admin-use-case", () => {
	it("returns the user sessions from the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ListUserSessionsAdminUseCase(provider);

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

		const result = await sut.execute(user.id, headers);

		expect(result).toHaveLength(1);
		expect(result[0].userId).toBe(user.id);
	});
});
