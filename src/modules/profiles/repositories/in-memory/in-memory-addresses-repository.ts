import { randomUUID } from "node:crypto";
import type {
  Address,
  CreateAddress,
  UpdateAddress,
} from "@/modules/profiles/dtos/profiles-dto.js";
import type { AddressesRepository } from "../address-repository.js";

type StoredAddress = Address & {
  profile_id: string;
};

export class InMemoryAddressesRepository implements AddressesRepository {
  public items: StoredAddress[] = [];

  async findById(id: string) {
    const address = this.items.find((item) => item.id === id);

    return address ? this.mapAddress(address) : null;
  }

  async findByProfileId(profileId: string) {
    const address = this.items.find((item) => item.profile_id === profileId);

    return address ? this.mapAddress(address) : null;
  }

  async create(data: CreateAddress) {
    const now = new Date();

    const address: StoredAddress = {
      id: randomUUID(),
      profile_id: data.profile_id,
      zip_code: data.zip_code,
      street: data.street,
      number: data.number,
      complement: data.complement ?? null,
      district: data.district,
      city: data.city,
      state: data.state,
      state_code: data.state_code,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      created_at: now,
      updated_at: now,
    };

    this.items.push(address);

    return this.mapAddress(address);
  }

  async update(id: string, data: UpdateAddress) {
    const address = this.items.find((item) => item.id === id);

    if (!address) {
      return null;
    }

    Object.assign(address, {
      ...data,
      updated_at: new Date(),
    });

    return this.mapAddress(address);
  }

  private mapAddress(address: StoredAddress): Address {
    const { profile_id: _profileId, ...mappedAddress } = address;

    return mappedAddress;
  }
}
