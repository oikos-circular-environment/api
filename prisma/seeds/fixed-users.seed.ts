import bcrypt from "bcryptjs";
import type { Prisma } from "../../src/generated/prisma/client.js";
import { auth } from "../../src/modules/auth/providers/auth/better-auth/better-auth.js";
import { BetterAuthOrganizationProvider } from "../../src/modules/companies/providers/better-auth-organization-provider.js";
import { PrismaCompaniesRepository } from "../../src/modules/companies/repositories/prisma/companies-repository-prisma.js";
import { PrismaCompanyValidationRepository } from "../../src/modules/companies/repositories/prisma/company-validation-repository-prisma.js";
import { CreateCompanyUseCase } from "../../src/modules/companies/use-cases/create-company-use-case.js";

const BCRYPT_COST = 10;
const FIXED_SEED_PASSWORD =
	process.env.SEED_FIXED_USER_PASSWORD ?? "Oikos@123456";

async function upsertFixedUser(
	prisma: Prisma.TransactionClient,
	args: { email: string; name: string; role: "user" | "moderator" },
) {
	const existing = await prisma.user.findUnique({
		where: { email: args.email },
		select: { id: true },
	});
	if (existing) return { userId: existing.id };

	const created = await prisma.user.create({
		data: {
			email: args.email,
			name: args.name,
			email_verified: true,
			role: args.role,
			auth_source: "default",
			profile: {
				create: {
					full_name: args.name,
					display_name: args.name.split(" ")[0] ?? args.name,
					phone: "66999990000",
				},
			},
		},
	});

	const passwordHash = await bcrypt.hash(FIXED_SEED_PASSWORD, BCRYPT_COST);
	await prisma.account.create({
		data: {
			account_id: created.id,
			provider_id: "credential",
			password: passwordHash,
			user_id: created.id,
		},
	});

	return { userId: created.id };
}

export async function seedFixedUsers(prisma: Prisma.TransactionClient) {
	await upsertFixedUser(prisma, {
		email: "christiancnp@gmail.com",
		name: "Christian (usuário básico)",
		role: "user",
	});

	const { userId: moderatorId } = await upsertFixedUser(prisma, {
		email: "christian.cesar@oikos.company",
		name: "Christian Cesar",
		role: "moderator",
	});

	const existingCompany = await prisma.company.findFirst({
		where: { user_id: moderatorId },
		select: { id: true },
	});
	if (existingCompany) return;

	const companiesRepository = new PrismaCompaniesRepository();
	const validationRepository = new PrismaCompanyValidationRepository();
	const organizationProvider = new BetterAuthOrganizationProvider(auth);
	const createCompanyUseCase = new CreateCompanyUseCase(
		companiesRepository,
		validationRepository,
		organizationProvider,
	);

	await createCompanyUseCase.execute({
		userId: moderatorId,
		data: {
			identity: "12345678000199",
			identity_type: "CNPJ",
			company_type: "COLLECTOR",
			status: true,
			business_name: "Oikos Economia Circular",
			corporate_name: "Oikos Economia Circular LTDA",
			email: "christian.cesar@oikos.company",
			phones: ["66999990001"],
			started_activity_in: new Date("2020-01-01"),
		},
	});
}
