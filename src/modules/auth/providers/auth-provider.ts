export type AuthUser = {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	image: string | null;
	role: string;
	createdAt: Date;
	updatedAt: Date;
};

export type AuthSession = {
	id: string;
	token: string;
	expiresAt: Date;
	userId: string;
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

export interface AuthProvider {
	signUpWithPassword(
		input: SignUpWithPasswordInput,
	): Promise<AuthenticatedUser>;
	signInWithPassword(
		input: SignInWithPasswordInput,
	): Promise<AuthenticatedUser>;
	getSession(headers: Headers): Promise<SessionResult | null>;
	signOut(headers: Headers): Promise<void>;
	changePassword(input: ChangePasswordInput, headers: Headers): Promise<void>;
	requestPasswordReset(email: string): Promise<void>;
	resetPassword(input: ResetPasswordInput): Promise<void>;
}
