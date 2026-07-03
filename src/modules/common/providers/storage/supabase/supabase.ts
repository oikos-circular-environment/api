import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/env/index.js";

export function makeSupabaseClient() {
	const { url, secretKey } = getSupabaseConfig();
	return createClient(url, secretKey);
}
