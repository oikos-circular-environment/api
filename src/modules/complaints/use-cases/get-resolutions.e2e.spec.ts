import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { createTestUser, loginTestUser } from "@/test/auth-test-helpers.js";

describe("get-resolutions", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
		const user = await createTestUser(email ? { email } : undefined);
		createdUserIds.push(user.id);
		return { id: user.id, email: user.email };
	}

	async function createComplaint(ownerId: string): Promise<string> {
		const c = await prisma.complaint.create({
			data: {
				id: randomUUID(),
				user_id: ownerId,
				status: "OPEN",
				date: new Date(),
				geospatial: makeGeospatial(),
			},
		});
		createdComplaintIds.push(c.id);
		return c.id;
	}

	async function createProfile(userId: string): Promise<void> {
		await prisma.$executeRawUnsafe(
			`INSERT INTO profiles (id, user_id, full_name, display_name, phone, created_at, updated_at) VALUES ($1, $2, $3, $4, '', NOW(), NOW())`,
			randomUUID(),
			userId,
			"Test User",
			"testuser",
		);
	}

	async function createResolution(
		resolverId: string,
		complaintId: string,
		description = "Resolution description",
	): Promise<string> {
		const resolution = await prisma.complaintResolution.create({
			data: {
				complaint_id: complaintId,
				resolver_user_id: resolverId,
				description,
			},
		});
		return resolution.id;
	}

	async function bearerToken(userId: string, _email?: string): Promise<string> {
		const { token } = await loginTestUser(userId);
		return token;
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdComplaintIds.length > 0) {
			await prisma.complaint.deleteMany({
				where: { id: { in: createdComplaintIds } },
			});
			createdComplaintIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
			createdUserIds.length = 0;
		}
	});

	it("200 — returns empty array when no resolutions exist", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: {
				authorization: `Bearer ${await bearerToken(owner.id, owner.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toStrictEqual({ resolutions: [] });
	});

	it("200 — returns resolution with correct shape and is_owner: true", async () => {
		const resolver = await createUser();
		await createProfile(resolver.id);
		const complaintId = await createComplaint(resolver.id);
		const resolutionId = await createResolution(resolver.id, complaintId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}/resolutions`,
			headers: {
				authorization: `Bearer ${await bearerToken(resolver.id, resolver.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.resolutions).toHaveLength(1);

		const [r] = body.resolutions;
		expect(r.id).toBe(resolutionId);
		expect(r.description).toBe("Resolution description");
		expect(r.company_id).toBeNull();
		expect(r.is_owner).toBe(true);
		expect(r.resolver_user_profile).toStrictEqual({
			type: "profile",
			full_name: "Test User",
			display_name: "testuser",
			avatar_url: null,
		});
		expect(r.resolver_company).toBeNull();
		expect(r.attachments).toStrictEqual([]);
		expect(typeof r.created_at).toBe("string");
		expect(typeof r.updated_at).toBe("string");
	});

	it("401 — missing authorization token", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}/resolutions`,
		});

		expect(res.statusCode).toBe(401);
	});
});
