/**
 * OLYMPUS 2.0 - Cognitive Engine
 *
 * The intelligence core of the cognitive session system.
 * Extracts learnings, detects expertise, generates predictions,
 * and provides personalized context for agent execution.
 */

import type {
  CognitiveSession,
  BuildRecord,
  Learning,
  Prediction,
  EvolutionRecord,
  ExpertiseDetection,
  EvolutionSummary,
  SessionPatterns,
  PreferenceEntry,
} from './types';

import {
  MIN_BUILDS_FOR_EXPERTISE,
  ADVANCED_SUCCESS_RATE,
  EXPERT_SUCCESS_RATE,
  EXPERT_MIN_BUILDS,
  MIN_BUILDS_FOR_PATTERNS,
  PATTERN_WINDOW_SIZE,
  LEARNING_SIMILARITY_THRESHOLD,
  DEFAULT_PREDICTION_EXPIRY_MS,
  MAX_PREDICTIONS,
  MIN_PREDICTION_CONFIDENCE,
} from './constants';

/**
 * COGNITIVE ENGINE
 *
 * Processes session data to extract learnings, detect patterns,
 * and generate predictions about user behavior and preferences.
 */
export class CognitiveEngine {
  private session: CognitiveSession;

  constructor(session: CognitiveSession) {
    this.session = session;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract learnings from a completed build
   */
  extractLearnings(build: BuildRecord): Learning[] {
    const learnings: Learning[] = [];
    const now = new Date();

    // Learn from success/failure
    if (build.success) {
      learnings.push({
        id: `learning_success_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'success',
        category: 'build',
        subject: build.buildType,
        learning: `Successfully built ${build.buildType} with stack: ${Object.keys(build.stack).join(', ')}`,
        evidence: [{ buildId: build.id, outcome: 'success', weight: 1.0 }],
        confidence: 0.7,
        relevance: 1.0,
        learnedAt: now,
        applicationCount: 0,
      });
    } else {
      learnings.push({
        id: `learning_failure_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'failure',
        category: 'build',
        subject: build.buildType,
        learning: `Failed to build ${build.buildType} with stack: ${Object.keys(build.stack).join(', ')}`,
        evidence: [{ buildId: build.id, outcome: 'failure', weight: 1.0 }],
        confidence: 0.8,
        relevance: 1.0,
        learnedAt: now,
        applicationCount: 0,
      });
    }

    // Learn stack preferences from repeated usage
    for (const [key, value] of Object.entries(build.stack)) {
      const sameStackBuilds = this.session.builds.filter(
        (b: BuildRecord) => b.stack[key] === value
      );
      if (sameStackBuilds.length >= 3) {
        learnings.push({
          id: `learning_pref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'preference',
          category: 'stack',
          subject: key,
          learning: `User consistently uses ${String(value)} for ${key} (${sameStackBuilds.length} times)`,
          evidence: sameStackBuilds.map((b: BuildRecord) => ({
            buildId: b.id,
            outcome: 'preference',
            weight: 0.5,
          })),
          confidence: Math.min(0.95, 0.5 + sameStackBuilds.length * 0.1),
          relevance: 1.0,
          learnedAt: now,
          applicationCount: 0,
        });
      }
    }

    return learnings;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze build patterns from session history
   */
  analyzePatterns(): SessionPatterns {
    const builds = this.session.builds;
    const recent = builds.slice(-PATTERN_WINDOW_SIZE);

    if (builds.length < MIN_BUILDS_FOR_PATTERNS) {
      return this.session.patterns;
    }

    const successfulBuilds = recent.filter((b: BuildRecord) => b.success);
    const avgBuildTime =
      recent.length > 0
        ? recent.reduce((sum: number, b: BuildRecord) => sum + b.totalDuration, 0) / recent.length
        : 0;

    const avgAgents =
      recent.length > 0
        ? recent.reduce(
            (sum: number, b: BuildRecord) => sum + b.phases.reduce((s, p) => s + p.agents.length, 0),
            0
          ) / recent.length
        : 0;

    // Detect preferred build tier from recent builds
    const tierCounts: Record<string, number> = {};
    for (const build of recent) {
      const tier = this.inferBuildTier(build);
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
    const preferredTier = Object.entries(tierCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] ?? 'starter';

    // Detect peak hours
    const hourCounts: Record<number, number> = {};
    for (const build of builds) {
      const hour = new Date(build.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour, 10));

    // Iteration patterns
    const buildsWithIterations = recent.filter(
      (b: BuildRecord) => b.iterations !== undefined && b.iterations > 0
    );
    const avgIterations =
      buildsWithIterations.length > 0
        ? buildsWithIterations.reduce((sum: number, b: BuildRecord) => sum + (b.iterations || 0), 0) /
          buildsWithIterations.length
        : 0;

    const iterationTypes: Record<string, number> = {};
    for (const build of buildsWithIterations) {
      for (const type of build.iterationTypes ?? []) {
        iterationTypes[type] = (iterationTypes[type] || 0) + 1;
      }
    }
    const commonIterationTypes = Object.entries(iterationTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    return {
      buildPatterns: {
        averageBuildTime: avgBuildTime,
        averageAgentsUsed: avgAgents,
        preferredBuildTier: preferredTier,
        peakProductivityHours: peakHours,
        averageSessionDuration: this.session.patterns.buildPatterns.averageSessionDuration,
        buildsPerSession: this.session.patterns.buildPatterns.buildsPerSession,
      },
      iterationPatterns: {
        averageIterationsPerBuild: avgIterations,
        commonIterationTypes,
        iterationSuccessRate:
          buildsWithIterations.length > 0
            ? buildsWithIterations.filter((b: BuildRecord) => b.success).length /
              buildsWithIterations.length
            : 0,
      },
      featureUsage: this.session.patterns.featureUsage,
      errorPatterns: this.session.patterns.errorPatterns,
      decisionPatterns: this.session.patterns.decisionPatterns,
    };
  }

  private inferBuildTier(build: BuildRecord): string {
    const phases = build.phases.length;
    const agents = build.phases.reduce((s, p) => s + p.agents.length, 0);

    if (agents > 10 || phases > 5) return 'enterprise';
    if (agents > 5 || phases > 3) return 'professional';
    if (agents > 2) return 'standard';
    return 'starter';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERTISE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect user expertise level from build history
   */
  async detectExpertise(): Promise<ExpertiseDetection> {
    const builds = this.session.builds;
    const signals: string[] = [];

    if (builds.length < MIN_BUILDS_FOR_EXPERTISE) {
      return {
        level: this.session.identity.expertiseLevel,
        confidence: 0.1,
        signals: ['insufficient_data'],
      };
    }

    const successRate =
      builds.filter((b: BuildRecord) => b.success).length / builds.length;
    const avgComplexity =
      builds.reduce((sum: number, b: BuildRecord) => sum + b.phases.length, 0) / builds.length;
    const usesAdvancedFeatures =
      this.session.patterns.featureUsage.usesTests ||
      this.session.patterns.featureUsage.usesCi;

    // Determine level
    let level = this.session.identity.expertiseLevel;
    let confidence = 0.5;

    if (builds.length >= EXPERT_MIN_BUILDS && successRate >= EXPERT_SUCCESS_RATE) {
      level = 'expert';
      confidence = 0.9;
      signals.push('high_success_rate', 'many_builds');
    } else if (successRate >= ADVANCED_SUCCESS_RATE && avgComplexity > 3) {
      level = 'advanced';
      confidence = 0.8;
      signals.push('good_success_rate', 'complex_builds');
    } else if (successRate >= 0.6) {
      level = 'intermediate';
      confidence = 0.7;
      signals.push('moderate_success_rate');
    } else {
      level = 'beginner';
      confidence = 0.6;
      signals.push('low_success_rate');
    }

    if (usesAdvancedFeatures) {
      signals.push('uses_advanced_features');
      confidence = Math.min(1, confidence + 0.1);
    }

    return { level, confidence, signals };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREDICTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate predictions about user's next actions
   */
  generatePredictions(): Prediction[] {
    const predictions: Prediction[] = [];
    const now = new Date();
    const expiry = new Date(now.getTime() + DEFAULT_PREDICTION_EXPIRY_MS);
    const builds = this.session.builds;

    if (builds.length < MIN_BUILDS_FOR_PATTERNS) {
      return this.session.predictions;
    }

    // Predict next build type
    const typeCounts: Record<string, number> = {};
    for (const build of builds.slice(-10)) {
      typeCounts[build.buildType] = (typeCounts[build.buildType] || 0) + 1;
    }
    const topType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];
    if (topType) {
      const confidence = topType[1] / Math.min(builds.length, 10);
      if (confidence >= MIN_PREDICTION_CONFIDENCE) {
        predictions.push({
          id: `pred_type_${Date.now()}`,
          type: 'next_build_type',
          description: `User will likely build a ${topType[0]} next`,
          confidence,
          createdAt: now,
          expiresAt: expiry,
          data: { buildType: topType[0] },
        });
      }
    }

    // Predict stack choices
    const stackChoices: Record<string, Record<string, number>> = {};
    for (const build of builds.slice(-10)) {
      for (const [key, value] of Object.entries(build.stack)) {
        if (!stackChoices[key]) stackChoices[key] = {};
        const strVal = String(value);
        stackChoices[key][strVal] = (stackChoices[key][strVal] || 0) + 1;
      }
    }

    for (const [category, choices] of Object.entries(stackChoices)) {
      const top = Object.entries(choices).sort(([, a], [, b]) => b - a)[0];
      if (top) {
        const confidence = top[1] / Math.min(builds.length, 10);
        if (confidence >= MIN_PREDICTION_CONFIDENCE) {
          predictions.push({
            id: `pred_stack_${category}_${Date.now()}`,
            type: 'stack_choice',
            description: `User will likely choose ${top[0]} for ${category}`,
            confidence,
            createdAt: now,
            expiresAt: expiry,
            data: { category, value: top[0] },
          });
        }
      }
    }

    return predictions.slice(0, MAX_PREDICTIONS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate rich context for agent execution
   */
  generateAgentContext(): Record<string, unknown> {
    return {
      expertise: {
        level: this.session.identity.expertiseLevel,
        confidence: this.session.identity.expertiseConfidence,
        domains: this.session.identity.domainExpertise,
      },
      communication: this.session.identity.communicationStyle,
      patterns: {
        preferredTier: this.session.patterns.buildPatterns.preferredBuildTier,
        avgBuildTime: this.session.patterns.buildPatterns.averageBuildTime,
        featureUsage: this.session.patterns.featureUsage,
      },
      recentLearnings: this.session.learnings
        .filter((l: Learning) => l.confidence > 0.5)
        .sort((a: Learning, b: Learning) => b.relevance - a.relevance)
        .slice(0, 5)
        .map((l: Learning) => l.learning),
      predictions: this.session.predictions
        .filter((p: Prediction) => p.expiresAt > new Date())
        .slice(0, 3),
      totalBuilds: this.session.identity.totalBuilds,
      successRate:
        this.session.builds.length > 0
          ? this.session.builds.filter((b: BuildRecord) => b.success).length /
            this.session.builds.length
          : 0,
    };
  }

  /**
   * Generate personalized prompt addition
   */
  generatePersonalizedPrompt(): string {
    const { identity, patterns } = this.session;
    const parts: string[] = [];

    // Expertise-based guidance
    if (identity.expertiseLevel === 'beginner') {
      parts.push('Explain concepts clearly. Provide step-by-step guidance.');
    } else if (identity.expertiseLevel === 'expert') {
      parts.push('Be concise. Skip basic explanations. Focus on advanced details.');
    }

    // Communication style
    const style = identity.communicationStyle;
    if (style.verbosity === 'minimal') {
      parts.push('Keep responses brief.');
    } else if (style.verbosity === 'detailed') {
      parts.push('Provide comprehensive explanations.');
    }

    if (style.responseFormat === 'code-first') {
      parts.push('Lead with code examples.');
    }

    // Pattern-based additions
    if (patterns.featureUsage.usesTests) {
      parts.push('Include test examples when relevant.');
    }

    // Domain expertise
    const topDomains = identity.domainExpertise
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 3)
      .map(d => d.domain);
    if (topDomains.length > 0) {
      parts.push(`User has expertise in: ${topDomains.join(', ')}.`);
    }

    return parts.join(' ');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update preference confidence based on build outcome
   */
  updatePreferenceFromOutcome(
    category: string,
    key: string,
    outcome: 'success' | 'failure'
  ): void {
    const prefs = this.session.preferences as Record<string, Record<string, PreferenceEntry>>;
    if (!prefs[category]?.[key]) return;

    const pref = prefs[category][key];
    if (outcome === 'success') {
      pref.confidence = Math.min(1, pref.confidence + 0.05);
      pref.usageCount++;
    } else {
      pref.confidence = Math.max(0, pref.confidence - 0.1);
    }
    pref.lastUsed = new Date();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVOLUTION TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record an evolution event
   */
  recordEvolution(
    type: string,
    oldValue: unknown,
    newValue: unknown,
    description: string,
    impactScore: number
  ): void {
    this.session.evolution.push({
      id: `evo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date(),
      oldValue,
      newValue,
      description,
      impactScore,
    });
  }

  /**
   * Get evolution summary
   */
  getEvolutionSummary(): EvolutionSummary {
    const evolution = this.session.evolution;
    const recent = evolution.slice(-20);

    const categories: Record<string, number> = {};
    for (const record of evolution) {
      categories[record.type] = (categories[record.type] || 0) + 1;
    }

    const netImpact = recent.reduce((sum, r) => sum + r.impactScore, 0);

    return {
      totalChanges: evolution.length,
      recentChanges: recent,
      netImpact,
      categories,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Consolidate duplicate/similar learnings
   */
  consolidateLearnings(): void {
    const learnings = this.session.learnings;
    if (learnings.length < 2) return;

    const merged: Learning[] = [];
    const used = new Set<number>();

    for (let i = 0; i < learnings.length; i++) {
      if (used.has(i)) continue;

      const current = learnings[i];
      let bestConfidence = current.confidence;
      let bestRelevance = current.relevance;
      let totalApplications = current.applicationCount;
      const allEvidence = [...current.evidence];

      for (let j = i + 1; j < learnings.length; j++) {
        if (used.has(j)) continue;

        const other = learnings[j];
        if (
          current.category === other.category &&
          current.subject === other.subject &&
          this.stringSimilarity(current.learning, other.learning) >= LEARNING_SIMILARITY_THRESHOLD
        ) {
          used.add(j);
          bestConfidence = Math.max(bestConfidence, other.confidence);
          bestRelevance = Math.max(bestRelevance, other.relevance);
          totalApplications += other.applicationCount;
          allEvidence.push(...other.evidence);
        }
      }

      merged.push({
        ...current,
        confidence: bestConfidence,
        relevance: bestRelevance,
        applicationCount: totalApplications,
        evidence: allEvidence.slice(0, 20),
      });
    }

    this.session.learnings = merged;
  }

  /**
   * Simple string similarity (Jaccard on word sets)
   */
  private stringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 1 : intersection / union;
  }
}
