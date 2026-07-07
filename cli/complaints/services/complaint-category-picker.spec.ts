import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../../src/modules/wastes/data/waste-categories-base.js";
import { ComplaintCategoryPicker } from "./complaint-category-picker.js";

describe("complaint-category-picker", () => {
	it("picks between 1 and 3 category names", () => {
		const picker = new ComplaintCategoryPicker();

		for (let i = 0; i < 50; i++) {
			const names = picker.pick();
			expect(names.length).toBeGreaterThanOrEqual(1);
			expect(names.length).toBeLessThanOrEqual(3);
		}
	});

	it("never picks a name outside the canonical catalog", () => {
		const picker = new ComplaintCategoryPicker();
		const canonicalNames = new Set(CATEGORIES.map((c) => c.name));

		for (let i = 0; i < 50; i++) {
			for (const name of picker.pick()) {
				expect(canonicalNames.has(name)).toBe(true);
			}
		}
	});

	it("never repeats a category within the same pick", () => {
		const picker = new ComplaintCategoryPicker();

		for (let i = 0; i < 50; i++) {
			const names = picker.pick();
			expect(new Set(names).size).toBe(names.length);
		}
	});
});
