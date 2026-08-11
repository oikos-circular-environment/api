import { describe, expect } from "vitest";
import { describeAuthProviderContract } from "../auth-provider-contract.js";
import { InMemoryAuthProvider } from "./in-memory-auth-provider.js";

describe("in-memory-auth-provider", () => {
	describeAuthProviderContract({
		createProvider: () => new InMemoryAuthProvider(),
		getResetToken: (provider, email) => {
			const token = (provider as InMemoryAuthProvider).getPendingResetToken(
				email,
			);
			expect(token).not.toBeNull();
			if (token) return Promise.resolve(token);
			throw new Error("expected a pending reset token");
		},
	});
});
