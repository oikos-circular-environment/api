import type { Prisma } from "@/generated/prisma/client.js";
import type {
	CreateProfile,
	Profile,
	ProfileImage,
	SaveProfileImage,
	UpdateProfile,
} from "@/modules/profiles/dtos/profiles-dto.js";

export interface ProfilesRepository {
	findById(id: string): Promise<Profile | null>;
	findByUserId(userId: string): Promise<Profile | null>;
	create(data: CreateProfile): Promise<Profile>;
	update(id: string, data: UpdateProfile): Promise<Profile | null>;
	upsert(data: CreateProfile, tx?: Prisma.TransactionClient): Promise<Profile>;
	saveProfileImage(
		profileId: string,
		data: SaveProfileImage,
		tx?: Prisma.TransactionClient,
	): Promise<ProfileImage | null>;
	deleteProfileImage(
		profileId: string,
		tx?: Prisma.TransactionClient,
	): Promise<void>;
}
