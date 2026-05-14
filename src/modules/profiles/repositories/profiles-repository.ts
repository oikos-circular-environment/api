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
	findByCpf(cpf: string): Promise<Profile | null>;
	create(data: CreateProfile): Promise<Profile>;
	update(id: string, data: UpdateProfile): Promise<Profile | null>;
	saveProfileImage(
		profileId: string,
		data: SaveProfileImage,
	): Promise<ProfileImage | null>;
	deleteProfileImage(profileId: string): Promise<void>;
}
