/**
 * UNIFIED VALIDATOR V2
 * Production-grade orchestrator for all validation layers
 *
 * WHAT STRIPE ENGINEERS EXPECT:
 * 1. Parallel validation (don't block on slow checks)
 * 2. Unified scoring with confidence intervals
 * 3. Actionable fix suggestions with priority
 * 4. Performance telemetry
 * 5. Incremental validation (hash-based skip)
 * 6. Graceful degradation (partial results on timeout)
 */

import { createHash } from 'crypto';
import { validateHandlersV2, HandlerValidationResultV2 } from './handler-validator-v2';
import { validateComplexityV2, ComplexityValidationResultV2 } from './complexity-validator-v2';
import {
  validateFeatures,
  extractRequiredFeatures,
  FeatureValidationResult,
  FeatureRequirement,
} from './feature-validator';
import { validateDesignTokens, DesignValidationResult } from './design-validator';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationConfig {
  /** Skip validation if content hash matches */
  enableCache?: boolean;
  /** Timeout for entire validation (ms) */
  timeout?: number;
  /** Skip specific validators */
  skip?: ('handlers' | 'complexity' | 'features' | 'design')[];
  /** File path for type inference */
  filePath?: string;
  /** User prompt for feature extraction */
  userPrompt?: string;
  /** Override page type */
  pageType?: string;
}

export interface UnifiedValidationResult {
  // Overall result
  valid: boolean;
  score: number; // 0-100 weighted
  confidence: number; // 0-1 how confident are we in this result
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  // Component results
  handlers: HandlerValidationResultV2 | null;
  complexity: ComplexityValidationResultV2 | null;
  features: FeatureValidationResult | null;
  design: DesignValidationResult | null;

  // Aggregated issues
  criticalIssues: UnifiedIssue[];
  highIssues: UnifiedIssue[];
  mediumIssues: UnifiedIssue[];
  lowIssues: UnifiedIssue[];

  // Action plan
  fixPlan: FixPlan;

  // Telemetry
  telemetry: ValidationTelemetry;
}

export interface UnifiedIssue {
  validator: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestedFix: string;
  lineNumber?: number;
  metric?: string;
  actual?: number;
  required?: number;
}

export interface FixPlan {
  estimatedEffort: 'trivial' | 'small' | 'medium' | 'large';
  steps: FixStep[];
  blockingIssues: string[];
}

export interface FixStep {
  priority: number;
  action: string;
  reason: string;
  validator: string;
}

export interface ValidationTelemetry {
  totalTimeMs: number;
  handlersTimeMs: number;
  complexityTimeMs: number;
  featuresTimeMs: number;
  designTimeMs: number;
  contentHash: string;
  cacheHit: boolean;
  validatorsRun: string[];
  validatorsSkipped: string[];
  timedOut: boolean;
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  result: UnifiedValidationResult;
  timestamp: number;
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_MAX_AGE = 60000; // 1 minute
const CACHE_MAX_SIZE = 50;

function getCached(hash: string): UnifiedValidationResult | null {
  const entry = validationCache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_MAX_AGE) {
    validationCache.delete(hash);
    return null;
  }
  return entry.result;
}

function setCache(hash: string, result: UnifiedValidationResult): void {
  // Evict old entries if at capacity
  if (validationCache.size >= CACHE_MAX_SIZE) {
    const firstKey = validationCache.keys().next().value;
    if (firstKey) validationCache.delete(firstKey);
  }
  validationCache.set(hash, { result, timestamp: Date.now() });
}

// ============================================================================
// PARALLEL VALIDATION
// ============================================================================

async function runWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<{ result: T; timedOut: boolean }> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>(resolve => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return { result, timedOut: result === fallback };
  } catch {
    clearTimeout(timeoutId!);
    return { result: fallback, timedOut: false };
  }
}

// ============================================================================
// ISSUE AGGREGATION
// ============================================================================

function aggregateIssues(
  handlers: HandlerValidationResultV2 | null,
  complexity: ComplexityValidationResultV2 | null,
  features: FeatureValidationResult | null,
  design: DesignValidationResult | null
): UnifiedIssue[] {
  const issues: UnifiedIssue[] = [];

  // Handler issues
  if (handlers) {
    for (const fake of handlers.fakeHandlerDetails) {
      issues.push({
        validator: 'handlers',
        severity: fake.severity,
        message: `${fake.location}: ${fake.reason}`,
        suggestedFix: fake.suggestedFix || 'Add real state mutation or API call',
        lineNumber: fake.lineNumber,
      });
    }
  }

  // Complexity issues
  if (complexity) {
    for (const violation of complexity.violations) {
      issues.push({
        validator: 'complexity',
        severity: violation.severity,
        message: violation.message,
        suggestedFix: violation.suggestedFix,
        metric: violation.metric,
        actual: violation.actual,
        required: violation.required,
      });
    }
  }

  // Feature issues
  if (features) {
    for (const missing of features.missingFeatures) {
      issues.push({
        validator: 'features',
        severity: 'high',
        message: `Missing feature: ${missing}`,
        suggestedFix: `Implement the ${missing} feature as requested`,
      });
    }
    for (const partial of features.partialFeatures) {
      issues.push({
        validator: 'features',
        severity: 'medium',
        message: `Partial feature: ${partial.name} (${partial.found}/${partial.required})`,
        suggestedFix: `Complete the ${partial.name} implementation`,
      });
    }
  }

  // Design issues
  if (design && !design.valid) {
    if (design.summary.hardcodedColors > 0) {
      issues.push({
        validator: 'design',
        severity: 'medium',
        message: `${design.summary.hardcodedColors} hardcoded colors found`,
        suggestedFix: 'Replace with design tokens: bg-background, text-foreground, etc.',
      });
    }
    if (design.summary.hardcodedSpacing > 0) {
      issues.push({
        validator: 'design',
        severity: 'low',
        message: `${design.summary.hardcodedSpacing} hardcoded spacing values found`,
        suggestedFix: 'Use Tailwind spacing classes: p-4, m-2, gap-3, etc.',
      });
    }
  }

  return issues;
}

// ============================================================================
// FIX PLAN GENERATION
// ============================================================================

function generateFixPlan(issues: UnifiedIssue[]): FixPlan {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;

  // Estimate effort
  let effort: FixPlan['estimatedEffort'];
  const totalWeight = criticalCount * 4 + highCount * 2 + mediumCount * 1;
  if (totalWeight === 0) effort = 'trivial';
  else if (totalWeight <= 3) effort = 'small';
  else if (totalWeight <= 8) effort = 'medium';
  else effort = 'large';

  // Generate prioritized steps
  const steps: FixStep[] = [];
  let priority = 1;

  // Critical first
  for (const issue of issues.filter(i => i.severity === 'critical')) {
    steps.push({
      priority: priority++,
      action: issue.suggestedFix,
      reason: issue.message,
      validator: issue.validator,
    });
  }

  // Then high
  for (const issue of issues.filter(i => i.severity === 'high')) {
    steps.push({
      priority: priority++,
      action: issue.suggestedFix,
      reason: issue.message,
      validator: issue.validator,
    });
  }

  // Then medium (limit to top 5)
  for (const issue of issues.filter(i => i.severity === 'medium').slice(0, 5)) {
    steps.push({
      priority: priority++,
      action: issue.suggestedFix,
      reason: issue.message,
      validator: issue.validator,
    });
  }

  // Identify blockers
  const blockingIssues = issues.filter(i => i.severity === 'critical').map(i => i.message);

  return { estimatedEffort: effort, steps, blockingIssues };
}

// ============================================================================
// SCORING
// ============================================================================

function calculateUnifiedScore(
  handlers: HandlerValidationResultV2 | null,
  complexity: ComplexityValidationResultV2 | null,
  features: FeatureValidationResult | null,
  design: DesignValidationResult | null
): { score: number; confidence: number } {
  const weights = {
    handlers: 30,
    complexity: 30,
    features: 25,
    design: 15,
  };

  let totalWeight = 0;
  let weightedScore = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  if (handlers) {
    totalWeight += weights.handlers;
    weightedScore += handlers.score * weights.handlers;
    confidenceSum += handlers.confidence;
    confidenceCount++;
  }

  if (complexity) {
    totalWeight += weights.complexity;
    weightedScore += complexity.score * weights.complexity;
    confidenceSum += 0.9; // Complexity is deterministic
    confidenceCount++;
  }

  if (features) {
    totalWeight += weights.features;
    weightedScore += features.score * weights.features;
    confidenceSum += 0.85; // Features are heuristic
    confidenceCount++;
  }

  if (design) {
    totalWeight += weights.design;
    weightedScore += design.score * weights.design;
    confidenceSum += 0.95; // Design tokens are deterministic
    confidenceCount++;
  }

  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  const confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

  return { score, confidence };
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export async function validateCodeV2(
  code: string,
  config: ValidationConfig = {}
): Promise<UnifiedValidationResult> {
  const startTime = performance.now();
  const contentHash = createHash('md5').update(code).digest('hex').substring(0, 12);

  // Check cache
  if (config.enableCache !== false) {
    const cached = getCached(contentHash);
    if (cached) {
      return {
        ...cached,
        telemetry: {
          ...cached.telemetry,
          cacheHit: true,
          totalTimeMs: Math.round(performance.now() - startTime),
        },
      };
    }
  }

  const skip = new Set(config.skip || []);
  const timeout = config.timeout || 5000;
  const filePath = config.filePath || 'unknown.tsx';

  const telemetry: ValidationTelemetry = {
    totalTimeMs: 0,
    handlersTimeMs: 0,
    complexityTimeMs: 0,
    featuresTimeMs: 0,
    designTimeMs: 0,
    contentHash,
    cacheHit: false,
    validatorsRun: [],
    validatorsSkipped: [],
    timedOut: false,
  };

  // Run validators in parallel
  const validationPromises: Promise<void>[] = [];

  let handlers: HandlerValidationResultV2 | null = null;
  let complexity: ComplexityValidationResultV2 | null = null;
  let features: FeatureValidationResult | null = null;
  let design: DesignValidationResult | null = null;

  // Handler validation
  if (!skip.has('handlers')) {
    telemetry.validatorsRun.push('handlers');
    validationPromises.push(
      (async () => {
        const start = performance.now();
        handlers = validateHandlersV2(code);
        telemetry.handlersTimeMs = Math.round(performance.now() - start);
      })()
    );
  } else {
    telemetry.validatorsSkipped.push('handlers');
  }

  // Complexity validation
  if (!skip.has('complexity')) {
    telemetry.validatorsRun.push('complexity');
    validationPromises.push(
      (async () => {
        const start = performance.now();
        complexity = validateComplexityV2(code, filePath, config.pageType);
        telemetry.complexityTimeMs = Math.round(performance.now() - start);
      })()
    );
  } else {
    telemetry.validatorsSkipped.push('complexity');
  }

  // Feature validation
  if (!skip.has('features') && config.userPrompt) {
    telemetry.validatorsRun.push('features');
    validationPromises.push(
      (async () => {
        const start = performance.now();
        const requirements = extractRequiredFeatures(config.userPrompt!);
        if (requirements.length > 0) {
          features = validateFeatures(code, requirements);
        }
        telemetry.featuresTimeMs = Math.round(performance.now() - start);
      })()
    );
  } else {
    telemetry.validatorsSkipped.push('features');
  }

  // Design validation
  if (!skip.has('design')) {
    telemetry.validatorsRun.push('design');
    validationPromises.push(
      (async () => {
        const start = performance.now();
        design = validateDesignTokens(code);
        telemetry.designTimeMs = Math.round(performance.now() - start);
      })()
    );
  } else {
    telemetry.validatorsSkipped.push('design');
  }

  // Wait for all with timeout
  const { timedOut } = await runWithTimeout(Promise.all(validationPromises), timeout, []);
  telemetry.timedOut = timedOut;

  // Aggregate issues
  const allIssues = aggregateIssues(handlers, complexity, features, design);
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const highIssues = allIssues.filter(i => i.severity === 'high');
  const mediumIssues = allIssues.filter(i => i.severity === 'medium');
  const lowIssues = allIssues.filter(i => i.severity === 'low');

  // Calculate unified score
  const { score, confidence } = calculateUnifiedScore(handlers, complexity, features, design);

  // Generate fix plan
  const fixPlan = generateFixPlan(allIssues);

  // Determine validity
  // Valid if: no critical issues AND score >= 70
  const valid = criticalIssues.length === 0 && score >= 70;

  telemetry.totalTimeMs = Math.round(performance.now() - startTime);

  const result: UnifiedValidationResult = {
    valid,
    score,
    confidence,
    grade: scoreToGrade(score),
    handlers,
    complexity,
    features,
    design,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    fixPlan,
    telemetry,
  };

  // Cache result
  if (config.enableCache !== false) {
    setCache(contentHash, result);
  }

  return result;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

export function generateUnifiedReport(result: UnifiedValidationResult): string {
  const lines: string[] = [
    '# Code Validation Report V2',
    '',
    `## Summary`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Grade | **${result.grade}** |`,
    `| Score | ${result.score}/100 |`,
    `| Confidence | ${Math.round(result.confidence * 100)}% |`,
    `| Status | ${result.valid ? '✅ PASS' : '❌ FAIL'} |`,
    `| Issues | ${result.criticalIssues.length} critical, ${result.highIssues.length} high, ${result.mediumIssues.length} medium |`,
    '',
    '## Component Scores',
    '',
    `| Validator | Score | Status |`,
    `|-----------|-------|--------|`,
    `| Handlers | ${result.handlers?.score ?? 'N/A'}% | ${result.handlers?.valid ? '✅' : '❌'} |`,
    `| Complexity | ${result.complexity?.score ?? 'N/A'}% | ${result.complexity?.valid ? '✅' : '❌'} |`,
    `| Features | ${result.features?.score ?? 'N/A'}% | ${result.features?.valid ? '✅' : '❌'} |`,
    `| Design | ${result.design?.score ?? 'N/A'}% | ${result.design?.valid ? '✅' : '❌'} |`,
    '',
  ];

  // Critical issues
  if (result.criticalIssues.length > 0) {
    lines.push('## 🚨 Critical Issues (Must Fix)');
    lines.push('');
    for (const issue of result.criticalIssues) {
      lines.push(`### ${issue.validator}: ${issue.message}`);
      if (issue.lineNumber) lines.push(`- Line: ${issue.lineNumber}`);
      lines.push(`- Fix: ${issue.suggestedFix}`);
      lines.push('');
    }
  }

  // Fix plan
  if (result.fixPlan.steps.length > 0) {
    lines.push('## Fix Plan');
    lines.push('');
    lines.push(`**Estimated Effort:** ${result.fixPlan.estimatedEffort}`);
    lines.push('');
    lines.push('### Steps (in priority order)');
    lines.push('');
    for (const step of result.fixPlan.steps.slice(0, 10)) {
      lines.push(`${step.priority}. **[${step.validator}]** ${step.action}`);
      lines.push(`   _${step.reason}_`);
    }
    lines.push('');
  }

  // Performance
  lines.push('## Performance');
  lines.push('');
  lines.push(`| Validator | Time |`);
  lines.push(`|-----------|------|`);
  lines.push(`| Handlers | ${result.telemetry.handlersTimeMs}ms |`);
  lines.push(`| Complexity | ${result.telemetry.complexityTimeMs}ms |`);
  lines.push(`| Features | ${result.telemetry.featuresTimeMs}ms |`);
  lines.push(`| Design | ${result.telemetry.designTimeMs}ms |`);
  lines.push(`| **Total** | **${result.telemetry.totalTimeMs}ms** |`);
  lines.push(`| Cache | ${result.telemetry.cacheHit ? 'HIT' : 'MISS'} |`);

  return lines.join('\n');
}

// ============================================================================
// QUICK VALIDATION (Sync, for tight loops)
// ============================================================================

export function quickValidate(code: string): { valid: boolean; score: number; issues: number } {
  const handlers = validateHandlersV2(code, { useCache: true });
  const complexity = validateComplexityV2(code, 'unknown.tsx');

  const handlersScore = handlers.score;
  const complexityScore = complexity.score;
  const score = Math.round(handlersScore * 0.5 + complexityScore * 0.5);

  return {
    valid: handlers.valid && complexity.valid,
    score,
    issues: handlers.fakeHandlers + complexity.violations.length,
  };
}
