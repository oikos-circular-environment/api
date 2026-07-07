import type { CityContext } from "../entities/city-context.js";

export function normalizeSlugPart(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Slug inclui a UF — há cidades homônimas em estados diferentes no Brasil. */
export function citySlug(ctx: CityContext): string {
	return `${normalizeSlugPart(ctx.city)}-${ctx.stateCode.toLowerCase()}`;
}
