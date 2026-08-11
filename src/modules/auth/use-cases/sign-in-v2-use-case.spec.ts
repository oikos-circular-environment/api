import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { SignInV2UseCase } from "./sign-in-v2-use-case.js";

describe("sign-in-v2-use-case", () => {
	it("returns token and user for valid credentials", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SignInV2UseCase(provider);

		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		const result = await sut.execute({
			email: "ada@example.com",
			password: "Test@123456",
		});

		expect(typeof result.token).toBe("string");
		expect(result.user.email).toBe("ada@example.com");
		expect(result.user.role).toBe("user");
	});
});
