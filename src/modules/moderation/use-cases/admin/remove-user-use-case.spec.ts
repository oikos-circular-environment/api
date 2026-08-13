import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { RemoveUserUseCase } from "./remove-user-use-case.js";

describe("remove-user-use-case", () => {
	it("removes the user through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new RemoveUserUseCase(provider);

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

		await sut.execute(user.id, headers);

		await expect(
			provider.getUser({ userId: user.id }, new Headers()),
		).rejects.toThrow();
	});
});
