/**
 * CONVERSION QUALITY SCORING ENGINE
 *
 * Scores ALL conversion content before it passes to the next phase.
 * Ensures copy is conversion-optimized, reader-focused, and production-ready.
 *
 * @module quality/conversion-scorer
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Individual score with issues and suggestions
 */
export interface ScoreDetail {
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * WIIFM (What's In It For Me) score details
 */
export interface WIIFMScoreDetail extends ScoreDetail {
  paragraphsWithoutBenefit: number[];
  selfFocusedSentences: string[];
  featureFocusedPhrases: string[];
}

/**
 * Clarity score details
 */
export interface ClarityScoreDetail extends ScoreDetail {
  readingLevel: string;
  avgSentenceLength: number;
  avgParagraphSentences: number;
  complexWords: string[];
  jargonFound: string[];
}

/**
 * Emotional score details
 */
export interface EmotionalScoreDetail extends ScoreDetail {
  powerWordsFound: string[];
  powerWordCount: number;
  emotionalTriggersUsed: string[];
  missingElements: string[];
  hasDreamState: boolean;
  hasFearState: boolean;
}

/**
 * CTA strength score details
 */
export interface CTAScoreDetail extends ScoreDetail {
  primaryCTAAnalysis: {
    text: string;
    hasActionVerb: boolean;
    hasBenefit: boolean;
    hasUrgency: boolean;
    weakWordsFound: string[];
  };
  allCTAs: Array<{
    text: string;
    score: number;
    issues: string[];
  }>;
}

/**
 * Objection coverage score details
 */
export interface ObjectionScoreDetail extends ScoreDetail {
  coveredObjections: string[];
  missingObjections: string[];
  objectionAnalysis: Record<string, { addressed: boolean; strength: 'strong' | 'weak' | 'none' }>;
}

/**
 * Anti-placeholder score details
 */
export interface AntiPlaceholderScoreDetail extends ScoreDetail {
  placeholdersFound: string[];
  locationOfPlaceholders: Array<{ text: string; location: string }>;
}

/**
 * Complete conversion score result
 */
export interface ConversionScoreResult {
  scores: {
    wiifm: WIIFMScoreDetail;
    clarity: ClarityScoreDetail;
    emotional: EmotionalScoreDetail;
    ctaStrength: CTAScoreDetail;
    objectionCoverage: ObjectionScoreDetail;
    antiPlaceholder: AntiPlaceholderScoreDetail;
  };
  totalScore: number;
  verdict: 'PASS' | 'ENHANCE' | 'REJECT';
  priorityFixes: string[];
  estimatedImprovement: string;
  metadata: {
    scoredAt: Date;
    contentLength: number;
    paragraphCount: number;
    sentenceCount: number;
    wordCount: number;
  };
}

/**
 * Content to be scored
 */
export interface ConversionContent {
  headlines?: string[];
  subheadlines?: string[];
  bodyCopy?: string;
  ctas?: Array<{ text: string; type?: string }>;
  emailSequence?: Array<{ subject: string; body: string }>;
  blogPost?: { title: string; content: string };
  funnelCopy?: {
    landing?: { headline: string; subheadline: string; cta: string; bullets?: string[] };
    sales?: { headline: string; subheadline: string; heroCopy: string; cta: string };
    checkout?: { headline: string; trustCopy: string; cta: string };
    thankYou?: { headline: string; nextSteps?: string[] };
  };
  rawText?: string;
}

/**
 * Scorer configuration
 */
export interface ConversionScorerConfig {
  weights?: {
    wiifm?: number;
    clarity?: number;
    emotional?: number;
    ctaStrength?: number;
    objectionCoverage?: number;
    antiPlaceholder?: number;
  };
  thresholds?: {
    pass?: number;
    enhance?: number;
  };
  strictMode?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default weights for scoring categories
 */
const DEFAULT_WEIGHTS = {
  wiifm: 0.25, // 25%
  clarity: 0.15, // 15%
  emotional: 0.2, // 20%
  ctaStrength: 0.2, // 20%
  objectionCoverage: 0.1, // 10%
  antiPlaceholder: 0.1, // 10%
};

/**
 * Default thresholds
 */
const DEFAULT_THRESHOLDS = {
  pass: 85,
  enhance: 70,
};

/**
 * Power words that trigger emotional response
 */
const POWER_WORDS = [
  // Urgency
  'now',
  'today',
  'immediately',
  'instant',
  'instantly',
  'hurry',
  'quick',
  'fast',
  'limited',
  'deadline',
  'expires',
  'last chance',
  // Value
  'free',
  'bonus',
  'save',
  'discount',
  'exclusive',
  'premium',
  'luxury',
  'valuable',
  // Trust
  'proven',
  'guaranteed',
  'certified',
  'trusted',
  'secure',
  'safe',
  'authentic',
  'official',
  // Curiosity
  'secret',
  'hidden',
  'revealed',
  'discover',
  'unlock',
  'inside',
  'behind-the-scenes',
  // Results
  'results',
  'success',
  'breakthrough',
  'transform',
  'achieve',
  'accomplish',
  'win',
  'boost',
  // Exclusivity
  'private',
  'members-only',
  'invitation',
  'vip',
  'elite',
  'handpicked',
  'select',
  // Fear/Loss
  'mistake',
  'avoid',
  'never',
  'stop',
  'warning',
  'danger',
  'risk',
  'miss out',
  'losing',
  // New
  'new',
  'introducing',
  'announcing',
  'finally',
  'revolutionary',
  'breakthrough',
  // Easy
  'easy',
  'simple',
  'effortless',
  'straightforward',
  'step-by-step',
  'foolproof',
];

/**
 * Emotional triggers
 */
const EMOTIONAL_TRIGGERS = [
  'fear',
  'greed',
  'guilt',
  'exclusivity',
  'salvation',
  'curiosity',
  'urgency',
  'trust',
  'belonging',
  'pride',
];

/**
 * Weak CTA words to penalize
 */
const WEAK_CTA_WORDS = [
  'maybe',
  'try',
  'submit',
  'click here',
  'learn more',
  'read more',
  'see more',
  'continue',
  'next',
  'enter',
  'send',
  'go',
  'okay',
  'ok',
  'proceed',
];

/**
 * Strong action verbs for CTAs
 */
const STRONG_ACTION_VERBS = [
  'get',
  'grab',
  'claim',
  'unlock',
  'access',
  'start',
  'join',
  'discover',
  'download',
  'reserve',
  'secure',
  'activate',
  'launch',
  'begin',
  'create',
  'build',
  'transform',
  'boost',
  'save',
  'earn',
];

/**
 * Common jargon to avoid
 */
const JARGON_WORDS = [
  'leverage',
  'synergy',
  'paradigm',
  'ecosystem',
  'scalable',
  'robust',
  'holistic',
  'optimize',
  'streamline',
  'innovative',
  'cutting-edge',
  'game-changing',
  'revolutionary',
  'disruptive',
  'best-in-class',
  'world-class',
  'state-of-the-art',
  'next-generation',
  'enterprise-grade',
  'mission-critical',
  'actionable',
  'bandwidth',
  'circle back',
  'deep dive',
  'drill down',
];

/**
 * Placeholder patterns to detect
 */
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\[insert .+?\]/i,
  /\[your .+?\]/i,
  /\[add .+?\]/i,
  /\[placeholder\]/i,
  /\[todo\]/i,
  /\[tbd\]/i,
  /\[xxx\]/i,
  /\[fill in\]/i,
  /your headline here/i,
  /your text here/i,
  /click here/i,
  /sample text/i,
  /example text/i,
  /dummy text/i,
  /replace this/i,
  /edit this/i,
  /change this/i,
  /update this/i,
  /your name/i,
  /your company/i,
  /your product/i,
  /\$xxx/i,
  /\$\d{1,2}\.\d{2}/i, // Suspiciously round prices like $9.99
  /www\.example\.com/i,
  /example@/i,
  /test@/i,
];

/**
 * Core objections that must be addressed
 */
const CORE_OBJECTIONS = {
  price: [
    'expensive',
    'cost',
    'afford',
    'budget',
    'money',
    'investment',
    'value',
    'worth',
    'price',
    'pay',
  ],
  time: ['time', 'busy', 'schedule', 'hours', 'minutes', 'quickly', 'fast', 'slow'],
  trust: [
    'trust',
    'scam',
    'legit',
    'guarantee',
    'refund',
    'risk-free',
    'proven',
    'testimonial',
    'review',
  ],
  willItWork: [
    'work for me',
    'my situation',
    'different',
    'unique',
    'specific',
    'case',
    'circumstances',
  ],
  triedBefore: [
    'tried',
    'failed',
    'before',
    'again',
    'different',
    'this time',
    'unlike',
    'not like',
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract all text from conversion content
 */
function extractAllText(content: ConversionContent): string {
  const texts: string[] = [];

  if (content.headlines) texts.push(...content.headlines);
  if (content.subheadlines) texts.push(...content.subheadlines);
  if (content.bodyCopy) texts.push(content.bodyCopy);
  if (content.ctas) texts.push(...content.ctas.map(c => c.text));
  if (content.emailSequence) {
    content.emailSequence.forEach(e => {
      texts.push(e.subject);
      texts.push(e.body);
    });
  }
  if (content.blogPost) {
    texts.push(content.blogPost.title);
    texts.push(content.blogPost.content);
  }
  if (content.funnelCopy) {
    const fc = content.funnelCopy;
    if (fc.landing) {
      texts.push(fc.landing.headline, fc.landing.subheadline, fc.landing.cta);
      if (fc.landing.bullets) texts.push(...fc.landing.bullets);
    }
    if (fc.sales) {
      texts.push(fc.sales.headline, fc.sales.subheadline, fc.sales.heroCopy, fc.sales.cta);
    }
    if (fc.checkout) {
      texts.push(fc.checkout.headline, fc.checkout.trustCopy, fc.checkout.cta);
    }
    if (fc.thankYou) {
      texts.push(fc.thankYou.headline);
      if (fc.thankYou.nextSteps) texts.push(...fc.thankYou.nextSteps);
    }
  }
  if (content.rawText) texts.push(content.rawText);

  return texts.filter(Boolean).join('\n\n');
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Calculate Flesch-Kincaid Grade Level
 */
function calculateFleschKincaid(text: string): { gradeLevel: number; readingLevel: string } {
  const sentences = splitIntoSentences(text);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0 || words.length === 0) {
    return { gradeLevel: 0, readingLevel: 'Unknown' };
  }

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch-Kincaid Grade Level formula
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  const roundedGrade = Math.max(1, Math.min(16, Math.round(gradeLevel)));

  const gradeLevelMap: Record<number, string> = {
    1: '1st grade',
    2: '2nd grade',
    3: '3rd grade',
    4: '4th grade',
    5: '5th grade',
    6: '6th grade',
    7: '7th grade',
    8: '8th grade',
    9: '9th grade',
    10: '10th grade',
    11: '11th grade',
    12: '12th grade',
    13: 'College freshman',
    14: 'College sophomore',
    15: 'College junior',
    16: 'College senior+',
  };

  return {
    gradeLevel: roundedGrade,
    readingLevel: gradeLevelMap[roundedGrade] || `Grade ${roundedGrade}`,
  };
}

/**
 * Find complex words (3+ syllables, not common)
 */
function findComplexWords(text: string): string[] {
  const words = text.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
  const commonWords = new Set([
    'beautiful',
    'important',
    'different',
    'possible',
    'everything',
    'something',
    'another',
    'because',
  ]);
  const complexSet = new Set(words.filter(w => countSyllables(w) >= 3 && !commonWords.has(w)));

  return Array.from(complexSet);
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score WIIFM (What's In It For Me)
 */
function scoreWIIFM(content: ConversionContent): WIIFMScoreDetail {
  const text = extractAllText(content);
  const paragraphs = splitIntoParagraphs(text);
  const sentences = splitIntoSentences(text);

  const issues: string[] = [];
  const suggestions: string[] = [];
  const paragraphsWithoutBenefit: number[] = [];
  const selfFocusedSentences: string[] = [];
  const featureFocusedPhrases: string[] = [];

  // Benefit keywords
  const benefitKeywords = [
    'you',
    'your',
    'get',
    'receive',
    'gain',
    'achieve',
    'enjoy',
    'discover',
    'learn',
    'save',
    'earn',
    'transform',
    'become',
  ];
  const featureKeywords = [
    'it has',
    'it includes',
    'it features',
    'it comes with',
    'it offers',
    'it provides',
    'we have',
    'we include',
    'we offer',
  ];

  let score = 100;

  // Check each paragraph for reader benefits
  paragraphs.forEach((para, idx) => {
    const paraLower = para.toLowerCase();
    const hasBenefit = benefitKeywords.some(kw => paraLower.includes(kw));
    if (!hasBenefit && para.length > 50) {
      paragraphsWithoutBenefit.push(idx + 1);
      score -= 5;
    }
  });

  // Check for self-focused sentences (starting with "I" or "We")
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (/^(I|We)\s/i.test(trimmed)) {
      selfFocusedSentences.push(trimmed.substring(0, 60) + (trimmed.length > 60 ? '...' : ''));
      score -= 3;
    }
  });

  // Check for feature-focused language
  featureKeywords.forEach(fk => {
    const regex = new RegExp(fk, 'gi');
    const matches = text.match(regex);
    if (matches) {
      featureFocusedPhrases.push(...matches);
      score -= 4 * matches.length;
    }
  });

  // Check first 2 sentences hook with value
  const firstTwoSentences = sentences.slice(0, 2).join(' ').toLowerCase();
  const hasValueHook = benefitKeywords.some(kw => firstTwoSentences.includes(kw));
  if (!hasValueHook && sentences.length >= 2) {
    issues.push('First 2 sentences do not hook with reader value');
    suggestions.push('Rewrite opening to immediately answer "What\'s in it for me?"');
    score -= 15;
  }

  // Generate issues and suggestions
  if (paragraphsWithoutBenefit.length > 0) {
    issues.push(`Paragraphs ${paragraphsWithoutBenefit.join(', ')} lack reader benefit language`);
    suggestions.push('Add "you" and benefit-focused language to these paragraphs');
  }

  if (selfFocusedSentences.length > 0) {
    issues.push(`${selfFocusedSentences.length} sentences start with "I" or "We"`);
    suggestions.push('Rewrite self-focused sentences to start with "You" or the benefit');
  }

  if (featureFocusedPhrases.length > 0) {
    issues.push(`${featureFocusedPhrases.length} feature-focused phrases found`);
    suggestions.push('Convert "It has X" to "You get X" - benefits over features');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    paragraphsWithoutBenefit,
    selfFocusedSentences,
    featureFocusedPhrases,
  };
}

/**
 * Score Clarity
 */
function scoreClarity(content: ConversionContent): ClarityScoreDetail {
  const text = extractAllText(content);
  const sentences = splitIntoSentences(text);
  const paragraphs = splitIntoParagraphs(text);

  const issues: string[] = [];
  const suggestions: string[] = [];

  let score = 100;

  // Calculate reading level
  const { gradeLevel, readingLevel } = calculateFleschKincaid(text);

  // Target: 6th-8th grade (gradeLevel 6-8)
  if (gradeLevel > 8) {
    const penalty = (gradeLevel - 8) * 5;
    score -= penalty;
    issues.push(`Reading level too high: ${readingLevel} (target: 6th-8th grade)`);
    suggestions.push('Simplify vocabulary and shorten sentences');
  }

  // Calculate average sentence length
  const avgSentenceLength =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + countWords(s), 0) / sentences.length
      : 0;

  // Target: under 20 words average
  if (avgSentenceLength > 20) {
    const penalty = (avgSentenceLength - 20) * 2;
    score -= penalty;
    issues.push(`Sentences too long: ${avgSentenceLength.toFixed(1)} words avg (target: <20)`);
    suggestions.push('Break long sentences into shorter, punchier ones');
  }

  // Calculate average paragraph sentences
  const avgParagraphSentences =
    paragraphs.length > 0
      ? paragraphs.reduce((sum, p) => sum + splitIntoSentences(p).length, 0) / paragraphs.length
      : 0;

  // Target: under 4 sentences per paragraph
  if (avgParagraphSentences > 4) {
    const penalty = (avgParagraphSentences - 4) * 3;
    score -= penalty;
    issues.push(
      `Paragraphs too long: ${avgParagraphSentences.toFixed(1)} sentences avg (target: <4)`
    );
    suggestions.push('Break up dense paragraphs for better readability');
  }

  // Find complex words
  const complexWords = findComplexWords(text);
  if (complexWords.length > 10) {
    score -= complexWords.length - 10;
    issues.push(`Too many complex words: ${complexWords.length}`);
    suggestions.push(`Replace complex words like: ${complexWords.slice(0, 5).join(', ')}`);
  }

  // Find jargon
  const jargonFound = JARGON_WORDS.filter(j => text.toLowerCase().includes(j));
  if (jargonFound.length > 0) {
    score -= jargonFound.length * 3;
    issues.push(`Jargon detected: ${jargonFound.join(', ')}`);
    suggestions.push('Replace jargon with plain language your audience understands');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    readingLevel,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgParagraphSentences: Math.round(avgParagraphSentences * 10) / 10,
    complexWords: complexWords.slice(0, 10),
    jargonFound,
  };
}

/**
 * Score Emotional Impact
 */
function scoreEmotional(content: ConversionContent): EmotionalScoreDetail {
  const text = extractAllText(content).toLowerCase();
  const issues: string[] = [];
  const suggestions: string[] = [];
  const missingElements: string[] = [];

  let score = 50; // Start at 50, add points for good elements

  // Find power words
  const powerWordsFound = POWER_WORDS.filter(pw => text.includes(pw.toLowerCase()));
  const powerWordCount = powerWordsFound.length;

  // Score power words (target: 10-20)
  if (powerWordCount >= 15) {
    score += 25;
  } else if (powerWordCount >= 10) {
    score += 20;
  } else if (powerWordCount >= 5) {
    score += 10;
  } else {
    issues.push(`Only ${powerWordCount} power words found (target: 10+)`);
    suggestions.push(`Add power words like: ${POWER_WORDS.slice(0, 5).join(', ')}`);
  }

  // Check for emotional triggers used
  const emotionalTriggersUsed = EMOTIONAL_TRIGGERS.filter(trigger => {
    // Check for related content, not just the word
    switch (trigger) {
      case 'fear':
        return (
          text.includes('miss out') ||
          text.includes('lose') ||
          text.includes('risk') ||
          text.includes('avoid')
        );
      case 'greed':
        return (
          text.includes('earn') ||
          text.includes('profit') ||
          text.includes('wealth') ||
          text.includes('gain')
        );
      case 'guilt':
        return text.includes('deserve') || text.includes('owe it') || text.includes('finally');
      case 'exclusivity':
        return (
          text.includes('exclusive') ||
          text.includes('limited') ||
          text.includes('only') ||
          text.includes('select')
        );
      case 'salvation':
        return (
          text.includes('solution') ||
          text.includes('answer') ||
          text.includes('finally') ||
          text.includes('breakthrough')
        );
      case 'curiosity':
        return (
          text.includes('secret') ||
          text.includes('discover') ||
          text.includes('reveal') ||
          text.includes('hidden')
        );
      case 'urgency':
        return (
          text.includes('now') ||
          text.includes('today') ||
          text.includes('limited') ||
          text.includes('deadline')
        );
      case 'trust':
        return (
          text.includes('guarantee') ||
          text.includes('proven') ||
          text.includes('trusted') ||
          text.includes('risk-free')
        );
      case 'belonging':
        return (
          text.includes('join') ||
          text.includes('community') ||
          text.includes('together') ||
          text.includes('members')
        );
      case 'pride':
        return (
          text.includes('proud') ||
          text.includes('achievement') ||
          text.includes('success') ||
          text.includes('accomplish')
        );
      default:
        return false;
    }
  });

  if (emotionalTriggersUsed.length >= 4) {
    score += 15;
  } else if (emotionalTriggersUsed.length >= 2) {
    score += 10;
  } else {
    issues.push(`Only ${emotionalTriggersUsed.length} emotional triggers used`);
    suggestions.push(
      'Incorporate more emotional triggers: fear, greed, guilt, exclusivity, salvation'
    );
  }

  // Check for dream state
  const hasDreamState =
    text.includes('imagine') ||
    text.includes('picture yourself') ||
    text.includes('dream') ||
    text.includes('finally') ||
    text.includes('freedom') ||
    text.includes('achieve') ||
    text.includes('transform');

  if (hasDreamState) {
    score += 10;
  } else {
    missingElements.push('No dream state visualization');
    issues.push('Dream state not clearly painted');
    suggestions.push('Add "Imagine..." or "Picture yourself..." to paint the dream outcome');
  }

  // Check for fear state
  const hasFearState =
    text.includes("if you don't") ||
    text.includes('without this') ||
    text.includes('stuck') ||
    text.includes('struggle') ||
    text.includes('frustrat') ||
    text.includes('painful') ||
    text.includes('miss out');

  if (hasFearState) {
    score += 10;
  } else {
    missingElements.push('No fear state visualization');
    issues.push('Fear state not clearly painted');
    suggestions.push("Show what happens if they DON'T take action");
  }

  // Check for analogies/vivid language
  const hasAnalogy =
    text.includes('like') ||
    text.includes('just as') ||
    text.includes('similar to') ||
    text.includes('think of it as') ||
    text.includes("it's like");

  if (hasAnalogy) {
    score += 5;
  } else {
    missingElements.push('No analogies for complex concepts');
    suggestions.push('Use analogies to make abstract benefits concrete');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    powerWordsFound,
    powerWordCount,
    emotionalTriggersUsed,
    missingElements,
    hasDreamState,
    hasFearState,
  };
}

/**
 * Score CTA Strength
 */
function scoreCTAStrength(content: ConversionContent): CTAScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Collect all CTAs
  const allCTATexts: string[] = [];

  if (content.ctas) {
    allCTATexts.push(...content.ctas.map(c => c.text));
  }
  if (content.funnelCopy?.landing?.cta) allCTATexts.push(content.funnelCopy.landing.cta);
  if (content.funnelCopy?.sales?.cta) allCTATexts.push(content.funnelCopy.sales.cta);
  if (content.funnelCopy?.checkout?.cta) allCTATexts.push(content.funnelCopy.checkout.cta);

  // If no CTAs found, check body copy
  if (allCTATexts.length === 0) {
    const text = extractAllText(content).toLowerCase();
    // Look for CTA-like phrases
    const ctaPatterns =
      /(?:click|get|grab|claim|start|join|download|sign up|subscribe|buy|order|try)/gi;
    const matches = text.match(ctaPatterns);
    if (matches) {
      allCTATexts.push(...matches.slice(0, 3));
    }
  }

  if (allCTATexts.length === 0) {
    return {
      score: 0,
      issues: ['No CTAs found in content'],
      suggestions: ['Add clear call-to-action buttons/links'],
      primaryCTAAnalysis: {
        text: '',
        hasActionVerb: false,
        hasBenefit: false,
        hasUrgency: false,
        weakWordsFound: [],
      },
      allCTAs: [],
    };
  }

  // Analyze each CTA
  const allCTAs = allCTATexts.map(ctaText => {
    const lower = ctaText.toLowerCase();
    let ctaScore = 25; // Base score
    const ctaIssues: string[] = [];

    // Check for action verb
    const hasActionVerb = STRONG_ACTION_VERBS.some(
      v => lower.startsWith(v) || lower.includes(' ' + v)
    );
    if (hasActionVerb) {
      ctaScore += 25;
    } else {
      ctaIssues.push('Does not start with strong action verb');
    }

    // Check for benefit
    const benefitWords = [
      'free',
      'instant',
      'your',
      'save',
      'get',
      'gain',
      'earn',
      'learn',
      'discover',
      'access',
    ];
    const hasBenefit = benefitWords.some(b => lower.includes(b));
    if (hasBenefit) {
      ctaScore += 25;
    } else {
      ctaIssues.push('No benefit mentioned');
    }

    // Check for urgency
    const urgencyWords = ['now', 'today', 'instant', 'limited', 'before', 'expires'];
    const hasUrgency = urgencyWords.some(u => lower.includes(u));
    if (hasUrgency) {
      ctaScore += 15;
    }

    // Check for weak words
    const weakWordsFound = WEAK_CTA_WORDS.filter(w => lower.includes(w));
    if (weakWordsFound.length > 0) {
      ctaScore -= weakWordsFound.length * 10;
      ctaIssues.push(`Contains weak words: ${weakWordsFound.join(', ')}`);
    }

    // Bonus for specificity
    if (lower.includes('my') || /\d/.test(lower)) {
      ctaScore += 10;
    }

    return {
      text: ctaText,
      score: Math.max(0, Math.min(100, ctaScore)),
      issues: ctaIssues,
    };
  });

  // Primary CTA analysis (first one)
  const primaryCTA = allCTAs[0];
  const primaryLower = primaryCTA.text.toLowerCase();

  const primaryCTAAnalysis = {
    text: primaryCTA.text,
    hasActionVerb: STRONG_ACTION_VERBS.some(
      v => primaryLower.startsWith(v) || primaryLower.includes(' ' + v)
    ),
    hasBenefit: ['free', 'instant', 'your', 'save', 'get', 'access'].some(b =>
      primaryLower.includes(b)
    ),
    hasUrgency: ['now', 'today', 'instant', 'limited'].some(u => primaryLower.includes(u)),
    weakWordsFound: WEAK_CTA_WORDS.filter(w => primaryLower.includes(w)),
  };

  // Calculate overall score
  const avgScore = allCTAs.reduce((sum, c) => sum + c.score, 0) / allCTAs.length;

  // Generate suggestions
  if (!primaryCTAAnalysis.hasActionVerb) {
    suggestions.push('Start primary CTA with action verb: Get, Grab, Claim, Start, Join');
  }
  if (!primaryCTAAnalysis.hasBenefit) {
    suggestions.push('Add benefit to CTA: "Get Free Access" instead of "Sign Up"');
  }
  if (!primaryCTAAnalysis.hasUrgency) {
    suggestions.push('Add urgency: "Get Instant Access Now"');
  }
  if (primaryCTAAnalysis.weakWordsFound.length > 0) {
    suggestions.push(`Remove weak words from CTA: ${primaryCTAAnalysis.weakWordsFound.join(', ')}`);
    issues.push(`CTA contains weak words: ${primaryCTAAnalysis.weakWordsFound.join(', ')}`);
  }

  return {
    score: Math.round(avgScore),
    issues,
    suggestions,
    primaryCTAAnalysis,
    allCTAs,
  };
}

/**
 * Score Objection Coverage
 */
function scoreObjectionCoverage(content: ConversionContent): ObjectionScoreDetail {
  const text = extractAllText(content).toLowerCase();
  const issues: string[] = [];
  const suggestions: string[] = [];
  const coveredObjections: string[] = [];
  const missingObjections: string[] = [];
  const objectionAnalysis: Record<
    string,
    { addressed: boolean; strength: 'strong' | 'weak' | 'none' }
  > = {};

  // Check each core objection
  Object.entries(CORE_OBJECTIONS).forEach(([objection, keywords]) => {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;

    if (matchCount >= 3) {
      objectionAnalysis[objection] = { addressed: true, strength: 'strong' };
      coveredObjections.push(objection);
    } else if (matchCount >= 1) {
      objectionAnalysis[objection] = { addressed: true, strength: 'weak' };
      coveredObjections.push(objection);
    } else {
      objectionAnalysis[objection] = { addressed: false, strength: 'none' };
      missingObjections.push(objection);
    }
  });

  // Calculate score
  const totalObjections = Object.keys(CORE_OBJECTIONS).length;
  const strongCount = Object.values(objectionAnalysis).filter(a => a.strength === 'strong').length;
  const weakCount = Object.values(objectionAnalysis).filter(a => a.strength === 'weak').length;

  let score = strongCount * 20 + weakCount * 10;

  // Generate issues and suggestions
  if (missingObjections.length > 0) {
    issues.push(`Missing objection coverage: ${missingObjections.join(', ')}`);
  }

  const objectionSuggestions: Record<string, string> = {
    price: 'Add ROI calculation or payment plan mention to address price objection',
    time: 'Emphasize quick results or time saved to address time objection',
    trust: 'Add testimonials, guarantees, or credentials to build trust',
    willItWork: 'Include specific case studies or "even if you..." statements',
    triedBefore: 'Differentiate from past failures with "This is different because..."',
  };

  missingObjections.forEach(obj => {
    if (objectionSuggestions[obj]) {
      suggestions.push(objectionSuggestions[obj]);
    }
  });

  // Bonus for FAQ section
  if (text.includes('faq') || text.includes('frequently asked') || text.includes('questions')) {
    score += 10;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    coveredObjections,
    missingObjections,
    objectionAnalysis,
  };
}

/**
 * Score Anti-Placeholder
 */
function scoreAntiPlaceholder(content: ConversionContent): AntiPlaceholderScoreDetail {
  const text = extractAllText(content);
  const issues: string[] = [];
  const suggestions: string[] = [];
  const placeholdersFound: string[] = [];
  const locationOfPlaceholders: Array<{ text: string; location: string }> = [];

  let score = 100;

  // Check each placeholder pattern
  PLACEHOLDER_PATTERNS.forEach(pattern => {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      matches.forEach(match => {
        placeholdersFound.push(match);

        // Find location (which section contains it)
        let location = 'body';
        if (content.headlines?.some(h => h.includes(match))) location = 'headline';
        else if (content.subheadlines?.some(s => s.includes(match))) location = 'subheadline';
        else if (content.ctas?.some(c => c.text.includes(match))) location = 'CTA';
        else if (content.bodyCopy?.includes(match)) location = 'body copy';

        locationOfPlaceholders.push({ text: match, location });
        score -= 20; // Heavy penalty for placeholders
      });
    }
  });

  // Check for generic CTAs
  const genericCTAs = ['click here', 'learn more', 'read more', 'submit', 'send'];
  if (content.ctas) {
    content.ctas.forEach(cta => {
      const lower = cta.text.toLowerCase();
      genericCTAs.forEach(generic => {
        if (lower === generic) {
          placeholdersFound.push(cta.text);
          locationOfPlaceholders.push({ text: cta.text, location: 'CTA' });
          score -= 15;
        }
      });
    });
  }

  // Check for empty or very short content
  const headlines = content.headlines || [];
  const emptyHeadlines = headlines.filter(h => !h || h.length < 5);
  if (emptyHeadlines.length > 0) {
    issues.push(`${emptyHeadlines.length} headlines are empty or too short`);
    score -= emptyHeadlines.length * 10;
  }

  if (placeholdersFound.length > 0) {
    issues.push(
      `Found ${placeholdersFound.length} placeholder(s): ${placeholdersFound.slice(0, 3).join(', ')}${placeholdersFound.length > 3 ? '...' : ''}`
    );
    suggestions.push('Replace all placeholders with real content before publishing');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    placeholdersFound,
    locationOfPlaceholders,
  };
}

// ============================================================================
// MAIN SCORING CLASS
// ============================================================================

/**
 * Conversion Quality Scoring Engine
 */
export class ConversionScorer {
  private config: Required<ConversionScorerConfig>;

  constructor(config: ConversionScorerConfig = {}) {
    this.config = {
      weights: { ...DEFAULT_WEIGHTS, ...config.weights },
      thresholds: { ...DEFAULT_THRESHOLDS, ...config.thresholds },
      strictMode: config.strictMode ?? false,
    };
  }

  /**
   * Score all conversion content
   */
  score(content: ConversionContent): ConversionScoreResult {
    const text = extractAllText(content);
    const sentences = splitIntoSentences(text);
    const paragraphs = splitIntoParagraphs(text);

    // Score each dimension
    const scores = {
      wiifm: scoreWIIFM(content),
      clarity: scoreClarity(content),
      emotional: scoreEmotional(content),
      ctaStrength: scoreCTAStrength(content),
      objectionCoverage: scoreObjectionCoverage(content),
      antiPlaceholder: scoreAntiPlaceholder(content),
    };

    // Calculate weighted total
    const weights = this.config.weights ?? DEFAULT_WEIGHTS;
    const totalScore = Math.round(
      scores.wiifm.score * (weights.wiifm ?? DEFAULT_WEIGHTS.wiifm) +
        scores.clarity.score * (weights.clarity ?? DEFAULT_WEIGHTS.clarity) +
        scores.emotional.score * (weights.emotional ?? DEFAULT_WEIGHTS.emotional) +
        scores.ctaStrength.score * (weights.ctaStrength ?? DEFAULT_WEIGHTS.ctaStrength) +
        scores.objectionCoverage.score *
          (weights.objectionCoverage ?? DEFAULT_WEIGHTS.objectionCoverage) +
        scores.antiPlaceholder.score * (weights.antiPlaceholder ?? DEFAULT_WEIGHTS.antiPlaceholder)
    );

    // Determine verdict
    let verdict: 'PASS' | 'ENHANCE' | 'REJECT';
    const thresholds = this.config.thresholds ?? DEFAULT_THRESHOLDS;
    if (totalScore >= (thresholds.pass ?? DEFAULT_THRESHOLDS.pass)) {
      verdict = 'PASS';
    } else if (totalScore >= (thresholds.enhance ?? DEFAULT_THRESHOLDS.enhance)) {
      verdict = 'ENHANCE';
    } else {
      verdict = 'REJECT';
    }

    // Strict mode: placeholders always reject
    if (this.config.strictMode && scores.antiPlaceholder.placeholdersFound.length > 0) {
      verdict = 'REJECT';
    }

    // Collect priority fixes
    const priorityFixes = this.collectPriorityFixes(scores);

    // Estimate improvement
    const estimatedImprovement = this.estimateImprovement(scores, priorityFixes);

    return {
      scores,
      totalScore,
      verdict,
      priorityFixes,
      estimatedImprovement,
      metadata: {
        scoredAt: new Date(),
        contentLength: text.length,
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        wordCount: countWords(text),
      },
    };
  }

  /**
   * Collect top priority fixes based on score issues
   */
  private collectPriorityFixes(scores: ConversionScoreResult['scores']): string[] {
    const fixes: Array<{ fix: string; impact: number }> = [];

    // WIIFM fixes (highest weight)
    if (scores.wiifm.score < 80) {
      scores.wiifm.suggestions.forEach(s => fixes.push({ fix: s, impact: 25 }));
    }

    // CTA fixes (high weight)
    if (scores.ctaStrength.score < 80) {
      scores.ctaStrength.suggestions.forEach(s => fixes.push({ fix: s, impact: 20 }));
    }

    // Emotional fixes (high weight)
    if (scores.emotional.score < 80) {
      scores.emotional.suggestions.forEach(s => fixes.push({ fix: s, impact: 20 }));
    }

    // Clarity fixes
    if (scores.clarity.score < 80) {
      scores.clarity.suggestions.forEach(s => fixes.push({ fix: s, impact: 15 }));
    }

    // Objection fixes
    if (scores.objectionCoverage.score < 80) {
      scores.objectionCoverage.suggestions.forEach(s => fixes.push({ fix: s, impact: 10 }));
    }

    // Anti-placeholder (critical)
    if (scores.antiPlaceholder.placeholdersFound.length > 0) {
      fixes.push({ fix: 'Remove all placeholders and replace with real content', impact: 30 });
    }

    // Sort by impact and return top 5
    return fixes
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5)
      .map(f => f.fix);
  }

  /**
   * Estimate score improvement if fixes are applied
   */
  private estimateImprovement(scores: ConversionScoreResult['scores'], fixes: string[]): string {
    let potentialGain = 0;

    // Estimate based on current deficits
    const weights = this.config.weights ?? DEFAULT_WEIGHTS;

    if (scores.wiifm.score < 90)
      potentialGain += (90 - scores.wiifm.score) * (weights.wiifm ?? DEFAULT_WEIGHTS.wiifm);
    if (scores.clarity.score < 90)
      potentialGain += (90 - scores.clarity.score) * (weights.clarity ?? DEFAULT_WEIGHTS.clarity);
    if (scores.emotional.score < 90)
      potentialGain +=
        (90 - scores.emotional.score) * (weights.emotional ?? DEFAULT_WEIGHTS.emotional);
    if (scores.ctaStrength.score < 90)
      potentialGain +=
        (90 - scores.ctaStrength.score) * (weights.ctaStrength ?? DEFAULT_WEIGHTS.ctaStrength);
    if (scores.objectionCoverage.score < 90)
      potentialGain +=
        (90 - scores.objectionCoverage.score) *
        (weights.objectionCoverage ?? DEFAULT_WEIGHTS.objectionCoverage);
    if (scores.antiPlaceholder.score < 100)
      potentialGain +=
        (100 - scores.antiPlaceholder.score) *
        (weights.antiPlaceholder ?? DEFAULT_WEIGHTS.antiPlaceholder);

    // Assume fixes address ~60% of the potential gain
    const estimatedGain = Math.round(potentialGain * 0.6);

    if (estimatedGain === 0) {
      return 'Content is already optimized';
    }

    return `+${estimatedGain} points after applying ${fixes.length} fix${fixes.length > 1 ? 'es' : ''}`;
  }

  /**
   * Quick check for pass/fail without full scoring
   */
  quickCheck(content: ConversionContent): { wouldPass: boolean; criticalIssues: string[] } {
    const criticalIssues: string[] = [];

    // Quick placeholder check
    const text = extractAllText(content);
    const hasPlaceholder = PLACEHOLDER_PATTERNS.some(p => p.test(text));
    if (hasPlaceholder) {
      criticalIssues.push('Contains placeholder content');
    }

    // Quick CTA check
    const ctas = content.ctas || [];
    if (
      ctas.length === 0 &&
      !text.toLowerCase().includes('get') &&
      !text.toLowerCase().includes('start')
    ) {
      criticalIssues.push('No clear CTA found');
    }

    // Quick WIIFM check
    const sentences = splitIntoSentences(text);
    const firstTwo = sentences.slice(0, 2).join(' ').toLowerCase();
    if (!firstTwo.includes('you') && firstTwo.length > 20) {
      criticalIssues.push('Opening does not address reader (no "you")');
    }

    return {
      wouldPass: criticalIssues.length === 0,
      criticalIssues,
    };
  }

  /**
   * Generate detailed feedback for regeneration
   */
  generateRegenerationFeedback(result: ConversionScoreResult): string {
    const feedback: string[] = [];

    feedback.push('## REGENERATION FEEDBACK\n');
    feedback.push(`Current Score: ${result.totalScore}/100 (${result.verdict})\n`);
    feedback.push(`Target: 85+ to pass\n\n`);

    feedback.push('### Critical Fixes Required:\n');
    result.priorityFixes.forEach((fix, i) => {
      feedback.push(`${i + 1}. ${fix}`);
    });

    feedback.push('\n### Dimension Breakdown:\n');

    const dims = [
      { name: 'WIIFM (Reader Focus)', score: result.scores.wiifm.score, weight: '25%' },
      { name: 'Clarity', score: result.scores.clarity.score, weight: '15%' },
      { name: 'Emotional Impact', score: result.scores.emotional.score, weight: '20%' },
      { name: 'CTA Strength', score: result.scores.ctaStrength.score, weight: '20%' },
      { name: 'Objection Coverage', score: result.scores.objectionCoverage.score, weight: '10%' },
      { name: 'Anti-Placeholder', score: result.scores.antiPlaceholder.score, weight: '10%' },
    ];

    dims.forEach(d => {
      const status = d.score >= 85 ? '✅' : d.score >= 70 ? '⚠️' : '❌';
      feedback.push(`${status} ${d.name}: ${d.score}/100 (${d.weight})`);
    });

    feedback.push(`\n### Estimated Improvement: ${result.estimatedImprovement}`);

    return feedback.join('\n');
  }
}

// ============================================================================
// FACTORY & UTILITY EXPORTS
// ============================================================================

/**
 * Create a new conversion scorer with default config
 */
export function createConversionScorer(config?: ConversionScorerConfig): ConversionScorer {
  return new ConversionScorer(config);
}

/**
 * Score content with default settings
 */
export function scoreConversionContent(content: ConversionContent): ConversionScoreResult {
  const scorer = createConversionScorer();
  return scorer.score(content);
}

/**
 * Quick pass/fail check
 */
export function quickConversionCheck(content: ConversionContent): {
  wouldPass: boolean;
  criticalIssues: string[];
} {
  const scorer = createConversionScorer();
  return scorer.quickCheck(content);
}

// Default export
export default ConversionScorer;
