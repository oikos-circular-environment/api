import { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@/lib/prisma.js";
import type { MarketCompany } from "@/modules/market/dtos/market-dto.js";
import type { MarketRepository } from "@/modules/market/repositories/market-repository.js";

type RawCompanyRow = {
	id: string;
	business_name: string | null;
	corporate_name: string;
	company_type: string;
	accept_appointments: boolean;
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
        WHERE cs.company_id = c.id AND (
          cs.name ILIKE ${`%${q}%`}
          OR EXISTS (SELECT 1 FROM unnest(cs.sub_items) AS sub WHERE sub ILIKE ${`%${q}%`})
        )
      )
      OR EXISTS (
        SELECT 1 FROM company_wastes cw
        WHERE cw.company_id = c.id AND (
          cw.name ILIKE ${`%${q}%`}
          OR EXISTS (SELECT 1 FROM unnest(cw.sub_items) AS sub WHERE sub ILIKE ${`%${q}%`})
        )
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
        c.accept_appointments,
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

		const [allServices, allWastes, allBusinessHours] = await Promise.all([
			prisma.companyService.findMany({
				where: { company_id: { in: companyIds } },
			}),
			prisma.companyWaste.findMany({
				where: { company_id: { in: companyIds } },
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
					waste_type:
						s.waste_type as MarketCompany["services"][number]["waste_type"],
					quantity: Number(s.quantity),
					observations: s.observations,
					sub_items: s.sub_items.length === 0 ? null : s.sub_items,
				}));

			const wastes = allWastes
				.filter((w) => w.company_id === row.id)
				.map((w) => ({
					id: w.id,
					name: w.name,
					description: w.description,
					price: Number(w.price),
					unit: w.unit as MarketCompany["wastes"][number]["unit"],
					waste_type:
						w.waste_type as MarketCompany["wastes"][number]["waste_type"],
					quantity: Number(w.quantity),
					observations: w.observations,
					sub_items: w.sub_items.length === 0 ? null : w.sub_items,
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
				accept_appointments: row.accept_appointments,
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
