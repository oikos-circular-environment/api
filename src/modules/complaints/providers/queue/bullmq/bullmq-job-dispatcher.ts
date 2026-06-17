import { env } from "@/env/index.js";
import type { JobDispatcher } from "../job-dispatcher.js";

const quorumJobId = (complaintId: string) => `quorum-${complaintId}`;

export class BullMQJobDispatcher implements JobDispatcher {
	async dispatchQuorumJob(complaintId: string): Promise<void> {
		const { complaintsQuorumQueue } = await import("@/lib/queue/index.js");
		const { checkQuorumMet } = await import("../../../workers/quorum-logic.js");

		const jobId = quorumJobId(complaintId);
		const met = await checkQuorumMet(complaintId);

		if (met) {
			await complaintsQuorumQueue.add(
				"resolve-by-quorum",
				{ complaintId },
				{ jobId, delay: env.QUORUM_JOB_DELAY_MS },
			);
		} else {
			const existing = await complaintsQuorumQueue.getJob(jobId);
			if (existing) await existing.remove();
		}
	}
}
