import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { ListUsersAdminUseCase } from "./list-users-admin-use-case.js";

describe("list-users-admin-use-case", () => {
	it("returns paginated users from the provider", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ListUsersAdminUseCase(provider);

		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		await provider.signUpWithPassword({
			name: "Grace Hopper",
			email: "grace@example.com",
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

		const result = await sut.execute({ limit: 1, offset: 0 }, headers);

		expect(result.users).toHaveLength(1);
		expect(result.total).toBeGreaterThanOrEqual(2);
	});
});
