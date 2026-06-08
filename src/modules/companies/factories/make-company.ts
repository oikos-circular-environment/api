import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { Company } from "@/modules/companies/dtos/companies-dto.js";

export function makeCompany(overrides?: Partial<Company>): Company {
	return {
		id: randomUUID(),
		user_id: randomUUID(),
		identity: faker.string.numeric(11),
		identity_type: "CPF",
		company_type: "COMPANY",
		status: true,
		business_name: faker.company.name(),
		corporate_name: `${faker.company.name()} LTDA`,
		email: faker.internet.email(),
		phones: [faker.string.numeric(11)],
		started_activity_in: faker.date.past({ years: 5 }),
		is_company_valid: false,
		avatar: null,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}
