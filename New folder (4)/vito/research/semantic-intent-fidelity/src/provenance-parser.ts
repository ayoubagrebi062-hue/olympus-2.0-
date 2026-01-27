/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Deterministic intent parser with full provenance tracking.
 * Eliminates phantom intent injection.
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

import * as crypto from 'crypto';
import {
  ProvenanceParseResult,
  ProvenanceIntent,
  TextSpan,
  Provenance,
  PhantomCheck,
  CoverageStats,
  DerivationStep,
  IntentPriority,
  IntentCategory,
  RESEARCH_IDENTITY,
} from './provenance-types';
import { PATTERN_RULES } from './pattern-rules';

// ============================================
// PARSER VERSION
// ============================================

const PARSER_VERSION = '1.0.0-research';

// ============================================
// HELPER FUNCTIONS
// ============================================

function computeHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function createSpan(source: string, start: number, end: number): TextSpan {
  const text = source.substring(start, end);
  const beforeText = source.substring(0, start);
  const lines = beforeText.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { start, end, text, line, column };
}

function splitIntoSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];

  // Split by newlines first (each line is a potential intent)
  const lines = text.split('\n');
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      // Skip lines that are just labels/headers
      if (trimmed.endsWith(':') && trimmed.length < 30) {
        offset += line.length + 1;
        continue;
      }

      // Find the actual position in the original text
      const start = text.indexOf(trimmed, offset);
      sentences.push({
        text: trimmed,
        start,
        end: start + trimmed.length,
      });
    }
    offset += line.length + 1;
  }

  return sentences;
}

function inferPriority(text: string): IntentPriority {
  const lower = text.toLowerCase();

  if (lower.includes('critical') || lower.includes('must') || lower.includes('required')) {
    return 'critical';
  }
  if (lower.includes('important') || lower.includes('should')) {
    return 'high';
  }
  if (lower.includes('optional') || lower.includes('may') || lower.includes('could')) {
    return 'low';
  }

  return 'medium';
}

function inferCategory(text: string): IntentCategory {
  const lower = text.toLowerCase();

  if (lower.includes('load') || lower.includes('initial') || lower.includes('start')) {
    return 'initialization';
  }
  if (lower.includes('cannot') || lower.includes('must not') || lower.includes('prevent')) {
    return 'constraint';
  }
  if (lower.includes('navigate') || lower.includes('redirect') || lower.includes('route')) {
    return 'navigation';
  }
  if (lower.includes('valid') || lower.includes('check') || lower.includes('verify')) {
    return 'validation';
  }

  return 'functional';
}

// ============================================
// PHANTOM DETECTION
// ============================================

function detectPhantoms(intents: ProvenanceIntent[], sourceText: string): PhantomCheck {
  const phantoms: Array<{ element: string; reason: string }> = [];

  for (const intent of intents) {
    // Check if the requirement text actually appears in source
    if (intent.requirement && !sourceText.includes(intent.requirement)) {
      // This shouldn't happen with our parser, but check anyway
      phantoms.push({
        element: `intent ${intent.id}`,
        reason: 'Requirement text not found in source',
      });
    }

    // Check trigger target
    if (intent.trigger?.target) {
      const targetLower = intent.trigger.target.toLowerCase();
      if (!sourceText.toLowerCase().includes(targetLower)) {
        phantoms.push({
          element: `trigger.target: ${intent.trigger.target}`,
          reason: `Target "${intent.trigger.target}" not found in source text`,
        });
      }
    }

    // Check state name
    if (intent.state?.name) {
      const stateLower = intent.state.name.toLowerCase();
      if (!sourceText.toLowerCase().includes(stateLower)) {
        phantoms.push({
          element: `state.name: ${intent.state.name}`,
          reason: `State "${intent.state.name}" not found in source text`,
        });
      }
    }

    // Check for suspicious patterns (word fragments with 's' suffix)
    const suspiciousPatterns = /^(the|a|an|on|in|at|to|if|is|it)s$/i;
    if (intent.state?.name && suspiciousPatterns.test(intent.state.name)) {
      phantoms.push({
        element: `state.name: ${intent.state.name}`,
        reason: 'Suspicious word-fragment state name detected',
      });
    }
  }

  return {
    passed: phantoms.length === 0,
    phantomCount: phantoms.length,
    phantoms,
  };
}

// ============================================
// COVERAGE CALCULATION
// ============================================

function calculateCoverage(intents: ProvenanceIntent[], sourceText: string): CoverageStats {
  const coveredRanges: Array<[number, number]> = [];

  // Collect all covered spans
  for (const intent of intents) {
    if (intent.provenance?.span) {
      coveredRanges.push([intent.provenance.span.start, intent.provenance.span.end]);
    }
  }

  // Merge overlapping ranges
  coveredRanges.sort((a, b) => a[0] - b[0]);
  const mergedRanges: Array<[number, number]> = [];

  for (const range of coveredRanges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(range);
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (range[0] <= last[1]) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        mergedRanges.push(range);
      }
    }
  }

  // Calculate covered characters
  let coveredChars = 0;
  for (const [start, end] of mergedRanges) {
    coveredChars += end - start;
  }

  // Find uncovered spans
  const uncoveredSpans: TextSpan[] = [];
  let lastEnd = 0;

  for (const [start, end] of mergedRanges) {
    if (start > lastEnd) {
      const uncoveredText = sourceText.substring(lastEnd, start).trim();
      if (uncoveredText.length > 0) {
        uncoveredSpans.push(createSpan(sourceText, lastEnd, start));
      }
    }
    lastEnd = end;
  }

  if (lastEnd < sourceText.length) {
    const uncoveredText = sourceText.substring(lastEnd).trim();
    if (uncoveredText.length > 0) {
      uncoveredSpans.push(createSpan(sourceText, lastEnd, sourceText.length));
    }
  }

  const totalChars = sourceText.length;

  return {
    sourceCharsCovered: coveredChars,
    sourceTotalChars: totalChars,
    coveragePercent: totalChars > 0 ? (coveredChars / totalChars) * 100 : 0,
    uncoveredSpans,
  };
}

// ============================================
// MAIN PARSER
// ============================================

export function parseWithProvenance(sourceText: string): ProvenanceParseResult {
  const intents: ProvenanceIntent[] = [];
  let intentCounter = 0;

  // Split into sentences
  const sentences = splitIntoSentences(sourceText);

  for (const sentence of sentences) {
    let matched = false;

    // Try each pattern rule in priority order
    for (const rule of PATTERN_RULES) {
      const match = sentence.text.match(rule.pattern);

      if (match) {
        const extracted = rule.extract(match, sourceText, sentence.start);

        if (extracted) {
          intentCounter++;
          const intentId = `INT-${String(intentCounter).padStart(3, '0')}`;

          // Build derivation chain
          const derivationChain: DerivationStep[] = [
            {
              step: 1,
              rule: rule.id,
              input: sentence.text,
              output: extracted.requirement || sentence.text,
            },
          ];

          // Create complete intent
          const intent: ProvenanceIntent = {
            id: intentId,
            requirement: extracted.requirement || sentence.text,
            requirementProvenance: extracted.requirementProvenance || {
              source: 'input',
              span: createSpan(sourceText, sentence.start, sentence.end),
              rule: rule.id,
              confidence: 0.8,
            },
            priority: inferPriority(sentence.text),
            category: extracted.category || inferCategory(sentence.text),
            trigger: extracted.trigger,
            state: extracted.state,
            effect: extracted.effect,
            outcome: extracted.outcome,
            provenance: extracted.provenance || {
              source: 'input',
              span: createSpan(sourceText, sentence.start, sentence.end),
              rule: rule.id,
              confidence: 0.8,
            },
            derivationChain,
          };

          intents.push(intent);
          matched = true;
          break;
        }
      }
    }

    // If no pattern matched, create a basic intent (but only if it looks like an intent)
    if (!matched && sentence.text.length > 10) {
      // Check if it looks like an intent (contains action words)
      const looksLikeIntent = /\b(click|display|show|when|on|if|button|increases?|decreases?|sets?|resets?)\b/i.test(sentence.text);

      if (looksLikeIntent) {
        intentCounter++;
        const intentId = `INT-${String(intentCounter).padStart(3, '0')}`;

        intents.push({
          id: intentId,
          requirement: sentence.text,
          requirementProvenance: {
            source: 'input',
            span: createSpan(sourceText, sentence.start, sentence.end),
            rule: 'RULE-FALLBACK',
            confidence: 0.5,
          },
          priority: inferPriority(sentence.text),
          category: inferCategory(sentence.text),
          provenance: {
            source: 'input',
            span: createSpan(sourceText, sentence.start, sentence.end),
            rule: 'RULE-FALLBACK',
            confidence: 0.5,
          },
          derivationChain: [
            {
              step: 1,
              rule: 'RULE-FALLBACK',
              input: sentence.text,
              output: sentence.text,
            },
          ],
        });
      }
    }
  }

  // Perform phantom detection
  const phantomCheck = detectPhantoms(intents, sourceText);

  // Calculate coverage
  const coverage = calculateCoverage(intents, sourceText);

  return {
    version: '1.0',
    parserVersion: PARSER_VERSION,
    sourceHash: computeHash(sourceText),
    sourceText,
    parsedAt: new Date().toISOString(),
    intents,
    phantomCheck,
    coverage,
  };
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export function validateParseResult(result: ProvenanceParseResult): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for phantoms
  if (!result.phantomCheck.passed) {
    errors.push(`Phantom intents detected: ${result.phantomCheck.phantomCount}`);
    for (const phantom of result.phantomCheck.phantoms) {
      errors.push(`  - ${phantom.element}: ${phantom.reason}`);
    }
  }

  // Check coverage
  if (result.coverage.coveragePercent < 50) {
    warnings.push(`Low source coverage: ${result.coverage.coveragePercent.toFixed(1)}%`);
  }

  // Check intent count
  if (result.intents.length === 0) {
    errors.push('No intents extracted from source');
  }

  // Check each intent has provenance
  for (const intent of result.intents) {
    if (!intent.provenance) {
      errors.push(`Intent ${intent.id} missing provenance`);
    }
    if (!intent.requirementProvenance) {
      errors.push(`Intent ${intent.id} missing requirement provenance`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// CONVERSION TO CANONICAL FORMAT
// ============================================

export function toCanonicalIntentFormat(result: ProvenanceParseResult): {
  intents: Array<{
    id: string;
    requirement: string;
    category: string;
    priority: string;
    source: string;
    expectedTrigger?: {
      type: string;
      target?: string;
      event?: string;
    };
    expectedState?: {
      stateName: string;
    };
    expectedOutcome?: {
      type: string;
      description: string;
    };
  }>;
} {
  return {
    intents: result.intents.map((intent) => ({
      id: intent.id,
      requirement: intent.requirement,
      category: intent.category,
      priority: intent.priority,
      source: 'provenance-parser',
      expectedTrigger: intent.trigger
        ? {
            type: intent.trigger.type,
            target: intent.trigger.target,
            event: intent.trigger.event,
          }
        : undefined,
      expectedState: intent.state
        ? {
            stateName: intent.state.name,
          }
        : undefined,
      expectedOutcome: intent.outcome
        ? {
            type: intent.outcome.type || 'display',
            description: intent.outcome.description,
          }
        : undefined,
    })),
  };
}

// ============================================
// RESEARCH IDENTITY EXPORT
// ============================================

export { RESEARCH_IDENTITY };
export { PARSER_VERSION };
