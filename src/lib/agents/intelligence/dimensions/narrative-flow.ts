/**
 * NARRATIVE FLOW ANALYZER
 *
 * Analyzes whether content follows a compelling story arc.
 * Great copy isn't a list of features - it's a JOURNEY.
 *
 * The 5-Act Story Structure for Conversion:
 * 1. HOOK - Grab attention, create curiosity
 * 2. PROBLEM - Agitate the pain, make them feel it
 * 3. BRIDGE - Show there's a way out
 * 4. SOLUTION - Present your offer as the answer
 * 5. CALL - Drive action with urgency
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type { DimensionScore, ScoringIssue, Suggestion, TextLocation } from '../types';

// ============================================================================
// STORY ARC PATTERNS
// ============================================================================

interface StoryBeat {
  name: string;
  required: boolean;
  position: 'early' | 'middle' | 'late' | 'any';
  weight: number;
  patterns: RegExp[];
  antiPatterns: RegExp[];
}

const STORY_BEATS: StoryBeat[] = [
  {
    name: 'hook',
    required: true,
    position: 'early',
    weight: 0.25,
    patterns: [
      /^(what if|imagine|picture|have you ever|tired of|finally|discover|the secret|warning|attention)/i,
      /\?$/, // Questions hook attention
      /^[A-Z][^.!?]*\.$/, // Short punchy opener
      /(breakthrough|revolutionary|game-?changing|never before|first time)/i,
    ],
    antiPatterns: [
      /^(we are|our company|since \d{4}|founded in)/i, // Boring company intro
      /^(welcome to|hello|hi there)/i, // Generic greeting
    ],
  },
  {
    name: 'problem',
    required: true,
    position: 'early',
    weight: 0.2,
    patterns: [
      /(struggling with|frustrated by|sick of|tired of|overwhelmed by)/i,
      /(the problem is|here's the thing|but here's the catch)/i,
      /(you've tried|nothing works|every time you|no matter what)/i,
      /(pain|frustrat|struggle|fail|stuck|lost|confus|stress|anxious|worry)/i,
      /(without|can't|won't|don't|isn't|aren't)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'agitation',
    required: false,
    position: 'early',
    weight: 0.1,
    patterns: [
      /(gets worse|even worse|not only that|and it doesn't stop there)/i,
      /(imagine losing|what happens when|the cost of|the price you pay)/i,
      /(every day|every week|every month|over time|year after year)/i,
      /(while you|as you|meanwhile)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'bridge',
    required: true,
    position: 'middle',
    weight: 0.15,
    patterns: [
      /(but what if|there is a better way|it doesn't have to be|imagine instead)/i,
      /(that's why|this is why|here's the good news|the solution|the answer)/i,
      /(introducing|meet|discover|presenting)/i,
      /(finally|at last|now you can)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'solution',
    required: true,
    position: 'middle',
    weight: 0.15,
    patterns: [
      /(you (will|can|get)|this (gives|provides|delivers|helps))/i,
      /(here's (how|what)|with [^,]+, you)/i,
      /(benefit|advantage|feature|include|comes with)/i,
      /(step \d|first,|then,|finally,|next,)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'proof',
    required: false,
    position: 'middle',
    weight: 0.05,
    patterns: [
      /(\d+[,\d]*\+? (customers|users|clients|people|businesses))/i,
      /(proven|tested|verified|backed by|research shows)/i,
      /(".*" - [A-Z]|★|⭐|testimonial)/i,
      /(case study|success story|results|outcome)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'urgency',
    required: false,
    position: 'late',
    weight: 0.05,
    patterns: [
      /(limited|only \d+|expires|deadline|ends|last chance|final)/i,
      /(today|now|right now|immediately|instant)/i,
      /(don't wait|act now|hurry|before it's too late)/i,
      /(spots left|seats remaining|stock running|while supplies)/i,
    ],
    antiPatterns: [],
  },
  {
    name: 'call_to_action',
    required: true,
    position: 'late',
    weight: 0.05,
    patterns: [
      /(get|grab|claim|start|join|try|download|sign up|register|subscribe|buy|order)/i,
      /(click|tap|press|hit the button)/i,
      /(free|no risk|guarantee|refund|cancel anytime)/i,
    ],
    antiPatterns: [
      /(learn more|click here|submit|send)/i, // Weak CTAs
    ],
  },
];

// ============================================================================
// TRANSITION QUALITY
// ============================================================================

interface Transition {
  from: string;
  to: string;
  patterns: RegExp[];
  quality: 'smooth' | 'adequate' | 'jarring';
}

const GOOD_TRANSITIONS: Transition[] = [
  {
    from: 'hook',
    to: 'problem',
    patterns: [
      /(but|however|the truth is|here's the thing|yet|unfortunately)/i,
      /(sound familiar|know the feeling|been there)/i,
    ],
    quality: 'smooth',
  },
  {
    from: 'problem',
    to: 'bridge',
    patterns: [
      /(but what if|there's a better way|it doesn't have to be|imagine if)/i,
      /(that's exactly why|this is why we|that's where)/i,
    ],
    quality: 'smooth',
  },
  {
    from: 'bridge',
    to: 'solution',
    patterns: [/(introducing|meet|here's|presenting|discover)/i, /(with \w+, you|using \w+, you)/i],
    quality: 'smooth',
  },
  {
    from: 'solution',
    to: 'call_to_action',
    patterns: [
      /(ready to|want to|start|get started|take the first step)/i,
      /(here's how to|to get started|all you need to do)/i,
    ],
    quality: 'smooth',
  },
];

// ============================================================================
// ANALYZER
// ============================================================================

export function analyzeNarrativeFlow(content: string): DimensionScore {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());

  // Detect story beats
  const detectedBeats = detectStoryBeats(content, paragraphs);

  // Check beat order
  const orderAnalysis = analyzeOrder(detectedBeats);

  // Check transitions
  const transitionAnalysis = analyzeTransitions(content, detectedBeats);

  // Calculate score
  let score = 100;
  const issues: ScoringIssue[] = [];
  const suggestions: Suggestion[] = [];
  const evidence: string[] = [];

  // Penalize missing required beats
  const requiredBeats = STORY_BEATS.filter(b => b.required);
  const missingRequired = requiredBeats.filter(b => !detectedBeats.some(d => d.beat === b.name));

  for (const missing of missingRequired) {
    score -= 20;
    issues.push({
      severity: 'critical',
      description: `Missing ${missing.name.toUpperCase()} beat`,
      impact: `Without a clear ${missing.name}, the narrative feels incomplete and conversion drops`,
    });
    suggestions.push({
      type: 'add',
      suggested: getTemplateForBeat(missing.name),
      predictedLift: 15,
      confidence: 0.8,
      rationale: `Adding a ${missing.name} section will complete the story arc`,
    });
  }

  // Penalize wrong order
  if (!orderAnalysis.isCorrect) {
    score -= 15;
    issues.push({
      severity: 'major',
      description: 'Story beats are out of order',
      impact:
        'Readers expect: Hook → Problem → Bridge → Solution → CTA. Breaking this confuses them.',
    });
    suggestions.push({
      type: 'restructure',
      suggested: `Reorder content: ${orderAnalysis.suggestedOrder.join(' → ')}`,
      predictedLift: 12,
      confidence: 0.75,
      rationale: 'Following the natural story arc increases engagement and conversion',
    });
    evidence.push(`Current order: ${orderAnalysis.currentOrder.join(' → ')}`);
  }

  // Penalize poor transitions
  if (transitionAnalysis.jarringTransitions > 0) {
    score -= transitionAnalysis.jarringTransitions * 5;
    issues.push({
      severity: 'minor',
      description: `${transitionAnalysis.jarringTransitions} jarring transition(s) found`,
      impact: 'Abrupt transitions break the reading flow and can lose readers',
    });
    for (const jarring of transitionAnalysis.jarringLocations) {
      suggestions.push({
        type: 'rewrite',
        location: jarring.location,
        original: jarring.text,
        suggested: jarring.suggestion,
        predictedLift: 3,
        confidence: 0.7,
        rationale: 'Smoother transitions keep readers engaged',
      });
    }
  }

  // Bonus for having optional beats
  const optionalBeats = STORY_BEATS.filter(b => !b.required);
  const presentOptional = optionalBeats.filter(b => detectedBeats.some(d => d.beat === b.name));
  score += presentOptional.length * 2;
  if (presentOptional.length > 0) {
    evidence.push(`Has optional beats: ${presentOptional.map(b => b.name).join(', ')}`);
  }

  // Bonus for strong opening
  if (
    detectedBeats.length > 0 &&
    detectedBeats[0].beat === 'hook' &&
    detectedBeats[0].strength > 0.8
  ) {
    score += 5;
    evidence.push('Strong opening hook detected');
  }

  // Penalize if too short to have a story
  if (sentences.length < 5) {
    score -= 10;
    issues.push({
      severity: 'minor',
      description: 'Content too short for full narrative arc',
      impact: 'Very short content may not have enough room to tell a complete story',
    });
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence based on content length and clarity
  const confidence = Math.min(
    0.95,
    0.5 + (sentences.length / 50) * 0.3 + (detectedBeats.length / STORY_BEATS.length) * 0.2
  );

  return {
    score,
    confidence,
    issues,
    suggestions,
    evidence,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface DetectedBeat {
  beat: string;
  position: number; // 0-1 where in the content
  strength: number; // How clearly it matches
  text: string; // The matching text
}

function detectStoryBeats(content: string, paragraphs: string[]): DetectedBeat[] {
  const detected: DetectedBeat[] = [];
  const totalLength = content.length;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const position = content.indexOf(para) / totalLength;

    for (const beat of STORY_BEATS) {
      // Check if position matches expected position
      let positionMatch = true;
      if (beat.position === 'early' && position > 0.4) positionMatch = false;
      if (beat.position === 'middle' && (position < 0.2 || position > 0.8)) positionMatch = false;
      if (beat.position === 'late' && position < 0.6) positionMatch = false;

      // Check patterns
      let patternMatches = 0;
      for (const pattern of beat.patterns) {
        if (pattern.test(para)) patternMatches++;
      }

      // Check anti-patterns
      let antiPatternMatches = 0;
      for (const antiPattern of beat.antiPatterns) {
        if (antiPattern.test(para)) antiPatternMatches++;
      }

      // Calculate strength
      if (patternMatches > 0 && antiPatternMatches === 0) {
        const strength = Math.min(
          1,
          (patternMatches / beat.patterns.length) * (positionMatch ? 1.2 : 0.7)
        );

        // Don't add duplicates
        if (!detected.some(d => d.beat === beat.name)) {
          detected.push({
            beat: beat.name,
            position,
            strength,
            text: para.slice(0, 100),
          });
        }
      }
    }
  }

  return detected.sort((a, b) => a.position - b.position);
}

function analyzeOrder(beats: DetectedBeat[]): {
  isCorrect: boolean;
  currentOrder: string[];
  suggestedOrder: string[];
} {
  const currentOrder = beats.map(b => b.beat);
  const idealOrder = [
    'hook',
    'problem',
    'agitation',
    'bridge',
    'solution',
    'proof',
    'urgency',
    'call_to_action',
  ];
  const suggestedOrder = idealOrder.filter(beat => currentOrder.includes(beat));

  // Check if current order matches ideal order
  let isCorrect = true;
  let idealIndex = 0;
  for (const beat of currentOrder) {
    const expectedIndex = idealOrder.indexOf(beat);
    if (expectedIndex < idealIndex) {
      isCorrect = false;
      break;
    }
    idealIndex = expectedIndex;
  }

  return { isCorrect, currentOrder, suggestedOrder };
}

function analyzeTransitions(
  content: string,
  beats: DetectedBeat[]
): {
  jarringTransitions: number;
  jarringLocations: { location: TextLocation; text: string; suggestion: string }[];
} {
  const jarringLocations: { location: TextLocation; text: string; suggestion: string }[] = [];

  for (let i = 0; i < beats.length - 1; i++) {
    const from = beats[i];
    const to = beats[i + 1];

    // Find the text between beats
    const fromIndex = content.indexOf(from.text);
    const toIndex = content.indexOf(to.text);
    const betweenText = content.slice(fromIndex + from.text.length, toIndex).trim();

    // Check if there's a good transition
    const transition = GOOD_TRANSITIONS.find(t => t.from === from.beat && t.to === to.beat);
    if (transition) {
      const hasGoodTransition = transition.patterns.some(
        p => p.test(betweenText) || p.test(to.text)
      );
      if (!hasGoodTransition && betweenText.length < 10) {
        jarringLocations.push({
          location: { startIndex: fromIndex + from.text.length, endIndex: toIndex },
          text: betweenText || '[no transition]',
          suggestion: getSuggestedTransition(from.beat, to.beat),
        });
      }
    }
  }

  return { jarringTransitions: jarringLocations.length, jarringLocations };
}

function getTemplateForBeat(beat: string): string {
  const templates: Record<string, string> = {
    hook: '"What if you could [achieve dream state] without [pain point]?"',
    problem:
      '"You\'ve tried [solution attempts]. Nothing seems to work. Every time you [action], you end up [negative outcome]..."',
    bridge: '"But here\'s the good news: It doesn\'t have to be this way."',
    solution: '"Introducing [Product]: The [adjective] way to [benefit]. Here\'s how it works..."',
    call_to_action: '"Start your [transformation] today. Click below to get instant access."',
  };
  return templates[beat] || `Add a ${beat} section`;
}

function getSuggestedTransition(from: string, to: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    hook: { problem: "But here's the thing..." },
    problem: { bridge: "It doesn't have to be this way." },
    bridge: { solution: "Here's how it works:" },
    solution: { call_to_action: 'Ready to get started?' },
  };
  return suggestions[from]?.[to] || 'Add a smooth transition here.';
}
