import type { AuthProvider } from "../providers/auth-provider.js";

export class SignOutV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(headers: Headers): Promise<void> {
		await this.authProvider.signOut(headers);
	}
}
