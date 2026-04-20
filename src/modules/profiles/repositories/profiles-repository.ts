import type {
  CreateProfile,
  Profile,
  UpdateProfile,
} from "@/modules/profiles/dtos/profiles-dto.js";

export interface ProfilesRepository {
  findById(id: string): Promise<Profile | null>;
  findByUserId(userId: string): Promise<Profile | null>;
  create(data: CreateProfile): Promise<Profile>;
  update(id: string, data: UpdateProfile): Promise<Profile | null>;
}
