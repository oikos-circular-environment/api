import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { SignUpV2UseCase } from "./sign-up-v2-use-case.js";

describe("sign-up-v2-use-case", () => {
	it("creates a new user", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SignUpV2UseCase(provider);

		await sut.execute({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		expect(provider.users).toHaveLength(1);
		expect(provider.users[0]?.email).toBe("ada@example.com");
		expect(provider.users[0]?.role).toBe("user");
	});
});
