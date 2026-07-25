import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// When env vars aren't set (e.g. running the demo without a backend yet),
// this client is still constructed against placeholder values so imports
// don't crash — callers must check `isSupabaseConfigured` before using it,
// which every function in src/lib/api/ already does.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
