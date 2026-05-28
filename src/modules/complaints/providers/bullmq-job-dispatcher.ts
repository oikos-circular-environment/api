import type { ComplaintsGroupingJobData, ComplaintsQuorumJobData } from '@/lib/queue/index.js';
import type { JobDispatcher } from './job-dispatcher.js';

export class BullMQJobDispatcher implements JobDispatcher {
	async dispatchGroupingJob(complaintId: string): Promise<void> {
		// Dynamic import to avoid evaluating the queue at module import time
		const { complaintsGroupingQueue } = await import('@/lib/queue/index.js');
		const data: ComplaintsGroupingJobData = { complaintId };
		await complaintsGroupingQueue.add('group-complaints', data);
	}

	async dispatchQuorumJob(complaintId: string): Promise<void> {
		const { complaintsQuorumQueue } = await import('@/lib/queue/index.js');
		const data: ComplaintsQuorumJobData = { complaintId };
		await complaintsQuorumQueue.add('resolve-by-quorum', data);
	}
}
