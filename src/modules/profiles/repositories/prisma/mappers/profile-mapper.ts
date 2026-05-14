import type {
	Address,
	Profile,
	ProfileImage,
} from "@/modules/profiles/dtos/profiles-dto.js";

export type PrismaAddressWithRelations = {
	id: string;
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	state: string;
	state_code: string;
	latitude: number | null;
	longitude: number | null;
	created_at: Date;
	updated_at: Date;
};

export type PrismaProfileWithRelations = {
	id: string;
	user_id: string;
	full_name: string;
	display_name: string;
	cpf: string;
	phone: string;
	is_collector: boolean;
	created_at: Date;
	updated_at: Date;
	address?: PrismaAddressWithRelations | null;
	profile_image?: {
		id: string;
		url: string;
		file_name: string;
		path: string;
		base64: string;
		created_at: Date;
	} | null;
} | null;

export function profileMapper(
	profile: PrismaProfileWithRelations,
): Profile | null {
	if (!profile) {
		return null;
	}

	const address = profile.address;
	const profileImage = profile.profile_image;

	return {
		id: profile.id,
		user_id: profile.user_id,
		full_name: profile.full_name,
		display_name: profile.display_name,
		cpf: profile.cpf,
		phone: profile.phone,
		is_collector: profile.is_collector,
		created_at: profile.created_at,
		updated_at: profile.updated_at,
		address: address
			? ({
					id: address.id,
					zip_code: address.zip_code,
					street: address.street,
					number: address.number,
					complement: address.complement,
					district: address.district,
					city: address.city,
					state: address.state,
					state_code: address.state_code,
					latitude: address.latitude,
					longitude: address.longitude,
					created_at: address.created_at,
					updated_at: address.updated_at,
				} satisfies Address)
			: null,
		profile_image: profileImage
			? ({
					id: profileImage.id,
					url: profileImage.url,
					file_name: profileImage.file_name,
					path: profileImage.path,
					base64: profileImage.base64,
					created_at: profileImage.created_at,
				} satisfies ProfileImage)
			: null,
	};
}
