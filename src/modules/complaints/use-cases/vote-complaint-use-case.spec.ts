import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

describe("vote-complaint-use-case", () => {
	it("registers a vote and returns it with correct vote_type", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		const vote = await sut.execute({
			userId: OTHER_USER_ID,
			complaintId: complaint.id,
			voteType: "RESOLVED",
		});

		expect(vote.vote_type).toBe("RESOLVED");
		expect(vote.complaint_id).toBe(complaint.id);
		expect(vote.user_id).toBe(OTHER_USER_ID);
	});

	it("throws 404 when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: USER_ID,
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				voteType: "RESOLVED",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(404);
			expect(thrownError.code).toBe("COMPLAINT_NOT_FOUND");
		}
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(USER_ID, complaint.id, "RESOLVED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(422);
			expect(thrownError.code).toBe("COMPLAINT_CLOSED");
		}
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is CANCELED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(USER_ID, complaint.id, "CANCELED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(422);
			expect(thrownError.code).toBe("COMPLAINT_CLOSED");
		}
	});

	it("second vote from same user updates vote (upsert), does not create two", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });
		const secondVote = await sut.execute({
			userId: OTHER_USER_ID,
			complaintId: complaint.id,
			voteType: "NOT_RESOLVED",
		});

		const userVotes = complaintsRepository.votes.filter(
			(v) => v.complaint_id === complaint.id && v.user_id === OTHER_USER_ID,
		);

		expect(userVotes).toHaveLength(1);
		expect(secondVote.vote_type).toBe("NOT_RESOLVED");
	});

	it("calls job dispatcher with the complaint id", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const dispatchQuorumJob = vi.fn().mockResolvedValue(undefined);
		const jobDispatcher = { dispatchGroupingJob: vi.fn(), dispatchQuorumJob };
		const sut = new VoteComplaintUseCase(complaintsRepository, jobDispatcher);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		await sut.execute({ userId: OTHER_USER_ID, complaintId: complaint.id, voteType: "RESOLVED" });

		expect(dispatchQuorumJob).toHaveBeenCalledWith(complaint.id);
	});
});
