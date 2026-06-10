import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/env/index.js";

const { url, secretKey } = getSupabaseConfig();

export const supabase = createClient(url, secretKey);
