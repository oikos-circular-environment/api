import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client.js";

interface UserSeed {
	full_name: string;
	display_name: string;
	email: string;
	phone: string;
	address: {
		zip_code: string;
		street: string;
		number: string;
		complement: string | null;
		district: string;
		latitude: number;
		longitude: number;
	};
}

const USERS: UserSeed[] = [
	{
		full_name: "Michelle Santos",
		display_name: "michelle.santos",
		email: "michelle@oikos.company",
		phone: "66987654321",
		address: {
			zip_code: "78700010",
			street: "Rua Fernando Corrêa da Costa",
			number: "1250",
			complement: "Apto 201",
			district: "Centro",
			latitude: -16.4712,
			longitude: -54.6356,
		},
	},
	{
		full_name: "Miguel Oliveira",
		display_name: "miguel.oliveira",
		email: "miguel@oikos.company",
		phone: "66976543210",
		address: {
			zip_code: "78735120",
			street: "Avenida Marechal Rondon",
			number: "830",
			complement: null,
			district: "Vila Aurora",
			latitude: -16.4678,
			longitude: -54.6372,
		},
	},
	{
		full_name: "Luiza Ferreira",
		display_name: "luiza.ferreira",
		email: "luiza@oikos.company",
		phone: "66965432109",
		address: {
			zip_code: "78740200",
			street: "Rua Dom Pedro II",
			number: "445",
			complement: "Casa 2",
			district: "Jardim Tropical",
			latitude: -16.4903,
			longitude: -54.5881,
		},
	},
	{
		full_name: "Rodolfo Costa",
		display_name: "rodolfo.costa",
		email: "rodolfo@oikos.company",
		phone: "66954321098",
		address: {
			zip_code: "78720350",
			street: "Rua Poxoréu",
			number: "102",
			complement: null,
			district: "Sagrada Família",
			latitude: -16.4795,
			longitude: -54.6125,
		},
	},
	{
		full_name: "Jaqueline Lima",
		display_name: "jaqueline.lima",
		email: "jaqueline@oikos.company",
		phone: "66943210987",
		address: {
			zip_code: "78710060",
			street: "Avenida Bandeirantes",
			number: "2780",
			complement: "Bloco B",
			district: "Parque Universitário",
			latitude: -16.4981,
			longitude: -54.6043,
		},
	},
];

const RONDONOPOLIS = {
	city: "Rondonópolis",
	city_ibge_id: 5107602,
	state: "Mato Grosso",
	state_ibge_id: 51,
	state_code: "MT",
};

export async function seedUsers(prisma: PrismaClient) {
	console.log("Seeding fictitious users...");

	const passwordHash = await bcrypt.hash("Test@123456", 10);

	for (const data of USERS) {
		const existing = await prisma.user.findUnique({
			where: { email: data.email },
		});

		if (existing) {
			console.log(`  skip: ${data.email} (already exists)`);
			continue;
		}

		try {
			await prisma.$transaction(async (tx) => {
				const user = await tx.user.create({
					data: { email: data.email, password: passwordHash },
				});

				const address = await tx.address.create({
					data: {
						zip_code: data.address.zip_code,
						street: data.address.street,
						number: data.address.number,
						complement: data.address.complement,
						district: data.address.district,
						city: RONDONOPOLIS.city,
						city_ibge_id: RONDONOPOLIS.city_ibge_id,
						state: RONDONOPOLIS.state,
						state_ibge_id: RONDONOPOLIS.state_ibge_id,
						state_code: RONDONOPOLIS.state_code,
						latitude: data.address.latitude,
						longitude: data.address.longitude,
					},
				});

				await tx.$executeRaw`
					UPDATE "addresses"
					SET "location" = ST_SetSRID(ST_Point(${data.address.longitude}, ${data.address.latitude}), 4326)
					WHERE "id" = ${address.id}
				`;

				await tx.profile.create({
					data: {
						full_name: data.full_name,
						display_name: data.display_name,
						phone: data.phone,
						user_id: user.id,
						address_id: address.id,
					},
				});
			});

			console.log(`  created: ${data.email} ✓`);
		} catch (err) {
			console.log(`  failed: ${data.email} ✗ (${(err as Error).message})`);
		}
	}
}
