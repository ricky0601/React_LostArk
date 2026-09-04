import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) return null;

  if (!browserClient) {
    try {
      browserClient = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
        },
      });
    } catch {
      return null;
    }
  }

  return browserClient;
};
