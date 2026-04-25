import { prisma } from "@/lib/prisma.js";
import type {
	CompanyService,
	CompanyServiceInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { ServicesRepository } from "../services-repository.js";

function normalizeSubItems(subItems: string[] | null | undefined) {
	if (!subItems || subItems.length === 0) {
		return [];
	}

	return subItems;
}

function mapService(service: {
	id: string;
	name: string;
	description: string | null;
	price: { toNumber: () => number } | number;
	unit: string;
	waste_type: string;
	quantity: number;
	observations: string | null;
	sub_items: string[];
	created_at: Date;
	updated_at: Date;
}): CompanyService {
	return {
		id: service.id,
		name: service.name,
		description: service.description,
		price: Number(service.price),
		unit: service.unit as CompanyService["unit"],
		waste_type: service.waste_type as CompanyService["waste_type"],
		quantity: service.quantity,
		observations: service.observations,
		sub_items: service.sub_items.length === 0 ? null : service.sub_items,
		created_at: service.created_at,
		updated_at: service.updated_at,
	};
}

export class PrismaServicesRepository implements ServicesRepository {
	async findByCompanyId(companyId: string) {
		const services = await prisma.companyService.findMany({
			where: {
				company_id: companyId,
			},
			orderBy: {
				created_at: "asc",
			},
		});

		return services.map(mapService);
	}

	async replaceMany(companyId: string, data: CompanyServiceInput[]) {
		await prisma.$transaction(async (transaction) => {
			await transaction.companyService.deleteMany({
				where: {
					company_id: companyId,
				},
			});

			if (data.length > 0) {
				await transaction.companyService.createMany({
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
