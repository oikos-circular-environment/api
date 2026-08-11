import { prisma } from "@/lib/prisma.js";
import { makeStorageProvider } from "@/shared/providers/storage/make-storage-provider.js";

export async function executeAccountDeletion(userId: string): Promise<boolean> {
	const user = await prisma.user.findUnique({ where: { id: userId } });

	if (!user?.deleted_at) return false;

	const storagePaths = await collectStoragePaths(userId);
	const orphanIds = await collectOrphanIds(userId);

	await prisma.user.delete({ where: { id: userId } });

	await deleteOrphanRecords(orphanIds);
	await deleteStorageFiles(storagePaths);

	return true;
}

async function collectStoragePaths(userId: string): Promise<string[]> {
	const paths: string[] = [];

	const profiles = await prisma.profile.findMany({
		where: { user_id: userId },
		select: { profile_image: { select: { path: true } } },
	});
	for (const p of profiles) {
		if (p.profile_image?.path) paths.push(p.profile_image.path);
	}

	const companies = await prisma.company.findMany({
		where: { user_id: userId },
		select: { avatar: { select: { path: true } } },
	});
	for (const c of companies) {
		if (c.avatar?.path) paths.push(c.avatar.path);
	}

	const complaintAttachments = await prisma.complaintAttachment.findMany({
		where: { complaint: { user_id: userId } },
		select: { path: true },
	});
	for (const a of complaintAttachments) {
		if (a.path) paths.push(a.path);
	}

	const resolutionAttachments =
		await prisma.complaintResolutionAttachment.findMany({
			where: { resolution: { resolver_user_id: userId } },
			select: { path: true },
		});
	for (const a of resolutionAttachments) {
		if (a.path) paths.push(a.path);
	}

	return paths;
}

interface OrphanIds {
	profileImageIds: string[];
	companyAvatarIds: string[];
	addressIds: string[];
}

async function collectOrphanIds(userId: string): Promise<OrphanIds> {
	const profiles = await prisma.profile.findMany({
		where: { user_id: userId },
		select: { profile_image_id: true, address_id: true },
	});

	const companies = await prisma.company.findMany({
		where: { user_id: userId },
		select: { avatar_id: true, address_id: true },
	});

	const profileImageIds = profiles
		.map((p) => p.profile_image_id)
		.filter((id): id is string => id !== null);

	const companyAvatarIds = companies
		.map((c) => c.avatar_id)
		.filter((id): id is string => id !== null);

	const addressIds = [
		...profiles.map((p) => p.address_id),
		...companies.map((c) => c.address_id),
	].filter((id): id is string => id !== null);

	return { profileImageIds, companyAvatarIds, addressIds };
}

async function deleteOrphanRecords(orphanIds: OrphanIds): Promise<void> {
	if (orphanIds.profileImageIds.length > 0) {
		await prisma.profileImage.deleteMany({
			where: { id: { in: orphanIds.profileImageIds } },
		});
	}

	if (orphanIds.companyAvatarIds.length > 0) {
		await prisma.companyAvatar.deleteMany({
			where: { id: { in: orphanIds.companyAvatarIds } },
		});
	}

	if (orphanIds.addressIds.length > 0) {
		await prisma.address.deleteMany({
			where: { id: { in: orphanIds.addressIds } },
		});
	}
}

async function deleteStorageFiles(paths: string[]): Promise<void> {
	const storage = makeStorageProvider();

	for (const path of paths) {
		try {
			await storage.deleteFile(path);
		} catch {
			// file may already be deleted — skip
		}
	}
}
