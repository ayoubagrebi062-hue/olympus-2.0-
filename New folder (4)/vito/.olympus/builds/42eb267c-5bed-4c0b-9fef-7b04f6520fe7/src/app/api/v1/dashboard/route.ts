// src/app/api/v1/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v1/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Fetch user-specific data for the dashboard
    const userId = session.user.id;
    const builds = await prisma.build.findMany({
      where: { createdById: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalBuilds: await prisma.build.count({ where: { createdById: userId, deletedAt: null } }),
      // Additional stats can be computed here
    };

    // Return response
    return NextResponse.json({ data: { builds, stats } });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard data' } },
      { status: 500 }
    );
  }
}