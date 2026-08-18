import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { UnbanUserUseCase } from "./unban-user-use-case.js";

describe("unban-user-use-case", () => {
	it("unbans the user through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new UnbanUserUseCase(provider);

		const { user } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		await provider.banUser({ userId: user.id }, new Headers());

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

		const result = await sut.execute(user.id, headers);

		expect(result.banned).toBe(false);
	});
});
