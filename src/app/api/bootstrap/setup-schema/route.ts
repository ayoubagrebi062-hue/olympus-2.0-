/**
 * @AUTHORITY_CHECK - Database schema operations require authorization verification
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Schema setup errors tracker
const schemaErrors: { step: string; error: string; timestamp: string }[] = [];

function logError(step: string, error: string) {
  schemaErrors.push({
    step,
    error,
    timestamp: new Date().toISOString(),
  });
  logger.error(`[Schema Setup] ${step}: ${error}`);
}

// Extract project ref from Supabase URL
function getProjectRef(url: string): string | null {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

export async function POST() {
  const startTime = Date.now();
  const results: { step: string; success: boolean; error?: string; details?: string }[] = [];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured',
        duration: Date.now() - startTime,
      });
    }

    const projectRef = getProjectRef(supabaseUrl);
    if (!projectRef) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract project ref from Supabase URL',
        duration: Date.now() - startTime,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check current table status first
    const tables = ['profiles', 'teams', 'team_members', 'projects', 'builds'];
    const initialStatus: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      initialStatus[table] = !error || error.code !== '42P01';
    }

    results.push({
      step: 'initial_check',
      success: true,
      details: `Tables status: ${JSON.stringify(initialStatus)}`,
    });

    const missingTables = Object.entries(initialStatus)
      .filter(([, exists]) => !exists)
      .map(([name]) => name);

    if (missingTables.length === 0) {
      // All tables exist - enable RLS and create policies
      results.push({
        step: 'tables_exist',
        success: true,
        details: 'All tables already exist',
      });

      return NextResponse.json({
        success: true,
        tables: initialStatus,
        results,
        message: 'All tables verified successfully',
        duration: Date.now() - startTime,
      });
    }

    // Tables are missing - try to create via Supabase Management API
    logger.info(`[Schema Setup] Missing tables: ${missingTables.join(', ')}`);
    logger.info(`[Schema Setup] Project ref: ${projectRef}`);

    // The Supabase Management API requires a different auth token (not service role)
    // For self-hosted or automated setup, we need to use the Database URL directly
    // OR create the schema via the Supabase Dashboard

    // Let's provide detailed instructions and check if we can use pg_dump approach
    const schemaSQL = generateSchemaSQL();

    results.push({
      step: 'schema_generation',
      success: true,
      details: `Generated SQL for ${missingTables.length} missing tables`,
    });

    // Try using Supabase's SQL execution (requires database function or direct pg access)
    // Since we can't execute arbitrary SQL via REST API, we'll return the SQL to be run manually
    // BUT we'll also try the workaround of creating a temporary function

    // Check if we have the exec_sql function
    const { error: execSqlError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (!execSqlError) {
      // exec_sql function exists! Use it to create tables
      results.push({
        step: 'exec_sql_check',
        success: true,
        details: 'exec_sql function available',
      });

      // Execute each statement separately
      const statements = schemaSQL.split(';').filter(s => s.trim().length > 0);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim() + ';';
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
          logError(`statement_${i}`, error.message);
          results.push({
            step: `sql_statement_${i}`,
            success: false,
            error: error.message,
            details: stmt.substring(0, 100) + '...',
          });
        } else {
          results.push({
            step: `sql_statement_${i}`,
            success: true,
            details: stmt.substring(0, 50) + '...',
          });
        }
      }
    } else {
      // No exec_sql function - need to create it first or run SQL manually
      results.push({
        step: 'exec_sql_check',
        success: false,
        error: 'exec_sql function not available',
        details: 'Run the following in Supabase SQL Editor to enable programmatic SQL execution',
      });

      // Return the SQL that needs to be run manually
      return NextResponse.json({
        success: false,
        tables: initialStatus,
        missingTables,
        results,
        errors: schemaErrors,
        message:
          'Cannot execute SQL programmatically. Please run the schema SQL in Supabase Dashboard.',
        manualSetupRequired: true,
        setupSQL: schemaSQL,
        execSqlFunction: `
-- Run this FIRST to enable programmatic SQL execution:
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
        `,
        duration: Date.now() - startTime,
      });
    }

    // Final verification
    const finalStatus: Record<string, boolean> = {};
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      finalStatus[table] = !error || error.code !== '42P01';
    }

    const allTablesExist = Object.values(finalStatus).every(Boolean);

    return NextResponse.json({
      success: allTablesExist,
      tables: finalStatus,
      results,
      errors: schemaErrors,
      message: allTablesExist ? 'All tables created successfully' : 'Some tables failed to create',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('setup_schema', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errors: schemaErrors,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

function generateSchemaSQL(): string {
  return `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  tier TEXT DEFAULT 'starter',
  status TEXT DEFAULT 'queued',
  description TEXT,
  current_phase TEXT,
  progress INTEGER DEFAULT 0,
  total_agents INTEGER,
  tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}',
  error TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profiles_service" ON public.profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "teams_service" ON public.teams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "team_members_service" ON public.team_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "projects_service" ON public.projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "builds_service" ON public.builds FOR ALL USING (auth.role() = 'service_role');
  `.trim();
}

export async function GET() {
  // Return current schema status
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      configured: false,
      error: 'Supabase credentials not configured',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const tables = ['profiles', 'teams', 'team_members', 'projects', 'builds'];
  const tableStatus: Record<string, { exists: boolean; error?: string }> = {};

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      tableStatus[table] = {
        exists: error.code !== '42P01',
        error: error.message,
      };
    } else {
      tableStatus[table] = { exists: true };
    }
  }

  const allTablesExist = Object.values(tableStatus).every(t => t.exists);

  return NextResponse.json({
    configured: true,
    allTablesExist,
    tables: tableStatus,
    errors: schemaErrors,
  });
}
