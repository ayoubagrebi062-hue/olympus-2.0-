/**
 * OLYMPUS 10X - Security Guardrail Layer
 *
 * Second line of defense: Injection detection, PII scanning, XSS protection.
 * Runs security checks in parallel for performance.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { GUARDRAIL_LAYERS, GUARDRAIL_PATTERNS, THRESHOLDS } from '@/lib/core';
import type { GuardrailInput } from '@/lib/core';
import type {
  GuardrailLayerHandler,
  GuardrailContext,
  SecurityLayerConfig,
  LayerValidationResult,
  SecurityDetection,
  SecurityPattern,
} from '../types';

// ============================================================================
// BUILT-IN SECURITY PATTERNS
// ============================================================================

const SQL_INJECTION_PATTERNS: SecurityPattern[] = [
  {
    name: 'sql-union-select',
    pattern: /\b(UNION)\s+(ALL\s+)?SELECT\b/i,
    severity: 'critical',
    action: 'block',
    description: 'SQL UNION SELECT injection attempt',
  },
  {
    name: 'sql-drop-table',
    pattern: /\b(DROP|DELETE|TRUNCATE)\s+(TABLE|DATABASE)\b/i,
    severity: 'critical',
    action: 'terminate',
    description: 'SQL destructive operation attempt',
  },
  {
    name: 'sql-comment-bypass',
    pattern: /('|")\s*(--|#|\/\*)/,
    severity: 'high',
    action: 'block',
    description: 'SQL comment injection attempt',
  },
  {
    name: 'sql-or-bypass',
    pattern: /'\s*(OR|AND)\s*('|1\s*=\s*1|true)/i,
    severity: 'high',
    action: 'block',
    description: 'SQL boolean injection attempt',
  },
  {
    name: 'sql-stacked-queries',
    pattern: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i,
    severity: 'high',
    action: 'block',
    description: 'SQL stacked query injection attempt',
  },
];

const XSS_PATTERNS: SecurityPattern[] = [
  {
    name: 'xss-script-tag',
    pattern: /<script[^>]*>[\s\S]*?<\/script>/i,
    severity: 'critical',
    action: 'block',
    description: 'XSS script tag detected',
  },
  {
    name: 'xss-event-handler',
    pattern: /\bon\w+\s*=\s*(['"])?[^'"]*\1/i,
    severity: 'high',
    action: 'block',
    description: 'XSS event handler detected',
  },
  {
    name: 'xss-javascript-uri',
    pattern: /javascript\s*:/i,
    severity: 'high',
    action: 'block',
    description: 'XSS javascript: URI detected',
  },
  {
    name: 'xss-data-uri',
    pattern: /data\s*:\s*text\/html/i,
    severity: 'high',
    action: 'block',
    description: 'XSS data: URI with HTML detected',
  },
  {
    name: 'xss-svg-onload',
    pattern: /<svg[^>]*\s+onload\s*=/i,
    severity: 'high',
    action: 'block',
    description: 'XSS SVG onload detected',
  },
];

const COMMAND_INJECTION_PATTERNS: SecurityPattern[] = [
  {
    name: 'cmd-semicolon',
    pattern: /;\s*(ls|cat|rm|mv|cp|wget|curl|nc|bash|sh|python|perl|ruby)\b/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Command injection via semicolon',
  },
  {
    name: 'cmd-pipe',
    pattern: /\|\s*(cat|grep|awk|sed|bash|sh|python|perl|nc)\b/i,
    severity: 'high',
    action: 'block',
    description: 'Command injection via pipe',
  },
  {
    name: 'cmd-backtick',
    pattern: /`[^`]*`/,
    severity: 'high',
    action: 'block',
    description: 'Command injection via backticks',
  },
  {
    name: 'cmd-dollar-paren',
    pattern: /\$\([^)]+\)/,
    severity: 'high',
    action: 'block',
    description: 'Command injection via $(...)',
  },
  {
    name: 'cmd-redirect',
    pattern: /[>&]\s*\/?(etc|tmp|var|home)\//i,
    severity: 'medium',
    action: 'block',
    description: 'Command injection file redirect',
  },
];

const PATH_TRAVERSAL_PATTERNS: SecurityPattern[] = [
  {
    name: 'path-dot-dot-slash',
    pattern: /\.\.[\/\\]/,
    severity: 'high',
    action: 'block',
    description: 'Path traversal via ../ or ..\\ detected',
  },
  {
    name: 'path-etc-passwd',
    pattern: /\/etc\/(passwd|shadow|hosts)/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Attempt to access sensitive system files',
  },
  {
    name: 'path-windows-system',
    pattern: /[cC]:\\(Windows|WINDOWS|System32|system32)/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Attempt to access Windows system files',
  },
  {
    name: 'path-encoded-traversal',
    pattern: /(%2e%2e|%252e%252e|\.%00\.)/i,
    severity: 'critical',
    action: 'terminate',
    description: 'URL-encoded path traversal attempt',
  },
  {
    name: 'path-null-byte',
    pattern: /%00/,
    severity: 'high',
    action: 'block',
    description: 'Null byte injection in path',
  },
];

const PROMPT_INJECTION_PATTERNS: SecurityPattern[] = [
  {
    name: 'prompt-ignore-instructions',
    pattern: new RegExp(GUARDRAIL_PATTERNS.PROMPT_INJECTION_IGNORE),
    severity: 'critical',
    action: 'terminate',
    description: 'Prompt injection: ignore instructions',
  },
  {
    name: 'prompt-you-are-now',
    pattern: new RegExp(GUARDRAIL_PATTERNS.PROMPT_INJECTION_ROLEPLAY),
    severity: 'critical',
    action: 'terminate',
    description: 'Prompt injection: role change',
  },
  {
    name: 'prompt-system-override',
    pattern: /system\s*(prompt|message|instruction)\s*[:=]/i,
    severity: 'high',
    action: 'block',
    description: 'Prompt injection: system override attempt',
  },
  {
    name: 'prompt-jailbreak-keywords',
    pattern: /\b(jailbreak|DAN|developer\s*mode|unrestricted\s*mode)\b/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Prompt injection: jailbreak keywords',
  },
  {
    name: 'prompt-base64-hidden',
    pattern: /base64[:\s]+[A-Za-z0-9+/=]{50,}/,
    severity: 'medium',
    action: 'warn',
    description: 'Suspicious base64 content',
  },
  // === NEW: Additional bypass patterns found during chaos engineering ===
  {
    name: 'prompt-disregard',
    pattern:
      /\b(disregard|forget|override|bypass|skip)\s+(all\s+)?(earlier|previous|prior|above|preceding)\s+(instructions|guidelines|rules|directives|constraints)\b/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Prompt injection: disregard instructions variant',
  },
  {
    name: 'prompt-new-persona',
    pattern:
      /\b(pretend|act|behave|respond)\s+(like\s+|as\s+if\s+)?(you\s+)?(are|were|being)\s+(a|an|the)\b/i,
    severity: 'high',
    action: 'block',
    description: 'Prompt injection: persona change attempt',
  },
  {
    name: 'prompt-reveal-system',
    pattern:
      /\b(show|reveal|display|output|print|tell)\s+(me\s+)?(your|the)\s+(system|original|initial)\s*(prompt|instructions|guidelines|rules)\b/i,
    severity: 'critical',
    action: 'terminate',
    description: 'Prompt injection: system prompt extraction',
  },
  {
    name: 'prompt-sudo-mode',
    pattern: /\b(sudo|admin|root|superuser|god)\s*(mode|access|privileges?)\b/i,
    severity: 'high',
    action: 'block',
    description: 'Prompt injection: privilege escalation attempt',
  },
];

const PII_PATTERNS: SecurityPattern[] = [
  {
    name: 'pii-ssn',
    pattern: new RegExp(GUARDRAIL_PATTERNS.SSN_PATTERN),
    severity: 'high',
    action: 'block',
    description: 'Social Security Number detected',
  },
  {
    name: 'pii-credit-card',
    pattern: new RegExp(GUARDRAIL_PATTERNS.CREDIT_CARD_PATTERN),
    severity: 'critical',
    action: 'block',
    description: 'Credit card number detected',
  },
  {
    name: 'pii-email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    severity: 'low',
    action: 'warn',
    description: 'Email address detected',
  },
  {
    name: 'pii-phone',
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    severity: 'low',
    action: 'warn',
    description: 'Phone number detected',
  },
  {
    name: 'pii-api-key',
    pattern:
      /\b(sk_live_|pk_live_|api[_-]?key|secret[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i,
    severity: 'critical',
    action: 'block',
    description: 'API key or secret detected',
  },
];

// ============================================================================
// SECURITY LAYER IMPLEMENTATION
// ============================================================================

export class SecurityLayer implements GuardrailLayerHandler {
  readonly layer = GUARDRAIL_LAYERS.SECURITY;
  readonly name = 'Security Layer';

  private patterns: Map<string, SecurityPattern[]>;
  private bypassRoles: Set<string>;

  constructor(customPatterns: SecurityPattern[] = [], bypassRoles: string[] = ['admin', 'system']) {
    this.patterns = new Map([
      ['sql_injection', SQL_INJECTION_PATTERNS],
      ['xss', XSS_PATTERNS],
      ['command_injection', COMMAND_INJECTION_PATTERNS],
      ['path_traversal', PATH_TRAVERSAL_PATTERNS],
      ['prompt_injection', PROMPT_INJECTION_PATTERNS],
      ['pii', PII_PATTERNS],
      ['custom', customPatterns],
    ]);
    this.bypassRoles = new Set(bypassRoles);
  }

  async validate(
    context: GuardrailContext,
    input: GuardrailInput,
    config: SecurityLayerConfig
  ): Promise<LayerValidationResult> {
    const startTime = Date.now();
    const options = config.options || {};
    const detections: SecurityDetection[] = [];

    try {
      const prompt = input.prompt || '';

      // Run all enabled checks (potentially in parallel)
      const checks: Promise<SecurityDetection[]>[] = [];

      if (options.detectSqlInjection !== false) {
        checks.push(this.runPatternCheck(prompt, 'sql_injection'));
      }
      if (options.detectXss !== false) {
        checks.push(this.runPatternCheck(prompt, 'xss'));
      }
      if (options.detectCommandInjection !== false) {
        checks.push(this.runPatternCheck(prompt, 'command_injection'));
      }
      if (options.detectPromptInjection !== false) {
        checks.push(this.runPatternCheck(prompt, 'prompt_injection'));
      }
      if (options.detectPii !== false) {
        checks.push(this.runPatternCheck(prompt, 'pii'));
      }
      if (options.detectPathTraversal !== false) {
        checks.push(this.runPatternCheck(prompt, 'path_traversal'));
      }
      if (options.customPatterns && options.customPatterns.length > 0) {
        // Add custom patterns temporarily
        this.patterns.set('custom', options.customPatterns);
        checks.push(this.runPatternCheck(prompt, 'custom'));
      }

      // Run all checks in parallel
      const results = await Promise.all(checks);
      results.forEach(result => detections.push(...result));

      // Determine final action based on detections
      if (detections.length === 0) {
        return this.createResult(
          {
            action: 'allow',
            confidence: 1.0,
            reason: 'No security issues detected',
            detections: [],
          },
          startTime
        );
      }

      // Find the most severe detection
      const mostSevere = this.getMostSevereDetection(detections);
      const action = this.determineAction(detections);

      return this.createResult(
        {
          action,
          confidence: mostSevere.confidence,
          reason: this.formatDetectionReason(detections),
          detections,
          metadata: {
            detectionCount: detections.length,
            severityCounts: this.countSeverities(detections),
            types: [...new Set(detections.map(d => d.type))],
          },
        },
        startTime
      );
    } catch (error) {
      if (!config.continueOnError) {
        return this.createResult(
          {
            action: 'block',
            confidence: 0.5,
            reason: `Security layer error: ${error instanceof Error ? error.message : String(error)}`,
            detections,
          },
          startTime
        );
      }

      return this.createResult(
        {
          action: 'warn',
          confidence: 0.5,
          reason: `Security layer error (continuing): ${error instanceof Error ? error.message : String(error)}`,
          detections,
        },
        startTime
      );
    }
  }

  shouldBypass(context: GuardrailContext): boolean {
    if (!context.userRoles) return false;
    return context.userRoles.some(role => this.bypassRoles.has(role));
  }

  // ===========================================================================
  // PATTERN CHECKING
  // ===========================================================================

  private async runPatternCheck(input: string, type: string): Promise<SecurityDetection[]> {
    const patterns = this.patterns.get(type) || [];
    const detections: SecurityDetection[] = [];

    for (const pattern of patterns) {
      const matches = this.findMatches(input, pattern);
      if (matches.length > 0) {
        for (const match of matches) {
          detections.push({
            type: this.mapTypeToDetectionType(type),
            patternName: pattern.name,
            confidence: this.calculateConfidence(pattern, match),
            location: {
              start: match.index,
              end: match.index + match.match.length,
              snippet: this.getSnippet(input, match.index, match.match.length),
            },
            severity: pattern.severity,
          });
        }
      }
    }

    return detections;
  }

  private findMatches(
    input: string,
    pattern: SecurityPattern
  ): Array<{ match: string; index: number }> {
    const matches: Array<{ match: string; index: number }> = [];

    if (pattern.pattern instanceof RegExp) {
      // Clone regex with global flag
      const regex = new RegExp(pattern.pattern.source, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(input)) !== null) {
        matches.push({
          match: match[0],
          index: match.index,
        });

        // Prevent infinite loops for zero-length matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else if (typeof pattern.pattern === 'function') {
      // Custom function pattern
      if (pattern.pattern(input)) {
        matches.push({
          match: input.substring(0, 50), // Take first 50 chars as "match"
          index: 0,
        });
      }
    }

    return matches;
  }

  private mapTypeToDetectionType(type: string): SecurityDetection['type'] {
    const mapping: Record<string, SecurityDetection['type']> = {
      sql_injection: 'sql_injection',
      xss: 'xss',
      command_injection: 'command_injection',
      path_traversal: 'path_traversal',
      prompt_injection: 'prompt_injection',
      pii: 'pii',
      custom: 'custom',
    };
    return mapping[type] || 'custom';
  }

  private calculateConfidence(
    pattern: SecurityPattern,
    match: { match: string; index: number }
  ): number {
    // Base confidence on severity
    const severityBase: Record<string, number> = {
      low: 0.6,
      medium: 0.75,
      high: 0.9,
      critical: 0.95,
    };

    let confidence = severityBase[pattern.severity] || 0.7;

    // Adjust based on match length (longer matches = higher confidence)
    if (match.match.length > 20) {
      confidence = Math.min(1.0, confidence + 0.05);
    }

    return confidence;
  }

  private getSnippet(input: string, index: number, matchLength: number): string {
    const contextChars = 20;
    const start = Math.max(0, index - contextChars);
    const end = Math.min(input.length, index + matchLength + contextChars);

    let snippet = input.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < input.length) snippet = snippet + '...';

    return snippet;
  }

  // ===========================================================================
  // DECISION MAKING
  // ===========================================================================

  private getMostSevereDetection(detections: SecurityDetection[]): SecurityDetection {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return detections.reduce((most, current) => {
      const mostSeverity = severityOrder[most.severity] || 0;
      const currentSeverity = severityOrder[current.severity] || 0;
      return currentSeverity > mostSeverity ? current : most;
    });
  }

  private determineAction(
    detections: SecurityDetection[]
  ): 'allow' | 'warn' | 'block' | 'halt' | 'terminate' {
    // Check for terminate conditions
    const hasCritical = detections.some(d => d.severity === 'critical');
    if (hasCritical) return 'terminate';

    // Check for block conditions
    const hasHigh = detections.some(d => d.severity === 'high');
    if (hasHigh) return 'block';

    // Check for warn conditions
    const hasMedium = detections.some(d => d.severity === 'medium');
    if (hasMedium) return 'warn';

    // Low severity = warn
    return 'warn';
  }

  private formatDetectionReason(detections: SecurityDetection[]): string {
    const uniqueTypes = [...new Set(detections.map(d => d.type))];
    const typeDescriptions = uniqueTypes.map(type => {
      const count = detections.filter(d => d.type === type).length;
      const typeName = type.replace(/_/g, ' ');
      return `${count} ${typeName}${count > 1 ? 's' : ''}`;
    });

    return `Security issues detected: ${typeDescriptions.join(', ')}`;
  }

  private countSeverities(detections: SecurityDetection[]): Record<string, number> {
    return detections.reduce(
      (counts, d) => {
        counts[d.severity] = (counts[d.severity] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
  }

  private createResult(
    partial: Partial<LayerValidationResult> & { detections?: SecurityDetection[] },
    startTime: number
  ): LayerValidationResult {
    return {
      layer: this.layer,
      action: partial.action || 'allow',
      confidence: partial.confidence || 1.0,
      reason: partial.reason || 'Validation complete',
      durationMs: Date.now() - startTime,
      detections: partial.detections,
      metadata: partial.metadata,
    };
  }

  // ===========================================================================
  // PUBLIC METHODS FOR PATTERN MANAGEMENT
  // ===========================================================================

  /**
   * Add custom security patterns.
   */
  addPatterns(patterns: SecurityPattern[]): void {
    const existing = this.patterns.get('custom') || [];
    this.patterns.set('custom', [...existing, ...patterns]);
  }

  /**
   * Clear custom patterns.
   */
  clearCustomPatterns(): void {
    this.patterns.set('custom', []);
  }

  /**
   * Get all patterns for a type.
   */
  getPatterns(type: string): SecurityPattern[] {
    return this.patterns.get(type) || [];
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Security layer instance.
 */
export function createSecurityLayer(
  customPatterns?: SecurityPattern[],
  bypassRoles?: string[]
): SecurityLayer {
  return new SecurityLayer(customPatterns, bypassRoles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  PII_PATTERNS,
};
