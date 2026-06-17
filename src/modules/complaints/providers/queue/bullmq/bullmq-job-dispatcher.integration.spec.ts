import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";
import { complaintsQuorumQueue } from "@/lib/queue/index.js";
import { BullMQJobDispatcher } from "./bullmq-job-dispatcher.js";

describe("bullmq-job-dispatcher", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`dispatcher-test-${userId}@integration.test`,
		);
		createdUserIds.push(userId);
		return userId;
	}

	async function createComplaint(ownerId: string, id = randomUUID()) {
		const c = await prisma.complaint.create({
			data: { id, user_id: ownerId, status: "OPEN", date: new Date(), geospatial: {} },
		});
		createdComplaintIds.push(c.id);
		return c;
	}

	async function addVote(
		complaintId: string,
		userId: string,
		voteType: "RESOLVED" | "NOT_RESOLVED",
	) {
		await prisma.complaintVote.create({
			data: { complaint_id: complaintId, user_id: userId, vote_type: voteType },
		});
	}

	afterEach(async () => {
		await complaintsQuorumQueue.drain(true);
		if (createdComplaintIds.length > 0) {
			await prisma.complaint.deleteMany({
				where: { id: { in: createdComplaintIds } },
			});
			createdComplaintIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("enqueues delayed job with 24h delay when quorum is met", async () => {
		const ownerId = await createUser();
		const complaint = await createComplaint(ownerId);
		const voter1 = await createUser();
		const voter2 = await createUser();
		const voter3 = await createUser();

		// positive = 5 → quorum met
		await addVote(complaint.id, ownerId, "RESOLVED"); // weight 2
		await addVote(complaint.id, voter1, "RESOLVED"); // weight 1
		await addVote(complaint.id, voter2, "RESOLVED"); // weight 1
		await addVote(complaint.id, voter3, "RESOLVED"); // weight 1

		const sut = new BullMQJobDispatcher();
		await sut.dispatchQuorumJob(complaint.id);

		const job = await complaintsQuorumQueue.getJob(`quorum-${complaint.id}`);
		expect(job).not.toBeNull();
		expect(job?.opts.delay).toBe(env.QUORUM_JOB_DELAY_MS);
		expect(job?.data.complaintId).toBe(complaint.id);
	});

	it("removes existing delayed job when quorum is no longer met", async () => {
		const ownerId = await createUser();
		const complaint = await createComplaint(ownerId);
		const voter1 = await createUser();

		// positive = 3 → quorum not met
		await addVote(complaint.id, ownerId, "RESOLVED"); // weight 2
		await addVote(complaint.id, voter1, "RESOLVED"); // weight 1

		// pre-add a job as if quorum was previously met
		await complaintsQuorumQueue.add(
			"resolve-by-quorum",
			{ complaintId: complaint.id },
			{ jobId: `quorum-${complaint.id}`, delay: env.QUORUM_JOB_DELAY_MS },
		);

		const before = await complaintsQuorumQueue.getJob(`quorum-${complaint.id}`);
		expect(before).not.toBeNull();

		const sut = new BullMQJobDispatcher();
		await sut.dispatchQuorumJob(complaint.id);

		const after = await complaintsQuorumQueue.getJob(`quorum-${complaint.id}`);
		expect(after).toBeUndefined();
	});

	it("does nothing when quorum is not met and no job exists", async () => {
		const ownerId = await createUser();
		const complaint = await createComplaint(ownerId);
		// no votes → quorum not met, no job in queue

		const sut = new BullMQJobDispatcher();
		await expect(sut.dispatchQuorumJob(complaint.id)).resolves.not.toThrow();

		const job = await complaintsQuorumQueue.getJob(`quorum-${complaint.id}`);
		expect(job).toBeUndefined();
	});
});
