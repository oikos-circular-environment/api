import { createClient } from "@supabase/supabase-js";
import { env } from "@/env/index.js";

// Create a single supabase client for interacting with your database
// Consulting https://supabase.com/docs/reference/javascript/initializing

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
