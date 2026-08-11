import { randomUUID } from "node:crypto";
import type { StorageFile, StorageProvider } from "../storage.js";

export class InMemoryStorageProvider implements StorageProvider {
	public readonly items = new Map<string, Buffer>();

	async uploadFile(
		filePath: string,
		fileContent: Buffer,
	): Promise<StorageFile | null> {
		this.items.set(filePath, fileContent);

		return {
			id: randomUUID(),
			fullPath: filePath,
			path: filePath,
		};
	}

	async deleteFile(filePath: string): Promise<void> {
		this.items.delete(filePath);
	}

	async getFileUrl(filePath: string): Promise<{ url: string }> {
		return { url: `https://in-memory.storage/${filePath}` };
	}

	async checkFileExists(filePath: string): Promise<boolean> {
		return this.items.has(filePath);
	}

	async convertFileToBase64(filePath: string): Promise<string> {
		const file = this.items.get(filePath);

		if (!file) {
			throw new Error("File not found");
		}

		return file.toString("base64");
	}
}
