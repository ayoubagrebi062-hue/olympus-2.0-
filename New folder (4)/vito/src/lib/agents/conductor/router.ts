/**
 * CONDUCTOR Router - Project Type Detection & Routing
 *
 * Analyzes project descriptions to determine:
 * - Project type (landing page, SaaS, e-commerce, etc.)
 * - Complexity level
 * - Required features
 * - Recommended tech stack
 */

import type {
  ProjectType,
  ProjectComplexity,
  ProjectAnalysis,
  DetectedFeature,
  TechStackRecommendation,
} from './types';

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

interface DetectionPattern {
  keywords: string[];
  weight: number;
}

const PROJECT_TYPE_PATTERNS: Record<ProjectType, DetectionPattern[]> = {
  'landing-page': [
    { keywords: ['landing page', 'landing-page', 'single page', 'one page'], weight: 10 },
    { keywords: ['launch', 'waitlist', 'coming soon', 'signup page'], weight: 7 },
    { keywords: ['hero section', 'cta', 'call to action', 'conversion'], weight: 5 },
  ],
  'marketing-site': [
    { keywords: ['marketing site', 'marketing website', 'company website'], weight: 10 },
    { keywords: ['about us', 'contact page', 'services page', 'team page'], weight: 6 },
    { keywords: ['multiple pages', 'multi-page', 'brochure'], weight: 5 },
  ],
  'saas-app': [
    { keywords: ['saas', 'software as a service', 'subscription app'], weight: 10 },
    { keywords: ['dashboard', 'user management', 'billing', 'subscription'], weight: 7 },
    { keywords: ['multi-tenant', 'workspace', 'team collaboration'], weight: 6 },
    { keywords: ['api integration', 'webhooks', 'analytics'], weight: 4 },
  ],
  'e-commerce': [
    { keywords: ['e-commerce', 'ecommerce', 'online store', 'shop'], weight: 10 },
    { keywords: ['cart', 'checkout', 'products', 'inventory'], weight: 8 },
    { keywords: ['stripe', 'payments', 'orders', 'shipping'], weight: 6 },
  ],
  'portfolio': [
    { keywords: ['portfolio', 'showcase', 'personal site', 'cv'], weight: 10 },
    { keywords: ['projects', 'work samples', 'gallery', 'resume'], weight: 6 },
  ],
  'blog': [
    { keywords: ['blog', 'articles', 'posts', 'content site'], weight: 10 },
    { keywords: ['cms', 'markdown', 'categories', 'tags'], weight: 6 },
    { keywords: ['comments', 'newsletter', 'rss'], weight: 4 },
  ],
  'dashboard': [
    { keywords: ['dashboard', 'admin panel', 'analytics dashboard'], weight: 10 },
    { keywords: ['charts', 'graphs', 'metrics', 'kpi'], weight: 7 },
    { keywords: ['data visualization', 'reports', 'monitoring'], weight: 5 },
  ],
  'mobile-app': [
    { keywords: ['mobile app', 'ios app', 'android app', 'react native'], weight: 10 },
    { keywords: ['flutter', 'expo', 'native app'], weight: 8 },
    { keywords: ['push notifications', 'offline', 'app store'], weight: 5 },
  ],
  'api-service': [
    { keywords: ['api', 'rest api', 'graphql', 'backend only'], weight: 10 },
    { keywords: ['microservice', 'serverless', 'lambda'], weight: 7 },
    { keywords: ['endpoints', 'authentication api', 'data api'], weight: 5 },
  ],
  'full-stack': [
    { keywords: ['full stack', 'fullstack', 'full-stack', 'complete app'], weight: 10 },
    { keywords: ['frontend and backend', 'web application'], weight: 6 },
  ],
  'unknown': [],
};

const FEATURE_PATTERNS: Record<string, { keywords: string[]; category: DetectedFeature['category']; complexity: DetectedFeature['complexity']; agents: string[] }> = {
  'authentication': {
    keywords: ['auth', 'login', 'signup', 'register', 'password', 'oauth', 'sso'],
    category: 'auth',
    complexity: 'medium',
    agents: ['auth-agent', 'security-agent'],
  },
  'payments': {
    keywords: ['payment', 'stripe', 'checkout', 'billing', 'subscription', 'pricing'],
    category: 'payments',
    complexity: 'high',
    agents: ['payment-agent', 'integration-agent'],
  },
  'database': {
    keywords: ['database', 'postgres', 'mysql', 'mongodb', 'prisma', 'drizzle', 'supabase'],
    category: 'database',
    complexity: 'medium',
    agents: ['database-agent', 'schema-agent'],
  },
  'api': {
    keywords: ['api', 'rest', 'graphql', 'trpc', 'endpoints', 'webhooks'],
    category: 'api',
    complexity: 'medium',
    agents: ['api-agent', 'integration-agent'],
  },
  'real-time': {
    keywords: ['real-time', 'realtime', 'websocket', 'live', 'streaming', 'sse'],
    category: 'integration',
    complexity: 'high',
    agents: ['realtime-agent', 'infrastructure-agent'],
  },
  'file-upload': {
    keywords: ['upload', 'file', 'image', 'media', 's3', 'storage'],
    category: 'integration',
    complexity: 'medium',
    agents: ['storage-agent', 'integration-agent'],
  },
  'email': {
    keywords: ['email', 'newsletter', 'notification', 'resend', 'sendgrid'],
    category: 'integration',
    complexity: 'low',
    agents: ['email-agent'],
  },
  'analytics': {
    keywords: ['analytics', 'tracking', 'metrics', 'dashboard', 'charts'],
    category: 'analytics',
    complexity: 'medium',
    agents: ['analytics-agent', 'ui-agent'],
  },
  'search': {
    keywords: ['search', 'filter', 'algolia', 'elasticsearch', 'full-text'],
    category: 'integration',
    complexity: 'medium',
    agents: ['search-agent', 'database-agent'],
  },
  'i18n': {
    keywords: ['i18n', 'internationalization', 'multi-language', 'translation', 'localization'],
    category: 'ui',
    complexity: 'medium',
    agents: ['i18n-agent', 'ui-agent'],
  },
};

const COMPLEXITY_THRESHOLDS = {
  simple: { maxFeatures: 3, maxAgents: 10 },
  moderate: { maxFeatures: 6, maxAgents: 20 },
  complex: { maxFeatures: 10, maxAgents: 35 },
  enterprise: { maxFeatures: Infinity, maxAgents: Infinity },
};

// ============================================================================
// ROUTER CLASS
// ============================================================================

export class ConductorRouter {
  /**
   * Analyze project description and return full analysis
   */
  async analyzeProject(description: string): Promise<ProjectAnalysis> {
    const normalizedDesc = description.toLowerCase();

    // Detect project type
    const type = this.detectProjectType(normalizedDesc);

    // Detect features
    const features = this.detectFeatures(normalizedDesc);

    // Calculate complexity
    const complexity = this.calculateComplexity(type, features);

    // Get tech stack recommendation
    const techStack = this.recommendTechStack(type, features, normalizedDesc);

    // Estimate resources
    const estimates = this.estimateResources(type, complexity, features);

    // Generate warnings
    const warnings = this.generateWarnings(type, features, normalizedDesc);

    // Calculate confidence
    const confidence = this.calculateConfidence(type, features);

    return {
      type,
      complexity,
      estimatedAgents: estimates.agents,
      estimatedTokens: estimates.tokens,
      estimatedCost: estimates.cost,
      suggestedTier: this.suggestTier(complexity, estimates),
      features,
      techStack,
      warnings,
      confidence,
    };
  }

  /**
   * Quick project type detection without full analysis
   */
  detectProjectType(description: string): ProjectType {
    const scores: Record<ProjectType, number> = {
      'landing-page': 0,
      'marketing-site': 0,
      'saas-app': 0,
      'e-commerce': 0,
      'portfolio': 0,
      'blog': 0,
      'dashboard': 0,
      'mobile-app': 0,
      'api-service': 0,
      'full-stack': 0,
      'unknown': 0,
    };

    // Score each project type based on keyword matches
    for (const [type, patterns] of Object.entries(PROJECT_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        for (const keyword of pattern.keywords) {
          if (description.includes(keyword)) {
            scores[type as ProjectType] += pattern.weight;
          }
        }
      }
    }

    // Find highest scoring type
    let maxScore = 0;
    let detectedType: ProjectType = 'unknown';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as ProjectType;
      }
    }

    // Default to full-stack if no strong match
    if (maxScore < 5) {
      return 'full-stack';
    }

    return detectedType;
  }

  /**
   * Detect features from description
   */
  private detectFeatures(description: string): DetectedFeature[] {
    const features: DetectedFeature[] = [];

    for (const [name, config] of Object.entries(FEATURE_PATTERNS)) {
      const matched = config.keywords.some((kw) => description.includes(kw));
      if (matched) {
        features.push({
          name,
          category: config.category,
          complexity: config.complexity,
          requiredAgents: config.agents,
        });
      }
    }

    return features;
  }

  /**
   * Calculate project complexity based on type and features
   */
  private calculateComplexity(type: ProjectType, features: DetectedFeature[]): ProjectComplexity {
    // Base complexity by project type
    const baseComplexity: Record<ProjectType, number> = {
      'landing-page': 1,
      'portfolio': 1,
      'blog': 2,
      'marketing-site': 2,
      'dashboard': 3,
      'e-commerce': 4,
      'saas-app': 4,
      'api-service': 3,
      'mobile-app': 4,
      'full-stack': 4,
      'unknown': 3,
    };

    // Add feature complexity
    const featureComplexity = features.reduce((sum, f) => {
      const weights = { low: 0.5, medium: 1, high: 2 };
      return sum + weights[f.complexity];
    }, 0);

    const totalComplexity = baseComplexity[type] + featureComplexity;

    if (totalComplexity <= 3) return 'simple';
    if (totalComplexity <= 6) return 'moderate';
    if (totalComplexity <= 10) return 'complex';
    return 'enterprise';
  }

  /**
   * Recommend tech stack based on project type and features
   */
  private recommendTechStack(
    type: ProjectType,
    features: DetectedFeature[],
    description: string
  ): TechStackRecommendation {
    // Default Next.js stack
    const stack: TechStackRecommendation = {
      framework: 'Next.js 15',
      styling: 'Tailwind CSS',
      database: null,
      auth: null,
      payments: null,
      hosting: 'Vercel',
      reasoning: '',
    };

    // Adjust based on project type
    switch (type) {
      case 'landing-page':
      case 'portfolio':
        stack.reasoning = 'Simple static-first approach with Next.js for optimal performance';
        break;

      case 'blog':
        stack.database = 'MDX / Contentlayer';
        stack.reasoning = 'Content-focused with MDX for rich markdown support';
        break;

      case 'e-commerce':
        stack.database = 'PostgreSQL + Prisma';
        stack.auth = 'NextAuth.js';
        stack.payments = 'Stripe';
        stack.reasoning = 'Full-featured e-commerce stack with secure payments';
        break;

      case 'saas-app':
        stack.database = 'PostgreSQL + Prisma';
        stack.auth = 'NextAuth.js / Clerk';
        stack.payments = 'Stripe';
        stack.reasoning = 'Production-ready SaaS stack with auth and billing';
        break;

      case 'dashboard':
        stack.database = 'PostgreSQL + Prisma';
        stack.auth = 'NextAuth.js';
        stack.reasoning = 'Data-intensive dashboard with charts and real-time updates';
        break;

      case 'api-service':
        stack.framework = 'Next.js API Routes / Hono';
        stack.database = 'PostgreSQL + Drizzle';
        stack.hosting = 'Vercel / Railway';
        stack.reasoning = 'API-first architecture with edge compatibility';
        break;

      default:
        stack.database = 'PostgreSQL + Prisma';
        stack.reasoning = 'Flexible full-stack setup with room to grow';
    }

    // Override based on explicit mentions in description
    if (description.includes('supabase')) {
      stack.database = 'Supabase';
      stack.auth = 'Supabase Auth';
    }
    if (description.includes('firebase')) {
      stack.database = 'Firebase / Firestore';
      stack.auth = 'Firebase Auth';
    }
    if (description.includes('clerk')) {
      stack.auth = 'Clerk';
    }
    if (description.includes('mongodb') || description.includes('mongo')) {
      stack.database = 'MongoDB + Mongoose';
    }

    return stack;
  }

  /**
   * Estimate required resources
   */
  private estimateResources(
    type: ProjectType,
    complexity: ProjectComplexity,
    features: DetectedFeature[]
  ): { agents: number; tokens: number; cost: number } {
    // Base estimates by complexity
    const baseEstimates: Record<ProjectComplexity, { agents: number; tokens: number }> = {
      simple: { agents: 8, tokens: 50000 },
      moderate: { agents: 15, tokens: 150000 },
      complex: { agents: 25, tokens: 300000 },
      enterprise: { agents: 40, tokens: 500000 },
    };

    const base = baseEstimates[complexity];

    // Add per-feature estimates
    const featureAgents = features.reduce((sum, f) => sum + f.requiredAgents.length, 0);
    const featureTokens = features.length * 20000;

    const totalAgents = base.agents + Math.ceil(featureAgents * 0.5); // Overlap factor
    const totalTokens = base.tokens + featureTokens;

    // Estimate cost (rough: $0.015 per 1K input tokens average)
    const cost = (totalTokens / 1000) * 0.015;

    return {
      agents: totalAgents,
      tokens: totalTokens,
      cost: Math.round(cost * 100) / 100,
    };
  }

  /**
   * Suggest pricing tier
   */
  private suggestTier(
    complexity: ProjectComplexity,
    estimates: { agents: number; tokens: number; cost: number }
  ): 'basic' | 'standard' | 'premium' | 'enterprise' {
    if (complexity === 'simple' && estimates.agents <= 10) return 'basic';
    if (complexity === 'moderate' && estimates.agents <= 20) return 'standard';
    if (complexity === 'complex' && estimates.agents <= 35) return 'premium';
    return 'enterprise';
  }

  /**
   * Generate warnings about the project
   */
  private generateWarnings(
    type: ProjectType,
    features: DetectedFeature[],
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
    const hasAuth = features.some((f) => f.category === 'auth');
    const hasDb = features.some((f) => f.category === 'database');

    if (['saas-app', 'e-commerce', 'dashboard'].includes(type) && !hasAuth) {
      warnings.push('Authentication not explicitly mentioned but likely required for this project type.');
    }

    if (['saas-app', 'e-commerce', 'dashboard', 'blog'].includes(type) && !hasDb) {
      warnings.push('Database not explicitly mentioned but likely required for this project type.');
    }

    // Check for vague descriptions
    if (description.length < 50) {
      warnings.push('Description is brief. More details will improve build accuracy.');
    }

    // Check for potentially conflicting requirements
    if (description.includes('simple') && features.length > 5) {
      warnings.push('Description mentions "simple" but detected features suggest moderate complexity.');
    }

    return warnings;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(type: ProjectType, features: DetectedFeature[]): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if type is strongly detected
    if (type !== 'unknown' && type !== 'full-stack') {
      confidence += 0.2;
    }

    // Higher confidence with more detected features
    if (features.length >= 3) {
      confidence += 0.15;
    }
    if (features.length >= 5) {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  /**
   * Get routing recommendation for build orchestration
   */
  getRoutingRecommendation(analysis: ProjectAnalysis): {
    useConductor: boolean;
    reason: string;
    fallbackStrategy: 'orchestrator' | 'minimal' | 'none';
  } {
    // Always use CONDUCTOR for complex projects
    if (analysis.complexity === 'complex' || analysis.complexity === 'enterprise') {
      return {
        useConductor: true,
        reason: 'Complex project benefits from CONDUCTOR orchestration and checkpoints',
        fallbackStrategy: 'orchestrator',
      };
    }

    // Use CONDUCTOR if confidence is high
    if (analysis.confidence >= 0.7) {
      return {
        useConductor: true,
        reason: 'High-confidence analysis enables optimized CONDUCTOR routing',
        fallbackStrategy: 'orchestrator',
      };
    }

    // Use CONDUCTOR for specific project types
    if (['saas-app', 'e-commerce', 'full-stack'].includes(analysis.type)) {
      return {
        useConductor: true,
        reason: `${analysis.type} projects require sophisticated orchestration`,
        fallbackStrategy: 'orchestrator',
      };
    }

    // Simple projects can use basic orchestrator
    if (analysis.complexity === 'simple') {
      return {
        useConductor: false,
        reason: 'Simple project can use standard BuildOrchestrator',
        fallbackStrategy: 'orchestrator',
      };
    }

    // Default to CONDUCTOR
    return {
      useConductor: true,
      reason: 'Default to CONDUCTOR for consistent orchestration',
      fallbackStrategy: 'orchestrator',
    };
  }
}

// Export singleton instance
export const conductorRouter = new ConductorRouter();
