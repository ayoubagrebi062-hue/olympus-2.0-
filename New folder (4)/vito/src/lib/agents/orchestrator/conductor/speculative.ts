/**
 * SPECULATIVE EXECUTION ENGINE
 *
 * Run multiple approaches simultaneously.
 * First one that meets quality threshold wins.
 * Others are killed. No wasted computation.
 *
 * This is how Future You thinks about code generation.
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// TYPES
// ============================================================================

interface Approach {
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  priority: number;
}

interface RaceResult {
  winner: string;
  code: string;
  confidence: number;
  latency: number;
  tokensUsed: number;
  alternatives: Array<{
    approach: string;
    status: "completed" | "killed" | "failed";
    latency: number;
  }>;
}

interface SpeculativeConfig {
  apiKey?: string;
  qualityThreshold?: number;
  maxConcurrent?: number;
  timeout?: number;
}

// ============================================================================
// BUILT-IN APPROACHES
// ============================================================================

const APPROACHES: Approach[] = [
  {
    name: "minimalist",
    model: "claude-haiku-3-5-20241022",
    systemPrompt: `You write minimal, elegant code. No comments. No over-engineering.
The shortest code that works correctly wins.`,
    temperature: 0.3,
    priority: 1,
  },
  {
    name: "defensive",
    model: "claude-sonnet-4-20250514",
    systemPrompt: `You write bulletproof code. Every edge case handled.
Every error caught. Every input validated. Production-ready from line 1.`,
    temperature: 0.2,
    priority: 2,
  },
  {
    name: "architectural",
    model: "claude-opus-4-20250514",
    systemPrompt: `You think in systems. Your code is a foundation others will build on.
Extensible. Composable. Future-proof.`,
    temperature: 0.4,
    priority: 3,
  },
  {
    name: "pragmatic",
    model: "claude-sonnet-4-20250514",
    systemPrompt: `You solve the problem asked. Nothing more. Nothing less.
Copy-paste ready. Works immediately.`,
    temperature: 0.1,
    priority: 1,
  },
];

// ============================================================================
// SPECULATIVE ENGINE
// ============================================================================

export class SpeculativeEngine {
  private anthropic: Anthropic;
  private config: Required<SpeculativeConfig>;
  private raceHistory: RaceResult[] = [];

  constructor(config: SpeculativeConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || "",
      qualityThreshold: config.qualityThreshold || 0.75,
      maxConcurrent: config.maxConcurrent || 4,
      timeout: config.timeout || 30000,
    };

    this.anthropic = new Anthropic({ apiKey: this.config.apiKey });
  }

  async race(task: string, context?: string): Promise<RaceResult> {
    const startTime = Date.now();
    const abortController = new AbortController();

    // Select approaches based on task complexity
    const selectedApproaches = this.selectApproaches(task);

    // Create race promises
    const racePromises = selectedApproaches.map((approach) =>
      this.runApproach(approach, task, context, abortController.signal)
    );

    // Race with quality threshold
    const result = await this.raceWithThreshold(
      racePromises,
      selectedApproaches,
      abortController
    );

    // Record history for learning
    this.raceHistory.push(result);
    if (this.raceHistory.length > 100) {
      this.raceHistory = this.raceHistory.slice(-50);
    }

    return {
      ...result,
      latency: Date.now() - startTime,
    };
  }

  private selectApproaches(task: string): Approach[] {
    const complexity = this.estimateComplexity(task);

    if (complexity < 3) {
      // Simple task: fast approaches only
      return APPROACHES.filter((a) => a.priority === 1);
    }

    if (complexity < 6) {
      // Medium: mix of speed and quality
      return APPROACHES.filter((a) => a.priority <= 2);
    }

    // Complex: all approaches
    return APPROACHES.slice(0, this.config.maxConcurrent);
  }

  private estimateComplexity(task: string): number {
    const words = task.split(/\s+/).length;
    const hasMultiple = /and|also|with|including/i.test(task);
    const isArchitectural = /system|architecture|design|infrastructure/i.test(task);

    return Math.min(
      10,
      words / 5 + (hasMultiple ? 2 : 0) + (isArchitectural ? 3 : 0)
    );
  }

  private async runApproach(
    approach: Approach,
    task: string,
    context: string | undefined,
    signal: AbortSignal
  ): Promise<{
    approach: Approach;
    code: string;
    confidence: number;
    tokens: number;
    latency: number;
  }> {
    const startTime = Date.now();

    try {
      // Check if already aborted
      if (signal.aborted) {
        throw new Error("Aborted");
      }

      const prompt = this.buildPrompt(task, context);

      const response = await this.anthropic.messages.create({
        model: approach.model,
        max_tokens: 4096,
        temperature: approach.temperature,
        system: approach.systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      // Check again after API call
      if (signal.aborted) {
        throw new Error("Aborted");
      }

      const content =
        response.content[0].type === "text" ? response.content[0].text : "";

      const confidence = this.assessConfidence(content, task);

      return {
        approach,
        code: content,
        confidence,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        approach,
        code: "",
        confidence: 0,
        tokens: 0,
        latency: Date.now() - startTime,
      };
    }
  }

  private async raceWithThreshold(
    promises: Promise<{
      approach: Approach;
      code: string;
      confidence: number;
      tokens: number;
      latency: number;
    }>[],
    approaches: Approach[],
    abortController: AbortController
  ): Promise<Omit<RaceResult, "latency">> {
    const results: Array<{
      approach: Approach;
      code: string;
      confidence: number;
      tokens: number;
      latency: number;
      status: "completed" | "killed" | "failed";
    }> = [];

    // Wrap promises to track completion
    const trackedPromises = promises.map(async (promise, index) => {
      const result = await promise;
      results.push({
        ...result,
        status: result.confidence > 0 ? "completed" : "failed",
      });

      // Check if this result meets threshold
      if (result.confidence >= this.config.qualityThreshold) {
        // Winner! Kill others
        abortController.abort();
        return { winner: true, result };
      }

      return { winner: false, result };
    });

    // Wait for all to complete or one to win
    const outcomes = await Promise.allSettled(trackedPromises);

    // Find winner
    let winner = results
      .filter((r) => r.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)[0];

    // Mark killed approaches
    for (const result of results) {
      if (result.code === "" && result.confidence === 0) {
        result.status = "killed";
      }
    }

    if (!winner) {
      return {
        winner: "none",
        code: "",
        confidence: 0,
        tokensUsed: results.reduce((sum, r) => sum + r.tokens, 0),
        alternatives: results.map((r) => ({
          approach: r.approach.name,
          status: r.status,
          latency: r.latency,
        })),
      };
    }

    return {
      winner: winner.approach.name,
      code: winner.code,
      confidence: winner.confidence,
      tokensUsed: results.reduce((sum, r) => sum + r.tokens, 0),
      alternatives: results.map((r) => ({
        approach: r.approach.name,
        status: r.status,
        latency: r.latency,
      })),
    };
  }

  private buildPrompt(task: string, context?: string): string {
    let prompt = `Task: ${task}`;

    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }

    prompt += `\n\nRequirements:
- TypeScript with strict types
- Production-ready code
- Return only code blocks`;

    return prompt;
  }

  private assessConfidence(output: string, task: string): number {
    if (!output) return 0;

    let score = 0.5;

    // Structure checks
    const hasCodeBlock = /```[\s\S]*```/.test(output);
    const hasTypes = /:\s*(string|number|boolean|void|Promise|Array)/.test(output);
    const hasExport = /export\s+(default\s+)?/.test(output);
    const hasTryCatch = /try\s*{[\s\S]*catch/.test(output);

    if (hasCodeBlock) score += 0.15;
    if (hasTypes) score += 0.1;
    if (hasExport) score += 0.1;
    if (hasTryCatch) score += 0.05;

    // Relevance check
    const taskWords = task.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const outputLower = output.toLowerCase();

    let matches = 0;
    for (const word of taskWords) {
      if (outputLower.includes(word)) matches++;
    }

    score += Math.min((matches / taskWords.length) * 0.2, 0.2);

    return Math.min(score, 1);
  }

  // ==========================================================================
  // LEARNING
  // ==========================================================================

  getApproachStats(): Record<string, { wins: number; avgConfidence: number }> {
    const stats: Record<string, { wins: number; total: number; confidence: number }> = {};

    for (const result of this.raceHistory) {
      if (!stats[result.winner]) {
        stats[result.winner] = { wins: 0, total: 0, confidence: 0 };
      }
      stats[result.winner].wins++;
      stats[result.winner].confidence += result.confidence;
      stats[result.winner].total++;
    }

    const output: Record<string, { wins: number; avgConfidence: number }> = {};
    for (const [name, data] of Object.entries(stats)) {
      output[name] = {
        wins: data.wins,
        avgConfidence: data.total > 0 ? data.confidence / data.total : 0,
      };
    }

    return output;
  }
}

// ============================================================================
// CONVENIENCE
// ============================================================================

let engine: SpeculativeEngine | null = null;

export function speculate(task: string, context?: string): Promise<RaceResult> {
  if (!engine) {
    engine = new SpeculativeEngine();
  }
  return engine.race(task, context);
}

export function getSpeculativeEngine(): SpeculativeEngine {
  if (!engine) {
    engine = new SpeculativeEngine();
  }
  return engine;
}
