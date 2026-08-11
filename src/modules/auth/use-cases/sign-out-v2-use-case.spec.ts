import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/in-memory/in-memory-auth-provider.js";
import { SignOutV2UseCase } from "./sign-out-v2-use-case.js";

describe("sign-out-v2-use-case", () => {
	it("invalidates the active session", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SignOutV2UseCase(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		await sut.execute(headers);

		await expect(provider.getSession(headers)).resolves.toBeNull();
	});
});
