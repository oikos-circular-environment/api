import { describe, expect, it } from "vitest";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { GetComplaintVoteUseCase } from "./get-complaint-vote-use-case.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

async function makeComplaint(repo: InMemoryComplaintsRepository) {
	return new CreateComplaintUseCase(repo).execute({
		userId: USER_ID,
		data: { date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
	});
}

describe("get-complaint-vote-use-case", () => {
	it("returns null when user has not voted", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo);
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id });

		expect(result).toBeNull();
	});

	it("returns the vote when user has voted RESOLVED", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo);
		await new VoteComplaintUseCase(repo).execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id });

		expect(result).not.toBeNull();
		expect(result?.vote_type).toBe("RESOLVED");
		expect(result?.complaint_id).toBe(complaint.id);
		expect(result?.user_id).toBe(OTHER_USER_ID);
	});

	it("reflects the updated vote after the user changes their vote", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo);
		const voteUseCase = new VoteComplaintUseCase(repo);
		await voteUseCase.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		await voteUseCase.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "NOT_RESOLVED" });
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id });

		expect(result?.vote_type).toBe("NOT_RESOLVED");
	});

	it("returns null after the user removes their vote", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await makeComplaint(repo);
		await new VoteComplaintUseCase(repo).execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		await repo.removeVoteFromComplaint(OTHER_USER_ID, complaint.id);
		const sut = new GetComplaintVoteUseCase(repo);

		const result = await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id });

		expect(result).toBeNull();
	});
});
