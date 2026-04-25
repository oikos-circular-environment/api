import { prisma } from "@/lib/prisma.js";
import type {
	CreateCompanyAddress,
	UpdateCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "../address-repository.js";

export class PrismaAddressesRepository implements AddressesRepository {
	async findById(id: string) {
		const address = await prisma.address.findUnique({
			where: {
				id,
			},
		});

		return address;
	}

	async findByCompanyId(companyId: string) {
		const company = await prisma.company.findUnique({
			where: {
				id: companyId,
			},
			include: {
				address: true,
			},
		});

		return company?.address ?? null;
	}

	async create(data: CreateCompanyAddress) {
		const address = await prisma.$transaction(async (transaction) => {
			const createdAddress = await transaction.address.create({
				data: {
					zip_code: data.zip_code,
					street: data.street,
					number: data.number,
					complement: data.complement,
					district: data.district,
					city: data.city,
					state: data.state,
					state_code: data.state_code,
					latitude: data.latitude,
					longitude: data.longitude,
				},
			});

			await transaction.company.update({
				where: {
					id: data.company_id,
				},
				data: {
					address_id: createdAddress.id,
				},
			});

			return createdAddress;
		});

		return address;
	}

	async update(id: string, data: UpdateCompanyAddress) {
		const address = await prisma.address.findUnique({
			where: {
				id,
			},
		});

		if (!address) {
			return null;
		}

		const updatedAddress = await prisma.address.update({
			where: {
				id,
			},
			data,
		});

		return updatedAddress;
	}
}
