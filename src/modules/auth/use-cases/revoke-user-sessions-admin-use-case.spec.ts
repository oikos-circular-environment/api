import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { RevokeUserSessionsAdminUseCase } from "./revoke-user-sessions-admin-use-case.js";

describe("revoke-user-sessions-admin-use-case", () => {
	it("revokes the user sessions through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new RevokeUserSessionsAdminUseCase(provider);

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

		await sut.execute(user.id, headers);

		expect(
			await provider.listUserSessions({ userId: user.id }, new Headers()),
		).toHaveLength(0);
	});
});
