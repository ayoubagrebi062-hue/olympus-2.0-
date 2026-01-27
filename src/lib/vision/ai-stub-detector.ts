/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   AI-POWERED STUB DETECTOR                                                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Unlike regex-based detection, this uses AI to UNDERSTAND code:             ║
 * ║   - Semantic analysis of function completeness                               ║
 * ║   - Context-aware placeholder detection                                      ║
 * ║   - Intent vs implementation gap analysis                                    ║
 * ║   - Auto-generated fix suggestions                                           ║
 * ║                                                                               ║
 * ║   "A button without onClick isn't always a stub - AI knows the difference"   ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import Anthropic from '@anthropic-ai/sdk';
import type { StubLocation, QualityMetrics } from './types';

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const ANALYSIS_MODEL = 'claude-3-5-haiku-20241022';
const MAX_CODE_LENGTH = 50000;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface AnalysisResult {
  isComplete: boolean;
  completenessScore: number;
  stubs: StubLocation[];
  suggestions: string[];
  reasoning: string;
}

interface CachedAnalysis {
  result: AnalysisResult;
  timestamp: number;
  codeHash: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// AI STUB DETECTOR
// ════════════════════════════════════════════════════════════════════════════════

export class AIStubDetector {
  private client: Anthropic;
  private cache: Map<string, CachedAnalysis> = new Map();
  private analysisCount = 0;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MAIN ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────────

  async analyze(
    code: string,
    context: {
      prompt?: string;
      pageType?: string;
      expectedFeatures?: string[];
    } = {}
  ): Promise<AnalysisResult> {
    // Check cache first
    const codeHash = this.hashCode(code);
    const cached = this.cache.get(codeHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    // Truncate if too long
    const truncatedCode =
      code.length > MAX_CODE_LENGTH
        ? code.substring(0, MAX_CODE_LENGTH) + '\n// ... (truncated)'
        : code;

    try {
      const result = await this.performAIAnalysis(truncatedCode, context);

      // Cache result
      this.cache.set(codeHash, {
        result,
        timestamp: Date.now(),
        codeHash,
      });

      this.analysisCount++;
      return result;
    } catch (error) {
      console.error('[AIStubDetector] Analysis failed, falling back to fast analysis:', error);
      return this.fastAnalysis(code, context);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // AI ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────────

  private async performAIAnalysis(
    code: string,
    context: { prompt?: string; pageType?: string; expectedFeatures?: string[] }
  ): Promise<AnalysisResult> {
    const systemPrompt = `You are a senior code quality analyst specializing in React/TypeScript.
Your job is to analyze code for completeness and identify any stubs, placeholders, or incomplete implementations.

IMPORTANT DISTINCTIONS:
- placeholder="Search..." in an <input> is LEGITIMATE HTML, not a stub
- A button without onClick might be intentionally disabled or styled-only
- console.log in development code is acceptable
- Empty catch blocks might be intentional for error suppression
- Loading/error/empty states might be handled elsewhere

WHAT COUNTS AS A STUB:
- TODO/FIXME comments indicating unfinished work
- Functions that just return null/undefined with no logic
- Event handlers that only console.log without real functionality
- Placeholder text in JSX content like ">placeholder<" or ">coming soon<"
- Lorem ipsum or fake data that should be replaced
- Incomplete business logic (half-implemented features)
- Missing error handling where it's clearly needed

OUTPUT FORMAT: Respond with valid JSON only, no markdown:
{
  "isComplete": boolean,
  "completenessScore": number (0-100),
  "stubs": [
    {
      "line": number,
      "column": number,
      "type": "todo" | "placeholder" | "empty-handler" | "incomplete-logic" | "mock-data",
      "severity": "critical" | "warning" | "info",
      "description": "string",
      "suggestedFix": "string",
      "confidence": number (0-1)
    }
  ],
  "suggestions": ["string"],
  "reasoning": "string"
}`;

    const userPrompt = `Analyze this React/TypeScript code for stubs and completeness:

${context.prompt ? `ORIGINAL PROMPT: ${context.prompt}\n` : ''}
${context.pageType ? `PAGE TYPE: ${context.pageType}\n` : ''}
${context.expectedFeatures?.length ? `EXPECTED FEATURES: ${context.expectedFeatures.join(', ')}\n` : ''}

CODE:
\`\`\`typescript
${code}
\`\`\`

Analyze the code and return JSON with your findings.`;

    const response = await this.client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    try {
      // Parse JSON from response (handle potential markdown wrapping)
      let jsonStr = content.text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(jsonStr) as AnalysisResult;
    } catch (parseError) {
      console.error('[AIStubDetector] Failed to parse AI response:', content.text);
      throw new Error('Failed to parse AI analysis response');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // FAST FALLBACK ANALYSIS (No AI, enhanced regex)
  // ──────────────────────────────────────────────────────────────────────────────

  fastAnalysis(
    code: string,
    context: { prompt?: string; pageType?: string; expectedFeatures?: string[] }
  ): AnalysisResult {
    const stubs: StubLocation[] = [];
    const lines = code.split('\n');

    // Pattern definitions with context awareness
    const patterns: {
      pattern: RegExp;
      type: StubLocation['type'];
      severity: StubLocation['severity'];
      description: string;
      suggestedFix: string;
    }[] = [
      {
        pattern: /\/\/\s*TODO[:\s](.+)/i,
        type: 'todo',
        severity: 'warning',
        description: 'TODO comment indicates unfinished work',
        suggestedFix: 'Implement the TODO or remove if no longer needed',
      },
      {
        pattern: /\/\/\s*FIXME[:\s](.+)/i,
        type: 'todo',
        severity: 'critical',
        description: 'FIXME comment indicates a known bug',
        suggestedFix: 'Fix the issue described in the FIXME',
      },
      {
        pattern: />\s*placeholder\s*</i,
        type: 'placeholder',
        severity: 'warning',
        description: 'Placeholder text in JSX content',
        suggestedFix: 'Replace with actual content',
      },
      {
        pattern: />\s*coming\s+soon\s*</i,
        type: 'placeholder',
        severity: 'warning',
        description: '"Coming soon" placeholder text',
        suggestedFix: 'Implement the feature or remove the element',
      },
      {
        pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/,
        type: 'empty-handler',
        severity: 'critical',
        description: 'Empty onClick handler',
        suggestedFix: 'Add actual click handling logic',
      },
      {
        pattern: /onClick=\{\s*\(\)\s*=>\s*console\.log\([^)]+\)\s*\}/,
        type: 'empty-handler',
        severity: 'warning',
        description: 'onClick only logs to console',
        suggestedFix: 'Replace with actual functionality',
      },
      {
        pattern: /lorem\s+ipsum/i,
        type: 'mock-data',
        severity: 'info',
        description: 'Lorem ipsum placeholder text',
        suggestedFix: 'Replace with real content',
      },
      {
        pattern: /return\s+null\s*;?\s*}\s*$/,
        type: 'incomplete-logic',
        severity: 'warning',
        description: 'Function returns null without logic',
        suggestedFix: 'Implement the function logic',
      },
    ];

    // Analyze each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of patterns) {
        const match = line.match(p.pattern);
        if (match) {
          stubs.push({
            line: i + 1,
            column: match.index || 0,
            type: p.type,
            severity: p.severity,
            description: p.description,
            suggestedFix: p.suggestedFix,
            confidence: 0.7, // Lower confidence for regex-based
          });
        }
      }
    }

    // Calculate completeness score
    const criticalCount = stubs.filter(s => s.severity === 'critical').length;
    const warningCount = stubs.filter(s => s.severity === 'warning').length;
    const completenessScore = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);

    return {
      isComplete: criticalCount === 0 && warningCount <= 2,
      completenessScore,
      stubs,
      suggestions: stubs
        .map(s => s.suggestedFix)
        .filter((v, i, a): v is string => v !== undefined && a.indexOf(v) === i),
      reasoning: `Fast analysis found ${stubs.length} potential issues (${criticalCount} critical, ${warningCount} warnings)`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HYBRID ANALYSIS (Fast + AI for critical findings)
  // ──────────────────────────────────────────────────────────────────────────────

  async hybridAnalysis(
    code: string,
    context: { prompt?: string; pageType?: string; expectedFeatures?: string[] }
  ): Promise<AnalysisResult> {
    // First, do fast analysis
    const fastResult = this.fastAnalysis(code, context);

    // If fast analysis found critical issues, use AI to verify
    const criticalStubs = fastResult.stubs.filter(s => s.severity === 'critical');
    if (criticalStubs.length > 0) {
      try {
        const aiResult = await this.analyze(code, context);
        // Merge results, preferring AI analysis
        return {
          ...aiResult,
          stubs: this.mergeStubs(fastResult.stubs, aiResult.stubs),
        };
      } catch {
        return fastResult;
      }
    }

    // If fast analysis found no issues but code is short, verify with AI
    if (fastResult.stubs.length === 0 && code.length < 5000) {
      try {
        return await this.analyze(code, context);
      } catch {
        return fastResult;
      }
    }

    return fastResult;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────────

  private mergeStubs(fast: StubLocation[], ai: StubLocation[]): StubLocation[] {
    const merged = [...ai];

    // Add fast detections that AI missed
    for (const fastStub of fast) {
      const aiMatch = ai.find(
        a => Math.abs(a.line - fastStub.line) <= 2 && a.type === fastStub.type
      );
      if (!aiMatch) {
        merged.push({ ...fastStub, confidence: fastStub.confidence * 0.8 });
      }
    }

    return merged.sort((a, b) => a.line - b.line);
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────────────────────────

  getStats(): { analysisCount: number; cacheSize: number; cacheHitRate: number } {
    return {
      analysisCount: this.analysisCount,
      cacheSize: this.cache.size,
      cacheHitRate: this.cache.size > 0 ? this.cache.size / this.analysisCount : 0,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let instance: AIStubDetector | null = null;

export function getAIStubDetector(): AIStubDetector {
  if (!instance) {
    instance = new AIStubDetector();
  }
  return instance;
}

export default AIStubDetector;
