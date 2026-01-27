import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/auth/token-store';

// GET: Verify token is valid
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = tokenStore.verify(token);

    return NextResponse.json({
      valid: result.valid,
      email: result.valid ? result.email : undefined
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Reset password with token
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify token
    const result = tokenStore.verify(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // In a real app, you would:
    // 1. Hash the new password
    // 2. Update it in the database for the user with result.email
    // 3. Invalidate the token

    // For demo purposes, we'll just invalidate the token
    // and simulate success
    tokenStore.delete(token);

    // In production with Supabase:
    // await supabase.auth.admin.updateUserById(userId, { password })

    console.log(`Password reset for ${result.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
