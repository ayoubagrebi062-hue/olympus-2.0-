/**
 * FIX REMAINING LINT ISSUES
 *
 * Fix auth.ts and cleanup-sessions.ts lint errors
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

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? '',
        role: session.user.role,
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  } catch (_error) {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
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

const FIXED_CLEANUP_SESSIONS = `import { db } from '@/lib/db';

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  return { deleted: result.count, cutoff: cutoff.toISOString() };
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING REMAINING LINT ISSUES');
  console.log('='.repeat(60));

  try {
    // Fix auth.ts in FORGE
    console.log('[1] Fixing auth.ts...');
    const { data: forge } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge')
      .single();

    if (!forge) throw new Error('FORGE output not found');

    let forgeArtifacts = forge.artifacts || [];
    forgeArtifacts = forgeArtifacts.filter((a: any) => a.path !== 'src/lib/auth.ts');
    forgeArtifacts.push({ type: 'code', path: 'src/lib/auth.ts', content: FIXED_AUTH });

    const { error: forgeError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: forgeArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge');

    if (forgeError) throw new Error('Failed to update FORGE: ' + forgeError.message);
    console.log('[1] Fixed: auth.ts');

    // Fix cleanup-sessions.ts in CRON
    console.log('[2] Fixing cleanup-sessions.ts...');
    const { data: cron } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron')
      .single();

    if (!cron) throw new Error('CRON output not found');

    let cronArtifacts = cron.artifacts || [];
    cronArtifacts = cronArtifacts.filter((a: any) => a.path !== 'src/jobs/handlers/cleanup-sessions.ts');
    cronArtifacts.push({ type: 'code', path: 'src/jobs/handlers/cleanup-sessions.ts', content: FIXED_CLEANUP_SESSIONS });

    const { error: cronError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: cronArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron');

    if (cronError) throw new Error('Failed to update CRON: ' + cronError.message);
    console.log('[2] Fixed: cleanup-sessions.ts');

    console.log('='.repeat(60));
    console.log('SUCCESS!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
