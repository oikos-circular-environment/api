import type { MarketCompanyRecord } from "@/modules/market/dtos/market-dto.js";

export interface MarketRepository {
	findMany(params: {
		lat: number;
		lon: number;
		radius: number;
		q?: string;
		category?: "services" | "waste";
		offset: number;
		limit: number;
	}): Promise<{ companies: MarketCompanyRecord[]; total: number }>;
}
