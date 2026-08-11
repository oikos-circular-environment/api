import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { GetUserAdminUseCase } from "./get-user-admin-use-case.js";

describe("get-user-admin-use-case", () => {
	it("returns the user for the given id", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new GetUserAdminUseCase(provider);

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

		expect(result.id).toBe(user.id);
		expect(result.email).toBe(user.email);
	});
});
