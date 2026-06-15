import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { PrismaComplaintsRepository } from "@/modules/complaints/repositories/prisma/complaints-repository-prisma.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

describe("VoteComplaintUseCase — integração com banco", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`vote-test-${userId}@integration.test`,
		);
		createdUserIds.push(userId);
		return userId;
	}

	async function createComplaint(
		ownerId: string,
		status: "OPEN" | "RESOLVED" | "CANCELED" = "OPEN",
	): Promise<string> {
		const complaint = await prisma.complaint.create({
			data: {
				user_id: ownerId,
				status,
				date: new Date(),
				geospatial: makeGeospatial() as object,
			},
		});
		createdComplaintIds.push(complaint.id);
		return complaint.id;
	}

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

	it("persiste o voto no banco e retorna com vote_type correto", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new VoteComplaintUseCase(repo);

		const ownerId = await createUser();
		const voterId = await createUser();
		const complaintId = await createComplaint(ownerId);

		const vote = await sut.execute({
			userId: voterId,
			complaintId,
			voteType: "RESOLVED",
		});

		expect(vote.vote_type).toBe("RESOLVED");
		expect(vote.complaint_id).toBe(complaintId);
		expect(vote.user_id).toBe(voterId);

		const inDb = await prisma.complaintVote.findUnique({
			where: {
				complaint_id_user_id: { complaint_id: complaintId, user_id: voterId },
			},
		});
		expect(inDb).not.toBeNull();
		expect(inDb?.vote_type).toBe("RESOLVED");
	});

	it("segundo voto do mesmo usuário atualiza o existente (upsert)", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new VoteComplaintUseCase(repo);

		const ownerId = await createUser();
		const voterId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: voterId, complaintId, voteType: "RESOLVED" });
		const updated = await sut.execute({
			userId: voterId,
			complaintId,
			voteType: "NOT_RESOLVED",
		});

		expect(updated.vote_type).toBe("NOT_RESOLVED");

		const votes = await prisma.complaintVote.findMany({
			where: { complaint_id: complaintId, user_id: voterId },
		});
		expect(votes).toHaveLength(1);
		expect(votes[0].vote_type).toBe("NOT_RESOLVED");
	});

	it("lança 404 quando a denúncia não existe", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new VoteComplaintUseCase(repo);
		const voterId = await createUser();

		await expect(
			sut.execute({
				userId: voterId,
				complaintId: randomUUID(),
				voteType: "RESOLVED",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("lança 422 COMPLAINT_CLOSED quando a denúncia está RESOLVED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new VoteComplaintUseCase(repo);

		const ownerId = await createUser();
		const voterId = await createUser();
		const complaintId = await createComplaint(ownerId, "RESOLVED");

		await expect(
			sut.execute({ userId: voterId, complaintId, voteType: "RESOLVED" }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("lança 422 COMPLAINT_CLOSED quando a denúncia está CANCELED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new VoteComplaintUseCase(repo);

		const ownerId = await createUser();
		const voterId = await createUser();
		const complaintId = await createComplaint(ownerId, "CANCELED");

		await expect(
			sut.execute({ userId: voterId, complaintId, voteType: "NOT_RESOLVED" }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
