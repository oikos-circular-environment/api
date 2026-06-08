import { beforeEach, describe, expect, it } from "vitest";
import {
	makeWasteCategory,
	makeWasteSubcategory,
} from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { ListWasteCategoriesUseCase } from "./list-waste-categories-use-case.js";

describe("list-waste-categories-use-case", () => {
	let repository: InMemoryWasteCategoriesRepository;
	let sut: ListWasteCategoriesUseCase;

	beforeEach(() => {
		repository = new InMemoryWasteCategoriesRepository();
		sut = new ListWasteCategoriesUseCase(repository);
	});

	it("returns empty array when no categories exist", async () => {
		const result = await sut.execute();

		expect(result).toStrictEqual([]);
	});

	it("returns all categories ordered by name", async () => {
		repository.items = [
			makeWasteCategory({ name: "Vidro" }),
			makeWasteCategory({ name: "Papel / Papelão" }),
			makeWasteCategory({ name: "Metal / Alumínio" }),
		];

		const result = await sut.execute();

		expect(result).toHaveLength(3);
		expect(result[0].name).toBe("Metal / Alumínio");
		expect(result[1].name).toBe("Papel / Papelão");
		expect(result[2].name).toBe("Vidro");
	});

	it("returns category with subcategories", async () => {
		const subcategory = makeWasteSubcategory({
			name: "Caixas de papelão",
			type: "INCLUDE",
		});
		repository.items = [makeWasteCategory({ subcategories: [subcategory] })];

		const result = await sut.execute();

		expect(result[0].subcategories).toHaveLength(1);
		expect(result[0].subcategories[0].name).toBe("Caixas de papelão");
		expect(result[0].subcategories[0].type).toBe("INCLUDE");
	});
});
