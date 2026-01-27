/**
 * OLYMPUS 2.0 - Browser Supabase Client
 *
 * Client-side Supabase client for use in React components.
 * Uses PKCE flow (Supabase default) for secure auth.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

// NOTE: Don't throw at module load time - defer to function call
// This allows server-side scripts to import this module without crashing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton to prevent multiple client instances
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get browser Supabase client (singleton).
 * Uses PKCE flow - must match Supabase project settings.
 */
export function getBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  // Validate at call time, not module load time
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL - this client is for browser use only');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - this client is for browser use only');
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return browserClient;
}

// Alias for backwards compatibility
export const createBrowserSupabaseClient = getBrowserSupabaseClient;

export type BrowserSupabaseClient = ReturnType<typeof getBrowserSupabaseClient>;
