import { Worker } from "bullmq";
import { env } from "@/env/index.js";
import type { ComplaintsQuorumJobData } from "@/lib/queue/jobs.js";
import { getRedisUrl } from "@/lib/queue/redis.js";
import { applyQuorumResolution } from "./quorum-logic.js";

export function createResolveByQuorumWorker() {
	return new Worker<ComplaintsQuorumJobData>(
		"complaints-quorum",
		async (job) => {
			const { complaintId } = job.data;

			await job.log(`Starting quorum check for complaint ${complaintId}`);
			await job.updateProgress(10);

			const resolved = await applyQuorumResolution(complaintId);
			await job.updateProgress(100);

			await job.log(
				resolved
					? `Complaint ${complaintId} resolved by quorum`
					: `Quorum not met for complaint ${complaintId}`,
			);

			return { complaintId, resolved };
		},
		{
			connection: { url: getRedisUrl(), maxRetriesPerRequest: null },
			concurrency: env.WORKER_CONCURRENCY,
		},
	);
}
