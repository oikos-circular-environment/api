import { env } from "@/env/index.js";
import { MinioBucket } from "./minio/minio-bucket.js";
import type { StorageProvider } from "./storage.js";
import { SupabaseBucket } from "./supabase/supabase-bucket.js";

export function makeStorageProvider(): StorageProvider {
	if (env.STORAGE_PROVIDER === "supabase") {
		return new SupabaseBucket();
	}
	return new MinioBucket();
}
