import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("vote-complaint", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(
		email?: string,
	): Promise<{ id: string; email: string }> {
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

	it("POST 200 — registers RESOLVED vote and returns vote object", async () => {
		const owner = await createUser();
		const voter = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/votes`,
			headers: {
				authorization: `Bearer ${bearerToken(voter.id, voter.email)}`,
			},
			payload: { vote_type: "RESOLVED" },
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.vote.vote_type).toBe("RESOLVED");
		expect(body.vote.complaint_id).toBe(complaintId);
		expect(body.vote.user_id).toBe(voter.id);
	});

	it("POST 200 — second vote from same user is upsert (single DB record)", async () => {
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

	it("POST 404 — complaint does not exist", async () => {
		const voter = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${randomUUID()}/votes`,
			headers: {
				authorization: `Bearer ${bearerToken(voter.id, voter.email)}`,
			},
			payload: { vote_type: "RESOLVED" },
		});

		expect(res.statusCode).toBe(404);
	});

	it("POST 422 — COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
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
			headers: {
				authorization: `Bearer ${bearerToken(voter.id, voter.email)}`,
			},
			payload: { vote_type: "RESOLVED" },
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("COMPLAINT_CLOSED");
	});

	it("POST 422 — COMPLAINT_CLOSED when complaint is CANCELED", async () => {
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
			headers: {
				authorization: `Bearer ${bearerToken(voter.id, voter.email)}`,
			},
			payload: { vote_type: "NOT_RESOLVED" },
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("COMPLAINT_CLOSED");
	});

	it("POST 400 — invalid vote_type rejected by schema", async () => {
		const owner = await createUser();
		const voter = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/votes`,
			headers: {
				authorization: `Bearer ${bearerToken(voter.id, voter.email)}`,
			},
			payload: { vote_type: "INVALID_VALUE" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("POST 401 — missing authorization token", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/votes`,
			payload: { vote_type: "RESOLVED" },
		});

		expect(res.statusCode).toBe(401);
	});

	// ─── GET /v1/complaints/:id/votes ────────────────────────────────────────

	it("GET 200 — returns current user vote (or null when no vote)", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}/votes`,
			headers: {
				authorization: `Bearer ${bearerToken(owner.id, owner.email)}`,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveProperty("vote");
		expect(res.json().vote).toBeNull();
	});

	it("GET 200 — returns vote after casting one", async () => {
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
			method: "GET",
			url: `/v1/complaints/${complaintId}/votes`,
			headers: { authorization: `Bearer ${token}` },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json().vote.vote_type).toBe("RESOLVED");
		expect(res.json().vote.complaint_id).toBe(complaintId);
		expect(res.json().vote.user_id).toBe(voter.id);
	});

	it("GET 401 — missing authorization token", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/${complaintId}/votes`,
		});

		expect(res.statusCode).toBe(401);
	});

	// ─── DELETE /v1/complaints/:id/votes ─────────────────────────────────────

	it("DELETE 204 — removes user vote", async () => {
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
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/votes`,
			headers: { authorization: `Bearer ${token}` },
		});

		expect(res.statusCode).toBe(204);

		const vote = await prisma.complaintVote.findFirst({
			where: { complaint_id: complaintId, user_id: voter.id },
		});
		expect(vote).toBeNull();
	});

	it("DELETE 401 — missing authorization token", async () => {
		const owner = await createUser();
		const complaintId = await createComplaint(owner.id);

		const res = await app.inject({
			method: "DELETE",
			url: `/v1/complaints/${complaintId}/votes`,
		});

		expect(res.statusCode).toBe(401);
	});
});
