/**
 * OLYMPUS - Input Sanitizer
 *
 * SECURITY FIX: Cluster #2 - Missing Input Boundary Enforcement
 * Central gateway for all user input validation and sanitization.
 * Prevents prompt injection, XSS, and other input-based attacks.
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

/**
 * Sanitization result with full audit trail
 */
export interface SanitizationResult {
  original: string;
  sanitized: string;
  wasFiltered: boolean;
  filterReasons: string[];
  inputHash: string;
  processedAt: number;
}

/**
 * Injection pattern configuration
 */
interface InjectionPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'filter' | 'warn';
}

/**
 * Sanitizer configuration
 */
export interface SanitizerConfig {
  maxInputLength: number;
  enableInjectionDetection: boolean;
  enableHtmlStripping: boolean;
  enableTemplateProtection: boolean;
  logFilteredInputs: boolean;
  customPatterns?: InjectionPattern[];
}

const DEFAULT_CONFIG: SanitizerConfig = {
  maxInputLength: 50000, // 50KB max
  enableInjectionDetection: true,
  enableHtmlStripping: true,
  enableTemplateProtection: true,
  logFilteredInputs: true,
};

/**
 * SECURITY: Known prompt injection patterns
 * These patterns attempt to manipulate LLM behavior
 */
const INJECTION_PATTERNS: InjectionPattern[] = [
  // Direct instruction override attempts
  {
    name: 'instruction_override',
    pattern:
      /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|guidelines?)/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'forget_instructions',
    pattern: /forget\s+(everything|all|your)\s+(instructions?|training|rules?|prompts?)/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'new_persona',
    pattern: /you\s+are\s+now\s+(a|an|the)\s+/i,
    severity: 'high',
    action: 'filter',
  },
  {
    name: 'pretend_to_be',
    pattern: /pretend\s+(to\s+be|you\s+are|that\s+you)/i,
    severity: 'high',
    action: 'filter',
  },
  {
    name: 'act_as',
    pattern: /act\s+as\s+(if\s+you\s+are|a|an|the)/i,
    severity: 'medium',
    action: 'warn',
  },

  // System prompt extraction attempts
  {
    name: 'reveal_system_prompt',
    pattern:
      /(show|reveal|display|print|output|repeat)\s+(your\s+)?(system\s+prompt|instructions?|initial\s+prompt)/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'what_instructions',
    pattern: /what\s+(are|were)\s+your\s+(initial\s+)?instructions/i,
    severity: 'high',
    action: 'filter',
  },

  // Jailbreak attempts
  {
    name: 'dan_jailbreak',
    pattern: /\bDAN\b|\bDo\s+Anything\s+Now\b/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'developer_mode',
    pattern: /enable\s+(developer|debug|admin|god)\s+mode/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'bypass_safety',
    pattern:
      /(bypass|disable|ignore|skip)\s+(safety|content|ethical)\s+(filters?|guidelines?|restrictions?)/i,
    severity: 'critical',
    action: 'block',
  },

  // Delimiter injection
  {
    name: 'markdown_injection',
    pattern: /```\s*(system|assistant|user)\s*\n/i,
    severity: 'high',
    action: 'filter',
  },
  {
    name: 'xml_tag_injection',
    pattern: /<\/?(?:system|assistant|user|instructions?|prompt)>/i,
    severity: 'high',
    action: 'filter',
  },

  // Template injection
  {
    name: 'template_injection',
    pattern: /\{\{\s*(?:constructor|prototype|__proto__|this)\s*[.\[]/i,
    severity: 'critical',
    action: 'block',
  },
  {
    name: 'handlebars_injection',
    pattern: /\{\{[#\/]?\s*(?:each|if|unless|with|lookup|log)\b/i,
    severity: 'high',
    action: 'filter',
  },
];

/**
 * SECURITY: XSS and HTML patterns
 */
const HTML_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/i,
  /<object\b[^>]*>[\s\S]*?<\/object>/i,
  /<embed\b[^>]*>/i,
  /<link\b[^>]*>/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /on\w+\s*=/i, // onclick, onerror, etc.
];

/**
 * Input too long error
 */
export class InputTooLongError extends Error {
  constructor(
    public actualLength: number,
    public maxLength: number
  ) {
    super(`Input exceeds maximum length: ${actualLength} > ${maxLength}`);
    this.name = 'InputTooLongError';
  }
}

/**
 * Input blocked error (critical injection detected)
 */
export class InputBlockedError extends Error {
  constructor(
    public reason: string,
    public pattern: string
  ) {
    super(`Input blocked: ${reason}`);
    this.name = 'InputBlockedError';
  }
}

/**
 * InputSanitizer - Central security gateway for all user input
 */
export class InputSanitizer {
  private config: SanitizerConfig;
  private customPatterns: InjectionPattern[];

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.customPatterns = config.customPatterns || [];
  }

  /**
   * Sanitize user input
   * @throws InputTooLongError if input exceeds max length
   * @throws InputBlockedError if critical injection detected
   */
  sanitize(input: string): SanitizationResult {
    const startTime = Date.now();
    const inputHash = this.hashInput(input);
    const filterReasons: string[] = [];
    let sanitized = input;

    // 1. Length check
    if (input.length > this.config.maxInputLength) {
      throw new InputTooLongError(input.length, this.config.maxInputLength);
    }

    // 2. Injection detection
    if (this.config.enableInjectionDetection) {
      const allPatterns = [...INJECTION_PATTERNS, ...this.customPatterns];

      for (const { name, pattern, severity, action } of allPatterns) {
        if (pattern.test(sanitized)) {
          const reason = `${name} (${severity})`;

          if (action === 'block') {
            if (this.config.logFilteredInputs) {
              logger.warn('[InputSanitizer] Input BLOCKED', {
                pattern: name,
                severity,
                inputHash,
              });
            }
            throw new InputBlockedError(reason, name);
          }

          if (action === 'filter') {
            sanitized = sanitized.replace(pattern, '[FILTERED]');
            filterReasons.push(reason);
          }

          if (action === 'warn') {
            filterReasons.push(`WARNING: ${reason}`);
          }
        }
      }
    }

    // 3. HTML/Script stripping
    if (this.config.enableHtmlStripping) {
      for (const pattern of HTML_PATTERNS) {
        if (pattern.test(sanitized)) {
          sanitized = sanitized.replace(pattern, '');
          filterReasons.push('html_stripped');
        }
      }
    }

    // 4. Template injection protection
    if (this.config.enableTemplateProtection) {
      // Escape dangerous template characters
      sanitized = sanitized.replace(/\$\{/g, '\\${').replace(/\{\{/g, '\\{\\{');
    }

    // 5. Trim and normalize whitespace
    sanitized = sanitized.trim();

    // Log if filtered
    if (filterReasons.length > 0 && this.config.logFilteredInputs) {
      logger.info('[InputSanitizer] Input filtered', {
        reasons: filterReasons,
        inputHash,
        originalLength: input.length,
        sanitizedLength: sanitized.length,
      });
    }

    return {
      original: input,
      sanitized,
      wasFiltered: filterReasons.length > 0,
      filterReasons,
      inputHash,
      processedAt: startTime,
    };
  }

  /**
   * Quick check if input contains dangerous patterns (no modification)
   */
  check(input: string): { safe: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (input.length > this.config.maxInputLength) {
      return { safe: false, warnings: ['Input exceeds max length'] };
    }

    const allPatterns = [...INJECTION_PATTERNS, ...this.customPatterns];
    for (const { name, pattern, severity, action } of allPatterns) {
      if (pattern.test(input)) {
        if (action === 'block') {
          return { safe: false, warnings: [`Blocked: ${name}`] };
        }
        warnings.push(`${severity}: ${name}`);
      }
    }

    for (const pattern of HTML_PATTERNS) {
      if (pattern.test(input)) {
        warnings.push('Contains HTML/script content');
        break;
      }
    }

    return { safe: warnings.length === 0, warnings };
  }

  /**
   * Hash input for logging (privacy-preserving)
   */
  private hashInput(input: string): string {
    // Simple hash for logging - not cryptographic
    let hash = 0;
    for (let i = 0; i < Math.min(input.length, 1000); i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Get current config
   */
  getConfig(): SanitizerConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<SanitizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ─────────────── SINGLETON INSTANCE ───────────────

let defaultSanitizer: InputSanitizer | null = null;

/**
 * Get the default sanitizer instance
 */
export function getSanitizer(): InputSanitizer {
  if (!defaultSanitizer) {
    defaultSanitizer = new InputSanitizer();
  }
  return defaultSanitizer;
}

/**
 * Convenience function - sanitize with default config
 */
export function sanitizeInput(input: string): SanitizationResult {
  return getSanitizer().sanitize(input);
}

/**
 * Convenience function - quick safety check
 */
export function isInputSafe(input: string): boolean {
  return getSanitizer().check(input).safe;
}

export default InputSanitizer;
