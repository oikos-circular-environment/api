import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { complaintsQuorumQueue } from "@/lib/queue/index.js";
import { createResolveByQuorumWorker } from "./resolve-by-quorum-worker.js";

describe("resolve-by-quorum-worker", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];
	let worker: ReturnType<typeof createResolveByQuorumWorker>;

	async function createUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			`worker-test-${userId}@integration.test`,
		);
		createdUserIds.push(userId);
		return userId;
	}

	async function createComplaint(ownerId: string) {
		const c = await prisma.complaint.create({
			data: {
				id: randomUUID(),
				user_id: ownerId,
				status: "OPEN",
				date: new Date(),
				geospatial: {},
			},
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

	beforeEach(async () => {
		await complaintsQuorumQueue.drain(true);
		worker = createResolveByQuorumWorker();
		worker.on("error", (err) => console.error("[worker error]", err));
		worker.on("failed", (job, err) =>
			console.error("[worker failed]", job?.id, err),
		);
		await worker.waitUntilReady();
	});

	afterEach(async () => {
		await worker.close();
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

	it(
		"resolves complaint after job is processed with quorum met",
		{ timeout: 35_000 },
		async () => {
			const ownerId = await createUser();
			const complaint = await createComplaint(ownerId);
			const voter1 = await createUser();
			const voter2 = await createUser();
			const voter3 = await createUser();

			// positive = 5 (owner=2 + 3×1), negative = 0 → 5 >= 5 ✓
			await addVote(complaint.id, ownerId, "RESOLVED"); // weight 2
			await addVote(complaint.id, voter1, "RESOLVED"); // weight 1
			await addVote(complaint.id, voter2, "RESOLVED"); // weight 1
			await addVote(complaint.id, voter3, "RESOLVED"); // weight 1

			// Register listener BEFORE adding job to avoid race between add and listener setup
			const jobDone = new Promise<void>((resolve) => {
				worker.once("completed", () => resolve());
				worker.once("failed", () => resolve());
			});

			await complaintsQuorumQueue.add("resolve-by-quorum", {
				complaintId: complaint.id,
			});

			await jobDone;

			const row = await prisma.complaint.findUnique({
				where: { id: complaint.id },
			});
			expect(row?.status).toBe("RESOLVED");
		},
	);

	it(
		"leaves complaint OPEN when job is processed but quorum is not met",
		{ timeout: 35_000 },
		async () => {
			const ownerId = await createUser();
			const complaint = await createComplaint(ownerId);
			const voter1 = await createUser();

			// positive = 3 (owner=2 + 1×1), negative = 0 → 3 < 5 ✗
			await addVote(complaint.id, ownerId, "RESOLVED"); // weight 2
			await addVote(complaint.id, voter1, "RESOLVED"); // weight 1

			// Register listener BEFORE adding job
			const jobDone = new Promise<void>((resolve) => {
				worker.once("completed", () => resolve());
				worker.once("failed", () => resolve());
			});

			await complaintsQuorumQueue.add("resolve-by-quorum", {
				complaintId: complaint.id,
			});

			await jobDone;

			const row = await prisma.complaint.findUnique({
				where: { id: complaint.id },
			});
			expect(row?.status).toBe("OPEN");
		},
	);
});
