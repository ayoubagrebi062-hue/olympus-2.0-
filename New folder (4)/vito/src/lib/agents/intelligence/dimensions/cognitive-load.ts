/**
 * COGNITIVE LOAD ANALYZER
 *
 * Measures the mental effort required to process content.
 *
 * WHY THIS MATTERS:
 * - High cognitive load = readers give up
 * - Confused mind never buys
 * - Cognitive ease builds trust (fluency heuristic)
 *
 * THE SCIENCE:
 * - Working memory holds ~4 items at once
 * - Complex sentences exhaust processing capacity
 * - Visual scanning patterns affect comprehension
 * - Cognitive fluency increases perceived trustworthiness
 *
 * OPTIMAL LOAD BY FUNNEL STAGE:
 * - Awareness: VERY LOW (hook them fast)
 * - Interest: LOW (easy to scan)
 * - Consideration: MODERATE (some detail OK)
 * - Intent: LOW (don't complicate the decision)
 * - Purchase: VERY LOW (frictionless checkout)
 */

import type { DimensionScore, ScoringIssue, Suggestion, TextLocation, FunnelStage } from '../types';

// ============================================================================
// COGNITIVE METRICS
// ============================================================================

interface CognitiveMetrics {
  /** Flesch-Kincaid Grade Level (lower = easier) */
  gradeLevel: number;

  /** Average sentence length in words */
  avgSentenceLength: number;

  /** Average word length in syllables */
  avgSyllablesPerWord: number;

  /** Percentage of complex words (3+ syllables) */
  complexWordPercentage: number;

  /** Percentage of passive voice sentences */
  passiveVoicePercentage: number;

  /** Number of ideas per paragraph */
  ideasPerParagraph: number;

  /** Acronym/jargon density */
  jargonDensity: number;

  /** Nested clause depth (higher = harder) */
  maxClauseDepth: number;

  /** Working memory load estimate (1-10) */
  workingMemoryLoad: number;

  /** Visual scanning ease (whitespace, structure) */
  scanningEase: number;
}

// ============================================================================
// OPTIMAL RANGES
// ============================================================================

interface OptimalRange {
  min: number;
  ideal: number;
  max: number;
  weight: number;
}

const OPTIMAL_RANGES: Record<keyof CognitiveMetrics, OptimalRange> = {
  gradeLevel: { min: 4, ideal: 7, max: 10, weight: 0.20 },
  avgSentenceLength: { min: 8, ideal: 14, max: 20, weight: 0.15 },
  avgSyllablesPerWord: { min: 1.2, ideal: 1.5, max: 1.8, weight: 0.08 },
  complexWordPercentage: { min: 0, ideal: 10, max: 20, weight: 0.10 },
  passiveVoicePercentage: { min: 0, ideal: 5, max: 15, weight: 0.07 },
  ideasPerParagraph: { min: 1, ideal: 2, max: 3, weight: 0.08 },
  jargonDensity: { min: 0, ideal: 0, max: 3, weight: 0.17 },  // Increased weight, lower max
  maxClauseDepth: { min: 1, ideal: 2, max: 3, weight: 0.05 },
  workingMemoryLoad: { min: 1, ideal: 3, max: 5, weight: 0.05 },
  scanningEase: { min: 5, ideal: 8, max: 10, weight: 0.05 },
};

// ============================================================================
// COMPLEX PATTERNS
// ============================================================================

const JARGON_PATTERNS = [
  /\b(synerg\w*|leverag\w*|optimiz\w*|utiliz\w*|paradigm\w*|holistic|scalable|robust)\b/gi,
  /\b(actionable|deliverables|stakeholder|bandwidth|ecosystem|empower\w*)\b/gi,
  /\b(disruptive|innovative|cutting-?edge|state-?of-?the-?art|best-?in-?class)\b/gi,
  /\b(groundbreaking|revolutionary|unprecedented|comprehensive|methodolog\w*)\b/gi,
  /\b(conceptualiz\w*|operationaliz\w*|monetiz\w*|facilitat\w*|implement\w*ation)\b/gi,
  /\b(multifaceted|convergence|disparate|quantifiable|verticals)\b/gi,
  /\b[A-Z]{2,}\b/g, // Acronyms
];

const PASSIVE_VOICE_PATTERNS = [
  /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
  /\bby\s+(the|a|an)\s+\w+/gi,
];

const NESTED_CLAUSE_PATTERNS = [
  /,\s*which/gi,
  /,\s*that/gi,
  /,\s*who/gi,
  /\([^)]+\)/g, // Parenthetical
  /—[^—]+—/g,   // Em-dash parenthetical
];

// ============================================================================
// ANALYZER
// ============================================================================

export interface CognitiveLoadResult extends DimensionScore {
  metrics: CognitiveMetrics;
  problemSentences: { sentence: string; issues: string[] }[];
  optimalForStage: boolean;
}

export function analyzeCognitiveLoad(
  content: string,
  funnelStage: FunnelStage = 'interest'
): CognitiveLoadResult {
  // Calculate all metrics
  const metrics = calculateMetrics(content);

  // Adjust optimal ranges based on funnel stage
  const stageMultiplier = getStageMultiplier(funnelStage);

  // Score each metric
  let totalScore = 0;
  let totalWeight = 0;
  const issues: ScoringIssue[] = [];
  const suggestions: Suggestion[] = [];
  const evidence: string[] = [];

  for (const [key, range] of Object.entries(OPTIMAL_RANGES)) {
    const metricKey = key as keyof CognitiveMetrics;
    const value = metrics[metricKey];
    const adjustedMax = range.max * stageMultiplier;

    const metricScore = scoreMetric(value, range.min, range.ideal * stageMultiplier, adjustedMax);
    totalScore += metricScore * range.weight;
    totalWeight += range.weight;

    // Flag problematic metrics
    if (metricScore < 60) {
      const issue = getMetricIssue(metricKey, value, range, stageMultiplier);
      if (issue) {
        issues.push(issue);
        const suggestion = getMetricSuggestion(metricKey, value, range);
        if (suggestion) suggestions.push(suggestion);
      }
    }
  }

  // Find problem sentences
  const problemSentences = findProblemSentences(content);

  // Add specific sentence suggestions
  for (const ps of problemSentences.slice(0, 3)) {
    suggestions.push({
      type: 'rewrite',
      original: ps.sentence,
      suggested: `[Simplify: ${ps.issues.join(', ')}]`,
      predictedLift: 3,
      confidence: 0.7,
      rationale: 'Simpler sentences are easier to process and more persuasive',
    });
  }

  // Calculate final score (scoreMetric returns 0-100, weighted average is already 0-100)
  let score = Math.round(totalScore / totalWeight);

  // Bonus for good structure (headings, bullet points, short paragraphs)
  const structureBonus = evaluateStructure(content);
  score += structureBonus;

  // Penalty for very long unbroken text blocks
  const longBlockPenalty = evaluateLongBlocks(content);
  score -= longBlockPenalty;

  // Cap score
  score = Math.max(0, Math.min(100, score));

  // Determine if optimal for stage
  const optimalForStage = score >= 70;

  // Add evidence
  evidence.push(`Grade level: ${metrics.gradeLevel.toFixed(1)} (ideal: 6-8)`);
  evidence.push(`Avg sentence length: ${metrics.avgSentenceLength.toFixed(1)} words`);
  evidence.push(`Complex words: ${metrics.complexWordPercentage.toFixed(1)}%`);

  if (metrics.passiveVoicePercentage > 15) {
    evidence.push(`High passive voice: ${metrics.passiveVoicePercentage.toFixed(1)}%`);
  }

  // Calculate confidence
  const wordCount = content.split(/\s+/).length;
  const confidence = Math.min(0.9, 0.5 + (wordCount / 500) * 0.4);

  return {
    score,
    confidence,
    issues,
    suggestions,
    evidence,
    metrics,
    problemSentences,
    optimalForStage,
  };
}

// ============================================================================
// METRIC CALCULATIONS
// ============================================================================

function calculateMetrics(content: string): CognitiveMetrics {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  // Basic counts
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;

  // Syllable counting (approximation)
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  // Complex words (3+ syllables)
  const complexWords = words.filter(w => countSyllables(w) >= 3);

  // Flesch-Kincaid Grade Level
  const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);
  const avgSyllablesPerWord = totalSyllables / Math.max(wordCount, 1);
  const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Passive voice
  let passiveSentences = 0;
  for (const sentence of sentences) {
    for (const pattern of PASSIVE_VOICE_PATTERNS) {
      if (pattern.test(sentence)) {
        passiveSentences++;
        break;
      }
    }
  }

  // Jargon
  let jargonCount = 0;
  for (const pattern of JARGON_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) jargonCount += matches.length;
  }

  // Nested clauses
  let maxDepth = 0;
  for (const sentence of sentences) {
    let depth = 0;
    for (const pattern of NESTED_CLAUSE_PATTERNS) {
      const matches = sentence.match(pattern);
      if (matches) depth += matches.length;
    }
    maxDepth = Math.max(maxDepth, depth);
  }

  // Ideas per paragraph (approximation based on sentence count)
  const ideasPerParagraph = sentenceCount / Math.max(paragraphCount, 1);

  // Working memory load (combination of factors)
  const workingMemoryLoad = Math.min(10,
    (avgSentenceLength / 5) +
    (maxDepth * 1.5) +
    ((jargonCount / wordCount) * 100)
  );

  // Scanning ease
  const hasHeadings = /^#{1,3}\s|^[A-Z][^.]+:$/m.test(content);
  const hasBullets = /^[-*•]\s/m.test(content);
  const shortParagraphs = paragraphs.filter(p => p.split(/\s+/).length < 50).length / paragraphCount;
  const scanningEase = Math.min(10,
    (hasHeadings ? 3 : 0) +
    (hasBullets ? 2 : 0) +
    (shortParagraphs * 5)
  );

  return {
    gradeLevel: Math.max(0, gradeLevel),
    avgSentenceLength,
    avgSyllablesPerWord,
    complexWordPercentage: (complexWords.length / Math.max(wordCount, 1)) * 100,
    passiveVoicePercentage: (passiveSentences / Math.max(sentenceCount, 1)) * 100,
    ideasPerParagraph,
    jargonDensity: (jargonCount / Math.max(wordCount, 1)) * 100,
    maxClauseDepth: maxDepth,
    workingMemoryLoad,
    scanningEase,
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;

  // Approximation rules
  const vowels = 'aeiouy';
  let count = 0;
  let wasVowel = false;

  for (const char of word) {
    const isVowel = vowels.includes(char);
    if (isVowel && !wasVowel) count++;
    wasVowel = isVowel;
  }

  // Adjustments
  if (word.endsWith('e') && count > 1) count--;
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) count++;

  return Math.max(1, count);
}

function getStageMultiplier(stage: FunnelStage): number {
  const multipliers: Record<FunnelStage, number> = {
    awareness: 0.7,    // Very easy
    interest: 0.8,     // Easy
    consideration: 1.0, // Normal
    intent: 0.8,       // Easy
    purchase: 0.7,     // Very easy
    retention: 0.9,    // Fairly easy
    advocacy: 0.9,     // Fairly easy
  };
  return multipliers[stage] || 1.0;
}

function scoreMetric(value: number, min: number, ideal: number, max: number): number {
  if (value <= min) return 60; // Below min is problematic
  if (value >= max) return Math.max(0, 60 - (value - max) * 10); // Over max is bad

  if (value <= ideal) {
    // Between min and ideal - linearly scale from 60 to 100
    return 60 + ((value - min) / (ideal - min)) * 40;
  } else {
    // Between ideal and max - linearly scale from 100 to 60
    return 100 - ((value - ideal) / (max - ideal)) * 40;
  }
}

function getMetricIssue(
  metric: keyof CognitiveMetrics,
  value: number,
  range: OptimalRange,
  multiplier: number
): ScoringIssue | null {
  const descriptions: Record<keyof CognitiveMetrics, (v: number) => string> = {
    gradeLevel: (v) => `Reading level too high (grade ${v.toFixed(1)})`,
    avgSentenceLength: (v) => `Sentences too long (avg ${v.toFixed(1)} words)`,
    avgSyllablesPerWord: (v) => `Words too complex`,
    complexWordPercentage: (v) => `Too many complex words (${v.toFixed(0)}%)`,
    passiveVoicePercentage: (v) => `Too much passive voice (${v.toFixed(0)}%)`,
    ideasPerParagraph: (v) => `Paragraphs too dense (${v.toFixed(1)} ideas each)`,
    jargonDensity: (v) => `High jargon density`,
    maxClauseDepth: (v) => `Sentences too nested`,
    workingMemoryLoad: (v) => `High mental effort required`,
    scanningEase: (v) => `Hard to scan visually`,
  };

  const impacts: Record<keyof CognitiveMetrics, string> = {
    gradeLevel: 'Content above 8th grade level loses 50%+ of readers',
    avgSentenceLength: 'Long sentences exhaust working memory',
    avgSyllablesPerWord: 'Simpler words are processed faster and trusted more',
    complexWordPercentage: 'Complex words slow reading and reduce comprehension',
    passiveVoicePercentage: 'Passive voice is harder to process and less engaging',
    ideasPerParagraph: 'Too many ideas per paragraph overwhelms readers',
    jargonDensity: 'Jargon makes content feel inaccessible and corporate',
    maxClauseDepth: 'Nested clauses require readers to hold multiple ideas in memory',
    workingMemoryLoad: 'High cognitive load causes abandonment',
    scanningEase: 'Most readers scan before reading - make it easy',
  };

  return {
    severity: value > range.max * 1.5 ? 'critical' : 'major',
    description: descriptions[metric](value),
    impact: impacts[metric],
  };
}

function getMetricSuggestion(
  metric: keyof CognitiveMetrics,
  value: number,
  range: OptimalRange
): Suggestion {
  const suggestions: Record<keyof CognitiveMetrics, string> = {
    gradeLevel: 'Use shorter words and sentences. Target 6th-8th grade level.',
    avgSentenceLength: 'Break long sentences into shorter ones. Aim for 14-18 words.',
    avgSyllablesPerWord: 'Replace complex words with simpler alternatives.',
    complexWordPercentage: 'Use "use" instead of "utilize", "help" instead of "facilitate".',
    passiveVoicePercentage: 'Convert passive to active: "was sent by us" → "we sent".',
    ideasPerParagraph: 'One idea per paragraph. Use more line breaks.',
    jargonDensity: 'Remove jargon. Speak like a human, not a corporation.',
    maxClauseDepth: 'Flatten nested sentences. Remove "which", "that" where possible.',
    workingMemoryLoad: 'Simplify overall. Use lists, short paragraphs, clear structure.',
    scanningEase: 'Add headings, bullet points, bold key phrases.',
  };

  return {
    type: 'rewrite',
    suggested: suggestions[metric],
    predictedLift: 5 + Math.round((value - range.max) * 2),
    confidence: 0.75,
    rationale: `Reducing ${metric} improves comprehension and conversion`,
  };
}

function findProblemSentences(content: string): { sentence: string; issues: string[] }[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const problems: { sentence: string; issues: string[] }[] = [];

  for (const sentence of sentences) {
    const issues: string[] = [];
    const words = sentence.split(/\s+/);

    if (words.length > 25) issues.push('too long');
    if (PASSIVE_VOICE_PATTERNS.some(p => p.test(sentence))) issues.push('passive voice');
    if (JARGON_PATTERNS.some(p => p.test(sentence))) issues.push('contains jargon');
    if (NESTED_CLAUSE_PATTERNS.filter(p => p.test(sentence)).length >= 2) issues.push('too nested');

    if (issues.length > 0) {
      problems.push({ sentence: sentence.trim(), issues });
    }
  }

  return problems.sort((a, b) => b.issues.length - a.issues.length);
}

function evaluateStructure(content: string): number {
  let bonus = 0;
  if (/^#{1,3}\s/m.test(content)) bonus += 3; // Has headings
  if (/^[-*•]\s/m.test(content)) bonus += 2; // Has bullet points
  if (/\*\*[^*]+\*\*/m.test(content)) bonus += 1; // Has bold
  if (/\n\n/.test(content)) bonus += 2; // Has paragraph breaks
  return bonus;
}

function evaluateLongBlocks(content: string): number {
  const paragraphs = content.split(/\n\n+/);
  let penalty = 0;

  for (const para of paragraphs) {
    const wordCount = para.split(/\s+/).length;
    if (wordCount > 100) penalty += 5;
    else if (wordCount > 75) penalty += 3;
    else if (wordCount > 50) penalty += 1;
  }

  return Math.min(15, penalty);
}
