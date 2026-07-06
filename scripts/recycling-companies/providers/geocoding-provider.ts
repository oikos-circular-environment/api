import type { LatLng, LatLngBounds } from "../entities/city-context.js";

export interface GeocodeResult {
	center: LatLng;
	bounds: LatLngBounds;
}

export interface GeocodingProvider {
	geocodeCity(city: string, stateCode: string): Promise<GeocodeResult>;
}
