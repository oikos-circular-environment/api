import { StorageApiError } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/env/index.js";
import type { StorageFile, StorageProvider } from "../storage.js";
import { supabase } from "./supabase.js";

/**
 * SupabaseBucket contém 3 diretórios dentro do bucket "oikos":
 * - "profiles": para armazenar as fotos de perfil dos usuários.
 * - "companies": para armazenar os logos das empresas.
 * - "complaints": para armazenar os arquivos relacionados às denúncias .
 */

const { bucket: BUCKET } = getSupabaseConfig();

export class SupabaseBucket implements StorageProvider {
	async uploadFile(
		filePath: string,
		fileContent: Buffer,
	): Promise<StorageFile | null> {
		try {
			const { data, error } = await supabase.storage
				.from(BUCKET)
				.upload(filePath, fileContent, {
					upsert: true,
				});

			if (error) {
				console.error(error.toJSON());
				return null;
			}

			return data as StorageFile;
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
			return null;
		}
	}

	async deleteFile(filePath: string): Promise<void> {
		try {
			await supabase.storage.from(BUCKET).remove([filePath]);
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
		}
	}

	async getFileUrl(filePath: string): Promise<{ url: string }> {
		try {
			const bucket = supabase.storage.from(BUCKET).getPublicUrl(filePath);
			return { url: bucket.data.publicUrl };
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
			throw new Error("Failed to get file URL");
		}
	}

	async checkFileExists(filePath: string): Promise<boolean> {
		try {
			const bucket = await supabase.storage.from(BUCKET).exists(filePath);
			return bucket.data;
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
			return false;
		}
	}

	async convertFileToBase64(filePath: string): Promise<string> {
		try {
			const file = await supabase.storage.from(BUCKET).download(filePath);
			if (!file.data) throw new Error("File download returned no data");
			const arrayBuffer = await file.data.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			return buffer.toString("base64");
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
			throw new Error("Failed to convert file to base64");
		}
	}
}
