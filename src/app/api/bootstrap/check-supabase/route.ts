import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
    }

    if (!supabaseAnonKey) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    }

    if (!supabaseServiceKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        connected: false,
        error: `Missing environment variables: ${errors.join(', ')}`,
        errors,
        duration: Date.now() - startTime,
      });
    }

    // Try to connect to Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test connection with a simple query
    const { error } = await supabase.from('builds').select('count').limit(1);

    if (error && !error.message.includes('does not exist')) {
      // Connection error (not table missing error)
      return NextResponse.json({
        connected: false,
        error: `Supabase connection failed: ${error.message}`,
        duration: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      connected: true,
      supabaseUrl,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        connected: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
