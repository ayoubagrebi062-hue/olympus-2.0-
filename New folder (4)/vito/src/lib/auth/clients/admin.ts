/**
 * OLYMPUS 2.0 - Admin/Service Role Client
 *
 * Server-side Supabase client with service role key for admin operations.
 * WARNING: Only use in trusted server-side contexts!
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create a Supabase client with service role privileges.
 * This bypasses Row Level Security - use with caution!
 */
export function createServiceRoleClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;
