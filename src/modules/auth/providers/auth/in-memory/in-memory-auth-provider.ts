import { randomUUID } from "node:crypto";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { InvalidRoleError } from "@/modules/auth/errors/invalid-role-error.js";
import { UserAlreadyBannedError } from "@/modules/auth/errors/user-already-banned-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { UserNotBannedError } from "@/modules/auth/errors/user-not-banned-error.js";
import { UserNotFoundError } from "@/modules/auth/errors/user-not-found-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type {
	AuthProvider,
	AuthSession,
	AuthUser,
	BanUserInput,
	ChangePasswordInput,
	CreateUserInput,
	GetUserInput,
	ListUserSessionsInput,
	ListUsersInput,
	ListUsersResult,
	RemoveUserInput,
	ResetPasswordInput,
	RevokeUserSessionsInput,
	SessionResult,
	SetRoleInput,
	SetUserPasswordInput,
	SignInWithPasswordInput,
	SignUpWithPasswordInput,
	UnbanUserInput,
	UpdateUserInput,
} from "../auth-provider.js";

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "better-auth.session_token";

type ResetTokenRecord = {
	email: string;
	expiresAt: Date;
};

type VerificationTokenRecord = {
	email: string;
	expiresAt: Date;
};

export type InMemoryAuthProviderOptions = {
	requireEmailVerification?: boolean;
};

export class InMemoryAuthProvider implements AuthProvider {
	public users: AuthUser[] = [];
	public sessions = new Map<string, AuthSession>();
	public resetTokens = new Map<string, ResetTokenRecord>();
	public verificationTokens = new Map<string, VerificationTokenRecord>();
	private readonly passwords = new Map<string, string>();
	private readonly requireEmailVerification: boolean;

	async signUpWithPassword({ name, email, password }: SignUpWithPasswordInput) {
		assertPasswordLength(password);
		if (this.users.some((user) => user.email === email)) {
			throw new UserAlreadyExistsError();
		}

		const user: AuthUser = {
			id: randomUUID(),
			email,
			name,
			emailVerified: false,
			image: null,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.users.push(user);
		this.passwords.set(user.id, password);

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	constructor(options: InMemoryAuthProviderOptions = {}) {
		this.requireEmailVerification = options.requireEmailVerification ?? false;
	}

	async signInWithPassword({ email, password }: SignInWithPasswordInput) {
		const user = this.users.find((item) => item.email === email);
		if (!user || this.passwords.get(user.id) !== password) {
			throw new InvalidCredentialsError();
		}
		if (this.requireEmailVerification && !user.emailVerified) {
			throw new EmailNotVerifiedError();
		}

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	async sendVerificationEmail(email: string) {
		if (!this.users.some((user) => user.email === email)) return;
		this.verificationTokens.set(randomUUID(), {
			email,
			expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
		});
	}

	async verifyEmail(token: string) {
		const record = this.verificationTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new InvalidResetTokenError();
		}

		const user = this.users.find((item) => item.email === record.email);
		if (!user) throw new InvalidResetTokenError();

		user.emailVerified = true;
		user.updatedAt = new Date();
		this.verificationTokens.delete(token);
	}

	getPendingVerificationToken(email: string): string | null {
		for (const [token, record] of this.verificationTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	async getSession(headers: Headers): Promise<SessionResult | null> {
		const token = extractSessionToken(headers);
		if (!token) return null;

		const session = this.sessions.get(token);
		if (!session) return null;
		if (session.expiresAt.getTime() <= Date.now()) {
			this.sessions.delete(token);
			return null;
		}

		const user = this.users.find((item) => item.id === session.userId);
		if (!user) return null;
		return { session, user };
	}

	async signOut(headers: Headers) {
		const token = extractSessionToken(headers);
		if (token) this.sessions.delete(token);
	}

	async changePassword(
		{ currentPassword, newPassword }: ChangePasswordInput,
		headers: Headers,
	) {
		const session = await this.getSession(headers);
		if (!session) throw new InvalidCredentialsError();
		if (this.passwords.get(session.user.id) !== currentPassword) {
			throw new InvalidCredentialsError();
		}

		assertPasswordLength(newPassword);
		this.passwords.set(session.user.id, newPassword);
	}

	async requestPasswordReset(email: string) {
		if (!this.users.some((user) => user.email === email)) return;
		this.resetTokens.set(randomUUID(), {
			email,
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
		});
	}

	async resetPassword({ token, newPassword }: ResetPasswordInput) {
		const record = this.resetTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new InvalidResetTokenError();
		}

		assertPasswordLength(newPassword);

		const user = this.users.find((item) => item.email === record.email);
		if (!user) throw new InvalidResetTokenError();

		this.passwords.set(user.id, newPassword);
		this.resetTokens.delete(token);
	}

	async listUsers(
		input: ListUsersInput,
		_headers: Headers,
	): Promise<ListUsersResult> {
		let result = [...this.users];

		if (input.searchValue) {
			const field = input.searchField ?? "email";
			const operator = input.searchOperator ?? "contains";
			result = result.filter((user) =>
				matchString(
					String(user[field as keyof AuthUser] ?? ""),
					input.searchValue ?? "",
					operator,
				),
			);
		}

		if (input.filterValue !== undefined) {
			const field = input.filterField ?? "email";
			result = result.filter((user) =>
				matchValue(
					user[field as keyof AuthUser],
					input.filterValue,
					input.filterOperator ?? "eq",
				),
			);
		}

		if (input.sortBy) {
			const direction = input.sortDirection ?? "asc";
			result.sort((a, b) =>
				compareValues(
					a[input.sortBy as keyof AuthUser],
					b[input.sortBy as keyof AuthUser],
					direction,
				),
			);
		}

		const total = result.length;
		const offset = input.offset ?? 0;
		const limit = input.limit;
		const paginated =
			limit === undefined
				? result.slice(offset)
				: result.slice(offset, offset + limit);

		return {
			users: paginated,
			total,
			limit,
			offset,
		};
	}

	async getUser({ userId }: GetUserInput, _headers: Headers) {
		const user = this.users.find((item) => item.id === userId);
		if (!user) throw new UserNotFoundError();
		return user;
	}

	async createUser(
		{ email, password, name, role }: CreateUserInput,
		_headers: Headers,
	) {
		if (this.users.some((user) => user.email === email)) {
			throw new UserAlreadyExistsError();
		}

		if (role !== undefined && !isValidRole(role)) {
			throw new InvalidRoleError();
		}

		const user: AuthUser = {
			id: randomUUID(),
			email,
			name,
			emailVerified: false,
			image: null,
			role: role ?? "user",
			banned: false,
			banReason: null,
			banExpires: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.users.push(user);
		if (password !== undefined) {
			this.passwords.set(user.id, password);
		}
		return user;
	}

	async updateUser({ userId, data }: UpdateUserInput, _headers: Headers) {
		const index = this.users.findIndex((item) => item.id === userId);
		if (index === -1) throw new UserNotFoundError();

		const current = this.users[index];
		if (
			"role" in data &&
			data.role !== undefined &&
			!isValidRole(String(data.role))
		) {
			throw new InvalidRoleError();
		}

		const updated: AuthUser = {
			...current,
			...data,
			id: current.id,
			createdAt: current.createdAt,
			updatedAt: new Date(),
		};
		this.users[index] = updated;
		return updated;
	}

	async setRole({ userId, role }: SetRoleInput, _headers: Headers) {
		if (!isValidRole(role)) throw new InvalidRoleError();
		const index = this.users.findIndex((item) => item.id === userId);
		if (index === -1) throw new UserNotFoundError();

		this.users[index] = {
			...this.users[index],
			role,
			updatedAt: new Date(),
		};
		return this.users[index];
	}

	async banUser(
		{ userId, banReason, banExpiresIn }: BanUserInput,
		_headers: Headers,
	) {
		const index = this.users.findIndex((item) => item.id === userId);
		if (index === -1) throw new UserNotFoundError();
		if (this.users[index].banned) throw new UserAlreadyBannedError();

		this.users[index] = {
			...this.users[index],
			banned: true,
			banReason: banReason ?? null,
			banExpires:
				banExpiresIn !== undefined
					? new Date(Date.now() + banExpiresIn * 1000)
					: null,
			updatedAt: new Date(),
		};
		this.deleteUserSessions(userId);
		return this.users[index];
	}

	async unbanUser({ userId }: UnbanUserInput, _headers: Headers) {
		const index = this.users.findIndex((item) => item.id === userId);
		if (index === -1) throw new UserNotFoundError();
		if (!this.users[index].banned) throw new UserNotBannedError();

		this.users[index] = {
			...this.users[index],
			banned: false,
			banReason: null,
			banExpires: null,
			updatedAt: new Date(),
		};
		return this.users[index];
	}

	async listUserSessions(
		{ userId }: ListUserSessionsInput,
		_headers: Headers,
	): Promise<AuthSession[]> {
		if (!this.users.some((item) => item.id === userId)) {
			throw new UserNotFoundError();
		}
		return Array.from(this.sessions.values()).filter(
			(session) => session.userId === userId,
		);
	}

	async revokeUserSessions(
		{ userId }: RevokeUserSessionsInput,
		_headers: Headers,
	) {
		const user = this.users.find((item) => item.id === userId);
		if (!user) throw new UserNotFoundError();
		this.deleteUserSessions(userId);
	}

	async setUserPassword(
		{ userId, newPassword }: SetUserPasswordInput,
		_headers: Headers,
	) {
		const user = this.users.find((item) => item.id === userId);
		if (!user) throw new UserNotFoundError();
		assertPasswordLength(newPassword);
		this.passwords.set(user.id, newPassword);
	}

	async removeUser({ userId }: RemoveUserInput, _headers: Headers) {
		const index = this.users.findIndex((item) => item.id === userId);
		if (index === -1) throw new UserNotFoundError();

		this.deleteUserSessions(userId);
		this.passwords.delete(userId);
		this.users.splice(index, 1);
	}

	getPendingResetToken(email: string): string | null {
		for (const [token, record] of this.resetTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	private createSession(userId: string): AuthSession {
		const session: AuthSession = {
			id: randomUUID(),
			token: randomUUID(),
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
			userId,
		};
		this.sessions.set(session.token, session);
		return session;
	}

	private deleteUserSessions(userId: string) {
		for (const [token, session] of this.sessions) {
			if (session.userId === userId) this.sessions.delete(token);
		}
	}
}

function assertPasswordLength(password: string) {
	if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError();
}

function extractSessionToken(headers: Headers): string | null {
	const authorization = headers.get("authorization");
	if (authorization?.startsWith("Bearer ")) {
		return authorization.slice("Bearer ".length);
	}

	const cookie = headers.get("cookie");
	if (!cookie) return null;

	const prefix = `${SESSION_COOKIE_NAME}=`;
	const match = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix));
	return match ? match.slice(prefix.length) : null;
}

function isValidRole(role: string): boolean {
	return role.length > 0;
}

function matchString(value: string, search: string, operator: string): boolean {
	switch (operator) {
		case "starts_with":
			return value.startsWith(search);
		case "ends_with":
			return value.endsWith(search);
		default:
			return value.includes(search);
	}
}

function matchValue(
	fieldValue: unknown,
	filterValue: unknown,
	operator: string,
): boolean {
	switch (operator) {
		case "ne":
			return fieldValue !== filterValue;
		case "lt":
			return (fieldValue as number) < (filterValue as number);
		case "lte":
			return (fieldValue as number) <= (filterValue as number);
		case "gt":
			return (fieldValue as number) > (filterValue as number);
		case "gte":
			return (fieldValue as number) >= (filterValue as number);
		case "in":
			return Array.isArray(filterValue) && filterValue.includes(fieldValue);
		case "contains":
			return String(fieldValue).includes(String(filterValue));
		default:
			return fieldValue === filterValue;
	}
}

function compareValues(
	a: unknown,
	b: unknown,
	direction: "asc" | "desc",
): number {
	if (a === b) return 0;
	const result = a == null ? 1 : b == null ? -1 : a < b ? -1 : 1;
	return direction === "desc" ? -result : result;
}
