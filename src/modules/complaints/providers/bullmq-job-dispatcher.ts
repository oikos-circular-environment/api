import type { ComplaintsQuorumJobData } from '@/lib/queue/index.js';
import type { JobDispatcher } from './job-dispatcher.js';

export class BullMQJobDispatcher implements JobDispatcher {
	async dispatchQuorumJob(complaintId: string): Promise<void> {
		const { complaintsQuorumQueue } = await import('@/lib/queue/index.js');
		const data: ComplaintsQuorumJobData = { complaintId };
		await complaintsQuorumQueue.add('resolve-by-quorum', data);
	}
}
