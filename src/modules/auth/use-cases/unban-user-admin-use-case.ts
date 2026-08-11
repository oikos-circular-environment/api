import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export class UnbanUserAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthUser> {
		return this.authProvider.unbanUser({ userId }, headers);
	}
}
