import { prisma } from "@/lib/prisma.js";

async function fetchComplaintVoteData(complaintId: string) {
	return prisma.complaint.findUnique({
		where: { id: complaintId },
		select: {
			id: true,
			status: true,
			user_id: true,
			votes: { select: { user_id: true, vote_type: true } },
		},
	});
}

function calculateWeights(
	votes: { user_id: string; vote_type: string }[],
	ownerId: string,
) {
	let positive = 0;
	let negative = 0;
	for (const vote of votes) {
		const weight = vote.user_id === ownerId ? 2 : 1;
		if (vote.vote_type === "RESOLVED") {
			positive += weight;
		} else {
			negative += weight;
		}
	}
	return { positive, negative };
}

export async function checkQuorumMet(complaintId: string): Promise<boolean> {
	const complaint = await fetchComplaintVoteData(complaintId);
	if (!complaint || complaint.status !== "OPEN") return false;
	const { positive, negative } = calculateWeights(
		complaint.votes,
		complaint.user_id,
	);
	return positive >= 5 + negative;
}

export async function applyQuorumResolution(
	complaintId: string,
): Promise<boolean> {
	const complaint = await fetchComplaintVoteData(complaintId);
	if (!complaint || complaint.status !== "OPEN") return false;
	const { positive, negative } = calculateWeights(
		complaint.votes,
		complaint.user_id,
	);
	if (positive >= 5 + negative) {
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { status: "RESOLVED" },
		});
		return true;
	}
	return false;
}
