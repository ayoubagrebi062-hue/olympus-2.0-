/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Deterministic pattern rules for intent extraction.
 * Each rule produces intents with full provenance.
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

import {
  PatternRule,
  ProvenanceIntent,
  TextSpan,
  Provenance,
  TriggerType,
  EffectAction,
  IntentPriority,
  IntentCategory,
} from './provenance-types';

// ============================================
// HELPER FUNCTIONS
// ============================================

function createSpan(source: string, start: number, end: number): TextSpan {
  const text = source.substring(start, end);
  const beforeText = source.substring(0, start);
  const lines = beforeText.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { start, end, text, line, column };
}

function createProvenance(
  source: string,
  start: number,
  end: number,
  rule: string,
  confidence: number
): Provenance {
  return {
    source: 'input',
    span: createSpan(source, start, end),
    rule,
    confidence,
  };
}

// ============================================
// TRIGGER PATTERNS
// ============================================

const TRIGGER_PATTERNS: Record<string, { type: TriggerType; event?: string; confidence: number }> = {
  // Lifecycle triggers
  'page load': { type: 'lifecycle', event: 'page_load', confidence: 1.0 },
  'on load': { type: 'lifecycle', event: 'page_load', confidence: 1.0 },
  'when loaded': { type: 'lifecycle', event: 'page_load', confidence: 0.95 },
  'page opens': { type: 'lifecycle', event: 'page_load', confidence: 0.9 },
  'app starts': { type: 'lifecycle', event: 'app_start', confidence: 1.0 },
  'component mounts': { type: 'lifecycle', event: 'mount', confidence: 1.0 },

  // Click triggers
  'click': { type: 'click', confidence: 1.0 },
  'clicks': { type: 'click', confidence: 1.0 },
  'pressed': { type: 'click', confidence: 0.9 },
  'tapped': { type: 'click', confidence: 0.9 },

  // Input triggers
  'types': { type: 'input', confidence: 1.0 },
  'enters': { type: 'input', confidence: 0.95 },
  'inputs': { type: 'input', confidence: 1.0 },

  // Change triggers
  'changes': { type: 'change', confidence: 1.0 },
  'modifies': { type: 'change', confidence: 0.9 },
  'updates': { type: 'change', confidence: 0.85 },

  // Submit triggers
  'submits': { type: 'submit', confidence: 1.0 },
  'submit': { type: 'submit', confidence: 1.0 },
};

// ============================================
// EFFECT PATTERNS
// ============================================

const EFFECT_PATTERNS: Record<string, { action: EffectAction; confidence: number }> = {
  // Set actions
  'set': { action: 'set', confidence: 1.0 },
  'sets': { action: 'set', confidence: 1.0 },
  'becomes': { action: 'set', confidence: 0.9 },
  'reset': { action: 'set', confidence: 0.95 },
  'resets': { action: 'set', confidence: 0.95 },

  // Increment actions
  'increase': { action: 'increment', confidence: 1.0 },
  'increases': { action: 'increment', confidence: 1.0 },
  'increment': { action: 'increment', confidence: 1.0 },
  'increments': { action: 'increment', confidence: 1.0 },
  'add': { action: 'increment', confidence: 0.9 },
  'adds': { action: 'increment', confidence: 0.9 },

  // Decrement actions
  'decrease': { action: 'decrement', confidence: 1.0 },
  'decreases': { action: 'decrement', confidence: 1.0 },
  'decrement': { action: 'decrement', confidence: 1.0 },
  'decrements': { action: 'decrement', confidence: 1.0 },
  'subtract': { action: 'decrement', confidence: 0.9 },
  'subtracts': { action: 'decrement', confidence: 0.9 },

  // Display actions
  'display': { action: 'display', confidence: 1.0 },
  'displays': { action: 'display', confidence: 1.0 },
  'show': { action: 'display', confidence: 0.95 },
  'shows': { action: 'display', confidence: 0.95 },
  'render': { action: 'display', confidence: 0.9 },
  'renders': { action: 'display', confidence: 0.9 },

  // Hide actions
  'hide': { action: 'hide', confidence: 1.0 },
  'hides': { action: 'hide', confidence: 1.0 },
  'hidden': { action: 'hide', confidence: 0.9 },

  // Clear actions
  'clear': { action: 'clear', confidence: 1.0 },
  'clears': { action: 'clear', confidence: 1.0 },
  'empty': { action: 'clear', confidence: 0.85 },
  'empties': { action: 'clear', confidence: 0.85 },

  // Toggle actions
  'toggle': { action: 'toggle', confidence: 1.0 },
  'toggles': { action: 'toggle', confidence: 1.0 },

  // Navigation actions
  'navigate': { action: 'navigate', confidence: 1.0 },
  'navigates': { action: 'navigate', confidence: 1.0 },
  'redirect': { action: 'navigate', confidence: 0.95 },
  'redirects': { action: 'navigate', confidence: 0.95 },
};

// ============================================
// VALUE PATTERNS
// ============================================

const VALUE_MAP: Record<string, unknown> = {
  'zero': 0,
  '0': 0,
  'one': 1,
  '1': 1,
  'two': 2,
  '2': 2,
  'true': true,
  'false': false,
  'empty': '',
  'null': null,
  'nothing': null,
};

// ============================================
// BUTTON/ELEMENT NAME EXTRACTION
// ============================================

const BUTTON_PATTERNS = [
  /(\w+)\s+button/i,
  /button\s+(?:labeled\s+)?["']?(\w+)["']?/i,
  /["']([^"']+)["']\s+button/i,
  /click(?:s|ing)?\s+(?:the\s+)?["']?(\w+)["']?/i,
];

function extractButtonName(text: string): { name: string; span: { start: number; end: number } } | null {
  for (const pattern of BUTTON_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].toLowerCase();
      // Avoid extracting common words as button names
      if (['the', 'a', 'an', 'on', 'in', 'at', 'to', 'if', 'is', 'it'].includes(name)) {
        continue;
      }
      const fullMatch = match[0];
      const start = text.indexOf(fullMatch);
      return {
        name,
        span: { start, end: start + fullMatch.length },
      };
    }
  }
  return null;
}

// ============================================
// PATTERN RULES
// ============================================

export const PATTERN_RULES: PatternRule[] = [
  // ============================================
  // RULE 1: "When X, Y" pattern
  // ============================================
  {
    id: 'RULE-001',
    name: 'when-then',
    description: 'Matches "When [trigger], [effect]" patterns',
    pattern: /when\s+(.+?),\s*(.+)/i,
    priority: 100,
    extract: (match, source, startOffset) => {
      const [fullMatch, triggerPart, effectPart] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      // Find trigger type
      let triggerType: TriggerType = 'click';
      let triggerEvent: string | undefined;
      let triggerConfidence = 0.5;

      const triggerLower = triggerPart.toLowerCase();
      for (const [pattern, info] of Object.entries(TRIGGER_PATTERNS)) {
        if (triggerLower.includes(pattern)) {
          triggerType = info.type;
          triggerEvent = info.event;
          triggerConfidence = info.confidence;
          break;
        }
      }

      // Find effect action
      let effectAction: EffectAction = 'display';
      let effectConfidence = 0.5;

      const effectLower = effectPart.toLowerCase();
      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (effectLower.includes(pattern)) {
          effectAction = info.action;
          effectConfidence = info.confidence;
          break;
        }
      }

      // Extract button name if present
      const buttonInfo = extractButtonName(triggerPart);

      // Extract value if present
      let effectValue: unknown;
      for (const [word, value] of Object.entries(VALUE_MAP)) {
        if (effectLower.includes(word)) {
          effectValue = value;
          break;
        }
      }

      const triggerStart = matchStart + fullMatch.indexOf(triggerPart);
      const effectStart = matchStart + fullMatch.indexOf(effectPart);

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-001', 0.9),
        category: 'functional' as IntentCategory,
        trigger: {
          type: triggerType,
          event: triggerEvent,
          target: buttonInfo?.name,
          provenance: createProvenance(source, triggerStart, triggerStart + triggerPart.length, 'RULE-001.trigger', triggerConfidence),
        },
        effect: {
          action: effectAction,
          value: effectValue,
          provenance: createProvenance(source, effectStart, effectStart + effectPart.length, 'RULE-001.effect', effectConfidence),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-001', Math.min(triggerConfidence, effectConfidence)),
      };
    },
  },

  // ============================================
  // RULE 2: "[Trigger] [action] [target]" pattern
  // ============================================
  {
    id: 'RULE-002',
    name: 'trigger-action-target',
    description: 'Matches "[button] click [action] [target]" patterns',
    pattern: /(\w+)\s+button\s+click\s+(\w+(?:es|s)?)\s+(\w+)(?:\s+by\s+(\w+))?/i,
    priority: 90,
    extract: (match, source, startOffset) => {
      const [fullMatch, buttonName, action, target, amount] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      const actionLower = action.toLowerCase();
      let effectAction: EffectAction = 'set';
      let actionConfidence = 0.5;

      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern) || pattern.includes(actionLower)) {
          effectAction = info.action;
          actionConfidence = info.confidence;
          break;
        }
      }

      // Parse amount
      let value: unknown;
      if (amount) {
        value = VALUE_MAP[amount.toLowerCase()] ?? parseInt(amount, 10) || amount;
      }

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-002', 0.85),
        category: 'functional' as IntentCategory,
        trigger: {
          type: 'click',
          target: buttonName.toLowerCase(),
          provenance: createProvenance(source, matchStart, matchStart + buttonName.length + ' button click'.length, 'RULE-002.trigger', 0.95),
        },
        effect: {
          action: effectAction,
          target: target.toLowerCase(),
          value,
          provenance: createProvenance(source, matchStart + fullMatch.indexOf(action), matchStart + fullMatch.length, 'RULE-002.effect', actionConfidence),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-002', 0.85),
      };
    },
  },

  // ============================================
  // RULE 3: "On [event], [action]" pattern
  // ============================================
  {
    id: 'RULE-003',
    name: 'on-event-action',
    description: 'Matches "On [lifecycle event], [action]" patterns',
    pattern: /on\s+(page\s+load|load|mount|start),?\s*(.+)/i,
    priority: 95,
    extract: (match, source, startOffset) => {
      const [fullMatch, event, actionPart] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      const eventLower = event.toLowerCase().trim();
      const lifecycleEvent = eventLower.replace(/\s+/g, '_');

      let effectAction: EffectAction = 'display';
      let effectConfidence = 0.5;

      const actionLower = actionPart.toLowerCase();
      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern)) {
          effectAction = info.action;
          effectConfidence = info.confidence;
          break;
        }
      }

      // Extract value
      let effectValue: unknown;
      for (const [word, value] of Object.entries(VALUE_MAP)) {
        if (actionLower.includes(word)) {
          effectValue = value;
          break;
        }
      }

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-003', 0.9),
        category: 'initialization' as IntentCategory,
        trigger: {
          type: 'lifecycle',
          event: lifecycleEvent,
          provenance: createProvenance(source, matchStart, matchStart + 3 + event.length, 'RULE-003.trigger', 1.0),
        },
        effect: {
          action: effectAction,
          value: effectValue,
          provenance: createProvenance(source, matchStart + fullMatch.indexOf(actionPart), matchStart + fullMatch.length, 'RULE-003.effect', effectConfidence),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-003', 0.9),
      };
    },
  },

  // ============================================
  // RULE 4: Constraint pattern "[target] cannot/must not [condition]"
  // ============================================
  {
    id: 'RULE-004',
    name: 'constraint',
    description: 'Matches constraint patterns like "[X] cannot [Y]"',
    pattern: /(\w+)\s+(?:cannot|must\s+not|should\s+not|never)\s+(?:be\s+)?(\w+)/i,
    priority: 80,
    extract: (match, source, startOffset) => {
      const [fullMatch, target, constraint] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-004', 0.85),
        category: 'constraint' as IntentCategory,
        state: {
          name: target.toLowerCase(),
          provenance: createProvenance(source, matchStart, matchStart + target.length, 'RULE-004.state', 0.9),
        },
        outcome: {
          description: `${target} is never ${constraint}`,
          type: 'validation',
          verifiable: true,
          verificationMethod: `Assert ${target} is not ${constraint}`,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-004.outcome', 0.85),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-004', 0.85),
      };
    },
  },

  // ============================================
  // RULE 5: Conditional "[if/when] [condition], [action]"
  // ============================================
  {
    id: 'RULE-005',
    name: 'conditional',
    description: 'Matches conditional patterns',
    pattern: /if\s+(\w+)\s+(?:is\s+)?(?:equal\s+to\s+|equals?\s+|at\s+)?(\w+),?\s*(.+)/i,
    priority: 85,
    extract: (match, source, startOffset) => {
      const [fullMatch, target, condition, actionPart] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      const conditionValue = VALUE_MAP[condition.toLowerCase()] ?? condition;

      let effectAction: EffectAction = 'set';
      let effectConfidence = 0.5;

      const actionLower = actionPart.toLowerCase();
      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern)) {
          effectAction = info.action;
          effectConfidence = info.confidence;
          break;
        }
      }

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-005', 0.8),
        category: 'functional' as IntentCategory,
        trigger: {
          type: 'change',
          condition: `${target} equals ${conditionValue}`,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.indexOf(actionPart), 'RULE-005.trigger', 0.85),
        },
        effect: {
          action: effectAction,
          provenance: createProvenance(source, matchStart + fullMatch.indexOf(actionPart), matchStart + fullMatch.length, 'RULE-005.effect', effectConfidence),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-005', 0.8),
      };
    },
  },

  // ============================================
  // RULE 6: Simple "[subject] [verb] [object]" pattern
  // ============================================
  {
    id: 'RULE-006',
    name: 'subject-verb-object',
    description: 'Matches simple SVO patterns',
    pattern: /(\w+)\s+(displays?|shows?|renders?|contains?)\s+(.+)/i,
    priority: 70,
    extract: (match, source, startOffset) => {
      const [fullMatch, subject, verb, object] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      return {
        requirement: fullMatch,
        requirementProvenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-006', 0.75),
        category: 'functional' as IntentCategory,
        state: {
          name: subject.toLowerCase(),
          provenance: createProvenance(source, matchStart, matchStart + subject.length, 'RULE-006.state', 0.8),
        },
        outcome: {
          description: `${subject} ${verb} ${object}`,
          type: 'display',
          verifiable: true,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-006.outcome', 0.75),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-006', 0.75),
      };
    },
  },
];

// Sort rules by priority (highest first)
PATTERN_RULES.sort((a, b) => b.priority - a.priority);

export default PATTERN_RULES;
