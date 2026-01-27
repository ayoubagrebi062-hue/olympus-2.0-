/**
 * OLYMPUS 2.0 - Supabase Clients
 *
 * Barrel exports for Supabase client types.
 *
 * IMPORTANT: Server-specific clients that use next/headers must be imported directly:
 * - Server components: import from '@/lib/auth/clients/server'
 * - Middleware: import from '@/lib/auth/clients/middleware'
 */

export {
  createBrowserSupabaseClient,
  getBrowserSupabaseClient,
  type BrowserSupabaseClient,
} from './browser';

export {
  createServiceRoleClient,
  type ServiceRoleClient,
} from './admin';

/**
 * Check if running on server.
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

// Re-export types only (not the functions that use next/headers)
export type { ServerSupabaseClient } from './server';
