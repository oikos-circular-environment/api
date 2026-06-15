import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";
import { UpdateResolutionUseCase } from "./update-resolution-use-case.js";

async function setup() {
	const ownerId = randomUUID();
	const resolverId = randomUUID();
	const repo = new InMemoryComplaintsRepository();

	const complaint = await new CreateComplaintUseCase(repo).execute({
		userId: ownerId,
		data: {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		},
	});

	await new SubmitResolutionUseCase(repo).execute({
		userId: resolverId,
		complaintId: complaint.id,
		data: { description: "Descrição original" },
	});

	const resolution = await repo.findResolutionByUserAndComplaint(
		resolverId,
		complaint.id,
	);

	return { repo, ownerId, resolverId, complaint, resolutionId: resolution!.id };
}

describe("update-resolution-use-case", () => {
	it("atualiza a descrição da resolução do próprio usuário", async () => {
		const { repo, resolverId, complaint, resolutionId } = await setup();
		const sut = new UpdateResolutionUseCase(repo);

		await sut.execute({
			userId: resolverId,
			complaintId: complaint.id,
			resolutionId,
			description: "Descrição atualizada",
		});

		const updated = repo.resolutions.find((r) => r.id === resolutionId);
		expect(updated?.description).toBe("Descrição atualizada");
	});

	it("lança 404 quando a resolução não existe", async () => {
		const { repo, resolverId, complaint } = await setup();
		const sut = new UpdateResolutionUseCase(repo);

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId: complaint.id,
				resolutionId: randomUUID(),
				description: "Nova descrição",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("lança 404 quando a resolução pertence a outro usuário", async () => {
		const { repo, complaint, resolutionId } = await setup();
		const sut = new UpdateResolutionUseCase(repo);
		const otherUserId = randomUUID();

		await expect(
			sut.execute({
				userId: otherUserId,
				complaintId: complaint.id,
				resolutionId,
				description: "Tentativa indevida",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("lança 404 quando a denúncia não existe", async () => {
		const { repo, resolverId, resolutionId } = await setup();
		const sut = new UpdateResolutionUseCase(repo);

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId: randomUUID(),
				resolutionId,
				description: "Nova descrição",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("lança 422 quando a denúncia está RESOLVED", async () => {
		const { repo, ownerId, resolverId, complaint, resolutionId } = await setup();
		const sut = new UpdateResolutionUseCase(repo);
		await repo.updateStatusByUserAndComplaintId(ownerId, complaint.id, "RESOLVED");

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId: complaint.id,
				resolutionId,
				description: "Tentativa em denúncia fechada",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("lança 422 quando a denúncia está CANCELED", async () => {
		const { repo, ownerId, resolverId, complaint, resolutionId } = await setup();
		const sut = new UpdateResolutionUseCase(repo);
		await repo.updateStatusByUserAndComplaintId(ownerId, complaint.id, "CANCELED");

		await expect(
			sut.execute({
				userId: resolverId,
				complaintId: complaint.id,
				resolutionId,
				description: "Tentativa em denúncia cancelada",
			}),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
