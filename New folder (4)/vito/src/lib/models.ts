// Model types for repository pattern
// These map to Supabase database tables

export interface User {
  id: string;
  name: string | null;
  email: string;
  deletedAt?: Date | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  title: string;
  userId: string;
  deletedAt?: Date | null;
  created_at?: string;
  updated_at?: string;
}

export interface Build {
  id: string;
  project_id: string;
  tenant_id: string;
  status: string;
  progress: number;
  tier?: string;
  created_at?: string;
  completed_at?: string | null;
}
