import { faker } from "@faker-js/faker";

/** Também usado por company-gap-filler.ts e company-seed-repairer.ts. */
export function generateFakePhone(): string {
	return `(${faker.string.numeric(2)}) 9${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
}
