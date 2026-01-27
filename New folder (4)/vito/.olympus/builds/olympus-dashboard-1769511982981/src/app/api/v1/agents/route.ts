// src/app/api/v1/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// GET /api/v1/agents - Get agent registry
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const agents = await prisma.agent.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: agents });

  } catch (error) {
    console.error('Error getting agents:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get agents' } }, { status: 500 });
  }
}