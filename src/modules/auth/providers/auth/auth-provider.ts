export type AuthUser = {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	image: string | null;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: Date | null;
	authSource: string;
	createdAt: Date;
	updatedAt: Date;
};

export type AuthSession = {
	id: string;
	token: string;
	expiresAt: Date;
	userId: string;
	impersonatedBy?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
};

export type AuthenticatedUser = {
	token: string | null;
	user: AuthUser;
};

export type SessionResult = {
	session: AuthSession;
	user: AuthUser;
};

export type SignUpWithPasswordInput = {
	name: string;
	email: string;
	password: string;
};

export type SignInWithPasswordInput = {
	email: string;
	password: string;
};

export type ChangePasswordInput = {
	currentPassword: string;
	newPassword: string;
};

export type ResetPasswordInput = {
	token: string;
	newPassword: string;
};

export type ListUsersInput = {
	searchValue?: string;
	searchField?: "email" | "name";
	searchOperator?: "contains" | "starts_with" | "ends_with";
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortDirection?: "asc" | "desc";
	filterField?: string;
	filterValue?: string | number | boolean | string[] | number[];
	filterOperator?: string;
};

export type ListUsersResult = {
	users: AuthUser[];
	total: number;
	limit?: number;
	offset?: number;
};

export type GetUserInput = {
	userId: string;
};

export type CreateUserInput = {
	email: string;
	password?: string;
	name: string;
	role?: string;
};

export type UpdateUserInput = {
	userId: string;
	data: Partial<Omit<AuthUser, "id" | "createdAt" | "updatedAt">> &
		Record<string, unknown>;
};

export type SetRoleInput = {
	userId: string;
	role: string;
};

export type BanUserInput = {
	userId: string;
	banReason?: string;
	banExpiresIn?: number;
};

export type UnbanUserInput = {
	userId: string;
};

export type ListUserSessionsInput = {
	userId: string;
};

export type RevokeUserSessionsInput = {
	userId: string;
};

export type SetUserPasswordInput = {
	userId: string;
	newPassword: string;
};

export type RemoveUserInput = {
	userId: string;
};

export interface AuthProvider {
	signUpWithPassword(
		input: SignUpWithPasswordInput,
	): Promise<AuthenticatedUser>;
	signInWithPassword(
		input: SignInWithPasswordInput,
	): Promise<AuthenticatedUser>;
	sendVerificationEmail(email: string): Promise<void>;
	verifyEmail(token: string): Promise<void>;
	getSession(headers: Headers): Promise<SessionResult | null>;
	signOut(headers: Headers): Promise<void>;
	changePassword(input: ChangePasswordInput, headers: Headers): Promise<void>;
	requestPasswordReset(email: string): Promise<void>;
	resetPassword(input: ResetPasswordInput): Promise<void>;
	listUsers(input: ListUsersInput, headers: Headers): Promise<ListUsersResult>;
	getUser(input: GetUserInput, headers: Headers): Promise<AuthUser>;
	createUser(input: CreateUserInput, headers: Headers): Promise<AuthUser>;
	updateUser(input: UpdateUserInput, headers: Headers): Promise<AuthUser>;
	setRole(input: SetRoleInput, headers: Headers): Promise<AuthUser>;
	banUser(input: BanUserInput, headers: Headers): Promise<AuthUser>;
	unbanUser(input: UnbanUserInput, headers: Headers): Promise<AuthUser>;
	listUserSessions(
		input: ListUserSessionsInput,
		headers: Headers,
	): Promise<AuthSession[]>;
	revokeUserSessions(
		input: RevokeUserSessionsInput,
		headers: Headers,
	): Promise<void>;
	setUserPassword(input: SetUserPasswordInput, headers: Headers): Promise<void>;
	removeUser(input: RemoveUserInput, headers: Headers): Promise<void>;
}
