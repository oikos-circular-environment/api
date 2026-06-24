import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { accountDeletionQueue } from "@/lib/queue/index.js";
import { createAccountDeletionWorker } from "./account-deletion-worker.js";

describe("account-deletion-worker", () => {
	const createdUserIds: string[] = [];
	let worker: ReturnType<typeof createAccountDeletionWorker>;

	async function createUser(
		overrides?: Partial<{ deleted_at: Date; deletion_job_id: string }>,
	): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at, deleted_at, deletion_job_id)
			 VALUES ($1, $2, 'hashed', NOW(), $3, $4)`,
			userId,
			`deletion-test-${userId}@integration.test`,
			overrides?.deleted_at ?? null,
			overrides?.deletion_job_id ?? null,
		);
		createdUserIds.push(userId);
		return userId;
	}

	async function createProfile(
		userId: string,
		opts?: { withImage?: boolean; withAddress?: boolean },
	) {
		let addressId: string | null = null;
		if (opts?.withAddress) {
			const address = await prisma.address.create({
				data: {
					zip_code: "78700000",
					street: "Rua Teste",
					number: "100",
					district: "Centro",
					city_ibge_id: 5108600,
					city: "Rondonópolis",
					state_ibge_id: 51,
					state: "Mato Grosso",
					state_code: "MT",
					latitude: -16.47,
					longitude: -54.64,
				},
			});
			addressId = address.id;
		}

		let profileImageId: string | null = null;
		if (opts?.withImage) {
			const img = await prisma.profileImage.create({
				data: {
					url: "http://storage/profiles/test.jpg",
					file_name: "test.jpg",
					path: "profiles/test.jpg",
				},
			});
			profileImageId = img.id;
		}

		return prisma.profile.create({
			data: {
				full_name: "Test User",
				display_name: "test",
				phone: "66999990000",
				user_id: userId,
				address_id: addressId,
				profile_image_id: profileImageId,
			},
		});
	}

	async function createCompany(
		userId: string,
		opts?: { withAvatar?: boolean; withAddress?: boolean },
	) {
		let addressId: string | null = null;
		if (opts?.withAddress) {
			const address = await prisma.address.create({
				data: {
					zip_code: "78700001",
					street: "Rua Empresa",
					number: "200",
					district: "Industrial",
					city_ibge_id: 5108600,
					city: "Rondonópolis",
					state_ibge_id: 51,
					state: "Mato Grosso",
					state_code: "MT",
					latitude: -16.48,
					longitude: -54.65,
				},
			});
			addressId = address.id;
		}

		let avatarId: string | null = null;
		if (opts?.withAvatar) {
			const avatar = await prisma.companyAvatar.create({
				data: {
					url: "http://storage/companies/avatar.jpg",
					file_name: "avatar.jpg",
					path: "companies/avatar.jpg",
				},
			});
			avatarId = avatar.id;
		}

		return prisma.company.create({
			data: {
				identity: randomUUID().slice(0, 14),
				identity_type: "CNPJ",
				company_type: "COLLECTOR",
				business_name: "Test Company",
				corporate_name: "Test Corp",
				phones: ["66999990001"],
				started_activity_in: new Date(),
				user_id: userId,
				address_id: addressId,
				avatar_id: avatarId,
			},
		});
	}

	async function createComplaintWithAttachment(userId: string) {
		const complaint = await prisma.complaint.create({
			data: {
				user_id: userId,
				status: "OPEN",
				date: new Date(),
				geospatial: {},
			},
		});

		await prisma.complaintAttachment.create({
			data: {
				complaint_id: complaint.id,
				url: "http://storage/complaints/photo.jpg",
				file_name: "photo.jpg",
				path: "complaints/photo.jpg",
				base64: "data:image/jpeg;base64,dGVzdA==",
				type: "PHOTO",
			},
		});

		return complaint;
	}

	beforeEach(async () => {
		await accountDeletionQueue.drain(true);
		worker = createAccountDeletionWorker();
		worker.on("error", (err) => console.error("[worker error]", err));
		worker.on("failed", (job, err) =>
			console.error("[worker failed]", job?.id, err),
		);
		await worker.waitUntilReady();
	});

	afterEach(async () => {
		await worker.close();

		for (const userId of createdUserIds) {
			const exists = await prisma.user.findUnique({
				where: { id: userId },
			});
			if (exists) {
				await prisma.$executeRawUnsafe(
					"DELETE FROM users WHERE id = $1",
					userId,
				);
			}
		}
		createdUserIds.length = 0;
	});

	it(
		"deletes user, cascaded data, orphaned records, and skips when guard fails",
		{ timeout: 35_000 },
		async () => {
			// --- Setup: user with full data tree ---
			const userId = await createUser({
				deleted_at: new Date(),
				deletion_job_id: `account-deletion-${randomUUID()}`,
			});

			const profile = await createProfile(userId, {
				withImage: true,
				withAddress: true,
			});
			const company = await createCompany(userId, {
				withAvatar: true,
				withAddress: true,
			});
			await createComplaintWithAttachment(userId);

			const profileImageId = profile.profile_image_id as string;
			const profileAddressId = profile.address_id as string;
			const companyAvatarId = company.avatar_id as string;
			const companyAddressId = company.address_id as string;

			// --- Also setup: user without deleted_at (should be skipped) ---
			const activeUserId = await createUser();

			// --- Also setup: non-existent user ID (should be skipped) ---
			const ghostUserId = randomUUID();

			// --- Process all 3 jobs sequentially ---
			const jobs = [
				{ userId },
				{ userId: ghostUserId },
				{ userId: activeUserId },
			];

			let completedCount = 0;
			const allDone = new Promise<void>((resolve) => {
				const handler = () => {
					completedCount++;
					if (completedCount >= jobs.length) {
						worker.off("completed", handler);
						worker.off("failed", handler);
						resolve();
					}
				};
				worker.on("completed", handler);
				worker.on("failed", handler);
			});

			for (const data of jobs) {
				await accountDeletionQueue.add("delete-account", data);
			}

			await allDone;

			// --- Assert: deleted user is gone ---
			const deletedUser = await prisma.user.findUnique({
				where: { id: userId },
			});
			expect(deletedUser).toBeNull();

			// --- Assert: orphaned records cleaned up ---
			expect(
				await prisma.profileImage.findUnique({
					where: { id: profileImageId },
				}),
			).toBeNull();

			expect(
				await prisma.companyAvatar.findUnique({
					where: { id: companyAvatarId },
				}),
			).toBeNull();

			expect(
				await prisma.address.findUnique({
					where: { id: profileAddressId },
				}),
			).toBeNull();

			expect(
				await prisma.address.findUnique({
					where: { id: companyAddressId },
				}),
			).toBeNull();

			// --- Assert: active user still exists (deleted_at was null) ---
			const activeUser = await prisma.user.findUnique({
				where: { id: activeUserId },
			});
			expect(activeUser).not.toBeNull();

			// Remove deleted user from tracking
			createdUserIds.splice(createdUserIds.indexOf(userId), 1);
		},
	);
});
