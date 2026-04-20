import { randomUUID } from "node:crypto";
import type {
  CreateProfile,
  Profile,
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
}
