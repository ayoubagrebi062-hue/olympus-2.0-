/**
 * OLYMPUS 2.0 - Niche Knowledge Base Types
 *
 * Type definitions for the conversion content knowledge base system.
 * Each niche contains proven headlines, pain points, objections, and templates
 * that SCRIBE uses as inspiration for generating high-converting copy.
 */

/** Headline categories based on emotional triggers */
export type HeadlineTrigger = 'fear' | 'greed' | 'guilt' | 'exclusivity' | 'salvation';

/** Objection with its diffusion strategy */
export interface Objection {
  objection: string;
  diffuse: string;
}

/** Headlines organized by emotional trigger */
export interface HeadlinesByTrigger {
  fear: string[];
  greed: string[];
  guilt: string[];
  exclusivity: string[];
  salvation: string[];
}

/** Complete niche knowledge structure */
export interface NicheKnowledge {
  /** Internal niche identifier */
  niche: string;

  /** Human-readable niche name */
  display_name: string;

  /** Headlines organized by emotional trigger type */
  headlines: HeadlinesByTrigger;

  /** Common pain points in this niche */
  pain_points: string[];

  /** Desired outcomes / dream states */
  dream_states: string[];

  /** Common objections with diffusion strategies */
  objections: Objection[];

  /** Niche-specific power words */
  power_words: string[];

  /** Call-to-action templates */
  cta_templates: string[];

  /** Social proof format templates */
  social_proof_templates: string[];

  /** Email subject line templates */
  subject_line_templates: string[];
}

/** Niche detection result */
export interface NicheDetectionResult {
  niche: string;
  confidence: number;
  matchedKeywords: string[];
}

/** Knowledge base statistics */
export interface KnowledgeBaseStats {
  totalNiches: number;
  totalHeadlines: number;
  totalPainPoints: number;
  totalObjections: number;
  niches: string[];
}

/** Niche keyword mapping for detection */
export interface NicheKeywords {
  niche: string;
  keywords: string[];
  weight: number;
}

/** Template variable for dynamic content */
export interface TemplateVariable {
  name: string;
  description: string;
  examples: string[];
}

/** Expanded headline with metadata */
export interface HeadlineWithMeta {
  headline: string;
  trigger: HeadlineTrigger;
  niche: string;
}

/** Knowledge query options */
export interface KnowledgeQueryOptions {
  /** Number of items to return */
  limit?: number;

  /** Randomize order */
  shuffle?: boolean;

  /** Filter by specific triggers */
  triggers?: HeadlineTrigger[];

  /** Include similar niches */
  includeSimilar?: boolean;
}

/** Similar niche mapping */
export interface NicheSimilarity {
  niche: string;
  similarTo: string[];
  overlapScore: number;
}
