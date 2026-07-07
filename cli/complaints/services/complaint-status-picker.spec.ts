import { describe, expect, it } from "vitest";
import { ComplaintStatusPicker } from "./complaint-status-picker.js";

describe("complaint-status-picker", () => {
	it("produces a plausible distribution across all 3 statuses over many calls", () => {
		const picker = new ComplaintStatusPicker();
		const seen = new Set<string>();

		for (let i = 0; i < 200; i++) {
			seen.add(picker.pick());
		}

		expect(seen).toEqual(new Set(["OPEN", "RESOLVED", "CANCELED"]));
	});

	it("never returns a value outside the known statuses", () => {
		const picker = new ComplaintStatusPicker();

		for (let i = 0; i < 200; i++) {
			expect(["OPEN", "RESOLVED", "CANCELED"]).toContain(picker.pick());
		}
	});
});
