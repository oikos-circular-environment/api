import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";

const PASSWORD = "Test@123456";
const NEW_PASSWORD = "NewPass@123456";

describe("users-admin", () => {
	const createdUserIds: string[] = [];
	const clientKeyHeader = { "X-Client-Key": env.CLIENT_KEY_MOBILE ?? "" };

	function makeEmail(prefix = "users-admin") {
		return `${prefix}-${randomUUID()}@test.local`;
	}

	async function signUp(email: string) {
		const res = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-up",
			headers: clientKeyHeader,
			payload: { name: "Test User", email, password: PASSWORD },
		});
		expect(res.statusCode).toBe(201);
	}

	async function signIn(email: string, password = PASSWORD) {
		const res = await app.inject({
			method: "POST",
			url: "/v2/auth/sign-in",
			headers: clientKeyHeader,
			payload: { email, password },
		});
		expect(res.statusCode).toBe(200);
		return res.json<{ token: string; user: { id: string } }>();
	}

	async function makeAdmin(email: string) {
		await signUp(email);
		const { user } = await signIn(email);
		await prisma.user.update({
			where: { id: user.id },
			data: { role: "admin" },
		});
		createdUserIds.push(user.id);
		return email;
	}

	async function makeRegularUser(email: string) {
		await signUp(email);
		const { user } = await signIn(email);
		createdUserIds.push(user.id);
		return { email, id: user.id };
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdUserIds.length > 0) {
			await prisma.account.deleteMany({
				where: { user_id: { in: createdUserIds } },
			});
			await prisma.session.deleteMany({
				where: { user_id: { in: createdUserIds } },
			});
			await prisma.user.deleteMany({
				where: { id: { in: createdUserIds } },
			});
			createdUserIds.length = 0;
		}
		await prisma.verification.deleteMany({});
	});

	describe("GET /v2/moderation/users", () => {
		it("lists users when authenticated as admin", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const userEmail = makeEmail("user");
			await makeRegularUser(userEmail);

			const res = await app.inject({
				method: "GET",
				url: "/v2/moderation/users",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${adminToken}`,
				},
				query: { limit: "10", offset: "0" },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json<{ users: { email: string }[]; total: number }>();
			expect(body.users.some((u) => u.email === userEmail)).toBe(true);
			expect(body.total).toBeGreaterThanOrEqual(1);
		});

		it("returns 403 for a non-admin user", async () => {
			const userEmail = makeEmail("regular");
			await makeRegularUser(userEmail);
			const { token } = await signIn(userEmail);

			const res = await app.inject({
				method: "GET",
				url: "/v2/moderation/users",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${token}`,
				},
			});

			expect(res.statusCode).toBe(403);
		});
	});

	describe("admin user lifecycle", () => {
		it("runs list → ban → revoke-sessions → reset-password → remove-user", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const targetEmail = makeEmail("target");
			const { id: targetId, email } = await makeRegularUser(targetEmail);
			await signIn(targetEmail);

			const adminHeaders = {
				...clientKeyHeader,
				authorization: `Bearer ${adminToken}`,
			};

			const listRes = await app.inject({
				method: "GET",
				url: "/v2/moderation/users",
				headers: adminHeaders,
				query: { searchValue: email, searchField: "email" },
			});
			expect(listRes.statusCode).toBe(200);
			const listBody = listRes.json<{ users: { id: string }[] }>();
			expect(listBody.users[0].id).toBe(targetId);

			const getRes = await app.inject({
				method: "GET",
				url: `/v2/moderation/users/${targetId}`,
				headers: adminHeaders,
			});
			expect(getRes.statusCode).toBe(200);
			const getBody = getRes.json<{ user: { id: string } }>();
			expect(getBody.user.id).toBe(targetId);

			const sessionsBeforeRes = await app.inject({
				method: "GET",
				url: `/v2/moderation/users/${targetId}/sessions`,
				headers: adminHeaders,
			});
			expect(sessionsBeforeRes.statusCode).toBe(200);
			const sessionsBeforeBody = sessionsBeforeRes.json<{
				sessions: unknown[];
			}>();
			expect(sessionsBeforeBody.sessions.length).toBeGreaterThan(0);

			const banRes = await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/ban`,
				headers: adminHeaders,
				payload: { banReason: "violation" },
			});
			expect(banRes.statusCode).toBe(200);
			const banBody = banRes.json<{
				user: { banned: boolean; ban_reason: string | null };
			}>();
			expect(banBody.user.banned).toBe(true);
			expect(banBody.user.ban_reason).toBe("violation");

			const revokeRes = await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/revoke-sessions`,
				headers: adminHeaders,
			});
			expect(revokeRes.statusCode).toBe(204);

			const sessionsAfterRes = await app.inject({
				method: "GET",
				url: `/v2/moderation/users/${targetId}/sessions`,
				headers: adminHeaders,
			});
			expect(sessionsAfterRes.statusCode).toBe(200);
			const sessionsAfterBody = sessionsAfterRes.json<{
				sessions: unknown[];
			}>();
			expect(sessionsAfterBody.sessions).toHaveLength(0);

			const resetRes = await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/reset-password`,
				headers: adminHeaders,
				payload: { newPassword: NEW_PASSWORD },
			});
			expect(resetRes.statusCode).toBe(204);

			const unbanForSignInRes = await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/unban`,
				headers: adminHeaders,
			});
			expect(unbanForSignInRes.statusCode).toBe(200);

			const newSignInRes = await app.inject({
				method: "POST",
				url: "/v2/auth/sign-in",
				headers: clientKeyHeader,
				payload: { email, password: NEW_PASSWORD },
			});
			expect(newSignInRes.statusCode).toBe(200);

			const removeRes = await app.inject({
				method: "DELETE",
				url: `/v2/moderation/users/${targetId}`,
				headers: adminHeaders,
			});
			expect(removeRes.statusCode).toBe(204);

			const getAfterRemoveRes = await app.inject({
				method: "GET",
				url: `/v2/moderation/users/${targetId}`,
				headers: adminHeaders,
			});
			expect(getAfterRemoveRes.statusCode).toBe(404);
		});
	});

	describe("POST /v2/moderation/users/:id/unban", () => {
		it("unbans a previously banned user", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const targetEmail = makeEmail("target");
			const { id: targetId } = await makeRegularUser(targetEmail);

			const adminHeaders = {
				...clientKeyHeader,
				authorization: `Bearer ${adminToken}`,
			};

			await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/ban`,
				headers: adminHeaders,
				payload: {},
			});

			const unbanRes = await app.inject({
				method: "POST",
				url: `/v2/moderation/users/${targetId}/unban`,
				headers: adminHeaders,
			});
			expect(unbanRes.statusCode).toBe(200);
			const unbanBody = unbanRes.json<{ user: { banned: boolean } }>();
			expect(unbanBody.user.banned).toBe(false);
		});
	});

	describe("POST /v2/moderation/users", () => {
		it("creates a user when authenticated as admin", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const newEmail = makeEmail("created");
			const res = await app.inject({
				method: "POST",
				url: "/v2/moderation/users",
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${adminToken}`,
				},
				payload: {
					name: "Created User",
					email: newEmail,
					password: PASSWORD,
					role: "user",
				},
			});

			expect(res.statusCode).toBe(201);
			const body = res.json<{
				user: { id: string; email: string; role: string };
			}>();
			expect(body.user.email).toBe(newEmail);
			expect(body.user.role).toBe("user");
			createdUserIds.push(body.user.id);
		});
	});

	describe("PATCH /v2/moderation/users/:id/role", () => {
		it("changes the user role when authenticated as admin", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const targetEmail = makeEmail("target");
			const { id: targetId } = await makeRegularUser(targetEmail);

			const res = await app.inject({
				method: "PATCH",
				url: `/v2/moderation/users/${targetId}/role`,
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${adminToken}`,
				},
				payload: { role: "admin" },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json<{ user: { role: string } }>();
			expect(body.user.role).toBe("admin");
		});
	});

	describe("authorization", () => {
		it("returns 403 on every admin route for a regular user", async () => {
			const adminEmail = makeEmail("admin");
			await makeAdmin(adminEmail);
			const { token: adminToken } = await signIn(adminEmail);

			const userEmail = makeEmail("regular");
			const { id: targetId } = await makeRegularUser(userEmail);
			const { token: userToken } = await signIn(userEmail);

			const userHeaders = {
				...clientKeyHeader,
				authorization: `Bearer ${userToken}`,
			};

			const routes = [
				{ method: "GET", url: "/v2/moderation/users" },
				{ method: "GET", url: `/v2/moderation/users/${targetId}` },
				{
					method: "POST",
					url: "/v2/moderation/users",
					payload: { name: "X", email: makeEmail("x") },
				},
				{
					method: "PATCH",
					url: `/v2/moderation/users/${targetId}/role`,
					payload: { role: "admin" },
				},
				{
					method: "POST",
					url: `/v2/moderation/users/${targetId}/ban`,
					payload: {},
				},
				{
					method: "POST",
					url: `/v2/moderation/users/${targetId}/unban`,
					payload: {},
				},
				{ method: "GET", url: `/v2/moderation/users/${targetId}/sessions` },
				{
					method: "POST",
					url: `/v2/moderation/users/${targetId}/revoke-sessions`,
					payload: {},
				},
				{
					method: "POST",
					url: `/v2/moderation/users/${targetId}/reset-password`,
					payload: { newPassword: NEW_PASSWORD },
				},
				{ method: "DELETE", url: `/v2/moderation/users/${targetId}` },
			];

			for (const route of routes) {
				const res = await app.inject({
					method: route.method as never,
					url: route.url,
					headers: userHeaders,
					payload: route.payload,
				});
				expect(res.statusCode).toBe(403);
			}

			await app.inject({
				method: "DELETE",
				url: `/v2/moderation/users/${targetId}`,
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${adminToken}`,
				},
			});
		});
	});
});
