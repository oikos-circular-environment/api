import { faker } from "@faker-js/faker";
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js";
import type {
	Measurement,
	ServiceSeed,
	WasteSeed,
} from "../entities/company-seed.js";

const RECYCLER_CATEGORY_NAMES = [
	"Papel / Papelão",
	"Plástico",
	"Metal / Alumínio",
	"Vidro",
	"Madeira",
	"Têxtil / Roupas / Tecidos",
	"Borracha / Pneus",
	"Eletroeletrônicos (REEE)",
	"Óleo Vegetal Usado (de cozinha)",
];

const ECOPONTO_EXTRA_CATEGORY_NAMES = [
	"Construção Civil e Demolição (RCD)",
	"Pilhas e Baterias",
	"Lâmpadas",
	"Óleo Mineral / Lubrificante",
	"Resíduos Orgânicos",
];

/** Filtra por nome contra a lista canônica — nunca inventa categoria nova. */
function resolvePool(names: string[]): string[] {
	const wanted = new Set(names);
	const resolved = CATEGORIES.filter((category) =>
		wanted.has(category.name),
	).map((category) => category.name);

	const missing = names.filter((name) => !resolved.includes(name));
	if (missing.length > 0) {
		throw new Error(
			`Categorias não encontradas em CATEGORIES: ${missing.join(", ")}`,
		);
	}

	return resolved;
}

export const RECYCLER_CATEGORY_POOL = resolvePool(RECYCLER_CATEGORY_NAMES);
export const ECOPONTO_CATEGORY_POOL = resolvePool([
	...RECYCLER_CATEGORY_NAMES,
	...ECOPONTO_EXTRA_CATEGORY_NAMES,
]);

const MIN_ITEMS = 2;
const MAX_ITEMS = 6;

export class WasteServiceGenerator {
	generateWastes(pool: string[]): WasteSeed[] {
		return this.pickCategories(pool).map((categoryName) => ({
			name: categoryName,
			description: `Coleta de resíduos: ${categoryName}`,
			price: faker.number.float({ min: 0.2, max: 5, fractionDigits: 2 }),
			unit: "KG" as Measurement,
			waste_category_name: categoryName,
			quantity: faker.number.float({ min: 10, max: 1000, fractionDigits: 1 }),
		}));
	}

	generateServices(pool: string[]): ServiceSeed[] {
		return this.pickCategories(pool).map((categoryName) => ({
			name: `Coleta de ${categoryName}`,
			description: `Serviço de coleta e transporte de ${categoryName}`,
			price: faker.number.float({ min: 50, max: 300, fractionDigits: 2 }),
			unit: "UNIT" as Measurement,
			waste_category_name: categoryName,
			quantity: 1,
		}));
	}

	private pickCategories(pool: string[]): string[] {
		const count = faker.number.int({
			min: Math.min(MIN_ITEMS, pool.length),
			max: Math.min(MAX_ITEMS, pool.length),
		});

		return faker.helpers.arrayElements(pool, count);
	}
}
