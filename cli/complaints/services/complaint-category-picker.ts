import { faker } from "@faker-js/faker";
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js";

const ALL_CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

/**
 * Escolhe 1-3 categorias do catálogo canônico (`waste-categories-base.ts`) —
 * mesma fonte de verdade usada pelo pipeline de empresas, nunca inventa nome
 * fora dela. `ComplaintWasteCategory` é só uma tabela de junção (sem preço/
 * quantidade), por isso não reaproveita `WasteServiceGenerator`.
 */
export class ComplaintCategoryPicker {
	pick(): string[] {
		return faker.helpers.arrayElements(ALL_CATEGORY_NAMES, { min: 1, max: 3 });
	}
}
