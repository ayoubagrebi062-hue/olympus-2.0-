/**
 * OLYMPUS 2.0 - Preference Learning System
 *
 * Automatically learns user preferences from:
 * - Successful build patterns
 * - User feedback analysis
 * - Tech stack usage frequency
 * - Design pattern repetition
 *
 * Uses weighted scoring based on:
 * - Recency (recent actions weighted more)
 * - Frequency (repeated choices weighted more)
 * - Success rate (successful builds weighted more)
 */

import * as neo4j from '../../db/neo4j';
import * as mongodb from '../../db/mongodb';
import * as qdrant from '../../db/qdrant';
import { quickEmbed } from '../embeddings';

// ============================================
// TYPES
// ============================================

export interface PreferenceScore {
  name: string;
  category: string;
  score: number;
  frequency: number;
  lastUsed: Date;
  successRate: number;
}

export interface LearnedPreferences {
  techStack: PreferenceScore[];
  designPatterns: PreferenceScore[];
  colorSchemes: PreferenceScore[];
  layoutPatterns: PreferenceScore[];
  componentTypes: PreferenceScore[];
}

export interface BuildAnalysis {
  buildId: string;
  techUsed: string[];
  designPatterns: string[];
  components: string[];
  colorScheme?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layoutType?: string;
}

export interface FeedbackAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  aspects: Array<{
    category: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
  }>;
}

// ============================================
// PREFERENCE SCORING
// ============================================

/**
 * Calculate weighted score based on recency and frequency
 */
function calculateWeightedScore(
  frequency: number,
  lastUsedDays: number,
  successRate: number
): number {
  // Recency weight (decays over 30 days)
  const recencyWeight = Math.max(0, 1 - (lastUsedDays / 30));

  // Frequency weight (log scale to prevent runaway scores)
  const frequencyWeight = Math.log10(frequency + 1) / 2;

  // Success weight
  const successWeight = successRate;

  // Combined score (0-1 range)
  return (recencyWeight * 0.3) + (frequencyWeight * 0.3) + (successWeight * 0.4);
}

/**
 * Update preference score for a user
 */
async function updatePreferenceScore(
  userId: string,
  category: 'tech' | 'pattern' | 'component',
  name: string,
  success: boolean
): Promise<void> {
  const weight = success ? 1.0 : 0.5;

  switch (category) {
    case 'tech':
      await neo4j.setUserTechPreference(userId, name, weight);
      break;
    case 'pattern':
      await neo4j.setUserDesignPattern(userId, name, weight);
      break;
    case 'component':
      // Components are tracked via learned components
      break;
  }
}

// ============================================
// BUILD ANALYSIS
// ============================================

/**
 * Analyze a completed build to extract learnable patterns
 */
export async function analyzeBuild(buildId: string): Promise<BuildAnalysis | null> {
  const build = await mongodb.getBuild(buildId);
  if (!build) return null;

  // Get agent outputs for this build
  const outputs = await mongodb.getAgentOutputs(buildId);

  // Extract patterns from outputs
  const techUsed: Set<string> = new Set();
  const designPatterns: Set<string> = new Set();
  const components: Set<string> = new Set();

  for (const output of outputs) {
    // Parse tech from archon agent
    if (output.agentId === 'archon') {
      extractTechFromOutput(output.output, techUsed);
    }

    // Parse design patterns from palette/blocks agents
    if (output.agentId === 'palette' || output.agentId === 'blocks') {
      extractPatternsFromOutput(output.output, designPatterns);
    }

    // Parse components from pixel/blocks agents
    if (output.agentId === 'pixel' || output.agentId === 'blocks') {
      extractComponentsFromOutput(output.output, components);
    }
  }

  return {
    buildId,
    techUsed: Array.from(techUsed),
    designPatterns: Array.from(designPatterns),
    components: Array.from(components),
  };
}

/**
 * Extract tech stack from agent output
 */
function extractTechFromOutput(output: string, techSet: Set<string>): void {
  // Common tech patterns to look for
  const techPatterns = [
    /next\.?js/i,
    /react/i,
    /typescript/i,
    /tailwind\s*css/i,
    /postgres(?:ql)?/i,
    /supabase/i,
    /prisma/i,
    /shadcn/i,
    /stripe/i,
    /vercel/i,
    /redis/i,
    /mongodb/i,
  ];

  const techNames: Record<string, string> = {
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'react': 'React',
    'typescript': 'TypeScript',
    'tailwindcss': 'Tailwind CSS',
    'tailwind css': 'Tailwind CSS',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'supabase': 'Supabase',
    'prisma': 'Prisma',
    'shadcn': 'shadcn/ui',
    'stripe': 'Stripe',
    'vercel': 'Vercel',
    'redis': 'Redis',
    'mongodb': 'MongoDB',
  };

  for (const pattern of techPatterns) {
    const match = output.match(pattern);
    if (match) {
      const key = match[0].toLowerCase().replace(/[\s.]/g, '');
      const normalized = techNames[key] || match[0];
      techSet.add(normalized);
    }
  }
}

/**
 * Extract design patterns from agent output
 */
function extractPatternsFromOutput(output: string, patternSet: Set<string>): void {
  const patterns = [
    'modern-minimal',
    'dark-mode',
    'glassmorphism',
    'neomorphism',
    'gradient-rich',
    'card-based',
    'dashboard-layout',
    'sidebar-navigation',
    'top-navigation',
    'responsive-grid',
  ];

  const lowercaseOutput = output.toLowerCase();
  for (const pattern of patterns) {
    if (lowercaseOutput.includes(pattern)) {
      patternSet.add(pattern);
    }
  }
}

/**
 * Extract component types from agent output
 */
function extractComponentsFromOutput(output: string, componentSet: Set<string>): void {
  // Look for common component patterns
  const componentPatterns = [
    /(?:const|function)\s+(\w+(?:Card|Button|Form|Modal|Table|Chart|List|Grid|Nav|Header|Footer|Sidebar))/g,
    /<(\w+(?:Card|Button|Form|Modal|Table|Chart|List|Grid|Nav|Header|Footer|Sidebar))/g,
  ];

  for (const pattern of componentPatterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      componentSet.add(match[1]);
    }
  }
}

// ============================================
// FEEDBACK ANALYSIS
// ============================================

/**
 * Analyze user feedback to extract preferences
 */
export async function analyzeFeedback(feedback: string): Promise<FeedbackAnalysis> {
  // Simple sentiment analysis based on keywords
  const positiveKeywords = ['great', 'love', 'perfect', 'awesome', 'excellent', 'amazing', 'good', 'nice', 'beautiful'];
  const negativeKeywords = ['bad', 'ugly', 'hate', 'terrible', 'awful', 'wrong', 'poor', 'confusing', 'broken'];

  const lowercaseFeedback = feedback.toLowerCase();
  const positiveCount = positiveKeywords.filter(k => lowercaseFeedback.includes(k)).length;
  const negativeCount = negativeKeywords.filter(k => lowercaseFeedback.includes(k)).length;

  let sentiment: FeedbackAnalysis['sentiment'] = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  // Extract aspect-based feedback
  const aspects: FeedbackAnalysis['aspects'] = [];

  // Design-related
  const designKeywords = ['design', 'look', 'style', 'color', 'theme', 'ui', 'visual'];
  if (designKeywords.some(k => lowercaseFeedback.includes(k))) {
    aspects.push({
      category: 'design',
      sentiment: determineAspectSentiment(feedback, designKeywords, positiveKeywords, negativeKeywords),
      keywords: designKeywords.filter(k => lowercaseFeedback.includes(k)),
    });
  }

  // Layout-related
  const layoutKeywords = ['layout', 'navigation', 'menu', 'sidebar', 'header', 'footer', 'structure'];
  if (layoutKeywords.some(k => lowercaseFeedback.includes(k))) {
    aspects.push({
      category: 'layout',
      sentiment: determineAspectSentiment(feedback, layoutKeywords, positiveKeywords, negativeKeywords),
      keywords: layoutKeywords.filter(k => lowercaseFeedback.includes(k)),
    });
  }

  // Functionality-related
  const funcKeywords = ['feature', 'function', 'works', 'button', 'form', 'submit', 'click'];
  if (funcKeywords.some(k => lowercaseFeedback.includes(k))) {
    aspects.push({
      category: 'functionality',
      sentiment: determineAspectSentiment(feedback, funcKeywords, positiveKeywords, negativeKeywords),
      keywords: funcKeywords.filter(k => lowercaseFeedback.includes(k)),
    });
  }

  return { sentiment, aspects };
}

function determineAspectSentiment(
  feedback: string,
  aspectKeywords: string[],
  positiveKeywords: string[],
  negativeKeywords: string[]
): 'positive' | 'negative' | 'neutral' {
  // Simple proximity-based sentiment for aspects
  const words = feedback.toLowerCase().split(/\s+/);

  let posNear = 0;
  let negNear = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (aspectKeywords.includes(word)) {
      // Check surrounding words (window of 3)
      for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
        if (positiveKeywords.includes(words[j])) posNear++;
        if (negativeKeywords.includes(words[j])) negNear++;
      }
    }
  }

  if (posNear > negNear) return 'positive';
  if (negNear > posNear) return 'negative';
  return 'neutral';
}

// ============================================
// LEARNING SYSTEM
// ============================================

/**
 * Learn from a completed build
 */
export async function learnFromBuild(
  userId: string,
  buildId: string,
  success: boolean
): Promise<void> {
  console.log(`[PreferenceLearning] Learning from build ${buildId} (success: ${success})`);

  // Analyze the build
  const analysis = await analyzeBuild(buildId);
  if (!analysis) {
    console.log('[PreferenceLearning] Build not found, skipping');
    return;
  }

  // Update tech preferences
  for (const tech of analysis.techUsed) {
    await updatePreferenceScore(userId, 'tech', tech, success);
  }

  // Update pattern preferences
  for (const pattern of analysis.designPatterns) {
    await updatePreferenceScore(userId, 'pattern', pattern, success);
  }

  // Record learned components
  for (const component of analysis.components) {
    await neo4j.recordLearnedComponent(userId, component, 'ui-component', buildId);
  }

  // Record project tech for similarity matching
  if (analysis.techUsed.length > 0) {
    const projectId = (await mongodb.getBuild(buildId))?.projectId;
    if (projectId) {
      await neo4j.recordProjectTech(projectId, analysis.techUsed);
    }
  }

  console.log(`[PreferenceLearning] Learned: ${analysis.techUsed.length} tech, ${analysis.designPatterns.length} patterns, ${analysis.components.length} components`);
}

/**
 * Learn from user feedback
 */
export async function learnFromFeedback(
  userId: string,
  buildId: string,
  feedback: string
): Promise<void> {
  console.log(`[PreferenceLearning] Learning from feedback for build ${buildId}`);

  // Analyze feedback
  const analysis = await analyzeFeedback(feedback);

  // Store feedback embedding for future similarity
  try {
    const embedding = await quickEmbed(feedback);
    await qdrant.storeFeedbackEmbedding(
      userId,
      buildId,
      feedback,
      embedding,
      analysis.sentiment,
      analysis.aspects.length > 0 ? analysis.aspects[0].category : undefined
    );
  } catch (error) {
    console.error('[PreferenceLearning] Failed to store feedback embedding:', error);
  }

  // Update preferences based on positive feedback
  if (analysis.sentiment === 'positive') {
    for (const aspect of analysis.aspects) {
      if (aspect.sentiment === 'positive') {
        // Reinforce preferences in this category
        console.log(`[PreferenceLearning] Positive feedback for ${aspect.category}`);
      }
    }
  }

  console.log(`[PreferenceLearning] Feedback analyzed: ${analysis.sentiment}, ${analysis.aspects.length} aspects`);
}

// ============================================
// PREFERENCE RETRIEVAL
// ============================================

/**
 * Get learned preferences for a user
 */
export async function getLearnedPreferences(userId: string): Promise<LearnedPreferences> {
  const [techPrefs, designPatterns, components] = await Promise.all([
    neo4j.getUserTechPreferences(userId),
    neo4j.getUserDesignPatterns(userId),
    neo4j.getUserLearnedComponents(userId),
  ]);

  // Convert to scored preferences
  const now = new Date();

  return {
    techStack: techPrefs.map(t => ({
      name: t.name,
      category: t.category || 'unknown',
      score: t.weight,
      frequency: 1, // Would need additional tracking
      lastUsed: now,
      successRate: t.weight,
    })),
    designPatterns: designPatterns.map(p => ({
      name: p.name,
      category: 'design',
      score: p.weight,
      frequency: 1,
      lastUsed: now,
      successRate: p.weight,
    })),
    colorSchemes: [], // Would need to track from builds
    layoutPatterns: [], // Would need to track from builds
    componentTypes: components.map(c => ({
      name: c.name,
      category: c.type,
      score: c.useCount / 10, // Normalize
      frequency: c.useCount,
      lastUsed: now,
      successRate: 1,
    })),
  };
}

/**
 * Get top preferences for prompt injection
 */
export async function getTopPreferences(
  userId: string,
  limit: number = 5
): Promise<{
  tech: string[];
  patterns: string[];
  components: string[];
}> {
  const prefs = await getLearnedPreferences(userId);

  return {
    tech: prefs.techStack
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(t => t.name),
    patterns: prefs.designPatterns
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(p => p.name),
    components: prefs.componentTypes
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(c => c.name),
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  analyzeBuild,
  analyzeFeedback,
  learnFromBuild,
  learnFromFeedback,
  getLearnedPreferences,
  getTopPreferences,
};
