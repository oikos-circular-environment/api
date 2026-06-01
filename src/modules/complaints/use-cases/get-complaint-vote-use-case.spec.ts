import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { GetComplaintVoteUseCase } from "./get-complaint-vote-use-case.js";
import { VoteComplaintUseCase } from "./vote-complaint-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

const geospatial: Geospatial = {
	heading: { trueHeading: 0, magHeading: 0, accuracy: 1 },
	location: {
		coords: { latitude: -23.55, longitude: -46.63, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
		timestamp: 1711111111111,
	},
	addresses: {
		city: "São Paulo", district: "Centro", street: "Rua A", streetNumber: "1",
		postalCode: "01000-000", region: "SP", country: "Brasil", name: null,
		isoCountryCode: "BR", subregion: null, timezone: null,
	},
};

async function makeComplaint(repo: InMemoryComplaintsRepository) {
	return new CreateComplaintUseCase(repo).execute({
		userId: USER_ID,
		data: { date: new Date(), type: "BURNING", observations: null, geospatial },
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
