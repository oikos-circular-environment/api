import { prisma } from "@/lib/prisma.js";

export async function applyQuorumResolution(
	complaintId: string,
): Promise<boolean> {
	const complaint = await prisma.complaint.findUnique({
		where: { id: complaintId },
		select: {
			id: true,
			status: true,
			user_id: true,
			votes: { select: { user_id: true, vote_type: true } },
		},
	});

	if (!complaint || complaint.status !== "OPEN") return false;

	let positiveWeight = 0;
	let negativeWeight = 0;

	for (const vote of complaint.votes) {
		const weight = vote.user_id === complaint.user_id ? 2 : 1;
		if (vote.vote_type === "RESOLVED") {
			positiveWeight += weight;
		} else {
			negativeWeight += weight;
		}
	}

	// Regra: positivos >= 5 + negativos
	if (positiveWeight >= 5 + negativeWeight) {
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { status: "RESOLVED" },
		});
		return true;
	}
	return false;
}
