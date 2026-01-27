/**
 * DEBUG ARTIFACTS API - NO AUTH REQUIRED
 * For viewing build artifacts - REMOVE IN PRODUCTION
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/clients';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get('buildId');

  if (!buildId) {
    return NextResponse.json(
      {
        success: false,
        error: 'buildId parameter required',
      },
      { status: 400 }
    );
  }

  console.log('[DEBUG ARTIFACTS] Loading artifacts for build:', buildId);

  try {
    const supabase = createServiceRoleClient();

    // Get build
    const { data: build, error: buildError } = await supabase
      .from('builds')
      .select('*')
      .eq('id', buildId)
      .single();

    if (buildError) {
      console.log('[DEBUG ARTIFACTS] Build not in DB, checking in-memory...');
    }

    // Get artifacts
    const { data: artifacts, error: artError } = await supabase
      .from('build_artifacts')
      .select('*')
      .eq('build_id', buildId)
      .order('created_at', { ascending: true });

    if (artError) {
      console.log('[DEBUG ARTIFACTS] Artifacts error:', artError.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        build: build || { id: buildId, status: 'unknown' },
        artifacts: artifacts || [],
        artifactCount: artifacts?.length || 0,
      },
    });
  } catch (err: any) {
    console.error('[DEBUG ARTIFACTS] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
