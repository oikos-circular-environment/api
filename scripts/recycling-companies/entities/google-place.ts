export interface GooglePeriodTime {
	day: number;
	hour: number;
	minute: number;
}

export interface GooglePeriod {
	open: GooglePeriodTime;
	close?: GooglePeriodTime;
}

export interface GoogleOpeningHours {
	periods?: GooglePeriod[];
}

export interface GoogleLocation {
	latitude: number;
	longitude: number;
}

export interface GooglePlace {
	id: string;
	displayName?: { text: string };
	formattedAddress?: string;
	location?: GoogleLocation;
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	websiteUri?: string;
	rating?: number;
	regularOpeningHours?: GoogleOpeningHours;
	currentOpeningHours?: GoogleOpeningHours;
	businessStatus?: string;
	types?: string[];
}
