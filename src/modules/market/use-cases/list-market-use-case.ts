import type { MarketCompany } from "../dtos/market-dto.js";
import type { MarketRepository } from "../repositories/market-repository.js";

export class ListMarketUseCase {
	constructor(private readonly repo: MarketRepository) {}

	async execute(params: {
		lat: number;
		lon: number;
		radius?: number;
		q?: string;
		category?: "services" | "waste";
		cursor?: string;
		limit?: number;
	}): Promise<{ companies: MarketCompany[]; next_cursor: string | null }> {
		const { lat, lon, q, category, cursor } = params;
		const radius = params.radius ?? 1000;
		const limit = params.limit ?? 20;

		const offset = cursor ? parseInt(atob(cursor), 10) : 0;

		const { companies, total } = await this.repo.findMany({
			lat,
			lon,
			radius,
			q,
			category,
			offset,
			limit,
		});

		const next_cursor =
			offset + limit < total ? btoa(String(offset + limit)) : null;

		return { companies, next_cursor };
	}
}
