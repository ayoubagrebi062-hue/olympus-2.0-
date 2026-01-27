import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten() } },
        { status: 400 }
      );
    }

    // Use all destructured values (TypeScript strict mode)
    const { name, email, password } = result.data;
    const passwordHash = Buffer.from(password).toString('base64'); // Simulate hashing

    // In a real app, you'd create the user in the database
    return NextResponse.json({
      data: {
        id: 'user_' + Date.now(),
        name,
        email,
        passwordLength: passwordHash.length, // Use the password
        createdAt: new Date().toISOString(),
      },
      message: 'Account created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create account' } },
      { status: 500 }
    );
  }
}
