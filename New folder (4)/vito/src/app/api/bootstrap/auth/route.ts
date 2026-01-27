import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// System user for self-build operations
const SYSTEM_USER_EMAIL = 'system@olympus.build';
const SYSTEM_USER_PASSWORD = process.env.SYSTEM_USER_PASSWORD || 'olympus_system_build_2026';

export async function GET() {
  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        authenticated: false,
        error: 'Supabase credentials not configured',
        duration: Date.now() - startTime,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try to sign in as system user first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: SYSTEM_USER_EMAIL,
      password: SYSTEM_USER_PASSWORD,
    });

    if (signInData?.user) {
      return NextResponse.json({
        authenticated: true,
        userId: signInData.user.id,
        email: signInData.user.email,
        isNew: false,
        duration: Date.now() - startTime,
      });
    }

    // If sign in failed, create the system user
    if (signInError) {
      logger.info('[Bootstrap Auth] Sign in failed, creating system user:', signInError.message);

      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: SYSTEM_USER_EMAIL,
        password: SYSTEM_USER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'OLYMPUS System',
          role: 'system',
        },
      });

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message.includes('already exists')) {
          // Try sign in again
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: SYSTEM_USER_EMAIL,
            password: SYSTEM_USER_PASSWORD,
          });

          if (retryError) {
            return NextResponse.json({
              authenticated: false,
              error: `Authentication failed: ${retryError.message}`,
              duration: Date.now() - startTime,
            });
          }

          return NextResponse.json({
            authenticated: true,
            userId: retryData.user?.id,
            email: retryData.user?.email,
            isNew: false,
            duration: Date.now() - startTime,
          });
        }

        return NextResponse.json({
          authenticated: false,
          error: `Failed to create system user: ${signUpError.message}`,
          duration: Date.now() - startTime,
        });
      }

      // Create profile for system user
      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          full_name: 'OLYMPUS System',
          avatar_url: null,
        });

        // Create system team
        const { data: teamData } = await supabase
          .from('teams')
          .insert({
            name: 'OLYMPUS System',
            owner_id: signUpData.user.id,
            plan: 'enterprise',
          })
          .select('id')
          .single();

        if (teamData) {
          await supabase.from('team_members').insert({
            team_id: teamData.id,
            user_id: signUpData.user.id,
            role: 'owner',
          });
        }
      }

      return NextResponse.json({
        authenticated: true,
        userId: signUpData.user?.id,
        email: signUpData.user?.email,
        isNew: true,
        duration: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      authenticated: false,
      error: 'Unknown authentication error',
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      authenticated: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
