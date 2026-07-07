import type { LatLngBounds } from "../../shared/entities/city-context.js";
import type { GooglePlace } from "../entities/google-place.js";

export interface PlacesTextSearchResult {
	places: GooglePlace[];
	nextPageToken?: string;
}

export interface PlacesProvider {
	textSearch(
		query: string,
		bounds: LatLngBounds,
		pageToken?: string,
	): Promise<PlacesTextSearchResult>;
	placeDetails(placeId: string): Promise<GooglePlace>;
}
