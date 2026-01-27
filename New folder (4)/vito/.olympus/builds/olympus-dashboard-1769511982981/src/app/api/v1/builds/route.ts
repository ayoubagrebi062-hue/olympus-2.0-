// src/app/api/v1/builds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { errorResponse, validationError } from '@/lib/api-utils';

// Zod schema for listing builds
const listBuildsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/v1/builds - List builds
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession();
    if (!session) {
      return errorResponse('AUTH_UNAUTHORIZED', 'Authentication required', 401);
    }

    // 2. Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listBuildsQuerySchema.safeParse(searchParams);

    if (!query.success) {
      return validationError(query.error);
    }

    const { page, pageSize } = query.data;

    // 3. Execute query with pagination
    const [builds, total] = await Promise.all([
      prisma.build.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.build.count({ where: { deletedAt: null } }),
    ]);

    // 4. Return response envelope
    return NextResponse.json({
      data: builds,
      meta: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
      },
    });

  } catch (error) {
    console.error('Error listing builds:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list builds', 500);
  }
}

// POST /api/v1/builds - Create build (if needed)
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession();
    if (!session) {
      return errorResponse('AUTH_UNAUTHORIZED', 'Authentication required', 401);
    }

    // 2. Parse and validate body (this may vary based on your requirements)
    const body = await request.json();
    // Assume body validation schema is defined similarly

    // 3. Create build in database
    const build = await prisma.build.create({
      data: {
        ...body,
        createdById: session.user.id,
      },
    });

    // 4. Return created resource
    return NextResponse.json({ data: build }, { status: 201 });

  } catch (error) {
    console.error('Error creating build:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create build', 500);
  }
}