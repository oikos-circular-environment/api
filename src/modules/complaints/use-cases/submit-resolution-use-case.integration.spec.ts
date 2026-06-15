import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { PrismaComplaintsRepository } from "@/modules/complaints/repositories/prisma/complaints-repository-prisma.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

const resolutionData = { description: "Prefeitura recolheu o lixo" };

describe("SubmitResolutionUseCase — integração com banco", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`submit-res-test-${userId}@integration.test`,
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

	it("cria resolução no banco ao submeter pela primeira vez", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: resolverId, complaintId, data: resolutionData });

		const inDb = await prisma.complaintResolution.findFirst({
			where: { complaint_id: complaintId, resolver_user_id: resolverId },
		});
		expect(inDb).not.toBeNull();
		expect(inDb?.description).toBe(resolutionData.description);
	});

	it("lança 422 RESOLUTION_ALREADY_EXISTS ao submeter resolução pessoal já existente", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: resolverId, complaintId, data: resolutionData });

		await expect(
			sut.execute({ userId: resolverId, complaintId, data: { description: "Segunda tentativa" } }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "RESOLUTION_ALREADY_EXISTS", statusCode: 422 }),
		);

		const resolutions = await prisma.complaintResolution.findMany({
			where: { complaint_id: complaintId, resolver_user_id: resolverId },
		});
		expect(resolutions).toHaveLength(1);
	});

	it("dois usuários distintos podem submeter resoluções pessoais na mesma denúncia", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverA = await createUser();
		const resolverB = await createUser();
		const complaintId = await createComplaint(ownerId);

		await sut.execute({ userId: resolverA, complaintId, data: resolutionData });
		await sut.execute({ userId: resolverB, complaintId, data: resolutionData });

		const resolutions = await prisma.complaintResolution.findMany({
			where: { complaint_id: complaintId },
		});
		expect(resolutions).toHaveLength(2);
	});

	it("lança 404 quando a denúncia não existe", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);
		const resolverId = await createUser();

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId: randomUUID(),
				data: resolutionData,
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("lança 422 COMPLAINT_CLOSED quando a denúncia está RESOLVED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId, "RESOLVED");

		await expect(
			sut.execute({ userId: resolverId, complaintId, data: resolutionData }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("lança 422 COMPLAINT_CLOSED quando a denúncia está CANCELED", async () => {
		const repo = new PrismaComplaintsRepository();
		const sut = new SubmitResolutionUseCase(repo);

		const ownerId = await createUser();
		const resolverId = await createUser();
		const complaintId = await createComplaint(ownerId, "CANCELED");

		await expect(
			sut.execute({ userId: resolverId, complaintId, data: resolutionData }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
