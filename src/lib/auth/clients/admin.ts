/**
 * OLYMPUS 2.0 - Admin/Service Role Client
 *
 * Server-side Supabase client with service role key for admin operations.
 * WARNING: Only use in trusted server-side contexts!
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Create a Supabase client with service role privileges.
 * This bypasses Row Level Security - use with caution!
 *
 * NOTE: Env vars are read at call time (not module load) to support
 * scripts that load dotenv after imports.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;
