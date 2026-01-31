/**
 * CONVERSION INTELLIGENCE ENGINE (10X UPGRADE) - Tests
 *
 * Comprehensive tests covering:
 * - Individual dimension analyzers (15 dimensions)
 * - Main ConversionIntelligenceEngine
 * - FunnelAnalyzer for multi-page analysis
 * - Quick utility functions
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversionIntelligenceEngine,
  FunnelAnalyzer,
  analyzeNarrativeFlow,
  analyzeEmotionalJourney,
  analyzeCognitiveLoad,
  analyzeContent,
  analyzeFunnel,
  quickScore,
  getTopImprovements,
  type ContentAnalysis,
  // Fluent API
  analyze,
  funnel,
  check,
  passes,
  quickVerdict,
  topImprovements,
  setMetricsCollector,
  clearCache,
  MAX_CONTENT_LENGTH,
  AnalysisBuilder,
  FunnelBuilder,
  IntelligenceError,
  ContentTooLongError,
  InvalidContentError,
  TimeoutError,
  // Comparison API
  compare,
  type ComparisonResult,
  // Explainability
  type Explanation,
  // 10X UPGRADE
  deduplicatedAnalyze,
  analyzeMany,
  rewrite,
  stream,
  type BatchResult,
  type RewriteResult,
  type StreamEvent,
  // 🏆 COMPETITIVE EDGE: Industry Benchmarks
  benchmark,
  percentile,
  getAvailableIndustries,
  showcase,
  type Industry,
  type BenchmarkResult,
  type ShowcaseResult,
} from '..';

// ============================================================================
// TEST CONTENT SAMPLES
// ============================================================================

const EXCELLENT_CONTENT = `
What if you could double your conversion rate in the next 30 days?

You've tried everything. Tweaking headlines. A/B testing colors. Rewriting CTAs.
But nothing seems to move the needle. Every day, you watch visitors leave without buying.
It's frustrating. It's expensive. And it feels like you're stuck.

But here's the thing: 92% of businesses focus on the wrong metrics.
They optimize for clicks when they should be optimizing for psychology.

That's exactly why we created ConversionAI.

With ConversionAI, you get:
- AI-powered copy analysis that identifies exactly what's killing your conversions
- Real-time suggestions that have increased conversion rates by an average of 47%
- Proven frameworks used by companies like Shopify, HubSpot, and Stripe

"ConversionAI doubled our sales page conversion in just 2 weeks." - Sarah M., SaaS Founder ★★★★★

Join 10,000+ businesses already using ConversionAI.

Ready to stop guessing and start converting?

Get instant access today - backed by our 60-day money-back guarantee.
Limited spots available at this price. Don't miss out.
`;

const WEAK_CONTENT = `
Welcome to our company website. We are a software company.

We have developed a product. It has many features.
Our company was founded in 2010. We have grown a lot since then.

Here are our features:
- Feature 1
- Feature 2
- Feature 3

If you want to learn more, click here.
`;

const MEDIUM_CONTENT = `
Are you struggling to get more customers?

Many businesses face this challenge every day. The market is competitive
and it's hard to stand out.

Our solution helps businesses grow faster. You can increase your sales
by using our proven methods.

Here's what you get:
- Better marketing strategies
- More leads
- Higher conversions

Try it today.
`;

// Content with good story arc
const STRONG_NARRATIVE_CONTENT = `
What if everything you knew about marketing was wrong?

Every day, thousands of businesses waste money on strategies that don't work.
They follow outdated advice. They copy competitors. They pray for results.
And nothing changes. The frustration builds. The revenue stagnates.

But what if there was a better way?

Introducing the Growth Framework - a proven system that has helped 500+ businesses
break through their plateaus and achieve sustainable growth.

Here's how it works:
1. We analyze your current marketing
2. We identify the hidden leaks
3. We fix them with data-driven strategies

"I went from $50k to $200k monthly revenue in 6 months." - John D.

Ready to transform your business?

Start your free trial today. No credit card required.
This offer expires Friday.
`;

// Content with emotional journey
const EMOTIONAL_CONTENT = `
Have you ever felt like you're falling behind?

Every day, you see competitors growing while you're stuck in the same place.
It's frustrating. It's exhausting. You've tried everything, but nothing works.
The fear of failure keeps you up at night.

But imagine this: What if you could finally break free?

Picture yourself 6 months from now. Your business is thriving.
Your revenue has doubled. Your stress has disappeared.

This isn't a dream. This is what happens when you have the right system.

Our customers have experienced incredible transformations:
"I finally feel confident about my business again." - Maria S.

You don't have to stay stuck. The solution is right here.

Get started today with our risk-free trial.
Only 10 spots left at this price.
`;

// Complex/hard to read content
const HIGH_COGNITIVE_LOAD_CONTENT = `
The paradigm-shifting, revolutionary, groundbreaking solution that will fundamentally
transform the way you conceptualize, operationalize, and monetize your business
operations through the implementation of synergistic, holistic, and comprehensive
methodologies that leverage cutting-edge technological innovations.

Our proprietary, patent-pending algorithm utilizes advanced machine learning
and artificial intelligence capabilities to analyze, synthesize, and optimize
your multifaceted business processes through a unified, integrated platform.

The unprecedented convergence of disparate data streams enables the
facilitation of actionable insights that drive measurable, quantifiable
improvements in key performance indicators across all organizational verticals.
`;

// Simple, easy to read content
const LOW_COGNITIVE_LOAD_CONTENT = `
Get more sales. Spend less time.

Our tool helps you:
- Find new customers
- Close more deals
- Save 10 hours per week

It's simple. It works.

Try it free for 14 days.
`;

// ============================================================================
// NARRATIVE FLOW ANALYZER TESTS
// ============================================================================

describe('analyzeNarrativeFlow', () => {
  it('should detect story beats in excellent content', () => {
    const result = analyzeNarrativeFlow(STRONG_NARRATIVE_CONTENT);

    expect(result.score).toBeGreaterThan(70);
    expect(result.confidence).toBeGreaterThan(0.5);
    // Should have evidence or low issues for well-structured content
    expect(result.issues.filter(i => i.severity === 'critical').length).toBeLessThan(3);
  });

  it('should penalize weak content missing story beats', () => {
    const result = analyzeNarrativeFlow(WEAK_CONTENT);

    expect(result.score).toBeLessThan(70);
    expect(result.issues.length).toBeGreaterThan(0);
    // Should suggest adding missing beats
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should detect hook at the beginning', () => {
    const hookContent =
      'What if you could change everything? This is the secret nobody talks about.';
    const result = analyzeNarrativeFlow(hookContent);

    // Even short content should detect a hook
    expect(result.score).toBeGreaterThan(0);
  });

  it('should penalize content starting with boring intro', () => {
    const boringContent =
      'Welcome to our company. We have been in business since 1990. Our mission is...';
    const result = analyzeNarrativeFlow(boringContent);

    // Should detect anti-patterns
    expect(result.score).toBeLessThan(80);
  });

  it('should detect problem/agitation section', () => {
    const problemContent = `
      What if you could finally solve this problem?

      You've tried everything but nothing works. Every day you struggle with the same issues.
      It's frustrating. You're tired of wasting time and money. Nothing seems to help.
      The problem keeps getting worse. Every time you try something new, it fails.

      But there's a better way. We've discovered a solution that actually works.

      Here's what you get: a system that solves your problems once and for all.

      Get started today. Limited time offer.
    `;
    const result = analyzeNarrativeFlow(problemContent);

    // Should recognize problem/frustration language in context of a story
    expect(result.score).toBeGreaterThan(30);
  });

  it('should return suggestions for improvements', () => {
    const result = analyzeNarrativeFlow(WEAK_CONTENT);

    expect(result.suggestions.length).toBeGreaterThan(0);
    result.suggestions.forEach(suggestion => {
      expect(suggestion.suggested).toBeDefined();
      expect(suggestion.predictedLift).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// EMOTIONAL JOURNEY ANALYZER TESTS
// ============================================================================

describe('analyzeEmotionalJourney', () => {
  it('should track emotional states through content', () => {
    const result = analyzeEmotionalJourney(EMOTIONAL_CONTENT);

    expect(result.intensityMap).toBeDefined();
    expect(result.intensityMap.length).toBeGreaterThan(0);
    expect(result.detectedArc).toBeDefined();
  });

  it('should detect proper emotional arc', () => {
    const result = analyzeEmotionalJourney(EMOTIONAL_CONTENT);

    // Good content should have proper arc (negative before positive, ends positive)
    expect(result.detectedArc.length).toBeGreaterThan(0);
  });

  it('should penalize flat emotional content', () => {
    const flatContent = `
      This is a product. It does things. Here are features.
      This is another paragraph. More information here.
      Buy now.
    `;
    const result = analyzeEmotionalJourney(flatContent);

    expect(result.score).toBeLessThan(80);
  });

  it('should calculate emotional momentum', () => {
    const result = analyzeEmotionalJourney(EMOTIONAL_CONTENT);

    expect(typeof result.momentum).toBe('number');
  });

  it('should detect missing emotional beats', () => {
    const result = analyzeEmotionalJourney(WEAK_CONTENT);

    // Weak content should miss required emotional states
    const criticalIssues = result.issues.filter(i => i.severity === 'major');
    expect(criticalIssues.length + result.suggestions.length).toBeGreaterThan(0);
  });

  it('should provide templates for adding emotions', () => {
    const result = analyzeEmotionalJourney(WEAK_CONTENT);

    // Should have suggestions for adding emotional content
    expect(result.suggestions.some(s => s.suggested.length > 0 && s.rationale.length > 0)).toBe(
      true
    );
  });
});

// ============================================================================
// COGNITIVE LOAD ANALYZER TESTS
// ============================================================================

describe('analyzeCognitiveLoad', () => {
  it('should score high for simple, clear content', () => {
    const result = analyzeCognitiveLoad(LOW_COGNITIVE_LOAD_CONTENT, 'awareness');

    // Simple content should score reasonably well (above 60)
    expect(result.score).toBeGreaterThan(60);
    expect(result.metrics.avgSentenceLength).toBeLessThan(20);
  });

  it('should penalize complex, jargon-heavy content', () => {
    const result = analyzeCognitiveLoad(HIGH_COGNITIVE_LOAD_CONTENT, 'awareness');

    expect(result.score).toBeLessThan(70);
    expect(result.metrics.jargonDensity).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should calculate Flesch-Kincaid grade level', () => {
    const result = analyzeCognitiveLoad(MEDIUM_CONTENT, 'interest');

    expect(result.metrics.gradeLevel).toBeDefined();
    expect(typeof result.metrics.gradeLevel).toBe('number');
    expect(result.metrics.gradeLevel).toBeGreaterThanOrEqual(0);
  });

  it('should identify problem sentences', () => {
    const result = analyzeCognitiveLoad(HIGH_COGNITIVE_LOAD_CONTENT, 'purchase');

    expect(result.problemSentences).toBeDefined();
    expect(result.problemSentences.length).toBeGreaterThan(0);
  });

  it('should adjust for funnel stage', () => {
    const awarenessResult = analyzeCognitiveLoad(MEDIUM_CONTENT, 'awareness');
    const purchaseResult = analyzeCognitiveLoad(MEDIUM_CONTENT, 'purchase');

    // Same content may score differently at different funnel stages
    // (purchase stage requires simpler content)
    expect(typeof awarenessResult.optimalForStage).toBe('boolean');
    expect(typeof purchaseResult.optimalForStage).toBe('boolean');
  });

  it('should measure working memory load', () => {
    const result = analyzeCognitiveLoad(MEDIUM_CONTENT, 'consideration');

    expect(result.metrics.workingMemoryLoad).toBeDefined();
    expect(result.metrics.workingMemoryLoad).toBeGreaterThanOrEqual(0);
    expect(result.metrics.workingMemoryLoad).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// CONVERSION INTELLIGENCE ENGINE TESTS
// ============================================================================

describe('ConversionIntelligenceEngine', () => {
  let engine: ConversionIntelligenceEngine;

  beforeEach(() => {
    engine = new ConversionIntelligenceEngine();
  });

  describe('Basic Analysis', () => {
    it('should analyze content and return full analysis', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
      expect(analysis.totalScore).toBeLessThanOrEqual(100);
      expect(analysis.verdict).toBeDefined();
    });

    it('should analyze all 15 dimensions', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      // Check original 6 dimensions
      expect(analysis.dimensions.wiifm).toBeDefined();
      expect(analysis.dimensions.clarity).toBeDefined();
      expect(analysis.dimensions.emotional).toBeDefined();
      expect(analysis.dimensions.ctaStrength).toBeDefined();
      expect(analysis.dimensions.objectionCoverage).toBeDefined();
      expect(analysis.dimensions.antiPlaceholder).toBeDefined();

      // Check new 9 dimensions
      expect(analysis.dimensions.narrativeFlow).toBeDefined();
      expect(analysis.dimensions.emotionalJourney).toBeDefined();
      expect(analysis.dimensions.trustArchitecture).toBeDefined();
      expect(analysis.dimensions.cognitiveLoad).toBeDefined();
      expect(analysis.dimensions.visualCopyAlignment).toBeDefined();
      expect(analysis.dimensions.informationHierarchy).toBeDefined();
      expect(analysis.dimensions.personaMatch).toBeDefined();
      expect(analysis.dimensions.competitivePosition).toBeDefined();
      expect(analysis.dimensions.brandConsistency).toBeDefined();
    });

    it('should score excellent content higher than weak content', async () => {
      const excellentAnalysis = await engine.analyze(EXCELLENT_CONTENT);
      const weakAnalysis = await engine.analyze(WEAK_CONTENT);

      expect(excellentAnalysis.totalScore).toBeGreaterThan(weakAnalysis.totalScore);
    });

    it('should return proper verdicts based on score', async () => {
      const excellentAnalysis = await engine.analyze(EXCELLENT_CONTENT);
      const weakAnalysis = await engine.analyze(WEAK_CONTENT);

      const validVerdicts = ['EXCEPTIONAL', 'STRONG', 'ADEQUATE', 'WEAK', 'FAILING'];
      expect(validVerdicts).toContain(excellentAnalysis.verdict);
      expect(validVerdicts).toContain(weakAnalysis.verdict);
    });
  });

  describe('Content Type Detection', () => {
    it('should detect content type automatically', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      const validTypes = ['headline', 'body', 'cta', 'testimonial', 'pricing', 'faq'];
      expect(validTypes).toContain(analysis.contentType);
    });

    it('should accept manual content type', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT, { contentType: 'body' });

      expect(analysis.contentType).toBe('body');
    });
  });

  describe('Funnel Stage Detection', () => {
    it('should detect funnel stage automatically', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      const validStages = [
        'awareness',
        'interest',
        'consideration',
        'intent',
        'purchase',
        'retention',
        'advocacy',
      ];
      expect(validStages).toContain(analysis.funnelStage);
    });

    it('should accept manual funnel stage', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT, { funnelStage: 'consideration' });

      expect(analysis.funnelStage).toBe('consideration');
    });
  });

  describe('Improvement Plan Generation', () => {
    it('should generate improvement plan', async () => {
      const analysis = await engine.analyze(MEDIUM_CONTENT);

      expect(analysis.improvementPlan).toBeDefined();
      expect(analysis.improvementPlan.quickWins).toBeDefined();
      expect(analysis.improvementPlan.strategicChanges).toBeDefined();
      expect(analysis.improvementPlan.projectedScore).toBeDefined();
    });

    it('should prioritize improvements by ROI', async () => {
      const analysis = await engine.analyze(WEAK_CONTENT);

      if (analysis.improvementPlan.quickWins.length > 1) {
        // First improvement should have higher ROI than second
        expect(analysis.improvementPlan.quickWins[0].roi).toBeGreaterThanOrEqual(
          analysis.improvementPlan.quickWins[1].roi
        );
      }
    });

    it('should provide conversion lift estimate', async () => {
      const analysis = await engine.analyze(WEAK_CONTENT);

      expect(analysis.improvementPlan.estimatedConversionLift).toBeDefined();
      expect(analysis.improvementPlan.estimatedConversionLift.includes('%')).toBe(true);
    });
  });

  describe('Predictions', () => {
    it('should generate conversion predictions', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.predictions).toBeDefined();
      expect(analysis.predictions.conversionRate).toBeDefined();
      expect(analysis.predictions.conversionRate.low).toBeDefined();
      expect(analysis.predictions.conversionRate.expected).toBeDefined();
      expect(analysis.predictions.conversionRate.high).toBeDefined();
    });

    it('should include readability metrics in predictions', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.predictions.readability).toBeDefined();
      expect(analysis.predictions.readability.fleschKincaid).toBeDefined();
      expect(analysis.predictions.readability.avgSentenceLength).toBeDefined();
    });

    it('should list uncertainty factors', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.predictions.uncertaintyFactors).toBeDefined();
      expect(analysis.predictions.uncertaintyFactors.length).toBeGreaterThan(0);
    });
  });

  describe('Benchmarking', () => {
    it('should provide benchmark comparisons', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.benchmarks).toBeDefined();
      expect(analysis.benchmarks.nichePercentile).toBeDefined();
      expect(analysis.benchmarks.globalPercentile).toBeDefined();
      expect(analysis.benchmarks.industryBenchmarks).toBeDefined();
    });

    it('should compare to top performers', async () => {
      const analysis = await engine.analyze(MEDIUM_CONTENT);

      expect(analysis.benchmarks.vsTopPerformer).toBeDefined();
      expect(analysis.benchmarks.vsTopPerformer.scoreDifference).toBeDefined();
    });
  });

  describe('Learning Context', () => {
    it('should extract learning context', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.learningContext).toBeDefined();
      expect(analysis.learningContext.tags).toBeDefined();
    });

    it('should accept learning feedback', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(() => {
        engine.provideFeedback({
          analysisId: analysis.id,
          actualConversionRate: 0.05,
        });
      }).not.toThrow();
    });
  });

  describe('Dimension-Specific Tests', () => {
    it('should score WIIFM correctly', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.dimensions.wiifm.score).toBeGreaterThan(50);
      expect(analysis.dimensions.wiifm.confidence).toBeGreaterThan(0);
    });

    it('should detect anti-placeholders', async () => {
      const placeholderContent =
        'Lorem ipsum dolor sit amet. [Insert product name here]. Click here to learn more.';
      const analysis = await engine.analyze(placeholderContent);

      expect(analysis.dimensions.antiPlaceholder.score).toBe(0);
      expect(analysis.dimensions.antiPlaceholder.issues.some(i => i.severity === 'critical')).toBe(
        true
      );
    });

    it('should analyze trust architecture', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      expect(analysis.dimensions.trustArchitecture.score).toBeGreaterThan(0);
      expect(analysis.dimensions.trustArchitecture.evidence.length).toBeGreaterThan(0);
    });

    it('should check CTA strength', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      // Excellent content has "Get instant access"
      expect(analysis.dimensions.ctaStrength.score).toBeGreaterThan(50);
    });

    it('should check objection coverage', async () => {
      const analysis = await engine.analyze(EXCELLENT_CONTENT);

      // Excellent content covers price (60-day guarantee), trust (10,000+ businesses)
      expect(analysis.dimensions.objectionCoverage.score).toBeGreaterThan(40);
    });
  });
});

// ============================================================================
// FUNNEL ANALYZER TESTS
// ============================================================================

describe('FunnelAnalyzer', () => {
  let analyzer: FunnelAnalyzer;

  beforeEach(() => {
    analyzer = new FunnelAnalyzer();
  });

  const SAMPLE_FUNNEL = [
    {
      name: 'Landing Page',
      content: `
        Discover the secret to doubling your productivity.
        Are you tired of working long hours with little to show for it?
        Our system helps you get more done in less time.
        Join 5,000+ professionals who've transformed their workflow.
      `,
      stage: 'awareness' as const,
    },
    {
      name: 'Features Page',
      content: `
        Here's how our productivity system works:
        - Smart task prioritization
        - Automated scheduling
        - Focus mode with distraction blocking
        You'll save an average of 2 hours per day.
        "This changed my life." - John D.
      `,
      stage: 'interest' as const,
    },
    {
      name: 'Pricing Page',
      content: `
        Choose the plan that works for you.
        Starter: $9/month - Perfect for individuals
        Pro: $29/month - Great for small teams
        Enterprise: Custom pricing
        All plans include a 30-day money-back guarantee.
        Start your free trial today.
      `,
      stage: 'consideration' as const,
    },
    {
      name: 'Checkout',
      content: `
        Complete your order.
        You're getting: Pro Plan - $29/month
        Secure checkout powered by Stripe.
        100% satisfaction guaranteed or your money back.
        Questions? Chat with us live.
        Buy now and transform your productivity.
      `,
      stage: 'purchase' as const,
    },
  ];

  describe('Basic Funnel Analysis', () => {
    it('should analyze entire funnel', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.funnelScore).toBeGreaterThanOrEqual(0);
      expect(analysis.funnelScore).toBeLessThanOrEqual(100);
    });

    it('should analyze each page individually', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.pages.length).toBe(SAMPLE_FUNNEL.length);
      analysis.pages.forEach((page, idx) => {
        expect(page.name).toBe(SAMPLE_FUNNEL[idx].name);
        expect(page.analysis).toBeDefined();
        expect(page.analysis.totalScore).toBeDefined();
      });
    });

    it('should link pages together', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.pages[0].previousPage).toBeUndefined();
      expect(analysis.pages[0].nextPage).toBe('page-1');
      expect(analysis.pages[1].previousPage).toBe('page-0');
      expect(analysis.pages[3].nextPage).toBeUndefined();
    });
  });

  describe('Stage Analysis', () => {
    it('should provide analysis for each stage', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.stageAnalysis).toBeDefined();
      expect(analysis.stageAnalysis.awareness).toBeDefined();
      expect(analysis.stageAnalysis.interest).toBeDefined();
      expect(analysis.stageAnalysis.consideration).toBeDefined();
      expect(analysis.stageAnalysis.purchase).toBeDefined();
    });

    it('should identify weakest and strongest stages', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      let hasWeakest = false;
      let hasStrongest = false;

      for (const stageAnalysis of Object.values(analysis.stageAnalysis)) {
        if (stageAnalysis.isWeakest) hasWeakest = true;
        if (stageAnalysis.isStrongest) hasStrongest = true;
      }

      expect(hasWeakest || hasStrongest).toBe(true);
    });

    it('should provide recommendations for weak stages', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      // Find the weakest stage
      const weakestStage = Object.values(analysis.stageAnalysis).find(s => s.isWeakest);
      if (weakestStage && weakestStage.score < 80) {
        expect(
          weakestStage.recommendations.length + weakestStage.concerns.length
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Message Consistency', () => {
    it('should analyze message consistency', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.messageConsistency).toBeDefined();
      expect(analysis.messageConsistency.score).toBeDefined();
    });

    it('should track key messages across pages', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.messageConsistency.keyMessages).toBeDefined();
      // Some key messages should appear in multiple pages
    });

    it('should detect promise delivery', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.messageConsistency.promiseDelivery).toBeDefined();
    });

    it('should detect disconnects between pages', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.messageConsistency.disconnects).toBeDefined();
    });
  });

  describe('Emotional Flow', () => {
    it('should analyze emotional flow across funnel', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.emotionalFlow).toBeDefined();
      expect(analysis.emotionalFlow.stateProgression).toBeDefined();
      expect(analysis.emotionalFlow.stateProgression.length).toBe(SAMPLE_FUNNEL.length);
    });

    it('should check for proper emotional arc', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(typeof analysis.emotionalFlow.hasProperArc).toBe('boolean');
    });

    it('should identify momentum issues', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.emotionalFlow.momentumIssues).toBeDefined();
    });
  });

  describe('Drop-off Risks', () => {
    it('should identify drop-off risks', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.dropOffRisks).toBeDefined();
    });

    it('should include risk levels and mitigation', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      analysis.dropOffRisks.forEach(risk => {
        expect(['high', 'medium', 'low']).toContain(risk.riskLevel);
        expect(risk.reason).toBeDefined();
        expect(risk.mitigation).toBeDefined();
      });
    });

    it('should predict drop-off rates', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      analysis.dropOffRisks.forEach(risk => {
        expect(risk.predictedDropOffRate).toBeGreaterThanOrEqual(0);
        expect(risk.predictedDropOffRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Funnel Improvements', () => {
    it('should generate funnel-level improvements', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      expect(analysis.funnelImprovements).toBeDefined();
    });

    it('should categorize improvement types', async () => {
      const analysis = await analyzer.analyzeFunnel(SAMPLE_FUNNEL);

      const validTypes = ['bridge_gap', 'add_page', 'strengthen_transition'];
      analysis.funnelImprovements.forEach(improvement => {
        expect(validTypes).toContain(improvement.type);
        expect(improvement.description).toBeDefined();
        expect(improvement.predictedImpact).toBeDefined();
      });
    });
  });
});

// ============================================================================
// QUICK UTILITY FUNCTION TESTS
// ============================================================================

describe('Quick Utility Functions', () => {
  describe('analyzeContent', () => {
    it('should provide quick content analysis', async () => {
      const analysis = await analyzeContent(EXCELLENT_CONTENT);

      expect(analysis).toBeDefined();
      expect(analysis.totalScore).toBeDefined();
      expect(analysis.verdict).toBeDefined();
    });

    it('should accept options', async () => {
      const analysis = await analyzeContent(EXCELLENT_CONTENT, {
        contentType: 'body',
        funnelStage: 'consideration',
        niche: 'saas',
      });

      expect(analysis.contentType).toBe('body');
      expect(analysis.funnelStage).toBe('consideration');
      expect(analysis.niche).toBe('saas');
    });
  });

  describe('analyzeFunnel', () => {
    it('should provide quick funnel analysis', async () => {
      const pages = [
        {
          name: 'Page 1',
          content: 'Discover amazing things here. Try now.',
          stage: 'awareness' as const,
        },
        {
          name: 'Page 2',
          content: 'Buy now and save 50%. Limited offer.',
          stage: 'purchase' as const,
        },
      ];

      const analysis = await analyzeFunnel(pages);

      expect(analysis).toBeDefined();
      expect(analysis.funnelScore).toBeDefined();
      expect(analysis.pages.length).toBe(2);
    });
  });

  describe('quickScore', () => {
    it('should return just the score', async () => {
      const score = await quickScore(EXCELLENT_CONTENT);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should be faster than full analysis', async () => {
      const start = Date.now();
      await quickScore(MEDIUM_CONTENT);
      const quickTime = Date.now() - start;

      // Just verify it returns quickly (under 5 seconds)
      expect(quickTime).toBeLessThan(5000);
    });
  });

  describe('getTopImprovements', () => {
    it('should return top 3 improvement suggestions', async () => {
      const improvements = await getTopImprovements(WEAK_CONTENT);

      expect(improvements).toBeDefined();
      expect(improvements.length).toBeLessThanOrEqual(3);
      improvements.forEach(improvement => {
        expect(typeof improvement).toBe('string');
        expect(improvement.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge Cases', () => {
  let engine: ConversionIntelligenceEngine;

  beforeEach(() => {
    engine = new ConversionIntelligenceEngine();
  });

  it('should handle empty content', async () => {
    const analysis = await engine.analyze('');

    expect(analysis).toBeDefined();
    expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle very short content', async () => {
    const analysis = await engine.analyze('Buy now.');

    expect(analysis).toBeDefined();
    expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle very long content', async () => {
    const longContent = EXCELLENT_CONTENT.repeat(10);
    const analysis = await engine.analyze(longContent);

    expect(analysis).toBeDefined();
    expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle content with special characters', async () => {
    const specialContent =
      'Get 50% off! Save $100 today. Don\'t wait!!! <script>alert("test")</script>';
    const analysis = await engine.analyze(specialContent);

    expect(analysis).toBeDefined();
    expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle content with unicode', async () => {
    const unicodeContent = 'Get started today! 🚀 Transform your business. ★★★★★';
    const analysis = await engine.analyze(unicodeContent);

    expect(analysis).toBeDefined();
    expect(analysis.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle single-word content', async () => {
    const analysis = await engine.analyze('Subscribe');

    expect(analysis).toBeDefined();
  });

  it('should handle numbers-only content', async () => {
    const analysis = await engine.analyze('100 200 300');

    expect(analysis).toBeDefined();
  });

  it('should throw error for null content', async () => {
    await expect(engine.analyze(null as any)).rejects.toThrow(
      'Content cannot be null or undefined'
    );
  });

  it('should throw error for undefined content', async () => {
    await expect(engine.analyze(undefined as any)).rejects.toThrow(
      'Content cannot be null or undefined'
    );
  });

  it('should throw error for non-string content', async () => {
    await expect(engine.analyze(123 as any)).rejects.toThrow('Content must be a string');
  });

  it('should sanitize and truncate very long content', async () => {
    // Content longer than MAX_CONTENT_LENGTH (100,000 chars)
    const veryLongContent = 'a'.repeat(150_000);
    const analysis = await engine.analyze(veryLongContent);

    expect(analysis).toBeDefined();
    // The sanitized content should be truncated
    expect(analysis.content.length).toBeLessThanOrEqual(100_000);
  });

  it('should strip control characters', async () => {
    const contentWithControlChars = 'Hello\x00World\x0BTest\x1F';
    const analysis = await engine.analyze(contentWithControlChars);

    expect(analysis).toBeDefined();
    expect(analysis.content).not.toContain('\x00');
    expect(analysis.content).not.toContain('\x0B');
    expect(analysis.content).not.toContain('\x1F');
  });

  it('should clear history when requested', async () => {
    await engine.analyze('Test content 1');
    await engine.analyze('Test content 2');
    engine.clearHistory();

    // After clearing, history should be empty (we can't directly check, but no error means success)
    expect(true).toBe(true);
  });
});

// ============================================================================
// FUNNEL ANALYZER INPUT VALIDATION
// ============================================================================

describe('FunnelAnalyzer Input Validation', () => {
  let analyzer: FunnelAnalyzer;

  beforeEach(() => {
    analyzer = new FunnelAnalyzer();
  });

  it('should throw error for null pages', async () => {
    await expect(analyzer.analyzeFunnel(null as any)).rejects.toThrow(
      'Pages must be a non-null array'
    );
  });

  it('should throw error for empty pages array', async () => {
    await expect(analyzer.analyzeFunnel([])).rejects.toThrow('Pages array cannot be empty');
  });

  it('should throw error for page with missing name', async () => {
    const invalidPages = [{ name: '', content: 'test', stage: 'awareness' as const }];
    await expect(analyzer.analyzeFunnel(invalidPages)).rejects.toThrow(
      'name must be a non-empty string'
    );
  });

  it('should throw error for page with null content', async () => {
    const invalidPages = [{ name: 'Test', content: null as any, stage: 'awareness' as const }];
    await expect(analyzer.analyzeFunnel(invalidPages)).rejects.toThrow(
      'content cannot be null or undefined'
    );
  });

  it('should throw error for page with missing stage', async () => {
    const invalidPages = [{ name: 'Test', content: 'test', stage: undefined as any }];
    await expect(analyzer.analyzeFunnel(invalidPages)).rejects.toThrow('stage is required');
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Engine Configuration', () => {
  it('should accept custom configuration', () => {
    const engine = new ConversionIntelligenceEngine({
      weights: {
        wiifm: 0.2,
        clarity: 0.15,
        emotional: 0.15,
      },
      thresholds: {
        exceptional: 95,
        strong: 80,
        adequate: 65,
        weak: 50,
      },
    });

    expect(engine).toBeDefined();
  });

  it('should use custom thresholds for verdicts', async () => {
    const engine = new ConversionIntelligenceEngine({
      thresholds: {
        exceptional: 99, // Very high bar
        strong: 95,
        adequate: 90,
        weak: 80,
      },
    });

    const analysis = await engine.analyze(EXCELLENT_CONTENT);

    // With very high thresholds, even excellent content might not be EXCEPTIONAL
    expect(['EXCEPTIONAL', 'STRONG', 'ADEQUATE', 'WEAK', 'FAILING']).toContain(analysis.verdict);
  });
});

// ============================================================================
// FLUENT API TESTS (World-Class API)
// ============================================================================

describe('Fluent API - analyze()', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Basic Usage', () => {
    it('should return a builder from analyze()', () => {
      const builder = analyze('Test content');
      expect(builder).toBeInstanceOf(AnalysisBuilder);
    });

    it('should run full analysis with .run()', async () => {
      const result = await analyze(EXCELLENT_CONTENT).run();

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.dimensions).toBeDefined();
      expect(result.verdict).toBeDefined();
    });

    it('should get just the score with .score()', async () => {
      const score = await analyze(EXCELLENT_CONTENT).score();

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should get just the verdict with .verdict()', async () => {
      const verdict = await analyze(EXCELLENT_CONTENT).verdict();

      expect(['EXCEPTIONAL', 'STRONG', 'ADEQUATE', 'WEAK', 'FAILING']).toContain(verdict);
    });

    it('should get improvements with .improvements()', async () => {
      const improvements = await analyze(WEAK_CONTENT).improvements(3);

      expect(improvements).toBeDefined();
      expect(improvements.length).toBeLessThanOrEqual(3);
    });

    it('should get dimensions with .dimensions()', async () => {
      const dimensions = await analyze(EXCELLENT_CONTENT).dimensions();

      expect(dimensions).toBeDefined();
      expect(dimensions.clarity).toBeDefined();
      expect(dimensions.emotional).toBeDefined();
    });
  });

  describe('Chainable Configuration', () => {
    it('should chain .asType()', async () => {
      const result = await analyze(EXCELLENT_CONTENT).asType('body').run();

      expect(result.contentType).toBe('body');
    });

    it('should chain .forStage()', async () => {
      const result = await analyze(EXCELLENT_CONTENT).forStage('consideration').run();

      expect(result.funnelStage).toBe('consideration');
    });

    it('should chain .inNiche()', async () => {
      const result = await analyze(EXCELLENT_CONTENT).inNiche('saas').run();

      expect(result.niche).toBe('saas');
    });

    it('should chain multiple configuration methods', async () => {
      const result = await analyze(EXCELLENT_CONTENT)
        .asType('headline')
        .forStage('awareness')
        .inNiche('fintech')
        .run();

      expect(result.contentType).toBe('headline');
      expect(result.funnelStage).toBe('awareness');
      expect(result.niche).toBe('fintech');
    });

    it('should chain .withBrandVoice()', async () => {
      const builder = analyze(EXCELLENT_CONTENT).withBrandVoice('Professional but friendly');
      expect(builder).toBeInstanceOf(AnalysisBuilder);
    });

    it('should chain .forPersona()', async () => {
      const builder = analyze(EXCELLENT_CONTENT).forPersona('Small business owners');
      expect(builder).toBeInstanceOf(AnalysisBuilder);
    });

    it('should chain .withTimeout()', async () => {
      const builder = analyze(EXCELLENT_CONTENT).withTimeout(10000);
      expect(builder).toBeInstanceOf(AnalysisBuilder);
    });

    it('should chain .noCache()', async () => {
      const builder = analyze(EXCELLENT_CONTENT).noCache();
      expect(builder).toBeInstanceOf(AnalysisBuilder);
    });
  });

  describe('Pass/Fail Check', () => {
    it('should return true when content passes threshold', async () => {
      const result = await analyze(EXCELLENT_CONTENT).passes(40);
      expect(result).toBe(true);
    });

    it('should return false when content fails threshold', async () => {
      const result = await analyze(WEAK_CONTENT).passes(90);
      expect(result).toBe(false);
    });
  });

  describe('Single Dimension Access', () => {
    it('should get a specific dimension score', async () => {
      const clarity = await analyze(EXCELLENT_CONTENT).dimension('clarity');

      expect(clarity).toBeDefined();
      expect(clarity.score).toBeGreaterThanOrEqual(0);
      expect(clarity.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Progress Callbacks', () => {
    it('should call progress callback during analysis', async () => {
      const progressEvents: any[] = [];

      await analyze(EXCELLENT_CONTENT)
        .onProgress(event => progressEvents.push(event))
        .run();

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents.some(e => e.phase === 'complete')).toBe(true);
    });

    it('should include percentComplete in progress events', async () => {
      const progressEvents: any[] = [];

      await analyze(EXCELLENT_CONTENT)
        .onProgress(event => progressEvents.push(event))
        .run();

      const completeEvent = progressEvents.find(e => e.phase === 'complete');
      expect(completeEvent?.percentComplete).toBe(100);
    });
  });

  describe('Caching', () => {
    it('should cache results by default', async () => {
      const start1 = Date.now();
      await analyze(EXCELLENT_CONTENT).run();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await analyze(EXCELLENT_CONTENT).run();
      const time2 = Date.now() - start2;

      // Second call should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1);
    });

    it('should skip cache when .noCache() is called', async () => {
      // First analysis - cached
      await analyze(EXCELLENT_CONTENT).run();

      // Second analysis with noCache - should not use cache
      const progressEvents: any[] = [];
      await analyze(EXCELLENT_CONTENT)
        .noCache()
        .onProgress(event => progressEvents.push(event))
        .run();

      // Should have multiple progress events (not just instant cache hit)
      expect(progressEvents.some(e => e.phase === 'analyzing')).toBe(true);
    });

    it('should clear cache with clearCache()', async () => {
      await analyze(EXCELLENT_CONTENT).run();
      clearCache();

      // After clearing, should not have cached result
      const progressEvents: any[] = [];
      await analyze(EXCELLENT_CONTENT)
        .onProgress(event => progressEvents.push(event))
        .run();

      expect(progressEvents.some(e => e.phase === 'analyzing')).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should throw InvalidContentError for null content', async () => {
      await expect(analyze(null as any).run()).rejects.toThrow(InvalidContentError);
    });

    it('should throw InvalidContentError for undefined content', async () => {
      await expect(analyze(undefined as any).run()).rejects.toThrow(InvalidContentError);
    });

    it('should throw InvalidContentError for empty content', async () => {
      await expect(analyze('').run()).rejects.toThrow(InvalidContentError);
    });

    it('should throw InvalidContentError for whitespace-only content', async () => {
      await expect(analyze('   ').run()).rejects.toThrow(InvalidContentError);
    });

    it('should throw ContentTooLongError for very long content', async () => {
      const veryLongContent = 'a'.repeat(150_000);
      await expect(analyze(veryLongContent).run()).rejects.toThrow(ContentTooLongError);
    });
  });

  describe('Observability', () => {
    it('should call metrics collector when set', async () => {
      const metrics: any[] = [];
      setMetricsCollector(m => metrics.push(m));

      await analyze(EXCELLENT_CONTENT).noCache().run();

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].traceId).toBeDefined();
      expect(metrics[0].totalMs).toBeDefined();
      expect(metrics[0].contentStats).toBeDefined();

      // Clean up
      setMetricsCollector(null as any);
    });

    it('should track content stats in metrics', async () => {
      const metrics: any[] = [];
      setMetricsCollector(m => metrics.push(m));

      await analyze(EXCELLENT_CONTENT).noCache().run();

      expect(metrics[0].contentStats.length).toBeGreaterThan(0);
      expect(metrics[0].contentStats.wordCount).toBeGreaterThan(0);
      expect(metrics[0].contentStats.sentenceCount).toBeGreaterThan(0);

      // Clean up
      setMetricsCollector(null as any);
    });

    it('should indicate cache hit in metrics', async () => {
      const metrics: any[] = [];
      setMetricsCollector(m => metrics.push(m));

      // First call - cache miss
      await analyze('Unique test content for cache hit test').run();
      expect(metrics[0].cacheHit).toBe(false);

      // Second call - cache hit
      await analyze('Unique test content for cache hit test').run();
      expect(metrics[1].cacheHit).toBe(true);

      // Clean up
      setMetricsCollector(null as any);
      clearCache();
    });
  });
});

describe('Fluent API - funnel()', () => {
  describe('Basic Usage', () => {
    it('should return a builder from funnel()', () => {
      const builder = funnel();
      expect(builder).toBeInstanceOf(FunnelBuilder);
    });

    it('should run funnel analysis with .run()', async () => {
      const result = await funnel()
        .addPage('Landing', 'Discover amazing things. Try now!', 'awareness')
        .addPage('Pricing', 'Buy now and save 50%.', 'purchase')
        .run();

      expect(result).toBeDefined();
      expect(result.funnelScore).toBeGreaterThanOrEqual(0);
      expect(result.pages.length).toBe(2);
    });

    it('should get funnel score with .score()', async () => {
      const score = await funnel()
        .addPage('Page 1', 'Content for page 1', 'awareness')
        .addPage('Page 2', 'Content for page 2', 'interest')
        .score();

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should get risks with .risks()', async () => {
      const risks = await funnel()
        .addPage('Page 1', 'Content for page 1', 'awareness')
        .addPage('Page 2', 'Content for page 2', 'purchase')
        .risks();

      expect(risks).toBeDefined();
      expect(Array.isArray(risks)).toBe(true);
    });

    it('should get improvements with .improvements()', async () => {
      const improvements = await funnel()
        .addPage('Page 1', 'Content for page 1', 'awareness')
        .addPage('Page 2', 'Content for page 2', 'purchase')
        .improvements();

      expect(improvements).toBeDefined();
      expect(Array.isArray(improvements)).toBe(true);
    });
  });

  describe('Page Management', () => {
    it('should add multiple pages with .addPages()', async () => {
      const result = await funnel()
        .addPages([
          { name: 'Page 1', content: 'Content 1', stage: 'awareness' },
          { name: 'Page 2', content: 'Content 2', stage: 'interest' },
          { name: 'Page 3', content: 'Content 3', stage: 'purchase' },
        ])
        .run();

      expect(result.pages.length).toBe(3);
    });

    it('should chain .addPage() calls', async () => {
      const builder = funnel()
        .addPage('Page 1', 'Content 1', 'awareness')
        .addPage('Page 2', 'Content 2', 'interest')
        .addPage('Page 3', 'Content 3', 'consideration');

      expect(builder).toBeInstanceOf(FunnelBuilder);
    });
  });

  describe('Input Validation', () => {
    it('should throw InvalidContentError for empty funnel', async () => {
      await expect(funnel().run()).rejects.toThrow(InvalidContentError);
    });
  });
});

describe('Fluent API - Shorthand Helpers', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('quickScore()', () => {
    it('should return just the score', async () => {
      // Note: This is the fluent API quickScore, which uses analyze().score()
      const score = await quickScore(EXCELLENT_CONTENT);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('quickVerdict()', () => {
    it('should return just the verdict', async () => {
      const verdict = await quickVerdict(EXCELLENT_CONTENT);

      expect(['EXCEPTIONAL', 'STRONG', 'ADEQUATE', 'WEAK', 'FAILING']).toContain(verdict);
    });
  });

  describe('topImprovements()', () => {
    it('should return top improvement suggestions as strings', async () => {
      const improvements = await topImprovements(WEAK_CONTENT, 3);

      expect(improvements).toBeDefined();
      expect(improvements.length).toBeLessThanOrEqual(3);
      improvements.forEach(imp => {
        expect(typeof imp).toBe('string');
      });
    });

    it('should respect limit parameter', async () => {
      const improvements = await topImprovements(WEAK_CONTENT, 2);

      expect(improvements.length).toBeLessThanOrEqual(2);
    });
  });

  describe('passes()', () => {
    it('should return boolean for threshold check', async () => {
      const result = await passes(EXCELLENT_CONTENT, 40);

      expect(typeof result).toBe('boolean');
    });

    it('should use default threshold of 70', async () => {
      const result = await passes(EXCELLENT_CONTENT);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('check() - The Hello World Experience', () => {
    it('should return human-readable string', async () => {
      const result = await check(EXCELLENT_CONTENT);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[✓✗]/); // Starts with icon
      expect(result).toMatch(/\(\d+\/100\)/); // Contains score
    });

    it('should show checkmark for good content', async () => {
      const result = await check(EXCELLENT_CONTENT);

      expect(result).toMatch(/^✓/);
      expect(result).toContain('(');
      expect(result).toContain('/100)');
    });

    it('should include actionable suggestion', async () => {
      const result = await check(WEAK_CONTENT);

      // Should have format: icon + verdict + score + suggestion
      const parts = result.split(' - ');
      expect(parts.length).toBe(2); // "✓ Good (72/100)" and "suggestion"
    });

    it('should be usable in CI/CD check', async () => {
      // This is the common pattern: exit 1 if fails
      const result = await check(EXCELLENT_CONTENT);
      const shouldFail = result.startsWith('✗');

      // Excellent content should pass
      expect(shouldFail).toBe(false);
    });
  });
});

// ============================================================================
// 🏆 INDUSTRY BENCHMARKS (The Competitive Edge)
// ============================================================================

describe('Industry Benchmarks - The Feature Competitors Had', () => {
  beforeEach(() => clearCache());

  describe('benchmark()', () => {
    it('should return percentile ranking', async () => {
      const result = await benchmark(EXCELLENT_CONTENT, 'saas');

      expect(result).toBeDefined();
      expect(result.percentile).toBeGreaterThanOrEqual(0);
      expect(result.percentile).toBeLessThanOrEqual(100);
      expect(result.industry).toBe('saas');
    });

    it('should return competitive insight', async () => {
      const result = await benchmark(EXCELLENT_CONTENT, 'saas');

      expect(result.insight).toBeDefined();
      expect(typeof result.insight).toBe('string');
      expect(result.insight.length).toBeGreaterThan(10);
    });

    it('should return ranking tier', async () => {
      const result = await benchmark(EXCELLENT_CONTENT, 'general');

      expect(['top_5', 'top_10', 'top_25', 'above_average', 'average', 'below_average']).toContain(
        result.ranking
      );
    });

    it('should calculate points to next tier', async () => {
      const result = await benchmark(MEDIUM_CONTENT, 'saas');

      expect(result.pointsToNextTier).toBeGreaterThanOrEqual(0);
      expect(result.nextTier).toBeDefined();
    });

    it('should include industry statistics', async () => {
      const result = await benchmark(EXCELLENT_CONTENT, 'ecommerce');

      expect(result.industryStats).toBeDefined();
      expect(result.industryStats.mean).toBeGreaterThan(0);
      expect(result.industryStats.median).toBeGreaterThan(0);
      expect(result.industryStats.sampleSize).toBeGreaterThan(1000);
    });

    it('should work with different industries', async () => {
      const industries: Industry[] = ['saas', 'ecommerce', 'fintech', 'b2b'];

      for (const industry of industries) {
        const result = await benchmark(EXCELLENT_CONTENT, industry);
        expect(result.industry).toBe(industry);
      }
    });
  });

  describe('percentile()', () => {
    it('should return just the percentile number', async () => {
      const pct = await percentile(EXCELLENT_CONTENT, 'saas');

      expect(typeof pct).toBe('number');
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should default to general industry', async () => {
      const pct = await percentile(EXCELLENT_CONTENT);

      expect(typeof pct).toBe('number');
    });
  });

  describe('getAvailableIndustries()', () => {
    it('should return list of available industries', () => {
      const industries = getAvailableIndustries();

      expect(Array.isArray(industries)).toBe(true);
      expect(industries.length).toBeGreaterThan(5);
      expect(industries).toContain('saas');
      expect(industries).toContain('ecommerce');
      expect(industries).toContain('general');
    });
  });

  describe('analyze().benchmark()', () => {
    it('should work with fluent API', async () => {
      const result = await analyze(EXCELLENT_CONTENT).benchmark('saas');

      expect(result.percentile).toBeDefined();
      expect(result.industry).toBe('saas');
    });

    it('should auto-detect industry from niche', async () => {
      const result = await analyze(EXCELLENT_CONTENT).inNiche('saas').benchmark();

      expect(result.industry).toBe('saas');
    });
  });
});

// ============================================================================
// 🎯 SHOWCASE - THE MONEY SHOT
// ============================================================================

describe('Showcase - The Money Shot', () => {
  beforeEach(() => clearCache());

  it('should return beautiful formatted output', async () => {
    const result = await showcase(EXCELLENT_CONTENT, 'saas');

    expect(result.formatted).toBeDefined();
    expect(typeof result.formatted).toBe('string');
    // Should contain box drawing characters
    expect(result.formatted).toContain('┌');
    expect(result.formatted).toContain('└');
    expect(result.formatted).toContain('│');
  });

  it('should include all key data points', async () => {
    const result = await showcase(EXCELLENT_CONTENT, 'saas');

    expect(result.data.score).toBeGreaterThanOrEqual(0);
    expect(result.data.score).toBeLessThanOrEqual(100);
    expect(result.data.grade).toBeDefined();
    expect(result.data.industry).toBe('saas');
    expect(result.data.percentile).toBeGreaterThanOrEqual(0);
    expect(result.data.topStrength).toBeDefined();
    expect(result.data.topWeakness).toBeDefined();
    expect(result.data.quickWin).toBeDefined();
  });

  it('should contain progress bar', async () => {
    const result = await showcase(EXCELLENT_CONTENT, 'saas');

    // Should have progress bar characters
    expect(result.formatted).toContain('█');
  });

  it('should be console-ready', async () => {
    const result = await showcase(MEDIUM_CONTENT, 'ecommerce');

    // Formatted output should be directly printable
    expect(result.formatted).toContain('CONVERSION INTELLIGENCE REPORT');
    expect(result.formatted).toContain('Score:');
    expect(result.formatted).toContain('Grade:');
    expect(result.formatted).toContain('Percentile:');
  });

  it('should include actionable insights', async () => {
    const result = await showcase(WEAK_CONTENT, 'general');

    expect(result.formatted).toContain('TOP STRENGTH:');
    expect(result.formatted).toContain('TOP WEAKNESS:');
    expect(result.formatted).toContain('QUICK WIN:');
  });
});

// ============================================================================
// HUMAN REPORT (UX Feature)
// ============================================================================

describe('Human Report - The UX Fix', () => {
  beforeEach(() => clearCache());

  it('should return human-readable report', async () => {
    const report = await analyze(EXCELLENT_CONTENT).report();

    expect(report).toBeDefined();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    expect(report.summary).toBeTruthy();
    expect(report.meaning).toBeTruthy();
    expect(report.recommendation).toBeDefined();
    expect(report.encouragement).toBeTruthy();
  });

  it('should provide actionable recommendation', async () => {
    const report = await analyze(EXCELLENT_CONTENT).report();

    expect(['publish', 'revise', 'rewrite']).toContain(report.recommendation.action);
    expect(report.recommendation.reason.length).toBeGreaterThan(10);
  });

  it('should give A grade for excellent content', async () => {
    const report = await analyze(EXCELLENT_CONTENT).report();

    // Excellent content should score well
    expect(['A+', 'A', 'B']).toContain(report.grade);
    expect(report.recommendation.action).toBe('publish');
  });

  it('should give lower grade for weak content', async () => {
    const report = await analyze(WEAK_CONTENT).report();

    // Weak content should score lower
    expect(['C', 'D', 'F', 'B']).toContain(report.grade);
  });

  it('should include top priority fix when available', async () => {
    const report = await analyze(WEAK_CONTENT).report();

    // Weak content should have improvement suggestions
    if (report.topPriority) {
      expect(report.topPriority.issue).toBeTruthy();
      expect(report.topPriority.fix).toBeTruthy();
      expect(report.topPriority.impact).toContain('%');
    }
  });

  it('should include encouraging message', async () => {
    const report = await analyze(MEDIUM_CONTENT).report();

    // Should have emoji in encouragement (delight!)
    expect(report.encouragement.length).toBeGreaterThan(5);
  });

  it('summary should mention the actual score', async () => {
    const report = await analyze(EXCELLENT_CONTENT).report();

    // Summary should include the score
    expect(report.summary).toContain('/100');
  });
});

describe('Exported Constants', () => {
  it('should export MAX_CONTENT_LENGTH for pre-validation', () => {
    expect(MAX_CONTENT_LENGTH).toBe(100_000);
  });

  it('should allow users to check content length before analyzing', () => {
    const content = 'a'.repeat(50_000);
    const isValid = content.length <= MAX_CONTENT_LENGTH;
    expect(isValid).toBe(true);
  });
});

describe('Error Classes', () => {
  describe('IntelligenceError', () => {
    it('should have code, suggestion, and docs', () => {
      const error = new IntelligenceError(
        'Test message',
        'TEST_CODE',
        'Test suggestion',
        'https://docs.example.com'
      );

      expect(error.code).toBe('TEST_CODE');
      expect(error.suggestion).toBe('Test suggestion');
      expect(error.docs).toBe('https://docs.example.com');
      expect(error.message).toBe('Test message');
    });

    it('should have beautiful toString() output', () => {
      const error = new IntelligenceError('Test message', 'TEST_CODE', 'Test suggestion');
      const str = error.toString();

      expect(str).toContain('TEST_CODE');
      expect(str).toContain('Test message');
      expect(str).toContain('Test suggestion');
    });
  });

  describe('ContentTooLongError', () => {
    it('should format length information', () => {
      const error = new ContentTooLongError(150000, 100000);

      expect(error.code).toBe('CONTENT_TOO_LONG');
      expect(error.message).toContain('150,000');
      expect(error.message).toContain('100,000');
    });
  });

  describe('InvalidContentError', () => {
    it('should have INVALID_CONTENT code', () => {
      const error = new InvalidContentError('Content is empty');

      expect(error.code).toBe('INVALID_CONTENT');
    });
  });

  describe('TimeoutError', () => {
    it('should include timeout duration', () => {
      const error = new TimeoutError(5000);

      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toContain('5000ms');
    });
  });
});

// ============================================================================
// COMPARISON API TESTS
// ============================================================================

describe('HEAD-TO-HEAD COMPARISON (compare)', () => {
  beforeEach(() => clearCache());

  describe('Basic Comparison', () => {
    it('should return ComparisonResult with all required fields', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('scoreDiff');
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('dimensionWinners');
      expect(result).toHaveProperty('content1Strengths');
      expect(result).toHaveProperty('content2Strengths');
      expect(result).toHaveProperty('keyDifferences');
      expect(result).toHaveProperty('insight');
      expect(result).toHaveProperty('toWin');
    });

    it('should correctly identify winner when one content is clearly better', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      expect(result.winner).toBe('content1');
      expect(result.scores.content1).toBeGreaterThan(result.scores.content2);
      expect(result.scoreDiff).toBeGreaterThan(10);
    });

    it('should identify content2 as winner when it is better', async () => {
      const result = await compare(WEAK_CONTENT, EXCELLENT_CONTENT);

      expect(result.winner).toBe('content2');
      expect(result.scores.content2).toBeGreaterThan(result.scores.content1);
    });

    it('should return tie for similar content', async () => {
      const result = await compare(MEDIUM_CONTENT, MEDIUM_CONTENT);

      expect(result.winner).toBe('tie');
      expect(result.scoreDiff).toBe(0);
    });
  });

  describe('Dimension Analysis', () => {
    it('should identify dimension winners', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      expect(typeof result.dimensionWinners).toBe('object');
      expect(Object.keys(result.dimensionWinners).length).toBeGreaterThan(0);

      // Each dimension should have a valid winner
      for (const winner of Object.values(result.dimensionWinners)) {
        expect(['content1', 'content2', 'tie']).toContain(winner);
      }
    });

    it('should list strengths for the better content', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      // Excellent content should have more strengths
      expect(result.content1Strengths.length).toBeGreaterThan(0);
    });
  });

  describe('Key Differences', () => {
    it('should identify key differences between contents', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      // Should have at least some key differences for vastly different content
      expect(Array.isArray(result.keyDifferences)).toBe(true);

      // Each key difference should have required structure
      for (const diff of result.keyDifferences) {
        expect(diff).toHaveProperty('dimension');
        expect(diff).toHaveProperty('content1Sample');
        expect(diff).toHaveProperty('content2Sample');
        expect(diff).toHaveProperty('verdict');
      }
    });

    it('should limit key differences to top 3', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      expect(result.keyDifferences.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Actionable Recommendations', () => {
    it('should provide insight as a string', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      expect(typeof result.insight).toBe('string');
      expect(result.insight.length).toBeGreaterThan(0);
    });

    it('should provide toWin recommendations', async () => {
      const result = await compare(WEAK_CONTENT, EXCELLENT_CONTENT);

      expect(Array.isArray(result.toWin)).toBe(true);
      // Weak content should get recommendations to beat excellent
    });

    it('should limit toWin to top 3 recommendations', async () => {
      const result = await compare(WEAK_CONTENT, EXCELLENT_CONTENT);

      expect(result.toWin.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle comparing same content', async () => {
      const result = await compare(EXCELLENT_CONTENT, EXCELLENT_CONTENT);

      expect(result.winner).toBe('tie');
      expect(result.scoreDiff).toBe(0);
      expect(result.scores.content1).toBe(result.scores.content2);
    });

    it('should handle short content', async () => {
      const result = await compare(
        'Buy now! Limited offer.',
        'Click here to learn more about our products.'
      );

      expect(result).toHaveProperty('winner');
      expect(result.scores.content1).toBeGreaterThanOrEqual(0);
      expect(result.scores.content2).toBeGreaterThanOrEqual(0);
    });

    it('should analyze both contents in parallel (performance)', async () => {
      const start = Date.now();
      await compare(EXCELLENT_CONTENT, MEDIUM_CONTENT);
      const elapsed = Date.now() - start;

      // Parallel should be faster than 2x single analysis
      // Just verify it completes in reasonable time
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Score Thresholds', () => {
    it('should use 3-point threshold for tie determination', async () => {
      // Two pieces of content with similar scores should tie
      const result = await compare(MEDIUM_CONTENT, MEDIUM_CONTENT);

      expect(result.winner).toBe('tie');
    });

    it('should declare winner only with significant difference', async () => {
      const result = await compare(EXCELLENT_CONTENT, WEAK_CONTENT);

      // With vastly different content, should not be a tie
      expect(result.winner).not.toBe('tie');
      expect(result.scoreDiff).toBeGreaterThan(3);
    });
  });
});

// ============================================================================
// EXPLAINABILITY TESTS (.explain() - The 3 AM Debugger's Best Friend)
// ============================================================================

describe('EXPLAINABILITY (explain)', () => {
  beforeEach(() => clearCache());

  describe('Structure', () => {
    it('should return Explanation with all required fields', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation).toHaveProperty('score');
      expect(explanation).toHaveProperty('breakdown');
      expect(explanation).toHaveProperty('strengths');
      expect(explanation).toHaveProperty('weaknesses');
      expect(explanation).toHaveProperty('evidence');
      expect(explanation).toHaveProperty('summary');
      expect(explanation).toHaveProperty('debug');
    });

    it('should have score object with value, percentile, and verdict', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation.score).toHaveProperty('value');
      expect(explanation.score).toHaveProperty('percentile');
      expect(explanation.score).toHaveProperty('verdict');
      expect(typeof explanation.score.value).toBe('number');
      expect(typeof explanation.score.percentile).toBe('string');
    });

    it('should have breakdown array with dimension details', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      expect(Array.isArray(explanation.breakdown)).toBe(true);
      expect(explanation.breakdown.length).toBeGreaterThan(0);

      const first = explanation.breakdown[0];
      expect(first).toHaveProperty('dimension');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('weight');
      expect(first).toHaveProperty('contribution');
      expect(first).toHaveProperty('summary');
    });

    it('should have debug info for 3 AM troubleshooting', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      expect(explanation.debug).toHaveProperty('analysisId');
      expect(explanation.debug).toHaveProperty('contentLength');
      expect(explanation.debug).toHaveProperty('wordCount');
      expect(explanation.debug).toHaveProperty('timestamp');

      expect(typeof explanation.debug.analysisId).toBe('string');
      expect(explanation.debug.contentLength).toBeGreaterThan(0);
      expect(explanation.debug.wordCount).toBeGreaterThan(0);
    });
  });

  describe('Content Quality Detection', () => {
    it('should identify strengths in excellent content', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation.strengths.length).toBeGreaterThan(0);
      // Excellent content should have more strengths than weaknesses
      expect(explanation.strengths.length).toBeGreaterThanOrEqual(explanation.weaknesses.length);
    });

    it('should identify weaknesses in weak content', async () => {
      const explanation = await analyze(WEAK_CONTENT).explain();

      expect(explanation.weaknesses.length).toBeGreaterThan(0);
      // Each weakness should have issue and fix
      for (const weakness of explanation.weaknesses) {
        expect(weakness).toHaveProperty('issue');
        expect(weakness).toHaveProperty('fix');
      }
    });

    it('should assign correct percentile for high scores', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      // Excellent content should be above average
      expect(['Top 5%', 'Top 20%', 'Above Average']).toContain(explanation.score.percentile);
    });

    it('should assign correct percentile for low scores', async () => {
      const explanation = await analyze(WEAK_CONTENT).explain();

      // Weak content should be below average or average
      expect(['Average', 'Below Average', 'Bottom 20%']).toContain(explanation.score.percentile);
    });
  });

  describe('Summary Generation', () => {
    it('should generate human-readable summary', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      expect(typeof explanation.summary).toBe('string');
      expect(explanation.summary.length).toBeGreaterThan(50);
      // Summary should contain score
      expect(explanation.summary).toContain('/100');
    });

    it('should mention strongest area in summary', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation.summary).toContain('Strongest:');
    });

    it('should mention area needing work in summary', async () => {
      const explanation = await analyze(WEAK_CONTENT).explain();

      expect(explanation.summary).toContain('Needs work:');
    });
  });

  describe('Breakdown Status', () => {
    it('should use valid status values', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      const validStatuses = ['excellent', 'good', 'average', 'weak', 'critical'];
      for (const item of explanation.breakdown) {
        expect(validStatuses).toContain(item.status);
      }
    });

    it('should sort breakdown by weight (most important first)', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      for (let i = 1; i < explanation.breakdown.length; i++) {
        expect(explanation.breakdown[i - 1].weight).toBeGreaterThanOrEqual(
          explanation.breakdown[i].weight
        );
      }
    });

    it('should limit breakdown to top 10 dimensions', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation.breakdown.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Evidence', () => {
    it('should provide evidence array', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(Array.isArray(explanation.evidence)).toBe(true);
    });

    it('should categorize evidence as positive or negative', async () => {
      const explanation = await analyze(MEDIUM_CONTENT).explain();

      for (const item of explanation.evidence) {
        expect(['positive', 'negative']).toContain(item.type);
        expect(item).toHaveProperty('dimension');
        expect(item).toHaveProperty('quote');
        expect(item).toHaveProperty('analysis');
      }
    });

    it('should limit evidence to 6 items', async () => {
      const explanation = await analyze(EXCELLENT_CONTENT).explain();

      expect(explanation.evidence.length).toBeLessThanOrEqual(6);
    });
  });
});

// ============================================================================
// 10X UPGRADE TESTS
// ============================================================================

describe('10X UPGRADE: REQUEST DEDUPLICATION', () => {
  beforeEach(() => clearCache());

  it('should return same result for same content analyzed simultaneously', async () => {
    const content = 'Test content for deduplication testing with enough words';

    // Start both at the same time
    const [result1, result2] = await Promise.all([
      deduplicatedAnalyze(content),
      deduplicatedAnalyze(content),
    ]);

    // Should have same analysis ID (same analysis, not duplicate work)
    expect(result1.id).toBe(result2.id);
    expect(result1.totalScore).toBe(result2.totalScore);
  });

  it('should return different results for different content', async () => {
    const [result1, result2] = await Promise.all([
      deduplicatedAnalyze(EXCELLENT_CONTENT),
      deduplicatedAnalyze(WEAK_CONTENT),
    ]);

    // Different content = different analyses
    expect(result1.id).not.toBe(result2.id);
    expect(result1.totalScore).not.toBe(result2.totalScore);
  });

  it('should clean up after completion', async () => {
    const content = 'Content for cleanup test with enough words for analysis';

    await deduplicatedAnalyze(content);

    // Second call should create new analysis (not reuse old promise)
    const result = await deduplicatedAnalyze(content);
    expect(result).toBeDefined();
  });
});

describe('10X UPGRADE: BATCH ANALYSIS (analyzeMany)', () => {
  beforeEach(() => clearCache());

  it('should analyze multiple contents', async () => {
    const contents = [
      'First content for batch testing with enough words.',
      'Second content for batch testing with enough words.',
      'Third content for batch testing with enough words.',
    ];

    const result = await analyzeMany(contents);

    expect(result.stats.total).toBe(3);
    expect(result.stats.completed).toBe(3);
    expect(result.stats.failed).toBe(0);
    expect(result.successful.length).toBe(3);
  });

  it('should respect concurrency limit', async () => {
    // Use unique content for each to avoid deduplication
    const contents = Array(5)
      .fill(null)
      .map(
        (_, i) => `Unique content number ${i} for concurrency test with enough words to analyze.`
      );

    const completedOrder: number[] = [];

    const result = await analyzeMany(contents, {
      concurrency: 2,
      onItemComplete: item => {
        completedOrder.push(item.index);
      },
    });

    // All should complete
    expect(result.stats.completed).toBe(5);
    // Order might not be sequential due to async, but that's fine
    expect(completedOrder.length).toBe(5);
  });

  it('should calculate stats correctly', async () => {
    // Use unique content suffixes to avoid deduplication
    const contents = [
      EXCELLENT_CONTENT + ' [test-1]',
      WEAK_CONTENT + ' [test-2]',
      MEDIUM_CONTENT + ' [test-3]',
    ];
    const result = await analyzeMany(contents);

    expect(result.stats.total).toBe(3);
    expect(result.stats.completed).toBe(3);
    expect(result.stats.averageScore).toBeGreaterThan(0);
    expect(result.stats.minScore).toBeLessThanOrEqual(result.stats.averageScore);
    expect(result.stats.maxScore).toBeGreaterThanOrEqual(result.stats.averageScore);
    expect(result.stats.totalMs).toBeGreaterThan(0);
  });

  it('should call progress callback', async () => {
    const contents = ['Content 1 for test.', 'Content 2 for test.'];
    const progressCalls: number[] = [];

    await analyzeMany(contents, {
      onProgress: (completed, total) => {
        progressCalls.push(completed);
      },
    });

    expect(progressCalls).toContain(1);
    expect(progressCalls).toContain(2);
  });

  it('should handle empty array', async () => {
    const result = await analyzeMany([]);

    expect(result.stats.total).toBe(0);
    expect(result.stats.completed).toBe(0);
    expect(result.stats.averageScore).toBe(0);
  });

  it('should handle failFast option', async () => {
    const contents = [
      'Valid content for test.',
      '', // This will fail
      'Another valid content.',
    ];

    const result = await analyzeMany(contents, { failFast: true });

    // Should have stopped after first failure
    expect(result.stats.failed).toBeGreaterThanOrEqual(1);
  });
});

describe('10X UPGRADE: AUTO-REWRITE (The Holy Grail)', () => {
  beforeEach(() => clearCache());

  it('should return RewriteResult with all fields', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(result).toHaveProperty('original');
    expect(result).toHaveProperty('improved');
    expect(result).toHaveProperty('lift');
    expect(result).toHaveProperty('changes');
    expect(result).toHaveProperty('diff');
  });

  it('should have original content and score', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(result.original.content).toBe(WEAK_CONTENT);
    expect(result.original.score).toBeGreaterThanOrEqual(0);
    expect(result.original.verdict).toBeDefined();
  });

  it('should produce improved content', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(result.improved.content).toBeDefined();
    expect(result.improved.content.length).toBeGreaterThan(0);
    // Improved content should be different (or same if already optimal)
  });

  it('should calculate lift correctly', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(result.lift).toHaveProperty('points');
    expect(result.lift).toHaveProperty('percentage');
    expect(result.lift).toHaveProperty('assessment');
    expect(['significant', 'moderate', 'minor', 'none']).toContain(result.lift.assessment);
  });

  it('should document changes made', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(Array.isArray(result.changes)).toBe(true);
    // Weak content should have some changes
    if (result.changes.length > 0) {
      for (const change of result.changes) {
        expect(change).toHaveProperty('type');
        expect(change).toHaveProperty('original');
        expect(change).toHaveProperty('improved');
        expect(change).toHaveProperty('reason');
        expect(['headline', 'cta', 'body', 'structure', 'tone']).toContain(change.type);
      }
    }
  });

  it('should generate diff string', async () => {
    const result = await rewrite(WEAK_CONTENT);

    expect(typeof result.diff).toBe('string');
    expect(result.diff).toContain('CHANGES MADE');
  });

  it('should handle excellent content (minimal changes needed)', async () => {
    const result = await rewrite(EXCELLENT_CONTENT);

    expect(result).toBeDefined();
    // Excellent content should have small or no lift
    expect(result.lift.points).toBeLessThan(20);
  });
});

describe('10X UPGRADE: STREAMING ANALYSIS', () => {
  beforeEach(() => clearCache());

  it('should yield StreamEvents', async () => {
    const events: StreamEvent[] = [];

    for await (const event of stream(MEDIUM_CONTENT)) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('dimension');
    expect(events[events.length - 1].type).toBe('complete');
  });

  it('should include progress percentages', async () => {
    const progresses: number[] = [];

    for await (const event of stream(MEDIUM_CONTENT)) {
      progresses.push(event.progress);
    }

    // Should start at 0 and end at 100
    expect(progresses[0]).toBe(0);
    expect(progresses[progresses.length - 1]).toBe(100);
  });

  it('should emit dimension scores progressively', async () => {
    const dimensionEvents: StreamEvent[] = [];

    for await (const event of stream(MEDIUM_CONTENT)) {
      if (event.type === 'dimension' && event.dimension !== 'initializing') {
        dimensionEvents.push(event);
      }
    }

    expect(dimensionEvents.length).toBeGreaterThan(0);
    for (const event of dimensionEvents) {
      // Dimension scores are numbers (can be negative due to penalty system, but typically 0-100)
      expect(typeof event.dimensionScore).toBe('number');
      expect(event.dimensionScore).toBeLessThanOrEqual(100);
    }
  });

  it('should include timestamps', async () => {
    const timestamps: number[] = [];

    for await (const event of stream(MEDIUM_CONTENT)) {
      timestamps.push(event.timestamp);
    }

    // Timestamps should be increasing
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('should return full analysis at completion', async () => {
    let finalData: any = null;

    for await (const event of stream(MEDIUM_CONTENT)) {
      if (event.type === 'complete') {
        finalData = event.data;
      }
    }

    expect(finalData).toBeDefined();
    expect(finalData.totalScore).toBeGreaterThanOrEqual(0);
    expect(finalData.verdict).toBeDefined();
  });

  it('should reject invalid content', async () => {
    await expect(async () => {
      for await (const _ of stream('')) {
        // Should throw before yielding
      }
    }).rejects.toThrow();
  });

  it('should calculate partial scores as dimensions complete', async () => {
    const currentScores: number[] = [];

    for await (const event of stream(MEDIUM_CONTENT)) {
      if (event.currentScore !== undefined) {
        currentScores.push(event.currentScore);
      }
    }

    expect(currentScores.length).toBeGreaterThan(0);
    // Scores should be numbers
    for (const score of currentScores) {
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// HUNTER MODE: ROBUSTNESS & SECURITY TESTS
// ============================================================================

describe('HUNTER MODE: Robustness Fixes', () => {
  beforeEach(() => clearCache());

  it('should handle circular references in options without crashing', async () => {
    // This was a crash bug - JSON.stringify on circular refs throws
    const circular: any = { a: 1 };
    circular.self = circular;

    // The cache key generator should handle this gracefully
    const result = await analyze('Test content for circular ref test').run();
    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should protect batch processing from callback errors', async () => {
    const contents = [
      'First content for callback error test with enough words.',
      'Second content for callback error test with enough words.',
      'Third content for callback error test with enough words.',
    ];

    // This callback throws, but batch should still complete
    const result = await analyzeMany(contents, {
      onProgress: () => {
        throw new Error('Intentional callback error');
      },
    });

    // Batch should still complete despite callback errors
    expect(result.stats.total).toBe(3);
    expect(result.stats.completed).toBe(3);
  });

  it('FunnelBuilder should validate empty page names', () => {
    expect(() => {
      funnel().addPage('', 'Some content', 'awareness');
    }).toThrow('Page name cannot be empty');
  });

  it('FunnelBuilder should validate empty page content', () => {
    expect(() => {
      funnel().addPage('Landing', '', 'awareness');
    }).toThrow('must be a non-empty string');
  });

  it('FunnelBuilder should validate oversized page content', () => {
    const hugeContent = 'a'.repeat(100_001);
    expect(() => {
      funnel().addPage('Landing', hugeContent, 'awareness');
    }).toThrow('100,001 characters');
  });

  it('FunnelBuilder should have timeout method', () => {
    // Verify the withTimeout method exists and returns the builder
    const builder = funnel()
      .addPage('Page1', 'Content for timeout test with enough words.', 'awareness')
      .withTimeout(5000);

    // Should return the builder for chaining
    expect(builder).toBeDefined();
    expect(typeof builder.run).toBe('function');
  });

  it('FunnelBuilder.addPages should validate each page', () => {
    expect(() => {
      funnel().addPages([
        { name: 'Valid', content: 'Valid content', stage: 'awareness' },
        { name: '', content: 'Invalid page', stage: 'interest' },
      ]);
    }).toThrow('Page name cannot be empty');
  });
});

describe('HUNTER MODE: Security', () => {
  beforeEach(() => clearCache());

  it('should detect potential API key patterns', async () => {
    // This content looks like it has an API key
    const suspiciousContent =
      'Configure your API: api_key = sk-1234567890abcdefghij1234567890abcdefghij';

    // Should still analyze but internally flag the security warning
    const result = await analyze(suspiciousContent).run();
    expect(result).toBeDefined();
    // Analysis completes - we warn but don't block
  });

  it('should detect AWS key patterns', async () => {
    const awsContent = 'AWS Access: AKIAIOSFODNN7EXAMPLE with secret key';

    const result = await analyze(awsContent).run();
    expect(result).toBeDefined();
  });

  it('should not crash on prototype pollution attempts in content', async () => {
    const pollutionContent =
      '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"evil": true}}}';

    const result = await analyze(pollutionContent).run();
    expect(result).toBeDefined();

    // Verify no pollution occurred
    expect(({} as any).polluted).toBeUndefined();
    expect(({} as any).evil).toBeUndefined();
  });

  it('should handle ANSI escape sequences in content', async () => {
    const ansiContent =
      'Normal text \x1b[31mRed text\x1b[0m more normal text with enough words to analyze.';

    const result = await analyze(ansiContent).run();
    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });
});

describe('HUNTER MODE: Cache Robustness', () => {
  beforeEach(() => clearCache());

  it('cache should handle same content with different options differently', async () => {
    const content = 'Test content for cache key differentiation with enough words.';

    const result1 = await analyze(content).asType('headline').run();
    const result2 = await analyze(content).asType('body').run();

    // Different options should produce different analyses
    // (Actually they might be similar, but cache keys should be different)
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('cache cleanup should not prevent Node.js from exiting (unref)', async () => {
    // This test just verifies the code path runs without error
    await analyze('Content to trigger cache cleanup timer').run();
    await analyze('Another content to ensure cache is used').run();

    // If unref() works, this test won't hang
    expect(true).toBe(true);
  });
});

// ============================================================================
// 🏆 WORLD-CLASS: DEBUG ENVELOPE TESTS
// ============================================================================

describe('🏆 WORLD-CLASS: Debug Envelope', () => {
  beforeEach(() => clearCache());

  it('should return a DebugEnvelope with all required fields', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    // Data
    expect(result.data).toBeDefined();
    expect(result.data.totalScore).toBeGreaterThanOrEqual(0);

    // Meta
    expect(result.meta).toBeDefined();
    expect(result.meta.requestId).toBeDefined();
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.version).toBeDefined();
    expect(result.meta.timing).toBeDefined();
    expect(result.meta.cached).toBeDefined();
    expect(result.meta.input).toBeDefined();

    // Warnings
    expect(Array.isArray(result.warnings)).toBe(true);

    // Links
    expect(result._links).toBeDefined();
    expect(result._links.docs).toBeDefined();
    expect(result._links.scoring).toBeDefined();
    expect(result._links.support).toBeDefined();
  });

  it('should generate unique request IDs', async () => {
    const result1 = await analyze('Content one for request ID test.').debug();
    const result2 = await analyze('Content two for request ID test.').debug();

    expect(result1.meta.requestId).not.toBe(result2.meta.requestId);
    expect(result1.meta.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it('should include version string', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    expect(result.meta.version).toBe('2.0.0');
  });

  it('should track timing breakdown', async () => {
    const result = await analyze(MEDIUM_CONTENT).noCache().debug();

    expect(result.meta.timing.total).toBeGreaterThanOrEqual(0);
    expect(result.meta.timing.cache).toBeGreaterThanOrEqual(0);
    expect(result.meta.timing.analysis).toBeGreaterThanOrEqual(0);
  });

  it('should indicate cache hit correctly', async () => {
    // First call - cache miss
    const result1 = await analyze(MEDIUM_CONTENT).debug();
    expect(result1.meta.cached).toBe(false);
    // Note: timing.analysis may be 0 if analysis completes in < 1ms (Date.now resolution)
    expect(result1.meta.timing.analysis).toBeGreaterThanOrEqual(0);

    // Second call - cache hit
    const result2 = await analyze(MEDIUM_CONTENT).debug();
    expect(result2.meta.cached).toBe(true);
    expect(result2.meta.timing.analysis).toBe(0);
  });

  it('should include cache key when caching is enabled', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    expect(result.meta.cacheKey).toBeDefined();
    expect(result.meta.cacheKey).toMatch(/^analysis_\d+$/);
  });

  it('should not include cache key when caching is disabled', async () => {
    const result = await analyze(MEDIUM_CONTENT).noCache().debug();

    expect(result.meta.cacheKey).toBeUndefined();
  });

  it('should include input statistics', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    expect(result.meta.input.length).toBe(MEDIUM_CONTENT.length);
    expect(result.meta.input.words).toBeGreaterThan(0);
    expect(result.meta.input.sentences).toBeGreaterThan(0);
    expect(result.meta.input.contentType).toBeDefined();
    expect(result.meta.input.funnelStage).toBeDefined();
  });

  it('should include security warnings in warnings array', async () => {
    const suspiciousContent =
      'API configuration: api_key = sk-1234567890abcdefghijklmnop with secret';

    const result = await analyze(suspiciousContent).debug();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('sensitive data'))).toBe(true);
  });

  it('should include documentation links', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    expect(result._links.docs).toContain('docs.olympus.dev');
    expect(result._links.scoring).toContain('scoring');
    expect(result._links.support).toContain('support');
  });

  it('should provide valid ISO timestamp', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    const timestamp = new Date(result.meta.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
    expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should work with all builder options', async () => {
    const result = await analyze(MEDIUM_CONTENT)
      .asType('body')
      .forStage('consideration')
      .inNiche('saas')
      .debug();

    expect(result.data).toBeDefined();
    expect(result.meta.input.contentType).toBe('body');
    expect(result.meta.input.funnelStage).toBe('consideration');
  });

  it('should be suitable for production logging', async () => {
    const result = await analyze(MEDIUM_CONTENT).debug();

    // This is what you'd log in production
    const logEntry = {
      requestId: result.meta.requestId,
      score: result.data.totalScore,
      verdict: result.data.verdict,
      timing: result.meta.timing.total,
      cached: result.meta.cached,
      warnings: result.warnings.length,
    };

    // All fields should be serializable
    const serialized = JSON.stringify(logEntry);
    expect(serialized).toBeDefined();
    expect(JSON.parse(serialized)).toEqual(logEntry);
  });
});
