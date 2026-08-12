import type {
	AuthProvider,
	AuthSession,
} from "@/modules/auth/providers/auth/auth-provider.js";

export class ListUserSessionsUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthSession[]> {
		return this.authProvider.listUserSessions({ userId }, headers);
	}
}
