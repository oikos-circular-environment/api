import { randomUUID } from "node:crypto";
import type {
	CreateProfile,
	Profile,
	SaveProfileImage,
	UpdateProfile,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "../profiles-repository.js";

export class InMemoryProfilesRepository implements ProfilesRepository {
	public items: Profile[] = [];

	async findById(id: string) {
		const profile = this.items.find((item) => item.id === id);

		return profile ?? null;
	}

	async findByUserId(userId: string) {
		const profile = this.items.find((item) => item.user_id === userId);

		return profile ?? null;
	}

	async findByCpf(cpf: string) {
		const profile = this.items.find((item) => item.cpf === cpf);

		return profile ?? null;
	}

	async create(data: CreateProfile) {
		const now = new Date();
		const profile = {
			id: randomUUID(),
			user_id: data.user_id,
			full_name: data.full_name,
			display_name: data.display_name,
			cpf: data.cpf,
			phone: data.phone,
			email: data.email,
			is_collector: data.is_collector,
			created_at: now,
			updated_at: now,
			address: null,
			profile_image: null,
		} satisfies Profile;

		this.items.push(profile);

		return profile;
	}

	async update(id: string, data: UpdateProfile) {
		const profile = await this.findById(id);

		if (!profile) {
			return null;
		}

		Object.assign(profile, {
			...data,
			updated_at: new Date(),
		});

		return profile;
	}

	async saveProfileImage(profileId: string, data: SaveProfileImage) {
		const profile = await this.findById(profileId);

		if (!profile) {
			return null;
		}

		const createdAt = profile.profile_image?.created_at ?? new Date();
		const imageId = profile.profile_image?.id ?? randomUUID();

		profile.profile_image = {
			id: imageId,
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			base64: data.base64,
			created_at: createdAt,
		};
		profile.updated_at = new Date();

		return profile.profile_image;
	}

	async upsert(data: CreateProfile): Promise<Profile> {
		const existing = await this.findByUserId(data.user_id);

		if (existing) {
			Object.assign(existing, { ...data, updated_at: new Date() });
			return existing;
		}

		return this.create(data);
	}

	async deleteProfileImage(profileId: string) {
		const profile = await this.findById(profileId);

		if (profile) {
			profile.profile_image = null;
			profile.updated_at = new Date();
		}
	}
}
