import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
export const supabaseUrl = env.VITE_SUPABASE_URL ?? "";
export const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseConnected = Boolean(supabase);
