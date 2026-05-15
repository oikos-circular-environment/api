import { prisma } from "@/lib/prisma.js";
import type {
	CreateAddress,
	UpdateAddress,
} from "@/modules/profiles/dtos/profiles-dto.js";
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

	async findByProfileId(profileId: string) {
		const profile = await prisma.profile.findUnique({
			where: {
				id: profileId,
			},
			include: {
				address: true,
			},
		});

		return profile?.address ?? null;
	}

	async create(data: CreateAddress) {
		const address = await prisma.$transaction(async (transaction) => {
			const createdAddress = await transaction.address.create({
				data: {
					zip_code: data.zip_code,
					street: data.street,
					number: data.number,
					complement: data.complement,
					district: data.district,
					city_ibge_id: data.city_ibge_id,
					city: data.city,
					state_ibge_id: data.state_ibge_id,
					state: data.state,
					state_code: data.state_code,
					latitude: data.latitude,
					longitude: data.longitude,
				},
			});

			await transaction.profile.update({
				where: {
					id: data.profile_id,
				},
				data: {
					address_id: createdAddress.id,
				},
			});

			return createdAddress;
		});

		return address;
	}

	async update(id: string, data: UpdateAddress) {
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
