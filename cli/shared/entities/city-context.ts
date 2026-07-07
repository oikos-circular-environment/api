export interface LatLng {
	latitude: number;
	longitude: number;
}

export interface LatLngBounds {
	low: LatLng;
	high: LatLng;
}

export interface CityContext {
	city: string;
	cityIbgeId: number;
	state: string;
	stateIbgeId: number;
	stateCode: string;
	bounds: LatLngBounds;
	center: LatLng;
}
