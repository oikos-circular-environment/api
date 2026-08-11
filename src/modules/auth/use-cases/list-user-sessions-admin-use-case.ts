import type { AuthProvider, AuthSession } from "../providers/auth-provider.js";

export class ListUserSessionsAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthSession[]> {
		return this.authProvider.listUserSessions({ userId }, headers);
	}
}
