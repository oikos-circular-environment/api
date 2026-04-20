import type {
  Address,
  CreateAddress,
  UpdateAddress,
} from "@/modules/profiles/dtos/profiles-dto.js";

export interface AddressesRepository {
  findById(id: string): Promise<Address | null>;
  findByProfileId(profileId: string): Promise<Address | null>;
  create(data: CreateAddress): Promise<Address>;
  update(id: string, data: UpdateAddress): Promise<Address | null>;
}
