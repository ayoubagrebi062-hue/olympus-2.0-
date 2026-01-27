import * as fs from 'fs';
import * as path from 'path';

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass: 'A' | 'B' | 'C' | 'UNKNOWN';
  }>;
}

interface GovernancePhase {
  version: string;
  currentPhase: 'OBSERVATION_ONLY' | 'SCOPED_ENFORCEMENT' | 'FULL_ENFORCEMENT';
  phases: {
    OBSERVATION_ONLY: {
      description: string;
      blockingModules: string[];
      observationModules: string[];
    };
    SCOPED_ENFORCEMENT: {
      description: string;
      blockingModules: string[];
      scope: string;
    };
    FULL_ENFORCEMENT: {
      description: string;
      blockingModules: string | string[];
    };
  };
}

// Execution domain classification
type ExecutionDomain = 'EXEC' | 'NON_EXEC' | 'GOVERNANCE';

// Destruction semantics (Phase A+)
interface DestructionBlock {
  scope: 'global' | 'tenant' | 'project' | 'record';
  reversibility: 'reversible' | 'hard_delete' | 'soft_delete';
  justification: string;
}

interface DestructionSemantics {
  declared?: DestructionBlock;
  inferred?: {
    scope: 'global' | 'tenant' | 'project' | 'record';
    confidence: 'high' | 'medium' | 'low';
    patterns: string[];
  };
  scopeMatch: boolean;
  warnings: string[];
}

interface Violation {
  file: string;
  violationType: ViolationType;
  description: string;
  severity: 'error' | 'warning';
  scope: 'governed' | 'legacy' | 'critical';
  domain: ExecutionDomain;
  effectTrigger?: string;
  destructionSemantics?: DestructionSemantics;
}

type ViolationType =
  | 'missing_decision_id'
  | 'multiple_decision_ids'
  | 'invalid_uuid_format'
  | 'decision_id_not_found'
  | 'tier2_without_decision_id'
  | 'tier3_without_decision_id';

type FileScope = 'governed' | 'legacy' | 'critical';

interface EnforcementReport {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  violations: Violation[];
  scopeSummary: {
    governedFilesChecked: number;
    legacyFilesObserved: number;
    criticalFilesEnforced: number;
  };
  governancePhase: string;
  summary: {
    byTier: {
      tier1: number;
      tier2: number;
      tier3: number;
      meta: number;
      unclassified: number;
    };
    byType: Record<ViolationType, number>;
    byScope: {
      governed: number;
      legacy: number;
      critical: number;
    };
  };
}

export class DecisionBindingGate {
  private decisionSchema: DecisionSchema;
  private governancePhase: GovernancePhase | null = null;
  private readonly UUID_V4_REGEX: RegExp;
  private readonly PHASE_PATH: string;

  constructor(
    decisionSchemaPath: string = 'contracts/decision-schema.json',
    phasePath: string = 'contracts/governance-phase.json'
  ) {
    this.decisionSchema = this.loadDecisionSchema(decisionSchemaPath);
    this.UUID_V4_REGEX =
      /["']?([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']?/gi;
    this.PHASE_PATH = phasePath;
    this.loadGovernancePhase();
  }

  private loadDecisionSchema(decisionSchemaPath: string): DecisionSchema {
    if (!fs.existsSync(decisionSchemaPath)) {
      return { decisions: [] };
    }

    try {
      const content = fs.readFileSync(decisionSchemaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { decisions: [] };
    }
  }

  private loadGovernancePhase(): void {
    if (!fs.existsSync(this.PHASE_PATH)) {
      console.warn(`Governance phase config not found: ${this.PHASE_PATH}`);
      console.warn('Defaulting to OBSERVATION_ONLY phase');
      this.governancePhase = this.getDefaultPhase();
      return;
    }

    try {
      const content = fs.readFileSync(this.PHASE_PATH, 'utf-8');
      this.governancePhase = JSON.parse(content);
    } catch (error) {
      console.error('Failed to load governance phase config:', error);
      console.warn('Defaulting to OBSERVATION_ONLY phase');
      this.governancePhase = this.getDefaultPhase();
    }
  }

  private getDefaultPhase(): GovernancePhase {
    return {
      version: '1.0.0',
      currentPhase: 'OBSERVATION_ONLY',
      phases: {
        OBSERVATION_ONLY: {
          description: 'No blocking except schema/contract violations',
          blockingModules: ['decision-binding', 'decision-finalization'],
          observationModules: [
            'deliberation-audit',
            'reasoning-quality-audit',
            'capability-learning',
            'governance-observatory',
          ],
        },
        SCOPED_ENFORCEMENT: {
          description: 'Block only on new/modified files',
          blockingModules: ['decision-binding', 'decision-finalization', 'deliberation-audit'],
          scope: 'git-diff',
        },
        FULL_ENFORCEMENT: {
          description: 'All governance rules enforced',
          blockingModules: 'ALL',
        },
      },
    };
  }

  private isObservationOnlyPhase(): boolean {
    return this.governancePhase?.currentPhase === 'OBSERVATION_ONLY';
  }

  /**
   * Classify execution domain (EXEC / NON_EXEC / GOVERNANCE)
   *
   * EXEC: Backend services, API routes, data operations - CAN be Tier C
   * NON_EXEC: UI components, frontend pages, display logic - CANNOT be Tier C
   * GOVERNANCE: Governance logic itself - Exempt (META tier)
   *
   * NOTE: UI/dashboard files (NON_EXEC) cannot be Tier C because:
   * 1. They contain only presentation logic, no destructive effects
   * 2. Keywords like "drop" or "truncate" refer to CSS/UI behavior, not data destruction
   * 3. True destructive operations require backend execution context (API routes, services)
   * 4. Requiring Decision IDs for UI files would create false positives and unnecessary friction
   */
  private classifyExecutionDomain(content: string, filePath: string): ExecutionDomain {
    const relativePath = this.getRelativePath(filePath);

    // GOVERNANCE domain: Governance logic is exempt (META tier)
    if (
      relativePath.includes('/lib/agents/governance/') ||
      relativePath.includes('/governance/') ||
      relativePath.includes('/ci/')
    ) {
      return 'GOVERNANCE';
    }

    // NON_EXEC domain: UI components, frontend pages
    if (
      relativePath.startsWith('app/') ||
      relativePath.startsWith('components/') ||
      relativePath.startsWith('lib/preview/') ||
      relativePath.includes('/ui/')
    ) {
      return 'NON_EXEC';
    }

    // EXEC domain: Backend services, API routes
    if (
      relativePath.startsWith('src/app/api/') ||
      relativePath.startsWith('src/lib/') ||
      relativePath.startsWith('lib/')
    ) {
      return 'EXEC';
    }

    // Default: Treat as NON_EXEC (conservative)
    return 'NON_EXEC';
  }

  /**
   * Parse @destruction block from EXEC Tier-C files
   *
   * Format:
   * @destruction {
   *   scope: "global" | "tenant" | "project" | "record",
   *   reversibility: "reversible" | "hard_delete" | "soft_delete",
   *   justification: "Human-readable explanation"
   * }
   *
   * Returns parsed block or undefined if not found/invalid
   */
  private parseDestructionBlock(content: string): DestructionBlock | undefined {
    const destructionMatch = content.match(
      /@destruction\s*{\s*scope:\s*["']?(global|tenant|project|record)["']?,\s*reversibility:\s*["']?(reversible|hard_delete|soft_delete)["']?,\s*justification:\s*["']([^"']+)["']?[\s\S]*?}/i
    );

    if (!destructionMatch) {
      return undefined;
    }

    return {
      scope: destructionMatch[1] as DestructionBlock['scope'],
      reversibility: destructionMatch[2] as DestructionBlock['reversibility'],
      justification: destructionMatch[3].trim(),
    };
  }

  /**
   * Infer blast radius from code patterns (Phase A+)
   *
   * Analyzes code to determine potential impact scope:
   * - GLOBAL: No WHERE clause, DROP TABLE, mass deletion
   * - TENANT: Tenant ID filters, tenant-wide operations
   * - PROJECT: Project ID filters, project-specific operations
   * - RECORD: Record ID filters, single record operations
   *
   * Returns inferred scope with confidence and detected patterns
   */
  private inferBlastRadius(content: string): {
    scope: 'global' | 'tenant' | 'project' | 'record';
    confidence: 'high' | 'medium' | 'low';
    patterns: string[];
  } {
    const patterns: string[] = [];
    let scope: 'global' | 'tenant' | 'project' | 'record' = 'global';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Global scope: No WHERE clause or explicit DROP/DELETE without filters
    if (/DELETE\s+FROM\s+\w+\s*;?\s*$/.test(content)) {
      patterns.push('DELETE without WHERE clause');
      scope = 'global';
      confidence = 'high';
    }

    if (/DROP\s+(TABLE|DATABASE|SCHEMA)/i.test(content)) {
      patterns.push('SQL DROP statement');
      scope = 'global';
      confidence = 'high';
    }

    if (/TRUNCATE\s+TABLE/i.test(content)) {
      patterns.push('TRUNCATE TABLE');
      scope = 'global';
      confidence = 'high';
    }

    // Record scope: Record ID filters
    const recordPatterns = [
      /\.eq\(['"`](id|record_id|file_id)['"`]\s*,\s*['"]?\w+['"]?\)/gi,
      /where\s+id\s*=\s*['"]?\w+['"]?/gi,
      /where\s+record_id\s*=\s*['"]?\w+['"]?/gi,
      /where\s+file_id\s*=\s*['"]?\w+['"]?/gi,
    ];

    for (const pattern of recordPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(`Record ID filter: ${matches[0]}`);
        scope = 'record';
        confidence = 'high';
        break;
      }
    }

    // Project scope: Project ID filters
    const projectPatterns = [
      /\.eq\(['"]project_id['"`]\s*,\s*['"`]?\w+['"`]\)/gi,
      /where\s+project_id\s*=\s*['"`]?\w+['"`]?/gi,
      /projectId:\s*['"`]?\w+['"`]?/gi,
    ];

    for (const pattern of projectPatterns) {
      const matches = content.match(pattern);
      if (matches && scope === 'global') {
        patterns.push(`Project ID filter: ${matches[0]}`);
        scope = 'project';
        confidence = 'medium';
        break;
      }
    }

    // Tenant scope: Tenant ID filters
    const tenantPatterns = [
      /\.eq\(['"]tenant_id['"`]\s*,\s*['"`]?\w+['"`]\)/gi,
      /where\s+tenant_id\s*=\s*['"`]?\w+['"`]?/gi,
      /tenantId:\s*['"`]?\w+['"`]?/gi,
    ];

    for (const pattern of tenantPatterns) {
      const matches = content.match(pattern);
      if (matches && scope === 'global') {
        patterns.push(`Tenant ID filter: ${matches[0]}`);
        scope = 'tenant';
        confidence = 'medium';
        break;
      }
    }

    return { scope, confidence, patterns };
  }

  private writeReport(
    report: EnforcementReport,
    domainCounts: { EXEC: number; NON_EXEC: number; GOVERNANCE: number }
  ): void {
    const dataDir = path.join(process.cwd(), 'data', 'governance');
    const reportPath = path.join(dataDir, 'decision-binding-report.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const reportData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      governancePhase: this.governancePhase?.currentPhase || 'UNKNOWN',
      totalFiles: report.totalFiles,
      passedFiles: report.passedFiles,
      failedFiles: report.failedFiles,
      scopeSummary: report.scopeSummary,
      domainCounts,
      summary: report.summary,
      violations: report.violations,
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    } catch (error) {
      console.warn('Failed to write decision binding report:', error);
    }
  }

  private analyzeDestructionSemantics(
    content: string,
    domain: ExecutionDomain
  ): DestructionSemantics | undefined {
    if (domain !== 'EXEC') {
      return undefined;
    }

    const { tier } = this.classifyTier(content, domain);
    if (tier !== 'tier3') {
      return undefined;
    }

    const declared = this.parseDestructionBlock(content);
    const inferred = this.inferBlastRadius(content);
    const warnings: string[] = [];

    if (declared) {
      const scopeOrder = ['record', 'project', 'tenant', 'global'];

      if (scopeOrder.indexOf(declared.scope) < scopeOrder.indexOf(inferred.scope)) {
        warnings.push(
          `UNDERESTIMATED SCOPE: Declared scope "${declared.scope}" is narrower than inferred scope "${inferred.scope}". ` +
            `Code patterns suggest wider impact. Inferred confidence: ${inferred.confidence}. ` +
            `Patterns: ${inferred.patterns.join(', ')}.`
        );
      } else if (scopeOrder.indexOf(declared.scope) > scopeOrder.indexOf(inferred.scope)) {
        warnings.push(
          `OVERESTIMATED SCOPE: Declared scope "${declared.scope}" is wider than inferred scope "${inferred.scope}". ` +
            `This is conservative and safe. Inferred confidence: ${inferred.confidence}. ` +
            `Patterns: ${inferred.patterns.join(', ')}.`
        );
      }

      if (declared.reversibility === 'reversible' && inferred.confidence === 'high') {
        if (inferred.scope === 'global' || inferred.scope === 'tenant') {
          warnings.push(
            `REVERSIBILITY WARNING: Declared reversibility as "${declared.reversibility}" but code patterns suggest ` +
              `${inferred.scope === 'global' ? 'global' : 'tenant-wide'} deletion, which may be difficult to reverse. ` +
              `Review justifications carefully.`
          );
        }
      }
    } else {
      warnings.push(
        `MISSING @destruction BLOCK: Tier 3 file lacks @destruction declaration. ` +
          `Inferred scope: ${inferred.scope} (confidence: ${inferred.confidence}). ` +
          `Consider adding @destruction block for better documentation. ` +
          `Format: @destruction { scope: "scope", reversibility: "reversible|hard_delete|soft_delete", justification: "reason" }`
      );
    }

    return {
      declared,
      inferred,
      scopeMatch: declared ? declared.scope === inferred.scope : false,
      warnings,
    };
  }

  private classifyScope(content: string, filePath: string, tier: string): FileScope {
    const relativePath = this.getRelativePath(filePath);
    const contentLower = content.toLowerCase();

    const hasGovernanceMarkers =
      contentLower.includes('@governed') ||
      contentLower.includes('@decision-id') ||
      contentLower.includes('decision_id:') ||
      contentLower.includes('decisionId:') ||
      contentLower.includes('DECISION_ID:');

    const isGovernancePath =
      relativePath.includes('/agents/') ||
      relativePath.includes('/governance/') ||
      relativePath.includes('/ci/') ||
      relativePath.includes('/capabilities/');

    if (tier === 'tier3') {
      if (hasGovernanceMarkers || isGovernancePath) {
        return 'critical';
      }
      return 'legacy';
    }

    if (hasGovernanceMarkers || isGovernancePath) {
      return 'governed';
    }

    return 'legacy';
  }

  enforce(filePaths: string[]): EnforcementReport {
    const violations: Violation[] = [];
    const scopeSummary = {
      governedFilesChecked: 0,
      legacyFilesObserved: 0,
      criticalFilesEnforced: 0,
    };
    const summary = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      meta: 0,
      unclassified: 0,
    };
    const scopeCounts = {
      governed: 0,
      legacy: 0,
      critical: 0,
    };
    const domainCounts = {
      EXEC: 0,
      NON_EXEC: 0,
      GOVERNANCE: 0,
    };

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        continue;
      }

      const fileViolations = this.analyzeFile(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const domain = this.classifyExecutionDomain(content, filePath);
      const { tier } = this.classifyTier(content, domain);
      const scope = fileViolations.length > 0 ? fileViolations[0].scope : 'legacy';

      if (scope === 'governed') {
        scopeSummary.governedFilesChecked++;
      } else if (scope === 'critical') {
        scopeSummary.criticalFilesEnforced++;
      } else {
        scopeSummary.legacyFilesObserved++;
      }

      scopeCounts[scope]++;
      domainCounts[domain]++;
      this.updateSummary(tier, summary);
      violations.push(...fileViolations);
    }

    const report: EnforcementReport = {
      totalFiles: filePaths.length,
      passedFiles: summary.tier1 + summary.tier2 + summary.tier3 + summary.meta,
      failedFiles: violations.filter(v => v.severity === 'error').length,
      violations,
      scopeSummary,
      governancePhase: this.governancePhase?.currentPhase || 'UNKNOWN',
      summary: {
        byTier: summary,
        byType: this.calculateViolationByType(violations),
        byScope: scopeCounts,
      },
    };

    this.printReport(report, domainCounts);

    this.writeReport(report, domainCounts);

    if (report.failedFiles > 0) {
      process.exit(1);
    }

    return report;
  }

  private analyzeFile(filePath: string): Violation[] {
    const violations: Violation[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = this.getRelativePath(filePath);

    // Classify execution domain first
    const domain = this.classifyExecutionDomain(content, filePath);

    // GOVERNANCE domain: META tier - exempt from blocking
    if (domain === 'GOVERNANCE') {
      return violations; // No violations for governance logic
    }

    // Classify tier based on effects (not keywords)
    const { tier, effectTrigger } = this.classifyTier(content, domain);
    const scope = this.classifyScope(content, filePath, tier);
    const decisionIds = this.extractDecisionIds(content);

    // Phase A+: Analyze destruction semantics for EXEC Tier-C files
    const destructionSemantics = this.analyzeDestructionSemantics(content, domain);

    const isObservationOnly = this.isObservationOnlyPhase();
    const isCritical = scope === 'critical';
    const isGoverned = scope === 'governed';
    const isLegacy = scope === 'legacy';
    const isLegacyCritical = tier === 'tier3' && isLegacy;
    const shouldBlock = (isCritical && !isLegacyCritical) || (isGoverned && !isObservationOnly);
    const severity: 'error' | 'warning' = shouldBlock ? 'error' : 'warning';

    // NON_EXEC domain: Cannot be Tier C (no destructive effects possible)
    // UI files with keywords like "drop" or "truncate" are NOT truly destructive
    if (domain === 'NON_EXEC' && tier === 'tier3') {
      // Downgrade to tier2 for NON_EXEC files
      // Keywords in UI files refer to CSS/behavior, not data destruction
      // True Tier 3 requires EXEC domain with actual destructive effects
      if (decisionIds.length === 0) {
        // Warning only, not blocking
        const violationType = 'tier2_without_decision_id';
        const blockReason =
          'NON_EXEC domain: UI file with Tier 3-like keywords. Keywords refer to presentation logic, not destructive operations. Decision ID recommended but not required.';

        violations.push({
          file: relativePath,
          violationType,
          description: `UI file contains Tier 3-like keywords but no Decision ID. Keywords like "drop" or "truncate" in UI files refer to presentation logic (drag-drop, text truncation), not destructive data operations. Decision ID recommended for clarity but not required. ${blockReason}`,
          severity: 'warning',
          scope: 'legacy',
          domain,
          effectTrigger,
        });
      }
      return violations;
    }

    // Phase A+: Add destruction semantics warnings (WARNING ONLY, no blocking)
    if (destructionSemantics && destructionSemantics.warnings.length > 0) {
      for (const warning of destructionSemantics.warnings) {
        violations.push({
          file: relativePath,
          violationType: 'tier3_without_decision_id', // Reuse existing type for Phase A+ warnings
          description: `[PHASE A+ DESTRUCTION ANALYSIS] ${warning}`,
          severity: 'warning', // ALWAYS WARNING, never blocking
          scope: 'legacy',
          domain,
          effectTrigger,
          destructionSemantics,
        });
      }
    }

    // EXEC domain: Normal enforcement
    if (tier === 'tier2' || tier === 'tier3' || scope === 'critical') {
      if (decisionIds.length === 0) {
        const violationType =
          tier === 'tier3' ? 'tier3_without_decision_id' : 'tier2_without_decision_id';
        const blockReason =
          isCritical && !isLegacyCritical
            ? 'CRITICAL SCOPE: All Tier 3 actions require Decision IDs'
            : isGoverned
              ? 'GOVERNED CODE: Files in governance scope require Decision IDs'
              : isObservationOnly
                ? 'OBSERVATION_ONLY: Legacy code observed in phase A - Decision ID recommended'
                : '';

        const description = `${tier.toUpperCase()} action missing Decision ID reference`;
        const effectDesc = effectTrigger ? ` (Effect: ${effectTrigger})` : '';

        violations.push({
          file: relativePath,
          violationType,
          description: `${description}${effectDesc}. Expected format: decisionId: "uuid-v4", decision_id: "uuid-v4", @decision-id: "uuid-v4", or DECISION_ID: "uuid-v4". ${blockReason}`,
          severity: isLegacyCritical ? 'warning' : severity,
          scope: isLegacyCritical ? 'legacy' : scope,
          domain,
          effectTrigger,
          destructionSemantics,
        });
      } else if (decisionIds.length > 1) {
        const violationType = 'multiple_decision_ids';
        const blockReason =
          isCritical && !isLegacyCritical
            ? 'CRITICAL SCOPE: Exactly one Decision ID required'
            : isGoverned
              ? 'GOVERNED CODE: Exactly one Decision ID required'
              : '';

        const description = `Multiple Decision IDs found (${decisionIds.length}). Exactly one required. Found: ${decisionIds.join(', ')}`;
        const effectDesc = effectTrigger ? ` (Effect: ${effectTrigger})` : '';

        violations.push({
          file: relativePath,
          violationType,
          description: `${description}${effectDesc}. ${blockReason}`,
          severity: isLegacyCritical ? 'warning' : severity,
          scope: isLegacyCritical ? 'legacy' : scope,
          domain,
          effectTrigger,
          destructionSemantics,
        });

        for (const decisionId of decisionIds) {
          if (!this.isValidUUID(decisionId)) {
            violations.push({
              file: relativePath,
              violationType: 'invalid_uuid_format',
              description: `Invalid UUID format: ${decisionId}. Expected format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is 0-9 or a-f`,
              severity: 'error',
              scope: isLegacyCritical ? 'legacy' : scope,
              domain,
              effectTrigger,
              destructionSemantics,
            });
          }

          if (!this.decisionIdExists(decisionId)) {
            violations.push({
              file: relativePath,
              violationType: 'decision_id_not_found',
              description: `Decision ID not found in decision-schema.json or decision-log.json: ${decisionId}. Ensure decision is registered in contracts/decision-schema.json or data/decisions/decision-log.json`,
              severity: 'error',
              scope: isLegacyCritical ? 'legacy' : scope,
              domain,
              effectTrigger,
              destructionSemantics,
            });
          }
        }
      } else {
        const decisionId = decisionIds[0];

        if (!this.isValidUUID(decisionId)) {
          violations.push({
            file: relativePath,
            violationType: 'invalid_uuid_format',
            description: `Invalid UUID format: ${decisionId}. Expected format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is 0-9 or a-f`,
            severity: 'error',
            scope: isLegacyCritical ? 'legacy' : scope,
            domain,
            effectTrigger,
            destructionSemantics,
          });
        }

        if (!this.decisionIdExists(decisionId)) {
          violations.push({
            file: relativePath,
            violationType: 'decision_id_not_found',
            description: `Decision ID not found in decision-schema.json or decision-log.json: ${decisionId}. Ensure decision is registered in contracts/decision-schema.json or data/decisions/decision-log.json`,
            severity: 'error',
            scope: isLegacyCritical ? 'legacy' : scope,
            domain,
            effectTrigger,
            destructionSemantics,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Classify tier based on EFFECTS (not keywords)
   *
   * Effect-based detection distinguishes between:
   * - TIER 3: Truly destructive operations (DROP TABLE, DELETE without WHERE, rm -rf)
   * - TIER 2: Write operations (INSERT, UPDATE, DELETE with WHERE)
   * - TIER 1: Read operations (SELECT, queries)
   *
   * Keywords alone are insufficient because:
   * - "drop" in UI files refers to drag-drop, not DROP TABLE
   * - "truncate" in UI refers to text truncation, not TRUNCATE TABLE
   * - "delete" is used in comments, strings, and CSS classes
   *
   * Effect detection checks for ACTUAL destructive patterns:
   * - SQL: DROP TABLE, DELETE FROM without WHERE clause
   * - Filesystem: rm -rf, unlinkSync, fs.unlink
   * - Database: db.drop(), hardDelete functions
   */
  private classifyTier(
    content: string,
    domain: ExecutionDomain
  ): { tier: string; effectTrigger?: string } {
    const contentLower = content.toLowerCase();

    // GOVERNANCE domain: META tier (exempt from blocking)
    if (domain === 'GOVERNANCE') {
      return { tier: 'meta' };
    }

    // NON_EXEC domain: Cannot be Tier 3 (no destructive effects possible)
    // UI files contain keywords in comments/strings, not actual destructive operations
    if (domain === 'NON_EXEC') {
      // Check for Tier 2-like patterns in NON_EXEC (e.g., API calls)
      if (
        contentLower.includes('mutation') ||
        contentLower.includes('usemutation') ||
        contentLower.includes('delete()') ||
        contentLower.includes('patch(') ||
        contentLower.includes('put(')
      ) {
        return { tier: 'tier2' };
      }
      return { tier: 'tier1' };
    }

    // EXEC domain: Effect-based detection for backend files

    // TIER 3: Destructive effects
    // Check for actual SQL DROP statements (not in comments/strings)
    const dropTableMatch = content.match(/\b(DROP\s+TABLE|DROP\s+DATABASE|DROP\s+SCHEMA)\s+\w+/gi);
    if (dropTableMatch) {
      return { tier: 'tier3', effectTrigger: `SQL DROP: ${dropTableMatch[0]}` };
    }

    // Check for DELETE without WHERE (massive data loss)
    // Pattern: DELETE FROM table (without WHERE clause on same line)
    const deleteWithoutWhereMatch = content.match(/DELETE\s+FROM\s+\w+\s*;?\s*$/gim);
    if (deleteWithoutWhereMatch) {
      return {
        tier: 'tier3',
        effectTrigger: `DELETE without WHERE: ${deleteWithoutWhereMatch[0]}`,
      };
    }

    // Check for TRUNCATE TABLE
    const truncateTableMatch = content.match(/TRUNCATE\s+TABLE\s+\w+/gi);
    if (truncateTableMatch) {
      return { tier: 'tier3', effectTrigger: `TRUNCATE TABLE: ${truncateTableMatch[0]}` };
    }

    // Check for filesystem destruction: rm -rf
    const rmRfMatch = content.match(/rm\s+-rf\s+[^"'\s]+/g);
    if (rmRfMatch) {
      return { tier: 'tier3', effectTrigger: `rm -rf: ${rmRfMatch[0]}` };
    }

    // Check for sync file deletion: unlinkSync
    const unlinkSyncMatch = content.match(/fs\.unlinkSync\s*\(|unlinkSync\s*\(/g);
    if (unlinkSyncMatch) {
      return { tier: 'tier3', effectTrigger: 'fs.unlinkSync (synchronous delete)' };
    }

    // Check for hardDelete function (bypasses soft delete)
    const hardDeleteMatch = content.match(/hardDelete\s*\(|\.hardDelete\s*\(/g);
    if (hardDeleteMatch) {
      return { tier: 'tier3', effectTrigger: 'hardDelete function call' };
    }

    // Check for direct database drop operations
    const dbDropMatch = content.match(
      /db\.drop\s*\(|\.drop\s*\(\s*\{[\s\S]*?type:\s*['"](table|database|collection)['"]/g
    );
    if (dbDropMatch) {
      return { tier: 'tier3', effectTrigger: 'db.drop() operation' };
    }

    // TIER 2: Write operations (with conditions)
    if (
      (contentLower.includes('supabase.from(') &&
        (contentLower.includes('.insert(') ||
          contentLower.includes('.update(') ||
          contentLower.includes('.delete().eq('))) ||
      contentLower.includes('db.write') ||
      contentLower.includes('db.insert') ||
      contentLower.includes('db.update') ||
      contentLower.includes('db.delete') ||
      contentLower.includes('db.create')
    ) {
      return { tier: 'tier2' };
    }

    // TIER 2: Enforcement/rejection operations
    if (
      contentLower.includes('enforce(') ||
      contentLower.includes('reject(') ||
      contentLower.includes('block(')
    ) {
      return { tier: 'tier2' };
    }

    // Default: TIER 1 (safe/read operations)
    return { tier: 'tier1' };
  }

  private extractDecisionIds(content: string): string[] {
    const decisionIds: string[] = [];
    const uuidRegex =
      /["']?([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']?/gi;
    let match: RegExpExecArray | null;

    while ((match = uuidRegex.exec(content)) !== null) {
      if (match[1]) {
        const decisionId = match[1].toLowerCase();
        if (!decisionIds.includes(decisionId)) {
          decisionIds.push(decisionId);
        }
      }
    }

    return decisionIds;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private decisionIdExists(decisionId: string): boolean {
    if (!this.decisionSchema.decisions) {
      return false;
    }

    const foundInSchema = this.decisionSchema.decisions.some(
      decision => decision.id.toLowerCase() === decisionId.toLowerCase()
    );

    if (foundInSchema) {
      return true;
    }

    const decisionLogPath = 'data/decisions/decision-log.json';
    if (fs.existsSync(decisionLogPath)) {
      try {
        const content = fs.readFileSync(decisionLogPath, 'utf-8');
        const decisionLog = JSON.parse(content);

        if (decisionLog.decisions && Array.isArray(decisionLog.decisions)) {
          return decisionLog.decisions.some(
            (d: any) =>
              d.decisionIdentity && d.decisionIdentity.id.toLowerCase() === decisionId.toLowerCase()
          );
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  private calculateViolationByType(violations: Violation[]): Record<ViolationType, number> {
    const counts: Record<ViolationType, number> = {
      missing_decision_id: 0,
      multiple_decision_ids: 0,
      invalid_uuid_format: 0,
      decision_id_not_found: 0,
      tier2_without_decision_id: 0,
      tier3_without_decision_id: 0,
    };

    for (const violation of violations) {
      counts[violation.violationType]++;
    }

    return counts;
  }

  private updateSummary(tier: string, summary: any): void {
    // Handle meta tier (governance logic exempt)
    if (tier === 'meta') {
      summary.meta = (summary.meta || 0) + 1;
      return;
    }

    // Handle tier1, tier2, tier3, unclassified
    if (summary[`tier${tier}`] !== undefined) {
      summary[`tier${tier}`]++;
    } else if (summary[tier] !== undefined) {
      summary[tier]++;
    }
  }

  private printReport(
    report: EnforcementReport,
    domainCounts: { EXEC: number; NON_EXEC: number; GOVERNANCE: number }
  ): void {
    console.log('\n=== Decision Binding Enforcement Report ===\n');

    console.log('Governance Phase:', report.governancePhase);
    console.log('Domain Distribution:');
    console.log(`  EXEC (Backend):      ${domainCounts.EXEC}`);
    console.log(`  NON_EXEC (UI/Front): ${domainCounts.NON_EXEC}`);
    console.log(`  GOVERNANCE (Meta):    ${domainCounts.GOVERNANCE}`);

    console.log('\nScope Summary:');
    console.log(`  Governed Files Checked:  ${report.scopeSummary.governedFilesChecked}`);
    console.log(`  Legacy Files Observed:   ${report.scopeSummary.legacyFilesObserved}`);
    console.log(`  Critical Files Enforced: ${report.scopeSummary.criticalFilesEnforced}`);

    console.log('\nFile Summary:');
    console.log(`  Total Files:  ${report.totalFiles}`);
    console.log(`  Passed:       ${report.passedFiles}`);
    console.log(`  Failed:       ${report.failedFiles}`);

    console.log('\nScope Distribution:');
    console.log(`  Governed:  ${report.summary.byScope.governed}`);
    console.log(`  Legacy:    ${report.summary.byScope.legacy}`);
    console.log(`  Critical:   ${report.summary.byScope.critical}`);

    console.log('\nTier Distribution:');
    console.log(`  Tier 1:       ${report.summary.byTier.tier1}`);
    console.log(`  Tier 2:       ${report.summary.byTier.tier2}`);
    console.log(`  Tier 3:       ${report.summary.byTier.tier3}`);
    console.log(`  META (Gov):    ${report.summary.byTier.meta || 0}`);
    console.log(`  Unclassified:  ${report.summary.byTier.unclassified}`);

    console.log('\nScope Enforcement Rules:');
    console.log(`  CRITICAL (Tier 3): Always BLOCK`);
    console.log(
      `  GOVERNED:           ${this.isObservationOnlyPhase() ? 'WARNING (Observation Only)' : 'BLOCK'}`
    );
    console.log(
      `  LEGACY:             ${this.isObservationOnlyPhase() ? 'WARNING (Observation Only)' : 'BLOCK'}`
    );
    console.log(
      `  NON_EXEC (UI):       Cannot be Tier C (keywords refer to presentation, not destruction)`
    );
    console.log(`  GOVERNANCE (Meta):    Exempt from self-blocking`);
    console.log(`  PHASE A+ (Destruction Semantics): WARNINGS ONLY (no blocking)`);

    if (report.violations.length > 0) {
      console.log('\n=== VIOLATIONS ===\n');

      // Separate Phase A+ destruction warnings from other violations
      const phaseAPlusWarnings = report.violations.filter(v =>
        v.description.includes('[PHASE A+ DESTRUCTION ANALYSIS]')
      );
      const errorViolations = report.violations.filter(
        v => v.severity === 'error' && !v.description.includes('[PHASE A+ DESTRUCTION ANALYSIS]')
      );
      const warningViolations = report.violations.filter(
        v => v.severity === 'warning' && !v.description.includes('[PHASE A+ DESTRUCTION ANALYSIS]')
      );

      // Phase A+ Destruction Analysis (always warnings, never blocking)
      if (phaseAPlusWarnings.length > 0) {
        console.log('=== PHASE A+ DESTRUCTION SEMANTICS ANALYSIS (WARNINGS ONLY) ===\n');
        console.log(
          'Destruction analysis helps developers understand why their code is dangerous.'
        );
        console.log('These are WARNINGS ONLY and will NOT block builds.\n');

        phaseAPlusWarnings.forEach(v => {
          const domainBadge =
            v.domain === 'EXEC' ? '[EXEC]' : v.domain === 'GOVERNANCE' ? '[META]' : '[UI]';
          const effectInfo = v.effectTrigger ? ` | Effect: ${v.effectTrigger}` : '';
          console.log(`  ${domainBadge} ${v.file}${effectInfo}`);

          if (v.destructionSemantics) {
            const { declared, inferred, scopeMatch } = v.destructionSemantics;

            if (declared) {
              console.log(
                `    Declared: scope="${declared.scope}", reversibility="${declared.reversibility}"`
              );
              console.log(`    Justification: ${declared.justification}`);
            } else {
              console.log(`    Declared: NONE (add @destruction block for documentation)`);
            }

            if (inferred) {
              console.log(
                `    Inferred: scope="${inferred.scope}" (confidence: ${inferred.confidence})`
              );
              console.log(`    Patterns: ${inferred.patterns.join(', ')}`);
              console.log(`    Scope Match: ${scopeMatch ? '✓ MATCH' : '✗ MISMATCH'}`);
            }
          }

          console.log(
            `    Warning: ${v.description.replace('[PHASE A+ DESTRUCTION ANALYSIS] ', '')}\n`
          );
        });
      }

      // Blocking violations
      if (errorViolations.length > 0) {
        console.log('BLOCKING VIOLATIONS (Decision Binding Enforcement):');
        errorViolations.forEach(v => {
          const scopeIcon =
            v.scope === 'critical'
              ? '⚠ CRITICAL'
              : v.scope === 'governed'
                ? '🔒 GOVERNED'
                : '📋 LEGACY';
          const domainBadge =
            v.domain === 'EXEC' ? '[EXEC]' : v.domain === 'GOVERNANCE' ? '[META]' : '[UI]';
          const effectInfo = v.effectTrigger ? ` | Effect: ${v.effectTrigger}` : '';
          console.log(`  ${scopeIcon} ${domainBadge} ${v.file}${effectInfo}`);
          console.log(`    → ${v.description}`);
          console.log(`    Type: ${v.violationType}\n`);
        });
      }

      // Other warnings
      if (warningViolations.length > 0) {
        console.log('OBSERVATIONS (Non-blocking in current phase):');
        warningViolations.forEach(v => {
          const scopeIcon =
            v.scope === 'critical'
              ? '⚠ CRITICAL'
              : v.scope === 'governed'
                ? '🔒 GOVERNED'
                : '📋 LEGACY';
          const domainBadge =
            v.domain === 'EXEC' ? '[EXEC]' : v.domain === 'GOVERNANCE' ? '[META]' : '[UI]';
          const effectInfo = v.effectTrigger ? ` | Effect: ${v.effectTrigger}` : '';
          console.log(`  ${scopeIcon} ${domainBadge} ${v.file}${effectInfo}`);
          console.log(`    → ${v.description}\n`);
        });
      }
    }

    console.log('=== Enforcement Complete ===\n');

    if (report.failedFiles > 0) {
      console.log('Decision binding check FAILED.');
      console.log('Fix blocking violations before proceeding.\n');
    } else {
      console.log('Decision binding check PASSED.\n');
    }
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  }
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Direct execution check
// In CommonJS, require.main === module indicates direct execution
// In ESM with older Node versions, we check if this file is the entry point
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  const gate = new DecisionBindingGate();

  if (args.length === 0) {
    console.log('No files specified, scanning src directory...\n');
    const files = getAllTypeScriptFiles('src');
    gate.enforce(files);
  } else {
    gate.enforce(args);
  }
}
