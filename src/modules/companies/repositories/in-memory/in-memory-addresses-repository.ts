import { randomUUID } from "node:crypto";
import type {
	CompanyAddress,
	CreateCompanyAddress,
	UpdateCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "../address-repository.js";

type StoredCompanyAddress = CompanyAddress & {
	company_id: string;
};

export class InMemoryAddressesRepository implements AddressesRepository {
	public items: StoredCompanyAddress[] = [];

	async findById(id: string) {
		const address = this.items.find((item) => item.id === id);

		return address ? this.mapAddress(address) : null;
	}

	async findByCompanyId(companyId: string) {
		const address = this.items.find((item) => item.company_id === companyId);

		return address ? this.mapAddress(address) : null;
	}

	async create(data: CreateCompanyAddress) {
		const now = new Date();

		const address: StoredCompanyAddress = {
			id: randomUUID(),
			company_id: data.company_id,
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

	async update(id: string, data: UpdateCompanyAddress) {
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

	private mapAddress(address: StoredCompanyAddress): CompanyAddress {
		const { company_id: _companyId, ...mappedAddress } = address;

		return mappedAddress;
	}
}
