import { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@/lib/prisma.js";
import type { MarketCompany } from "@/modules/market/dtos/market-dto.js";
import type { MarketRepository } from "@/modules/market/repositories/market-repository.js";

type RawCompanyRow = {
	id: string;
	business_name: string | null;
	corporate_name: string;
	company_type: string;
	status: boolean;
	phones: string[];
	address_id: string;
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	state: string;
	state_code: string;
	latitude: number | null;
	longitude: number | null;
	distance_in_meters: number;
};

type RawCountRow = {
	total: number;
};

export class MarketRepositoryPrisma implements MarketRepository {
	async findMany(params: {
		lat: number;
		lon: number;
		radius: number;
		q?: string;
		category?: "services" | "waste";
		offset: number;
		limit: number;
	}): Promise<{ companies: MarketCompany[]; total: number }> {
		const { lat, lon, radius, q, category, offset, limit } = params;

		const origin = Prisma.sql`ST_SetSRID(ST_Point(${lon}, ${lat}), 4326)`;

		const textFilter = q
			? Prisma.sql`AND (
      c.business_name ILIKE ${`%${q}%`}
      OR EXISTS (
        SELECT 1 FROM company_services cs
        WHERE cs.company_id = c.id AND cs.name ILIKE ${`%${q}%`}
      )
      OR EXISTS (
        SELECT 1 FROM company_wastes cw
        WHERE cw.company_id = c.id AND cw.name ILIKE ${`%${q}%`}
      )
    )`
			: Prisma.empty;

		const categoryFilter =
			category === "services"
				? Prisma.sql`AND EXISTS (SELECT 1 FROM company_services cs WHERE cs.company_id = c.id)`
				: category === "waste"
					? Prisma.sql`AND EXISTS (SELECT 1 FROM company_wastes cw WHERE cw.company_id = c.id)`
					: Prisma.empty;

		const countRows = await prisma.$queryRaw<RawCountRow[]>(Prisma.sql`
      SELECT COUNT(DISTINCT c.id)::int AS total
      FROM companies c
      JOIN addresses a ON a.id = c.address_id
      WHERE a.location IS NOT NULL
        AND ST_DWithin(a.location, ${origin}, ${radius})
        AND c.status = true
        AND c.is_company_valid = true
        ${textFilter}
        ${categoryFilter}
    `);

		const total = countRows[0]?.total ?? 0;

		if (total === 0) {
			return { companies: [], total: 0 };
		}

		const rows = await prisma.$queryRaw<RawCompanyRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.business_name,
        c.corporate_name,
        c.company_type,
        c.status,
        c.phones,
        a.id AS address_id,
        a.zip_code,
        a.street,
        a.number,
        a.complement,
        a.district,
        a.city,
        a.state,
        a.state_code,
        a.latitude,
        a.longitude,
        ST_Distance(a.location, ${origin}) AS distance_in_meters
      FROM companies c
      JOIN addresses a ON a.id = c.address_id
      WHERE a.location IS NOT NULL
        AND ST_DWithin(a.location, ${origin}, ${radius})
        AND c.status = true
        AND c.is_company_valid = true
        ${textFilter}
        ${categoryFilter}
      ORDER BY distance_in_meters ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

		if (rows.length === 0) {
			return { companies: [], total };
		}

		const companyIds = rows.map((r) => r.id);

		const wasteInclude = {
			waste_category: {
				select: { id: true, name: true, hazard_levels: true },
			},
		} as const;

		const [allServices, allWastes, allBusinessHours] = await Promise.all([
			prisma.companyService.findMany({
				where: { company_id: { in: companyIds } },
				include: wasteInclude,
			}),
			prisma.companyWaste.findMany({
				where: { company_id: { in: companyIds } },
				include: wasteInclude,
			}),
			prisma.companyBusinessHour.findMany({
				where: { company_id: { in: companyIds } },
				include: { time_slots: true },
			}),
		]);

		const companies: MarketCompany[] = rows.map((row) => {
			const services = allServices
				.filter((s) => s.company_id === row.id)
				.map((s) => ({
					id: s.id,
					name: s.name,
					description: s.description,
					price: Number(s.price),
					unit: s.unit as MarketCompany["services"][number]["unit"],
					waste_category_id: s.waste_category_id,
					waste_category: {
						id: s.waste_category.id,
						name: s.waste_category.name,
						hazard_levels: s.waste_category
							.hazard_levels as MarketCompany["services"][number]["waste_category"]["hazard_levels"],
					},
					quantity: Number(s.quantity),
					observations: s.observations,
				}));

			const wastes = allWastes
				.filter((w) => w.company_id === row.id)
				.map((w) => ({
					id: w.id,
					name: w.name,
					description: w.description,
					price: Number(w.price),
					unit: w.unit as MarketCompany["wastes"][number]["unit"],
					waste_category_id: w.waste_category_id,
					waste_category: {
						id: w.waste_category.id,
						name: w.waste_category.name,
						hazard_levels: w.waste_category
							.hazard_levels as MarketCompany["wastes"][number]["waste_category"]["hazard_levels"],
					},
					quantity: Number(w.quantity),
					observations: w.observations,
				}));

			const businessHours = allBusinessHours
				.filter((bh) => bh.company_id === row.id)
				.map((bh) => ({
					id: bh.id,
					day_of_week:
						bh.day_of_week as MarketCompany["business_hours"][number]["day_of_week"],
					is_open: bh.is_open,
					time_slots: bh.time_slots.map((ts) => ({
						id: ts.id,
						start_time: ts.start_time,
						end_time: ts.end_time,
					})),
				}));

			return {
				id: row.id,
				business_name: row.business_name,
				corporate_name: row.corporate_name,
				company_type: row.company_type as MarketCompany["company_type"],
				status: row.status,
				phones: row.phones,
				address: {
					id: row.address_id,
					zip_code: row.zip_code,
					street: row.street,
					number: row.number,
					complement: row.complement,
					district: row.district,
					city: row.city,
					state: row.state,
					state_code: row.state_code,
					latitude: row.latitude,
					longitude: row.longitude,
				},
				services,
				wastes,
				business_hours: businessHours,
				distance_in_meters: Number(row.distance_in_meters),
			};
		});

		return { companies, total };
	}
}
