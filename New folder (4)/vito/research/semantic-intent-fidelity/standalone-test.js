/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Standalone test for the provenance parser.
 * Self-contained JavaScript - no TypeScript compilation needed.
 *
 * Run with: node research/semantic-intent-fidelity/standalone-test.js
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

const crypto = require('crypto');

// ============================================
// PARSER VERSION
// ============================================

const PARSER_VERSION = '1.0.0-research';

// ============================================
// HELPER FUNCTIONS
// ============================================

function computeHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function createSpan(source, start, end) {
  const text = source.substring(start, end);
  const beforeText = source.substring(0, start);
  const lines = beforeText.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { start, end, text, line, column };
}

function createProvenance(source, start, end, rule, confidence) {
  return {
    source: 'input',
    span: createSpan(source, start, end),
    rule,
    confidence,
  };
}

// ============================================
// PATTERN DEFINITIONS
// ============================================

const TRIGGER_PATTERNS = {
  'page load': { type: 'lifecycle', event: 'page_load', confidence: 1.0 },
  'on load': { type: 'lifecycle', event: 'page_load', confidence: 1.0 },
  'click': { type: 'click', confidence: 1.0 },
  'clicks': { type: 'click', confidence: 1.0 },
};

const EFFECT_PATTERNS = {
  'set': { action: 'set', confidence: 1.0 },
  'sets': { action: 'set', confidence: 1.0 },
  'reset': { action: 'set', confidence: 0.95 },
  'resets': { action: 'set', confidence: 0.95 },
  'increase': { action: 'increment', confidence: 1.0 },
  'increases': { action: 'increment', confidence: 1.0 },
  'decrease': { action: 'decrement', confidence: 1.0 },
  'decreases': { action: 'decrement', confidence: 1.0 },
  'display': { action: 'display', confidence: 1.0 },
  'displays': { action: 'display', confidence: 1.0 },
};

const VALUE_MAP = {
  'zero': 0,
  '0': 0,
  'one': 1,
  '1': 1,
};

// ============================================
// PATTERN RULES
// ============================================

const PATTERN_RULES = [
  // Rule 1: "On [event], [action]"
  {
    id: 'RULE-003',
    pattern: /on\s+(page\s+load|load|mount|start),?\s*(.+)/i,
    priority: 95,
    extract: (match, source, startOffset) => {
      const [fullMatch, event, actionPart] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);
      const lifecycleEvent = event.toLowerCase().trim().replace(/\s+/g, '_');

      let effectAction = 'display';
      let effectConfidence = 0.5;
      const actionLower = actionPart.toLowerCase();

      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern)) {
          effectAction = info.action;
          effectConfidence = info.confidence;
          break;
        }
      }

      let effectValue;
      for (const [word, value] of Object.entries(VALUE_MAP)) {
        if (actionLower.includes(word)) {
          effectValue = value;
          break;
        }
      }

      return {
        requirement: fullMatch,
        category: 'initialization',
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

  // Rule 2: "[button] button click [action] [target]"
  {
    id: 'RULE-002',
    pattern: /(\w+)\s+button\s+click\s+(\w+(?:es|s)?)\s+(\w+)(?:\s+by\s+(\w+))?/i,
    priority: 90,
    extract: (match, source, startOffset) => {
      const [fullMatch, buttonName, action, target, amount] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      let effectAction = 'set';
      let actionConfidence = 0.5;
      const actionLower = action.toLowerCase();

      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern) || pattern.includes(actionLower)) {
          effectAction = info.action;
          actionConfidence = info.confidence;
          break;
        }
      }

      let value;
      if (amount) {
        value = VALUE_MAP[amount.toLowerCase()] !== undefined ? VALUE_MAP[amount.toLowerCase()] : (parseInt(amount, 10) || amount);
      }

      return {
        requirement: fullMatch,
        category: 'functional',
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

  // Rule 3: "[button] button click [action] [target] to [value]"
  {
    id: 'RULE-007',
    pattern: /(\w+)\s+button\s+click\s+(\w+(?:es|s)?)\s+(\w+)\s+to\s+(\w+)/i,
    priority: 92,
    extract: (match, source, startOffset) => {
      const [fullMatch, buttonName, action, target, toValue] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      let effectAction = 'set';
      const actionLower = action.toLowerCase();

      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern) || pattern.includes(actionLower)) {
          effectAction = info.action;
          break;
        }
      }

      const value = VALUE_MAP[toValue.toLowerCase()] !== undefined ? VALUE_MAP[toValue.toLowerCase()] : toValue;

      return {
        requirement: fullMatch,
        category: 'functional',
        trigger: {
          type: 'click',
          target: buttonName.toLowerCase(),
          provenance: createProvenance(source, matchStart, matchStart + buttonName.length + ' button click'.length, 'RULE-007.trigger', 0.95),
        },
        effect: {
          action: effectAction,
          target: target.toLowerCase(),
          value,
          provenance: createProvenance(source, matchStart + fullMatch.indexOf(action), matchStart + fullMatch.length, 'RULE-007.effect', 0.9),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-007', 0.9),
      };
    },
  },

  // Rule 4: Conditional "[button] button click does nothing if [condition]"
  {
    id: 'RULE-008',
    pattern: /(\w+)\s+button\s+click\s+does\s+nothing\s+if\s+(\w+)\s+(?:is\s+)?(?:at\s+)?(\w+)/i,
    priority: 88,
    extract: (match, source, startOffset) => {
      const [fullMatch, buttonName, target, condition] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      const conditionValue = VALUE_MAP[condition.toLowerCase()] !== undefined ? VALUE_MAP[condition.toLowerCase()] : condition;

      return {
        requirement: fullMatch,
        category: 'constraint',
        trigger: {
          type: 'click',
          target: buttonName.toLowerCase(),
          condition: `${target} is ${conditionValue}`,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-008.trigger', 0.9),
        },
        effect: {
          action: 'set',
          target: target.toLowerCase(),
          value: conditionValue,  // maintains current value
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-008.effect', 0.85),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-008', 0.85),
      };
    },
  },

  // Rule 5: Conditional with "if [target] above/below [value]"
  {
    id: 'RULE-009',
    pattern: /(\w+)\s+button\s+click\s+(\w+(?:es|s)?)\s+(\w+)\s+by\s+(\w+)\s+if\s+(\w+)\s+(above|below|greater|less)/i,
    priority: 87,
    extract: (match, source, startOffset) => {
      const [fullMatch, buttonName, action, target, amount, condTarget, condOp] = match;
      const matchStart = source.indexOf(fullMatch, startOffset);

      let effectAction = 'set';
      const actionLower = action.toLowerCase();

      for (const [pattern, info] of Object.entries(EFFECT_PATTERNS)) {
        if (actionLower.includes(pattern) || pattern.includes(actionLower)) {
          effectAction = info.action;
          break;
        }
      }

      const value = VALUE_MAP[amount.toLowerCase()] !== undefined ? VALUE_MAP[amount.toLowerCase()] : (parseInt(amount, 10) || amount);

      return {
        requirement: fullMatch,
        category: 'functional',
        trigger: {
          type: 'click',
          target: buttonName.toLowerCase(),
          condition: `${condTarget} ${condOp} zero`,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-009.trigger', 0.85),
        },
        effect: {
          action: effectAction,
          target: target.toLowerCase(),
          value,
          provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-009.effect', 0.85),
        },
        provenance: createProvenance(source, matchStart, matchStart + fullMatch.length, 'RULE-009', 0.85),
      };
    },
  },
];

// Sort by priority
PATTERN_RULES.sort((a, b) => b.priority - a.priority);

// ============================================
// PARSER
// ============================================

function splitIntoSentences(text) {
  const sentences = [];
  const lines = text.split('\n');
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      if (trimmed.endsWith(':') && trimmed.length < 30) {
        offset += line.length + 1;
        continue;
      }
      const start = text.indexOf(trimmed, offset);
      sentences.push({ text: trimmed, start, end: start + trimmed.length });
    }
    offset += line.length + 1;
  }

  return sentences;
}

function inferPriority(text) {
  const lower = text.toLowerCase();
  if (lower.includes('critical') || lower.includes('must')) return 'critical';
  if (lower.includes('important') || lower.includes('should')) return 'high';
  if (lower.includes('optional') || lower.includes('may')) return 'low';
  return 'medium';
}

function inferCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('load') || lower.includes('initial')) return 'initialization';
  if (lower.includes('cannot') || lower.includes('must not') || lower.includes('nothing')) return 'constraint';
  if (lower.includes('navigate')) return 'navigation';
  return 'functional';
}

function parseWithProvenance(sourceText) {
  const intents = [];
  let intentCounter = 0;

  const sentences = splitIntoSentences(sourceText);

  for (const sentence of sentences) {
    let matched = false;

    for (const rule of PATTERN_RULES) {
      const match = sentence.text.match(rule.pattern);

      if (match) {
        const extracted = rule.extract(match, sourceText, sentence.start);

        if (extracted) {
          intentCounter++;
          const intentId = `INT-${String(intentCounter).padStart(3, '0')}`;

          const intent = {
            id: intentId,
            requirement: extracted.requirement || sentence.text,
            requirementProvenance: extracted.provenance || createProvenance(sourceText, sentence.start, sentence.end, rule.id, 0.8),
            priority: inferPriority(sentence.text),
            category: extracted.category || inferCategory(sentence.text),
            trigger: extracted.trigger,
            state: extracted.state,
            effect: extracted.effect,
            outcome: extracted.outcome,
            provenance: extracted.provenance || createProvenance(sourceText, sentence.start, sentence.end, rule.id, 0.8),
            derivationChain: [{ step: 1, rule: rule.id, input: sentence.text, output: extracted.requirement || sentence.text }],
          };

          intents.push(intent);
          matched = true;
          break;
        }
      }
    }

    // Fallback for unmatched but intent-like sentences
    if (!matched && sentence.text.length > 10) {
      const looksLikeIntent = /\b(click|display|show|when|on|if|button|increases?|decreases?|sets?|resets?)\b/i.test(sentence.text);

      if (looksLikeIntent) {
        intentCounter++;
        const intentId = `INT-${String(intentCounter).padStart(3, '0')}`;

        intents.push({
          id: intentId,
          requirement: sentence.text,
          requirementProvenance: createProvenance(sourceText, sentence.start, sentence.end, 'RULE-FALLBACK', 0.5),
          priority: inferPriority(sentence.text),
          category: inferCategory(sentence.text),
          provenance: createProvenance(sourceText, sentence.start, sentence.end, 'RULE-FALLBACK', 0.5),
          derivationChain: [{ step: 1, rule: 'RULE-FALLBACK', input: sentence.text, output: sentence.text }],
        });
      }
    }
  }

  // Phantom detection
  const phantoms = [];
  const resultJson = JSON.stringify(intents).toLowerCase();

  const phantomPatterns = ['onlink', 'initiallink', 'thes', 'pointss', 'withoutlink', 'mitigation', 'review points', 'acrosslink', 'nolink'];
  for (const pattern of phantomPatterns) {
    if (resultJson.includes(pattern)) {
      phantoms.push({ element: pattern, reason: 'Phantom pattern detected' });
    }
  }

  // Calculate coverage
  let coveredChars = 0;
  for (const intent of intents) {
    if (intent.provenance && intent.provenance.span) {
      coveredChars += intent.provenance.span.end - intent.provenance.span.start;
    }
  }

  return {
    version: '1.0',
    parserVersion: PARSER_VERSION,
    sourceHash: computeHash(sourceText),
    sourceText,
    parsedAt: new Date().toISOString(),
    intents,
    phantomCheck: {
      passed: phantoms.length === 0,
      phantomCount: phantoms.length,
      phantoms,
    },
    coverage: {
      sourceCharsCovered: coveredChars,
      sourceTotalChars: sourceText.length,
      coveragePercent: sourceText.length > 0 ? (coveredChars / sourceText.length) * 100 : 0,
      uncoveredSpans: [],
    },
  };
}

// ============================================
// TEST RUNNER
// ============================================

const OAT2_DESCRIPTION = `Counter web application.

Intent 1: On page load, display counter at zero.

Intent 2: Plus button click increases counter by one.

Intent 3: Minus button click decreases counter by one if counter above zero.

Intent 4: Minus button click does nothing if counter is zero.

Intent 5: Clear button click sets counter to zero.`;

function runOAT2Test() {
  console.log('================================================================================');
  console.log('RESEARCH: semantic-intent-fidelity');
  console.log('PROVENANCE PARSER - OAT-2 TEST');
  console.log('================================================================================');
  console.log('');

  console.log('INPUT:');
  console.log('------');
  console.log(OAT2_DESCRIPTION);
  console.log('');

  const result = parseWithProvenance(OAT2_DESCRIPTION);

  console.log('PARSED INTENTS:');
  console.log('---------------');
  for (const intent of result.intents) {
    console.log(`[${intent.id}] ${intent.requirement}`);
    console.log(`  Category: ${intent.category}`);
    console.log(`  Priority: ${intent.priority}`);
    if (intent.trigger) {
      console.log(`  Trigger: ${intent.trigger.type}${intent.trigger.event ? ':' + intent.trigger.event : ''}${intent.trigger.target ? ' @ ' + intent.trigger.target : ''}`);
    }
    if (intent.effect) {
      console.log(`  Effect: ${intent.effect.action}${intent.effect.value !== undefined ? ' = ' + intent.effect.value : ''}${intent.effect.target ? ' -> ' + intent.effect.target : ''}`);
    }
    console.log('');
  }

  console.log('PHANTOM CHECK:');
  console.log('--------------');
  console.log(`  Status: ${result.phantomCheck.passed ? 'PASSED (no phantoms)' : 'FAILED'}`);
  console.log(`  Phantom Count: ${result.phantomCheck.phantomCount}`);
  if (result.phantomCheck.phantoms.length > 0) {
    for (const p of result.phantomCheck.phantoms) {
      console.log(`    - ${p.element}: ${p.reason}`);
    }
  }
  console.log('');

  console.log('COVERAGE:');
  console.log('---------');
  console.log(`  ${result.coverage.sourceCharsCovered}/${result.coverage.sourceTotalChars} chars (${result.coverage.coveragePercent.toFixed(1)}%)`);
  console.log('');

  console.log('SUMMARY:');
  console.log('--------');
  console.log(`  Intents Found: ${result.intents.length}`);
  console.log(`  Expected: 5`);
  console.log(`  Phantoms: ${result.phantomCheck.phantomCount}`);
  console.log(`  Expected: 0`);
  console.log('');

  const success = result.intents.length === 5 && result.phantomCheck.passed;
  console.log(`  OAT-2 PARSER TEST: ${success ? '✓ PASSED' : '✗ FAILED'}`);
  console.log('');
  console.log('================================================================================');

  return { success, result };
}

// Run the test
runOAT2Test();
