/**
 * HANDLER REALITY VALIDATOR V2
 * Production-grade validation for 10,000+ users
 *
 * V2 IMPROVEMENTS:
 * 1. Pre-compiled regex patterns (singleton, no GC pressure)
 * 2. Bracket-aware handler extraction (handles nesting)
 * 3. Fix suggestions for every failure
 * 4. Severity levels (critical/high/medium/low)
 * 5. Confidence scores (0-1, not binary)
 * 6. Performance metrics
 * 7. LRU cache for repeated validations
 * 8. Incremental validation via content hash
 */

import { createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface HandlerAnalysisV2 {
  name: string;
  location: string;
  body: string;
  lineNumber: number;
  isReal: boolean;
  confidence: number; // 0-1
  severity: Severity;
  reason: string;
  suggestedFix: string | null;
  matchedPatterns: string[];
}

export interface ValidationMetrics {
  extractionTimeMs: number;
  analysisTimeMs: number;
  totalTimeMs: number;
  handlersPerSecond: number;
  cacheHit: boolean;
  contentHash: string;
}

export interface HandlerValidationResultV2 {
  valid: boolean;
  totalHandlers: number;
  realHandlers: number;
  fakeHandlers: number;
  score: number;
  confidence: number; // Overall confidence
  analysis: HandlerAnalysisV2[];
  fakeHandlerDetails: HandlerAnalysisV2[];
  criticalIssues: HandlerAnalysisV2[];
  metrics: ValidationMetrics;
}

// ============================================================================
// PRE-COMPILED PATTERNS (Singleton - no GC pressure)
// ============================================================================

interface FakePattern {
  regex: RegExp;
  reason: string;
  severity: Severity;
  suggestedFix: string;
}

interface RealPattern {
  regex: RegExp;
  category: string;
  confidence: number; // How confident are we this is real?
}

// Compile once, reuse forever
const FAKE_PATTERNS: FakePattern[] = [
  // CRITICAL: Empty handlers
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*\{\s*\}\s*$/,
    reason: 'Empty handler body',
    severity: 'critical',
    suggestedFix: 'Add state mutation or API call: () => { setState(newValue); }',
  },

  // CRITICAL: Console.log only
  {
    regex:
      /^\s*\([\w\s,]*\)\s*=>\s*\{?\s*console\.(log|info|warn|debug|error)\([^)]*\)\s*;?\s*\}?\s*$/,
    reason: 'Only console.log - no real operation',
    severity: 'critical',
    suggestedFix:
      'Replace with toast notification: () => { toast("Action completed"); actualAction(); }',
  },

  // CRITICAL: Alert only
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*\{?\s*alert\([^)]*\)\s*;?\s*\}?\s*$/,
    reason: 'Only alert() - poor UX, no real operation',
    severity: 'critical',
    suggestedFix:
      'Replace with toast/modal: () => { showModal({ title: "Confirm", onConfirm: actualAction }); }',
  },

  // HIGH: TODO/FIXME placeholder
  {
    regex: /^\s*\([^)]*\)\s*=>\s*\{\s*\/[/*]\s*(TODO|FIXME|HACK|XXX)/i,
    reason: 'Contains TODO comment - not implemented',
    severity: 'high',
    suggestedFix: 'Implement the TODO or remove the handler until ready',
  },

  // HIGH: Returns null/undefined
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*\{?\s*(null|undefined|void\s+0)\s*;?\s*\}?\s*$/,
    reason: 'Returns null/undefined - no operation',
    severity: 'high',
    suggestedFix: 'Add actual operation: () => { performAction(); }',
  },

  // MEDIUM: Empty return
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*\{\s*return\s*;?\s*\}\s*$/,
    reason: 'Empty return statement',
    severity: 'medium',
    suggestedFix: 'Add operation before return: () => { doSomething(); return; }',
  },

  // MEDIUM: Pass/noop comment
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*\{\s*\/[/*]\s*(pass|noop|no-?op|placeholder)/i,
    reason: 'Explicit noop/pass comment',
    severity: 'medium',
    suggestedFix: 'Implement the handler or use a disabled button instead',
  },

  // LOW: String return only (might be intentional for rendering)
  {
    regex: /^\s*\([\w\s,]*\)\s*=>\s*['"`][^'"`]*['"`]\s*$/,
    reason: 'Returns only a string literal',
    severity: 'low',
    suggestedFix: 'If intentional, wrap in explicit handler: () => { return "value"; }',
  },
];

const REAL_PATTERNS: RealPattern[] = [
  // State management (HIGH confidence)
  { regex: /set[A-Z]\w*\(/, category: 'state-setter', confidence: 0.95 },
  { regex: /setState\(/, category: 'state-setter', confidence: 0.95 },
  { regex: /dispatch\(/, category: 'redux-dispatch', confidence: 0.95 },
  { regex: /useReducer/, category: 'reducer', confidence: 0.9 },

  // Custom handlers (HIGH confidence)
  { regex: /handle[A-Z]\w*\(/, category: 'custom-handler', confidence: 0.9 },
  { regex: /on[A-Z]\w*\(/, category: 'callback-invocation', confidence: 0.85 },

  // API/Mutations (VERY HIGH confidence)
  { regex: /mutation\.mutate/, category: 'tanstack-mutation', confidence: 0.98 },
  { regex: /mutate(Async)?\(/, category: 'mutation', confidence: 0.95 },
  { regex: /await\s+fetch\(/, category: 'fetch-call', confidence: 0.95 },
  { regex: /axios\.\w+\(/, category: 'axios-call', confidence: 0.95 },
  { regex: /api\.\w+\(/, category: 'api-call', confidence: 0.9 },
  {
    regex: /\.post\(|\.get\(|\.put\(|\.delete\(|\.patch\(/,
    category: 'http-method',
    confidence: 0.9,
  },

  // Navigation (HIGH confidence)
  { regex: /router\.(push|replace|back|forward)/, category: 'next-router', confidence: 0.95 },
  { regex: /navigate\(/, category: 'navigation', confidence: 0.9 },
  { regex: /redirect\(/, category: 'redirect', confidence: 0.9 },
  { regex: /window\.location/, category: 'location-change', confidence: 0.85 },

  // Form operations (HIGH confidence)
  { regex: /handleSubmit\(/, category: 'form-submit', confidence: 0.95 },
  { regex: /reset\(/, category: 'form-reset', confidence: 0.85 },
  { regex: /setValue\(/, category: 'form-setValue', confidence: 0.9 },
  { regex: /register\(/, category: 'form-register', confidence: 0.8 },

  // Modal/Dialog (HIGH confidence)
  {
    regex: /setOpen\(|setIsOpen\(|setShow\(|setVisible\(/,
    category: 'modal-control',
    confidence: 0.95,
  },
  { regex: /onOpenChange\(/, category: 'modal-callback', confidence: 0.9 },
  { regex: /closeModal\(|openModal\(/, category: 'modal-function', confidence: 0.9 },

  // Data operations (HIGH confidence)
  { regex: /refetch\(/, category: 'query-refetch', confidence: 0.95 },
  { regex: /invalidate(Queries)?\(/, category: 'query-invalidate', confidence: 0.95 },
  {
    regex: /\.remove\(|\.delete\(|\.update\(|\.create\(|\.add\(|\.insert\(/,
    category: 'crud-operation',
    confidence: 0.9,
  },

  // Event handling (MEDIUM confidence - might be part of larger handler)
  {
    regex: /e\.preventDefault\(\)|event\.preventDefault\(\)/,
    category: 'prevent-default',
    confidence: 0.7,
  },
  {
    regex: /e\.stopPropagation\(\)|event\.stopPropagation\(\)/,
    category: 'stop-propagation',
    confidence: 0.7,
  },

  // Notifications (HIGH confidence)
  { regex: /toast(\.\w+)?\(/, category: 'toast-notification', confidence: 0.95 },
  { regex: /notify\(/, category: 'notification', confidence: 0.9 },
  { regex: /showNotification\(|showToast\(/, category: 'notification-function', confidence: 0.9 },

  // Async indicators (HIGH confidence)
  { regex: /await\s+/, category: 'async-await', confidence: 0.9 },
  { regex: /\.then\(/, category: 'promise-then', confidence: 0.85 },
  { regex: /try\s*\{/, category: 'try-catch', confidence: 0.85 },

  // Callbacks (MEDIUM-HIGH confidence)
  { regex: /callback\(/, category: 'callback-call', confidence: 0.85 },
  { regex: /props\.\w+\(/, category: 'props-callback', confidence: 0.85 },
  { regex: /onComplete\(|onSuccess\(|onError\(/, category: 'lifecycle-callback', confidence: 0.9 },

  // File operations (HIGH confidence)
  { regex: /FileReader|readAsDataURL|readAsText/, category: 'file-read', confidence: 0.9 },
  { regex: /URL\.createObjectURL/, category: 'blob-url', confidence: 0.9 },

  // Clipboard (HIGH confidence)
  { regex: /navigator\.clipboard/, category: 'clipboard', confidence: 0.95 },
  { regex: /execCommand\(['"]copy/, category: 'legacy-copy', confidence: 0.85 },

  // Local storage (MEDIUM confidence)
  { regex: /localStorage\.\w+\(|sessionStorage\.\w+\(/, category: 'storage', confidence: 0.8 },
];

// ============================================================================
// LRU CACHE (For repeated validations)
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>;
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 100, maxAgeMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const validationCache = new LRUCache<HandlerValidationResultV2>(100, 60000);

// ============================================================================
// BRACKET-AWARE HANDLER EXTRACTION
// ============================================================================

function findMatchingBrace(code: string, startIndex: number): number {
  let depth = 1;
  let i = startIndex;
  const len = code.length;

  while (i < len && depth > 0) {
    const char = code[i];

    // Skip strings
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') i++; // Skip escaped chars
        i++;
      }
    }
    // Track braces
    else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
    }

    i++;
  }

  return depth === 0 ? i - 1 : -1;
}

function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length;
}

interface ExtractedHandler {
  location: string;
  body: string;
  fullMatch: string;
  lineNumber: number;
}

function extractHandlersV2(code: string): ExtractedHandler[] {
  const handlers: ExtractedHandler[] = [];
  const seen = new Set<string>(); // Dedup

  // Pattern 1: Inline JSX handlers - onClick={() => ...}
  const inlineRegex = /(on[A-Z]\w*)\s*=\s*\{/g;
  let match;

  while ((match = inlineRegex.exec(code)) !== null) {
    const location = match[1];
    const braceStart = match.index + match[0].length - 1;
    const braceEnd = findMatchingBrace(code, braceStart + 1);

    if (braceEnd === -1) continue;

    const body = code.substring(braceStart + 1, braceEnd).trim();

    // Only arrow functions
    if (!body.includes('=>')) continue;

    const key = `${location}:${body.substring(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    handlers.push({
      location,
      body,
      fullMatch: code.substring(match.index, braceEnd + 1),
      lineNumber: getLineNumber(code, match.index),
    });
  }

  // Pattern 2: Standalone handlers - const handleClick = () => { ... }
  const standaloneRegex = /const\s+(handle[A-Z]\w*|on[A-Z]\w*)\s*=\s*(async\s+)?\(/g;

  while ((match = standaloneRegex.exec(code)) !== null) {
    const location = match[1];
    const startIndex = match.index;

    // Find the arrow and then the body
    let searchStart = match.index + match[0].length;
    const arrowIndex = code.indexOf('=>', searchStart);

    if (arrowIndex === -1 || arrowIndex > searchStart + 100) continue;

    // Check what follows the arrow
    let bodyStart = arrowIndex + 2;
    while (bodyStart < code.length && /\s/.test(code[bodyStart])) {
      bodyStart++;
    }

    let body: string;
    if (code[bodyStart] === '{') {
      const braceEnd = findMatchingBrace(code, bodyStart + 1);
      if (braceEnd === -1) continue;
      body = code.substring(arrowIndex, braceEnd + 1);
    } else {
      // Expression body - find end of statement
      let endIndex = bodyStart;
      let parenDepth = 0;
      while (endIndex < code.length) {
        const char = code[endIndex];
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        else if ((char === ';' || char === '\n') && parenDepth === 0) break;
        endIndex++;
      }
      body = code.substring(arrowIndex, endIndex);
    }

    const key = `${location}:${body.substring(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    handlers.push({
      location,
      body: body.trim(),
      fullMatch: code.substring(startIndex, startIndex + body.length + (arrowIndex - startIndex)),
      lineNumber: getLineNumber(code, startIndex),
    });
  }

  return handlers;
}

// ============================================================================
// HANDLER ANALYSIS
// ============================================================================

function analyzeHandlerV2(handler: ExtractedHandler): HandlerAnalysisV2 {
  const { location, body, lineNumber } = handler;
  const matchedPatterns: string[] = [];

  // Check fake patterns first (short-circuit on critical)
  for (const { regex, reason, severity, suggestedFix } of FAKE_PATTERNS) {
    if (regex.test(body)) {
      return {
        name: location,
        location,
        body: body.length > 150 ? body.substring(0, 150) + '...' : body,
        lineNumber,
        isReal: false,
        confidence: severity === 'critical' ? 0.95 : severity === 'high' ? 0.85 : 0.75,
        severity,
        reason,
        suggestedFix,
        matchedPatterns: [regex.source],
      };
    }
  }

  // Check real patterns and accumulate confidence
  let maxConfidence = 0;
  let bestCategory = '';

  for (const { regex, category, confidence } of REAL_PATTERNS) {
    if (regex.test(body)) {
      matchedPatterns.push(category);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestCategory = category;
      }
    }
  }

  if (matchedPatterns.length > 0) {
    // Multiple matches increase confidence
    const adjustedConfidence = Math.min(0.99, maxConfidence + matchedPatterns.length * 0.02);

    return {
      name: location,
      location,
      body: body.length > 150 ? body.substring(0, 150) + '...' : body,
      lineNumber,
      isReal: true,
      confidence: adjustedConfidence,
      severity: 'low', // Not an issue
      reason: `Real operation detected: ${bestCategory}`,
      suggestedFix: null,
      matchedPatterns,
    };
  }

  // Check body complexity as fallback
  const trimmedBody = body.replace(/\s/g, '');
  const semicolonCount = (body.match(/;/g) || []).length;
  const lineCount = body.split('\n').length;

  if (trimmedBody.length > 50 || semicolonCount >= 2 || lineCount >= 3) {
    return {
      name: location,
      location,
      body: body.length > 150 ? body.substring(0, 150) + '...' : body,
      lineNumber,
      isReal: true,
      confidence: 0.6, // Lower confidence - no recognized pattern
      severity: 'low',
      reason: 'Substantial body content (unrecognized pattern)',
      suggestedFix: null,
      matchedPatterns: ['body-complexity'],
    };
  }

  // Default to fake if short and unrecognized
  return {
    name: location,
    location,
    body: body.length > 150 ? body.substring(0, 150) + '...' : body,
    lineNumber,
    isReal: false,
    confidence: 0.7,
    severity: 'medium',
    reason: 'Handler body too short/simple - no recognized operations',
    suggestedFix: 'Add a state mutation, API call, or callback invocation',
    matchedPatterns: [],
  };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateHandlersV2(
  code: string,
  options?: {
    useCache?: boolean;
    skipMetrics?: boolean;
  }
): HandlerValidationResultV2 {
  const startTime = performance.now();
  const useCache = options?.useCache !== false;

  // Generate content hash for caching
  const contentHash = createHash('md5').update(code).digest('hex').substring(0, 12);

  // Check cache
  if (useCache) {
    const cached = validationCache.get(contentHash);
    if (cached) {
      return {
        ...cached,
        metrics: {
          ...cached.metrics,
          cacheHit: true,
        },
      };
    }
  }

  // Extract handlers
  const extractStart = performance.now();
  const handlers = extractHandlersV2(code);
  const extractionTimeMs = performance.now() - extractStart;

  // Analyze handlers
  const analysisStart = performance.now();
  const analysis: HandlerAnalysisV2[] = handlers.map(analyzeHandlerV2);
  const analysisTimeMs = performance.now() - analysisStart;

  // Categorize results
  const realHandlers = analysis.filter(a => a.isReal);
  const fakeHandlers = analysis.filter(a => !a.isReal);
  const criticalIssues = fakeHandlers.filter(a => a.severity === 'critical');

  // Calculate scores
  const totalHandlers = analysis.length;
  const score = totalHandlers > 0 ? Math.round((realHandlers.length / totalHandlers) * 100) : 100;

  // Calculate overall confidence
  const avgConfidence =
    analysis.length > 0 ? analysis.reduce((sum, a) => sum + a.confidence, 0) / analysis.length : 1;

  const totalTimeMs = performance.now() - startTime;

  const result: HandlerValidationResultV2 = {
    // ZERO TOLERANCE: Any fake handler = invalid
    valid: fakeHandlers.length === 0,
    totalHandlers,
    realHandlers: realHandlers.length,
    fakeHandlers: fakeHandlers.length,
    score,
    confidence: avgConfidence,
    analysis,
    fakeHandlerDetails: fakeHandlers,
    criticalIssues,
    metrics: {
      extractionTimeMs: Math.round(extractionTimeMs * 100) / 100,
      analysisTimeMs: Math.round(analysisTimeMs * 100) / 100,
      totalTimeMs: Math.round(totalTimeMs * 100) / 100,
      handlersPerSecond: totalHandlers > 0 ? Math.round((totalHandlers / totalTimeMs) * 1000) : 0,
      cacheHit: false,
      contentHash,
    },
  };

  // Cache result
  if (useCache) {
    validationCache.set(contentHash, result);
  }

  return result;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

export function generateHandlerReportV2(result: HandlerValidationResultV2): string {
  const lines: string[] = [
    '## Handler Reality Report V2',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Handlers | ${result.totalHandlers} |`,
    `| Real Handlers | ${result.realHandlers} |`,
    `| Fake Handlers | ${result.fakeHandlers} |`,
    `| Critical Issues | ${result.criticalIssues.length} |`,
    `| Score | ${result.score}% |`,
    `| Confidence | ${Math.round(result.confidence * 100)}% |`,
    `| Status | ${result.valid ? '✅ PASS' : '❌ FAIL'} |`,
    '',
  ];

  // Performance metrics
  lines.push('### Performance');
  lines.push(`- Extraction: ${result.metrics.extractionTimeMs}ms`);
  lines.push(`- Analysis: ${result.metrics.analysisTimeMs}ms`);
  lines.push(`- Total: ${result.metrics.totalTimeMs}ms`);
  lines.push(`- Speed: ${result.metrics.handlersPerSecond} handlers/sec`);
  lines.push(`- Cache: ${result.metrics.cacheHit ? 'HIT' : 'MISS'}`);
  lines.push('');

  // Critical issues first
  if (result.criticalIssues.length > 0) {
    lines.push('### 🚨 Critical Issues (Must Fix)');
    lines.push('');
    for (const issue of result.criticalIssues) {
      lines.push(`#### Line ${issue.lineNumber}: \`${issue.location}\``);
      lines.push(`- **Problem:** ${issue.reason}`);
      lines.push(`- **Code:** \`${issue.body.substring(0, 60)}...\``);
      lines.push(`- **Fix:** ${issue.suggestedFix}`);
      lines.push('');
    }
  }

  // Other fake handlers
  const nonCritical = result.fakeHandlerDetails.filter(h => h.severity !== 'critical');
  if (nonCritical.length > 0) {
    lines.push('### ⚠️ Other Issues');
    lines.push('');
    for (const issue of nonCritical) {
      lines.push(
        `- **Line ${issue.lineNumber} - ${issue.location}** [${issue.severity.toUpperCase()}]`
      );
      lines.push(`  ${issue.reason}`);
      if (issue.suggestedFix) {
        lines.push(`  → ${issue.suggestedFix}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export function clearValidationCache(): void {
  validationCache.clear();
}

// Re-export V1 interface for backwards compatibility
export { validateHandlers } from './handler-validator';
