import type {
	AuthProvider,
	AuthUser,
} from "@/modules/auth/providers/auth/auth-provider.js";

export type BanUserUseCaseInput = {
	userId: string;
	banReason?: string;
	banExpiresIn?: number;
};

export class BanUserUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: BanUserUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.banUser(input, headers);
	}
}
