export type Address = {
	id: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	state: string;
	stateAcronym: string;
	zipCode: string;
	latitude: number | null;
	longitude: number | null;
};
