/**
 * OLYMPUS 2.0 - Database Types
 *
 * TypeScript types for Supabase schema.
 * Covers all tables from migrations.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Enum types
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectRole = 'admin' | 'editor' | 'viewer';
export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type BuildTier = 'starter' | 'professional' | 'ultimate' | 'enterprise';
export type BuildStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type BuildPhase =
  | 'planning'
  | 'design'
  | 'frontend'
  | 'backend'
  | 'testing'
  | 'review'
  | 'complete';
export type ArtifactType =
  | 'component'
  | 'page'
  | 'api'
  | 'hook'
  | 'util'
  | 'type'
  | 'style'
  | 'config'
  | 'test'
  | 'doc'
  | 'asset';

export interface Database {
  public: {
    Tables: {
      // ==================== USER & AUTH ====================
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          timezone: string;
          locale: string;
          preferences: Json;
          is_active: boolean;
          email_verified_at: string | null;
          last_seen_at: string | null;
          onboarding_completed: boolean;
          onboarding_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar: string | null;
          timezone: string | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: ('read' | 'write' | 'admin')[];
          last_used_at: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: ('read' | 'write' | 'admin')[];
          expires_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['api_keys']['Row']>;
      };

      // ==================== TENANTS ====================
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          brand_color: string | null;
          billing_email: string | null;
          settings: Json;
          metadata: Json;
          is_active: boolean;
          plan: PlanTier;
          trial_ends_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tenants']['Row']> & {
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Row']>;
      };
      tenant_members: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: TenantRole;
          custom_permissions: string[] | null;
          invited_by: string | null;
          joined_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tenant_members']['Row']> & {
          tenant_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_members']['Row']>;
      };
      tenant_invitations: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: TenantRole;
          token: string;
          status: InvitationStatus;
          invited_by: string;
          message: string | null;
          expires_at: string;
          responded_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tenant_invitations']['Row']> & {
          tenant_id: string;
          email: string;
          token: string;
          invited_by: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_invitations']['Row']>;
      };

      // ==================== PROJECTS ====================
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          slug: string;
          description: string | null;
          framework: string;
          settings: Json;
          metadata: Json;
          is_archived: boolean;
          archived_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['projects']['Row']> & {
          tenant_id: string;
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: ProjectRole;
          created_at: string;
          updated_at: string;
        };
        Insert: { project_id: string; user_id: string; role?: ProjectRole };
        Update: Partial<Database['public']['Tables']['project_members']['Row']>;
      };

      // ==================== BUILDS ====================
      builds: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          status: BuildStatus;
          tier: BuildTier;
          description: string | null;
          progress: number;
          phase: BuildPhase;
          current_phase: BuildPhase | null;
          current_agent: string | null;
          prompt: string | null;
          iteration: number;
          tokens_used: number;
          actual_cost: number;
          estimated_cost: number;
          estimated_tokens: number;
          total_agents: number;
          error_message: string | null;
          error: string | null;
          metadata: Json;
          created_by: string;
          started_at: string | null;
          completed_at: string | null;
          canceled_at: string | null;
          canceled_by: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
          // AI build fields (shared table)
          target_users: string | null;
          tech_constraints: string | null;
          business_requirements: string | null;
          design_preferences: string | null;
          integrations: string[] | null;
          completed_phases: string[] | null;
          completed_agents: string[] | null;
        };
        Insert: Partial<Database['public']['Tables']['builds']['Row']> & {
          project_id: string;
          tenant_id: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['builds']['Row']>;
      };
      build_logs: {
        Row: {
          id: string;
          build_id: string;
          level: string;
          message: string;
          step: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['build_logs']['Row']> & {
          build_id: string;
          message: string;
        };
        Update: Partial<Database['public']['Tables']['build_logs']['Row']>;
      };

      // ==================== AI BUILDS ====================
      ai_builds: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          tier: BuildTier;
          status: BuildStatus;
          progress: number;
          phase: BuildPhase;
          iteration: number;
          description: string;
          target_users: string | null;
          tech_constraints: string | null;
          business_requirements: string | null;
          design_preferences: string | null;
          integrations: string[] | null;
          plan: Json;
          tokens_used: number;
          actual_cost: number;
          error_message: string | null;
          metadata: Json;
          created_by: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_builds']['Row']> & {
          project_id: string;
          tenant_id: string;
          description: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['ai_builds']['Row']>;
      };
      ai_build_agent_outputs: {
        Row: {
          id: string;
          build_id: string;
          agent_id: string;
          status: AgentStatus;
          input: Json;
          output: Json | null;
          error: string | null;
          tokens_used: number;
          duration: number | null;
          retries: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_build_agent_outputs']['Row']> & {
          build_id: string;
          agent_id: string;
        };
        Update: Partial<Database['public']['Tables']['ai_build_agent_outputs']['Row']>;
      };
      ai_build_artifacts: {
        Row: {
          id: string;
          build_id: string;
          agent_id: string;
          type: ArtifactType;
          path: string;
          filename: string;
          content: string;
          content_hash: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_build_artifacts']['Row']> & {
          build_id: string;
          agent_id: string;
          path: string;
          filename: string;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['ai_build_artifacts']['Row']>;
      };
      ai_build_iterations: {
        Row: {
          id: string;
          build_id: string;
          iteration_number: number;
          feedback: string;
          changes_requested: string[];
          changes_made: string[];
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['ai_build_iterations']['Row']> & {
          build_id: string;
          iteration_number: number;
          feedback: string;
        };
        Update: Partial<Database['public']['Tables']['ai_build_iterations']['Row']>;
      };
      ai_build_snapshots: {
        Row: {
          id: string;
          build_id: string;
          iteration: number;
          snapshot_type: string;
          files: Json;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_build_snapshots']['Row']> & {
          build_id: string;
          iteration: number;
          snapshot_type: string;
          files: Json;
        };
        Update: Partial<Database['public']['Tables']['ai_build_snapshots']['Row']>;
      };
      ai_build_logs: {
        Row: {
          id: string;
          build_id: string;
          agent_id: string | null;
          level: string;
          message: string;
          phase: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_build_logs']['Row']> & {
          build_id: string;
          message: string;
        };
        Update: Partial<Database['public']['Tables']['ai_build_logs']['Row']>;
      };
      ai_token_usage: {
        Row: {
          id: string;
          tenant_id: string;
          build_id: string | null;
          agent_id: string | null;
          model: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          cost: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_token_usage']['Row']> & {
          tenant_id: string;
          model: string;
        };
        Update: Partial<Database['public']['Tables']['ai_token_usage']['Row']>;
      };

      // ==================== DEPLOYMENTS ====================
      // NOTE: domain and deployed_at columns removed - don't exist in actual DB
      deployments: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          build_id: string | null;
          status: string;
          environment: string;
          target: string | null;
          url: string | null;
          config: Json;
          metadata: Json;
          error: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['deployments']['Row']> & {
          project_id: string;
          tenant_id: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['deployments']['Row']>;
      };

      // ==================== PREVIEW & SHARE ====================
      preview_shares: {
        Row: {
          id: string;
          build_id: string;
          tenant_id: string;
          created_by: string;
          password_hash: string | null;
          expires_at: string | null;
          allow_edit: boolean;
          hide_code: boolean;
          views: number;
          last_viewed_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['preview_shares']['Row']> & {
          build_id: string;
          tenant_id: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['preview_shares']['Row']>;
      };
      preview_sessions: {
        Row: {
          id: string;
          share_id: string | null;
          build_id: string | null;
          session_token: string;
          ip_address: string | null;
          user_agent: string | null;
          referrer: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          files_viewed: string[] | null;
          devices_tested: string[] | null;
          console_errors: number;
        };
        Insert: Partial<Database['public']['Tables']['preview_sessions']['Row']> & {
          session_token: string;
        };
        Update: Partial<Database['public']['Tables']['preview_sessions']['Row']>;
      };

      // ==================== BILLING ====================
      plans: {
        Row: {
          id: string;
          name: string;
          tier: PlanTier;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          price_monthly: number;
          price_yearly: number;
          features: Json;
          limits: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['plans']['Row']> & {
          name: string;
          tier: PlanTier;
        };
        Update: Partial<Database['public']['Tables']['plans']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan_id: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & {
          tenant_id: string;
          plan_id: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
      billing_customers: {
        Row: {
          id: string;
          tenant_id: string;
          stripe_customer_id: string;
          email: string;
          name: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['billing_customers']['Row']> & {
          tenant_id: string;
          stripe_customer_id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['billing_customers']['Row']>;
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          stripe_invoice_id: string | null;
          status: string;
          amount_due: number;
          amount_paid: number;
          currency: string;
          period_start: string;
          period_end: string;
          due_date: string | null;
          paid_at: string | null;
          hosted_invoice_url: string | null;
          pdf_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['invoices']['Row']> & { tenant_id: string };
        Update: Partial<Database['public']['Tables']['invoices']['Row']>;
      };
      usage_records: {
        Row: {
          id: string;
          tenant_id: string;
          metric: string;
          quantity: number;
          unit: string;
          period_start: string;
          period_end: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['usage_records']['Row']> & {
          tenant_id: string;
          metric: string;
          quantity: number;
        };
        Update: Partial<Database['public']['Tables']['usage_records']['Row']>;
      };
      webhook_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          type: string;
          status: string;
          payload: Json;
          error: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['webhook_events']['Row']> & {
          stripe_event_id: string;
          type: string;
          payload: Json;
        };
        Update: Partial<Database['public']['Tables']['webhook_events']['Row']>;
      };

      // ==================== AUDIT ====================
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          action: string;
          action_description: string | null;
          table_name: string | null;
          record_id: string | null;
          actor_id: string | null;
          actor_type: string;
          actor_email: string | null;
          ip_address: string | null;
          user_agent: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & { action: string };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };

      // ==================== BUILD CONTEXT (P7 compatible) ====================
      build_agent_outputs: {
        Row: {
          id: string;
          build_id: string;
          agent_id: string;
          status: AgentStatus;
          artifacts: Json | null;
          decisions: Json | null;
          metrics: Json | null;
          errors: Json | null;
          duration: number | null;
          tokens_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['build_agent_outputs']['Row']> & {
          build_id: string;
          agent_id: string;
        };
        Update: Partial<Database['public']['Tables']['build_agent_outputs']['Row']>;
      };
      build_snapshots: {
        Row: {
          id: string;
          build_id: string;
          version: number;
          state: string;
          current_phase: string | null;
          current_agent: string | null;
          iteration: number;
          knowledge: Json | null;
          agent_output_ids: string[] | null;
          tokens_used: number;
          checksum: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['build_snapshots']['Row']> & {
          build_id: string;
          version: number;
        };
        Update: Partial<Database['public']['Tables']['build_snapshots']['Row']>;
      };
      build_iterations: {
        Row: {
          id: string;
          build_id: string;
          iteration_number: number;
          feedback: string;
          focus_areas: string[] | null;
          rerun_agents: string[] | null;
          rerun_phases: string[] | null;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['build_iterations']['Row']> & {
          build_id: string;
          iteration_number: number;
          feedback: string;
        };
        Update: Partial<Database['public']['Tables']['build_iterations']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_user_tenants: {
        Args: { p_user_id: string };
        Returns: Json;
      };
    };
    Enums: {
      tenant_role: TenantRole;
      project_role: ProjectRole;
      plan_tier: PlanTier;
      invitation_status: InvitationStatus;
      build_tier: BuildTier;
      build_status: BuildStatus;
      agent_status: AgentStatus;
      build_phase: BuildPhase;
      artifact_type: ArtifactType;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
