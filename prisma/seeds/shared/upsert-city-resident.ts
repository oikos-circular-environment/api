import type { Prisma } from "../../../src/generated/prisma/client.js";

interface CityResidentAddressSeed {
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	city_ibge_id: number;
	state: string;
	state_ibge_id: number;
	state_code: string;
	latitude: number;
	longitude: number;
}

interface CityResidentSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;
	address: CityResidentAddressSeed;
}

/**
 * Cria (ou reaproveita, se já existir por email) o `User`+`Profile`+`Address`
 * de um morador fictício. Usado por AMBOS os consumidores (empresas e
 * denúncias) — garante que o MESMO morador nunca gera duas linhas de `User`,
 * mesmo se referenciado primeiro por um consumidor e depois pelo outro.
 * Aceita `Prisma.TransactionClient` (compatível também com o `PrismaClient`
 * de topo, que é um superconjunto estrutural).
 */
export async function upsertCityResident(
	prisma: Prisma.TransactionClient,
	resident: CityResidentSeed,
	passwordHash: string,
): Promise<{ userId: string }> {
	const existing = await prisma.user.findUnique({
		where: { email: resident.email },
		select: { id: true },
	});
	if (existing) return { userId: existing.id };

	const address = await prisma.address.create({
		data: {
			zip_code: resident.address.zip_code,
			street: resident.address.street,
			number: resident.address.number,
			complement: resident.address.complement,
			district: resident.address.district,
			city: resident.address.city,
			city_ibge_id: resident.address.city_ibge_id,
			state: resident.address.state,
			state_ibge_id: resident.address.state_ibge_id,
			state_code: resident.address.state_code,
			latitude: resident.address.latitude,
			longitude: resident.address.longitude,
		},
	});

	await prisma.$executeRaw`
		UPDATE "addresses"
		SET "location" = ST_SetSRID(ST_Point(${resident.address.longitude}, ${resident.address.latitude}), 4326)
		WHERE "id" = ${address.id}
	`;

	const user = await prisma.user.create({
		data: {
			email: resident.email,
			password: passwordHash,
			profile: {
				create: {
					full_name: resident.full_name,
					display_name: resident.display_name,
					phone: resident.phone,
					address_id: address.id,
				},
			},
		},
	});

	return { userId: user.id };
}
