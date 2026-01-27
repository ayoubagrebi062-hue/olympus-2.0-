export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_executions: {
        Row: {
          agent_name: string
          agent_version: string | null
          build_id: string
          completed_at: string | null
          cost_cents: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          error_type: string | null
          id: string
          input_context: Json | null
          input_prompt: string | null
          input_tokens: number | null
          llm_model: string | null
          llm_provider: string | null
          metadata: Json | null
          output_files: string[] | null
          output_structured: Json | null
          output_text: string | null
          output_tokens: number | null
          phase: string
          retry_count: number | null
          sequence_number: number
          started_at: string | null
          status: string | null
          temperature: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_name: string
          agent_version?: string | null
          build_id: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          input_context?: Json | null
          input_prompt?: string | null
          input_tokens?: number | null
          llm_model?: string | null
          llm_provider?: string | null
          metadata?: Json | null
          output_files?: string[] | null
          output_structured?: Json | null
          output_text?: string | null
          output_tokens?: number | null
          phase: string
          retry_count?: number | null
          sequence_number: number
          started_at?: string | null
          status?: string | null
          temperature?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          agent_version?: string | null
          build_id?: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          input_context?: Json | null
          input_prompt?: string | null
          input_tokens?: number | null
          llm_model?: string | null
          llm_provider?: string | null
          metadata?: Json | null
          output_files?: string[] | null
          output_structured?: Json | null
          output_text?: string | null
          output_tokens?: number | null
          phase?: string
          retry_count?: number | null
          sequence_number?: number
          started_at?: string | null
          status?: string | null
          temperature?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_identities: {
        Row: {
          agent_id: string
          build_id: string
          fingerprint: string
          id: string
          last_verified_at: string | null
          registered_at: string | null
          role: string
          status: string
          tenant_id: string
          version: string
        }
        Insert: {
          agent_id: string
          build_id: string
          fingerprint: string
          id?: string
          last_verified_at?: string | null
          registered_at?: string | null
          role: string
          status?: string
          tenant_id: string
          version: string
        }
        Update: {
          agent_id?: string
          build_id?: string
          fingerprint?: string
          id?: string
          last_verified_at?: string | null
          registered_at?: string | null
          role?: string
          status?: string
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_identities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_prompts: {
        Row: {
          activated_at: string | null
          agent_id: string
          archived_at: string | null
          avg_latency_ms: number | null
          avg_quality_score: number | null
          avg_tokens_used: number | null
          change_notes: string | null
          created_at: string | null
          created_by: string | null
          examples: Json | null
          experiment_id: string | null
          id: string
          is_default: boolean | null
          metadata: Json | null
          name: string | null
          output_schema: Json | null
          status: string
          success_rate: number | null
          system_prompt: string
          traffic_percentage: number | null
          updated_at: string | null
          usage_count: number | null
          version: number
        }
        Insert: {
          activated_at?: string | null
          agent_id: string
          archived_at?: string | null
          avg_latency_ms?: number | null
          avg_quality_score?: number | null
          avg_tokens_used?: number | null
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          examples?: Json | null
          experiment_id?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name?: string | null
          output_schema?: Json | null
          status?: string
          success_rate?: number | null
          system_prompt: string
          traffic_percentage?: number | null
          updated_at?: string | null
          usage_count?: number | null
          version?: number
        }
        Update: {
          activated_at?: string | null
          agent_id?: string
          archived_at?: string | null
          avg_latency_ms?: number | null
          avg_quality_score?: number | null
          avg_tokens_used?: number | null
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          examples?: Json | null
          experiment_id?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name?: string | null
          output_schema?: Json | null
          status?: string
          success_rate?: number | null
          system_prompt?: string
          traffic_percentage?: number | null
          updated_at?: string | null
          usage_count?: number | null
          version?: number
        }
        Relationships: []
      }
      agent_verifications: {
        Row: {
          agent_id: string
          build_id: string | null
          duration_ms: number | null
          id: string
          passed: boolean
          reason: string | null
          tenant_id: string | null
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          agent_id: string
          build_id?: string | null
          duration_ms?: number | null
          id?: string
          passed: boolean
          reason?: string | null
          tenant_id?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          agent_id?: string
          build_id?: string | null
          duration_ms?: number | null
          id?: string
          passed?: boolean
          reason?: string | null
          tenant_id?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_result: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          action_result: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          action_result?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string
        }
        Relationships: []
      }
      build_agent_executions: {
        Row: {
          agent_id: string
          agent_order: number
          build_id: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          is_required: boolean | null
          max_retries: number | null
          metadata: Json | null
          output: Json | null
          phase_id: string
          plan_id: string | null
          quality_score: number | null
          retry_count: number | null
          started_at: string | null
          status: string
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          agent_order: number
          build_id: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          is_required?: boolean | null
          max_retries?: number | null
          metadata?: Json | null
          output?: Json | null
          phase_id: string
          plan_id?: string | null
          quality_score?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          agent_order?: number
          build_id?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          is_required?: boolean | null
          max_retries?: number | null
          metadata?: Json | null
          output?: Json | null
          phase_id?: string
          plan_id?: string | null
          quality_score?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "build_agent_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_agent_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      build_agent_outputs: {
        Row: {
          agent_id: string
          artifacts: Json | null
          build_id: string
          created_at: string | null
          decisions: Json | null
          duration: number | null
          errors: Json | null
          id: string
          metrics: Json | null
          status: string
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          artifacts?: Json | null
          build_id: string
          created_at?: string | null
          decisions?: Json | null
          duration?: number | null
          errors?: Json | null
          id?: string
          metrics?: Json | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          artifacts?: Json | null
          build_id?: string
          created_at?: string | null
          decisions?: Json | null
          duration?: number | null
          errors?: Json | null
          id?: string
          metrics?: Json | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      build_checkpoints: {
        Row: {
          agent_id: string
          build_id: string
          compressed: boolean | null
          created_at: string
          expires_at: string
          id: string
          phase: string
          sequence: number
          size_bytes: number | null
          state: string
          tenant_id: string
        }
        Insert: {
          agent_id: string
          build_id: string
          compressed?: boolean | null
          created_at?: string
          expires_at: string
          id?: string
          phase: string
          sequence: number
          size_bytes?: number | null
          state: string
          tenant_id: string
        }
        Update: {
          agent_id?: string
          build_id?: string
          compressed?: boolean | null
          created_at?: string
          expires_at?: string
          id?: string
          phase?: string
          sequence?: number
          size_bytes?: number | null
          state?: string
          tenant_id?: string
        }
        Relationships: []
      }
      build_costs: {
        Row: {
          build_id: string
          cached_tokens: number | null
          created_at: string
          id: string
          input_cost_per_1k: number | null
          input_tokens: number | null
          model: string
          output_cost_per_1k: number | null
          output_tokens: number | null
          provider: string
          request_count: number | null
          tenant_id: string
          total_cost_cents: number | null
        }
        Insert: {
          build_id: string
          cached_tokens?: number | null
          created_at?: string
          id?: string
          input_cost_per_1k?: number | null
          input_tokens?: number | null
          model: string
          output_cost_per_1k?: number | null
          output_tokens?: number | null
          provider: string
          request_count?: number | null
          tenant_id: string
          total_cost_cents?: number | null
        }
        Update: {
          build_id?: string
          cached_tokens?: number | null
          created_at?: string
          id?: string
          input_cost_per_1k?: number | null
          input_tokens?: number | null
          model?: string
          output_cost_per_1k?: number | null
          output_tokens?: number | null
          provider?: string
          request_count?: number | null
          tenant_id?: string
          total_cost_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "build_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      build_logs: {
        Row: {
          agent: string | null
          build_id: string
          data: Json | null
          duration_ms: number | null
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          phase: string | null
          sequence: number
          step: number | null
          tenant_id: string
          timestamp: string
        }
        Insert: {
          agent?: string | null
          build_id: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          phase?: string | null
          sequence?: number
          step?: number | null
          tenant_id: string
          timestamp?: string
        }
        Update: {
          agent?: string | null
          build_id?: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          phase?: string | null
          sequence?: number
          step?: number | null
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      build_outputs: {
        Row: {
          build_id: string
          confidence_score: number | null
          content: string | null
          content_hash: string | null
          created_at: string
          generated_by_agent: string | null
          generation_prompt: string | null
          id: string
          is_valid: boolean | null
          language: string | null
          mime_type: string | null
          path: string
          size_bytes: number | null
          storage_bucket: string | null
          storage_path: string | null
          tenant_id: string
          validation_errors: Json | null
        }
        Insert: {
          build_id: string
          confidence_score?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          generated_by_agent?: string | null
          generation_prompt?: string | null
          id?: string
          is_valid?: boolean | null
          language?: string | null
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id: string
          validation_errors?: Json | null
        }
        Update: {
          build_id?: string
          confidence_score?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          generated_by_agent?: string | null
          generation_prompt?: string | null
          id?: string
          is_valid?: boolean | null
          language?: string | null
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "build_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      build_phase_executions: {
        Row: {
          agents_completed: number | null
          agents_failed: number | null
          agents_skipped: number | null
          agents_total: number | null
          build_id: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json | null
          phase_id: string
          phase_name: string
          phase_order: number
          plan_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          agents_completed?: number | null
          agents_failed?: number | null
          agents_skipped?: number | null
          agents_total?: number | null
          build_id: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          phase_id: string
          phase_name: string
          phase_order: number
          plan_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agents_completed?: number | null
          agents_failed?: number | null
          agents_skipped?: number | null
          agents_total?: number | null
          build_id?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          phase_id?: string
          phase_name?: string
          phase_order?: number
          plan_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_phase_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_phase_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      build_plan_agents: {
        Row: {
          agent_id: string
          agent_order: number
          completed_at: string | null
          created_at: string | null
          dependencies: string[]
          error: string | null
          id: string
          is_required: boolean
          max_retries: number
          output: Json | null
          phase_id: string
          plan_id: string
          quality_score: number | null
          retry_count: number
          started_at: string | null
          status: string
          tokens_used: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          agent_id: string
          agent_order: number
          completed_at?: string | null
          created_at?: string | null
          dependencies?: string[]
          error?: string | null
          id?: string
          is_required?: boolean
          max_retries?: number
          output?: Json | null
          phase_id: string
          plan_id: string
          quality_score?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          agent_id?: string
          agent_order?: number
          completed_at?: string | null
          created_at?: string | null
          dependencies?: string[]
          error?: string | null
          id?: string
          is_required?: boolean
          max_retries?: number
          output?: Json | null
          phase_id?: string
          plan_id?: string
          quality_score?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_plan_agents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_plan_agents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      build_plan_phases: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          name: string
          phase_id: string
          phase_order: number
          plan_id: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          name: string
          phase_id: string
          phase_order: number
          plan_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          name?: string
          phase_id?: string
          phase_order?: number
          plan_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "build_plan_phases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_plan_phases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      build_plans: {
        Row: {
          agents: Json
          build_id: string
          created_at: string | null
          current_agent: string | null
          current_phase: string | null
          id: string
          metadata: Json | null
          phases: Json
          project_type: string
          status: string
          updated_at: string | null
          version: number
        }
        Insert: {
          agents?: Json
          build_id: string
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          id?: string
          metadata?: Json | null
          phases?: Json
          project_type: string
          status?: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          agents?: Json
          build_id?: string
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          id?: string
          metadata?: Json | null
          phases?: Json
          project_type?: string
          status?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      build_resume_history: {
        Row: {
          build_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          new_checkpoints: string[] | null
          remaining_agents: string[] | null
          resume_sequence: number
          resumed_from_checkpoint: string | null
          retried_agents: string[] | null
          skipped_agents: string[] | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          build_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          new_checkpoints?: string[] | null
          remaining_agents?: string[] | null
          resume_sequence?: number
          resumed_from_checkpoint?: string | null
          retried_agents?: string[] | null
          skipped_agents?: string[] | null
          started_at?: string
          status: string
          tenant_id: string
        }
        Update: {
          build_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          new_checkpoints?: string[] | null
          remaining_agents?: string[] | null
          resume_sequence?: number
          resumed_from_checkpoint?: string | null
          retried_agents?: string[] | null
          skipped_agents?: string[] | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_resume_history_resumed_from_checkpoint_fkey"
            columns: ["resumed_from_checkpoint"]
            isOneToOne: false
            referencedRelation: "build_checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      build_state_machines: {
        Row: {
          build_id: string
          created_at: string | null
          current_agent: string | null
          current_phase: string | null
          current_state: string
          id: string
          last_transition: string | null
          last_transition_at: string | null
          metadata: Json | null
          plan_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          build_id: string
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          current_state?: string
          id?: string
          last_transition?: string | null
          last_transition_at?: string | null
          metadata?: Json | null
          plan_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          build_id?: string
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          current_state?: string
          id?: string
          last_transition?: string | null
          last_transition_at?: string | null
          metadata?: Json | null
          plan_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_state_machines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_state_machines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      build_state_transitions: {
        Row: {
          agent: string | null
          build_id: string
          created_at: string | null
          data: Json | null
          error: string | null
          from_state: string | null
          id: string
          phase: string | null
          plan_id: string | null
          state_id: string | null
          to_state: string
          trigger_event: string
        }
        Insert: {
          agent?: string | null
          build_id: string
          created_at?: string | null
          data?: Json | null
          error?: string | null
          from_state?: string | null
          id?: string
          phase?: string | null
          plan_id?: string | null
          state_id?: string | null
          to_state: string
          trigger_event: string
        }
        Update: {
          agent?: string | null
          build_id?: string
          created_at?: string | null
          data?: Json | null
          error?: string | null
          from_state?: string | null
          id?: string
          phase?: string | null
          plan_id?: string | null
          state_id?: string | null
          to_state?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_state_transitions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "build_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_state_transitions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_active_builds"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "build_state_transitions_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "build_state_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          completed_at: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          current_phase: string | null
          description: string | null
          error: string | null
          id: string
          last_heartbeat: string | null
          metadata: Json | null
          progress: number | null
          project_id: string | null
          stalled_at: string | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          tier: string | null
          tokens_used: number | null
          total_agents: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          description?: string | null
          error?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          progress?: number | null
          project_id?: string | null
          stalled_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          tier?: string | null
          tokens_used?: number | null
          total_agents?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          description?: string | null
          error?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          progress?: number | null
          project_id?: string | null
          stalled_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          tier?: string | null
          tokens_used?: number | null
          total_agents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          amount_cents: number | null
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Insert: {
          amount: number
          amount_cents?: number | null
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Update: {
          amount?: number
          amount_cents?: number | null
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_logs: {
        Row: {
          data: Json | null
          deployment_id: string
          duration_ms: number | null
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          sequence: number
          step: string | null
          tenant_id: string
          timestamp: string
        }
        Insert: {
          data?: Json | null
          deployment_id: string
          duration_ms?: number | null
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          sequence?: number
          step?: string | null
          tenant_id: string
          timestamp?: string
        }
        Update: {
          data?: Json | null
          deployment_id?: string
          duration_ms?: number | null
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          sequence?: number
          step?: string | null
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          build_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deployment_number: number
          duration_ms: number | null
          environment: Database["public"]["Enums"]["environment_type"]
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          health_check_details: Json | null
          health_status: string | null
          id: string
          internal_url: string | null
          is_rollback: boolean | null
          last_health_check_at: string | null
          metadata: Json | null
          name: string | null
          preview_url: string | null
          previous_deployment_id: string | null
          project_id: string
          provider_deployment_id: string | null
          provider_project_id: string | null
          rollback_reason: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["deployment_status"]
          target: Database["public"]["Enums"]["deployment_target"]
          target_config: Json | null
          tenant_id: string
          updated_at: string
          url: string | null
          version_id: string
        }
        Insert: {
          build_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deployment_number: number
          duration_ms?: number | null
          environment?: Database["public"]["Enums"]["environment_type"]
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          health_check_details?: Json | null
          health_status?: string | null
          id?: string
          internal_url?: string | null
          is_rollback?: boolean | null
          last_health_check_at?: string | null
          metadata?: Json | null
          name?: string | null
          preview_url?: string | null
          previous_deployment_id?: string | null
          project_id: string
          provider_deployment_id?: string | null
          provider_project_id?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          target?: Database["public"]["Enums"]["deployment_target"]
          target_config?: Json | null
          tenant_id: string
          updated_at?: string
          url?: string | null
          version_id: string
        }
        Update: {
          build_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deployment_number?: number
          duration_ms?: number | null
          environment?: Database["public"]["Enums"]["environment_type"]
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          health_check_details?: Json | null
          health_status?: string | null
          id?: string
          internal_url?: string | null
          is_rollback?: boolean | null
          last_health_check_at?: string | null
          metadata?: Json | null
          name?: string | null
          preview_url?: string | null
          previous_deployment_id?: string | null
          project_id?: string
          provider_deployment_id?: string | null
          provider_project_id?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["deployment_status"]
          target?: Database["public"]["Enums"]["deployment_target"]
          target_config?: Json | null
          tenant_id?: string
          updated_at?: string
          url?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_previous_deployment_id_fkey"
            columns: ["previous_deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          check_count: number | null
          created_at: string
          deployment_id: string | null
          domain: string
          environment: Database["public"]["Enums"]["environment_type"] | null
          error_message: string | null
          force_https: boolean | null
          id: string
          is_apex: boolean | null
          is_primary: boolean | null
          last_check_at: string | null
          metadata: Json | null
          next_check_at: string | null
          project_id: string
          provider_domain_id: string | null
          redirect_to_primary: boolean | null
          ssl_certificate_id: string | null
          ssl_status: string | null
          status: Database["public"]["Enums"]["domain_status"]
          subdomain: string | null
          tenant_id: string
          updated_at: string
          verification_target: string | null
          verification_token: string | null
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          check_count?: number | null
          created_at?: string
          deployment_id?: string | null
          domain: string
          environment?: Database["public"]["Enums"]["environment_type"] | null
          error_message?: string | null
          force_https?: boolean | null
          id?: string
          is_apex?: boolean | null
          is_primary?: boolean | null
          last_check_at?: string | null
          metadata?: Json | null
          next_check_at?: string | null
          project_id: string
          provider_domain_id?: string | null
          redirect_to_primary?: boolean | null
          ssl_certificate_id?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          subdomain?: string | null
          tenant_id: string
          updated_at?: string
          verification_target?: string | null
          verification_token?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          check_count?: number | null
          created_at?: string
          deployment_id?: string | null
          domain?: string
          environment?: Database["public"]["Enums"]["environment_type"] | null
          error_message?: string | null
          force_https?: boolean | null
          id?: string
          is_apex?: boolean | null
          is_primary?: boolean | null
          last_check_at?: string | null
          metadata?: Json | null
          next_check_at?: string | null
          project_id?: string
          provider_domain_id?: string | null
          redirect_to_primary?: boolean | null
          ssl_certificate_id?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string
          verification_target?: string | null
          verification_token?: string | null
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_domains_ssl_certificate"
            columns: ["ssl_certificate_id"]
            isOneToOne: false
            referencedRelation: "ssl_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          browser: string | null
          city: string | null
          client_type: string | null
          client_version: string | null
          country: string | null
          device_type: string | null
          event_category: string | null
          event_name: string
          id: string
          ip_address: unknown
          os: string | null
          page_title: string | null
          page_url: string | null
          processed: boolean | null
          processed_at: string | null
          project_id: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          tenant_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          client_type?: string | null
          client_version?: string | null
          country?: string | null
          device_type?: string | null
          event_category?: string | null
          event_name: string
          id?: string
          ip_address?: unknown
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          processed?: boolean | null
          processed_at?: string | null
          project_id?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          client_type?: string | null
          client_version?: string | null
          country?: string | null
          device_type?: string | null
          event_category?: string | null
          event_name?: string
          id?: string
          ip_address?: unknown
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          processed?: boolean | null
          processed_at?: string | null
          project_id?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          allowed_plans: Database["public"]["Enums"]["plan_tier"][] | null
          allowed_tenants: string[] | null
          allowed_users: string[] | null
          category: string | null
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_enabled: boolean | null
          key: string
          name: string
          rollout_percentage: number | null
          starts_at: string | null
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_plans?: Database["public"]["Enums"]["plan_tier"][] | null
          allowed_tenants?: string[] | null
          allowed_users?: string[] | null
          category?: string | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key: string
          name: string
          rollout_percentage?: number | null
          starts_at?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_plans?: Database["public"]["Enums"]["plan_tier"][] | null
          allowed_tenants?: string[] | null
          allowed_users?: string[] | null
          category?: string | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          name?: string
          rollout_percentage?: number | null
          starts_at?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      file_versions: {
        Row: {
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          path: string
          size_bytes: number
          tenant_id: string
          version_number: number
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          path: string
          size_bytes?: number
          tenant_id: string
          version_number: number
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          path?: string
          size_bytes?: number
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          category: Database["public"]["Enums"]["file_category"] | null
          checksum_md5: string | null
          checksum_sha256: string | null
          created_at: string
          deleted_at: string | null
          download_count: number | null
          extension: string | null
          height: number | null
          id: string
          is_processed: boolean | null
          is_public: boolean | null
          last_accessed_at: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          original_name: string | null
          path: string
          processing_error: string | null
          processing_status: string | null
          project_id: string | null
          public_url: string | null
          signed_url: string | null
          signed_url_expires_at: string | null
          size_bytes: number
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
          variants: Json | null
          virus_scan_at: string | null
          virus_scan_result: string | null
          virus_scanned: boolean | null
          width: number | null
        }
        Insert: {
          bucket?: string
          category?: Database["public"]["Enums"]["file_category"] | null
          checksum_md5?: string | null
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          download_count?: number | null
          extension?: string | null
          height?: number | null
          id?: string
          is_processed?: boolean | null
          is_public?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          original_name?: string | null
          path: string
          processing_error?: string | null
          processing_status?: string | null
          project_id?: string | null
          public_url?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          size_bytes?: number
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
          variants?: Json | null
          virus_scan_at?: string | null
          virus_scan_result?: string | null
          virus_scanned?: boolean | null
          width?: number | null
        }
        Update: {
          bucket?: string
          category?: Database["public"]["Enums"]["file_category"] | null
          checksum_md5?: string | null
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          download_count?: number | null
          extension?: string | null
          height?: number | null
          id?: string
          is_processed?: boolean | null
          is_public?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          original_name?: string | null
          path?: string
          processing_error?: string | null
          processing_status?: string | null
          project_id?: string | null
          public_url?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          size_bytes?: number
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
          variants?: Json | null
          virus_scan_at?: string | null
          virus_scan_result?: string | null
          virus_scanned?: boolean | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due_cents: number | null
          amount_paid_cents: number | null
          created_at: string
          currency: string | null
          discount_cents: number | null
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_number: string | null
          invoice_pdf_url: string | null
          line_items: Json | null
          metadata: Json | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          subtotal_cents: number
          tax_cents: number | null
          tenant_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_due_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          currency?: string | null
          discount_cents?: number | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number | null
          tenant_id: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          amount_due_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          currency?: string | null
          discount_cents?: number | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number | null
          tenant_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          lead_id: string
          metadata: Json | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
          tenant_id?: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          score: number | null
          source: string | null
          status: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metrics: {
        Row: {
          calculated_at: string | null
          change_percent: number | null
          created_at: string
          dimensions: Json | null
          id: string
          metadata: Json | null
          metric_category: string | null
          metric_name: string
          period_end: string
          period_start: string
          period_type: string
          previous_period_value: number | null
          project_id: string | null
          tenant_id: string | null
          value_avg: number | null
          value_count: number | null
          value_max: number | null
          value_min: number | null
          value_p50: number | null
          value_p95: number | null
          value_p99: number | null
          value_sum: number | null
        }
        Insert: {
          calculated_at?: string | null
          change_percent?: number | null
          created_at?: string
          dimensions?: Json | null
          id?: string
          metadata?: Json | null
          metric_category?: string | null
          metric_name: string
          period_end: string
          period_start: string
          period_type: string
          previous_period_value?: number | null
          project_id?: string | null
          tenant_id?: string | null
          value_avg?: number | null
          value_count?: number | null
          value_max?: number | null
          value_min?: number | null
          value_p50?: number | null
          value_p95?: number | null
          value_p99?: number | null
          value_sum?: number | null
        }
        Update: {
          calculated_at?: string | null
          change_percent?: number | null
          created_at?: string
          dimensions?: Json | null
          id?: string
          metadata?: Json | null
          metric_category?: string | null
          metric_name?: string
          period_end?: string
          period_start?: string
          period_type?: string
          previous_period_value?: number | null
          project_id?: string | null
          tenant_id?: string | null
          value_avg?: number | null
          value_count?: number | null
          value_max?: number | null
          value_min?: number | null
          value_p50?: number | null
          value_p95?: number | null
          value_p99?: number | null
          value_sum?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          bank_last4: string | null
          bank_name: string | null
          billing_address: Json | null
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_funding: string | null
          card_last4: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_valid: boolean | null
          metadata: Json | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          bank_last4?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_funding?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_valid?: boolean | null
          metadata?: Json | null
          stripe_customer_id?: string | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          bank_last4?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_funding?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_valid?: boolean | null
          metadata?: Json | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          badge_text: string | null
          created_at: string
          currency: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_public: boolean | null
          limits: Json
          metadata: Json | null
          name: string
          price_monthly_cents: number
          price_yearly_cents: number
          slug: string
          sort_order: number | null
          stripe_price_monthly_id: string | null
          stripe_price_yearly_id: string | null
          stripe_product_id: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          limits?: Json
          metadata?: Json | null
          name: string
          price_monthly_cents?: number
          price_yearly_cents?: number
          slug: string
          sort_order?: number | null
          stripe_price_monthly_id?: string | null
          stripe_price_yearly_id?: string | null
          stripe_product_id?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          limits?: Json
          metadata?: Json | null
          name?: string
          price_monthly_cents?: number
          price_yearly_cents?: number
          slug?: string
          sort_order?: number | null
          stripe_price_monthly_id?: string | null
          stripe_price_yearly_id?: string | null
          stripe_product_id?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_env_vars: {
        Row: {
          created_at: string
          created_by: string | null
          environment: Database["public"]["Enums"]["environment_type"] | null
          id: string
          is_secret: boolean | null
          key: string
          project_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value_encrypted: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          id?: string
          is_secret?: boolean | null
          key: string
          project_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value_encrypted: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          id?: string
          is_secret?: boolean | null
          key?: string
          project_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value_encrypted?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_env_vars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          content_hash: string | null
          created_at: string
          created_by: string | null
          dependencies: Json | null
          deployed_at: string | null
          deployment_url: string | null
          description: string | null
          file_count: number | null
          files_snapshot: Json | null
          id: string
          is_deployed: boolean | null
          is_latest: boolean | null
          is_stable: boolean | null
          metadata: Json | null
          name: string | null
          package_json: Json | null
          project_id: string
          source_build_id: string | null
          tenant_id: string
          total_size_bytes: number | null
          version_number: number
          version_tag: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: Json | null
          deployed_at?: string | null
          deployment_url?: string | null
          description?: string | null
          file_count?: number | null
          files_snapshot?: Json | null
          id?: string
          is_deployed?: boolean | null
          is_latest?: boolean | null
          is_stable?: boolean | null
          metadata?: Json | null
          name?: string | null
          package_json?: Json | null
          project_id: string
          source_build_id?: string | null
          tenant_id: string
          total_size_bytes?: number | null
          version_number: number
          version_tag?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: Json | null
          deployed_at?: string | null
          deployment_url?: string | null
          description?: string | null
          file_count?: number | null
          files_snapshot?: Json | null
          id?: string
          is_deployed?: boolean | null
          is_latest?: boolean | null
          is_stable?: boolean | null
          metadata?: Json | null
          name?: string | null
          package_json?: Json | null
          project_id?: string
          source_build_id?: string | null
          tenant_id?: string
          total_size_bytes?: number | null
          version_number?: number
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_experiments: {
        Row: {
          agent_id: string
          control_prompt_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          min_sample_size: number | null
          name: string
          results: Json | null
          started_at: string | null
          status: string
          traffic_split: Json
          variant_prompt_ids: string[] | null
          winner_prompt_id: string | null
        }
        Insert: {
          agent_id: string
          control_prompt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          min_sample_size?: number | null
          name: string
          results?: Json | null
          started_at?: string | null
          status?: string
          traffic_split: Json
          variant_prompt_ids?: string[] | null
          winner_prompt_id?: string | null
        }
        Update: {
          agent_id?: string
          control_prompt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          min_sample_size?: number | null
          name?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          traffic_split?: Json
          variant_prompt_ids?: string[] | null
          winner_prompt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_experiments_control_prompt_id_fkey"
            columns: ["control_prompt_id"]
            isOneToOne: false
            referencedRelation: "agent_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_experiments_winner_prompt_id_fkey"
            columns: ["winner_prompt_id"]
            isOneToOne: false
            referencedRelation: "agent_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          metadata: Json | null
          new_content: string | null
          previous_content: string | null
          prompt_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_content?: string | null
          previous_content?: string | null
          prompt_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_content?: string | null
          previous_content?: string | null
          prompt_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "agent_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_performance: {
        Row: {
          build_id: string | null
          created_at: string | null
          id: string
          latency_ms: number | null
          passed_validation: boolean | null
          prompt_id: string | null
          quality_score: number | null
          retry_count: number | null
          tokens_used: number | null
        }
        Insert: {
          build_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          passed_validation?: boolean | null
          prompt_id?: string | null
          quality_score?: number | null
          retry_count?: number | null
          tokens_used?: number | null
        }
        Update: {
          build_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          passed_validation?: boolean | null
          prompt_id?: string | null
          quality_score?: number | null
          retry_count?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_performance_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "agent_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          delivery_config: Json | null
          delivery_method: string | null
          description: string | null
          filters: Json | null
          id: string
          is_active: boolean | null
          is_scheduled: boolean | null
          last_output_expires_at: string | null
          last_output_url: string | null
          last_run_at: string | null
          last_run_duration_ms: number | null
          last_run_error: string | null
          last_run_status: string | null
          name: string
          next_run_at: string | null
          recipients: string[] | null
          report_type: string
          schedule_cron: string | null
          schedule_timezone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          delivery_config?: Json | null
          delivery_method?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          last_output_expires_at?: string | null
          last_output_url?: string | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_error?: string | null
          last_run_status?: string | null
          name: string
          next_run_at?: string | null
          recipients?: string[] | null
          report_type: string
          schedule_cron?: string | null
          schedule_timezone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          delivery_config?: Json | null
          delivery_method?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          last_output_expires_at?: string | null
          last_output_url?: string | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_error?: string | null
          last_run_status?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[] | null
          report_type?: string
          schedule_cron?: string | null
          schedule_timezone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          hierarchy_level: number | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ssl_certificates: {
        Row: {
          alt_names: string[] | null
          auto_renew: boolean | null
          ca_bundle_pem: string | null
          certificate_pem: string | null
          created_at: string
          domain: string
          domain_id: string
          expires_at: string
          fingerprint: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          last_renewal_at: string | null
          next_renewal_at: string | null
          private_key_encrypted: string | null
          provider: string | null
          provider_cert_id: string | null
          renewal_attempts: number | null
          renewal_error: string | null
          serial_number: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alt_names?: string[] | null
          auto_renew?: boolean | null
          ca_bundle_pem?: string | null
          certificate_pem?: string | null
          created_at?: string
          domain: string
          domain_id: string
          expires_at: string
          fingerprint?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          last_renewal_at?: string | null
          next_renewal_at?: string | null
          private_key_encrypted?: string | null
          provider?: string | null
          provider_cert_id?: string | null
          renewal_attempts?: number | null
          renewal_error?: string | null
          serial_number?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alt_names?: string[] | null
          auto_renew?: boolean | null
          ca_bundle_pem?: string | null
          certificate_pem?: string | null
          created_at?: string
          domain?: string
          domain_id?: string
          expires_at?: string
          fingerprint?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          last_renewal_at?: string | null
          next_renewal_at?: string | null
          private_key_encrypted?: string | null
          provider?: string | null
          provider_cert_id?: string | null
          renewal_attempts?: number | null
          renewal_error?: string | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssl_certificates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssl_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_usage: {
        Row: {
          bandwidth_alert_sent_at: string | null
          bandwidth_bytes_current_month: number | null
          bandwidth_limit_bytes: number | null
          bandwidth_month: string | null
          calculated_at: string | null
          code_bytes: number | null
          code_files: number | null
          created_at: string
          document_bytes: number | null
          document_files: number | null
          id: string
          image_bytes: number | null
          image_files: number | null
          other_bytes: number | null
          other_files: number | null
          storage_alert_sent_at: string | null
          storage_limit_bytes: number | null
          tenant_id: string
          total_bytes: number
          total_files: number | null
          updated_at: string
          video_bytes: number | null
          video_files: number | null
        }
        Insert: {
          bandwidth_alert_sent_at?: string | null
          bandwidth_bytes_current_month?: number | null
          bandwidth_limit_bytes?: number | null
          bandwidth_month?: string | null
          calculated_at?: string | null
          code_bytes?: number | null
          code_files?: number | null
          created_at?: string
          document_bytes?: number | null
          document_files?: number | null
          id?: string
          image_bytes?: number | null
          image_files?: number | null
          other_bytes?: number | null
          other_files?: number | null
          storage_alert_sent_at?: string | null
          storage_limit_bytes?: number | null
          tenant_id: string
          total_bytes?: number
          total_files?: number | null
          updated_at?: string
          video_bytes?: number | null
          video_files?: number | null
        }
        Update: {
          bandwidth_alert_sent_at?: string | null
          bandwidth_bytes_current_month?: number | null
          bandwidth_limit_bytes?: number | null
          bandwidth_month?: string | null
          calculated_at?: string | null
          code_bytes?: number | null
          code_files?: number | null
          created_at?: string
          document_bytes?: number | null
          document_files?: number | null
          id?: string
          image_bytes?: number | null
          image_files?: number | null
          other_bytes?: number | null
          other_files?: number | null
          storage_alert_sent_at?: string | null
          storage_limit_bytes?: number | null
          tenant_id?: string
          total_bytes?: number
          total_files?: number | null
          updated_at?: string
          video_bytes?: number | null
          video_files?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_items: {
        Row: {
          created_at: string
          id: string
          is_metered: boolean | null
          metered_usage_type: string | null
          product_type: string
          quantity: number | null
          stripe_price_id: string | null
          stripe_subscription_item_id: string | null
          subscription_id: string
          tenant_id: string
          unit_amount_cents: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_metered?: boolean | null
          metered_usage_type?: string | null
          product_type: string
          quantity?: number | null
          stripe_price_id?: string | null
          stripe_subscription_item_id?: string | null
          subscription_id: string
          tenant_id: string
          unit_amount_cents?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_metered?: boolean | null
          metered_usage_type?: string | null
          product_type?: string
          quantity?: number | null
          stripe_price_id?: string | null
          stripe_subscription_item_id?: string | null
          subscription_id?: string
          tenant_id?: string
          unit_amount_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          cancellation_reason: string | null
          coupon_code: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          default_payment_method_id: string | null
          discount_end_at: string | null
          discount_percent: number | null
          id: string
          metadata: Json | null
          paused_at: string | null
          plan_id: string
          price_cents: number | null
          resume_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          default_payment_method_id?: string | null
          discount_end_at?: string | null
          discount_percent?: number | null
          id?: string
          metadata?: Json | null
          paused_at?: string | null
          plan_id: string
          price_cents?: number | null
          resume_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          default_payment_method_id?: string | null
          discount_end_at?: string | null
          discount_percent?: number | null
          id?: string
          metadata?: Json | null
          paused_at?: string | null
          plan_id?: string
          price_cents?: number | null
          resume_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscriptions_payment_method"
            columns: ["default_payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          environment: string | null
          id: string
          is_public: boolean | null
          is_sensitive: boolean | null
          key: string
          tenant_overridable: boolean | null
          updated_at: string
          updated_by: string | null
          validation_schema: Json | null
          value: Json
          value_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          environment?: string | null
          id?: string
          is_public?: boolean | null
          is_sensitive?: boolean | null
          key: string
          tenant_overridable?: boolean | null
          updated_at?: string
          updated_by?: string | null
          validation_schema?: Json | null
          value: Json
          value_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          environment?: string | null
          id?: string
          is_public?: boolean | null
          is_sensitive?: boolean | null
          key?: string
          tenant_overridable?: boolean | null
          updated_at?: string
          updated_by?: string | null
          validation_schema?: Json | null
          value?: Json
          value_type?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          personal_message: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personal_message?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personal_message?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          status: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_personal: boolean | null
          limits: Json | null
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string | null
          slug: string
          stripe_customer_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_personal?: boolean | null
          limits?: Json | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          slug: string
          stripe_customer_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_personal?: boolean | null
          limits?: Json | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          slug?: string
          stripe_customer_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          aggregation_key: string | null
          created_at: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          quantity: number
          reported_at: string | null
          reported_to_stripe: boolean | null
          stripe_usage_record_id: string | null
          subscription_item_id: string | null
          tenant_id: string
          unit: string | null
          usage_type: string
        }
        Insert: {
          aggregation_key?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          quantity?: number
          reported_at?: string | null
          reported_to_stripe?: boolean | null
          stripe_usage_record_id?: string | null
          subscription_item_id?: string | null
          tenant_id: string
          unit?: string | null
          usage_type: string
        }
        Update: {
          aggregation_key?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          quantity?: number
          reported_at?: string | null
          reported_to_stripe?: boolean | null
          stripe_usage_record_id?: string | null
          subscription_item_id?: string | null
          tenant_id?: string
          unit?: string | null
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_subscription_item_id_fkey"
            columns: ["subscription_item_id"]
            isOneToOne: false
            referencedRelation: "subscription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          result: Json | null
          source: string
          status: Database["public"]["Enums"]["webhook_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          result?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          result?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      build_checkpoint_summary: {
        Row: {
          build_id: string | null
          checkpoint_count: number | null
          first_checkpoint_at: string | null
          first_sequence: number | null
          last_checkpoint_at: string | null
          last_sequence: number | null
          phases_checkpointed: string[] | null
          tenant_id: string | null
          total_size_bytes: number | null
        }
        Relationships: []
      }
      checkpoint_overview: {
        Row: {
          avg_checkpoint_size: number | null
          builds_with_checkpoints: number | null
          compressed_count: number | null
          expiring_soon: number | null
          newest_checkpoint: string | null
          oldest_checkpoint: string | null
          tenant_id: string | null
          total_checkpoints: number | null
          total_size_bytes: number | null
        }
        Relationships: []
      }
      v_active_builds: {
        Row: {
          build_id: string | null
          completed_agents: number | null
          created_at: string | null
          current_agent: string | null
          current_phase: string | null
          failed_agents: number | null
          plan_id: string | null
          progress_percent: number | null
          project_type: string | null
          status: string | null
          tenant_id: string | null
          total_agents: number | null
          total_phases: number | null
          updated_at: string | null
        }
        Insert: {
          build_id?: string | null
          completed_agents?: never
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          failed_agents?: never
          plan_id?: string | null
          progress_percent?: never
          project_type?: string | null
          status?: string | null
          tenant_id?: never
          total_agents?: never
          total_phases?: never
          updated_at?: string | null
        }
        Update: {
          build_id?: string | null
          completed_agents?: never
          created_at?: string | null
          current_agent?: string | null
          current_phase?: string | null
          failed_agents?: never
          plan_id?: string | null
          progress_percent?: never
          project_type?: string | null
          status?: string | null
          tenant_id?: never
          total_agents?: never
          total_phases?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_recent_transitions: {
        Row: {
          agent: string | null
          build_id: string | null
          created_at: string | null
          error: string | null
          from_state: string | null
          id: string | null
          phase: string | null
          project_type: string | null
          to_state: string | null
          trigger_event: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_prompt: {
        Args: { p_changed_by?: string; p_prompt_id: string }
        Returns: undefined
      }
      add_credit_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_expires_at?: string
          p_metadata?: Json
          p_reference_id?: string
          p_reference_type?: string
          p_tenant_id: string
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
        }
        Returns: string
      }
      batch_update_agents: {
        Args: { p_plan_id: string; p_updates: Json }
        Returns: {
          agent_id: string
          new_version: number
          success: boolean
        }[]
      }
      check_storage_limit: {
        Args: { p_additional_bytes: number; p_tenant_id: string }
        Returns: boolean
      }
      cleanup_expired_checkpoints: { Args: never; Returns: number }
      complete_phase_and_advance: {
        Args: {
          p_current_phase: string
          p_next_phase: string
          p_plan_id: string
        }
        Returns: undefined
      }
      create_build_plan_atomic: {
        Args: {
          p_agents: Json
          p_build_id: string
          p_metadata: Json
          p_phases: Json
          p_project_type: string
        }
        Returns: Json
      }
      detect_stalled_builds: {
        Args: { stall_threshold_minutes?: number }
        Returns: {
          build_id: string
          current_phase: string
          last_heartbeat: string
          minutes_stalled: number
          running_agents: string[]
        }[]
      }
      find_orphaned_builds: {
        Args: { p_stale_threshold_minutes?: number }
        Returns: {
          build_id: string
          current_phase: string
          current_state: string
          last_updated: string
          minutes_stale: number
          plan_id: string
        }[]
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_active_prompt: {
        Args: { p_agent_id: string; p_experiment_random?: number }
        Returns: {
          examples: Json
          experiment_id: string
          output_schema: Json
          prompt_id: string
          system_prompt: string
          version: number
        }[]
      }
      get_build_plan_summary: { Args: { p_build_id: string }; Returns: Json }
      get_build_resume_stats: {
        Args: { p_build_id: string }
        Returns: {
          checkpoints_available: number
          failed_resumes: number
          successful_resumes: number
          total_resume_time_ms: number
          total_resumes: number
        }[]
      }
      get_checkpoint_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_checkpoint_size: number
          builds_with_checkpoints: number
          compressed_count: number
          latest_checkpoint: string
          total_checkpoints: number
          total_size_bytes: number
        }[]
      }
      get_latest_checkpoint: {
        Args: { p_build_id: string }
        Returns: {
          agent_id: string
          build_id: string
          compressed: boolean | null
          created_at: string
          expires_at: string
          id: string
          phase: string
          sequence: number
          size_bytes: number | null
          state: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "build_checkpoints"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_live_deployment: {
        Args: {
          p_environment?: Database["public"]["Enums"]["environment_type"]
          p_project_id: string
        }
        Returns: string
      }
      get_next_executable_agent: {
        Args: { p_plan_id: string }
        Returns: {
          agent_id: string
          agent_order: number
          dependencies: string[]
          is_required: boolean
          phase_id: string
          version: number
        }[]
      }
      get_phase_progress: {
        Args: { p_phase_id: string; p_plan_id: string }
        Returns: Json
      }
      get_plan_progress_fast: {
        Args: { p_plan_id: string }
        Returns: {
          completed_agents: number
          current_agent: string
          current_phase: string
          failed_agents: number
          pending_agents: number
          progress_percent: number
          running_agents: number
          skipped_agents: number
          total_agents: number
        }[]
      }
      get_system_setting: {
        Args: { p_default?: Json; p_key: string }
        Returns: Json
      }
      get_tenant_credit_balance: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      heartbeat_build: { Args: { p_build_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { p_flag_key: string; p_tenant_id?: string; p_user_id?: string }
        Returns: boolean
      }
      log_state_transition: {
        Args: {
          p_agent?: string
          p_build_id: string
          p_data?: Json
          p_from_state: string
          p_phase?: string
          p_plan_id: string
          p_to_state: string
          p_trigger: string
        }
        Returns: string
      }
      prune_build_checkpoints: {
        Args: { p_build_id: string; p_keep_count?: number }
        Returns: number
      }
      track_event: {
        Args: {
          p_event_name: string
          p_project_id?: string
          p_properties?: Json
          p_tenant_id?: string
        }
        Returns: string
      }
      transition_state_atomic: {
        Args: {
          p_agent?: string
          p_expected_version: number
          p_new_state: string
          p_phase?: string
          p_state_id: string
          p_trigger?: string
        }
        Returns: {
          message: string
          new_version: number
          success: boolean
        }[]
      }
      update_agent_with_lock: {
        Args: {
          p_agent_id: string
          p_error?: string
          p_expected_version: number
          p_output?: Json
          p_plan_id: string
          p_status: string
        }
        Returns: {
          message: string
          new_version: number
          success: boolean
        }[]
      }
      update_prompt_stats: { Args: { p_prompt_id: string }; Returns: undefined }
      update_storage_usage: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      user_can_edit_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      user_has_tenant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["tenant_role"]
          p_tenant_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "export"
        | "import"
        | "invite"
        | "revoke"
      build_status:
        | "pending"
        | "queued"
        | "initializing"
        | "running"
        | "validating"
        | "completed"
        | "failed"
        | "canceled"
        | "timeout"
      credit_transaction_type:
        | "purchase"
        | "usage"
        | "refund"
        | "bonus"
        | "adjustment"
        | "expiry"
      deployment_status:
        | "pending"
        | "preparing"
        | "building"
        | "deploying"
        | "verifying"
        | "live"
        | "failed"
        | "rolled_back"
        | "stopped"
      deployment_target:
        | "olympus"
        | "vercel"
        | "netlify"
        | "railway"
        | "cloudflare"
        | "export"
      domain_status: "pending" | "verifying" | "verified" | "failed" | "expired"
      environment_type: "development" | "staging" | "preview" | "production"
      file_category:
        | "image"
        | "video"
        | "audio"
        | "document"
        | "code"
        | "archive"
        | "other"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "revoked"
      log_level: "debug" | "info" | "warn" | "error" | "fatal"
      plan_tier:
        | "free"
        | "starter"
        | "standard"
        | "pro"
        | "business"
        | "enterprise"
      project_status:
        | "draft"
        | "building"
        | "ready"
        | "deployed"
        | "archived"
        | "deleted"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
      tenant_role: "owner" | "admin" | "developer" | "viewer"
      webhook_status:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
        | "skipped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: [
        "create",
        "read",
        "update",
        "delete",
        "login",
        "logout",
        "export",
        "import",
        "invite",
        "revoke",
      ],
      build_status: [
        "pending",
        "queued",
        "initializing",
        "running",
        "validating",
        "completed",
        "failed",
        "canceled",
        "timeout",
      ],
      credit_transaction_type: [
        "purchase",
        "usage",
        "refund",
        "bonus",
        "adjustment",
        "expiry",
      ],
      deployment_status: [
        "pending",
        "preparing",
        "building",
        "deploying",
        "verifying",
        "live",
        "failed",
        "rolled_back",
        "stopped",
      ],
      deployment_target: [
        "olympus",
        "vercel",
        "netlify",
        "railway",
        "cloudflare",
        "export",
      ],
      domain_status: ["pending", "verifying", "verified", "failed", "expired"],
      environment_type: ["development", "staging", "preview", "production"],
      file_category: [
        "image",
        "video",
        "audio",
        "document",
        "code",
        "archive",
        "other",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "revoked",
      ],
      log_level: ["debug", "info", "warn", "error", "fatal"],
      plan_tier: [
        "free",
        "starter",
        "standard",
        "pro",
        "business",
        "enterprise",
      ],
      project_status: [
        "draft",
        "building",
        "ready",
        "deployed",
        "archived",
        "deleted",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      tenant_role: ["owner", "admin", "developer", "viewer"],
      webhook_status: [
        "pending",
        "processing",
        "processed",
        "failed",
        "skipped",
      ],
    },
  },
} as const
