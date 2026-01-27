import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = ['profiles', 'teams', 'team_members', 'builds', 'projects'];

export async function GET() {
  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        valid: false,
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

    // Check each required table
    const tableResults: { name: string; exists: boolean; error?: string }[] = [];

    for (const tableName of REQUIRED_TABLES) {
      try {
        const { error } = await supabase.from(tableName).select('count').limit(1);

        if (error?.message.includes('does not exist')) {
          tableResults.push({ name: tableName, exists: false, error: 'Table does not exist' });
        } else if (error) {
          tableResults.push({ name: tableName, exists: false, error: error.message });
        } else {
          tableResults.push({ name: tableName, exists: true });
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        tableResults.push({ name: tableName, exists: false, error: errMessage });
      }
    }

    const existingTables = tableResults.filter(t => t.exists);
    const missingTables = tableResults.filter(t => !t.exists);

    // Schema is valid if at least builds table exists (minimal requirement)
    const buildsTableExists = tableResults.find(t => t.name === 'builds')?.exists;

    return NextResponse.json({
      valid: buildsTableExists || false,
      tables: existingTables.map(t => t.name),
      missingTables: missingTables.map(t => t.name),
      details: tableResults,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        valid: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
