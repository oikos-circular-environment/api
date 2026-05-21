import { prisma } from "@/lib/prisma.js";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { WastesRepository } from "../wastes-repository.js";

function normalizeSubItems(subItems: string[] | null | undefined) {
	if (!subItems || subItems.length === 0) {
		return [];
	}

	return subItems;
}

function mapWaste(waste: {
	id: string;
	name: string;
	description: string | null;
	price: { toNumber: () => number } | number;
	unit: string;
	waste_type: string;
	quantity: { toNumber: () => number } | number;
	observations: string | null;
	sub_items: string[];
	created_at: Date;
	updated_at: Date;
}): CompanyWaste {
	return {
		id: waste.id,
		name: waste.name,
		description: waste.description,
		price: Number(waste.price),
		unit: waste.unit as CompanyWaste["unit"],
		waste_type: waste.waste_type as CompanyWaste["waste_type"],
		quantity: Number(waste.quantity),
		observations: waste.observations,
		sub_items: waste.sub_items.length === 0 ? null : waste.sub_items,
		created_at: waste.created_at,
		updated_at: waste.updated_at,
	};
}

export class PrismaWastesRepository implements WastesRepository {
	async findByCompanyId(companyId: string) {
		const wastes = await prisma.companyWaste.findMany({
			where: {
				company_id: companyId,
			},
			orderBy: {
				created_at: "asc",
			},
		});

		return wastes.map(mapWaste);
	}

	async replaceMany(companyId: string, data: CompanyWasteInput[]) {
		await prisma.$transaction(async (transaction) => {
			await transaction.companyWaste.deleteMany({
				where: {
					company_id: companyId,
				},
			});

			if (data.length > 0) {
				await transaction.companyWaste.createMany({
					data: data.map((item) => ({
						company_id: companyId,
						name: item.name,
						description: item.description,
						price: item.price,
						unit: item.unit,
						waste_type: item.waste_type,
						quantity: item.quantity,
						observations: item.observations,
						sub_items: normalizeSubItems(item.sub_items),
					})),
				});
			}
		});

		return this.findByCompanyId(companyId);
	}
}
