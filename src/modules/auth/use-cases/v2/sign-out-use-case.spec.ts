import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { SignOutUseCase } from "./sign-out-use-case.js";

describe("sign-out-use-case", () => {
	it("invalidates the active session", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SignOutUseCase(provider);
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
