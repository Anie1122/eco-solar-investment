import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Create the client without crashing the app when env vars are missing in production.
// This prevents a white-screen "client-side exception" at startup.
const fallbackUrl = "https://placeholder.supabase.co";
const fallbackAnonKey = "placeholder-anon-key";

if (!hasSupabaseEnv && typeof window !== "undefined") {
  console.error(
    "Supabase env is missing in this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(
  hasSupabaseEnv ? supabaseUrl : fallbackUrl,
  hasSupabaseEnv ? supabaseAnonKey : fallbackAnonKey
);

// Optional helper (use inside pages/actions before making requests)
export function assertSupabaseEnv() {
  if (!hasSupabaseEnv) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
    );
  }
}
