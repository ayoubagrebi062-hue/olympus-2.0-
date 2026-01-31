/**
 * OLYMPUS 2.0 - Persistence Layer
 * Phase 2: Database logging and audit trail
 * @version 2.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Verification record type
 */
export interface VerificationRecord {
  id?: string;
  agent_id: string;
  build_id: string;
  tenant_id: string;
  passed: boolean;
  reason?: string;
  verification_type: 'identity' | 'fingerprint' | 'role' | 'phase' | 'tenant';
  verified_at: string;
  duration_ms?: number;
}

/**
 * Audit record type (WORM - Write Once Read Many)
 */
export interface AuditRecord {
  id?: string;
  action: string;
  entity_type: 'identity' | 'lease' | 'monitor' | 'orchestrator' | 'kill_switch' | 'governance';
  entity_id: string;
  performed_by: 'system' | 'agent' | 'operator';
  action_result: 'SUCCESS' | 'FAILURE' | 'REJECTED' | 'APPROVED';
  details?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Persistence store for identity verifications
 */
export class VerificationStore {
  /**
   * Log verification attempt (INV-001)
   */
  async logVerification(record: VerificationRecord): Promise<string> {
    const { data, error } = await supabase
      .from('agent_verifications')
      .insert({
        agent_id: record.agent_id,
        build_id: record.build_id,
        tenant_id: record.tenant_id,
        passed: record.passed,
        reason: record.reason || null,
        verification_type: record.verification_type,
        verified_at: new Date().toISOString(),
        duration_ms: record.duration_ms || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[VerificationStore] Failed to log verification:', error);
      throw new Error(`Failed to log verification: ${error.message}`);
    }

    return data?.id || '';
  }

  /**
   * Get verification history for agent (INV-003 metrics)
   */
  async getAgentMetrics(agentId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_duration_ms: number;
  }> {
    const { data, error } = await supabase
      .from('agent_verifications')
      .select('passed, duration_ms')
      .eq('agent_id', agentId);

    if (error) {
      console.error('[VerificationStore] Failed to get metrics:', error);
      throw new Error(`Failed to get metrics: ${error.message}`);
    }

    const records = data || [];
    const total = records.length;
    const successful = records.filter(r => r.passed).length;
    const failed = total - successful;
    const success_rate = total > 0 ? (successful / total) * 100 : 0;
    const durations = records.map(r => r.duration_ms).filter(d => d !== null) as number[];
    const avg_duration_ms =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return { total, successful, failed, success_rate, avg_duration_ms };
  }
}

/**
 * Audit trail store (INV-002 - WORM pattern)
 */
export class AuditStore {
  /**
   * Log governance action to audit trail
   */
  async logAudit(record: AuditRecord): Promise<string> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action: record.action,
        entity_type: record.entity_type,
        entity_id: record.entity_id,
        performed_by: record.performed_by,
        action_result: record.action_result,
        details: record.details || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AuditStore] Failed to log audit:', error);
      throw new Error(`Failed to log audit: ${error.message}`);
    }

    return data?.id || '';
  }

  /**
   * Get audit history for entity
   */
  async getAuditHistory(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditRecord[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AuditStore] Failed to get audit history:', error);
      return [];
    }

    return data || [];
  }
}

// Export singleton instances
export const verificationStore = new VerificationStore();
export const auditStore = new AuditStore();
