import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { PrismaComplaintsRepository } from "@/modules/complaints/repositories/prisma/complaints-repository-prisma.js";
import { UpdateResolutionUseCase } from "./update-resolution-use-case.js";

describe("update-resolution-use-case", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, created_at) VALUES ($1, $2, NOW())`,
			userId,
			`update-res-test-${userId}@integration.test`,
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

	async function createResolution(
		resolverId: string,
		complaintId: string,
		description = "Descrição original",
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

	it("updates resolution description in the database", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new UpdateResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId);
		const resolutionId = await createResolution(resolverId, complaintId);

		await sut.execute({
			userId: resolverId,
			complaintId,
			resolutionId,
			description: "Descrição atualizada",
		});

		const inDb = await prisma.complaintResolution.findUnique({
			where: { id: resolutionId },
		});
		expect(inDb?.description).toBe("Descrição atualizada");
	});

	it("throws 404 when resolution belongs to another user", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new UpdateResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const otherUserId = await createUser();
		const complaintId = await createComplaint(ownerId);
		const resolutionId = await createResolution(resolverId, complaintId);

		await expect(
			sut.execute({
				userId: otherUserId,
				complaintId,
				resolutionId,
				description: "Tentativa indevida",
			}),
		).rejects.toThrow(
			expect.objectContaining({
				code: "RESOLUTION_NOT_FOUND",
				statusCode: 404,
			}),
		);

		const inDb = await prisma.complaintResolution.findUnique({
			where: { id: resolutionId },
		});
		expect(inDb?.description).toBe("Descrição original");
	});

	it("throws 422 when complaint is RESOLVED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new UpdateResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId, "RESOLVED");
		const resolutionId = await createResolution(resolverId, complaintId);

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId,
				resolutionId,
				description: "Tentativa em denúncia fechada",
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("throws 422 when complaint is CANCELED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new UpdateResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId, "CANCELED");
		const resolutionId = await createResolution(resolverId, complaintId);

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId,
				resolutionId,
				description: "Tentativa em denúncia cancelada",
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
