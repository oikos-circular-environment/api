import type { Prisma } from "../../../src/generated/prisma/client.js";

interface UserAddressSeed {
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

interface UserProfileSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;
	address: UserAddressSeed;
}

/**
 * Cria (ou reaproveita, se já existir por email) o `User`+`Profile`+`Address`
 * de um usuário fictício. Usado pelo consumidor de empresas+denúncias
 * (`data-generated.ts`) — garante que o MESMO usuário nunca gera duas linhas
 * de `User`, mesmo se referenciado por várias empresas/denúncias no mesmo
 * arquivo. Aceita `Prisma.TransactionClient` (compatível também com o
 * `PrismaClient` de topo, que é um superconjunto estrutural).
 */
export async function upsertUser(
	prisma: Prisma.TransactionClient,
	user: UserProfileSeed,
	passwordHash: string,
): Promise<{ userId: string }> {
	const existing = await prisma.user.findUnique({
		where: { email: user.email },
		select: { id: true },
	});
	if (existing) return { userId: existing.id };

	const address = await prisma.address.create({
		data: {
			zip_code: user.address.zip_code,
			street: user.address.street,
			number: user.address.number,
			complement: user.address.complement,
			district: user.address.district,
			city: user.address.city,
			city_ibge_id: user.address.city_ibge_id,
			state: user.address.state,
			state_ibge_id: user.address.state_ibge_id,
			state_code: user.address.state_code,
			latitude: user.address.latitude,
			longitude: user.address.longitude,
		},
	});

	await prisma.$executeRaw`
		UPDATE "addresses"
		SET "location" = ST_SetSRID(ST_Point(${user.address.longitude}, ${user.address.latitude}), 4326)
		WHERE "id" = ${address.id}
	`;

	const created = await prisma.user.create({
		data: {
			email: user.email,
			password: passwordHash,
			profile: {
				create: {
					full_name: user.full_name,
					display_name: user.display_name,
					phone: user.phone,
					address_id: address.id,
				},
			},
		},
	});

	return { userId: created.id };
}
