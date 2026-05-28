import { Worker } from "bullmq";
import type { ComplaintsQuorumJobData } from "@/lib/queue/jobs.js";
import { getRedisUrl } from "@/lib/queue/redis.js";
import { applyQuorumResolution } from "./quorum-logic.js";

export function createResolveByQuorumWorker() {
	return new Worker<ComplaintsQuorumJobData>(
		"complaints-quorum",
		async (job) => {
			const { complaintId } = job.data;
			await applyQuorumResolution(complaintId);
		},
		{ connection: { url: getRedisUrl(), maxRetriesPerRequest: null } },
	);
}
