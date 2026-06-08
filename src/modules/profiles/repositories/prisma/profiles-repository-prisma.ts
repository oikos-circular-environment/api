import { prisma } from "@/lib/prisma.js";
import type {
	CreateProfile,
	SaveProfileImage,
	UpdateProfile,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "../profiles-repository.js";
import {
	type PrismaProfileWithRelations,
	profileMapper,
} from "./mappers/profile-mapper.js";

export class PrismaProfilesRepository implements ProfilesRepository {
	async findById(id: string) {
		const profile = await prisma.profile.findUnique({
			where: {
				id,
			},
			include: {
				address: true,
				profile_image: true,
			},
		});

		return profileMapper(profile as PrismaProfileWithRelations);
	}

	async findByUserId(userId: string) {
		const profile = await prisma.profile.findUnique({
			where: {
				user_id: userId,
			},
			include: {
				address: true,
				profile_image: true,
			},
		});

		return profileMapper(profile as PrismaProfileWithRelations);
	}

	async create(data: CreateProfile) {
		const profile = await prisma.profile.create({
			data: {
				user_id: data.user_id,
				full_name: data.full_name,
				display_name: data.display_name,
				phone: data.phone,
			},
			include: {
				address: true,
				profile_image: true,
			},
		});

		const mappedProfile = profileMapper(profile as PrismaProfileWithRelations);

		if (!mappedProfile) {
			throw new Error("Failed to create profile");
		}

		return mappedProfile;
	}

	async update(id: string, data: UpdateProfile) {
		const currentProfile = await prisma.profile.findUnique({
			where: {
				id,
			},
			include: {
				address: true,
				profile_image: true,
			},
		});

		if (!currentProfile) {
			return null;
		}

		const profile = await prisma.profile.update({
			where: {
				id,
			},
			data,
			include: {
				address: true,
				profile_image: true,
			},
		});

		return profileMapper(profile as PrismaProfileWithRelations);
	}

	async upsert(data: CreateProfile) {
		const payload = {
			full_name: data.full_name,
			display_name: data.display_name,
			phone: data.phone,
		};

		const profile = await prisma.profile.upsert({
			where: { user_id: data.user_id },
			create: { user_id: data.user_id, ...payload },
			update: payload,
			include: { address: true, profile_image: true },
		});

		const mapped = profileMapper(profile as PrismaProfileWithRelations);

		if (!mapped) {
			throw new Error("Failed to upsert profile");
		}

		return mapped;
	}

	async saveProfileImage(profileId: string, data: SaveProfileImage) {
		const currentProfile = await prisma.profile.findUnique({
			where: {
				id: profileId,
			},
			include: {
				profile_image: true,
			},
		});

		if (!currentProfile) {
			return null;
		}

		if (currentProfile.profile_image_id) {
			await prisma.profileImage.update({
				where: {
					id: currentProfile.profile_image_id,
				},
				data: {
					url: data.url,
					file_name: data.file_name,
					path: data.path,
				},
			});
		} else {
			await prisma.$transaction(async (tx) => {
				const profileImage = await tx.profileImage.create({
					data: {
						url: data.url,
						file_name: data.file_name,
						path: data.path,
					},
				});

				await tx.profile.update({
					where: { id: profileId },
					data: { profile_image_id: profileImage.id },
				});
			});
		}

		const updatedProfile = await prisma.profile.findUnique({
			where: {
				id: profileId,
			},
			include: {
				address: true,
				profile_image: true,
			},
		});

		const mappedProfile = profileMapper(
			updatedProfile as PrismaProfileWithRelations,
		);

		return mappedProfile?.profile_image ?? null;
	}

	async deleteProfileImage(profileId: string) {
		const currentProfile = await prisma.profile.findUnique({
			where: {
				id: profileId,
			},
			include: {
				profile_image: true,
			},
		});

		if (currentProfile) {
			if (currentProfile.profile_image_id) {
				await prisma.profile.update({
					where: {
						id: profileId,
					},
					data: {
						profile_image_id: null,
					},
				});

				await prisma.profileImage.delete({
					where: {
						id: currentProfile.profile_image_id,
					},
				});
			}
		}
	}
}
