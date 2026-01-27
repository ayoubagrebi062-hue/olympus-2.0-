/**
 * OLYMPUS 2.0 - Niche Knowledge Base Loader
 *
 * Provides access to niche-specific conversion content templates including:
 * - Headlines by emotional trigger (fear, greed, guilt, exclusivity, salvation)
 * - Pain points and dream states
 * - Objection diffusers
 * - Power words and CTA templates
 * - Social proof and subject line templates
 *
 * Used by SCRIBE agent to generate high-converting content tailored to specific niches.
 */

import type {
  NicheKnowledge,
  NicheDetectionResult,
  HeadlineTrigger,
  Objection,
  KnowledgeBaseStats,
  NicheKeywords,
  HeadlineWithMeta,
  KnowledgeQueryOptions,
  NicheSimilarity,
} from './types';

// Import niche data
import fitnessData from './niches/fitness.json';
import saasData from './niches/saas.json';
import ecommerceData from './niches/ecommerce.json';
import coachingData from './niches/coaching.json';
import realEstateData from './niches/real-estate.json';

/** All available niches */
const NICHES: Record<string, NicheKnowledge> = {
  fitness: fitnessData as NicheKnowledge,
  saas: saasData as NicheKnowledge,
  ecommerce: ecommerceData as NicheKnowledge,
  coaching: coachingData as NicheKnowledge,
  'real-estate': realEstateData as NicheKnowledge,
};

/** Niche aliases for flexible matching */
const NICHE_ALIASES: Record<string, string> = {
  // Fitness aliases
  health: 'fitness',
  gym: 'fitness',
  workout: 'fitness',
  weight: 'fitness',
  'weight loss': 'fitness',
  diet: 'fitness',
  nutrition: 'fitness',
  wellness: 'fitness',
  exercise: 'fitness',
  training: 'fitness',

  // SaaS aliases
  software: 'saas',
  b2b: 'saas',
  'b2b software': 'saas',
  tech: 'saas',
  technology: 'saas',
  app: 'saas',
  application: 'saas',
  platform: 'saas',
  tool: 'saas',
  productivity: 'saas',
  automation: 'saas',
  crm: 'saas',
  erp: 'saas',

  // Ecommerce aliases
  'e-commerce': 'ecommerce',
  dtc: 'ecommerce',
  'd2c': 'ecommerce',
  'direct to consumer': 'ecommerce',
  retail: 'ecommerce',
  products: 'ecommerce',
  supplements: 'ecommerce',
  skincare: 'ecommerce',
  beauty: 'ecommerce',
  fashion: 'ecommerce',
  'online store': 'ecommerce',
  shop: 'ecommerce',

  // Coaching aliases
  'life coaching': 'coaching',
  'business coaching': 'coaching',
  mentor: 'coaching',
  mentorship: 'coaching',
  consulting: 'coaching',
  'executive coaching': 'coaching',
  'career coaching': 'coaching',
  'leadership coaching': 'coaching',
  transformation: 'coaching',
  'personal development': 'coaching',
  'self improvement': 'coaching',
  course: 'coaching',
  'online course': 'coaching',

  // Real estate aliases
  realestate: 'real-estate',
  property: 'real-estate',
  properties: 'real-estate',
  'real estate': 'real-estate',
  realtor: 'real-estate',
  agent: 'real-estate',
  'real estate agent': 'real-estate',
  homes: 'real-estate',
  houses: 'real-estate',
  investment: 'real-estate',
  'property investment': 'real-estate',
  mortgage: 'real-estate',
  buying: 'real-estate',
  selling: 'real-estate',
};

/** Keywords for niche detection with weights */
const NICHE_DETECTION_KEYWORDS: NicheKeywords[] = [
  // Fitness
  {
    niche: 'fitness',
    keywords: [
      'fitness',
      'gym',
      'workout',
      'exercise',
      'weight loss',
      'lose weight',
      'weight',
      'diet',
      'nutrition',
      'health',
      'wellness',
      'training',
      'muscle',
      'fat',
      'cardio',
      'strength',
      'body',
      'metabolism',
      'calories',
      'protein',
      'athletic',
      'sports',
      'yoga',
      'crossfit',
      'personal trainer',
      'personal training',
      'busy professionals',
      'membership',
      'online gym',
      'coaching',
      'build muscle',
    ],
    weight: 1.0,
  },
  // SaaS
  {
    niche: 'saas',
    keywords: [
      'software',
      'saas',
      'b2b',
      'platform',
      'tool',
      'app',
      'application',
      'automation',
      'workflow',
      'integration',
      'api',
      'dashboard',
      'analytics',
      'crm',
      'erp',
      'productivity',
      'team',
      'enterprise',
      'business software',
      'cloud',
      'subscription',
      'users',
      'features',
      'implementation',
      'onboarding',
    ],
    weight: 1.0,
  },
  // Ecommerce
  {
    niche: 'ecommerce',
    keywords: [
      'ecommerce',
      'e-commerce',
      'shop',
      'store',
      'online shop',
      'online store',
      'product',
      'products',
      'buy',
      'purchase',
      'order',
      'shipping',
      'delivery',
      'cart',
      'checkout',
      'retail',
      'dtc',
      'd2c',
      'direct-to-consumer',
      'direct to consumer',
      'skincare',
      'beauty',
      'fashion',
      'supplements',
      'subscription box',
      'brand',
      'ingredients',
      'formula',
      'organic',
      'premium',
      'handcrafted',
      'jewelry',
      'accessories',
      'sustainable',
      'selling',
    ],
    weight: 1.0,
  },
  // Coaching
  {
    niche: 'coaching',
    keywords: [
      'coaching',
      'coach',
      'mentor',
      'mentorship',
      'consulting',
      'consultant',
      'course',
      'program',
      'transformation',
      'mindset',
      'goals',
      'success',
      'achievement',
      'potential',
      'growth',
      'development',
      'leadership',
      'executive',
      'career',
      'life coach',
      'business coach',
      'mastermind',
      'accountability',
      'clarity',
      'purpose',
    ],
    weight: 1.0,
  },
  // Real Estate
  {
    niche: 'real-estate',
    keywords: [
      'real estate',
      'realestate',
      'property',
      'properties',
      'home',
      'homes',
      'house',
      'houses',
      'apartment',
      'condo',
      'realtor',
      'agent',
      'broker',
      'mortgage',
      'buying',
      'selling',
      'investment',
      'investor',
      'rental',
      'landlord',
      'tenant',
      'closing',
      'listing',
      'market',
      'neighborhood',
    ],
    weight: 1.0,
  },
];

/** Similar niches for fallback content */
const NICHE_SIMILARITIES: NicheSimilarity[] = [
  { niche: 'fitness', similarTo: ['coaching', 'ecommerce'], overlapScore: 0.6 },
  { niche: 'saas', similarTo: ['coaching'], overlapScore: 0.5 },
  { niche: 'ecommerce', similarTo: ['fitness'], overlapScore: 0.5 },
  { niche: 'coaching', similarTo: ['fitness', 'saas', 'real-estate'], overlapScore: 0.7 },
  { niche: 'real-estate', similarTo: ['coaching'], overlapScore: 0.4 },
];

/**
 * Get niche knowledge by identifier
 * @param niche - Niche identifier (e.g., 'fitness', 'saas') or alias
 * @returns NicheKnowledge object or null if not found
 */
export function getNicheKnowledge(niche: string): NicheKnowledge | null {
  const normalizedNiche = niche.toLowerCase().trim();

  // Direct match
  if (NICHES[normalizedNiche]) {
    return NICHES[normalizedNiche];
  }

  // Alias match
  const aliasMatch = NICHE_ALIASES[normalizedNiche];
  if (aliasMatch && NICHES[aliasMatch]) {
    return NICHES[aliasMatch];
  }

  return null;
}

/**
 * Detect niche from a description or business context
 * Uses keyword matching with weighted scoring
 * @param description - Business description, project brief, or context
 * @returns Detected niche identifier or 'generic' if no strong match
 */
export function detectNiche(description: string): string {
  const normalizedDesc = description.toLowerCase();
  const results: NicheDetectionResult[] = [];

  for (const nicheKeywords of NICHE_DETECTION_KEYWORDS) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of nicheKeywords.keywords) {
      // Check for exact word match or phrase match
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
      const matches = normalizedDesc.match(regex);
      if (matches) {
        matchedKeywords.push(keyword);
        // Weight by number of occurrences and keyword length (longer = more specific)
        score += matches.length * (1 + keyword.length / 20) * nicheKeywords.weight;
      }
    }

    if (matchedKeywords.length > 0) {
      results.push({
        niche: nicheKeywords.niche,
        confidence: Math.min(score / 10, 1), // Normalize to 0-1
        matchedKeywords,
      });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // Return best match if confidence is high enough
  // Lower threshold (0.15) allows detection with fewer keyword matches
  if (results.length > 0 && results[0].confidence >= 0.15) {
    return results[0].niche;
  }

  return 'generic';
}

/**
 * Detect niche with full details
 * @param description - Business description or context
 * @returns Full detection result with confidence and matched keywords
 */
export function detectNicheWithDetails(description: string): NicheDetectionResult {
  const normalizedDesc = description.toLowerCase();
  const results: NicheDetectionResult[] = [];

  for (const nicheKeywords of NICHE_DETECTION_KEYWORDS) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of nicheKeywords.keywords) {
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
      const matches = normalizedDesc.match(regex);
      if (matches) {
        matchedKeywords.push(keyword);
        score += matches.length * (1 + keyword.length / 20) * nicheKeywords.weight;
      }
    }

    if (matchedKeywords.length > 0) {
      results.push({
        niche: nicheKeywords.niche,
        confidence: Math.min(score / 10, 1),
        matchedKeywords,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  if (results.length > 0) {
    return results[0];
  }

  return {
    niche: 'generic',
    confidence: 0,
    matchedKeywords: [],
  };
}

/**
 * Get headlines for a specific emotional trigger
 * @param niche - Niche identifier
 * @param trigger - Emotional trigger type (fear, greed, guilt, exclusivity, salvation)
 * @param options - Query options (limit, shuffle)
 * @returns Array of headlines or empty array
 */
export function getHeadlinesForTrigger(
  niche: string,
  trigger: HeadlineTrigger,
  options: KnowledgeQueryOptions = {}
): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  let headlines = [...(knowledge.headlines[trigger] || [])];

  if (options.shuffle) {
    headlines = shuffleArray(headlines);
  }

  if (options.limit && options.limit > 0) {
    headlines = headlines.slice(0, options.limit);
  }

  return headlines;
}

/**
 * Get all headlines for a niche with metadata
 * @param niche - Niche identifier
 * @param options - Query options
 * @returns Array of headlines with trigger and niche metadata
 */
export function getAllHeadlines(
  niche: string,
  options: KnowledgeQueryOptions = {}
): HeadlineWithMeta[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  const triggers: HeadlineTrigger[] = options.triggers || [
    'fear',
    'greed',
    'guilt',
    'exclusivity',
    'salvation',
  ];

  let headlines: HeadlineWithMeta[] = [];

  for (const trigger of triggers) {
    const triggerHeadlines = knowledge.headlines[trigger] || [];
    headlines.push(
      ...triggerHeadlines.map((headline) => ({
        headline,
        trigger,
        niche,
      }))
    );
  }

  if (options.shuffle) {
    headlines = shuffleArray(headlines);
  }

  if (options.limit && options.limit > 0) {
    headlines = headlines.slice(0, options.limit);
  }

  return headlines;
}

/**
 * Get objection diffusers for a niche
 * @param niche - Niche identifier
 * @returns Array of objections with diffusion strategies
 */
export function getObjectionDiffusers(niche: string): Objection[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  return knowledge.objections;
}

/**
 * Get pain points for a niche
 * @param niche - Niche identifier
 * @param options - Query options
 * @returns Array of pain points
 */
export function getPainPoints(niche: string, options: KnowledgeQueryOptions = {}): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  let painPoints = [...knowledge.pain_points];

  if (options.shuffle) {
    painPoints = shuffleArray(painPoints);
  }

  if (options.limit && options.limit > 0) {
    painPoints = painPoints.slice(0, options.limit);
  }

  return painPoints;
}

/**
 * Get dream states for a niche
 * @param niche - Niche identifier
 * @param options - Query options
 * @returns Array of dream states
 */
export function getDreamStates(niche: string, options: KnowledgeQueryOptions = {}): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  let dreamStates = [...knowledge.dream_states];

  if (options.shuffle) {
    dreamStates = shuffleArray(dreamStates);
  }

  if (options.limit && options.limit > 0) {
    dreamStates = dreamStates.slice(0, options.limit);
  }

  return dreamStates;
}

/**
 * Get power words for a niche
 * @param niche - Niche identifier
 * @returns Array of power words
 */
export function getPowerWords(niche: string): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  return knowledge.power_words;
}

/**
 * Get CTA templates for a niche
 * @param niche - Niche identifier
 * @param options - Query options
 * @returns Array of CTA templates
 */
export function getCTATemplates(niche: string, options: KnowledgeQueryOptions = {}): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  let templates = [...knowledge.cta_templates];

  if (options.shuffle) {
    templates = shuffleArray(templates);
  }

  if (options.limit && options.limit > 0) {
    templates = templates.slice(0, options.limit);
  }

  return templates;
}

/**
 * Get social proof templates for a niche
 * @param niche - Niche identifier
 * @returns Array of social proof templates
 */
export function getSocialProofTemplates(niche: string): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  return knowledge.social_proof_templates;
}

/**
 * Get email subject line templates for a niche
 * @param niche - Niche identifier
 * @returns Array of subject line templates
 */
export function getSubjectLineTemplates(niche: string): string[] {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) return [];

  return knowledge.subject_line_templates;
}

/**
 * Get similar niches for fallback content
 * @param niche - Niche identifier
 * @returns Array of similar niche identifiers
 */
export function getSimilarNiches(niche: string): string[] {
  const similarity = NICHE_SIMILARITIES.find((s) => s.niche === niche);
  return similarity?.similarTo || [];
}

/**
 * Get content from similar niches as fallback
 * @param niche - Primary niche (may not exist)
 * @param contentFn - Function to extract content from NicheKnowledge
 * @returns Content from similar niches
 */
export function getContentWithFallback<T>(
  niche: string,
  contentFn: (knowledge: NicheKnowledge) => T[]
): T[] {
  // Try primary niche first
  const knowledge = getNicheKnowledge(niche);
  if (knowledge) {
    return contentFn(knowledge);
  }

  // Try similar niches
  const similarNiches = getSimilarNiches(niche);
  for (const similar of similarNiches) {
    const similarKnowledge = getNicheKnowledge(similar);
    if (similarKnowledge) {
      return contentFn(similarKnowledge);
    }
  }

  return [];
}

/**
 * Get all available niche identifiers
 * @returns Array of niche identifiers
 */
export function getAvailableNiches(): string[] {
  return Object.keys(NICHES);
}

/**
 * Get knowledge base statistics
 * @returns Stats about the knowledge base
 */
export function getKnowledgeBaseStats(): KnowledgeBaseStats {
  const niches = Object.keys(NICHES);
  let totalHeadlines = 0;
  let totalPainPoints = 0;
  let totalObjections = 0;

  for (const niche of niches) {
    const knowledge = NICHES[niche];
    totalHeadlines +=
      knowledge.headlines.fear.length +
      knowledge.headlines.greed.length +
      knowledge.headlines.guilt.length +
      knowledge.headlines.exclusivity.length +
      knowledge.headlines.salvation.length;
    totalPainPoints += knowledge.pain_points.length;
    totalObjections += knowledge.objections.length;
  }

  return {
    totalNiches: niches.length,
    totalHeadlines,
    totalPainPoints,
    totalObjections,
    niches,
  };
}

/**
 * Build a context block for SCRIBE agent from niche knowledge
 * @param niche - Detected or specified niche
 * @returns Formatted context string for the agent
 */
export function buildScribeContext(niche: string): string {
  const knowledge = getNicheKnowledge(niche);
  if (!knowledge) {
    return `
## Niche Context
No specific niche knowledge available. Generate content using universal conversion principles.
`;
  }

  const sampleHeadlines = [
    ...getHeadlinesForTrigger(niche, 'fear', { limit: 2 }),
    ...getHeadlinesForTrigger(niche, 'greed', { limit: 2 }),
    ...getHeadlinesForTrigger(niche, 'salvation', { limit: 2 }),
  ];

  const samplePainPoints = getPainPoints(niche, { limit: 5, shuffle: true });
  const sampleDreamStates = getDreamStates(niche, { limit: 5, shuffle: true });
  const objections = getObjectionDiffusers(niche).slice(0, 4);
  const powerWords = getPowerWords(niche).slice(0, 15);
  const ctaTemplates = getCTATemplates(niche, { limit: 5 });

  return `
## Niche Context: ${knowledge.display_name}

### Sample Headlines (Use as Inspiration, Not Templates)
${sampleHeadlines.map((h) => `- "${h}"`).join('\n')}

### Common Pain Points to Address
${samplePainPoints.map((p) => `- ${p}`).join('\n')}

### Dream States to Paint
${sampleDreamStates.map((d) => `- ${d}`).join('\n')}

### Objection Diffusers
${objections.map((o) => `**"${o.objection}"** → ${o.diffuse}`).join('\n\n')}

### Power Words for This Niche
${powerWords.join(', ')}

### CTA Inspiration
${ctaTemplates.map((c) => `- "${c}"`).join('\n')}

**IMPORTANT:** Use this knowledge as INSPIRATION. Adapt to the specific business, product, and audience. Never copy templates verbatim.
`;
}

/**
 * Validate that a niche exists
 * @param niche - Niche identifier to validate
 * @returns True if niche exists
 */
export function isValidNiche(niche: string): boolean {
  return getNicheKnowledge(niche) !== null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  NicheKnowledge,
  NicheDetectionResult,
  HeadlineTrigger,
  Objection,
  KnowledgeBaseStats,
  HeadlineWithMeta,
  KnowledgeQueryOptions,
} from './types';

export { NICHES, NICHE_ALIASES };
