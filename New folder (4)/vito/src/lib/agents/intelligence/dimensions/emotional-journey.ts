/**
 * EMOTIONAL JOURNEY ANALYZER
 *
 * Great conversion copy doesn't just inform - it takes readers on an emotional ride.
 *
 * The Ideal Emotional Arc:
 * 1. CURIOSITY → "What's this?"
 * 2. RECOGNITION → "That's me!"
 * 3. PAIN → "Ugh, this sucks"
 * 4. HOPE → "Wait, there might be a way..."
 * 5. DESIRE → "I want this!"
 * 6. TRUST → "These people seem legit"
 * 7. URGENCY → "I need to act now"
 * 8. CONFIDENCE → "I'm making the right choice"
 *
 * This analyzer tracks emotional states through content
 * and identifies where the journey breaks down.
 */

import type { DimensionScore, ScoringIssue, Suggestion, EmotionalState } from '../types';

// ============================================================================
// EMOTIONAL MARKERS
// ============================================================================

interface EmotionalMarker {
  state: EmotionalState;
  patterns: RegExp[];
  weight: number;        // Intensity multiplier
  valence: 'positive' | 'negative' | 'neutral';
}

const EMOTIONAL_MARKERS: EmotionalMarker[] = [
  // Curiosity triggers
  {
    state: 'curious',
    patterns: [
      /\?/g,
      /(what if|imagine|discover|secret|hidden|revealed|truth|surprising)/gi,
      /(have you ever|did you know|here's something)/gi,
      /(the \w+ (nobody|no one|few people) (knows?|talks? about))/gi,
    ],
    weight: 1.0,
    valence: 'positive',
  },

  // Skeptical triggers (negative - need to address)
  {
    state: 'skeptical',
    patterns: [
      /(sounds too good|skeptical|doubt|hard to believe|really\?)/gi,
      /(scam|fake|lie|trick|gimmick)/gi,
      /(but does it|will it actually|is this legit)/gi,
    ],
    weight: 0.8,
    valence: 'negative',
  },

  // Excited triggers
  {
    state: 'excited',
    patterns: [
      /(amazing|incredible|awesome|fantastic|unbelievable|wow|breakthrough)/gi,
      /(!{2,}|!!)/g,
      /(finally|at last|game-?changer|revolutionary|transform)/gi,
      /(free|bonus|extra|exclusive|limited)/gi,
    ],
    weight: 1.2,
    valence: 'positive',
  },

  // Anxious triggers
  {
    state: 'anxious',
    patterns: [
      /(worried|nervous|scared|afraid|anxious|uncertain|unsure)/gi,
      /(what if (it|i|you) (fail|don't|can't|won't))/gi,
      /(risk|danger|threat|problem|issue|concern)/gi,
    ],
    weight: 0.9,
    valence: 'negative',
  },

  // Frustrated triggers
  {
    state: 'frustrated',
    patterns: [
      /(frustrated|annoyed|angry|fed up|sick of|tired of)/gi,
      /(nothing works|tried everything|wasted|failed|stuck)/gi,
      /(why (won't|can't|doesn't|isn't)|ugh|argh)/gi,
    ],
    weight: 1.1,
    valence: 'negative',
  },

  // Hopeful triggers
  {
    state: 'hopeful',
    patterns: [
      /(hope|hopeful|possible|maybe|could|might|potential)/gi,
      /(imagine|picture|dream|vision|future)/gi,
      /(there('s| is) a (way|solution|answer|hope))/gi,
      /(what if you could|you (can|could|might))/gi,
    ],
    weight: 1.0,
    valence: 'positive',
  },

  // Fearful triggers (FOMO, loss aversion)
  {
    state: 'fearful',
    patterns: [
      /(miss|lose|losing|lost|gone forever|never again)/gi,
      /(limited|only \d+|expires|deadline|last chance|final)/gi,
      /(don't (miss|let|wait)|before it's too late)/gi,
      /(without this|if you don't|competitors are)/gi,
    ],
    weight: 1.3, // Fear is powerful
    valence: 'negative',
  },

  // Confident triggers
  {
    state: 'confident',
    patterns: [
      /(guarantee|proven|tested|verified|backed|certified)/gi,
      /(money-?back|risk-?free|no risk|refund|cancel anytime)/gi,
      /(\d+[,\d]*\+? (customers|users|clients|people|reviews))/gi,
      /(award|recognized|featured|trusted by)/gi,
    ],
    weight: 1.1,
    valence: 'positive',
  },
];

// ============================================================================
// IDEAL EMOTIONAL JOURNEY
// ============================================================================

interface JourneyStage {
  stage: number;
  emotion: EmotionalState;
  required: boolean;
  description: string;
}

const IDEAL_JOURNEY: JourneyStage[] = [
  { stage: 1, emotion: 'curious', required: true, description: 'Hook them with curiosity' },
  { stage: 2, emotion: 'frustrated', required: true, description: 'Make them feel the pain' },
  { stage: 3, emotion: 'hopeful', required: true, description: 'Show there\'s a way out' },
  { stage: 4, emotion: 'excited', required: true, description: 'Build desire for solution' },
  { stage: 5, emotion: 'skeptical', required: false, description: 'Address doubts proactively' },
  { stage: 6, emotion: 'confident', required: true, description: 'Build trust with proof' },
  { stage: 7, emotion: 'fearful', required: false, description: 'Create urgency (FOMO)' },
  { stage: 8, emotion: 'confident', required: true, description: 'Final reassurance for action' },
];

// ============================================================================
// ANALYZER
// ============================================================================

export interface EmotionalJourneyResult extends DimensionScore {
  /** Emotional intensity map through content */
  intensityMap: { position: number; emotion: EmotionalState; intensity: number }[];

  /** The detected emotional arc */
  detectedArc: EmotionalState[];

  /** Is the arc well-formed? */
  hasProperArc: boolean;

  /** Emotional momentum (positive = building toward action) */
  momentum: number;
}

export function analyzeEmotionalJourney(content: string): EmotionalJourneyResult {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const totalSentences = sentences.length;

  // Map emotions through the content
  const intensityMap: { position: number; emotion: EmotionalState; intensity: number }[] = [];
  const detectedArc: EmotionalState[] = [];

  let lastDominantEmotion: EmotionalState | null = null;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const position = i / totalSentences;

    // Detect emotions in this sentence
    const emotionScores: Partial<Record<EmotionalState, number>> = {};

    for (const marker of EMOTIONAL_MARKERS) {
      let matchCount = 0;
      for (const pattern of marker.patterns) {
        const matches = sentence.match(pattern);
        if (matches) matchCount += matches.length;
      }
      if (matchCount > 0) {
        const score = matchCount * marker.weight;
        emotionScores[marker.state] = (emotionScores[marker.state] || 0) + score;
      }
    }

    // Find dominant emotion
    const dominantEntry = Object.entries(emotionScores).sort((a, b) => b[1] - a[1])[0];
    if (dominantEntry) {
      const [emotion, intensity] = dominantEntry as [EmotionalState, number];
      intensityMap.push({ position, emotion, intensity });

      if (emotion !== lastDominantEmotion) {
        detectedArc.push(emotion);
        lastDominantEmotion = emotion;
      }
    }
  }

  // Analyze the arc
  const arcAnalysis = analyzeArc(detectedArc);

  // Calculate score
  let score = 100;
  const issues: ScoringIssue[] = [];
  const suggestions: Suggestion[] = [];
  const evidence: string[] = [];

  // Check for required emotional stages
  const requiredEmotions = IDEAL_JOURNEY.filter(j => j.required).map(j => j.emotion);
  const uniqueRequired = [...new Set(requiredEmotions)];
  const presentEmotions = new Set(detectedArc);

  for (const required of uniqueRequired) {
    if (!presentEmotions.has(required)) {
      score -= 12;
      const stage = IDEAL_JOURNEY.find(j => j.emotion === required);
      issues.push({
        severity: 'major',
        description: `Missing "${required}" emotional beat`,
        impact: stage?.description || `Without "${required}", the emotional journey is incomplete`,
      });
      suggestions.push({
        type: 'add',
        suggested: getEmotionalTemplate(required),
        predictedLift: 10,
        confidence: 0.75,
        rationale: `Adding "${required}" content will strengthen the emotional arc`,
      });
    }
  }

  // Check emotional flow
  if (!arcAnalysis.hasNegativeBeforePositive) {
    score -= 15;
    issues.push({
      severity: 'major',
      description: 'No pain-to-pleasure arc detected',
      impact: 'Starting with benefits without establishing pain reduces emotional impact by 40%',
    });
    suggestions.push({
      type: 'restructure',
      suggested: 'Add problem/frustration content BEFORE presenting the solution',
      predictedLift: 15,
      confidence: 0.85,
      rationale: 'Pain → Relief creates stronger emotional contrast and desire',
    });
  }

  // Check for emotional peaks
  if (!arcAnalysis.hasEmotionalPeak) {
    score -= 8;
    issues.push({
      severity: 'minor',
      description: 'No clear emotional peak',
      impact: 'Flat emotional content is forgettable',
    });
    suggestions.push({
      type: 'add',
      suggested: 'Add a "breakthrough moment" - the point where hope becomes certainty',
      predictedLift: 8,
      confidence: 0.7,
      rationale: 'Emotional peaks create memorable moments that drive action',
    });
  }

  // Check for emotional whiplash (too many rapid changes)
  if (arcAnalysis.hasWhiplash) {
    score -= 10;
    issues.push({
      severity: 'minor',
      description: 'Emotional whiplash detected',
      impact: 'Rapid emotional shifts confuse and exhaust readers',
    });
    suggestions.push({
      type: 'restructure',
      suggested: 'Smooth out emotional transitions - each section should have one dominant emotion',
      predictedLift: 7,
      confidence: 0.7,
      rationale: 'Controlled emotional pacing builds stronger response',
    });
  }

  // Check for resolution (ends on positive)
  if (!arcAnalysis.endsPositive) {
    score -= 10;
    issues.push({
      severity: 'major',
      description: 'Does not end on confident/positive note',
      impact: 'Ending on negative emotion reduces conversion by up to 25%',
    });
    suggestions.push({
      type: 'rewrite',
      suggested: 'End with confidence-building content: guarantee, social proof, or reassurance',
      predictedLift: 12,
      confidence: 0.8,
      rationale: 'Readers need to feel confident at the moment of decision',
    });
  }

  // Bonus for strong emotional variety
  if (presentEmotions.size >= 4) {
    score += 5;
    evidence.push(`Good emotional variety: ${Array.from(presentEmotions).join(', ')}`);
  }

  // Calculate momentum (are we building toward action?)
  const momentum = calculateMomentum(intensityMap);

  // Bonus for positive momentum
  if (momentum > 0.3) {
    score += 3;
    evidence.push('Positive emotional momentum toward action');
  } else if (momentum < -0.1) {
    score -= 5;
    issues.push({
      severity: 'minor',
      description: 'Negative emotional momentum',
      impact: 'Content loses energy toward the end, reducing conversion',
    });
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence
  const confidence = Math.min(0.9, 0.4 + (intensityMap.length / 30) * 0.3 + (presentEmotions.size / 6) * 0.2);

  return {
    score,
    confidence,
    issues,
    suggestions,
    evidence,
    intensityMap,
    detectedArc,
    hasProperArc: arcAnalysis.hasNegativeBeforePositive && arcAnalysis.endsPositive,
    momentum,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface ArcAnalysis {
  hasNegativeBeforePositive: boolean;
  hasEmotionalPeak: boolean;
  hasWhiplash: boolean;
  endsPositive: boolean;
}

function analyzeArc(arc: EmotionalState[]): ArcAnalysis {
  const negativeEmotions: EmotionalState[] = ['frustrated', 'anxious', 'fearful', 'skeptical'];
  const positiveEmotions: EmotionalState[] = ['hopeful', 'excited', 'confident', 'curious'];

  // Check for negative before positive (pain-to-pleasure arc)
  let firstNegativeIndex = -1;
  let firstPositiveAfterNegative = -1;

  for (let i = 0; i < arc.length; i++) {
    if (negativeEmotions.includes(arc[i]) && firstNegativeIndex === -1) {
      firstNegativeIndex = i;
    }
    if (positiveEmotions.includes(arc[i]) && firstNegativeIndex !== -1 && firstPositiveAfterNegative === -1) {
      firstPositiveAfterNegative = i;
    }
  }

  const hasNegativeBeforePositive = firstNegativeIndex !== -1 && firstPositiveAfterNegative > firstNegativeIndex;

  // Check for emotional peak (high intensity moment)
  const hasEmotionalPeak = arc.includes('excited') || (arc.includes('hopeful') && arc.includes('confident'));

  // Check for whiplash (too many rapid changes)
  let changes = 0;
  for (let i = 1; i < arc.length; i++) {
    const prev = EMOTIONAL_MARKERS.find(m => m.state === arc[i - 1]);
    const curr = EMOTIONAL_MARKERS.find(m => m.state === arc[i]);
    if (prev && curr && prev.valence !== curr.valence) {
      changes++;
    }
  }
  const hasWhiplash = changes > arc.length * 0.5 && changes > 3;

  // Check if ends positive
  const lastEmotion = arc[arc.length - 1];
  const endsPositive = positiveEmotions.includes(lastEmotion);

  return { hasNegativeBeforePositive, hasEmotionalPeak, hasWhiplash, endsPositive };
}

function calculateMomentum(
  intensityMap: { position: number; emotion: EmotionalState; intensity: number }[]
): number {
  if (intensityMap.length < 2) return 0;

  // Calculate weighted emotional valence over time
  let momentum = 0;
  const positiveEmotions: EmotionalState[] = ['hopeful', 'excited', 'confident', 'curious'];

  for (let i = 1; i < intensityMap.length; i++) {
    const prev = intensityMap[i - 1];
    const curr = intensityMap[i];

    const prevValence = positiveEmotions.includes(prev.emotion) ? 1 : -1;
    const currValence = positiveEmotions.includes(curr.emotion) ? 1 : -1;

    // Weight later emotions more heavily
    const weight = curr.position;
    momentum += (currValence - prevValence) * weight * curr.intensity;
  }

  return momentum / intensityMap.length;
}

function getEmotionalTemplate(emotion: EmotionalState): string {
  const templates: Record<EmotionalState, string> = {
    curious: 'Start with a surprising question or counterintuitive statement',
    skeptical: 'Address objections: "You might be thinking..."',
    excited: 'Paint the dream state: "Imagine waking up and..."',
    anxious: 'Acknowledge concerns and provide reassurance',
    frustrated: 'Describe the pain: "You\'ve tried everything..."',
    hopeful: 'Introduce possibility: "But there\'s another way..."',
    fearful: 'Add urgency: "This offer expires..."',
    confident: 'Add proof: guarantees, testimonials, credentials',
  };
  return templates[emotion] || `Add content that evokes "${emotion}"`;
}
