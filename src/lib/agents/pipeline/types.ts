/**
 * OLYMPUS 50X - Pipeline Types
 *
 * Types for the chain-of-thought agent pipeline.
 */

// ============================================
// PIPELINE AGENT IDS
// ============================================

export type PipelineAgentId =
  | 'planner' // Analyzes request, creates structured plan
  | 'psyche' // Conversion psychology analysis
  | 'scribe' // Conversion copywriting
  | 'architect_conversion' // Conversion page structure
  | 'designer' // Creates visual design spec using RAG
  | 'coder' // Generates code following design
  | 'reviewer' // Validates code quality
  | 'fixer'; // Fixes issues from review

// ============================================
// PIPELINE STATE
// ============================================

export interface PipelineState {
  requestId: string;
  prompt: string;
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla';

  // Agent outputs (built up as pipeline runs)
  plan?: PlannerOutput;
  // Conversion phase outputs (optional - only when content detected)
  psyche?: PsycheOutput;
  scribe?: ScribeOutput;
  architectConversion?: ArchitectConversionOutput;
  // Standard phase outputs
  design?: DesignerOutput;
  code?: CoderOutput;
  review?: ReviewerOutput;
  fixes?: FixerOutput;

  // Iteration tracking
  iteration: number;
  maxIterations: number;

  // Quality tracking
  currentScore: number;
  targetScore: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
}

// ============================================
// AGENT OUTPUTS
// ============================================

export interface PlannerOutput {
  componentType: string;
  componentName: string;
  requirements: string[];
  features: string[];
  designConsiderations: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTokens: number;
  ragQuery: string; // Query to find similar components
  // NEW: Content type detection
  contentType?: 'component' | 'landing_page' | 'sales_page' | 'blog' | 'funnel' | 'email_sequence';
  requiresConversion?: boolean;
}

// ============================================
// CONVERSION AGENT OUTPUTS
// ============================================

export interface PsycheOutput {
  psychology_profile: {
    primary_trigger: 'fear' | 'greed' | 'guilt' | 'exclusivity' | 'salvation';
    primary_trigger_reasoning: string;
    secondary_trigger: 'fear' | 'greed' | 'guilt' | 'exclusivity' | 'salvation';
    dream_state: {
      emotional: string;
      tangible: string;
      identity: string;
    };
    fear_state: {
      emotional: string;
      tangible: string;
      identity: string;
    };
    value_positioning: {
      dream_outcome_amplifier: string;
      likelihood_boosters: string[];
      time_reduction: string;
      effort_reduction: string;
    };
    wiifm_hook: string;
    objections: Array<{
      objection: string;
      diffuse: string;
    }>;
  };
  content_guidance: {
    tone: 'conversational' | 'authoritative' | 'urgent' | 'empathetic';
    formality: 'casual' | 'professional' | 'mixed';
    urgency_level: 'low' | 'medium' | 'high';
    proof_emphasis: 'testimonials' | 'statistics' | 'case_studies' | 'guarantees';
  };
}

export interface ScribeOutput {
  headlines: Array<{
    text: string;
    formula: string;
    trigger: string;
  }>;
  subheadlines: string[];
  body_copy: {
    framework: 'PAS' | 'HSO' | 'AIDA' | 'CJN';
    sections: Array<{
      type: string;
      content: string;
    }>;
    full_copy: string;
  };
  ctas: Array<{
    text: string;
    type: 'primary' | 'secondary' | 'low_commitment';
    urgency: boolean;
  }>;
  subject_lines: Array<{
    text: string;
    type: 'curiosity' | 'personal' | 'benefit' | 'story' | 'urgency';
  }>;
  email_sequence?: Array<{
    day: number;
    type: string;
    subject: string;
    preview: string;
    body: string;
    cta: string;
  }>;
  meta: {
    word_count: number;
    reading_time_seconds: number;
    primary_trigger_used: string;
    framework_used: string;
  };
  blog_post?: {
    title: string;
    hook: string;
    outline: string[];
    sections: Array<{
      heading: string;
      content: string;
    }>;
    internal_links: Array<{
      anchor: string;
      url: string;
    }>;
    soft_cta: string;
  };
  funnel_copy?: {
    landing: {
      headline: string;
      subheadline: string;
      cta: string;
      bullets: string[];
    };
    sales: {
      headline: string;
      subheadline: string;
      hero_copy: string;
      cta: string;
    };
    checkout: {
      headline: string;
      trust_copy: string;
      cta: string;
    };
    thank_you: {
      headline: string;
      next_steps: string[];
    };
  };
}

export interface ArchitectConversionOutput {
  page_blueprint: {
    page_type: 'sales_page' | 'landing_page' | 'blog' | 'checkout' | 'thank_you';
    sections: Array<{
      id: string;
      order: number;
      type: string;
      headline?: string;
      subheadline?: string;
      body: string;
      cta?: {
        text: string;
        style: 'primary' | 'secondary';
        urgency: boolean;
      };
      components: string[];
    }>;
    above_fold: string[];
    sticky_elements: string[];
  };
  funnel_flow?: {
    pages: Array<{
      step: number;
      type: string;
      goal: string;
    }>;
    email_triggers: Array<{
      trigger: string;
      sequence: string;
    }>;
  };
  email_calendar?: {
    sequences: Record<
      string,
      Array<{
        day: number;
        time: string;
        email_id: string;
      }>
    >;
  };
  urgency_plan: {
    primary_mechanic: 'countdown' | 'scarcity' | 'price_increase' | 'bonus_expiring';
    secondary_mechanic?: string;
    placement: string[];
    messaging: Record<string, string>;
  };
  conversion_checklist: {
    has_above_fold_cta: boolean;
    has_social_proof: boolean;
    has_guarantee: boolean;
    has_faq: boolean;
    has_urgency: boolean;
    has_multiple_ctas: boolean;
    objections_addressed: number;
  };
}

export interface DesignerOutput {
  designSpec: string;
  colorScheme: {
    background: string;
    foreground: string;
    accent: string;
    muted: string;
  };
  typography: {
    fontFamily: string;
    headingSizes: string[];
    bodySizes: string[];
  };
  spacing: {
    base: number;
    scale: string;
  };
  effects: string[]; // glassmorphism, glow, gradients
  interactions: string[]; // hover states, animations
  accessibility: string[]; // a11y requirements
  ragExamples: string; // Retrieved examples from RAG
}

export interface CoderOutput {
  code: string;
  language: string;
  filename: string;
  dependencies: string[];
  exports: string[];
  tokensUsed: number;
}

export interface ReviewerOutput {
  passed: boolean;
  score: number; // 0-100
  issues: ReviewIssue[];
  conversion_scores?: {
    clarity: number;
    wiifm: number;
    cta_strength: number;
    urgency: number;
  };
  conversion_passed?: boolean;
  suggestions: string[];
  categories: {
    design: number;
    layout: number;
    typography: number;
    interaction: number;
    accessibility: number;
    codeQuality: number;
    conversion?: number;
  };
  summary: string;
}

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface FixerOutput {
  code: string;
  fixesApplied: string[];
  issuesRemaining: string[];
  newScore: number;
}

// ============================================
// PIPELINE CONFIG
// ============================================

export interface PipelineConfig {
  targetScore: number; // Default 85
  maxIterations: number; // Default 3
  enableVision: boolean; // Use visual validation
  enableRAG: boolean; // Use RAG for examples
  model: {
    planner: string;
    psyche: string;
    scribe: string;
    architect_conversion: string;
    designer: string;
    coder: string;
    reviewer: string;
    fixer: string;
  };
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  targetScore: 85,
  maxIterations: 3,
  enableVision: true,
  enableRAG: true,
  model: {
    planner: 'gpt-4o-mini', // Fast planning
    psyche: 'gpt-4o',
    scribe: 'gpt-4o', // Deep copywriting
    architect_conversion: 'gpt-4o', // Funnel structuring
    designer: 'gpt-4o', // Good design
    coder: 'gpt-4o', // Quality code
    reviewer: 'gpt-4o-mini', // Fast review
    fixer: 'gpt-4o', // Accurate fixes
  },
};

// ============================================
// PIPELINE EVENTS
// ============================================

export type PipelineEvent =
  | { type: 'pipeline:start'; requestId: string; prompt: string }
  | { type: 'agent:start'; agent: PipelineAgentId }
  | { type: 'agent:complete'; agent: PipelineAgentId; duration: number }
  | { type: 'agent:error'; agent: PipelineAgentId; error: string }
  | { type: 'iteration:start'; iteration: number }
  | { type: 'iteration:complete'; iteration: number; score: number }
  | { type: 'pipeline:complete'; requestId: string; score: number; duration: number }
  | { type: 'pipeline:error'; requestId: string; error: string };

export type PipelineEventHandler = (event: PipelineEvent) => void;

// ============================================
// PIPELINE RESULT
// ============================================

export interface PipelineResult {
  success: boolean;
  code: string;
  filename: string;
  score: number;
  iterations: number;
  totalDuration: number;
  tokenUsage: {
    planner: number;
    psyche: number;
    scribe: number;
    architect_conversion: number;
    designer: number;
    coder: number;
    reviewer: number;
    fixer: number;
    total: number;
  };
  review: ReviewerOutput;
  // NEW: Include conversion outputs if generated
  conversion?: {
    psyche?: PsycheOutput;
    scribe: ScribeOutput;
    architect: ArchitectConversionOutput;
  };
}
