import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { ResetUserPasswordAdminUseCase } from "./reset-user-password-admin-use-case.js";

describe("reset-user-password-admin-use-case", () => {
	it("resets the user password through the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ResetUserPasswordAdminUseCase(provider);

		const user = await provider.createUser(
			{
				name: "No Password",
				email: "nopass@example.com",
			},
			new Headers(),
		);

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

		await sut.execute(
			{ userId: user.id, newPassword: "NewPass@123456" },
			headers,
		);

		const signInResult = await provider.signInWithPassword({
			email: user.email,
			password: "NewPass@123456",
		});
		expect(signInResult.user.id).toBe(user.id);
	});
});
