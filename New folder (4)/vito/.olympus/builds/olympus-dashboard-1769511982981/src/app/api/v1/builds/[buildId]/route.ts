// src/app/api/v1/builds/[buildId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { notFoundError, unauthorizedError } from '@/lib/api-utils';

// GET /api/v1/builds/[buildId] - Get single build
export async function GET(request: NextRequest, { params }: { params: { buildId: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return unauthorizedError();
    }

    const { buildId } = params;

    const build = await prisma.build.findFirst({
      where: { id: buildId, deletedAt: null },
    });

    if (!build) {
      return notFoundError('Build');
    }

    return NextResponse.json({ data: build });

  } catch (error) {
    console.error('Error getting build:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get build' } }, { status: 500 });
  }
}

// GET /api/v1/builds/[buildId]/stream - SSE for real-time updates
export async function GET_STREAM(request: NextRequest, { params }: { params: { buildId: string } }) {
  // Implement server-sent events for real-time updates
  // This function needs to handle SSE logic
}