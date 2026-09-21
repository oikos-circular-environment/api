import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../../src/generated/prisma/client.js";
import { upsertUser } from "./upsert-user.js";

export const OWNER_EMAIL = "christian@oikos.company";
const OWNER_PASSWORD = "12345678";

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Seed@123456";

const OWNER = {
	email: OWNER_EMAIL,
	full_name: "Christian Oikos",
	display_name: "Christian",
	phone: "66999920010",
};

const MODERATOR = {
	email: "moderador@oikos.dev",
	full_name: "Moderador Oikos",
	display_name: "Moderação",
	phone: "66999920000",
};

const DEMO_USERS = [
	{
		email: "andrea.silva@example.com",
		full_name: "Andréa Silva",
		display_name: "Andréa",
		phone: "66999920001",
	},
	{
		email: "mariana.oliveira@example.com",
		full_name: "Mariana Oliveira",
		display_name: "Mariana",
		phone: "66999920002",
	},
	{
		email: "pedro.santos@example.com",
		full_name: "Pedro Santos",
		display_name: "Pedro",
		phone: "66999920003",
	},
	{
		email: "julia.ferreira@example.com",
		full_name: "Júlia Ferreira",
		display_name: "Júlia",
		phone: "66999920004",
	},
];

const DEMO_ADDRESS = {
	zip_code: "78020-300",
	street: "Av. Getúlio Vargas",
	number: "100",
	complement: null,
	district: "Centro",
	city: "Cuiabá",
	city_ibge_id: 5103403,
	state: "Mato Grosso",
	state_ibge_id: 51,
	state_code: "MT",
	latitude: -15.6014,
	longitude: -56.0979,
};

export interface SeedUsers {
	ownerId: string;
	ownerEmail: string;
	moderatorId: string;
	reportedUserIds: string[];
}

/** Garante a existência (idempotente por email) do usuário dono dos registros
 * (`christian@oikos.company`, senha padrão "12345678"), do moderador e dos
 * usuários demo usados como alvos de denúncia. */
export async function upsertSeedUsers(
	prisma: PrismaClient,
): Promise<SeedUsers> {
	const ownerPasswordHash = await bcrypt.hash(OWNER_PASSWORD, 10);
	const seedPasswordHash = await bcrypt.hash(SEED_PASSWORD, 10);

	const owner = await upsertUser(
		prisma,
		{ ...OWNER, address: DEMO_ADDRESS },
		ownerPasswordHash,
	);
	const moderator = await upsertUser(
		prisma,
		{ ...MODERATOR, address: DEMO_ADDRESS },
		seedPasswordHash,
	);

	const reportedUserIds: string[] = [];
	for (const user of DEMO_USERS) {
		const created = await upsertUser(
			prisma,
			{ ...user, address: DEMO_ADDRESS },
			seedPasswordHash,
		);
		reportedUserIds.push(created.userId);
	}

	return {
		ownerId: owner.userId,
		ownerEmail: OWNER_EMAIL,
		moderatorId: moderator.userId,
		reportedUserIds,
	};
}
