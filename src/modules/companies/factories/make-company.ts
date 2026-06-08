import { faker } from "@faker-js/faker";
import type {
	Company,
	CreateCompany,
} from "@/modules/companies/dtos/companies-dto.js";

export function makeCompanyInput(
	overrides?: Partial<CreateCompany>,
): CreateCompany {
	return {
		user_id: faker.string.uuid(),
		identity: faker.string.numeric(11),
		identity_type: "CPF",
		company_type: "COMPANY",
		status: true,
		business_name: faker.company.name(),
		corporate_name: `${faker.company.name()} LTDA`,
		email: faker.internet.email(),
		phones: [faker.string.numeric(11)],
		started_activity_in: faker.date.past({ years: 5 }),
		...overrides,
	};
}

export function makeCompany(overrides?: Partial<Company>): Company {
	const input = makeCompanyInput();
	return {
		...input,
		id: faker.string.uuid(),
		is_company_valid: false,
		avatar: null,
		created_at: faker.date.past(),
		updated_at: faker.date.past(),
		...overrides,
	};
}
