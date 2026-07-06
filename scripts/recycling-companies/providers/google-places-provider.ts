import type { LatLngBounds } from "../entities/city-context.js";
import type { GooglePlace } from "../entities/google-place.js";
import type {
	PlacesProvider,
	PlacesTextSearchResult,
} from "./places-provider.js";

const BASE_URL = "https://places.googleapis.com/v1";

const TEXT_SEARCH_FIELD_MASK = [
	"places.id",
	"places.displayName",
	"places.formattedAddress",
	"places.location",
	"places.nationalPhoneNumber",
	"places.internationalPhoneNumber",
	"places.websiteUri",
	"places.rating",
	"places.regularOpeningHours",
	"places.businessStatus",
	"places.types",
].join(",");

const DETAIL_FIELD_MASK = [
	"id",
	"displayName",
	"formattedAddress",
	"addressComponents",
	"location",
	"nationalPhoneNumber",
	"internationalPhoneNumber",
	"websiteUri",
	"rating",
	"userRatingCount",
	"regularOpeningHours",
	"businessStatus",
	"types",
	"editorialSummary",
].join(",");

/** Cliente da Places API (New) — fetch() cru, sem SDK (ver 01-technical-plan.md). */
export class GooglePlacesProvider implements PlacesProvider {
	constructor(private readonly apiKey: string) {}

	async textSearch(
		query: string,
		bounds: LatLngBounds,
		pageToken?: string,
	): Promise<PlacesTextSearchResult> {
		const body: Record<string, unknown> = {
			textQuery: query,
			locationRestriction: { rectangle: bounds },
			languageCode: "pt-BR",
			regionCode: "BR",
			pageSize: 20,
		};
		if (pageToken) body.pageToken = pageToken;

		const res = await fetch(`${BASE_URL}/places:searchText`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": this.apiKey,
				"X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			throw new Error(
				`Text Search falhou [${res.status}]: ${await res.text()}`,
			);
		}

		const data = (await res.json()) as {
			places?: GooglePlace[];
			nextPageToken?: string;
		};

		return { places: data.places ?? [], nextPageToken: data.nextPageToken };
	}

	async placeDetails(placeId: string): Promise<GooglePlace> {
		const res = await fetch(
			`${BASE_URL}/places/${placeId}?languageCode=pt-BR`,
			{
				headers: {
					"X-Goog-Api-Key": this.apiKey,
					"X-Goog-FieldMask": DETAIL_FIELD_MASK,
				},
			},
		);

		if (!res.ok) {
			throw new Error(
				`Place Details falhou para ${placeId} [${res.status}]: ${await res.text()}`,
			);
		}

		return res.json() as Promise<GooglePlace>;
	}
}
