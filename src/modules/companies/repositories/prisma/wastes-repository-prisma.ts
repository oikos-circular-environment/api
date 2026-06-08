import { prisma } from "@/lib/prisma.js";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { WasteCategory } from "@/modules/wastes/dtos/wastes-dto.js";
import type { WastesRepository } from "../wastes-repository.js";

const include = {
	waste_category: {
		include: {
			subcategories: {
				orderBy: { created_at: "asc" as const },
			},
		},
	},
};

function mapCategory(raw: {
	id: string;
	name: string;
	description: string | null;
	observations: string | null;
	hazard_levels: string[];
	created_at: Date;
	updated_at: Date;
	subcategories: {
		id: string;
		name: string;
		description: string | null;
		observations: string | null;
		hazard_level: string;
		type: string;
		created_at: Date;
		category_id: string;
	}[];
}): WasteCategory {
	return {
		id: raw.id,
		name: raw.name,
		description: raw.description,
		observations: raw.observations,
		hazard_levels: raw.hazard_levels as WasteCategory["hazard_levels"],
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		subcategories: raw.subcategories.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			observations: s.observations,
			hazard_level:
				s.hazard_level as WasteCategory["subcategories"][number]["hazard_level"],
			type: s.type as WasteCategory["subcategories"][number]["type"],
			created_at: s.created_at,
			category_id: s.category_id,
		})),
	};
}

function mapWaste(raw: {
	id: string;
	name: string;
	description: string | null;
	price: { toNumber: () => number } | number;
	unit: string;
	quantity: { toNumber: () => number } | number;
	observations: string | null;
	created_at: Date;
	updated_at: Date;
	waste_category_id: string;
	waste_category: Parameters<typeof mapCategory>[0];
}): CompanyWaste {
	return {
		id: raw.id,
		name: raw.name,
		description: raw.description,
		price: Number(raw.price),
		unit: raw.unit as CompanyWaste["unit"],
		quantity: Number(raw.quantity),
		observations: raw.observations,
		waste_category_id: raw.waste_category_id,
		waste_category: mapCategory(raw.waste_category),
		created_at: raw.created_at,
		updated_at: raw.updated_at,
	};
}

export class PrismaWastesRepository implements WastesRepository {
	async findByCompanyId(companyId: string) {
		const wastes = await prisma.companyWaste.findMany({
			where: { company_id: companyId },
			include,
			orderBy: { created_at: "asc" },
		});

		return wastes.map(mapWaste);
	}

	async replaceMany(companyId: string, data: CompanyWasteInput[]) {
		await prisma.$transaction(async (transaction) => {
			await transaction.companyWaste.deleteMany({
				where: { company_id: companyId },
			});

			if (data.length > 0) {
				await transaction.companyWaste.createMany({
					data: data.map((item) => ({
						company_id: companyId,
						name: item.name,
						description: item.description,
						price: item.price,
						unit: item.unit,
						quantity: item.quantity,
						observations: item.observations,
						waste_category_id: item.waste_category_id,
					})),
				});
			}
		});

		return this.findByCompanyId(companyId);
	}
}
