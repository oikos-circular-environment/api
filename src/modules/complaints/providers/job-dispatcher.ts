export interface JobDispatcher {
	dispatchGroupingJob(complaintId: string): Promise<void>;
	dispatchQuorumJob(complaintId: string): Promise<void>;
}
