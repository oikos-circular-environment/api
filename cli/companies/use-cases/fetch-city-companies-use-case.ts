import type { CityContext } from "../../shared/entities/city-context.js";
import type { UnownedCompanySeed } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";
import type { PlacesProvider } from "../providers/places-provider.js";

/**
 * Interface mínima satisfeita por `CompanySeedMapper` — permite injetar um
 * fake em testes sem precisar construir o mapper real com todas as suas
 * dependências (a classe concreta tem campos privados, o que a torna
 * incompatível como tipo de parâmetro para fakes por duck typing).
 */
export interface PlaceMapper {
	map(place: GooglePlace, ctx: CityContext): UnownedCompanySeed;
}

/** Busca lugares reais via as queries fixas, dedupe por place.id, mapeia para CompanySeed. */
export class FetchCityCompaniesUseCase {
	constructor(
		private readonly placesProvider: PlacesProvider,
		private readonly mapper: PlaceMapper,
	) {}

	async execute(ctx: CityContext, queries: string[]): Promise<UnownedCompanySeed[]> {
		const places = await this.searchAllQueries(ctx, queries);
		const detailed = await this.fetchDetails(places);

		return detailed.map((place) => this.mapper.map(place, ctx));
	}

	private async searchAllQueries(
		ctx: CityContext,
		queries: string[],
	): Promise<GooglePlace[]> {
		const seenPlaceIds = new Set<string>();
		const places: GooglePlace[] = [];

		for (const query of queries) {
			let pageToken: string | undefined;

			do {
				const result = await this.placesProvider.textSearch(
					query,
					ctx.bounds,
					pageToken,
				);

				for (const place of result.places) {
					if (!seenPlaceIds.has(place.id)) {
						seenPlaceIds.add(place.id);
						places.push(place);
					}
				}

				pageToken = result.nextPageToken;
			} while (pageToken);
		}

		return places;
	}

	private async fetchDetails(places: GooglePlace[]): Promise<GooglePlace[]> {
		const detailed: GooglePlace[] = [];

		for (const place of places) {
			try {
				const details = await this.placesProvider.placeDetails(place.id);
				detailed.push({ ...place, ...details });
			} catch {
				detailed.push(place);
			}
		}

		return detailed;
	}
}
