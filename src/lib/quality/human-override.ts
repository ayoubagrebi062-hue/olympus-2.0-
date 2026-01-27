/**
 * OLYMPUS 2.0 - Constitutional Test & Explanation Layer (CTEL)
 * Part 2: Human Override System
 *
 * Explicit override schema with:
 * - Signed justification
 * - Automatic SSI penalty
 * - Complete audit trail
 *
 * Overrides do NOT bypass the constitution - they acknowledge violations
 * and accept the consequences.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// OVERRIDE SCHEMA
// ============================================

/**
 * What can be overridden (with penalties)
 */
export type OverrideTarget =
  | 'HARD_GATE_FAILURE' // Override a failed hard gate (high penalty)
  | 'MONOTONICITY_REGRESSION' // Acknowledge W-ISS-D regression
  | 'STABILITY_WARNING' // Override stability risk flag
  | 'ADEQUACY_WARNING' // Override adequacy warning (not failure)
  | 'UVD_WARNING'; // Override UVD warning (not failure)

/**
 * SSI penalties for each override type
 * These are MANDATORY - no negotiation
 */
export const OVERRIDE_PENALTIES: Record<OverrideTarget, number> = {
  HARD_GATE_FAILURE: 0.25, // 25% SSI penalty - severe
  MONOTONICITY_REGRESSION: 0.15, // 15% SSI penalty - significant
  STABILITY_WARNING: 0.1, // 10% SSI penalty - moderate
  ADEQUACY_WARNING: 0.08, // 8% SSI penalty - moderate
  UVD_WARNING: 0.08, // 8% SSI penalty - moderate
};

/**
 * What CANNOT be overridden (ever)
 */
export const NON_OVERRIDABLE = Object.freeze([
  'CONSTITUTION_VIOLATION', // Constitution is supreme
  'HOSTILE_INTENT_LEAK', // Security is non-negotiable
  'EVOLUTION_VIOLATION', // Fate rules are permanent
  'FORBIDDEN_INTENT', // FORBIDDEN means FORBIDDEN
  'ARCHITECTURE_BREACH', // Canonical freeze is absolute
]);

/**
 * Human override request schema
 */
export interface HumanOverrideRequest {
  /** Unique override request ID */
  overrideId: string;

  /** Build ID this override applies to */
  buildId: string;

  /** What is being overridden */
  target: OverrideTarget;

  /** Which specific check/gate is being overridden */
  specificCheck: string;

  /** Justification - MUST explain WHY this is acceptable */
  justification: string;

  /** Who is authorizing this override */
  authorizer: {
    name: string;
    email: string;
    role: string;
  };

  /** Digital signature (hash of override + authorizer + timestamp) */
  signature: string;

  /** Timestamp of override request */
  requestedAt: string;

  /** Expiration (overrides are single-use) */
  expiresAt: string;

  /** Acknowledgments - what the authorizer accepts */
  acknowledgments: {
    acceptsSSIPenalty: boolean;
    acceptsAuditTrail: boolean;
    acceptsNonPrecedent: boolean;
    understandsRisk: boolean;
  };
}

/**
 * Override validation result
 */
export interface OverrideValidationResult {
  /** Is the override valid and applicable? */
  valid: boolean;

  /** Reason if invalid */
  invalidReason: string | null;

  /** The override if valid */
  override: HumanOverrideRequest | null;

  /** SSI penalty to apply */
  ssiPenalty: number;

  /** Warnings about this override */
  warnings: string[];
}

/**
 * Override application result
 */
export interface OverrideApplicationResult {
  /** Was the override applied? */
  applied: boolean;

  /** The override that was applied */
  override: HumanOverrideRequest;

  /** SSI penalty applied */
  ssiPenaltyApplied: number;

  /** New SSI after penalty */
  adjustedSSI: number;

  /** Audit trail entry created */
  auditEntry: OverrideAuditEntry;

  /** Timestamp */
  appliedAt: string;
}

/**
 * Override audit trail entry
 */
export interface OverrideAuditEntry {
  /** Unique audit entry ID */
  auditId: string;

  /** Override that was applied */
  overrideId: string;

  /** Build ID */
  buildId: string;

  /** Target overridden */
  target: OverrideTarget;

  /** Specific check overridden */
  specificCheck: string;

  /** Justification provided */
  justification: string;

  /** Who authorized */
  authorizer: {
    name: string;
    email: string;
    role: string;
  };

  /** SSI penalty applied */
  ssiPenalty: number;

  /** SSI before override */
  ssiBefore: number;

  /** SSI after override */
  ssiAfter: number;

  /** Signature verification */
  signatureValid: boolean;

  /** Timestamp */
  timestamp: string;

  /** This override does NOT set precedent */
  nonPrecedent: true;
}

// ============================================
// OVERRIDE PERSISTENCE
// ============================================

/**
 * Load override audit trail from .olympus/override-audit.json
 */
export function loadOverrideAuditTrail(fsOutputDir: string): OverrideAuditEntry[] {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  const auditPath = path.join(olympusDir, 'override-audit.json');

  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  if (fs.existsSync(auditPath)) {
    try {
      const content = fs.readFileSync(auditPath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch {
      console.log('[OVERRIDE] Warning: Could not parse audit trail, starting fresh');
      return [];
    }
  }

  return [];
}

/**
 * Save override audit entry (append-only)
 */
export function saveOverrideAuditEntry(fsOutputDir: string, entry: OverrideAuditEntry): string {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  const auditPath = path.join(olympusDir, 'override-audit.json');

  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  // Load existing and append (APPEND-ONLY)
  const trail = loadOverrideAuditTrail(fsOutputDir);
  trail.push(entry);

  fs.writeFileSync(auditPath, JSON.stringify(trail, null, 2));

  console.log(`[OVERRIDE] Audit entry saved: ${entry.auditId}`);
  return auditPath;
}

// ============================================
// SIGNATURE GENERATION & VERIFICATION
// ============================================

/**
 * Generate override signature
 */
export function generateOverrideSignature(
  override: Omit<HumanOverrideRequest, 'signature'>,
  secret: string = 'OLYMPUS_OVERRIDE_SECRET'
): string {
  const payload = JSON.stringify({
    overrideId: override.overrideId,
    buildId: override.buildId,
    target: override.target,
    specificCheck: override.specificCheck,
    justification: override.justification,
    authorizer: override.authorizer,
    requestedAt: override.requestedAt,
  });

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify override signature
 */
export function verifyOverrideSignature(
  override: HumanOverrideRequest,
  secret: string = 'OLYMPUS_OVERRIDE_SECRET'
): boolean {
  const expectedSignature = generateOverrideSignature(override, secret);
  return override.signature === expectedSignature;
}

// ============================================
// OVERRIDE VALIDATION
// ============================================

/**
 * Validate a human override request
 */
export function validateOverride(
  override: HumanOverrideRequest,
  currentBuildId: string
): OverrideValidationResult {
  console.log('[OVERRIDE] ==========================================');
  console.log('[OVERRIDE] VALIDATING OVERRIDE REQUEST');
  console.log('[OVERRIDE] ==========================================');
  console.log(`[OVERRIDE] Override ID: ${override.overrideId}`);
  console.log(`[OVERRIDE] Target: ${override.target}`);
  console.log(`[OVERRIDE] Specific Check: ${override.specificCheck}`);

  const warnings: string[] = [];

  // Check if target is non-overridable
  if (NON_OVERRIDABLE.includes(override.target as any)) {
    console.log(`[OVERRIDE] ❌ INVALID: ${override.target} cannot be overridden`);
    return {
      valid: false,
      invalidReason: `${override.target} is non-overridable. Constitution violations, hostile leaks, and evolution violations cannot be overridden.`,
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  // Check build ID matches
  if (override.buildId !== currentBuildId) {
    console.log(`[OVERRIDE] ❌ INVALID: Build ID mismatch`);
    return {
      valid: false,
      invalidReason: `Override is for build ${override.buildId}, current build is ${currentBuildId}`,
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  // Check expiration
  const now = new Date();
  const expires = new Date(override.expiresAt);
  if (now > expires) {
    console.log(`[OVERRIDE] ❌ INVALID: Override expired`);
    return {
      valid: false,
      invalidReason: `Override expired at ${override.expiresAt}`,
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  // Verify signature
  const signatureValid = verifyOverrideSignature(override);
  if (!signatureValid) {
    console.log(`[OVERRIDE] ❌ INVALID: Signature verification failed`);
    return {
      valid: false,
      invalidReason: 'Override signature verification failed',
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  // Check acknowledgments
  if (!override.acknowledgments.acceptsSSIPenalty) {
    console.log(`[OVERRIDE] ❌ INVALID: SSI penalty not acknowledged`);
    return {
      valid: false,
      invalidReason: 'Override must acknowledge SSI penalty',
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  if (!override.acknowledgments.acceptsAuditTrail) {
    console.log(`[OVERRIDE] ❌ INVALID: Audit trail not acknowledged`);
    return {
      valid: false,
      invalidReason: 'Override must acknowledge audit trail',
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  if (!override.acknowledgments.acceptsNonPrecedent) {
    console.log(`[OVERRIDE] ❌ INVALID: Non-precedent not acknowledged`);
    return {
      valid: false,
      invalidReason: 'Override must acknowledge it does not set precedent',
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  if (!override.acknowledgments.understandsRisk) {
    console.log(`[OVERRIDE] ❌ INVALID: Risk not acknowledged`);
    return {
      valid: false,
      invalidReason: 'Override must acknowledge risk understanding',
      override: null,
      ssiPenalty: 0,
      warnings: [],
    };
  }

  // Check justification quality
  if (override.justification.length < 50) {
    warnings.push('Justification is very short - consider providing more detail');
  }

  const penalty = OVERRIDE_PENALTIES[override.target];

  console.log(`[OVERRIDE] ✓ Override is valid`);
  console.log(`[OVERRIDE] SSI Penalty: ${(penalty * 100).toFixed(0)}%`);
  console.log('[OVERRIDE] ==========================================');

  return {
    valid: true,
    invalidReason: null,
    override,
    ssiPenalty: penalty,
    warnings,
  };
}

// ============================================
// OVERRIDE APPLICATION
// ============================================

/**
 * Apply a validated override
 */
export function applyOverride(
  override: HumanOverrideRequest,
  currentSSI: number,
  fsOutputDir: string
): OverrideApplicationResult {
  console.log('[OVERRIDE] ==========================================');
  console.log('[OVERRIDE] APPLYING OVERRIDE');
  console.log('[OVERRIDE] ==========================================');

  const penalty = OVERRIDE_PENALTIES[override.target];
  const adjustedSSI = Math.max(0, currentSSI - penalty);

  console.log(`[OVERRIDE] Current SSI: ${(currentSSI * 100).toFixed(1)}%`);
  console.log(`[OVERRIDE] Penalty: ${(penalty * 100).toFixed(0)}%`);
  console.log(`[OVERRIDE] Adjusted SSI: ${(adjustedSSI * 100).toFixed(1)}%`);

  // Create audit entry
  const auditEntry: OverrideAuditEntry = {
    auditId: `audit-${override.overrideId}`,
    overrideId: override.overrideId,
    buildId: override.buildId,
    target: override.target,
    specificCheck: override.specificCheck,
    justification: override.justification,
    authorizer: override.authorizer,
    ssiPenalty: penalty,
    ssiBefore: currentSSI,
    ssiAfter: adjustedSSI,
    signatureValid: true,
    timestamp: new Date().toISOString(),
    nonPrecedent: true,
  };

  // Save to audit trail (PERMANENT RECORD)
  saveOverrideAuditEntry(fsOutputDir, auditEntry);

  console.log(`[OVERRIDE] Audit entry created: ${auditEntry.auditId}`);
  console.log('[OVERRIDE] ==========================================');

  return {
    applied: true,
    override,
    ssiPenaltyApplied: penalty,
    adjustedSSI,
    auditEntry,
    appliedAt: new Date().toISOString(),
  };
}

// ============================================
// OVERRIDE REQUEST CREATION
// ============================================

/**
 * Create a properly signed override request
 */
export function createOverrideRequest(
  buildId: string,
  target: OverrideTarget,
  specificCheck: string,
  justification: string,
  authorizer: {
    name: string;
    email: string;
    role: string;
  },
  expiresInMinutes: number = 30
): HumanOverrideRequest {
  const overrideId = `override-${buildId}-${Date.now()}`;
  const requestedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  const overrideWithoutSignature = {
    overrideId,
    buildId,
    target,
    specificCheck,
    justification,
    authorizer,
    requestedAt,
    expiresAt,
    acknowledgments: {
      acceptsSSIPenalty: true,
      acceptsAuditTrail: true,
      acceptsNonPrecedent: true,
      understandsRisk: true,
    },
  };

  const signature = generateOverrideSignature(overrideWithoutSignature);

  return {
    ...overrideWithoutSignature,
    signature,
  };
}

// ============================================
// OVERRIDE OUTPUT
// ============================================

/**
 * Override summary for build output
 */
export interface OverrideSummary {
  hasActiveOverride: boolean;
  override: {
    id: string;
    target: string;
    specificCheck: string;
    justification: string;
    authorizer: string;
    penalty: number;
  } | null;
  ssiAdjustment: {
    before: number;
    penalty: number;
    after: number;
  } | null;
  auditTrailEntries: number;
}

/**
 * Get override summary for build artifact
 */
export function getOverrideSummary(
  applicationResult: OverrideApplicationResult | null,
  fsOutputDir: string
): OverrideSummary {
  const trail = loadOverrideAuditTrail(fsOutputDir);

  if (!applicationResult) {
    return {
      hasActiveOverride: false,
      override: null,
      ssiAdjustment: null,
      auditTrailEntries: trail.length,
    };
  }

  return {
    hasActiveOverride: true,
    override: {
      id: applicationResult.override.overrideId,
      target: applicationResult.override.target,
      specificCheck: applicationResult.override.specificCheck,
      justification: applicationResult.override.justification.slice(0, 200),
      authorizer: applicationResult.override.authorizer.email,
      penalty: applicationResult.ssiPenaltyApplied,
    },
    ssiAdjustment: {
      before: applicationResult.auditEntry.ssiBefore,
      penalty: applicationResult.ssiPenaltyApplied,
      after: applicationResult.adjustedSSI,
    },
    auditTrailEntries: trail.length,
  };
}

/**
 * Log override status
 */
export function logOverrideStatus(summary: OverrideSummary): void {
  console.log('[OVERRIDE] ==========================================');
  console.log('[OVERRIDE] OVERRIDE STATUS');
  console.log('[OVERRIDE] ==========================================');

  if (summary.hasActiveOverride && summary.override) {
    console.log('[OVERRIDE] ⚠️  ACTIVE OVERRIDE IN EFFECT');
    console.log(`[OVERRIDE]   Target: ${summary.override.target}`);
    console.log(`[OVERRIDE]   Check: ${summary.override.specificCheck}`);
    console.log(`[OVERRIDE]   Authorizer: ${summary.override.authorizer}`);
    console.log(`[OVERRIDE]   SSI Penalty: ${(summary.override.penalty * 100).toFixed(0)}%`);
    if (summary.ssiAdjustment) {
      console.log(
        `[OVERRIDE]   SSI: ${(summary.ssiAdjustment.before * 100).toFixed(1)}% → ${(summary.ssiAdjustment.after * 100).toFixed(1)}%`
      );
    }
  } else {
    console.log('[OVERRIDE] No active override');
  }

  console.log(`[OVERRIDE] Audit Trail Entries: ${summary.auditTrailEntries}`);
  console.log('[OVERRIDE] ==========================================');
}
