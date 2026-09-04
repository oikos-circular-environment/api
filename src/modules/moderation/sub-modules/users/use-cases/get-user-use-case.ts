import type {
	AuthProvider,
	AuthUser,
} from "@/modules/auth/providers/auth/auth-provider.js";

export class GetUserUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<AuthUser> {
		return this.authProvider.getUser({ userId }, headers);
	}
}
