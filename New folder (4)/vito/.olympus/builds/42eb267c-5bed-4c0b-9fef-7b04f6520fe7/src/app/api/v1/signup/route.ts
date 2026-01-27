// src/app/api/v1/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AppError, ValidationError, UnauthorizedError } from '@/lib/errors';
import { getServerSession } from '@/lib/auth';

// Zod schemas for this endpoint
const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  terms: z.boolean().refine(val => val === true, { message: 'You must accept the terms and conditions' }),
});

// POST /api/v1/signup - Create a new user account
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate body
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid request body', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { name, email, password } = parsed.data;

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'USER_ALREADY_EXISTS', message: 'User with this email already exists' } },
        { status: 409 }
      );
    }

    // 3. Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        // Additional user fields can be added here
      },
    });

    // 4. Return created resource
    return NextResponse.json(
      { data: user },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error during signup:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } },
      { status: 500 }
    );
  }
}