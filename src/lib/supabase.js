import { createClient } from "@supabase/supabase-js";

// Browser-only Supabase client. Returns null when the project isn't configured
// (e.g. local preview without .env.local), so pages can fall back gracefully.
let client;
export function getSupabase() {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
