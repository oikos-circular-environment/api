import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export class GetUserAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthUser> {
		return this.authProvider.getUser({ userId }, headers);
	}
}
