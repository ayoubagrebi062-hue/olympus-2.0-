/**
 * FIX ALL AUTH FILES
 *
 * Fix auth.ts in both FORGE and SENTINEL to avoid lint errors
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIXED_AUTH = `// src/lib/auth.ts
// Auth utilities for OLYMPUS - Supabase Auth integration

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface Session {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The set method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The delete method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: session.user.role || 'user',
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user || null;
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(role: string): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== role) {
    throw new Error('Role ' + role + ' required');
  }
  return session;
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING ALL AUTH.TS FILES');
  console.log('='.repeat(60));

  try {
    // Fix FORGE auth.ts
    console.log('[1] Fixing FORGE auth.ts...');
    const { data: forge } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge')
      .single();

    if (forge) {
      let forgeArtifacts = forge.artifacts || [];
      forgeArtifacts = forgeArtifacts.filter((a: any) => a.path !== 'src/lib/auth.ts');
      forgeArtifacts.push({ type: 'code', path: 'src/lib/auth.ts', content: FIXED_AUTH });

      const { error } = await supabase
        .from('build_agent_outputs')
        .update({ artifacts: forgeArtifacts, updated_at: new Date().toISOString() })
        .eq('build_id', BUILD_ID)
        .eq('agent_id', 'forge');

      if (error) throw new Error('FORGE update failed: ' + error.message);
      console.log('[1] Fixed: FORGE auth.ts');
    }

    // Fix SENTINEL auth.ts (or remove it since FORGE has the main one)
    console.log('[2] Removing duplicate SENTINEL auth.ts...');
    const { data: sentinel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'sentinel')
      .single();

    if (sentinel) {
      let sentinelArtifacts = sentinel.artifacts || [];
      // Remove auth.ts from SENTINEL (keep auth/config.ts and auth/roles.ts)
      sentinelArtifacts = sentinelArtifacts.filter((a: any) => a.path !== 'src/lib/auth.ts');

      const { error } = await supabase
        .from('build_agent_outputs')
        .update({ artifacts: sentinelArtifacts, updated_at: new Date().toISOString() })
        .eq('build_id', BUILD_ID)
        .eq('agent_id', 'sentinel');

      if (error) throw new Error('SENTINEL update failed: ' + error.message);
      console.log('[2] Removed: SENTINEL auth.ts (keeping FORGE version)');
    }

    console.log('='.repeat(60));
    console.log('SUCCESS!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
