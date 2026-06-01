export interface JobDispatcher {
	dispatchQuorumJob(complaintId: string): Promise<void>;
}
