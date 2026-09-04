import type {
	AuthProvider,
	AuthUser,
} from "@/modules/auth/providers/auth/auth-provider.js";

export class UnbanUserUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthUser> {
		return this.authProvider.unbanUser({ userId }, headers);
	}
}
