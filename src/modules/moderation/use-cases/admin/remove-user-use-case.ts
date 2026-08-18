import type { AuthProvider } from "@/modules/auth/providers/auth/auth-provider.js";

export class RemoveUserUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(userId: string, headers: Headers): Promise<void> {
		return this.authProvider.removeUser({ userId }, headers);
	}
}
