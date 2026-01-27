/**
 * User Preferences Manager - Learns and applies user preferences
 *
 * Responsibilities:
 * - Store and retrieve user preferences
 * - Learn preferences from feedback
 * - Learn preferences from build choices
 * - Apply preference decay over time
 * - Calculate preference confidence
 */

import type {
  UserPreferences,
  UserFeedback,
  BuildRecord,
  IPreferencesStore,
  CodeStylePreferences,
  DesignStylePreferences,
  CommunicationStylePreferences,
  MemoryConfig,
} from './types';

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'tenantId' | 'updatedAt'> = {
  preferredTier: null,
  preferredStrategy: null,
  qualityOverSpeed: 0, // Neutral

  codeStyle: {
    framework: null,
    language: null,
    formatting: null,
    indentation: null,
    patterns: [],
    avoidPatterns: [],
    testingFramework: null,
    lintingRules: [],
  },

  designStyle: {
    colorScheme: null,
    theme: null,
    colors: [],
    primaryColors: [],
    typography: null,
    componentLibrary: null,
    iconSet: null,
    animationLevel: null,
  },

  communicationStyle: {
    verbosity: null,
    technicalLevel: null,
    techLevel: null,
    formatPreference: null,
  },

  customThresholds: {},
  toleranceForRetries: 0.5, // Moderate
  budgetSensitivity: 0.5, // Moderate

  averageRating: 0,
  totalFeedbacks: 0,
  feedbackTrend: 'stable',

  confidence: 0,
};

/**
 * User Preferences Manager
 */
export class PreferencesManager implements IPreferencesStore {
  private preferences: Map<string, UserPreferences> = new Map();
  private feedbackHistory: Map<string, UserFeedback[]> = new Map();
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async get(tenantId: string): Promise<UserPreferences | null> {
    const prefs = this.preferences.get(tenantId);
    return prefs ? { ...prefs } : null;
  }

  async save(preferences: UserPreferences): Promise<void> {
    this.preferences.set(preferences.tenantId, { ...preferences });
  }

  async update(tenantId: string, updates: Partial<UserPreferences>): Promise<void> {
    const existing = this.preferences.get(tenantId);
    if (!existing) {
      // Create new preferences with defaults
      const newPrefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        ...updates,
        tenantId,
        updatedAt: new Date(),
      };
      await this.save(newPrefs);
      return;
    }

    const updated: UserPreferences = {
      ...existing,
      ...updates,
      tenantId: existing.tenantId,
      updatedAt: new Date(),
    };

    await this.save(updated);
  }

  async delete(tenantId: string): Promise<void> {
    this.preferences.delete(tenantId);
    this.feedbackHistory.delete(tenantId);
  }

  async getOrCreate(tenantId: string): Promise<UserPreferences> {
    const existing = await this.get(tenantId);
    if (existing) return existing;

    const newPrefs: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      tenantId,
      updatedAt: new Date(),
    };

    await this.save(newPrefs);
    return newPrefs;
  }

  // ============================================================================
  // Feedback Learning
  // ============================================================================

  async recordFeedback(tenantId: string, feedback: UserFeedback): Promise<void> {
    // Store feedback history
    if (!this.feedbackHistory.has(tenantId)) {
      this.feedbackHistory.set(tenantId, []);
    }
    this.feedbackHistory.get(tenantId)!.push(feedback);

    // Get or create preferences
    const prefs = await this.getOrCreate(tenantId);

    prefs.totalFeedbacks += 1;
    const history = this.feedbackHistory.get(tenantId) || [];
    const sum = history.reduce((total, item) => total + item.rating, 0);
    prefs.averageRating = history.length > 0 ? sum / history.length : feedback.rating;

    // Update feedback trend
    prefs.feedbackTrend = this.calculateFeedbackTrend(tenantId);

    // Learn from feedback
    this.learnFromFeedback(prefs, feedback);

    // Update confidence
    prefs.confidence = this.calculateConfidence(prefs);
    prefs.updatedAt = new Date();

    await this.save(prefs);
  }

  private learnFromFeedback(prefs: UserPreferences, feedback: UserFeedback): void {
    // High rating + used output = strong positive signal
    if (feedback.rating >= 4 && feedback.usedOutput) {
      // Increase confidence in current preferences
      prefs.confidence = Math.min(1, prefs.confidence + 0.05);
    }

    // Low rating = negative signal
    if (feedback.rating <= 2) {
      // Decrease confidence, preferences may need adjustment
      prefs.confidence = Math.max(0, prefs.confidence - 0.1);
    }

    // User modified output heavily = quality/speed balance needs adjustment
    if (feedback.modifiedOutput && feedback.rating >= 3) {
      // User values quality over speed
      prefs.qualityOverSpeed = Math.min(1, prefs.qualityOverSpeed + 0.1);
    }

    // User used output without modification = current balance is good
    if (feedback.usedOutput && !feedback.modifiedOutput && feedback.rating >= 4) {
      // Reinforce current quality/speed balance
      prefs.confidence = Math.min(1, prefs.confidence + 0.03);
    }
  }

  private calculateFeedbackTrend(tenantId: string): 'improving' | 'stable' | 'declining' {
    const history = this.feedbackHistory.get(tenantId);
    if (!history || history.length < 3) return 'stable';

    // Compare recent half vs older half
    const midpoint = Math.floor(history.length / 2);
    const recent = history.slice(-midpoint);
    const older = history.slice(-history.length, -midpoint);

    const recentAvg = recent.reduce((sum, f) => sum + f.rating, 0) / recent.length;
    const olderAvg = older.reduce((sum, f) => sum + f.rating, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  // ============================================================================
  // Build Learning
  // ============================================================================

  async updateFromBuild(tenantId: string, buildRecord: BuildRecord): Promise<void> {
    const prefs = await this.getOrCreate(tenantId);

    // Learn tier preference
    if (buildRecord.status === 'completed' && buildRecord.overallQuality >= 7) {
      // Successful build with chosen tier - reinforce preference
      if (!prefs.preferredTier) {
        prefs.preferredTier = buildRecord.tier;
      } else if (prefs.preferredTier === buildRecord.tier) {
        // Consistent tier choice increases confidence
        prefs.confidence = Math.min(1, prefs.confidence + 0.02);
      }
    }

    // Learn quality/speed balance from build duration and quality
    const avgDuration = 60000; // 1 minute baseline
    const durationRatio = buildRecord.duration / avgDuration;

    if (buildRecord.overallQuality >= 8 && durationRatio > 1.5) {
      // User accepted longer build for higher quality
      prefs.qualityOverSpeed = Math.min(1, prefs.qualityOverSpeed + 0.05);
    } else if (buildRecord.overallQuality < 7 && durationRatio < 0.8) {
      // User accepted lower quality for faster build
      prefs.qualityOverSpeed = Math.max(-1, prefs.qualityOverSpeed - 0.05);
    }

    // Learn retry tolerance from build retries
    const totalRetries = Object.values(buildRecord.outputs).reduce(
      (sum, o) => sum + o.retryCount,
      0
    );
    const avgRetries = totalRetries / Object.keys(buildRecord.outputs).length;

    if (buildRecord.status === 'completed') {
      if (avgRetries > 2) {
        // User was patient with retries for successful outcome
        prefs.toleranceForRetries = Math.min(1, prefs.toleranceForRetries + 0.05);
      } else if (avgRetries < 1) {
        // Build succeeded with few retries
        prefs.toleranceForRetries = Math.max(0, prefs.toleranceForRetries - 0.02);
      }
    }

    // Learn budget sensitivity from cost
    const avgCost = 0.5; // $0.50 baseline
    const costRatio = buildRecord.costUSD / avgCost;

    if (costRatio > 2 && buildRecord.overallQuality >= 8) {
      // User accepted higher cost for quality
      prefs.budgetSensitivity = Math.max(0, prefs.budgetSensitivity - 0.05);
    } else if (costRatio < 0.5) {
      // User chose lower cost option
      prefs.budgetSensitivity = Math.min(1, prefs.budgetSensitivity + 0.05);
    }

    // Extract code style preferences from outputs
    this.extractCodeStylePreferences(prefs, buildRecord);

    // Update confidence
    prefs.confidence = this.calculateConfidence(prefs);
    prefs.updatedAt = new Date();

    await this.save(prefs);
  }

  private extractCodeStylePreferences(prefs: UserPreferences, buildRecord: BuildRecord): void {
    // This would analyze build outputs to extract code patterns
    // For now, we'll use tags as hints

    for (const tag of buildRecord.tags) {
      const tagLower = tag.toLowerCase();

      // Framework detection
      if (['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'].includes(tagLower)) {
        if (!prefs.codeStyle.framework) {
          prefs.codeStyle.framework = tag;
        }
      }

      // Language detection
      if (['typescript', 'javascript', 'python', 'go', 'rust'].includes(tagLower)) {
        if (!prefs.codeStyle.language) {
          prefs.codeStyle.language = tag;
        }
      }

      // Testing framework detection
      if (['jest', 'vitest', 'mocha', 'pytest', 'playwright'].includes(tagLower)) {
        if (!prefs.codeStyle.testingFramework) {
          prefs.codeStyle.testingFramework = tag;
        }
      }

      // UI library detection
      if (['tailwind', 'chakra', 'material-ui', 'shadcn', 'radix'].includes(tagLower)) {
        if (!prefs.designStyle.componentLibrary) {
          prefs.designStyle.componentLibrary = tag;
        }
      }
    }
  }

  // ============================================================================
  // Confidence Calculation
  // ============================================================================

  private calculateConfidence(prefs: UserPreferences): number {
    let score = 0;
    let factors = 0;

    // Feedback count contributes to confidence
    if (prefs.totalFeedbacks > 0) {
      const feedbackScore = Math.min(1, prefs.totalFeedbacks / 10);
      score += feedbackScore;
      factors += 1;
    }

    // Tier preference set
    if (prefs.preferredTier) {
      score += 0.5;
      factors += 1;
    }

    // Strategy preference set
    if (prefs.preferredStrategy) {
      score += 0.5;
      factors += 1;
    }

    // Code style preferences set
    const codeStyleSet = [
      prefs.codeStyle.framework,
      prefs.codeStyle.language,
      prefs.codeStyle.testingFramework,
    ].filter(Boolean).length;
    if (codeStyleSet > 0) {
      score += codeStyleSet / 3;
      factors += 1;
    }

    // Design style preferences set
    const designStyleSet = [
      prefs.designStyle.colorScheme,
      prefs.designStyle.componentLibrary,
      prefs.designStyle.animationLevel,
    ].filter(Boolean).length;
    if (designStyleSet > 0) {
      score += designStyleSet / 3;
      factors += 1;
    }

    // Average rating above 3.5 increases confidence
    if (prefs.averageRating > 0) {
      const ratingScore = Math.max(0, (prefs.averageRating - 2.5) / 2.5);
      score += ratingScore;
      factors += 1;
    }

    // Apply time decay to confidence
    const daysSinceUpdate = (Date.now() - prefs.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.max(0.5, 1 - daysSinceUpdate / this.config.preferenceDecayDays);

    const rawConfidence = factors > 0 ? score / factors : 0;
    return Math.min(1, rawConfidence * decayFactor);
  }

  // ============================================================================
  // Preference Application
  // ============================================================================

  /**
   * Get recommended settings based on user preferences
   */
  async getRecommendations(tenantId: string): Promise<PreferenceRecommendations> {
    const prefs = await this.get(tenantId);
    if (!prefs) {
      return { hasPreferences: false, recommendations: {} };
    }

    const recommendations: Record<string, unknown> = {};

    // Tier recommendation
    if (prefs.preferredTier && prefs.confidence >= 0.5) {
      recommendations.tier = prefs.preferredTier;
    }

    // Strategy recommendation
    if (prefs.preferredStrategy && prefs.confidence >= 0.5) {
      recommendations.strategy = prefs.preferredStrategy;
    }

    // Quality threshold recommendation based on quality/speed balance
    if (prefs.qualityOverSpeed > 0.3) {
      recommendations.qualityThreshold = 7.5; // Higher quality
    } else if (prefs.qualityOverSpeed < -0.3) {
      recommendations.qualityThreshold = 6; // Accept lower quality for speed
    } else {
      recommendations.qualityThreshold = 7; // Default
    }

    // Retry recommendation
    if (prefs.toleranceForRetries > 0.7) {
      recommendations.maxRetries = 4;
    } else if (prefs.toleranceForRetries < 0.3) {
      recommendations.maxRetries = 2;
    } else {
      recommendations.maxRetries = 3;
    }

    // Framework recommendation
    if (prefs.codeStyle.framework) {
      recommendations.framework = prefs.codeStyle.framework;
    }

    // UI library recommendation
    if (prefs.designStyle.componentLibrary) {
      recommendations.componentLibrary = prefs.designStyle.componentLibrary;
    }

    return {
      hasPreferences: true,
      confidence: prefs.confidence,
      suggestedTier: prefs.preferredTier ?? undefined,
      suggestedStrategy: prefs.preferredStrategy ?? undefined,
      recommendations,
    };
  }

  /**
   * Check if user prefers quality over speed
   */
  async prefersQuality(tenantId: string): Promise<boolean> {
    const prefs = await this.get(tenantId);
    return prefs ? prefs.qualityOverSpeed > 0.2 : false;
  }

  /**
   * Check if user is budget sensitive
   */
  async isBudgetSensitive(tenantId: string): Promise<boolean> {
    const prefs = await this.get(tenantId);
    return prefs ? prefs.budgetSensitivity > 0.6 : false;
  }

  /**
   * Check if user tolerates retries
   */
  async toleratesRetries(tenantId: string): Promise<boolean> {
    const prefs = await this.get(tenantId);
    return prefs ? prefs.toleranceForRetries > 0.5 : true;
  }

  // ============================================================================
  // Manual Preference Setting
  // ============================================================================

  async setTierPreference(tenantId: string, tier: UserPreferences['preferredTier']): Promise<void> {
    await this.update(tenantId, { preferredTier: tier });
  }

  async setStrategyPreference(
    tenantId: string,
    strategy: UserPreferences['preferredStrategy']
  ): Promise<void> {
    await this.update(tenantId, { preferredStrategy: strategy });
  }

  async setCodeStyle(tenantId: string, codeStyle: Partial<CodeStylePreferences>): Promise<void> {
    await this.setCodeStylePreferences(tenantId, codeStyle);
  }

  async setCodeStylePreferences(
    tenantId: string,
    codeStyle: Partial<CodeStylePreferences>
  ): Promise<void> {
    const prefs = await this.getOrCreate(tenantId);
    const updated: CodeStylePreferences = {
      ...prefs.codeStyle,
      ...codeStyle,
    };
    await this.update(tenantId, { codeStyle: updated });
  }

  async setDesignStylePreferences(
    tenantId: string,
    designStyle: Partial<DesignStylePreferences>
  ): Promise<void> {
    const prefs = await this.getOrCreate(tenantId);
    const updated: DesignStylePreferences = {
      ...prefs.designStyle,
      ...designStyle,
    };
    await this.update(tenantId, { designStyle: updated });
  }

  async setCommunicationStylePreferences(
    tenantId: string,
    commStyle: Partial<CommunicationStylePreferences>
  ): Promise<void> {
    const prefs = await this.getOrCreate(tenantId);
    const updated: CommunicationStylePreferences = {
      ...prefs.communicationStyle,
      ...commStyle,
    };
    await this.update(tenantId, { communicationStyle: updated });
  }

  async setCustomThreshold(tenantId: string, key: string, value: number): Promise<void> {
    const prefs = await this.getOrCreate(tenantId);
    const thresholds = { ...prefs.customThresholds, [key]: value };
    await this.update(tenantId, { customThresholds: thresholds });
  }

  async setQualityThreshold(tenantId: string, dimension: string, threshold: number): Promise<void> {
    await this.setCustomThreshold(tenantId, dimension, threshold);
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async count(): Promise<number> {
    return this.preferences.size;
  }

  async clear(): Promise<void> {
    this.preferences.clear();
    this.feedbackHistory.clear();
  }

  async getAllTenantIds(): Promise<string[]> {
    return Array.from(this.preferences.keys());
  }

  async getFeedbackHistory(tenantId: string): Promise<UserFeedback[]> {
    return this.feedbackHistory.get(tenantId) || [];
  }

  async getStatistics(): Promise<{
    totalTenants: number;
    avgConfidence: number;
    avgRating: number;
    tierDistribution: Record<string, number>;
    strategyDistribution: Record<string, number>;
  }> {
    const allPrefs = Array.from(this.preferences.values());

    const tierDistribution: Record<string, number> = {};
    const strategyDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let totalRating = 0;
    let tenantsWithRating = 0;

    for (const prefs of allPrefs) {
      if (prefs.preferredTier) {
        tierDistribution[prefs.preferredTier] = (tierDistribution[prefs.preferredTier] || 0) + 1;
      }
      if (prefs.preferredStrategy) {
        strategyDistribution[prefs.preferredStrategy] =
          (strategyDistribution[prefs.preferredStrategy] || 0) + 1;
      }
      totalConfidence += prefs.confidence;
      if (prefs.averageRating > 0) {
        totalRating += prefs.averageRating;
        tenantsWithRating += 1;
      }
    }

    return {
      totalTenants: allPrefs.length,
      avgConfidence: allPrefs.length > 0 ? totalConfidence / allPrefs.length : 0,
      avgRating: tenantsWithRating > 0 ? totalRating / tenantsWithRating : 0,
      tierDistribution,
      strategyDistribution,
    };
  }
}

// ============================================================================
// Types
// ============================================================================

export interface PreferenceRecommendations {
  hasPreferences: boolean;
  confidence?: number;
  suggestedTier?: UserPreferences['preferredTier'];
  suggestedStrategy?: UserPreferences['preferredStrategy'];
  recommendations: Record<string, unknown>;
}
