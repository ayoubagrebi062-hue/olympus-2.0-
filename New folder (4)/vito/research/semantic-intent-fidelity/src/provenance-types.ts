/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Type definitions for provenance-tracked intent parsing.
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

// ============================================
// TEXT SPAN TYPES
// ============================================

export interface TextSpan {
  start: number;      // Start character index (inclusive)
  end: number;        // End character index (exclusive)
  text: string;       // The actual text content
  line?: number;      // Line number (1-indexed)
  column?: number;    // Column number (1-indexed)
}

// ============================================
// PROVENANCE TYPES
// ============================================

export type ProvenanceSource = 'input' | 'derived' | 'default';

export interface Provenance {
  source: ProvenanceSource;
  span: TextSpan;
  rule: string;           // The extraction rule that produced this
  confidence: number;     // Rule-based confidence (0-1)
  alternatives?: Array<{
    value: string;
    confidence: number;
  }>;
}

// ============================================
// TRIGGER TYPES
// ============================================

export type TriggerType =
  | 'click'
  | 'input'
  | 'change'
  | 'submit'
  | 'lifecycle'
  | 'timer'
  | 'external';

export interface TriggerProvenance {
  type: TriggerType;
  event?: string;           // e.g., 'page_load', 'focus'
  target?: string;          // UI element that triggers
  targetProvenance?: Provenance;
  condition?: string;
  provenance: Provenance;
}

// ============================================
// STATE TYPES
// ============================================

export type StateType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'unknown';

export interface StateProvenance {
  name: string;
  type?: StateType;
  initialValue?: unknown;
  initialValueProvenance?: Provenance;
  provenance: Provenance;
}

// ============================================
// EFFECT TYPES
// ============================================

export type EffectAction =
  | 'set'
  | 'increment'
  | 'decrement'
  | 'toggle'
  | 'append'
  | 'remove'
  | 'clear'
  | 'display'
  | 'hide'
  | 'navigate'
  | 'call';

export interface EffectProvenance {
  action: EffectAction;
  target?: string;
  targetProvenance?: Provenance;
  value?: unknown;
  valueProvenance?: Provenance;
  provenance: Provenance;
}

// ============================================
// OUTCOME TYPES
// ============================================

export type OutcomeType =
  | 'display'
  | 'state_change'
  | 'navigation'
  | 'visibility'
  | 'validation';

export interface OutcomeProvenance {
  description: string;
  type?: OutcomeType;
  verifiable: boolean;
  verificationMethod?: string;
  provenance: Provenance;
}

// ============================================
// INTENT TYPES
// ============================================

export type IntentPriority = 'critical' | 'high' | 'medium' | 'low';
export type IntentCategory =
  | 'functional'
  | 'constraint'
  | 'initialization'
  | 'navigation'
  | 'validation';

export interface DerivationStep {
  step: number;
  rule: string;
  input: string;
  output: string;
}

export interface ProvenanceIntent {
  id: string;
  requirement: string;
  requirementProvenance: Provenance;
  priority: IntentPriority;
  category: IntentCategory;
  trigger?: TriggerProvenance;
  state?: StateProvenance;
  effect?: EffectProvenance;
  outcome?: OutcomeProvenance;
  provenance: Provenance;
  derivationChain: DerivationStep[];
}

// ============================================
// PHANTOM CHECK TYPES
// ============================================

export interface PhantomDetection {
  element: string;
  reason: string;
}

export interface PhantomCheck {
  passed: boolean;
  phantomCount: number;
  phantoms: PhantomDetection[];
}

// ============================================
// COVERAGE TYPES
// ============================================

export interface CoverageStats {
  sourceCharsCovered: number;
  sourceTotalChars: number;
  coveragePercent: number;
  uncoveredSpans: TextSpan[];
}

// ============================================
// PARSER OUTPUT
// ============================================

export interface ProvenanceParseResult {
  version: '1.0';
  parserVersion: string;
  sourceHash: string;
  sourceText: string;
  parsedAt: string;
  intents: ProvenanceIntent[];
  phantomCheck: PhantomCheck;
  coverage: CoverageStats;
}

// ============================================
// PATTERN RULE TYPES
// ============================================

export interface PatternMatch {
  matched: boolean;
  span: TextSpan;
  captures: Record<string, string>;
  confidence: number;
}

export interface PatternRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  extract: (match: RegExpMatchArray, source: string, startOffset: number) => Partial<ProvenanceIntent> | null;
  priority: number;  // Higher priority rules are tried first
}

// ============================================
// RESEARCH IDENTITY
// ============================================

export const RESEARCH_IDENTITY = Object.freeze({
  trackName: 'semantic-intent-fidelity',
  version: '1.0.0-research',
  authority: 'EXPERIMENTAL' as const,
  canShip: false,
  baselineComparison: 'canonical-2.1',
});
