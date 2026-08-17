import type { AuthProvider } from "../../providers/auth/auth-provider.js";

export class SignOutUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(headers: Headers): Promise<void> {
		await this.authProvider.signOut(headers);
	}
}
