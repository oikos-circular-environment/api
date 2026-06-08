import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { GetComplaintVoteUseCase } from "./get-complaint-vote-use-case.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

async function makeComplaint(
	repo: InMemoryComplaintsRepository,
	userId: string,
) {
	return new CreateComplaintUseCase(repo).execute({
		userId,
		data: {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		},
	});
}

describe("get-complaint-vote-use-case", () => {
	it("returns null when user has not voted", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo, userId);
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
		});

		expect(result).toBeNull();
	});

	it("returns the vote when user has voted RESOLVED", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo, userId);
		await new VoteComplaintUseCase(repo).execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "RESOLVED",
		});
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
		});

		expect(result).not.toBeNull();
		expect(result?.vote_type).toBe("RESOLVED");
		expect(result?.complaint_id).toBe(complaint.id);
		expect(result?.user_id).toBe(otherUserId);
	});

	it("reflects the updated vote after the user changes their vote", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo, userId);
		const voteUseCase = new VoteComplaintUseCase(repo);
		await voteUseCase.execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "RESOLVED",
		});
		await voteUseCase.execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "NOT_RESOLVED",
		});
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
		});

		expect(result?.vote_type).toBe("NOT_RESOLVED");
	});

	it("returns null after the user removes their vote", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo, userId);
		await new VoteComplaintUseCase(repo).execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "RESOLVED",
		});
		await repo.removeVoteFromComplaint(otherUserId, complaint.id);
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
		});

		expect(result).toBeNull();
	});
});
