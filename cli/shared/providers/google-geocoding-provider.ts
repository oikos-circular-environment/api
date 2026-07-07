import { Client } from "@googlemaps/google-maps-services-js";
import type { GeocodeResult, GeocodingProvider } from "./geocoding-provider.js";

/** Cliente de Geocoding via SDK oficial (ver 01-technical-plan.md — decisão-chave #3). */
export class GoogleGeocodingProvider implements GeocodingProvider {
	private readonly client = new Client();

	constructor(private readonly apiKey: string) {}

	async geocodeCity(city: string, stateCode: string): Promise<GeocodeResult> {
		const response = await this.client.geocode({
			params: {
				address: `${city}, ${stateCode}, Brasil`,
				region: "br",
				key: this.apiKey,
			},
		});

		const result = response.data.results[0];
		if (!result) {
			throw new Error(
				`Geocoding não encontrou resultados para "${city}, ${stateCode}"`,
			);
		}

		const { viewport, location } = result.geometry;

		return {
			center: { latitude: location.lat, longitude: location.lng },
			bounds: {
				low: {
					latitude: viewport.southwest.lat,
					longitude: viewport.southwest.lng,
				},
				high: {
					latitude: viewport.northeast.lat,
					longitude: viewport.northeast.lng,
				},
			},
		};
	}
}
