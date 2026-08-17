import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { PrismaComplaintsRepository } from "@/modules/complaints/repositories/prisma/complaints-repository-prisma.js";
import { ResolveComplaintUseCase } from "./resolve-complaint-use-case.js";

const resolution = { description: "Problema resolvido pela prefeitura" };

describe("resolve-complaint-use-case", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`resolve-test-${userId}@integration.test`,
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

	it("persists resolution and RESOLVED vote in the database", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new ResolveComplaintUseCase(repo);

		const ownerId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: ownerId, complaintId, resolution });

		const resolutionInDb = await prisma.complaintResolution.findFirst({
			where: { complaint_id: complaintId, resolver_user_id: ownerId },
		});
		expect(resolutionInDb).not.toBeNull();
		expect(resolutionInDb?.description).toBe(resolution.description);

		const voteInDb = await prisma.complaintVote.findUnique({
			where: {
				complaint_id_user_id: { complaint_id: complaintId, user_id: ownerId },
			},
		});
		expect(voteInDb).not.toBeNull();
		expect(voteInDb?.vote_type).toBe("RESOLVED");
	});

	it("updates existing resolution instead of creating a duplicate", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new ResolveComplaintUseCase(repo);

		const ownerId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: ownerId, complaintId, resolution });
		await sut.execute({
			userId: ownerId,
			complaintId,
			resolution: { description: "Descrição atualizada" },
		});

		const resolutions = await prisma.complaintResolution.findMany({
			where: { complaint_id: complaintId, resolver_user_id: ownerId },
		});
		expect(resolutions).toHaveLength(1);
		expect(resolutions[0].description).toBe("Descrição atualizada");
	});

	it("throws 404 when complaint does not belong to user", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new ResolveComplaintUseCase(repo);

		const ownerId = await createUser();
		const otherUserId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await expect(
			sut.execute({ userId: otherUserId, complaintId, resolution }),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new ResolveComplaintUseCase(repo);

		const ownerId = await createUser();
		const complaintId = await createComplaint(ownerId, "RESOLVED");

		await expect(
			sut.execute({ userId: ownerId, complaintId, resolution }),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is CANCELED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new ResolveComplaintUseCase(repo);

		const ownerId = await createUser();
		const complaintId = await createComplaint(ownerId, "CANCELED");

		await expect(
			sut.execute({ userId: ownerId, complaintId, resolution }),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
