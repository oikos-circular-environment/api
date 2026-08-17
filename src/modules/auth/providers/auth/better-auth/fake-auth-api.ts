import { randomUUID } from "node:crypto";
import { APIError } from "better-auth";
import type { ListUsersInput } from "../auth-provider.js";
import type {
	AuthApiClient,
	AuthApiSession,
	AuthApiUser,
} from "./better-auth-auth-provider.js";

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "better-auth.session_token";

type FakeUserRecord = {
	user: AuthApiUser;
	password: string;
};

export class FakeAuthApi implements AuthApiClient {
	public records = new Map<string, FakeUserRecord>();
	public sessions = new Map<string, AuthApiSession>();
	public resetTokens = new Map<string, { email: string; expiresAt: Date }>();
	public verificationTokens = new Map<
		string,
		{ email: string; expiresAt: Date }
	>();

	async signUpEmail({
		body: { name, email, password },
	}: {
		body: { name: string; email: string; password: string };
		headers: Headers;
	}) {
		assertPasswordLength(password);
		if (this.findByEmail(email)) {
			throw new APIError("UNPROCESSABLE_ENTITY", {
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
				message: "User already exists. Use another email.",
			});
		}

		const user: AuthApiUser = {
			id: randomUUID(),
			email,
			name,
			emailVerified: false,
			image: null,
			role: "user",
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.records.set(user.id, { user, password });

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	async signInEmail({
		body: { email, password },
	}: {
		body: { email: string; password: string };
		headers: Headers;
	}) {
		const record = this.findByEmail(email);
		if (!record || record.password !== password) {
			throw new APIError("UNAUTHORIZED", {
				code: "INVALID_EMAIL_OR_PASSWORD",
				message: "Invalid email or password",
			});
		}

		const session = this.createSession(record.user.id);
		return { token: session.token, user: record.user };
	}

	async sendVerificationEmail({
		body: { email },
	}: {
		body: { email: string; callbackURL?: string };
	}) {
		if (this.findByEmail(email)) {
			this.verificationTokens.set(randomUUID(), {
				email,
				expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
			});
		}
		return { status: true };
	}

	getPendingVerificationToken(email: string): string | null {
		for (const [token, record] of this.verificationTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	async verifyEmail({ query: { token } }: { query: { token: string } }) {
		const record = this.verificationTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		const userRecord = this.findByEmail(record.email);
		if (!userRecord) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		userRecord.user = {
			...userRecord.user,
			emailVerified: true,
			updatedAt: new Date(),
		};
		this.verificationTokens.delete(token);
		return { status: true };
	}

	async getSession({ headers }: { headers: Headers }) {
		const token = extractSessionToken(headers);
		if (!token) return null;

		const session = this.sessions.get(token);
		if (!session) return null;

		const record = this.records.get(session.userId);
		if (!record) return null;
		return { session, user: record.user };
	}

	async signOut({ headers }: { headers: Headers }) {
		const token = extractSessionToken(headers);
		if (token) this.sessions.delete(token);
		return { success: true };
	}

	async changePassword({
		body: { currentPassword, newPassword },
		headers,
	}: {
		body: { currentPassword: string; newPassword: string };
		headers: Headers;
	}) {
		const session = await this.getSession({ headers });
		if (!session) {
			throw new APIError("UNAUTHORIZED", {
				code: "SESSION_EXPIRED",
				message: "Session expired",
			});
		}

		const record = this.records.get(session.user.id);
		if (!record || record.password !== currentPassword) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_PASSWORD",
				message: "Invalid password",
			});
		}

		assertPasswordLength(newPassword);
		record.password = newPassword;
		return { status: true };
	}

	async requestPasswordReset({ body: { email } }: { body: { email: string } }) {
		if (this.findByEmail(email)) {
			this.resetTokens.set(randomUUID(), {
				email,
				expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
			});
		}
		return {
			status: true,
			message:
				"If this email exists in our system, check your email for the reset link",
		};
	}

	async resetPassword({
		body: { newPassword, token },
	}: {
		body: { newPassword: string; token: string };
	}) {
		const record = this.resetTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		assertPasswordLength(newPassword);

		const userRecord = this.findByEmail(record.email);
		if (!userRecord) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		userRecord.password = newPassword;
		this.resetTokens.delete(token);
		return { status: true };
	}

	async listUsers({ query }: { query: ListUsersInput; headers: Headers }) {
		let result = Array.from(this.records.values()).map((record) => record.user);

		if (query.searchValue) {
			const field = query.searchField ?? "email";
			const operator = query.searchOperator ?? "contains";
			result = result.filter((user) =>
				matchString(
					String(user[field as keyof AuthApiUser] ?? ""),
					query.searchValue ?? "",
					operator,
				),
			);
		}

		if (query.filterValue !== undefined) {
			const field = query.filterField ?? "email";
			result = result.filter((user) =>
				matchValue(
					user[field as keyof AuthApiUser],
					query.filterValue,
					query.filterOperator ?? "eq",
				),
			);
		}

		if (query.sortBy) {
			const direction = query.sortDirection ?? "asc";
			result.sort((a, b) =>
				compareValues(
					a[query.sortBy as keyof AuthApiUser],
					b[query.sortBy as keyof AuthApiUser],
					direction,
				),
			);
		}

		const total = result.length;
		const offset = query.offset ?? 0;
		const limit = query.limit;
		const paginated =
			limit === undefined
				? result.slice(offset)
				: result.slice(offset, offset + limit);

		return { users: paginated, total, limit, offset };
	}

	async getUser({
		query: { id },
	}: {
		query: { id: string };
		headers: Headers;
	}) {
		const record = this.records.get(id);
		if (!record) throw userNotFound();
		return record.user;
	}

	async createUser({
		body: { email, password, name, role, data },
	}: {
		body: {
			email: string;
			password?: string;
			name: string;
			role?: string;
			data?: Record<string, unknown>;
		};
		headers: Headers;
	}) {
		if (this.findByEmail(email)) {
			throw new APIError("UNPROCESSABLE_ENTITY", {
				code: "USER_ALREADY_EXISTS",
				message: "User already exists",
			});
		}
		if (role !== undefined && !isValidRole(role)) {
			throw invalidRole();
		}

		const user: AuthApiUser = {
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
			...data,
		};
		this.records.set(user.id, { user, password: password ?? "" });
		return { user };
	}

	async adminUpdateUser({
		body: { userId, data },
	}: {
		body: { userId: string; data: Record<string, unknown> };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		if (
			"role" in data &&
			data.role !== undefined &&
			!isValidRole(String(data.role))
		) {
			throw invalidRole();
		}

		record.user = {
			...record.user,
			...data,
			id: record.user.id,
			createdAt: record.user.createdAt,
			updatedAt: new Date(),
		};
		return record.user;
	}

	async setRole({
		body: { userId, role },
	}: {
		body: { userId: string; role: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		if (!isValidRole(role)) throw invalidRole();

		record.user = { ...record.user, role, updatedAt: new Date() };
		return { user: record.user };
	}

	async banUser({
		body: { userId, banReason, banExpiresIn },
	}: {
		body: { userId: string; banReason?: string; banExpiresIn?: number };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		if (record.user.banned) {
			throw new APIError("CONFLICT", {
				code: "USER_ALREADY_BANNED",
				message: "User is already banned",
			});
		}

		record.user = {
			...record.user,
			banned: true,
			banReason: banReason ?? null,
			banExpires:
				banExpiresIn !== undefined
					? new Date(Date.now() + banExpiresIn * 1000)
					: null,
			updatedAt: new Date(),
		};
		this.deleteUserSessions(userId);
		return { user: record.user };
	}

	async unbanUser({
		body: { userId },
	}: {
		body: { userId: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		if (!record.user.banned) {
			throw new APIError("CONFLICT", {
				code: "USER_NOT_BANNED",
				message: "User is not banned",
			});
		}

		record.user = {
			...record.user,
			banned: false,
			banReason: null,
			banExpires: null,
			updatedAt: new Date(),
		};
		return { user: record.user };
	}

	async listUserSessions({
		body: { userId },
	}: {
		body: { userId: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		const sessions = Array.from(this.sessions.values()).filter(
			(session) => session.userId === userId,
		);
		return { sessions };
	}

	async revokeUserSessions({
		body: { userId },
	}: {
		body: { userId: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		this.deleteUserSessions(userId);
		return { success: true };
	}

	async setUserPassword({
		body: { userId, newPassword },
	}: {
		body: { userId: string; newPassword: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		assertPasswordLength(newPassword);
		record.password = newPassword;
		return { status: true };
	}

	async removeUser({
		body: { userId },
	}: {
		body: { userId: string };
		headers: Headers;
	}) {
		const record = this.records.get(userId);
		if (!record) throw userNotFound();
		this.deleteUserSessions(userId);
		this.records.delete(userId);
		return { success: true };
	}

	getPendingResetToken(email: string): string | null {
		for (const [token, record] of this.resetTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	private findByEmail(email: string): FakeUserRecord | null {
		for (const record of this.records.values()) {
			if (record.user.email === email) return record;
		}
		return null;
	}

	private createSession(userId: string): AuthApiSession {
		const session: AuthApiSession = {
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
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new APIError("BAD_REQUEST", {
			code: "PASSWORD_TOO_SHORT",
			message: "Password must be at least 6 characters",
		});
	}
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

function userNotFound(): APIError {
	return new APIError("NOT_FOUND", {
		code: "USER_NOT_FOUND",
		message: "User not found",
	});
}

function invalidRole(): APIError {
	return new APIError("BAD_REQUEST", {
		code: "INVALID_ROLE_TYPE",
		message: "Invalid role type",
	});
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
