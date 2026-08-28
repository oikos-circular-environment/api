import type {
	AuthProvider,
	AuthUser,
	ListUsersInput,
	ListUsersResult,
} from "@/modules/auth/providers/auth/auth-provider.js";

export class ListUsersUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: ListUsersInput,
		headers: Headers,
	): Promise<ListUsersResult> {
		return this.authProvider.listUsers(input, headers);
	}
}

export type { AuthUser, ListUsersResult };
