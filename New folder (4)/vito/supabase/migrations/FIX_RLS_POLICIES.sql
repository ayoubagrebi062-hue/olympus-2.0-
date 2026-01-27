-- FIX RLS POLICIES FOR SERVICE ROLE
-- Run this in Supabase SQL Editor to allow service role full access

-- First, drop existing policies that might be blocking
DROP POLICY IF EXISTS "profiles_service" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "teams_service" ON public.teams;
DROP POLICY IF EXISTS "teams_all" ON public.teams;
DROP POLICY IF EXISTS "team_members_service" ON public.team_members;
DROP POLICY IF EXISTS "team_members_all" ON public.team_members;
DROP POLICY IF EXISTS "projects_service" ON public.projects;
DROP POLICY IF EXISTS "projects_all" ON public.projects;
DROP POLICY IF EXISTS "builds_service" ON public.builds;
DROP POLICY IF EXISTS "builds_all" ON public.builds;

-- Create permissive policies for service role (SELECT, INSERT, UPDATE, DELETE)
-- PROFILES
CREATE POLICY "profiles_service_select" ON public.profiles FOR SELECT TO service_role USING (true);
CREATE POLICY "profiles_service_insert" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "profiles_service_update" ON public.profiles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "profiles_service_delete" ON public.profiles FOR DELETE TO service_role USING (true);

-- TEAMS
CREATE POLICY "teams_service_select" ON public.teams FOR SELECT TO service_role USING (true);
CREATE POLICY "teams_service_insert" ON public.teams FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "teams_service_update" ON public.teams FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "teams_service_delete" ON public.teams FOR DELETE TO service_role USING (true);

-- TEAM_MEMBERS
CREATE POLICY "team_members_service_select" ON public.team_members FOR SELECT TO service_role USING (true);
CREATE POLICY "team_members_service_insert" ON public.team_members FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "team_members_service_update" ON public.team_members FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "team_members_service_delete" ON public.team_members FOR DELETE TO service_role USING (true);

-- PROJECTS
CREATE POLICY "projects_service_select" ON public.projects FOR SELECT TO service_role USING (true);
CREATE POLICY "projects_service_insert" ON public.projects FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "projects_service_update" ON public.projects FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "projects_service_delete" ON public.projects FOR DELETE TO service_role USING (true);

-- BUILDS
CREATE POLICY "builds_service_select" ON public.builds FOR SELECT TO service_role USING (true);
CREATE POLICY "builds_service_insert" ON public.builds FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "builds_service_update" ON public.builds FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "builds_service_delete" ON public.builds FOR DELETE TO service_role USING (true);

-- Verification
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
