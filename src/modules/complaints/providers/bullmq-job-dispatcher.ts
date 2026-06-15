import type { JobDispatcher } from "./job-dispatcher.js";

const DELAY_24H = 24 * 60 * 60 * 1000;
const quorumJobId = (complaintId: string) => `quorum-${complaintId}`;

export class BullMQJobDispatcher implements JobDispatcher {
	async dispatchQuorumJob(complaintId: string): Promise<void> {
		const { complaintsQuorumQueue } = await import("@/lib/queue/index.js");
		const { checkQuorumMet } = await import("../workers/quorum-logic.js");

		const jobId = quorumJobId(complaintId);
		const met = await checkQuorumMet(complaintId);

		if (met) {
			await complaintsQuorumQueue.add(
				"resolve-by-quorum",
				{ complaintId },
				{ jobId, delay: DELAY_24H },
			);
		} else {
			const existing = await complaintsQuorumQueue.getJob(jobId);
			if (existing) await existing.remove();
		}
	}
}
