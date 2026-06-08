import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

describe("vote-complaint-use-case", () => {
	it("registers a vote and returns it with correct vote_type", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			userId,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		const vote = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "RESOLVED",
		});

		expect(vote.vote_type).toBe("RESOLVED");
		expect(vote.complaint_id).toBe(complaint.id);
		expect(vote.user_id).toBe(otherUserId);
	});

	it("throws 404 when complaint does not exist", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId,
				complaintId: randomUUID(),
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
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			userId,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(userId, complaint.id, "RESOLVED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: otherUserId, complaintId: complaint.id, voteType: "RESOLVED" });
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
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			userId,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(userId, complaint.id, "CANCELED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: otherUserId, complaintId: complaint.id, voteType: "RESOLVED" });
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
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new VoteComplaintUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			userId,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		await sut.execute({ userId: otherUserId, complaintId: complaint.id, voteType: "RESOLVED" });
		const secondVote = await sut.execute({
			userId: otherUserId,
			complaintId: complaint.id,
			voteType: "NOT_RESOLVED",
		});

		const userVotes = complaintsRepository.votes.filter(
			(v) => v.complaint_id === complaint.id && v.user_id === otherUserId,
		);

		expect(userVotes).toHaveLength(1);
		expect(secondVote.vote_type).toBe("NOT_RESOLVED");
	});

	it("calls job dispatcher with the complaint id", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const dispatchQuorumJob = vi.fn().mockResolvedValue(undefined);
		const jobDispatcher = { dispatchGroupingJob: vi.fn(), dispatchQuorumJob };
		const sut = new VoteComplaintUseCase(complaintsRepository, jobDispatcher);

		const complaint = await complaintsRepository.createForUser(
			userId,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeGeospatial() },
		);

		await sut.execute({ userId: otherUserId, complaintId: complaint.id, voteType: "RESOLVED" });

		expect(dispatchQuorumJob).toHaveBeenCalledWith(complaint.id);
	});
});
