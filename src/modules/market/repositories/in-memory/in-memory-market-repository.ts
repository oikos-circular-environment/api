import type { MarketCompanyRecord } from "@/modules/market/dtos/market-dto.js";
import type { MarketRepository } from "@/modules/market/repositories/market-repository.js";

function normalizeForSearch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class InMemoryMarketRepository implements MarketRepository {
	public companies: MarketCompanyRecord[] = [];

	async findMany(params: {
		lat: number;
		lon: number;
		radius: number;
		q?: string;
		category?: "services" | "waste";
		offset: number;
		limit: number;
	}): Promise<{ companies: MarketCompanyRecord[]; total: number }> {
		const { lat, lon, radius, q, category, offset, limit } = params;

		let filtered = this.companies
			.map((company) => ({
				...company,
				distance_in_meters: haversineDistance(
					lat,
					lon,
					company.address.latitude,
					company.address.longitude,
				),
			}))
			.filter((company) => company.distance_in_meters <= radius);

		if (q !== undefined) {
			const normalizedQ = normalizeForSearch(q);
			filtered = filtered.filter((company) => {
				const inBusinessName = normalizeForSearch(
					company.business_name,
				).includes(normalizedQ);
				const inServices = company.services.some((service) =>
					normalizeForSearch(service.name).includes(normalizedQ),
				);
				const inWastes = company.wastes.some((waste) =>
					normalizeForSearch(waste.name).includes(normalizedQ),
				);
				return inBusinessName || inServices || inWastes;
			});
		}

		if (category === "services") {
			filtered = filtered.filter((company) => company.services.length > 0);
		} else if (category === "waste") {
			filtered = filtered.filter((company) => company.wastes.length > 0);
		}

		filtered.sort((a, b) => a.distance_in_meters - b.distance_in_meters);

		const total = filtered.length;

		const paginatedWithDistance = filtered.slice(offset, offset + limit);

		return { companies: paginatedWithDistance, total };
	}
}
