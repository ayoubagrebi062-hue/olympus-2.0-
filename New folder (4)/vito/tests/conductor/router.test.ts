/**
 * CONDUCTOR Router Tests
 * =======================
 * Tests for project type detection and routing logic
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// PROJECT TYPE DETECTION PATTERN TESTS
// ============================================================================

describe('CONDUCTOR Router - Pattern Detection', () => {
  // Helper to simulate pattern matching
  function matchPatterns(
    description: string,
    patterns: Record<string, { keywords: string[]; weight: number }[]>
  ): Record<string, number> {
    const desc = description.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [type, patternList] of Object.entries(patterns)) {
      scores[type] = 0;
      for (const pattern of patternList) {
        for (const keyword of pattern.keywords) {
          if (desc.includes(keyword)) {
            scores[type] += pattern.weight;
          }
        }
      }
    }

    return scores;
  }

  describe('Landing Page Detection', () => {
    const patterns = {
      'landing-page': [
        { keywords: ['landing page', 'landing-page', 'single page'], weight: 10 },
        { keywords: ['hero section', 'cta', 'call to action'], weight: 5 },
        { keywords: ['waitlist', 'coming soon'], weight: 7 },
      ],
    };

    it('should score high for explicit landing page mention', () => {
      const scores = matchPatterns('Build a landing page for my product', patterns);
      expect(scores['landing-page']).toBeGreaterThanOrEqual(10);
    });

    it('should score for related keywords', () => {
      const scores = matchPatterns('Create a page with hero section and CTA', patterns);
      expect(scores['landing-page']).toBeGreaterThanOrEqual(5);
    });

    it('should score for waitlist/coming soon', () => {
      const scores = matchPatterns('Build a waitlist signup page', patterns);
      expect(scores['landing-page']).toBeGreaterThanOrEqual(7);
    });
  });

  describe('SaaS App Detection', () => {
    const patterns = {
      'saas-app': [
        { keywords: ['saas', 'software as a service'], weight: 10 },
        { keywords: ['subscription', 'billing', 'dashboard'], weight: 7 },
        { keywords: ['multi-tenant', 'workspace', 'team'], weight: 6 },
      ],
    };

    it('should score high for SaaS keyword', () => {
      const scores = matchPatterns('Build a SaaS product management tool', patterns);
      expect(scores['saas-app']).toBeGreaterThanOrEqual(10);
    });

    it('should score for subscription/billing keywords', () => {
      const scores = matchPatterns('Create an app with subscription billing', patterns);
      expect(scores['saas-app']).toBeGreaterThanOrEqual(7);
    });

    it('should accumulate scores from multiple keywords', () => {
      const scores = matchPatterns('Build a multi-tenant SaaS with subscription billing and dashboard', patterns);
      expect(scores['saas-app']).toBeGreaterThanOrEqual(23);
    });
  });

  describe('E-commerce Detection', () => {
    const patterns = {
      'e-commerce': [
        { keywords: ['e-commerce', 'ecommerce', 'online store', 'shop'], weight: 10 },
        { keywords: ['cart', 'checkout', 'products'], weight: 8 },
        { keywords: ['stripe', 'payments', 'orders'], weight: 6 },
      ],
    };

    it('should detect e-commerce stores', () => {
      const scores = matchPatterns('Build an e-commerce store', patterns);
      expect(scores['e-commerce']).toBeGreaterThanOrEqual(10);
    });

    it('should detect cart/checkout functionality', () => {
      const scores = matchPatterns('Create a store with cart and checkout', patterns);
      expect(scores['e-commerce']).toBeGreaterThanOrEqual(16);
    });
  });
});

// ============================================================================
// TECH STACK RECOMMENDATION TESTS
// ============================================================================

describe('CONDUCTOR Router - Tech Stack Recommendations', () => {
  interface TechStack {
    framework: string;
    styling: string;
    database: string | null;
    auth: string | null;
    payments: string | null;
  }

  function recommendTechStack(projectType: string, description: string): TechStack {
    const desc = description.toLowerCase();

    const stack: TechStack = {
      framework: 'Next.js 15',
      styling: 'Tailwind CSS',
      database: null,
      auth: null,
      payments: null,
    };

    // Adjust based on project type
    switch (projectType) {
      case 'e-commerce':
        stack.database = 'PostgreSQL + Prisma';
        stack.auth = 'NextAuth.js';
        stack.payments = 'Stripe';
        break;
      case 'saas-app':
        stack.database = 'PostgreSQL + Prisma';
        stack.auth = 'NextAuth.js / Clerk';
        stack.payments = 'Stripe';
        break;
      case 'blog':
        stack.database = 'MDX / Contentlayer';
        break;
      case 'api-service':
        stack.framework = 'Next.js API Routes / Hono';
        stack.database = 'PostgreSQL + Drizzle';
        break;
    }

    // Override based on explicit mentions
    if (desc.includes('supabase')) {
      stack.database = 'Supabase';
      stack.auth = 'Supabase Auth';
    }
    if (desc.includes('firebase')) {
      stack.database = 'Firebase / Firestore';
      stack.auth = 'Firebase Auth';
    }
    if (desc.includes('clerk')) {
      stack.auth = 'Clerk';
    }
    if (desc.includes('mongodb')) {
      stack.database = 'MongoDB + Mongoose';
    }

    return stack;
  }

  it('should recommend Stripe for e-commerce', () => {
    const stack = recommendTechStack('e-commerce', 'Build an online store');
    expect(stack.payments).toBe('Stripe');
    expect(stack.database).toBe('PostgreSQL + Prisma');
  });

  it('should recommend auth for SaaS apps', () => {
    const stack = recommendTechStack('saas-app', 'Build a project management SaaS');
    expect(stack.auth).toContain('NextAuth');
  });

  it('should override database when Supabase is mentioned', () => {
    const stack = recommendTechStack('saas-app', 'Build an app with Supabase');
    expect(stack.database).toBe('Supabase');
    expect(stack.auth).toBe('Supabase Auth');
  });

  it('should override database when Firebase is mentioned', () => {
    const stack = recommendTechStack('full-stack', 'Build an app with Firebase');
    expect(stack.database).toBe('Firebase / Firestore');
  });

  it('should override auth when Clerk is mentioned', () => {
    const stack = recommendTechStack('saas-app', 'Build a SaaS with Clerk');
    expect(stack.auth).toBe('Clerk');
  });

  it('should use MDX for blogs', () => {
    const stack = recommendTechStack('blog', 'Create a personal blog');
    expect(stack.database).toBe('MDX / Contentlayer');
  });
});

// ============================================================================
// WARNING GENERATION TESTS
// ============================================================================

describe('CONDUCTOR Router - Warning Generation', () => {
  interface Feature {
    name: string;
    complexity: 'low' | 'medium' | 'high';
  }

  function generateWarnings(
    projectType: string,
    features: Feature[],
    description: string
  ): string[] {
    const warnings: string[] = [];

    // Check for high-complexity features
    const highComplexity = features.filter((f) => f.complexity === 'high');
    if (highComplexity.length > 2) {
      warnings.push(
        `Multiple high-complexity features detected (${highComplexity.map((f) => f.name).join(', ')}). Consider phased implementation.`
      );
    }

    // Check for missing common features
    const hasAuth = features.some((f) => f.name === 'authentication');
    const hasDb = features.some((f) => f.name === 'database');

    if (['saas-app', 'e-commerce', 'dashboard'].includes(projectType) && !hasAuth) {
      warnings.push(
        'Authentication not explicitly mentioned but likely required for this project type.'
      );
    }

    if (['saas-app', 'e-commerce', 'dashboard', 'blog'].includes(projectType) && !hasDb) {
      warnings.push(
        'Database not explicitly mentioned but likely required for this project type.'
      );
    }

    // Check for vague descriptions
    if (description.length < 50) {
      warnings.push('Description is brief. More details will improve build accuracy.');
    }

    // Check for conflicting requirements
    if (description.toLowerCase().includes('simple') && features.length > 5) {
      warnings.push(
        'Description mentions "simple" but detected features suggest moderate complexity.'
      );
    }

    return warnings;
  }

  it('should warn about multiple high-complexity features', () => {
    const features: Feature[] = [
      { name: 'payments', complexity: 'high' },
      { name: 'real-time', complexity: 'high' },
      { name: 'search', complexity: 'high' },
    ];

    const warnings = generateWarnings('saas-app', features, 'Build a complex SaaS app');
    expect(warnings.some((w) => w.includes('high-complexity'))).toBe(true);
  });

  it('should warn about missing auth for SaaS', () => {
    const features: Feature[] = [{ name: 'database', complexity: 'medium' }];

    const warnings = generateWarnings('saas-app', features, 'Build a SaaS project management tool');
    expect(warnings.some((w) => w.includes('Authentication'))).toBe(true);
  });

  it('should warn about missing database for e-commerce', () => {
    const features: Feature[] = [{ name: 'authentication', complexity: 'medium' }];

    const warnings = generateWarnings('e-commerce', features, 'Build an online store with user accounts');
    expect(warnings.some((w) => w.includes('Database'))).toBe(true);
  });

  it('should warn about brief descriptions', () => {
    const warnings = generateWarnings('landing-page', [], 'Build a page');
    expect(warnings.some((w) => w.includes('brief'))).toBe(true);
  });

  it('should warn about conflicting complexity', () => {
    const features: Feature[] = Array(6).fill({ name: 'feature', complexity: 'medium' });
    const warnings = generateWarnings('landing-page', features, 'Build a simple landing page with forms');
    expect(warnings.some((w) => w.includes('simple'))).toBe(true);
  });

  it('should return no warnings for well-specified projects', () => {
    const features: Feature[] = [
      { name: 'authentication', complexity: 'medium' },
      { name: 'database', complexity: 'medium' },
    ];

    const warnings = generateWarnings(
      'saas-app',
      features,
      'Build a SaaS project management tool with user authentication and PostgreSQL database for storing projects and tasks'
    );

    // Should not have auth or database warnings
    expect(warnings.some((w) => w.includes('Authentication'))).toBe(false);
    expect(warnings.some((w) => w.includes('Database'))).toBe(false);
  });
});

// ============================================================================
// CONFIDENCE CALCULATION TESTS
// ============================================================================

describe('CONDUCTOR Router - Confidence Calculation', () => {
  function calculateConfidence(
    projectType: string,
    featureCount: number,
    patternScore: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if type is strongly detected
    if (projectType !== 'unknown' && projectType !== 'full-stack' && patternScore >= 10) {
      confidence += 0.2;
    }

    // Higher confidence with more detected features
    if (featureCount >= 3) {
      confidence += 0.15;
    }
    if (featureCount >= 5) {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  it('should start with base confidence of 0.5', () => {
    const confidence = calculateConfidence('unknown', 0, 0);
    expect(confidence).toBe(0.5);
  });

  it('should increase confidence for strong pattern match', () => {
    const confidence = calculateConfidence('saas-app', 2, 15);
    expect(confidence).toBeGreaterThan(0.5);
  });

  it('should increase confidence with more features', () => {
    const lowFeature = calculateConfidence('saas-app', 2, 10);
    const highFeature = calculateConfidence('saas-app', 5, 10);
    expect(highFeature).toBeGreaterThan(lowFeature);
  });

  it('should cap confidence at 0.95', () => {
    const confidence = calculateConfidence('saas-app', 10, 50);
    expect(confidence).toBe(0.95);
  });

  it('should not boost confidence for full-stack default', () => {
    const fullStack = calculateConfidence('full-stack', 2, 5);
    const saas = calculateConfidence('saas-app', 2, 15);
    expect(saas).toBeGreaterThan(fullStack);
  });
});

// ============================================================================
// PHASE MAPPING TESTS
// ============================================================================

describe('CONDUCTOR Router - Phase Mapping', () => {
  function getRequiredPhases(projectType: string): string[] {
    const basePhases = ['discovery', 'design', 'architecture'];
    const phases = [...basePhases];

    // Add frontend for most projects
    if (!['api-service'].includes(projectType)) {
      phases.push('frontend');
    }

    // Add backend for complex projects
    if (['saas-app', 'e-commerce', 'full-stack', 'api-service', 'dashboard'].includes(projectType)) {
      phases.push('backend');
    }

    // Always add testing and deployment
    phases.push('testing', 'deployment');

    return phases;
  }

  it('should include frontend for landing pages', () => {
    const phases = getRequiredPhases('landing-page');
    expect(phases).toContain('frontend');
    expect(phases).not.toContain('backend');
  });

  it('should include backend for SaaS apps', () => {
    const phases = getRequiredPhases('saas-app');
    expect(phases).toContain('backend');
    expect(phases).toContain('frontend');
  });

  it('should exclude frontend for API services', () => {
    const phases = getRequiredPhases('api-service');
    expect(phases).not.toContain('frontend');
    expect(phases).toContain('backend');
  });

  it('should always include testing and deployment', () => {
    ['landing-page', 'saas-app', 'api-service', 'portfolio'].forEach((type) => {
      const phases = getRequiredPhases(type);
      expect(phases).toContain('testing');
      expect(phases).toContain('deployment');
    });
  });

  it('should always start with discovery, design, architecture', () => {
    const phases = getRequiredPhases('e-commerce');
    expect(phases.slice(0, 3)).toEqual(['discovery', 'design', 'architecture']);
  });
});
