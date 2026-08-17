import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { BanUserUseCase } from "./ban-user-use-case.js";

describe("ban-user-use-case", () => {
	it("bans the user through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new BanUserUseCase(provider);

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
			{ userId: user.id, banReason: "spam" },
			headers,
		);

		expect(result.banned).toBe(true);
		expect(result.banReason).toBe("spam");
	});
});
