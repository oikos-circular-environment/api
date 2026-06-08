import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { DeleteResolutionUseCase } from "./delete-resolution-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("delete-resolution-use-case", () => {
	it("deletes the user's own resolution", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({ userId: USER_B, complaintId: complaint.id });

		expect(repo.resolutions).toHaveLength(0);
	});

	it("throws 404 when complaint does not exist", async () => {
		const repo = new InMemoryComplaintsRepository();
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: USER_A, complaintId: "non-existent-id" }),
		).rejects.toThrow(AppError);
	});

	it("throws 404 when user has no resolution on the complaint", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id }),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }));
	});

	it("throws 422 when complaint is RESOLVED", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		await repo.updateStatusByUserAndComplaintId(USER_A, complaint.id, "RESOLVED");
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id }),
		).rejects.toThrowError(expect.objectContaining({ code: "COMPLAINT_CLOSED" }));
	});

	it("throws 422 when complaint is CANCELED", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		await repo.updateStatusByUserAndComplaintId(USER_A, complaint.id, "CANCELED");
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id }),
		).rejects.toThrowError(expect.objectContaining({ code: "COMPLAINT_CLOSED" }));
	});

	it("cascades deletion to resolution attachments", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const resolution = await repo.findResolutionByUserAndComplaint(USER_B, complaint.id);
		await repo.addResolutionAttachment(USER_B, resolution!.id, {
			url: "https://img.com/a.jpg", file_name: "a.jpg", path: "p/a.jpg", base64: "b64",
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({ userId: USER_B, complaintId: complaint.id });

		expect(repo.resolutions).toHaveLength(0);
		expect(repo.resolutionAttachments).toHaveLength(0);
	});
});
