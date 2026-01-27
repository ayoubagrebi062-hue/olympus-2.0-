-- OLYMPUS SELF-BUILD SCHEMA
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 5. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create builds table
CREATE TABLE IF NOT EXISTS public.builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  tier TEXT DEFAULT 'starter',
  status TEXT DEFAULT 'queued',
  description TEXT,
  target_users TEXT,
  tech_constraints TEXT,
  business_requirements TEXT,
  design_preferences TEXT,
  integrations TEXT[],
  current_phase TEXT,
  progress INTEGER DEFAULT 0,
  completed_phases TEXT[],
  completed_agents TEXT[],
  total_agents INTEGER,
  estimated_tokens INTEGER,
  estimated_cost DECIMAL(10,4),
  tokens_used INTEGER DEFAULT 0,
  actual_cost DECIMAL(10,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}',
  error TEXT
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_builds_project_id ON public.builds(project_id);
CREATE INDEX IF NOT EXISTS idx_builds_tenant_id ON public.builds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON public.builds(status);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);

-- 8. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- 9. Create policies for profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_service" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- 10. Create policies for teams
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (owner_id = auth.uid() OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "teams_service" ON public.teams FOR ALL USING (auth.role() = 'service_role');

-- 11. Create policies for team_members
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "team_members_service" ON public.team_members FOR ALL USING (auth.role() = 'service_role');

-- 12. Create policies for projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "projects_service" ON public.projects FOR ALL USING (auth.role() = 'service_role');

-- 13. Create policies for builds
CREATE POLICY "builds_select" ON public.builds FOR SELECT USING (tenant_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "builds_service" ON public.builds FOR ALL USING (auth.role() = 'service_role');

-- 14. Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15. Create triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS builds_updated_at ON public.builds;
CREATE TRIGGER builds_updated_at BEFORE UPDATE ON public.builds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
