import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export type BanUserAdminUseCaseInput = {
	userId: string;
	banReason?: string;
	banExpiresIn?: number;
};

export class BanUserAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: BanUserAdminUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.banUser(input, headers);
	}
}
