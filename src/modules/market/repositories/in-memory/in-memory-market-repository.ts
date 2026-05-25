import type { MarketCompany } from "@/modules/market/dtos/market-dto.js";
import type { MarketRepository } from "@/modules/market/repositories/market-repository.js";

function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371000; // raio da Terra em metros
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class InMemoryMarketRepository implements MarketRepository {
	public companies: MarketCompany[] = [];

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

		let filtered = this.companies
			.filter(
				(company) =>
					company.address.latitude !== null &&
					company.address.longitude !== null,
			)
			.map((company) => ({
				...company,
				distance_in_meters: haversineDistance(
					lat,
					lon,
					company.address.latitude as number,
					company.address.longitude as number,
				),
			}))
			.filter((company) => company.distance_in_meters <= radius);

		if (q !== undefined) {
			const lowerQ = q.toLowerCase();
			filtered = filtered.filter((company) => {
				const inBusinessName =
					company.business_name !== null &&
					company.business_name.toLowerCase().includes(lowerQ);
				const inServices = company.services.some((service) =>
					service.name.toLowerCase().includes(lowerQ),
				);
				const inWastes = company.wastes.some((waste) =>
					waste.name.toLowerCase().includes(lowerQ),
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
