import { StorageApiError } from "@supabase/supabase-js";
import { env } from "@/env/index.js";
import type { StorageFile, StorageProvider } from "../storage.js";
import { supabase } from "./supabase.js";

/**
 * SupabaseBucket contém 3 diretórios dentro do bucket "oikos":
 * - "profiles": para armazenar as fotos de perfil dos usuários.
 * - "companies": para armazenar os logos das empresas.
 * - "complaints": para armazenar os arquivos relacionados às denúncias .
 */

export class SupabaseBucket implements StorageProvider {
	async uploadFile(
		filePath: string,
		fileContent: Buffer,
	): Promise<StorageFile | null> {
		try {
			const bucket = await supabase.storage
				.from(env.SUPABASE_OIKOS_PROFILES_BUCKET)
				.upload(filePath, fileContent, {
					upsert: true,
				});

			return bucket.data as StorageFile;
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
			return null;
		}
	}

	async deleteFile(filePath: string): Promise<void> {
		try {
			await supabase.storage
				.from(env.SUPABASE_OIKOS_PROFILES_BUCKET)
				.remove([filePath]);
		} catch (error) {
			if (error instanceof StorageApiError) {
				console.error(error.toJSON());
			}
		}
	}

	async getFileUrl(filePath: string): Promise<{ url: string }> {
		try {
			const bucket = supabase.storage
				.from(env.SUPABASE_OIKOS_PROFILES_BUCKET)
				.getPublicUrl(filePath);
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
			const bucket = await supabase.storage
				.from(env.SUPABASE_OIKOS_PROFILES_BUCKET)
				.exists(filePath);
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
			const file = await supabase.storage
				.from(env.SUPABASE_OIKOS_PROFILES_BUCKET)
				.download(filePath);
			const arrayBuffer = await file.data!.arrayBuffer();
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
