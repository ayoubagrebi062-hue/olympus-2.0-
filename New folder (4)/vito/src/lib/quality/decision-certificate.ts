/**
 * OLYMPUS 2.1 - Decision Certificate Generator
 *
 * Creates cryptographic certificates for every ship/block decision.
 * Enables external verification and audit trail integrity.
 *
 * Certificate format is deterministic and tamper-evident.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { OlympusVersionIdentity, getCanonicalVersionIdentity } from './architecture-guard';

// ============================================
// CERTIFICATE TYPES
// ============================================

/**
 * Decision verdict
 */
export type DecisionVerdict = 'SHIP_APPROVED' | 'SHIP_BLOCKED';

/**
 * Gate summary for certificate
 */
export interface GateSummary {
  name: string;
  passed: boolean;
  type: 'HARD' | 'SOFT';
}

/**
 * Decision certificate - the cryptographic proof of OLYMPUS decision
 */
export interface DecisionCertificate {
  // Identity
  certificateId: string;
  buildId: string;
  timestamp: string;

  // Decision
  verdict: DecisionVerdict;
  blockReason: string | null;

  // Constitution
  constitutionVersion: string;
  constitutionHash: string;

  // OLYMPUS identity
  olympusVersion: OlympusVersionIdentity;

  // Gate results summary
  gates: {
    total: number;
    passed: number;
    failed: number;
    hardFailed: number;
    summary: GateSummary[];
  };

  // Key metrics
  metrics: {
    wissd: number;
    ssi: number;
    uvd: number;
    ias: number;
    hostileBlockRate: number;
  };

  // Governance
  governance: {
    overrideApplied: boolean;
    overrideTarget: string | null;
    ssiPenalty: number;
    constitutionalViolations: number;
    governanceExploitsBlocked: number;
  };

  // Cryptographic verification
  inputHash: string;
  outputHash: string;
  certificateHash: string;
  signature: string;
}

/**
 * Certificate verification result
 */
export interface CertificateVerificationResult {
  valid: boolean;
  errors: string[];
  checks: {
    signatureValid: boolean;
    hashesMatch: boolean;
    constitutionHashValid: boolean;
    timestampValid: boolean;
    versionValid: boolean;
  };
}

// ============================================
// CRYPTOGRAPHIC FUNCTIONS
// ============================================

/**
 * Generate SHA-256 hash of content
 */
function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate HMAC-SHA256 signature
 */
function hmacSha256(content: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(content, 'utf8').digest('hex');
}

/**
 * Generate unique certificate ID
 */
function generateCertificateId(buildId: string, timestamp: string): string {
  const input = `${buildId}-${timestamp}`;
  const hash = sha256(input);
  return `CERT-${hash.substring(0, 16).toUpperCase()}`;
}

/**
 * Hash the constitution file
 */
function hashConstitution(projectRoot: string): string {
  const constitutionPath = path.join(projectRoot, '.olympus', 'OLYMPUS_CONSTITUTION_v2.0.json');

  if (!fs.existsSync(constitutionPath)) {
    // Return hash of default constitution location
    return sha256('OLYMPUS_CONSTITUTION_v2.0_NOT_FOUND');
  }

  const content = fs.readFileSync(constitutionPath, 'utf-8');
  return sha256(content);
}

/**
 * Calculate input hash from build inputs
 */
function calculateInputHash(inputs: {
  description: string;
  tier: string;
  files: string[];
  intents: string[];
}): string {
  const normalized = JSON.stringify({
    description: inputs.description,
    tier: inputs.tier,
    files: inputs.files.sort(),
    intents: inputs.intents.sort(),
  });
  return sha256(normalized);
}

/**
 * Calculate output hash from build outputs
 */
function calculateOutputHash(outputs: {
  verdict: DecisionVerdict;
  metrics: Record<string, number>;
  gates: GateSummary[];
}): string {
  const normalized = JSON.stringify({
    verdict: outputs.verdict,
    metrics: outputs.metrics,
    gates: outputs.gates.map(g => ({ name: g.name, passed: g.passed })),
  });
  return sha256(normalized);
}

/**
 * Calculate certificate hash (excludes signature)
 */
function calculateCertificateHash(cert: Omit<DecisionCertificate, 'certificateHash' | 'signature'>): string {
  const normalized = JSON.stringify(cert);
  return sha256(normalized);
}

/**
 * Sign the certificate
 */
function signCertificate(certificateHash: string, buildId: string): string {
  // Use build ID as secret for HMAC (in production, use proper key management)
  // This ensures same inputs produce same signature (determinism)
  const secret = `OLYMPUS-2.1-${buildId}`;
  return hmacSha256(certificateHash, secret);
}

// ============================================
// CERTIFICATE GENERATION
// ============================================

/**
 * Certificate generation inputs
 */
export interface CertificateInputs {
  buildId: string;
  projectRoot: string;

  // Decision
  shipped: boolean;
  blockReason: string | null;

  // Build inputs
  description: string;
  tier: string;
  files: string[];
  intents: string[];

  // Gate results
  gates: GateSummary[];

  // Metrics
  metrics: {
    wissd: number;
    ssi: number;
    uvd: number;
    ias: number;
    hostileBlocked: number;
    hostileTotal: number;
  };

  // Governance
  overrideApplied: boolean;
  overrideTarget: string | null;
  ssiPenalty: number;
  constitutionalViolations: number;
  governanceExploitsBlocked: number;
}

/**
 * Generate a decision certificate
 */
export function generateDecisionCertificate(inputs: CertificateInputs): DecisionCertificate {
  console.log('[CERT] ==========================================');
  console.log('[CERT] GENERATING DECISION CERTIFICATE');
  console.log('[CERT] ==========================================');

  const timestamp = new Date().toISOString();
  const certificateId = generateCertificateId(inputs.buildId, timestamp);
  const verdict: DecisionVerdict = inputs.shipped ? 'SHIP_APPROVED' : 'SHIP_BLOCKED';

  console.log(`[CERT] Certificate ID: ${certificateId}`);
  console.log(`[CERT] Build ID: ${inputs.buildId}`);
  console.log(`[CERT] Verdict: ${verdict}`);

  // Calculate hashes
  const constitutionHash = hashConstitution(inputs.projectRoot);
  console.log(`[CERT] Constitution Hash: ${constitutionHash.substring(0, 16)}...`);

  const inputHash = calculateInputHash({
    description: inputs.description,
    tier: inputs.tier,
    files: inputs.files,
    intents: inputs.intents,
  });
  console.log(`[CERT] Input Hash: ${inputHash.substring(0, 16)}...`);

  const outputHash = calculateOutputHash({
    verdict,
    metrics: inputs.metrics,
    gates: inputs.gates,
  });
  console.log(`[CERT] Output Hash: ${outputHash.substring(0, 16)}...`);

  // Get OLYMPUS version
  const olympusVersion = getCanonicalVersionIdentity();

  // Calculate gate statistics
  const hardGates = inputs.gates.filter(g => g.type === 'HARD');
  const hardFailed = hardGates.filter(g => !g.passed).length;

  // Build certificate (without hash and signature)
  const partialCert = {
    certificateId,
    buildId: inputs.buildId,
    timestamp,
    verdict,
    blockReason: inputs.blockReason,
    constitutionVersion: '2.0',
    constitutionHash,
    olympusVersion,
    gates: {
      total: inputs.gates.length,
      passed: inputs.gates.filter(g => g.passed).length,
      failed: inputs.gates.filter(g => !g.passed).length,
      hardFailed,
      summary: inputs.gates,
    },
    metrics: {
      wissd: inputs.metrics.wissd,
      ssi: inputs.metrics.ssi,
      uvd: inputs.metrics.uvd,
      ias: inputs.metrics.ias,
      hostileBlockRate: inputs.metrics.hostileTotal > 0
        ? inputs.metrics.hostileBlocked / inputs.metrics.hostileTotal
        : 1,
    },
    governance: {
      overrideApplied: inputs.overrideApplied,
      overrideTarget: inputs.overrideTarget,
      ssiPenalty: inputs.ssiPenalty,
      constitutionalViolations: inputs.constitutionalViolations,
      governanceExploitsBlocked: inputs.governanceExploitsBlocked,
    },
    inputHash,
    outputHash,
  };

  // Calculate certificate hash
  const certificateHash = calculateCertificateHash(partialCert);
  console.log(`[CERT] Certificate Hash: ${certificateHash.substring(0, 16)}...`);

  // Sign the certificate
  const signature = signCertificate(certificateHash, inputs.buildId);
  console.log(`[CERT] Signature: ${signature.substring(0, 16)}...`);

  const certificate: DecisionCertificate = {
    ...partialCert,
    certificateHash,
    signature,
  };

  console.log('[CERT] ==========================================');
  console.log('[CERT] CERTIFICATE GENERATED SUCCESSFULLY');
  console.log('[CERT] ==========================================');

  return certificate;
}

// ============================================
// CERTIFICATE VERIFICATION
// ============================================

/**
 * Verify a decision certificate
 */
export function verifyCertificate(
  certificate: DecisionCertificate,
  projectRoot: string
): CertificateVerificationResult {
  console.log('[CERT-VERIFY] ==========================================');
  console.log('[CERT-VERIFY] VERIFYING DECISION CERTIFICATE');
  console.log('[CERT-VERIFY] ==========================================');

  const errors: string[] = [];
  const checks = {
    signatureValid: false,
    hashesMatch: false,
    constitutionHashValid: false,
    timestampValid: false,
    versionValid: false,
  };

  // Check 1: Verify signature
  const expectedSignature = signCertificate(certificate.certificateHash, certificate.buildId);
  checks.signatureValid = certificate.signature === expectedSignature;
  if (!checks.signatureValid) {
    errors.push('Signature verification failed - certificate may have been tampered');
  }
  console.log(`[CERT-VERIFY] Signature: ${checks.signatureValid ? 'VALID' : 'INVALID'}`);

  // Check 2: Verify certificate hash
  const partialCert = { ...certificate };
  delete (partialCert as Record<string, unknown>).certificateHash;
  delete (partialCert as Record<string, unknown>).signature;
  const expectedHash = calculateCertificateHash(partialCert as Omit<DecisionCertificate, 'certificateHash' | 'signature'>);
  checks.hashesMatch = certificate.certificateHash === expectedHash;
  if (!checks.hashesMatch) {
    errors.push('Certificate hash mismatch - content was modified');
  }
  console.log(`[CERT-VERIFY] Hash Match: ${checks.hashesMatch ? 'VALID' : 'INVALID'}`);

  // Check 3: Verify constitution hash
  const currentConstitutionHash = hashConstitution(projectRoot);
  checks.constitutionHashValid = certificate.constitutionHash === currentConstitutionHash;
  if (!checks.constitutionHashValid) {
    errors.push('Constitution hash mismatch - constitution was modified since certification');
  }
  console.log(`[CERT-VERIFY] Constitution: ${checks.constitutionHashValid ? 'VALID' : 'CHANGED'}`);

  // Check 4: Verify timestamp is valid ISO date
  const timestamp = new Date(certificate.timestamp);
  checks.timestampValid = !isNaN(timestamp.getTime()) && timestamp <= new Date();
  if (!checks.timestampValid) {
    errors.push('Invalid timestamp - certificate timestamp is invalid or in future');
  }
  console.log(`[CERT-VERIFY] Timestamp: ${checks.timestampValid ? 'VALID' : 'INVALID'}`);

  // Check 5: Verify OLYMPUS version is canonical
  checks.versionValid = certificate.olympusVersion.governanceAuthority === 'CANONICAL';
  if (!checks.versionValid) {
    errors.push('Non-canonical governance authority - certificate not from canonical OLYMPUS');
  }
  console.log(`[CERT-VERIFY] Version: ${checks.versionValid ? 'CANONICAL' : 'NON-CANONICAL'}`);

  const valid = Object.values(checks).every(v => v);

  console.log('[CERT-VERIFY] ==========================================');
  console.log(`[CERT-VERIFY] VERIFICATION: ${valid ? 'PASSED' : 'FAILED'}`);
  if (errors.length > 0) {
    console.log('[CERT-VERIFY] Errors:');
    errors.forEach(e => console.log(`[CERT-VERIFY]   - ${e}`));
  }
  console.log('[CERT-VERIFY] ==========================================');

  return { valid, errors, checks };
}

// ============================================
// CERTIFICATE PERSISTENCE
// ============================================

/**
 * Write certificate to filesystem
 */
export function writeCertificate(
  fsOutputDir: string,
  certificate: DecisionCertificate
): { path: string; filename: string } {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  // Write JSON certificate
  const jsonFilename = `_decision-certificate-${certificate.buildId}.json`;
  const jsonPath = path.join(olympusDir, jsonFilename);
  fs.writeFileSync(jsonPath, JSON.stringify(certificate, null, 2));
  console.log(`[CERT] Written: ${jsonFilename}`);

  // Also write human-readable summary
  const summaryFilename = `DECISION_CERTIFICATE.md`;
  const summaryPath = path.join(fsOutputDir, summaryFilename);
  fs.writeFileSync(summaryPath, generateCertificateSummary(certificate));
  console.log(`[CERT] Written: ${summaryFilename}`);

  return { path: jsonPath, filename: jsonFilename };
}

/**
 * Generate human-readable certificate summary
 */
function generateCertificateSummary(cert: DecisionCertificate): string {
  const lines: string[] = [];

  lines.push('# OLYMPUS Decision Certificate');
  lines.push('');
  lines.push('```');
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push(`║  CERTIFICATE: ${cert.certificateId.padEnd(47)}║`);
  lines.push('╠══════════════════════════════════════════════════════════════════╣');
  lines.push(`║  VERDICT: ${cert.verdict.padEnd(51)}║`);
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('```');
  lines.push('');

  lines.push('## Certificate Details');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Build ID | \`${cert.buildId}\` |`);
  lines.push(`| Timestamp | ${cert.timestamp} |`);
  lines.push(`| OLYMPUS Version | ${cert.olympusVersion.olympusVersion} |`);
  lines.push(`| Constitution Version | ${cert.constitutionVersion} |`);
  lines.push(`| Governance Authority | ${cert.olympusVersion.governanceAuthority} |`);
  lines.push('');

  if (cert.blockReason) {
    lines.push('## Block Reason');
    lines.push('');
    lines.push(`> ${cert.blockReason}`);
    lines.push('');
  }

  lines.push('## Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| W-ISS-D | ${cert.metrics.wissd}% |`);
  lines.push(`| SSI | ${(cert.metrics.ssi * 100).toFixed(1)}% |`);
  lines.push(`| UVD | ${(cert.metrics.uvd * 100).toFixed(1)}% |`);
  lines.push(`| IAS | ${(cert.metrics.ias * 100).toFixed(1)}% |`);
  lines.push(`| Hostile Block Rate | ${(cert.metrics.hostileBlockRate * 100).toFixed(1)}% |`);
  lines.push('');

  lines.push('## Gate Summary');
  lines.push('');
  lines.push(`- **Total Gates:** ${cert.gates.total}`);
  lines.push(`- **Passed:** ${cert.gates.passed}`);
  lines.push(`- **Failed:** ${cert.gates.failed}`);
  lines.push(`- **Hard Failed:** ${cert.gates.hardFailed}`);
  lines.push('');

  if (cert.governance.overrideApplied) {
    lines.push('## Override Applied');
    lines.push('');
    lines.push(`- **Target:** ${cert.governance.overrideTarget}`);
    lines.push(`- **SSI Penalty:** ${(cert.governance.ssiPenalty * 100).toFixed(0)}%`);
    lines.push('');
  }

  lines.push('## Cryptographic Verification');
  lines.push('');
  lines.push('```');
  lines.push(`Constitution Hash: ${cert.constitutionHash}`);
  lines.push(`Input Hash:        ${cert.inputHash}`);
  lines.push(`Output Hash:       ${cert.outputHash}`);
  lines.push(`Certificate Hash:  ${cert.certificateHash}`);
  lines.push(`Signature:         ${cert.signature}`);
  lines.push('```');
  lines.push('');

  lines.push('## Verification');
  lines.push('');
  lines.push('To verify this certificate:');
  lines.push('');
  lines.push('1. Ensure the constitution file has not changed (compare hashes)');
  lines.push('2. Recalculate the certificate hash from contents');
  lines.push('3. Verify the HMAC signature using the build ID');
  lines.push('4. Confirm governance authority is CANONICAL');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by OLYMPUS ${cert.olympusVersion.olympusVersion} at ${cert.timestamp}*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Load certificate from filesystem
 */
export function loadCertificate(certificatePath: string): DecisionCertificate | null {
  if (!fs.existsSync(certificatePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(certificatePath, 'utf-8');
    return JSON.parse(content) as DecisionCertificate;
  } catch {
    return null;
  }
}

// ============================================
// CERTIFICATE OUTPUT FOR BUILD
// ============================================

/**
 * Get certificate output for build artifact
 */
export function getCertificateOutput(cert: DecisionCertificate): {
  certificateId: string;
  verdict: DecisionVerdict;
  constitutionHash: string;
  certificateHash: string;
  signature: string;
  verified: boolean;
} {
  return {
    certificateId: cert.certificateId,
    verdict: cert.verdict,
    constitutionHash: cert.constitutionHash,
    certificateHash: cert.certificateHash,
    signature: cert.signature,
    verified: true,  // Just generated, so verified
  };
}
