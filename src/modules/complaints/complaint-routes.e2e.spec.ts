import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("complaint-routes — e2e", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(email?: string): Promise<{ id: string; email: string }> {
		const userId = randomUUID();
		const userEmail = email ?? `e2e-${userId}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			userEmail,
		);
		createdUserIds.push(userId);
		return { id: userId, email: userEmail };
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

	function bearerToken(userId: string, email: string): string {
		return app.jwt.sign({ sub: userId, user: { id: userId, email } });
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
			data: { complaint_id: complaintId, resolver_user_id: resolverId, description },
		});
		return resolution.id;
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
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	// ─── POST /v1/complaints/:id/votes ───────────────────────────────────────

	describe("POST /v1/complaints/:id/votes", () => {
		it("200 — registers RESOLVED vote and returns vote object", async () => {
			const owner = await createUser();
			const voter = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${bearerToken(voter.id, voter.email)}` },
				payload: { vote_type: "RESOLVED" },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(body.vote.vote_type).toBe("RESOLVED");
			expect(body.vote.complaint_id).toBe(complaintId);
			expect(body.vote.user_id).toBe(voter.id);
		});

		it("200 — second vote from same user updates (upsert) and returns updated vote", async () => {
			const owner = await createUser();
			const voter = await createUser();
			const complaintId = await createComplaint(owner.id);
			const token = bearerToken(voter.id, voter.email);

			await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${token}` },
				payload: { vote_type: "RESOLVED" },
			});

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${token}` },
				payload: { vote_type: "NOT_RESOLVED" },
			});

			expect(res.statusCode).toBe(200);
			expect(res.json().vote.vote_type).toBe("NOT_RESOLVED");

			const votes = await prisma.complaintVote.findMany({
				where: { complaint_id: complaintId, user_id: voter.id },
			});
			expect(votes).toHaveLength(1);
		});

		it("404 — complaint does not exist", async () => {
			const voter = await createUser();

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${randomUUID()}/votes`,
				headers: { authorization: `Bearer ${bearerToken(voter.id, voter.email)}` },
				payload: { vote_type: "RESOLVED" },
			});

			expect(res.statusCode).toBe(404);
		});

		it("422 — complaint is RESOLVED (COMPLAINT_CLOSED)", async () => {
			const owner = await createUser();
			const voter = await createUser();
			const complaintId = await createComplaint(owner.id);
			await prisma.complaint.update({
				where: { id: complaintId },
				data: { status: "RESOLVED" },
			});

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${bearerToken(voter.id, voter.email)}` },
				payload: { vote_type: "RESOLVED" },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("COMPLAINT_CLOSED");
		});

		it("422 — complaint is CANCELED (COMPLAINT_CLOSED)", async () => {
			const owner = await createUser();
			const voter = await createUser();
			const complaintId = await createComplaint(owner.id);
			await prisma.complaint.update({
				where: { id: complaintId },
				data: { status: "CANCELED" },
			});

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${bearerToken(voter.id, voter.email)}` },
				payload: { vote_type: "NOT_RESOLVED" },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("COMPLAINT_CLOSED");
		});

		it("401 — missing authorization token", async () => {
			const owner = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				payload: { vote_type: "RESOLVED" },
			});

			expect(res.statusCode).toBe(401);
		});

		it("400 — invalid vote_type rejected by schema validation", async () => {
			const owner = await createUser();
			const voter = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/votes`,
				headers: { authorization: `Bearer ${bearerToken(voter.id, voter.email)}` },
				payload: { vote_type: "INVALID_VALUE" },
			});

			expect(res.statusCode).toBe(400);
		});
	});

	// ─── POST /v1/complaints/:id/resolutions ─────────────────────────────────

	describe("POST /v1/complaints/:id/resolutions", () => {
		it("204 — creates resolution successfully", async () => {
			const owner = await createUser();
			const resolver = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "The problem was fixed by the city hall." },
			});

			expect(res.statusCode).toBe(204);

			const inDb = await prisma.complaintResolution.findFirst({
				where: { complaint_id: complaintId, resolver_user_id: resolver.id },
			});
			expect(inDb).not.toBeNull();
			expect(inDb?.description).toBe("The problem was fixed by the city hall.");
		});

		it("422 — RESOLUTION_ALREADY_EXISTS when same user submits twice", async () => {
			const owner = await createUser();
			const resolver = await createUser();
			const complaintId = await createComplaint(owner.id);
			const token = bearerToken(resolver.id, resolver.email);

			await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${token}` },
				payload: { description: "First submission." },
			});

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${token}` },
				payload: { description: "Second submission." },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("RESOLUTION_ALREADY_EXISTS");
		});

		it("404 — complaint does not exist", async () => {
			const resolver = await createUser();

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${randomUUID()}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "The issue was resolved." },
			});

			expect(res.statusCode).toBe(404);
		});

		it("422 — COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
			const owner = await createUser();
			const resolver = await createUser();
			const complaintId = await createComplaint(owner.id);
			await prisma.complaint.update({
				where: { id: complaintId },
				data: { status: "RESOLVED" },
			});

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "Should not be allowed." },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("COMPLAINT_CLOSED");
		});

		it("401 — missing authorization token", async () => {
			const owner = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "POST",
				url: `/v1/complaints/${complaintId}/resolutions`,
				payload: { description: "Unauthorized attempt." },
			});

			expect(res.statusCode).toBe(401);
		});
	});

	// ─── GET /v1/complaints/:id/resolutions ──────────────────────────────────

	describe("GET /v1/complaints/:id/resolutions", () => {
		it("200 — returns empty array when no resolutions exist", async () => {
			const owner = await createUser();
			const complaintId = await createComplaint(owner.id);

			const res = await app.inject({
				method: "GET",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(owner.id, owner.email)}` },
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
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
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

	// ─── PATCH /v1/complaints/:id/resolutions/:resolutionId ──────────────────

	describe("PATCH /v1/complaints/:id/resolutions/:resolutionId", () => {
		it("204 — updates own resolution description", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			const resolutionId = await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "PATCH",
				url: `/v1/complaints/${complaintId}/resolutions/${resolutionId}`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "Updated description." },
			});

			expect(res.statusCode).toBe(204);

			const inDb = await prisma.complaintResolution.findUnique({
				where: { id: resolutionId },
			});
			expect(inDb?.description).toBe("Updated description.");
		});

		it("404 — resolution does not exist", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);

			const res = await app.inject({
				method: "PATCH",
				url: `/v1/complaints/${complaintId}/resolutions/${randomUUID()}`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "Should not work." },
			});

			expect(res.statusCode).toBe(404);
			expect(res.json().code).toBe("RESOLUTION_NOT_FOUND");
		});

		it("404 — resolution belongs to another user (RESOLUTION_NOT_FOUND)", async () => {
			const owner = await createUser();
			const resolver = await createUser();
			const other = await createUser();
			const complaintId = await createComplaint(owner.id);
			const resolutionId = await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "PATCH",
				url: `/v1/complaints/${complaintId}/resolutions/${resolutionId}`,
				headers: { authorization: `Bearer ${bearerToken(other.id, other.email)}` },
				payload: { description: "Should not work." },
			});

			expect(res.statusCode).toBe(404);
			expect(res.json().code).toBe("RESOLUTION_NOT_FOUND");
		});

		it("422 — complaint is RESOLVED (COMPLAINT_CLOSED)", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			const resolutionId = await createResolution(resolver.id, complaintId);
			await prisma.complaint.update({
				where: { id: complaintId },
				data: { status: "RESOLVED" },
			});

			const res = await app.inject({
				method: "PATCH",
				url: `/v1/complaints/${complaintId}/resolutions/${resolutionId}`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
				payload: { description: "Should not work." },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("COMPLAINT_CLOSED");
		});

		it("401 — missing authorization token", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			const resolutionId = await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "PATCH",
				url: `/v1/complaints/${complaintId}/resolutions/${resolutionId}`,
				payload: { description: "Unauthorized." },
			});

			expect(res.statusCode).toBe(401);
		});
	});

	// ─── DELETE /v1/complaints/:id/resolutions ────────────────────────────────

	describe("DELETE /v1/complaints/:id/resolutions", () => {
		it("204 — deletes own resolution", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			const resolutionId = await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "DELETE",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
			});

			expect(res.statusCode).toBe(204);

			const inDb = await prisma.complaintResolution.findUnique({
				where: { id: resolutionId },
			});
			expect(inDb).toBeNull();
		});

		it("404 — user has no resolution (RESOLUTION_NOT_FOUND)", async () => {
			const owner = await createUser();
			const resolver = await createUser();
			const complaintId = await createComplaint(owner.id);
			await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "DELETE",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(owner.id, owner.email)}` },
			});

			expect(res.statusCode).toBe(404);
			expect(res.json().code).toBe("RESOLUTION_NOT_FOUND");
		});

		it("422 — complaint is RESOLVED (COMPLAINT_CLOSED)", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			await createResolution(resolver.id, complaintId);
			await prisma.complaint.update({
				where: { id: complaintId },
				data: { status: "RESOLVED" },
			});

			const res = await app.inject({
				method: "DELETE",
				url: `/v1/complaints/${complaintId}/resolutions`,
				headers: { authorization: `Bearer ${bearerToken(resolver.id, resolver.email)}` },
			});

			expect(res.statusCode).toBe(422);
			expect(res.json().code).toBe("COMPLAINT_CLOSED");
		});

		it("401 — missing authorization token", async () => {
			const resolver = await createUser();
			const complaintId = await createComplaint(resolver.id);
			await createResolution(resolver.id, complaintId);

			const res = await app.inject({
				method: "DELETE",
				url: `/v1/complaints/${complaintId}/resolutions`,
			});

			expect(res.statusCode).toBe(401);
		});
	});
});
