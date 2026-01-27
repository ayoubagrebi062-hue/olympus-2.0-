/**
 * FIX AUTH IMPORT ISSUE
 *
 * The FORGE agent generated API routes that import from '@/lib/auth' but
 * SENTINEL didn't generate a proper auth utility file. This script fixes
 * both the build and the root cause.
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

// Complete auth utility file that exports what FORGE expects
const AUTH_UTILITY_CONTENT = `// src/lib/auth.ts
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The \`set\` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The \`delete\` method was called from a Server Component.
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
  } catch (error) {
    console.error('Error getting server session:', error);
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
    throw new Error(\`Role '\${role}' required\`);
  }
  return session;
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING AUTH IMPORT ISSUE FOR BUILD:', BUILD_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Load SENTINEL output (auth agent)
    const { data: sentinel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'sentinel')
      .single();

    if (!sentinel) {
      throw new Error('SENTINEL output not found');
    }

    // Add/replace src/lib/auth.ts
    const artifacts = sentinel.artifacts || [];
    const filteredArtifacts = artifacts.filter((a: any) => a.path !== 'src/lib/auth.ts');
    filteredArtifacts.push({
      type: 'code',
      path: 'src/lib/auth.ts',
      content: AUTH_UTILITY_CONTENT,
    });

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts: filteredArtifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'sentinel');

    if (error) throw new Error(`Failed to update SENTINEL output: ${error.message}`);

    console.log('[Fix] Added src/lib/auth.ts with getServerSession export');
    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! Auth utility file added.');
    console.log('Next: Run extract-and-validate.ts to test the build');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
