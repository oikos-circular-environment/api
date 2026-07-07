import { describe, expect, it } from "vitest";
import { ComplaintAttachmentPicker } from "./complaint-attachment-picker.js";

const FAKE_ASSETS = ["a.jpg", "b.jpg", "c.jpg"];

describe("complaint-attachment-picker", () => {
	it("picks between 0 and 3 attachments", () => {
		const picker = new ComplaintAttachmentPicker(FAKE_ASSETS);

		for (let i = 0; i < 50; i++) {
			const attachments = picker.pick();
			expect(attachments.length).toBeGreaterThanOrEqual(0);
			expect(attachments.length).toBeLessThanOrEqual(3);
		}
	});

	it("never repeats the same asset file within one pick", () => {
		const picker = new ComplaintAttachmentPicker(FAKE_ASSETS);

		for (let i = 0; i < 50; i++) {
			const files = picker.pick().map((a) => a.asset_file);
			expect(new Set(files).size).toBe(files.length);
		}
	});

	it("always types attachments as PHOTO", () => {
		const picker = new ComplaintAttachmentPicker(FAKE_ASSETS);

		for (let i = 0; i < 20; i++) {
			for (const attachment of picker.pick()) {
				expect(attachment.type).toBe("PHOTO");
			}
		}
	});

	it("produces a plausible distribution across pick counts over many calls", () => {
		const picker = new ComplaintAttachmentPicker(FAKE_ASSETS);
		const seenCounts = new Set<number>();

		for (let i = 0; i < 200; i++) {
			seenCounts.add(picker.pick().length);
		}

		expect(seenCounts.has(0)).toBe(true);
		expect(seenCounts.has(1)).toBe(true);
	});

	it("defaults to reading the real cli/assets directory", () => {
		const picker = new ComplaintAttachmentPicker();

		// não afirma a contagem exata (assets podem crescer no futuro), só que
		// o diretório real foi lido com sucesso e tem pelo menos as amostras
		// esperadas.
		let sawAttachment = false;
		for (let i = 0; i < 100 && !sawAttachment; i++) {
			if (picker.pick().length > 0) sawAttachment = true;
		}
		expect(sawAttachment).toBe(true);
	});
});
