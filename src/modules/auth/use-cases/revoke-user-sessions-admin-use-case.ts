import type { AuthProvider } from "../providers/auth-provider.js";

export class RevokeUserSessionsAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<void> {
		return this.authProvider.revokeUserSessions({ userId }, headers);
	}
}
